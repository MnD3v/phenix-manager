import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, Home, User, Phone, Mail, MapPin, Banknote } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateContratPDF, generateReceiptPDF, imageToBase64 } from "@/lib/pdf-generator";
import logo from "@/assets/logo-phenix.png";
import { toast } from "sonner";
import { useState } from "react";
import PrintOptionsDialog, { PrintOptionChoice } from "@/components/paiements/PrintOptionsDialog";

interface ContratDetailsDialogProps {
  contrat: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContratDetailsDialog = ({ contrat, open, onOpenChange }: ContratDetailsDialogProps) => {
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  if (!contrat) return null;

  const handlePrintContract = async () => {
    try {
      const logoBase64 = await imageToBase64(logo);
      await generateContratPDF(contrat, logoBase64);
      toast.success("Contrat généré avec succès");
    } catch (error) {
      console.error("Error generating contract:", error);
      toast.error("Erreur lors de la génération du contrat");
    }
  };

  const handlePrintReceipt = async (options?: any) => {
    try {
      const logoBase64 = await imageToBase64(logo);

      const cautionMontant = contrat.caution || 0;
      const avanceMontant = (contrat.avance_mois || 0) * contrat.loyer_mensuel;
      const totalMontant = cautionMontant + avanceMontant;

      const receiptData = {
        id: `CAUTION-${contrat.id.slice(0, 8)}`,
        date_paiement: contrat.date_debut,
        montant: totalMontant,
        type: "caution",
        mois_concerne: contrat.date_debut,
        notes: `Caution: ${cautionMontant} FCFA + Avance (${contrat.avance_mois} mois): ${avanceMontant} FCFA`,
        locataire: {
          nom: contrat.locataires?.nom || "",
          telephone: contrat.locataires?.telephone || "",
          adresse: contrat.locataires?.adresse || "",
        },
        bien: {
          nom: contrat.biens?.nom || "",
          adresse: contrat.biens?.adresse || "",
          type: contrat.biens?.type || "",
        },
        contrat: {
          loyer_mensuel: contrat.loyer_mensuel,
        },
        nombreMois: contrat.avance_mois,
        moisDetails: [
          { mois: "Caution (Dépôt de garantie)", montant: cautionMontant },
          { mois: `Avance sur loyer (${contrat.avance_mois || 0} mois)`, montant: avanceMontant }
        ]
      };

      // @ts-ignore - The type definition for generateReceiptPDF might need update to support custom items
      await generateReceiptPDF(receiptData, logoBase64, options);
      toast.success("Reçu généré avec succès");
    } catch (error) {
      console.error("Error generating receipt:", error);
      toast.error("Erreur lors de la génération du reçu");
    }
  };

  const handleConfirmPrint = (options: PrintOptionChoice) => {
    handlePrintReceipt({
      format: options.format,
      orientation: options.orientation,
      copies: options.copies
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Détails du Contrat
          </DialogTitle>
          <DialogDescription>
            Contrat de location - {contrat.locataires?.nom}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Locataire */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              Locataire
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 pl-7">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{contrat.locataires?.nom}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contrat.locataires?.telephone}</span>
              </div>
              {contrat.locataires?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{contrat.locataires?.email}</span>
                </div>
              )}
              {contrat.locataires?.adresse && (
                <div className="flex items-center gap-2 text-sm sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{contrat.locataires?.adresse}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bien */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
              <Home className="h-5 w-5" />
              Bien Loué
            </h3>
            <div className="grid gap-3 pl-7">
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{contrat.biens?.nom}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{contrat.biens?.adresse}</span>
              </div>
            </div>
          </div>

          {/* Détails Contrat */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              Détails du Contrat
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 pl-7">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Date de début</p>
                <p className="font-semibold">
                  {format(new Date(contrat.date_debut), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
              {contrat.date_fin && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date de fin</p>
                  <p className="font-semibold">
                    {format(new Date(contrat.date_fin), "dd MMMM yyyy", { locale: fr })}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Statut</p>
                <Badge
                  variant="secondary"
                  className={contrat.statut === "actif"
                    ? "bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20"
                    : "bg-muted text-muted-foreground"
                  }
                >
                  {contrat.statut === "actif" ? "Actif" : "Terminé"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Informations Financières */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
              <Banknote className="h-5 w-5" />
              Informations Financières
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 pl-7">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Loyer mensuel</p>
                <p className="text-xl font-bold text-primary">
                  {contrat.loyer_mensuel.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Caution</p>
                <p className="text-xl font-bold">
                  {contrat.caution?.toLocaleString("fr-FR")} FCFA
                </p>
                {contrat.caution_mois > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ({contrat.caution_mois} mois)
                  </p>
                )}
              </div>
              {contrat.garantie_mois > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Garantie</p>
                  <p className="text-xl font-bold">
                    {contrat.garantie_mois} mois
                  </p>
                </div>
              )}
              {contrat.avance_mois > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avance</p>
                  <p className="text-xl font-bold">
                    {contrat.avance_mois} mois
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button variant="outline" onClick={() => setPrintDialogOpen(true)} className="gap-2">
            <FileText className="h-4 w-4" />
            Imprimer le reçu
          </Button>
          <Button onClick={handlePrintContract} className="gap-2">
            <Download className="h-4 w-4" />
            Imprimer le Contrat
          </Button>
        </div>
      </DialogContent>
      <PrintOptionsDialog open={printDialogOpen} onOpenChange={setPrintDialogOpen} onConfirm={handleConfirmPrint} />
    </Dialog>
  );
};
