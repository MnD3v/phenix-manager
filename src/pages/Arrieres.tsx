import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Building2, AlertCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const Arrieres = () => {
    const [searchQuery, setSearchQuery] = useState("");

    const { data: arrieresLocataires, isLoading } = useQuery({
        queryKey: ["arrieres-data"],
        queryFn: async () => {
            // 1. Fetch active contracts with related data
            const { data: contrats, error: contratsError } = await supabase
                .from("contrats")
                .select("*, locataires(*), biens(*)")
                .eq("statut", "actif");

            if (contratsError) throw contratsError;

            // 2. Fetch payments for these contracts
            const { data: paiements, error: paiementsError } = await supabase
                .from("paiements")
                .select("contrat_id, montant, type");

            if (paiementsError) throw paiementsError;

            // 3. Calculate arrears for each contract
            const results = contrats?.map(contrat => {
                const contratPaiements = paiements?.filter(p => p.contrat_id === contrat.id) || [];

                // Calculate total paid split by type
                const paiementsAvance = contratPaiements
                    .filter(p => p.type === "avance")
                    .reduce((sum, p) => sum + Number(p.montant), 0);

                const paiementsAutre = contratPaiements
                    .filter(p => ["loyer", "arrieres"].includes(p.type))
                    .reduce((sum, p) => sum + Number(p.montant), 0);

                const loyerMensuel = Number(contrat.loyer_mensuel) || 0;
                if (loyerMensuel === 0) return null;

                // Handle legacy/missing data: if payment record missing but contract has advance_mois, use contract value
                const montantAvanceContrat = (contrat.avance_mois || 0) * loyerMensuel;
                const effectiveAvance = Math.max(paiementsAvance, montantAvanceContrat);

                const totalPaye = paiementsAutre + effectiveAvance;

                const moisPayes = totalPaye / loyerMensuel;

                const dateDebut = new Date(contrat.date_debut);
                // Use today as end date for calculation if contract is ongoing, or contract end date if set and past
                const dateFin = contrat.date_fin ? new Date(contrat.date_fin) : null;
                const today = new Date();

                const isContratTermine = dateFin && dateFin < today;
                const effectiveEndDate = isContratTermine ? dateFin : today;

                // Calculate months elapsed.
                // Using the logic from Rapport.tsx: (fin.year - debut.year)*12 + (fin.month - debut.month)
                const diffMois = (effectiveEndDate.getFullYear() - dateDebut.getFullYear()) * 12 +
                    (effectiveEndDate.getMonth() - dateDebut.getMonth());

                // Si le contrat est terminé, on compte le dernier mois (inclusif).
                // Si le contrat est actif, on NE compte PAS le mois en cours (loyer payé terme échu).
                // Exemple: En Février, le loyer de Janvier est dû (Diff=1), mais Février (non échu) n'est pas arriéré.
                const moisDus = isContratTermine ? diffMois + 1 : diffMois;

                // Calculate months of arrears
                // If moisPayes > moisDus, tenant is in advance (arrieres = 0)
                // We use a small epsilon for floating point comparison
                const moisArrieres = Math.max(0, moisDus - moisPayes);

                if (moisArrieres < 0.1) return null; // No significant arrears

                return {
                    id: contrat.locataire_id,
                    nom: contrat.locataires?.nom || "Inconnu",
                    telephone: contrat.locataires?.telephone,
                    bien_nom: contrat.biens?.nom,
                    loyer_mensuel: loyerMensuel,
                    mois_arrieres: moisArrieres,
                    montant_total_arrieres: moisArrieres * loyerMensuel,
                    dernier_paiement: "N/A" // simpler for now
                };
            }).filter(Boolean) || []; // Filter out nulls

            // Sort by amount due descending
            return results.sort((a, b) => (b?.montant_total_arrieres || 0) - (a?.montant_total_arrieres || 0));
        }
    });

    const filteredArrieres = arrieresLocataires?.filter((item) => {
        if (!item) return false;
        const searchLower = searchQuery.toLowerCase();
        return (
            item.nom.toLowerCase().includes(searchLower) ||
            item.telephone?.toLowerCase().includes(searchLower) ||
            item.bien_nom?.toLowerCase().includes(searchLower)
        );
    }) || [];

    const totalArrieresAmount = filteredArrieres.reduce((sum, item) => sum + (item?.montant_total_arrieres || 0), 0) || 0;
    const totalLocatairesWithArrieres = filteredArrieres.length || 0;

    return (
        <div className="space-y-8 animate-fade-in p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-destructive flex items-center gap-2">
                        <AlertCircle className="h-8 w-8" />
                        Suivi des Arriérés
                    </h1>
                    <p className="text-muted-foreground">
                        Liste des locataires ayant des loyers impayés
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par nom, téléphone ou bien..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background"
                    />
                </div>
                <div className="text-sm text-muted-foreground hidden sm:block">
                    {totalLocatairesWithArrieres} locataire{totalLocatairesWithArrieres > 1 ? 's' : ''} concerné{totalLocatairesWithArrieres > 1 ? 's' : ''}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-destructive/5 border-destructive/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-destructive">
                            Montant Total des Arriérés
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                            {totalArrieresAmount.toLocaleString("fr-FR")} FCFA
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-orange-500/5 border-orange-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-600">
                            Locataires Concernés
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {totalLocatairesWithArrieres}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredArrieres.map((item, index) => (
                        <Card key={item!.id} className="border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-all">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-base font-semibold truncate leading-none">
                                        {item!.nom}
                                    </CardTitle>
                                    <Badge variant="destructive">
                                        {Math.ceil(item!.mois_arrieres)} mois
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        <span>{item!.telephone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Building2 className="h-4 w-4" />
                                        <span>{item!.bien_nom}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t flex justify-between items-center">
                                    <div className="text-sm text-muted-foreground">
                                        Loyer: {item!.loyer_mensuel.toLocaleString()} FCFA
                                    </div>
                                    <div className="font-bold text-lg text-destructive">
                                        {item!.montant_total_arrieres.toLocaleString()} FCFA
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredArrieres.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/5 border-dashed">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                <Building2 className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground">Aucun arriéré !</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Tous les locataires sont à jour dans leurs paiements.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Arrieres;
