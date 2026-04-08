import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tag } from "lucide-react";

interface SellBienDialogProps {
    bien: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SellBienDialog = ({ bien, open, onOpenChange }: SellBienDialogProps) => {
    const [nomAcheteur, setNomAcheteur] = useState("");
    const [telephoneAcheteur, setTelephoneAcheteur] = useState("");
    const [emailAcheteur, setEmailAcheteur] = useState("");
    const [prixVente, setPrixVente] = useState(bien?.loyer_mensuel?.toString() || "");

    const queryClient = useQueryClient();

    const sellMutation = useMutation({
        mutationFn: async () => {
            // 1. Insert into ventes
            const { error: insertError } = await supabase.from("ventes").insert({
                bien_id: bien.id,
                nom_acheteur: nomAcheteur,
                telephone_acheteur: telephoneAcheteur,
                email_acheteur: emailAcheteur || null,
                prix_vente: parseFloat(prixVente),
            });

            if (insertError) throw insertError;

            // 2. Update bien statut to vendu
            const { error: updateError } = await supabase
                .from("biens")
                .update({ statut: "vendu" })
                .eq("id", bien.id);

            if (updateError) throw updateError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["biens"] });
            toast.success("Bien vendu avec succès");
            onOpenChange(false);
            resetForm();
        },
        onError: (error: any) => {
            toast.error(`Erreur: ${error.message}`);
        },
    });

    const resetForm = () => {
        setNomAcheteur("");
        setTelephoneAcheteur("");
        setEmailAcheteur("");
        setPrixVente(bien?.loyer_mensuel?.toString() || "");
    };

    const handleOpenChange = (val: boolean) => {
        if (!val) resetForm();
        onOpenChange(val);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sellMutation.mutate();
    };

    if (!bien) return null;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Tag className="h-5 w-5 text-orange-500" />
                        Vente de {bien.nom}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="nomAcheteur">Nom de l'acheteur *</Label>
                        <Input
                            id="nomAcheteur"
                            value={nomAcheteur}
                            onChange={(e) => setNomAcheteur(e.target.value)}
                            placeholder="Ex: Jean Dupont"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="telephoneAcheteur">Téléphone *</Label>
                        <Input
                            id="telephoneAcheteur"
                            value={telephoneAcheteur}
                            onChange={(e) => setTelephoneAcheteur(e.target.value)}
                            placeholder="Ex: 0102030405"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="emailAcheteur">Email (Optionnel)</Label>
                        <Input
                            id="emailAcheteur"
                            type="email"
                            value={emailAcheteur}
                            onChange={(e) => setEmailAcheteur(e.target.value)}
                            placeholder="Ex: jean.dupont@email.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="prixVente">Prix de vente final (FCFA) *</Label>
                        <Input
                            id="prixVente"
                            type="number"
                            step="0.01"
                            value={prixVente}
                            onChange={(e) => setPrixVente(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={sellMutation.isPending} className="bg-orange-600 hover:bg-orange-700">
                            {sellMutation.isPending ? "Validation..." : "Valider la vente"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
