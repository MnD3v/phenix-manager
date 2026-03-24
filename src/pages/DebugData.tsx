import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

const DebugData = () => {
    const queryClient = useQueryClient();

    const { data: analysis, isLoading } = useQuery({
        queryKey: ["debug-data"],
        queryFn: async () => {
            // Fetch all active contracts
            const { data: contrats, error: errContrats } = await supabase
                .from("contrats")
                .select("id, bien_id, locataire_id, statut, locataires(id, nom)")
                .eq("statut", "actif");

            if (errContrats) throw errContrats;

            // Fetch all properties
            const { data: biens, error: errBiens } = await supabase
                .from("biens")
                .select("id, nom, statut");

            if (errBiens) throw errBiens;

            // Fetch all active tenants (not in trash)
            const { data: locataires, error: errLocataires } = await supabase
                .from("locataires")
                .select("id, nom, statut");

            if (errLocataires) throw errLocataires;

            const nonTrashLocataires = locataires?.filter(l => l.statut !== "corbeille") || [];

            const issues = [];

            // Check 1: Properties with multiple active contracts
            const contractsByBien = {};
            const activeTenantIds = new Set<string>();

            contrats?.forEach(c => {
                if (!contractsByBien[c.bien_id]) contractsByBien[c.bien_id] = [];
                contractsByBien[c.bien_id].push(c);
                if (c.locataire_id) activeTenantIds.add(c.locataire_id);
            });

            Object.entries(contractsByBien).forEach(([bienId, contractList]: [string, any[]]) => {
                if (contractList.length > 1) {
                    const bien = biens?.find(b => b.id === bienId);
                    issues.push({
                        type: "MULTIPLE_CONTRACTS",
                        bien: bien?.nom || bienId,
                        details: `${contractList.length} contrats actifs pour ce bien. Locataires: ${contractList.map(c => c.locataires?.nom).join(", ")}`
                    });
                }
            });

            // Check 2: Active contracts on non-occupied properties
            contrats?.forEach(c => {
                const bien = biens?.find(b => b.id === c.bien_id);
                if (bien && bien.statut !== "occupe") {
                    issues.push({
                        type: "STATUS_MISMATCH",
                        bien: bien.nom,
                        details: `Contrat actif (Locataire: ${c.locataires?.nom}) mais statut bien = ${bien.statut}`
                    });
                } else if (!bien) {
                    issues.push({
                        type: "ORPHAN_CONTRACT",
                        bien: "Inconnu",
                        details: `Contrat actif (ID: ${c.id}) lié à un bien inexistant (ID: ${c.bien_id})`
                    });
                }
            });

            // Check 3: Tenants with no active contracts (Zombie Tenants)
            // We use nonTrashLocataires to exclude those already in recycle bin
            const zombieTenants = nonTrashLocataires.filter(l => !activeTenantIds.has(l.id)) || [];

            zombieTenants.forEach(l => {
                issues.push({
                    type: "ZOMBIE_TENANT",
                    bien: "N/A",
                    details: `Locataire ${l.nom} (ID: ${l.id}) n'a aucun contrat actif mais n'est pas dans la corbeille.`,
                    data: l
                });
            });

            return {
                activeContractsCount: contrats?.length || 0,
                occupiedPropertiesCount: biens?.filter(b => b.statut === "occupe").length || 0,
                zombieTenantsCount: zombieTenants.length,
                zombieTenants,
                issues
            };
        },
    });

    const fixZombiesMutation = useMutation({
        mutationFn: async () => {
            if (!analysis?.zombieTenants?.length) return;

            const updates = analysis.zombieTenants.map(t =>
                supabase
                    .from("locataires")
                    .update({ statut: "corbeille" })
                    .eq("id", t.id)
            );

            await Promise.all(updates);
        },
        onSuccess: () => {
            toast.success("Nettoyage des locataires effectué !");
            queryClient.invalidateQueries({ queryKey: ["debug-data"] });
        }
    });

    const fixSingleZombieMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("locataires")
                .update({ statut: "corbeille" })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Locataire déplacé vers la corbeille");
            queryClient.invalidateQueries({ queryKey: ["debug-data"] });
        },
        onError: (error: any) => {
            toast.error(`Erreur: ${error.message}`);
        }
    });

    if (isLoading) return <div>Analyse en cours...</div>;

    return (
        <div className="p-8 space-y-6" id="debug-container">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Analyse des Données</h1>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["debug-data"] })} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader><CardTitle>Contrats Actifs</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold">{analysis?.activeContractsCount}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Biens Occupés</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold">{analysis?.occupiedPropertiesCount}</CardContent>
                </Card>
                <Card className={analysis?.zombieTenantsCount > 0 ? "border-amber-500 bg-amber-50" : ""}>
                    <CardHeader><CardTitle>Locataires "Zombies"</CardTitle></CardHeader>
                    <CardContent className="flex justify-between items-center">
                        <span className="text-2xl font-bold">{analysis?.zombieTenantsCount}</span>
                        {analysis?.zombieTenantsCount > 0 && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => fixZombiesMutation.mutate()}
                                disabled={fixZombiesMutation.isPending}
                            >
                                {fixZombiesMutation.isPending ? "Nettoyage..." : "Nettoyer"}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Anomalies Détectées ({analysis?.issues.length})</h2>
                {analysis?.issues.map((issue, i) => (
                    <Card key={i} className={`border-l-4 ${issue.type === 'ZOMBIE_TENANT' ? 'border-amber-500 bg-amber-50/50' : 'border-destructive/50 bg-destructive/5'}`}>
                        <CardHeader>
                            <CardTitle className={`text-base ${issue.type === 'ZOMBIE_TENANT' ? 'text-amber-700' : 'text-destructive'}`}>
                                {issue.type} {issue.type !== 'ZOMBIE_TENANT' && `- ${issue.bien}`}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-center gap-4">
                            <p>{issue.details}</p>
                            {issue.type === 'ZOMBIE_TENANT' && issue.data && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 border-amber-200"
                                    onClick={() => fixSingleZombieMutation.mutate(issue.data.id)}
                                    disabled={fixSingleZombieMutation.isPending}
                                >
                                    Corbeille
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
                {analysis?.issues.length === 0 && (
                    <p className="text-green-600">Aucune anomalie détectée avec les critères actuels.</p>
                )}
            </div>
        </div>
    );
};

export default DebugData;
