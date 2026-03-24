import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Building, FileText, Tag, Wallet } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DepenseDetailsDialogProps {
    depense: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const DepenseDetailsDialog = ({
    depense,
    open,
    onOpenChange,
}: DepenseDetailsDialogProps) => {
    if (!depense) return null;

    // Determine owner: direct proprietaire or via bien
    const proprietaire = depense.proprietaires || depense.biens?.proprietaires;
    const bienNom = depense.biens?.nom || "Aucun bien spécifique (Dépense générale)";
    const adresseBien = depense.biens?.adresse;

    const getCategorieLabel = (categorie: string) => {
        const labels: Record<string, string> = {
            reparation: "Réparation",
            electricite: "Électricité",
            eau: "Eau",
            vidange: "Vidange",
            autre: "Autre",
        };
        return labels[categorie] || categorie;
    };

    const getCategorieColor = (categorie: string) => {
        switch (categorie) {
            case "reparation": return "bg-orange-100 text-orange-800 border-orange-200";
            case "electricite": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "eau": return "bg-blue-100 text-blue-800 border-blue-200";
            case "vidange": return "bg-purple-100 text-purple-800 border-purple-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">Détails de la dépense</DialogTitle>
                    <DialogDescription>
                        Informations complètes sur la dépense sélectionnée
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Header Amount */}
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-muted-foreground text-sm font-medium mb-1">Montant total</span>
                        <span className="text-3xl font-bold text-slate-900">
                            {parseFloat(depense.montant.toString()).toLocaleString()} FCFA
                        </span>
                        <div className="mt-3">
                            <Badge variant="outline" className={`border ${getCategorieColor(depense.categorie)}`}>
                                {getCategorieLabel(depense.categorie)}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {/* Date */}
                        <div className="flex items-start gap-3 p-3 rounded-md hover:bg-slate-50 transition-colors">
                            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Date de la dépense</p>
                                <p className="text-sm text-muted-foreground">
                                    {depense.date_depense ? format(new Date(depense.date_depense), "dd MMMM yyyy", { locale: fr }) : "N/A"}
                                </p>
                            </div>
                        </div>

                        {/* Proprietaire */}
                        <div className="flex items-start gap-3 p-3 rounded-md hover:bg-slate-50 transition-colors">
                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Propriétaire concerné</p>
                                <div className="text-sm text-muted-foreground">
                                    {proprietaire ? (
                                        <>
                                            <span className="font-semibold text-slate-700">{proprietaire.nom}</span>
                                            {(proprietaire.telephone || proprietaire.email) && (
                                                <div className="text-xs mt-1">
                                                    {proprietaire.telephone} {proprietaire.email ? `• ${proprietaire.email}` : ''}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span className="italic text-slate-400">Non spécifié</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bien */}
                        <div className="flex items-start gap-3 p-3 rounded-md hover:bg-slate-50 transition-colors">
                            <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Bien immobilier</p>
                                <div className="text-sm text-muted-foreground">
                                    <span className="block">{bienNom}</span>
                                    {adresseBien && <span className="text-xs block mt-0.5 opacity-80">{adresseBien}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="flex items-start gap-3 p-3 rounded-md hover:bg-slate-50 transition-colors">
                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Description</p>
                                <p className="text-sm text-muted-foreground mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                                    {depense.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
