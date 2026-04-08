import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { User, Phone, Mail, Calendar, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ViewAcheteurDialogProps {
    bien: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ViewAcheteurDialog = ({ bien, open, onOpenChange }: ViewAcheteurDialogProps) => {
    const [acheteurDetails, setAcheteurDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && bien?.id) {
            const fetchAcheteur = async () => {
                setLoading(true);
                const { data, error } = await supabase
                    .from("ventes")
                    .select("*")
                    .eq("bien_id", bien.id)
                    .single();

                if (!error && data) {
                    setAcheteurDetails(data);
                }
                setLoading(false);
            };
            fetchAcheteur();
        }
    }, [open, bien?.id]);

    if (!bien) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <User className="h-5 w-5 text-orange-500" />
                        Informations de l'acheteur
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : acheteurDetails ? (
                    <div className="space-y-4 pt-4">
                        <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                            <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                                {acheteurDetails.nom_acheteur}
                            </h3>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    <span>{acheteurDetails.telephone_acheteur}</span>
                                </div>

                                {acheteurDetails.email_acheteur && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        <span>{acheteurDetails.email_acheteur}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 font-medium text-foreground border-t pt-2 mt-2">
                                    <DollarSign className="h-4 w-4 text-emerald-500" />
                                    <span>Prix d'achat: {acheteurDetails.prix_vente.toLocaleString()} FCFA</span>
                                </div>

                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                        Acheté le {format(new Date(acheteurDetails.date_vente), "dd MMMM yyyy", { locale: fr })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button onClick={() => onOpenChange(false)}>Fermer</Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        Aucune information trouvée.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
