import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

interface DeleteBienDialogProps {
  bien: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteBienDialog = ({ bien, open, onOpenChange }: DeleteBienDialogProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Récupérer les locataires associés aux contrats actifs avant suppression
      const { data: contratsActifs } = await supabase
        .from("contrats")
        .select("id, locataire_id")
        .eq("bien_id", bien.id)
        .eq("statut", "actif");

      const locataireIds = contratsActifs?.map(c => c.locataire_id) || [];

      // Supprimer d'abord les paiements associés (en cascade)
      const { error: paiementsError } = await supabase
        .from("paiements")
        .delete()
        .eq("bien_id", bien.id);

      if (paiementsError) throw paiementsError;

      // Supprimer les dépenses associées (en cascade)
      const { error: depensesError } = await supabase
        .from("depenses")
        .delete()
        .eq("bien_id", bien.id);

      if (depensesError) throw depensesError;

      // Supprimer TOUS les contrats associés (actifs et terminés)
      const { error: contratsError } = await supabase
        .from("contrats")
        .delete()
        .eq("bien_id", bien.id);

      if (contratsError) throw contratsError;

      // Si le bien était occupé, supprimer aussi les locataires associés
      if (locataireIds.length > 0) {
        const { error: locError } = await supabase
          .from("locataires")
          .delete()
          .in("id", locataireIds);

        if (locError) {
          console.error("Erreur lors de la suppression du locataire:", locError);
          // On continue même si erreur locataire, car le but principal est le bien
        }
      }

      // Supprimer le bien
      const { error } = await supabase.from("biens").delete().eq("id", bien.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      queryClient.invalidateQueries({ queryKey: ["locataires"] });
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      toast.success("Bien et données associées supprimés avec succès");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const isOccupied = bien?.statut === "occupe";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isOccupied ? "Attention : Bien Occupé" : "Êtes-vous sûr ?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isOccupied ? (
              <span className="block text-destructive font-medium mt-2">
                Ce bien est actuellement OCCUPÉ.
                <br /><br />
                En confirmant, vous supprimerez définitivement :
                <ul className="list-disc list-inside mt-1 ml-2">
                  <li>Le bien <strong>{bien?.nom}</strong></li>
                  <li>Le(s) <strong>locataire(s)</strong> associé(s)</li>
                  <li>Tous les contrats et historiques de paiements</li>
                </ul>
              </span>
            ) : (
              <span>
                Cette action est irréversible. Le bien <strong>{bien?.nom}</strong> sera définitivement supprimé.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Suppression..." : (isOccupied ? "Tout supprimer" : "Supprimer")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
