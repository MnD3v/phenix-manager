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

interface DeleteLocataireDialogProps {
  locataire: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteLocataireDialog = ({ locataire, open, onOpenChange }: DeleteLocataireDialogProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Soft delete: update status to 'corbeille'
      const { error } = await supabase
        .from("locataires")
        .update({ statut: "corbeille" })
        .eq("id", locataire.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      queryClient.invalidateQueries({ queryKey: ["locataires"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-locataires"] });
      queryClient.invalidateQueries({ queryKey: ["inactive-locataires"] });
      toast.success("Locataire déplacé vers la corbeille");
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
            Êtes-vous sûr de vouloir déplacer le locataire <strong>{locataire?.nom}</strong> vers la corbeille ?
            Ses données (paiements, contrats) seront conservées.
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
