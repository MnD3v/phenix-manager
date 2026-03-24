import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

interface EditContratDialogProps {
  contrat: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditContratDialog = ({ contrat, open, onOpenChange }: EditContratDialogProps) => {
  const [dateDebut, setDateDebut] = useState<Date | undefined>(undefined);
  const [dateFin, setDateFin] = useState<Date | undefined>(undefined);
  const [loyerMensuel, setLoyerMensuel] = useState("");
  const [cautionMois, setCautionMois] = useState("");
  const [garantieMois, setGarantieMois] = useState("");
  const [avanceMois, setAvanceMois] = useState("");
  const [statut, setStatut] = useState<"actif" | "termine">("actif");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (contrat) {
      setDateDebut(contrat.date_debut ? new Date(contrat.date_debut) : undefined);
      setDateFin(contrat.date_fin ? new Date(contrat.date_fin) : undefined);
      setLoyerMensuel(contrat.loyer_mensuel?.toString() || "");

      const computedCautionMois = contrat.caution_mois !== null && contrat.caution_mois !== undefined
        ? contrat.caution_mois.toString()
        : contrat.loyer_mensuel > 0 && contrat.caution > 0
          ? Math.round(contrat.caution / contrat.loyer_mensuel).toString()
          : "0";

      setCautionMois(computedCautionMois);
      setGarantieMois(contrat.garantie_mois?.toString() || "0");
      setAvanceMois(contrat.avance_mois?.toString() || "0");
      setStatut(contrat.statut || "actif");
    }
  }, [contrat]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("contrats")
        .update({
          date_debut: dateDebut ? format(dateDebut, "yyyy-MM-dd") : null,
          date_fin: dateFin ? format(dateFin, "yyyy-MM-dd") : null,
          loyer_mensuel: parseFloat(loyerMensuel),
          caution: (parseFloat(cautionMois) || 0) * parseFloat(loyerMensuel),
          caution_mois: parseInt(cautionMois) || 0,
          garantie_mois: parseInt(garantieMois) || 0,
          avance_mois: parseInt(avanceMois),
          statut,
        })
        .eq("id", contrat.id);
      if (error) throw error;

      // Si la date de début ou les mois d'avance ont changé, mettre à jour le paiement d'avance
      const avanceMoisInt = parseInt(avanceMois);
      const dateDebutStr = dateDebut ? format(dateDebut, "yyyy-MM-dd") : null;
      const dateDebutChanged = dateDebutStr !== contrat.date_debut;
      const avanceMoisChanged = avanceMoisInt !== contrat.avance_mois;

      if (dateDebutChanged || avanceMoisChanged) {
        // Supprimer l'ancien paiement d'avance s'il existe
        await supabase
          .from("paiements")
          .delete()
          .eq("contrat_id", contrat.id)
          .eq("type", "avance");

        // Créer un nouveau paiement d'avance si avance_mois > 0
        if (avanceMoisInt > 0) {
          const montantAvance = parseFloat(loyerMensuel) * avanceMoisInt;
          const { error: paiementError } = await supabase
            .from("paiements")
            .insert({
              contrat_id: contrat.id,
              locataire_id: contrat.locataire_id,
              bien_id: contrat.bien_id,
              date_paiement: dateDebutStr,
              montant: montantAvance,
              type: "avance",
              mois_concerne: dateDebutStr,
              statut: "paye",
              notes: `Avance de ${avanceMoisInt} mois prépayés (mis à jour)`,
            });

          if (paiementError) throw paiementError;
        }
      }

      // Si le contrat devient terminé, mettre à jour le statut du bien
      if (statut === "termine" && contrat.statut === "actif") {
        const { error: bienError } = await supabase
          .from("biens")
          .update({ statut: "disponible" })
          .eq("id", contrat.bien_id);
        if (bienError) throw bienError;

        // Vérifier s'il reste d'autres contrats actifs pour ce locataire
        const { count } = await supabase
          .from("contrats")
          .select("*", { count: "exact", head: true })
          .eq("locataire_id", contrat.locataire_id)
          .eq("statut", "actif");

        // Si aucun contrat actif, déplacer le locataire vers la corbeille
        if (count === 0) {
          const { error: locataireError } = await supabase
            .from("locataires")
            .update({ statut: "corbeille" })
            .eq("id", contrat.locataire_id);
          if (locataireError) throw locataireError;
        }
      }

      // Si le contrat est réactivé, mettre à jour le statut du bien
      if (statut === "actif" && contrat.statut === "termine") {
        const { error: bienError } = await supabase
          .from("biens")
          .update({ statut: "occupe" })
          .eq("id", contrat.bien_id);
        if (bienError) throw bienError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      queryClient.invalidateQueries({ queryKey: ["contrats-actifs"] });
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      queryClient.invalidateQueries({ queryKey: ["paiements-contrat"] });
      queryClient.invalidateQueries({ queryKey: ["locataires"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-locataires"] });
      toast.success("Contrat modifié avec succès");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le Contrat</DialogTitle>
          <DialogDescription>Mettre à jour les informations du contrat</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Date de début *</Label>
            <DatePicker
              date={dateDebut}
              onSelect={setDateDebut}
            />
          </div>
          <div className="space-y-2">
            <Label>Date de fin</Label>
            <DatePicker
              date={dateFin}
              onSelect={setDateFin}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loyer">Loyer mensuel (FCFA) *</Label>
            <Input
              id="loyer"
              type="number"
              step="0.01"
              value={loyerMensuel}
              onChange={(e) => setLoyerMensuel(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="caution">Caution (nombre de mois) *</Label>
            <Input
              id="caution"
              type="number"
              min="0"
              value={cautionMois}
              onChange={(e) => setCautionMois(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="garantie">Garantie (nombre de mois)</Label>
            <Input
              id="garantie"
              type="number"
              min="0"
              value={garantieMois}
              onChange={(e) => setGarantieMois(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avance">Mois d'avance prepayés</Label>
            <Input
              id="avance"
              type="number"
              value={avanceMois}
              onChange={(e) => setAvanceMois(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statut">Statut *</Label>
            <Select value={statut} onValueChange={(v: any) => setStatut(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Modification..." : "Modifier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
