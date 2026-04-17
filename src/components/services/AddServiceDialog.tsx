import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddServiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddServiceDialog = ({
    isOpen,
    onClose,
    onSuccess,
}: AddServiceDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [nom, setNom] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nom.trim()) {
            toast.error("Le nom du service est requis");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from("services").insert({
                nom,
                description,
            });

            if (error) throw error;

            toast.success("Service ajouté avec succès");
            setNom("");
            setDescription("");
            onSuccess();
        } catch (error: any) {
            console.error("Error adding service:", error);
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Ajouter un nouveau service</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="nom" className="text-sm font-semibold">Nom du service</Label>
                        <Input
                            id="nom"
                            placeholder="Ex: BTP, Nettoyage, Main d'oeuvre..."
                            value={nom}
                            onChange={(e) => setNom(e.target.value)}
                            className="rounded-xl border-muted-foreground/20 focus:border-primary/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-semibold">Description (Optionnel)</Label>
                        <Textarea
                            id="description"
                            placeholder="Décrivez brièvement le service..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="rounded-xl border-muted-foreground/20 focus:border-primary/50 min-h-[100px] resize-none"
                        />
                    </div>
                    <DialogFooter className="pt-4 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="rounded-xl px-6"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl px-8 shadow-lg shadow-primary/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Création...
                                </>
                            ) : (
                                "Créer le service"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
