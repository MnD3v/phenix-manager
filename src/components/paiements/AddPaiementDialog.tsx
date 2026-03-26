import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { envoyerSmsConfirmationPaiement } from "@/services/smsService";
import { DatePicker } from "@/components/ui/date-picker";

export const AddPaiementDialog = () => {
  const [open, setOpen] = useState(false);
  const [contratId, setContratId] = useState("");
  const [type, setType] = useState<"loyer" | "avance" | "caution" | "arrieres">("loyer");
  const [montant, setMontant] = useState("");
  const [moisConcerne, setMoisConcerne] = useState(new Date().toISOString().slice(0, 7));
  const [datePaiement, setDatePaiement] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [nombreMois, setNombreMois] = useState("1");
  const [moisArriereDebut, setMoisArriereDebut] = useState("");
  const [moisArriereFin, setMoisArriereFin] = useState("");
  const [sendSms, setSendSms] = useState(true);
  const queryClient = useQueryClient();

  const { data: contratsActifs } = useQuery({
    queryKey: ["contrats-actifs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrats")
        .select("*, locataires(nom, telephone), biens(nom, loyer_mensuel)")
        .eq("statut", "actif");

      if (error) throw error;

      // Force sorting by tenant name on the client side
      return (data || []).sort((a: any, b: any) =>
        (a.locataires?.nom || "").localeCompare(b.locataires?.nom || "")
      );
    },
  });

  // Récupérer les paiements existants pour ce contrat
  const { data: paiementsExistants } = useQuery({
    queryKey: ["paiements-contrat", contratId],
    queryFn: async () => {
      if (!contratId) return [];
      const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .eq("contrat_id", contratId)
        .order("mois_concerne", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contratId,
  });

  const selectedContrat = contratsActifs?.find((c) => c.id === contratId);

  // Calculer le prochain mois à payer en fonction des paiements existants
  useEffect(() => {
    if (selectedContrat && paiementsExistants !== undefined && (type === "loyer" || type === "avance")) {
      // Fonction utilitaire pour éviter les problèmes de fuseau horaire
      const getDateFromStr = (str: string) => {
        const [y, m] = str.split("-").map(Number);
        return new Date(y, m - 1, 1, 12, 0, 0); // Midi pour éviter les décalages
      };

      // Date de début du contrat
      const dateDebut = getDateFromStr(selectedContrat.date_debut);

      // Initialiser le dernier mois couvert
      let dernierMoisCouvert = new Date(dateDebut);

      // Si avance, on couvre depuis le début : dateDebut + avance - 1 mois
      if (selectedContrat.avance_mois && selectedContrat.avance_mois > 0) {
        dernierMoisCouvert.setMonth(dernierMoisCouvert.getMonth() + selectedContrat.avance_mois - 1);
      } else {
        // Sinon, on considère qu'aucun mois n'est couvert, on recule de 1
        dernierMoisCouvert.setMonth(dernierMoisCouvert.getMonth() - 1);
      }

      // Parcourir les paiements (Loyer/Avance)
      const paiementsLoyer = paiementsExistants.filter(p =>
        (p.type === "loyer" || p.type === "avance") && p.mois_concerne
      );

      paiementsLoyer.forEach(p => {
        if (!p.mois_concerne) return;

        const moisDebut = getDateFromStr(p.mois_concerne);
        const montant = parseFloat(p.montant?.toString() || "0");
        const loyerMensuel = selectedContrat.loyer_mensuel;

        // Nombre de mois payés par ce paiement
        const nbMoisPaye = loyerMensuel > 0 ? Math.round(montant / loyerMensuel) : 1;

        // Dernier mois couvert par ce paiement
        const finPaiement = new Date(moisDebut);
        finPaiement.setMonth(finPaiement.getMonth() + Math.max(1, nbMoisPaye) - 1);

        // Si ce paiement couvre plus loin, on met à jour
        if (finPaiement > dernierMoisCouvert) {
          dernierMoisCouvert = finPaiement;
        }
      });

      // Le prochain mois est le mois suivant le dernier couvert
      dernierMoisCouvert.setMonth(dernierMoisCouvert.getMonth() + 1);

      // Format YYYY-MM
      const y = dernierMoisCouvert.getFullYear();
      const m = String(dernierMoisCouvert.getMonth() + 1).padStart(2, "0");
      setMoisConcerne(`${y}-${m}`);
    }
  }, [selectedContrat, paiementsExistants, type]);

  // Calculer le montant en fonction du nombre de mois (loyer ou avance)
  useEffect(() => {
    if (selectedContrat && (type === "loyer" || type === "avance")) {
      const mois = parseInt(nombreMois) || 1;
      setMontant((selectedContrat.loyer_mensuel * mois).toString());
    }
  }, [nombreMois, selectedContrat, type]);

  // Calculer le montant pour les arriérés
  useEffect(() => {
    if (selectedContrat && type === "arrieres" && moisArriereDebut && moisArriereFin) {
      const debut = new Date(`${moisArriereDebut}-01`);
      const fin = new Date(`${moisArriereFin}-01`);
      const moisDiff = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;
      if (moisDiff > 0) {
        setMontant((selectedContrat.loyer_mensuel * moisDiff).toString());
      }
    }
  }, [moisArriereDebut, moisArriereFin, selectedContrat, type]);


  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContrat) return;

      const nbMois = parseInt(nombreMois) || 1;

      if (type === "loyer" || type === "avance") {
        // IMPORTANT: Créer UN SEUL paiement consolidé avec le montant total
        const montantTotal = selectedContrat.loyer_mensuel * nbMois;

        // Construire une note avec les détails des mois payés
        const moisDepart = new Date(`${moisConcerne}-01`);
        const moisFin = new Date(moisDepart);
        moisFin.setMonth(moisFin.getMonth() + nbMois - 1);

        const notesPaiement = nbMois > 1
          ? `${type === "avance" ? "Avance" : "Loyer"} ${nbMois} mois (${moisDepart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} → ${moisFin.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })})${notes ? ` - ${notes}` : ""}`
          : notes || null;

        const { data: insertedPaiement, error } = await supabase.from("paiements").insert({
          contrat_id: contratId,
          locataire_id: selectedContrat.locataire_id,
          bien_id: selectedContrat.bien_id,
          montant: montantTotal,
          type: type,
          mois_concerne: moisConcerne + "-01", // Premier mois de la période
          date_paiement: datePaiement ? format(datePaiement, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
          notes: notesPaiement,
          statut: "paye" as const,
          sms_status: sendSms ? 'en_attente' : 'non_envoye',
        }).select().single();
        if (error) throw error;

        if (sendSms) {
          if (selectedContrat.locataires?.telephone) {
            const detailMois = nbMois > 1
              ? `${moisDepart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} → ${moisFin.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
              : `${moisDepart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
            const success = await envoyerSmsConfirmationPaiement(
              selectedContrat.locataires.telephone,
              selectedContrat.locataires.nom,
              nbMois,
              montantTotal,
              detailMois
            );
            await supabase.from("paiements").update({ sms_status: success ? 'succes' : 'echec' }).eq('id', insertedPaiement.id);
          } else {
            await supabase.from("paiements").update({ sms_status: 'echec' }).eq('id', insertedPaiement.id);
            toast.error("Échec: le locataire n'a pas de numéro de téléphone");
          }
        }
      } else if (type === "arrieres") {
        // Pour les arriérés: créer UN SEUL paiement consolidé
        if (!moisArriereDebut || !moisArriereFin) {
          throw new Error("Veuillez sélectionner la période des arriérés");
        }

        const debut = new Date(`${moisArriereDebut}-01`);
        const fin = new Date(`${moisArriereFin}-01`);
        const moisDiff = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;
        const montantTotal = selectedContrat.loyer_mensuel * moisDiff;

        const notesPaiement = `Arriérés ${moisDiff} mois (${debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} → ${fin.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })})${notes ? ` - ${notes}` : ""}`;

        const { data: insertedPaiement, error } = await supabase.from("paiements").insert({
          contrat_id: contratId,
          locataire_id: selectedContrat.locataire_id,
          bien_id: selectedContrat.bien_id,
          montant: montantTotal,
          type: "loyer" as const,
          mois_concerne: moisArriereDebut + "-01", // Premier mois de la période
          date_paiement: datePaiement ? format(datePaiement, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
          notes: notesPaiement,
          statut: "paye" as const,
          sms_status: sendSms ? 'en_attente' : 'non_envoye',
        }).select().single();
        if (error) throw error;

        if (sendSms) {
          if (selectedContrat.locataires?.telephone) {
            const detailMois = moisDiff > 1
              ? `${debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} → ${fin.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
              : `${debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
            const success = await envoyerSmsConfirmationPaiement(
              selectedContrat.locataires.telephone,
              selectedContrat.locataires.nom,
              moisDiff,
              montantTotal,
              detailMois
            );
            await supabase.from("paiements").update({ sms_status: success ? 'succes' : 'echec' }).eq('id', insertedPaiement.id);
          } else {
            await supabase.from("paiements").update({ sms_status: 'echec' }).eq('id', insertedPaiement.id);
            toast.error("Échec: le locataire n'a pas de numéro de téléphone");
          }
        }
      } else {
        // Caution - comportement normal
        const montantCaution = parseFloat(montant);
        const { data: insertedPaiement, error } = await supabase.from("paiements").insert({
          contrat_id: contratId,
          locataire_id: selectedContrat.locataire_id,
          bien_id: selectedContrat.bien_id,
          montant: montantCaution,
          type: type,
          mois_concerne: null,
          date_paiement: datePaiement ? format(datePaiement, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
          notes: notes || null,
          statut: "paye",
          sms_status: sendSms ? 'en_attente' : 'non_envoye',
        }).select().single();
        if (error) throw error;

        if (sendSms) {
          if (selectedContrat.locataires?.telephone) {
            const success = await envoyerSmsConfirmationPaiement(
              selectedContrat.locataires.telephone,
              selectedContrat.locataires.nom,
              1,
              montantCaution,
              "Caution"
            );
            await supabase.from("paiements").update({ sms_status: success ? 'succes' : 'echec' }).eq('id', insertedPaiement.id);
          } else {
            await supabase.from("paiements").update({ sms_status: 'echec' }).eq('id', insertedPaiement.id);
            toast.error("Échec: le locataire n'a pas de numéro de téléphone");
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      queryClient.invalidateQueries({ queryKey: ["paiements-contrat"] });
      const nbMois = parseInt(nombreMois) || 1;
      toast.success(nbMois > 1
        ? `Paiement de ${nbMois} mois enregistré avec succès`
        : "Paiement enregistré avec succès"
      );
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setContratId("");
    setType("loyer");
    setMontant("");
    setMoisConcerne(new Date().toISOString().slice(0, 7));
    setDatePaiement(new Date());
    setNotes("");
    setNombreMois("1");
    setMoisArriereDebut("");
    setMoisArriereFin("");
    setSendSms(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate();
  };

  // Afficher le prochain mois à payer
  const prochainMoisAPayer = moisConcerne ? new Date(`${moisConcerne}-01`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Enregistrer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau Paiement</DialogTitle>
          <DialogDescription>Enregistrer un paiement de loyer, avance ou caution</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="contrat">Contrat / Locataire *</Label>
            <Select value={contratId} onValueChange={setContratId} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  contratsActifs && contratsActifs.length > 0
                    ? "Sélectionner un contrat actif"
                    : "Aucun contrat actif disponible"
                } />
              </SelectTrigger>
              <SelectContent>
                {contratsActifs && contratsActifs.length > 0 ? (
                  contratsActifs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.locataires?.nom} - {c.biens?.nom}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Aucun contrat actif
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedContrat && (
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p><strong>Bien:</strong> {selectedContrat.biens?.nom}</p>
              <p><strong>Loyer mensuel:</strong> {selectedContrat.loyer_mensuel.toLocaleString()} FCFA</p>
              {type === "loyer" && prochainMoisAPayer && (
                <p className="text-primary font-medium">
                  <strong>Prochain mois a payer:</strong> {prochainMoisAPayer}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">Type de paiement *</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loyer">Loyer</SelectItem>
                <SelectItem value="caution">Caution</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "loyer" && (
            <div className="space-y-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="mois">Mois de départ *</Label>
                <Input
                  id="mois"
                  type="month"
                  value={moisConcerne}
                  onChange={(e) => setMoisConcerne(e.target.value)}
                  required
                  disabled={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombreMois">Nombre de mois à payer *</Label>
                <Select value={nombreMois} onValueChange={setNombreMois}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} mois
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedContrat && parseInt(nombreMois) > 1 && (
                <div className="text-sm bg-background p-2 rounded border">
                  <p className="font-medium text-primary">
                    Période: {new Date(`${moisConcerne}-01`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                    {" → "}
                    {(() => {
                      const fin = new Date(`${moisConcerne}-01`);
                      fin.setMonth(fin.getMonth() + parseInt(nombreMois) - 1);
                      return fin.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                    })()}
                  </p>
                  <p className="text-muted-foreground">
                    Total: {(selectedContrat.loyer_mensuel * parseInt(nombreMois)).toLocaleString()} FCFA
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="montant">
              {type === "caution" ? "Nombre de mois de caution *" : "Montant total (FCFA) *"}
            </Label>
            <Input
              id="montant"
              type="number"
              step={type === "caution" ? "1" : "0.01"}
              value={type === "caution" && selectedContrat ? (montant ? Math.round(parseFloat(montant) / selectedContrat.loyer_mensuel) : "") : montant}
              onChange={(e) => {
                if (type === "caution" && selectedContrat) {
                  const nbMois = parseFloat(e.target.value) || 0;
                  setMontant((nbMois * selectedContrat.loyer_mensuel).toString());
                } else {
                  setMontant(e.target.value);
                }
              }}
              required
              disabled={type === "loyer"}
              className="font-semibold"
            />
            {type === "caution" && selectedContrat && montant && (
              <p className="text-sm text-muted-foreground">
                Montant: {parseFloat(montant).toLocaleString()} FCFA
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Date du paiement *</Label>
            <DatePicker
              date={datePaiement}
              onSelect={setDatePaiement}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">
              Envoyer un SMS de confirmation au locataire
            </Label>
            <RadioGroup
              defaultValue="oui"
              onValueChange={(value) => setSendSms(value === "oui")}
              className="flex items-center space-x-6"
              value={sendSms ? "oui" : "non"}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oui" id="sms-oui" />
                <Label htmlFor="sms-oui" className="cursor-pointer">Oui</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non" id="sms-non" />
                <Label htmlFor="sms-non" className="cursor-pointer">Non</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
