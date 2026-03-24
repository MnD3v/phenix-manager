import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteProprietaireDialogProps {
  proprietaire: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteProprietaireDialog = ({ proprietaire, open, onOpenChange }: DeleteProprietaireDialogProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Récupérer tous les biens du propriétaire
      const { data: biens } = await supabase
        .from("biens")
        .select("id, contrats(id, statut)")
        .eq("proprietaire_id", proprietaire.id);

      if (biens && biens.length > 0) {
        // Vérifier s'il y a des contrats actifs
        const hasActiveContracts = biens.some(bien => 
          bien.contrats?.some(c => c.statut === "actif")
        );

        if (hasActiveContracts) {
          throw new Error("Impossible de supprimer : ce propriétaire a des biens avec des contrats actifs. Veuillez d'abord terminer les contrats.");
        }

        // Supprimer tous les biens et leurs données associées
        for (const bien of biens) {
          // Supprimer les paiements
          await supabase.from("paiements").delete().eq("bien_id", bien.id);
          
          // Supprimer les dépenses
          await supabase.from("depenses").delete().eq("bien_id", bien.id);
          
          // Supprimer les contrats terminés
          await supabase.from("contrats").delete().eq("bien_id", bien.id);
          
          // Supprimer le bien
          await supabase.from("biens").delete().eq("id", bien.id);
        }
      }

      // Supprimer le propriétaire
      const { error } = await supabase.from("proprietaires").delete().eq("id", proprietaire.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proprietaires"] });
      toast.success("Propriétaire supprimé avec succès");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le propriétaire <strong>{proprietaire?.nom}</strong> sera définitivement
            supprimé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
