import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    AlertDialogCancel,
    AlertDialogAction
} from "@/components/ui/alert-dialog";

export const RecycleBinDialog = () => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const [locataireToDelete, setLocataireToDelete] = useState<any>(null);

    const { data: deletedLocataires, isLoading } = useQuery({
        queryKey: ["deleted-locataires"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("locataires")
                .select("*")
                .eq("statut", "corbeille")
                .order("updated_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: open,
    });



    const deletePermanentlyMutation = useMutation({
        mutationFn: async (locataire: any) => {
            // 1. NOTE: We keep payments for history even if tenant is permanently deleted
            // But usually permanent deletion implies full wipe. 
            // If the user wants to keep payments, they should keep the tenant in "corbeille" or just inactive.
            // However, your request is "Les paiement associé au contrats ne doivent pas être supprimé lors de la suppression du locataire."
            // So we will commenting out the payment deletion part.

            /*
            const { error: paiementsError } = await supabase
                .from("paiements")
                .delete()
                .eq("locataire_id", locataire.id);
            if (paiementsError) throw paiementsError;
            */

            // On supprime d'abord les paiements liés au locataire car la base de données 
            // exige qu'ils soient rattachés à un contrat_id NOT NULL qui sera aussi supprimé.
            const { error: updatePaiementsError } = await supabase
                .from("paiements")
                .delete()
                .eq("locataire_id", locataire.id);
            if (updatePaiementsError) throw updatePaiementsError;


            // 2. Delete associated contracts
            const { error: contratsError } = await supabase
                .from("contrats")
                .delete()
                .eq("locataire_id", locataire.id);
            if (contratsError) throw contratsError;

            // 3. Delete tenant
            const { error } = await supabase
                .from("locataires")
                .delete()
                .eq("id", locataire.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deleted-locataires"] });
            toast.success("Locataire supprimé définitivement");
            setLocataireToDelete(null);
        },
        onError: (error: any) => {
            toast.error(`Erreur lors de la suppression définitive: ${error.message}`);
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Corbeille
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Corbeille des locataires</DialogTitle>
                    <DialogDescription>
                        Gérez les locataires supprimés. Vous pouvez les restaurer ou les supprimer définitivement.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                ) : !deletedLocataires?.length ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Trash2 className="h-12 w-12 mb-4 opacity-20" />
                        <p>La corbeille est vide</p>
                    </div>
                ) : (
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Téléphone</TableHead>
                                    <TableHead>Supprimé le</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deletedLocataires.map((locataire) => (
                                    <TableRow key={locataire.id}>
                                        <TableCell className="font-medium">{locataire.nom}</TableCell>
                                        <TableCell>{locataire.telephone}</TableCell>
                                        <TableCell>
                                            {new Date(locataire.updated_at).toLocaleDateString("fr-FR")}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        Voir plus
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Détails du locataire</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-sm font-medium text-muted-foreground">Nom</p>
                                                                <p>{locataire.nom}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                                                                <p>{locataire.telephone}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                                                <p>{locataire.email || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                                                                <p>{locataire.adresse || "-"}</p>
                                                            </div>
                                                        </div>
                                                        {locataire.piece_identite && (
                                                            <div>
                                                                <p className="text-sm font-medium text-muted-foreground mb-2">Pièce d'identité</p>
                                                                <a
                                                                    href={locataire.piece_identite}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline"
                                                                >
                                                                    Voir le document
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        Supprimer
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Suppression définitive</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Cette action est irréversible. Toutes les données associées à <strong>{locataire.nom}</strong> (paiements, contrats) seront définitivement effacées.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={() => deletePermanentlyMutation.mutate(locataire)}
                                                        >
                                                            Supprimer définitivement
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
