import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, User, Phone, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const EtatParc = () => {
    const navigate = useNavigate();

    const { data: biens, isLoading } = useQuery({
        queryKey: ["etat-parc"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("biens")
                .select("*, proprietaires(*)")
                .order("nom");
            if (error) throw error;

            // Sort: disponible first, then occupe
            return data?.sort((a, b) => {
                if (a.statut === "disponible" && b.statut !== "disponible") return -1;
                if (a.statut !== "disponible" && b.statut === "disponible") return 1;
                return 0;
            });
        },
    });

    const getStatutBadge = (statut: string) => {
        if (statut === "disponible") {
            return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Disponible</Badge>;
        }
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200">Occupé</Badge>;
    };

    return (
        <div className="space-y-8 animate-fade-in p-6">
            <div className="flex items-center gap-4 border-b pb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        État du Parc Immobilier
                    </h1>
                    <p className="text-muted-foreground">
                        Vue détaillée des biens et de leurs propriétaires
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                <div className="grid gap-6">
                    {biens?.map((bien) => (
                        <Card key={bien.id} className="overflow-hidden hover:shadow-md transition-all duration-200 border-muted/60">
                            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                                {/* Property Info */}
                                <div className="p-6 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                                                <Building2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">{bien.nom}</h3>
                                                <p className="text-sm text-muted-foreground capitalize">{bien.type}</p>
                                            </div>
                                        </div>
                                        {getStatutBadge(bien.statut)}
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-4 w-4" />
                                            <span>{bien.adresse}</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t mt-4">
                                            <span className="text-muted-foreground">Loyer mensuel</span>
                                            <span className="font-bold text-lg">{bien.loyer_mensuel.toLocaleString()} FCFA</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Owner Info */}
                                <div className="p-6 bg-muted/5 space-y-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <h3 className="font-semibold">Propriétaire</h3>
                                    </div>

                                    <div className="space-y-3 text-sm">
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-muted-foreground">Nom:</span>
                                            <span className="col-span-2 font-medium">{bien.proprietaires?.nom || "N/A"}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-muted-foreground">Téléphone:</span>
                                            <div className="col-span-2 flex items-center gap-2">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                <span>{bien.proprietaires?.telephone || "N/A"}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-muted-foreground">Email:</span>
                                            <div className="col-span-2 flex items-center gap-2">
                                                <Mail className="h-3 w-3 text-muted-foreground" />
                                                <span className="truncate">{bien.proprietaires?.email || "N/A"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EtatParc;
