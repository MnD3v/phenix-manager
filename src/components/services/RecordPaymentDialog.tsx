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
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";

interface RecordPaymentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    documentId: string;
    clientNom: string;
    totalAmount: number;
    currentPaid: number;
    serviceId: string;
    serviceNom: string;
}

export const RecordPaymentDialog = ({
    isOpen,
    onClose,
    onSuccess,
    documentId,
    clientNom,
    totalAmount,
    currentPaid,
    serviceId,
    serviceNom,
}: RecordPaymentDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState<number>(0);

    const remaining = totalAmount - currentPaid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            toast.error("Le montant doit être supérieur à 0");
            return;
        }
        if (amount > remaining) {
            toast.error("Le montant saisi dépasse le reste à payer");
            return;
        }

        setLoading(true);
        try {
            // 1. Update the document's paid amount
            const newPaid = Number(currentPaid) + Number(amount);
            const { error: docError } = await supabase
                .from("documents_services")
                .update({ montant_paye: newPaid })
                .eq("id", documentId);

            if (docError) throw docError;

            // 2. Create the financial record
            const { error: incomeError } = await supabase.from("paiements").insert({
                montant: amount,
                type: "loyer",
                date_paiement: new Date().toISOString().split("T")[0],
                notes: `Versement Facture: ${documentId.slice(0, 8)} - Client: ${clientNom} - Service: ${serviceNom}`,
                service_id: serviceId,
            });

            if (incomeError) {
                console.warn("Financial record failed but document was updated:", incomeError);
                toast.warning("Paiement enregistré sur la facture mais erreur dans le journal financier");
            }

            toast.success("Encaissement enregistré avec succès");
            onSuccess();
        } catch (error: any) {
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        Encaisser un paiement
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="p-4 bg-muted/30 rounded-xl space-y-2 border border-muted/50">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Client:</span>
                                <span className="font-semibold">{clientNom}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Facture:</span>
                                <span className="font-semibold">{totalAmount.toLocaleString()} FCFA</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Déjà versé:</span>
                                <span className="font-semibold text-green-600 font-bold">{currentPaid.toLocaleString()} FCFA</span>
                            </div>
                            <div className="pt-2 border-t flex justify-between font-bold">
                                <span className="text-primary uppercase text-xs">Reste à payer:</span>
                                <span className="text-red-600">{remaining.toLocaleString()} FCFA</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount" className="text-sm font-semibold">Montant à encaisser (FCFA)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="text-lg font-bold text-primary rounded-xl"
                                autoFocus
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="rounded-xl"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || amount <= 0}
                            className="rounded-xl gap-2 shadow-lg shadow-primary/20"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                            Confirmer l'encaissement
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
