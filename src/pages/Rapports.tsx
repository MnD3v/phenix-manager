import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, TrendingUp, DollarSign, Receipt, Users, Printer, Search, History, Download, Trash2, Building2 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { generateRapportPDF, generateProprietaireRapportPDF, generateAgenceRapportPDF, imageToBase64 } from "@/lib/pdf-generator";
import { generateDailyReportPDF2 } from "@/lib/pdf-generator-daily";
import logo from "@/assets/logo-phenix.png";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const Rapports = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return today.getDate() < 16 ? format(subMonths(today, 1), "yyyy-MM") : format(today, "yyyy-MM");
  });
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchHistory, setSearchHistory] = useState("");
  const [searchProprietaire, setSearchProprietaire] = useState("");
  const queryClient = useQueryClient();

  type CompleteReportData = {
    proprietaires: any[];
    biens: any[];
    contrats: any[];
    paiements: any[];
    depenses: any[];
  };

  const monthDate = parse(selectedMonth, "yyyy-MM", new Date());
  // Période du rapport : du 16 du mois sélectionné au 15 du mois suivant
  // Exemple: Rapport Décembre = 16 Décembre au 15 Janvier
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 16);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 15);

  const isContratActifDansPeriode = (contrat: any, start: Date, end: Date) => {
    const debut = new Date(contrat.date_debut);
    const fin = contrat.date_fin ? new Date(contrat.date_fin) : null;
    return debut <= end && (!fin || fin >= start);
  };

  // Fetch proprietaires
  const { data: proprietaires } = useQuery({
    queryKey: ["proprietaires"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proprietaires").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  // Historique des rapports
  const { data: rapportsHistorique, isLoading: loadingHistorique } = useQuery({
    queryKey: ["rapports-historique"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rapports_historique")
        .select("*")
        .order("date_generation", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Delete report
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rapports_historique").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rapports-historique"] });
      toast.success("Rapport supprimé");
    },
    onError: (error: any) => toast.error(`Erreur: ${error.message}`),
  });

  // Save report
  const saveMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const { error } = await supabase.from("rapports_historique").insert({
        mois_concerne: reportData.mois_concerne,
        total_revenus: reportData.total_revenus,
        total_depenses: reportData.total_depenses,
        benefice_net: reportData.benefice_net,
        donnees_json: reportData.donnees_json,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rapports-historique"] }),
  });

  const monthOptions = Array.from({ length: 60 }, (_, i) => {
    const date = subMonths(new Date(), i);
    const monthName = format(date, "MMMM", { locale: fr });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return { value: format(date, "yyyy-MM"), label: `${capitalizedMonth} ${date.getFullYear()}` };
  });

  // Fetch complete data for reports
  const { data: reportData, isLoading } = useQuery<CompleteReportData>({
    queryKey: ["complete-report-data", selectedMonth, selectedDate],
    queryFn: async () => {
      // Recalculer les dates à l'intérieur pour être sûr d'avoir les valeurs à jour
      const currentMonthDate = parse(selectedMonth, "yyyy-MM", new Date());
      // Période du rapport : du 16 du mois sélectionné au 15 du mois suivant
      const currentMonthStart = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 16);
      const currentMonthEnd = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 15);

      const start = format(currentMonthStart, "yyyy-MM-dd");
      const end = format(currentMonthEnd, "yyyy-MM-dd");

      // Inclure aussi la date sélectionnée pour le rapport journalier
      const selectedDay = new Date(selectedDate);
      // Réinitialiser l'heure pour éviter les problèmes de fuseau horaire
      selectedDay.setHours(0, 0, 0, 0);

      const earliestDate = selectedDay < currentMonthStart ? format(selectedDay, "yyyy-MM-dd") : start;
      const latestDate = selectedDay > currentMonthEnd ? format(selectedDay, "yyyy-MM-dd") : end;

      const fetchAll = async (table: string, select = "*", modifiers?: (q: any) => any) => {
        let allData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
          let q = supabase.from(table as any).select(select);
          if (modifiers) q = modifiers(q);

          const { data, error } = await q.range(page * pageSize, (page + 1) * pageSize - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          allData = allData.concat(data);
          if (data.length < pageSize) break;
          page++;
        }
        return allData;
      };

      try {
        const [proprietaires, biens, contrats, paiements, depenses] = await Promise.all([
          fetchAll("proprietaires"),
          fetchAll("biens"),
          fetchAll("contrats", "*, locataires(*)"),
          fetchAll("paiements", "*, biens(*), locataires(*)", (q) => q.gte("date_paiement", "2000-01-01").lte("date_paiement", latestDate)),
          fetchAll("depenses", "*, biens(*)", (q) => q.gte("date_depense", earliestDate).lte("date_depense", latestDate)),
        ]);

        return {
          proprietaires,
          biens,
          contrats,
          paiements,
          depenses,
        };
      } catch (e: any) {
        toast.error(`Erreur chargement rapports: ${e.message}`);
        throw e;
      }
    },
  });

  // Generate proprietaire report
  const handleGenerateProprietaireReport = async (propId: string) => {
    if (!reportData) return;

    const logoBase64 = await imageToBase64(logo);
    const prop = reportData.proprietaires.find((p) => p.id === propId);
    if (!prop) return;

    const propBiens = reportData.biens.filter((b) => b.proprietaire_id === propId);
    const propBienIds = propBiens.map(b => b.id);

    const propPaiements = reportData.paiements.filter((p) => propBienIds.includes(p.bien_id));

    const contratsDuMois = reportData.contrats.filter((c) => {
      const isPropBien = propBiens.some((b) => b.id === c.bien_id);
      const hasPayment = propPaiements.some((p) => p.contrat_id === c.id);
      return isPropBien && (isContratActifDansPeriode(c, monthStart, monthEnd) || hasPayment);
    });

    // Also filter expenses by matching bien_id OR proprietaire_id AND by date
    const propDepenses = reportData.depenses.filter((d) => {
      const dDate = new Date(d.date_depense);
      return dDate >= monthStart && dDate <= monthEnd &&
        (d.proprietaire_id === propId || (d.bien_id && propBienIds.includes(d.bien_id)));
    });

    const locatairesData = contratsDuMois.map((c) => {
      const bien = propBiens.find((b) => b.id === c.bien_id);

      const paiementsLocAll = propPaiements.filter(
        (p) => p.locataire_id === c.locataire_id && p.bien_id === c.bien_id && (p.type === "loyer" || p.type === "avance" || p.type === "arrieres")
      );
      const montantPayeTotal = paiementsLocAll.reduce((s, p) => s + Number(p.montant), 0);

      const paiementsLocMois = paiementsLocAll.filter(p => {
        const d = new Date(p.date_paiement);
        // Utiliser monthStart et monthEnd qui sont définis au début du composant
        return d >= monthStart && d <= monthEnd;
      });

      const montantPaye = paiementsLocMois.reduce((s, p) => s + Number(p.montant), 0);
      const loyerMensuel = Number(c.loyer_mensuel);

      // Calculer les mois payés TOTAL (à vie) en additionnant le montant divisé par le loyer
      const totalMontantPayeParPaiements = paiementsLocAll.reduce((total, p) => total + Number(p.montant), 0);

      // Check for prepaid months in contract
      const montantAvanceContrat = (c.avance_mois || 0) * loyerMensuel;
      const paiementsAvanceOnly = paiementsLocAll
        .filter(p => p.type === "avance")
        .reduce((sum, p) => sum + Number(p.montant), 0);

      // If contract has advance months but no corresponding payment record (or less), assume implicit advance
      const effectiveAvance = Math.max(paiementsAvanceOnly, montantAvanceContrat);
      const diffAvance = Math.max(0, effectiveAvance - paiementsAvanceOnly);

      const totalMontantPaye = totalMontantPayeParPaiements + diffAvance;
      const moisPayesCount = loyerMensuel > 0 ? totalMontantPaye / loyerMensuel : 0;

      const moisPayesCountRounded = Math.round(moisPayesCount * 10) / 10; // Round to 1 decimal

      // Calculer le nombre de mois dus depuis la date de début jusqu'à la fin du mois du rapport
      const dateDebut = new Date(c.date_debut);
      // Pour le calcul des mois dus, on se base sur le mois du rapport (la fin du mois sélectionné)
      // et non la fin de la période de collecte qui déborde sur le mois suivant
      const finMoisRapport = endOfMonth(monthDate);
      const today = new Date();

      // Check if contract is terminated
      const dateFinContrat = c.date_fin ? new Date(c.date_fin) : null;
      const isContratTermine = dateFinContrat && dateFinContrat < today;

      // Calculer la différence en mois
      let moisDus = (finMoisRapport.getFullYear() - dateDebut.getFullYear()) * 12
        + (finMoisRapport.getMonth() - dateDebut.getMonth()) + 1;

      // Si le contrat est actif, le mois en cours n'est pas encore dû (terme échu)
      // Si le rapport concerne un mois passé, c'est bon.
      // Si le rapport concerne le mois courant:
      // Si mois courant, on ne compte pas le mois courant comme dû pour le calcul des arriérés.
      // Mais attention, finMoisRapport est la fin du mois sélectionné.

      // Logique Arrieres.tsx:
      // const effectiveEndDate = isContratTermine ? dateFin : today;
      // const moisDus = isContratTermine ? diffMois + 1 : diffMois;

      // Ici on compare par rapport au MOIS DU RAPPORT.
      // Si le mois du rapport est >= mois courant, et contrat actif, on enlève 1 mois.

      const isCurrentMonthOrFuture = finMoisRapport >= startOfMonth(today);
      if (!isContratTermine && isCurrentMonthOrFuture) {
        moisDus = moisDus - 1;
      }

      // Arriérés = mois dus - mois payés
      // Si moisPayesCount > moisDus, c'est qu'il a payé en avance, donc arriérés = 0
      const nbMoisArrieres = Math.max(0, moisDus - moisPayesCountRounded);
      const arrieres = nbMoisArrieres * loyerMensuel;

      // Calculer la période des loyers payés POUR CE MOIS SEULEMENT
      let loyersPayesStr = "";

      // On cherche ce qui a été payé pour la période du rapport (le mois sélectionné)
      // Un paiement peut couvrir plusieurs mois.
      // Il faut voir si le mois sélectionné est couvert par un paiement.

      // On reconstitue l'historique des mois payés à partir du début du contrat
      // Le locataire a payé pour les X premiers mois du contrat.
      // Si le mois du rapport est le N-ième mois du contrat, est-ce que N <= moisPayesCount ?

      const moisDuRapportIndex = (monthDate.getFullYear() - dateDebut.getFullYear()) * 12 + (monthDate.getMonth() - dateDebut.getMonth()) + 1;

      // Si moisPayesCount couvre ce mois
      const isMoisPaye = moisPayesCountRounded >= moisDuRapportIndex;

      // Mais on veut afficher ce qui a été payé *ce mois-ci* ou *pour ce mois-ci* ?
      // Généralement dans ce rapport, la colonne "Loyer payé" indique la période couverte par le paiement reçu/comptabilisé.
      // Si on regarde la logique précédente : `loyersPayesStr` était basé sur `paiementsLocAll`... non `moisPayesCount`.

      // La demande utilisateur : "Kolou a payé 3 mois d'avance, mais on mentionne ... arriérés alors qu'on devrait mentionner qu'il a payé Janvier, Fevrier, Mars."
      // Cela sous-entend que dans la colonne "Loyer payé" (ou équivalent), on doit voir les mois couverts par les paiements.

      // On va lister les mois couverts par les paiements effectués DANS LA PÉRIODE DU RAPPORT (monthStart -> monthEnd)
      const paiementsDuMois = paiementsLocAll.filter(p => {
        const d = new Date(p.date_paiement);
        return d >= monthStart && d <= monthEnd;
      });

      if (paiementsDuMois.length > 0) {
        // Pour chaque paiement du mois, on détermine quels mois il couvre.
        // C'est complexe car ça dépend de l'état des arriérés AU MOMENT du paiement.
        // Simplification: On sait que le locataire a payé au total `moisPayesCount`.
        // Les paiements du mois ont ajouté X mois à ce total.
        // Donc ils couvrent l'intervalle [TotalAvantPaiement + 1, TotalApresPaiement].

        const montantPayeAvantCeMois = paiementsLocAll
          .filter(p => new Date(p.date_paiement) < monthStart)
          .reduce((s, p) => s + Number(p.montant), 0);

        const moisPayesAvant = loyerMensuel > 0 ? montantPayeAvantCeMois / loyerMensuel : 0;
        const moisPayesAvantRounded = Math.round(moisPayesAvant * 10) / 10;

        const montantPayeCeMois = paiementsDuMois.reduce((s, p) => s + Number(p.montant), 0);
        const moisPayesCeMois = loyerMensuel > 0 ? montantPayeCeMois / loyerMensuel : 0;

        // Période couverte par les paiements de ce mois
        // De (MoisDeDebut + moisPayesAvant) à (MoisDeDebut + moisPayesAvant + moisPayesCeMois)

        const debutCouverture = new Date(dateDebut);
        debutCouverture.setMonth(debutCouverture.getMonth() + Math.floor(moisPayesAvantRounded));

        const finCouverture = new Date(dateDebut);
        // On utilise ceil pour inclure les fractions de mois si paiement partiel, ou sinon floor+entier
        // Ici on additionne tout simplement pour avoir la fin.
        finCouverture.setMonth(dateDebut.getMonth() + Math.floor(moisPayesAvantRounded + moisPayesCeMois) - 1);

        if (moisPayesCeMois >= 1) {
          const moisDebut = debutCouverture.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
          const moisFin = finCouverture.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

          if (debutCouverture.getMonth() === finCouverture.getMonth() && debutCouverture.getFullYear() === finCouverture.getFullYear()) {
            loyersPayesStr = `1 mois (${moisDebut})`;
          } else {
            loyersPayesStr = `${Math.round(moisPayesCeMois)} mois (${moisDebut} - ${moisFin})`;
          }
        } else if (moisPayesCeMois > 0) {
          // Paiement partiel
          loyersPayesStr = "Partiel";
        } else {
          loyersPayesStr = "-";
        }

      } else {
        loyersPayesStr = "-";
      }

      // Récupérer la caution depuis le contrat
      // Afficher la caution uniquement si un paiement de type "caution" a été effectué ce mois-ci
      // OU si le contrat démarre ce mois-ci (pour inclure les nouveaux locataires comme Kolou)
      const reportDate = new Date(monthEnd);
      const isContractStartMonth = dateDebut >= monthStart && dateDebut <= monthEnd;

      const cautionPaiementsDuMois = propPaiements.filter(p =>
        p.contrat_id === c.id &&
        p.type === "caution" &&
        new Date(p.date_paiement) >= monthStart &&
        new Date(p.date_paiement) <= monthEnd
      );

      let caution = cautionPaiementsDuMois.reduce((s, p) => s + Number(p.montant), 0);

      // If no explicit payment found but it's the start month, assume contract caution amount
      if (caution === 0 && isContractStartMonth) {
        caution = Number(c.caution) || 0;
      }

      let arrieresDetails = "";
      if (nbMoisArrieres > 0) {
        // Déterminer le premier mois impayé
        const premierMoisImpaye = new Date(dateDebut);
        premierMoisImpaye.setMonth(premierMoisImpaye.getMonth() + moisPayesCountRounded);

        if (nbMoisArrieres === 1) {
          const monthName = premierMoisImpaye.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
          const monthNameCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
          arrieresDetails = `1 mois (${monthNameCap})`;
        } else {
          const dernierMoisImpaye = new Date(premierMoisImpaye);
          dernierMoisImpaye.setMonth(dernierMoisImpaye.getMonth() + nbMoisArrieres - 1);

          const moisDebut = premierMoisImpaye.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
          const moisFin = dernierMoisImpaye.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
          arrieresDetails = `${nbMoisArrieres} mois (${moisDebut} - ${moisFin})`;
        }
      }

      // Calculer le nombre de mois de caution
      const nbMoisCaution = loyerMensuel > 0 && caution > 0 ? caution / loyerMensuel : 0;
      const cautionNbMois = nbMoisCaution > 0
        ? (Number.isInteger(nbMoisCaution) ? `${nbMoisCaution} mois` : `${nbMoisCaution.toFixed(1)} mois`)
        : "";

      return {
        nom: c.locataires?.nom || "N/A",
        bien_nom: bien?.nom || "",
        loyer: loyerMensuel,
        loyers_payes: loyersPayesStr,
        montant_paye: montantPaye,
        arrieres,
        arrieres_details: arrieresDetails,
        caution_payee: caution,
        caution_nb_mois: cautionNbMois,
      };
    });

    const totalLoyers = propPaiements
      .filter((p) => {
        const d = new Date(p.date_paiement);
        return d >= monthStart && d <= monthEnd && (p.type === "loyer" || p.type === "avance");
      })
      .reduce((s, p) => s + Number(p.montant), 0);

    const totalDepenses = propDepenses.reduce((s, d) => s + Number(d.montant), 0);
    const avgCommission =
      propBiens.length > 0
        ? propBiens.reduce((s, b) => s + Number(b.commission_pourcentage), 0) / propBiens.length
        : 10;

    const commission = Math.round((totalLoyers * avgCommission) / 100);

    // Calculer le nombre de biens occupés et libres basé sur le statut actuel des biens
    const nombreOccupes = propBiens.filter(b => b.statut === "occupe").length;
    const nombreLibres = propBiens.filter(b => b.statut === "disponible").length;

    const totalArrieres = locatairesData.reduce((s, l) => s + Number(l.arrieres), 0);

    // Total Cautions now derived from locatairesData to include implicit cautions
    const totalCautions = locatairesData.reduce((s, l) => s + Number(l.caution_payee), 0);

    const data = {
      proprietaire: { id: prop.id, nom: prop.nom, telephone: prop.telephone, email: prop.email },
      biens: propBiens,
      locataires: locatairesData,
      depenses: propDepenses.map((d) => ({
        description: d.description,
        montant: Number(d.montant),
        categorie: d.categorie,
        bien_nom: propBiens.find(b => b.id === d.bien_id)?.nom || "",
      })),
      totals: {
        nombre_chambres: propBiens.length,
        nombre_libres: nombreLibres,
        nombre_occupes: nombreOccupes,
        total_loyers: totalLoyers,
        total_arrieres: totalArrieres,
        total_cautions: totalCautions,
        total_depenses: totalDepenses,
        commission,
        somme_a_verser: totalLoyers + totalCautions - totalDepenses - commission,
      },
    };

    await generateProprietaireRapportPDF(data, selectedMonth, logoBase64);
    toast.success(`Rapport généré pour ${prop.nom}`);
  };

  // Generate agency report
  const handleGenerateAgencyReport = async () => {
    if (!reportData) return;
    const logoBase64 = await imageToBase64(logo);

    const contratsDuMois = reportData.contrats.filter((c) => isContratActifDansPeriode(c, monthStart, monthEnd));

    // Compter tous les contrats actuellement actifs pour le nombre de locataires
    const contratsActifs = reportData.contrats.filter((c) => c.statut === "actif");
    const locatairesUniques = new Set(contratsActifs.map((c) => c.locataire_id));

    const proprietairesData = reportData.proprietaires.map((prop) => {
      const propBiens = reportData.biens.filter((b) => b.proprietaire_id === prop.id);
      const propBienIds = propBiens.map(b => b.id);

      const propPaiements = reportData.paiements.filter((p) => propBienIds.includes(p.bien_id));
      const propDepenses = reportData.depenses.filter((d) => {
        const dDate = new Date(d.date_depense);
        return dDate >= monthStart && dDate <= monthEnd &&
          (d.proprietaire_id === prop.id || (d.bien_id && propBienIds.includes(d.bien_id)));
      });

      const totalLoyers = propPaiements
        .filter((p) => {
          const d = new Date(p.date_paiement);
          return d >= monthStart && d <= monthEnd && (p.type === "loyer" || p.type === "avance");
        })
        .reduce((s, p) => s + Number(p.montant), 0);

      const totalDep = propDepenses.reduce((s, d) => s + Number(d.montant), 0);
      const avgComm =
        propBiens.length > 0
          ? propBiens.reduce((s, b) => s + Number(b.commission_pourcentage), 0) / propBiens.length
          : 10;

      const commission = Math.round((totalLoyers * avgComm) / 100);

      // Explicit cautions
      let totalCautions = propPaiements
        .filter((p) => {
          const d = new Date(p.date_paiement);
          return d >= monthStart && d <= monthEnd && p.type === "caution";
        })
        .reduce((s, p) => s + Number(p.montant), 0);

      // Add implicit cautions for start month contracts if no payment found
      const implicitCautions = reportData.contrats
        .filter(c => {
          // Belongs to this owner's properties
          const isPropBien = propBienIds.includes(c.bien_id);
          if (!isPropBien) return false;

          // Is start month
          const dateDebut = new Date(c.date_debut);
          const isStart = dateDebut.getMonth() === monthDate.getMonth() &&
            dateDebut.getFullYear() === monthDate.getFullYear();
          if (!isStart) return false;

          // Check if explicit payment exists
          const hasPayment = propPaiements.some(p =>
            p.contrat_id === c.id &&
            p.type === "caution" &&
            new Date(p.date_paiement) >= monthStart &&
            new Date(p.date_paiement) <= monthEnd
          );

          return !hasPayment;
        })
        .reduce((sum, c) => sum + (Number(c.caution) || 0), 0);

      totalCautions += implicitCautions;

      return {
        nom: prop.nom,
        total_loyers: totalLoyers,
        total_depenses: totalDep,
        commission,
        somme_versee: totalLoyers + totalCautions - totalDep - commission,
      };
    });

    const data = {
      proprietaires: proprietairesData,
      totals: {
        total_loyers: proprietairesData.reduce((s, p) => s + p.total_loyers, 0),
        total_depenses: proprietairesData.reduce((s, p) => s + p.total_depenses, 0),
        total_commissions: proprietairesData.reduce((s, p) => s + p.commission, 0),
        benefice_net: proprietairesData.reduce((s, p) => s + p.commission, 0),
        nombre_biens: reportData.biens.length,
        nombre_occupes: reportData.biens.filter(b => b.statut === "occupe").length,
        nombre_locataires: locatairesUniques.size,
      },
    };

    await generateAgenceRapportPDF(data, selectedMonth, logoBase64);
    await saveMutation.mutateAsync({
      mois_concerne: selectedMonth,
      total_revenus: data.totals.total_loyers,
      total_depenses: data.totals.total_depenses,
      benefice_net: data.totals.total_commissions,
      donnees_json: data,
    });
    toast.success("Rapport agence généré et sauvegardé");
  };

  const filteredHistorique = rapportsHistorique?.filter(r =>
    r.mois_concerne.includes(searchHistory) ||
    new Date(r.date_generation).toLocaleDateString("fr-FR").includes(searchHistory)
  );

  return (
    <div className="space-y-8 animate-fade-in p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Rapports
          </h1>
          <p className="text-muted-foreground">
            Générez et consultez les rapports par propriétaire et pour l'agence
          </p>
        </div>
      </div>

      <Tabs defaultValue="proprietaires" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-muted/50 p-1">
          <TabsTrigger value="proprietaires" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4" />
            Propriétaires
          </TabsTrigger>
          <TabsTrigger value="agence" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" />
            Agence
          </TabsTrigger>
          <TabsTrigger value="journalier" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Receipt className="h-4 w-4" />
            Journalier
          </TabsTrigger>
          <TabsTrigger value="historique" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proprietaires" className="space-y-6">
          <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un propriétaire..."
                value={searchProprietaire}
                onChange={(e) => setSearchProprietaire(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {(() => {
            const filteredProps = proprietaires?.filter(p =>
              p.nom.toLowerCase().includes(searchProprietaire.toLowerCase())
            ) || [];
            return filteredProps.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProps.map(prop => (
                  <Card key={prop.id} className="group hover:shadow-md transition-all duration-200 border-muted/60">
                    <CardHeader className="pb-3 flex flex-row items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold truncate">{prop.nom}</CardTitle>
                        <p className="text-sm text-muted-foreground truncate">{prop.telephone}</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => handleGenerateProprietaireReport(prop.id)}
                        className="w-full gap-2 h-9 text-sm"
                        disabled={isLoading}
                        variant="outline"
                      >
                        <Printer className="h-4 w-4" />
                        Générer Rapport
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/5 border-dashed">
                <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Aucun propriétaire trouvé</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  {searchProprietaire ? `Aucun résultat pour "${searchProprietaire}"` : "Aucun propriétaire enregistré"}
                </p>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="agence" className="space-y-6">
          <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Période :</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateAgencyReport} className="gap-2" disabled={isLoading}>
              <Printer className="h-4 w-4" />
              Générer Rapport Agence
            </Button>
          </div>

          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="bg-muted/5 border-b py-4">
              <CardTitle className="text-base font-medium">Aperçu du mois</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Biens gérés</p>
                  <p className="text-3xl font-bold text-primary">{reportData?.biens.length || 0}</p>
                </div>
                <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/10 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Occupés</p>
                  <p className="text-3xl font-bold text-green-600">{reportData?.biens.filter(b => b.statut === "occupe").length || 0}</p>
                </div>
                <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/10 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Libres</p>
                  <p className="text-3xl font-bold text-red-600">{reportData?.biens.filter(b => b.statut === "disponible").length || 0}</p>
                </div>
                <div className="p-4 bg-purple-500/5 rounded-lg border border-purple-500/10 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Locataires</p>
                  <p className="text-3xl font-bold text-purple-600">{reportData?.contrats.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journalier" className="space-y-6">
          <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Sélectionner une date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Button
              onClick={async () => {
                if (!reportData) return;

                const dayStart = new Date(selectedDate);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(selectedDate);
                dayEnd.setHours(23, 59, 59, 999);

                const paiementsDuJour = reportData.paiements.filter(p => {
                  const pDate = new Date(p.date_paiement);
                  return pDate >= dayStart && pDate <= dayEnd;
                }).map(p => {
                  const bien = reportData.biens.find(b => b.id === p.bien_id);
                  const proprietaire = reportData.proprietaires.find(pr => pr.id === bien?.proprietaire_id);
                  const locataire = reportData.contrats.find(c => c.locataire_id === p.locataire_id)?.locataires;
                  return {
                    ...p,
                    locataire: locataire?.nom || 'N/A',
                    bien: bien?.nom || 'N/A',
                    proprietaire: proprietaire?.nom || 'N/A'
                  };
                });

                const depensesDuJour = reportData.depenses.filter(d => {
                  const dDate = new Date(d.date_depense);
                  return dDate >= dayStart && dDate <= dayEnd;
                }).map(d => {
                  const bien = reportData.biens.find(b => b.id === d.bien_id);

                  // Récupérer le propriétaire: soit directement via la dépense, soit via le bien
                  let proprietaire = null;
                  if (d.proprietaire_id) {
                    proprietaire = reportData.proprietaires.find(pr => pr.id === d.proprietaire_id);
                  }
                  if (!proprietaire && bien) {
                    proprietaire = reportData.proprietaires.find(pr => pr.id === bien.proprietaire_id);
                  }

                  return {
                    ...d,
                    bien: bien?.nom || (d.proprietaire_id ? 'Dépense Générale' : 'N/A'),
                    proprietaire: proprietaire?.nom || 'N/A'
                  };
                });

                const totalPaiementsJour = paiementsDuJour.reduce((s, p) => s + Number(p.montant), 0);
                const totalDepensesJour = depensesDuJour.reduce((s, d) => s + Number(d.montant), 0);

                const logoBase64 = await imageToBase64(logo);
                await generateDailyReportPDF2(paiementsDuJour, depensesDuJour, selectedDate, totalPaiementsJour, totalDepensesJour, logoBase64);
                toast.success("Rapport journalier généré");
              }}
              className="gap-2 self-end"
            >
              <Printer className="h-4 w-4" />
              Imprimer PDF
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : reportData ? (
            <>
              {(() => {
                const dayStart = new Date(selectedDate);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(selectedDate);
                dayEnd.setHours(23, 59, 59, 999);

                // Filtrer les paiements et dépenses du jour
                const paiementsDuJour = reportData.paiements.filter(p => {
                  const pDate = new Date(p.date_paiement);
                  return pDate >= dayStart && pDate <= dayEnd;
                });

                const depensesDuJour = reportData.depenses.filter(d => {
                  const dDate = new Date(d.date_depense);
                  return dDate >= dayStart && dDate <= dayEnd;
                });

                // Grouper par propriétaire
                const proprietairesData = reportData.proprietaires.map(prop => {
                  const propBiens = reportData.biens.filter(b => b.proprietaire_id === prop.id);
                  const propBienIds = propBiens.map(b => b.id);

                  const propPaiements = paiementsDuJour.filter(p => propBienIds.includes(p.bien_id));
                  const propDepenses = depensesDuJour.filter(d =>
                    d.proprietaire_id === prop.id || (d.bien_id && propBienIds.includes(d.bien_id))
                  );

                  return {
                    proprietaire: prop,
                    paiements: propPaiements,
                    depenses: propDepenses,
                    totalPaiements: propPaiements.reduce((s, p) => s + Number(p.montant), 0),
                    totalDepenses: propDepenses.reduce((s, d) => s + Number(d.montant), 0),
                  };
                }).filter(p => p.paiements.length > 0 || p.depenses.length > 0);

                const totalPaiementsJour = paiementsDuJour.reduce((s, p) => s + Number(p.montant), 0);
                const totalDepensesJour = depensesDuJour.reduce((s, d) => s + Number(d.montant), 0);

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-blue-500/20 bg-blue-500/5">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Paiements</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {totalPaiementsJour.toLocaleString('fr-FR')} FCFA
                              </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-blue-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-red-500/20 bg-red-500/5">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Dépenses</p>
                              <p className="text-2xl font-bold text-red-600">
                                {totalDepensesJour.toLocaleString('fr-FR')} FCFA
                              </p>
                            </div>
                            <Receipt className="h-8 w-8 text-red-600" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-green-500/20 bg-green-500/5">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Solde Net</p>
                              <p className="text-2xl font-bold text-green-600">
                                {(totalPaiementsJour - totalDepensesJour).toLocaleString('fr-FR')} FCFA
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {proprietairesData.length > 0 ? (
                      <div className="space-y-4">
                        {proprietairesData.map(propData => (
                          <Card key={propData.proprietaire.id} className="border-muted/60 shadow-sm">
                            <CardHeader className="bg-muted/5 border-b py-4">
                              <CardTitle className="text-lg font-medium flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <Building2 className="h-5 w-5 text-muted-foreground" />
                                  {propData.proprietaire.nom}
                                </span>
                                <div className="flex gap-4 text-sm font-normal">
                                  <span className="text-green-600">
                                    +{propData.totalPaiements.toLocaleString('fr-FR')} FCFA
                                  </span>
                                  {propData.totalDepenses > 0 && (
                                    <span className="text-red-600">
                                      -{propData.totalDepenses.toLocaleString('fr-FR')} FCFA
                                    </span>
                                  )}
                                </div>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                              {propData.paiements.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    Paiements ({propData.paiements.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {propData.paiements.map(p => {
                                      const bien = reportData.biens.find(b => b.id === p.bien_id);
                                      const locataire = reportData.contrats.find(c => c.locataire_id === p.locataire_id)?.locataires;
                                      return (
                                        <div key={p.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                                          <div>
                                            <p className="font-medium">{locataire?.nom || 'N/A'}</p>
                                            <p className="text-sm text-muted-foreground">
                                              {bien?.nom} • {p.type}
                                            </p>
                                          </div>
                                          <p className="font-bold text-green-600">
                                            {Number(p.montant).toLocaleString('fr-FR')} FCFA
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {propData.depenses.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-red-600" />
                                    Dépenses ({propData.depenses.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {propData.depenses.map(d => {
                                      const bien = reportData.biens.find(b => b.id === d.bien_id);
                                      return (
                                        <div key={d.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                          <div>
                                            <p className="font-medium">{d.description}</p>
                                            <p className="text-sm text-muted-foreground">
                                              {bien?.nom} • {d.categorie}
                                            </p>
                                          </div>
                                          <p className="font-bold text-red-600">
                                            {Number(d.montant).toLocaleString('fr-FR')} FCFA
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="border-muted/60">
                        <CardContent className="p-12">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                              <Receipt className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground">Aucune activité</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                              Aucun paiement ni dépense enregistré pour le {new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                );
              })()}
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="historique" className="space-y-6">
          <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans l'historique..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <Card className="border-muted/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/5 border-b py-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Historique des rapports
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistorique ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : filteredHistorique && filteredHistorique.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-muted/60">
                        <TableHead>Mois concerné</TableHead>
                        <TableHead>Date de génération</TableHead>
                        <TableHead className="text-right">Revenus</TableHead>
                        <TableHead className="text-right">Dépenses</TableHead>
                        <TableHead className="text-right w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistorique.map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/5 transition-colors border-muted/60">
                          <TableCell>
                            <Badge variant="secondary" className="font-normal bg-muted text-muted-foreground hover:bg-muted/80">
                              {new Date(r.mois_concerne + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(r.date_generation).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {Number(r.total_revenus).toLocaleString('fr-FR')} FCFA
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {Number(r.total_depenses).toLocaleString('fr-FR')} FCFA
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(r.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                    <History className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">Aucun rapport dans l'historique</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Les rapports générés apparaîtront ici.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rapports;
