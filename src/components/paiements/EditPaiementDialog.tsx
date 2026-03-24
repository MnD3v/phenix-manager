import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

interface EditPaiementDialogProps {
  paiement: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPaiementDialog = ({ paiement, open, onOpenChange }: EditPaiementDialogProps) => {
  const [type, setType] = useState<"loyer" | "avance" | "caution">("loyer");
  const [montant, setMontant] = useState("");
  const [moisConcerne, setMoisConcerne] = useState("");
  const [datePaiement, setDatePaiement] = useState<Date | undefined>(undefined);
  const [statut, setStatut] = useState<"paye" | "en_attente" | "retard">("paye");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (paiement) {
      setType(paiement.type || "loyer");
      setMontant(paiement.montant?.toString() || "");
      setMoisConcerne(paiement.mois_concerne ? paiement.mois_concerne.slice(0, 7) : "");
      setDatePaiement(paiement.date_paiement ? new Date(paiement.date_paiement) : undefined);
      setStatut(paiement.statut || "paye");
      setNotes(paiement.notes || "");
    }
  }, [paiement]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("paiements")
        .update({
          type,
          montant: parseFloat(montant),
          mois_concerne: type === "loyer" && moisConcerne ? `${moisConcerne}-01` : null,
          date_paiement: datePaiement ? format(datePaiement, "yyyy-MM-dd") : null,
          statut,
          notes: notes || null,
        })
        .eq("id", paiement.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      toast.success("Paiement modifié avec succès");
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
          <DialogTitle>Modifier le Paiement</DialogTitle>
          <DialogDescription>Mettre à jour les informations du paiement</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type de paiement *</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loyer">Loyer</SelectItem>
                <SelectItem value="avance">Avance</SelectItem>
                <SelectItem value="caution">Caution</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "loyer" && (
            <div className="space-y-2">
              <Label htmlFor="mois">Mois concerné *</Label>
              <Input
                id="mois"
                type="month"
                value={moisConcerne}
                onChange={(e) => setMoisConcerne(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="montant">Montant (FCFA) *</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Date du paiement *</Label>
            <DatePicker
              date={datePaiement}
              onSelect={setDatePaiement}
              disabled={true}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="statut">Statut *</Label>
            <Select value={statut} onValueChange={(v: any) => setStatut(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paye">Payé</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="retard">En retard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" />
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
