import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Printer, Edit, Trash2, CheckCircle2, XCircle, RefreshCw, Smartphone } from "lucide-react";
import { AddPaiementDialog } from "@/components/paiements/AddPaiementDialog";
import { EditPaiementDialog } from "@/components/paiements/EditPaiementDialog";
import { DeletePaiementDialog } from "@/components/paiements/DeletePaiementDialog";
import { generateReceiptPDF, imageToBase64, PrintOptions } from "@/lib/pdf-generator";
import { envoyerSmsConfirmationPaiement } from "@/services/smsService";
import PrintOptionsDialog from "@/components/paiements/PrintOptionsDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import logo from "@/assets/logo-phenix.png";
import { useAuth } from "@/contexts/AuthContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SearchPaiementsDialog } from "@/components/paiements/SearchPaiementsDialog";

const Paiements = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPaiement, setSelectedPaiement] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ["paiements"],
    queryFn: async () => {
      let query = supabase
        .from("paiements")
        .select(`
          *,
          locataires(nom, telephone, email, adresse),
          biens(nom, adresse, type),
          contrats(loyer_mensuel)
        `)
        .order("date_paiement", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [paiementToPrint, setPaiementToPrint] = useState<any>(null);
  const [isRetryingSms, setIsRetryingSms] = useState<string | null>(null);
  const [messagePreviewOpen, setMessagePreviewOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");

  const genererContenuSms = (paiement: any) => {
    const loyerMensuel = parseFloat(paiement.contrats?.loyer_mensuel?.toString() || "0");
    const montant = parseFloat(paiement.montant.toString());
    let nbMois = loyerMensuel > 0 ? Math.round(montant / loyerMensuel) : 1;

    let descMois = "";
    if (paiement.type === "caution") descMois = "Caution";
    else if (paiement.mois_concerne) {
      const moisDepart = new Date(paiement.mois_concerne);
      if (nbMois > 1) {
        const moisFin = new Date(moisDepart);
        moisFin.setMonth(moisFin.getMonth() + nbMois - 1);
        descMois = `${moisDepart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} → ${moisFin.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
      } else {
        descMois = `${moisDepart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
      }
    }

    const locataireNom = paiement.locataires?.nom || "";
    const montantFormate = montant.toLocaleString('fr-FR');
    let detailMois = "";

    if (descMois === "Caution") {
      detailMois = "pour votre caution";
    } else if (nbMois === 1 && descMois) {
      detailMois = `pour le mois de ${descMois}`;
    } else if (nbMois > 1) {
      detailMois = `pour ${nbMois} mois (${descMois || ''})`;
    }

    return `Bonjour ${locataireNom}, nous confirmons la réception de votre paiement de ${montantFormate} FCFA ${detailMois}. Merci pour votre confiance.\nphenix IMMO`;
  };

  const handlePreviewSms = (paiement: any) => {
    setPreviewMessage(genererContenuSms(paiement));
    setMessagePreviewOpen(true);
  };

  const handleRetrySms = async (paiement: any) => {
    try {
      if (!paiement.locataires?.telephone) {
        toast.error("Le locataire n'a pas de numéro de téléphone enregistré.");
        return;
      }
      setIsRetryingSms(paiement.id);
      toast.loading("Renvoi du SMS...", { id: `sms-${paiement.id}` });

      const loyerMensuel = parseFloat(paiement.contrats?.loyer_mensuel?.toString() || "0");
      const montant = parseFloat(paiement.montant.toString());
      let nbMois = loyerMensuel > 0 ? Math.round(montant / loyerMensuel) : 1;

      let descMois = "";
      if (paiement.type === "caution") descMois = "Caution";
      else if (paiement.mois_concerne) {
        const moisDepart = new Date(paiement.mois_concerne);
        if (nbMois > 1) {
          const moisFin = new Date(moisDepart);
          moisFin.setMonth(moisFin.getMonth() + nbMois - 1);
          descMois = `${moisDepart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} → ${moisFin.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
        } else {
          descMois = `${moisDepart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
        }
      }

      const success = await envoyerSmsConfirmationPaiement(
        paiement.locataires.telephone,
        paiement.locataires.nom,
        nbMois,
        montant,
        descMois
      );

      if (success) {
        await supabase.from("paiements").update({ sms_status: 'succes' }).eq('id', paiement.id);
        queryClient.invalidateQueries({ queryKey: ["paiements"] });
        toast.success("SMS renvoyé avec succès", { id: `sms-${paiement.id}` });
      } else {
        await supabase.from("paiements").update({ sms_status: 'echec' }).eq('id', paiement.id);
        queryClient.invalidateQueries({ queryKey: ["paiements"] });
        toast.error("Échec du renvoi SMS", { id: `sms-${paiement.id}` });
      }
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`, { id: `sms-${paiement.id}` });
    } finally {
      setIsRetryingSms(null);
    }
  };

  const handlePrintReceipt = async (paiement: any, options?: PrintOptions) => {
    try {
      toast.loading("Génération de la facture PDF...");

      // Convert logo to base64
      const logoBase64 = await imageToBase64(logo);

      // Calculer le nombre de mois et les détails
      const loyerMensuel = parseFloat(paiement.contrats?.loyer_mensuel?.toString() || "0");
      const montant = parseFloat(paiement.montant.toString());
      let nombreMois = 1;
      let moisDetails: { mois: string; montant: number }[] = [];

      if ((paiement.type === "loyer" || paiement.type === "avance" || paiement.type === "arrieres") && loyerMensuel > 0) {
        nombreMois = Math.round(montant / loyerMensuel);

        // Générer les détails pour chaque mois
        if (paiement.mois_concerne && nombreMois > 0) {
          const startDate = new Date(paiement.mois_concerne);
          for (let i = 0; i < nombreMois; i++) {
            const moisDate = new Date(startDate);
            moisDate.setMonth(moisDate.getMonth() + i);
            moisDetails.push({
              mois: moisDate.toISOString().slice(0, 7) + "-01",
              montant: loyerMensuel
            });
          }
        }
      }

      // Generate PDF
      await generateReceiptPDF(
        {
          id: paiement.id,
          date_paiement: paiement.date_paiement,
          montant: montant,
          type: paiement.type,
          mois_concerne: paiement.mois_concerne,
          notes: paiement.notes,
          locataire: {
            nom: paiement.locataires?.nom || "",
            telephone: paiement.locataires?.telephone || "",
            email: paiement.locataires?.email,
            adresse: paiement.locataires?.adresse,
          },
          bien: {
            nom: paiement.biens?.nom || "",
            adresse: paiement.biens?.adresse || "",
            type: paiement.biens?.type || "maison",
          },
          contrat: {
            loyer_mensuel: loyerMensuel,
          },
          nombreMois: nombreMois,
          moisDetails: moisDetails.length > 0 ? moisDetails : undefined,
        },
        logoBase64,
        options
      );

      toast.dismiss();
      toast.success("Facture générée avec succès !");
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Erreur lors de la génération: ${error.message}`);
    }
  };

  const openPrintDialogFor = (p: any) => {
    setPaiementToPrint(p);
    setPrintDialogOpen(true);
  };

  const handleConfirmPrint = async (opts: { format: "a5" | "a4" | "custom"; orientation: "portrait" | "landscape"; copies?: 1 | 2 }) => {
    if (!paiementToPrint) return;
    await handlePrintReceipt(paiementToPrint, { format: opts.format, orientation: opts.orientation, copies: opts.copies });
    setPaiementToPrint(null);
  };

  const getStatutBadge = (statut: string) => {
    if (statut === "paye") return <Badge>Payé</Badge>;
    if (statut === "en_attente") return <Badge variant="secondary">En attente</Badge>;
    return <Badge variant="destructive">Retard</Badge>;
  };

  const allPaiements = data || [];

  const filteredPaiements = allPaiements;

  const getRegistrationMonth = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    let targetDate = date;
    if (day <= 15) {
      targetDate = new Date(year, month - 1, 1);
    }

    const monthName = targetDate.toLocaleDateString("fr-FR", { month: "long" });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${targetDate.getFullYear()}`;
  };

  const groupedPaiements = filteredPaiements.reduce((acc: Record<string, typeof allPaiements>, paiement) => {
    const month = getRegistrationMonth(paiement.date_paiement);
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month]!.push(paiement);
    return acc;
  }, {});

  const getMonthSortValue = (monthStr: string) => {
    const [m, y] = monthStr.split(" ");
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const monthIndex = months.indexOf(m);
    return parseInt(y) * 12 + monthIndex;
  };

  const sortedMonths = Object.keys(groupedPaiements || {}).sort((a, b) => getMonthSortValue(b) - getMonthSortValue(a));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Paiements</h1>
          <p className="text-muted-foreground">Suivi des paiements et loyers</p>
        </div>
        <AddPaiementDialog />
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-4">
            <CardTitle>Historique des paiements</CardTitle>
            <SearchPaiementsDialog />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : (
            <div className="space-y-4">
              {sortedMonths.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Aucun paiement trouvé</div>
              ) : (
                <Accordion type="multiple" className="w-full space-y-4">
                  {sortedMonths.map((month) => {
                    const monthPaiements = groupedPaiements[month] || [];
                    const monthTotal = monthPaiements.reduce((sum, p) => sum + parseFloat(p.montant.toString()), 0);

                    return (
                      <AccordionItem key={month} value={month} className="border rounded-lg px-4 bg-card shadow-sm">
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex flex-1 items-center justify-between pr-4">
                            <h3 className="text-lg font-semibold">{month}</h3>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-muted-foreground bg-muted/10">
                                {monthPaiements.length} paiement{monthPaiements.length > 1 ? 's' : ''}
                              </Badge>
                              <Badge variant="secondary" className="font-semibold text-base py-1">
                                {monthTotal.toLocaleString()} FCFA
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="overflow-x-auto pt-4 border-t border-muted -mx-6 md:mx-0">
                            <div className="inline-block min-w-full align-middle px-6 md:px-0">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="whitespace-nowrap">Date</TableHead>
                                    <TableHead className="whitespace-nowrap">Locataire</TableHead>
                                    <TableHead className="whitespace-nowrap">Bien</TableHead>
                                    <TableHead className="whitespace-nowrap">Type</TableHead>
                                    <TableHead className="whitespace-nowrap">Montant</TableHead>
                                    <TableHead className="whitespace-nowrap">Statut</TableHead>
                                    <TableHead className="whitespace-nowrap">SMS</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {monthPaiements.map((p) => (
                                    <TableRow key={p.id}>
                                      <TableCell className="whitespace-nowrap">{new Date(p.date_paiement).toLocaleDateString("fr-FR")}</TableCell>
                                      <TableCell className="font-medium whitespace-nowrap">{p.locataires?.nom}</TableCell>
                                      <TableCell className="whitespace-nowrap">{p.biens?.nom}</TableCell>
                                      <TableCell className="whitespace-nowrap">{p.type}</TableCell>
                                      <TableCell className="font-bold whitespace-nowrap">{parseFloat(p.montant.toString()).toLocaleString()} FCFA</TableCell>
                                      <TableCell className="whitespace-nowrap">{getStatutBadge(p.statut)}</TableCell>
                                      <TableCell className="whitespace-nowrap">
                                        {p.sms_status === "succes" && (
                                          <div
                                            className="flex items-center text-green-600 gap-1 cursor-pointer hover:underline"
                                            onClick={() => handlePreviewSms(p)}
                                            title="Voir le message envoyé"
                                          >
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span className="text-xs">Envoyé</span>
                                          </div>
                                        )}
                                        {(!p.sms_status || p.sms_status === "echec" || p.sms_status === "non_envoye") && (
                                          <div
                                            className="flex items-center text-destructive gap-1 cursor-pointer hover:underline"
                                            onClick={() => handleRetrySms(p)}
                                            title="Renvoyer SMS"
                                          >
                                            {isRetryingSms === p.id ? (
                                              <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                                            ) : (
                                              <XCircle className="h-4 w-4" />
                                            )}
                                            <span className="text-xs">Échec (relancer)</span>
                                          </div>
                                        )}
                                        {p.sms_status === "en_attente" && <div className="flex items-center text-yellow-600 gap-1"><Smartphone className="h-4 w-4" /> <span className="text-xs">En cours</span></div>}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-2 whitespace-nowrap">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openPrintDialogFor(p)}
                                            title="Imprimer le reçu"
                                          >
                                            <Printer className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedPaiement(p);
                                              setEditOpen(true);
                                            }}
                                            title="Modifier"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          {isAdmin && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setSelectedPaiement(p);
                                                setDeleteOpen(true);
                                              }}
                                              title="Supprimer"
                                            >
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PrintOptionsDialog open={printDialogOpen} onOpenChange={setPrintDialogOpen} onConfirm={handleConfirmPrint} />

      <Dialog open={messagePreviewOpen} onOpenChange={setMessagePreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message envoyé</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-muted/30 rounded-lg whitespace-pre-wrap text-sm border-l-4 border-l-primary">
            {previewMessage}
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setMessagePreviewOpen(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedPaiement && (
        <>
          <EditPaiementDialog
            paiement={selectedPaiement}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          {isAdmin && (
            <DeletePaiementDialog
              paiement={selectedPaiement}
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Paiements;
