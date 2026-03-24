import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteContratDialogProps {
  contrat: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteContratDialog = ({ contrat, open, onOpenChange }: DeleteContratDialogProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // NOTE: We keep payments for history purposes even if the contract is deleted
      // The payments will remain linked to the tenant and property
      // To delete payments, they must be deleted manually or via tenant permanent deletion


      // Supprimer le contrat
      const { error } = await supabase.from("contrats").delete().eq("id", contrat.id);
      if (error) throw error;

      // Mettre à jour le statut du bien
      const { error: bienError } = await supabase
        .from("biens")
        .update({ statut: "disponible" })
        .eq("id", contrat.bien_id);
      if (bienError) throw bienError;

      // Vérifier s'il reste d'autres contrats pour ce locataire
      const { count } = await supabase
        .from("contrats")
        .select("*", { count: "exact", head: true })
        .eq("locataire_id", contrat.locataire_id);

      // Si aucun autre contrat n'existe, déplacer le locataire vers la corbeille
      if (count === 0) {
        const { error: locataireError } = await supabase
          .from("locataires")
          .update({ statut: "corbeille" })
          .eq("id", contrat.locataire_id);
        if (locataireError) throw locataireError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      queryClient.invalidateQueries({ queryKey: ["locataires"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-locataires"] });
      toast.success("Contrat et paiements associés supprimés avec succès");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer ce contrat pour <strong>{contrat?.locataires?.nom}</strong> ?
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
