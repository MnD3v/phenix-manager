import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { generateServiceDocumentPDF } from "@/lib/pdf-generator";

interface Item {
    id: string;
    description: string;
    quantite: number;
    prix_unitaire: number;
}

interface AddDocumentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    serviceId: string;
    serviceNom: string;
    defaultType?: "proforma" | "facture" | "devis";
}

export const AddDocumentDialog = ({
    isOpen,
    onClose,
    onSuccess,
    serviceId,
    serviceNom,
    defaultType = "facture",
}: AddDocumentDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [clientNom, setClientNom] = useState("");
    const [type, setType] = useState<"proforma" | "facture" | "devis">(defaultType);
    const [items, setItems] = useState<Item[]>([
        { id: crypto.randomUUID(), description: "", quantite: 1, prix_unitaire: 0 },
    ]);
    const [recordIncome, setRecordIncome] = useState(true);
    const [montantPaye, setMontantPaye] = useState<number>(0);

    useEffect(() => {
        if (isOpen) {
            setType(defaultType);
            setClientNom("");
            setItems([{ id: crypto.randomUUID(), description: "", quantite: 1, prix_unitaire: 0 }]);
            setMontantPaye(0);
        }
    }, [isOpen, defaultType]);

    const handleAddItem = () => {
        setItems([...items, { id: crypto.randomUUID(), description: "", quantite: 1, prix_unitaire: 0 }]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length === 1) return;
        setItems(items.filter(item => item.id !== id));
    };

    const handleUpdateItem = (id: string, field: keyof Item, value: string | number) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const total = items.reduce((sum, item) => sum + (item.quantite * item.prix_unitaire), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientNom.trim()) {
            toast.error("Le nom du client est requis");
            return;
        }
        if (items.some(item => !item.description.trim())) {
            toast.error("Toutes les lignes doivent avoir une description");
            return;
        }

        setLoading(true);
        try {
            // 1. Create the document
            const { data: doc, error: docError } = await supabase
                .from("documents_services")
                .insert({
                    service_id: serviceId,
                    client_nom: clientNom,
                    type,
                    montant_total: total,
                    montant_paye: type === "facture" ? montantPaye : 0,
                    donnees_json: items as any,
                })
                .select()
                .single();

            if (docError) throw docError;

            // 2. Generate PDF
            await generateServiceDocumentPDF({
                serviceNom,
                clientNom,
                type,
                items,
                montant_total: total,
                montant_paye: type === "facture" ? montantPaye : undefined,
                date_document: new Date().toISOString(),
            });

            // 3. Record as income if it's a Facture and recordIncome is checked
            if (type === "facture" && recordIncome && montantPaye > 0) {
                const { error: incomeError } = await supabase.from("paiements").insert({
                    montant: montantPaye,
                    type: "loyer",
                    date_paiement: new Date().toISOString().split("T")[0],
                    notes: `Paiement Facture Service: ${serviceNom} - Client: ${clientNom}${montantPaye < total ? " (Acompte)" : ""}`,
                    service_id: serviceId,
                });

                if (incomeError) {
                    console.warn("Income recording failed but document was created:", incomeError);
                    toast.warning("Document créé mais erreur lors de l'enregistrement financier");
                }
            }

            toast.success("Document créé avec succès");
            onSuccess();
        } catch (error: any) {
            console.error("Error creating document:", error);
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] rounded-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        Créer un document - {serviceNom}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="client" className="text-sm font-semibold">Nom du Client</Label>
                            <Input
                                id="client"
                                placeholder="Ex: Entreprise Toto"
                                value={clientNom}
                                onChange={(e) => setClientNom(e.target.value)}
                                className="rounded-xl border-muted-foreground/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-sm font-semibold">Type de Document</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger className="rounded-xl border-muted-foreground/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="devis">Devis</SelectItem>
                                    <SelectItem value="proforma">Proforma</SelectItem>
                                    <SelectItem value="facture">Facture Normale</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Détails de la prestation</Label>
                            <Button type="button" onClick={handleAddItem} variant="outline" size="sm" className="gap-2 rounded-lg">
                                <Plus className="h-4 w-4" />
                                Ajouter une ligne
                            </Button>
                        </div>

                        <div className="border rounded-xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="w-[10%]">Qté</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="w-[20%] text-right">P.U (FCFA)</TableHead>
                                        <TableHead className="w-[5%]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="p-2">
                                                <Input
                                                    type="number"
                                                    value={item.quantite}
                                                    onChange={(e) => handleUpdateItem(item.id, "quantite", Number(e.target.value))}
                                                    className="h-9 px-2 text-center rounded-lg"
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input
                                                    placeholder="Description de l'article..."
                                                    value={item.description}
                                                    onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                                                    className="h-9 rounded-lg"
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input
                                                    type="number"
                                                    value={item.prix_unitaire}
                                                    onChange={(e) => handleUpdateItem(item.id, "prix_unitaire", Number(e.target.value))}
                                                    className="h-9 text-right rounded-lg"
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 pt-2">
                        <div className="flex items-center gap-8 w-full justify-end">
                            {type === "facture" && (
                                <div className="flex flex-col gap-1 items-end">
                                    <Label htmlFor="paye" className="text-xs font-semibold text-muted-foreground uppercase">Montant Versé (FCFA)</Label>
                                    <Input
                                        id="paye"
                                        type="number"
                                        value={montantPaye}
                                        onChange={(e) => setMontantPaye(Number(e.target.value))}
                                        className="w-40 text-right font-bold text-green-600 bg-green-50/50 border-green-200 rounded-xl"
                                    />
                                </div>
                            )}

                            <div className="flex flex-col gap-1 items-end p-3 bg-primary/5 rounded-xl border border-primary/20">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Total Net</span>
                                <span className="text-xl font-bold text-primary">{total.toLocaleString("fr-FR")} FCFA</span>
                            </div>
                        </div>

                        {type === "facture" && (
                            <div className="flex items-center gap-2 pr-2">
                                <Checkbox
                                    id="record"
                                    checked={recordIncome}
                                    onCheckedChange={(v: any) => setRecordIncome(v)}
                                />
                                <Label htmlFor="record" className="text-sm cursor-pointer font-medium">
                                    Enregistrer le paiement dans Entrées d'argent
                                </Label>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-6 gap-2 border-t">
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
                            className="rounded-xl px-8 shadow-lg shadow-primary/20 gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Génération...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Générer et Enregistrer
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
