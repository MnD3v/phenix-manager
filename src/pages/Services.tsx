import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Search, Plus, ArrowRight, TrendingUp, FileText, CheckCircle2, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { AddServiceDialog } from "@/components/services/AddServiceDialog";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from "recharts";

const Services = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const { data: services, isLoading: isServicesLoading, refetch } = useQuery({
        queryKey: ["services-dashboard"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("services")
                .select("*")
                .order("nom");
            if (error) throw error;
            return data;
        },
    });

    const { data: stats, isLoading: isStatsLoading } = useQuery({
        queryKey: ["services-stats"],
        queryFn: async () => {
            const { data: docs, error: docError } = await supabase
                .from("documents_services")
                .select("type, montant_total, montant_paye, service_id");

            if (docError) throw docError;

            const totalDocs = docs.length;
            const invoices = docs.filter(d => d.type === "facture");
            const totalExpectedIncome = invoices.reduce((sum, d) => sum + Number(d.montant_total), 0);
            const totalActualIncome = invoices.reduce((sum, d) => sum + Number(d.montant_paye || 0), 0);

            const recoveryRate = totalExpectedIncome > 0
                ? Math.round((totalActualIncome / totalExpectedIncome) * 100)
                : 0;

            // Group by service for chart
            const incomeByService: Record<string, number> = {};
            docs.forEach(d => {
                if (d.type === "facture") {
                    incomeByService[d.service_id] = (incomeByService[d.service_id] || 0) + Number(d.montant_paye || 0);
                }
            });

            return {
                totalDocs,
                totalIncome: totalExpectedIncome,
                totalPaid: totalActualIncome,
                recoveryRate,
                incomeByService
            };
        },
    });

    const chartData = services?.map(s => ({
        name: s.nom,
        value: stats?.incomeByService[s.id] || 0
    })).filter(d => d.value > 0) || [];

    const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

    const filteredServices = services?.filter((service) =>
        service.nom.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Tableau de Bord Services
                    </h1>
                    <p className="text-muted-foreground">
                        Aperçu global et gestion de vos prestations de services
                    </p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 shadow-lg hover:shadow-primary/20 transition-all duration-300">
                    <Plus className="h-4 w-4" />
                    Nouveau Service
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-muted/60 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Services Actifs</CardTitle>
                        <Briefcase className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{services?.length || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Secteurs d'activité</p>
                    </CardContent>
                </Card>

                <Card className="border-muted/60 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Documents Générés</CardTitle>
                        <FileText className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalDocs || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Devis, Factures & Proformas</p>
                    </CardContent>
                </Card>

                <Card className="border-muted/60 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Chiffre d'Affaires</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(stats?.totalPaid || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">FCFA</span></div>
                        <p className="text-xs text-muted-foreground mt-1 text-green-600 font-medium">Revenus encaissés</p>
                    </CardContent>
                </Card>

                <Card className="border-muted/60 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Revenus Attendus</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(stats?.totalIncome || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">FCFA</span></div>
                        <p className="text-xs text-muted-foreground mt-1">Taux de collecte: {stats?.recoveryRate || 0}%</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Chart Column */}
                <Card className="lg:col-span-2 border-muted/60 shadow-sm overflow-hidden">
                    <CardHeader className="border-b bg-muted/5">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Répartition des Revenus par Service
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[300px] w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `${val / 1000}k`} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground italic">
                                    Aucune donnée de revenu disponible pour le moment
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Search & Quick Access */}
                <Card className="border-muted/60 shadow-sm">
                    <CardHeader className="border-b bg-muted/5">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Search className="h-5 w-5 text-primary" />
                            Accès Rapide
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher un service..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 rounded-xl"
                            />
                        </div>

                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                            {filteredServices && filteredServices.length > 0 ? (
                                filteredServices.map(service => (
                                    <Link
                                        key={service.id}
                                        to={`/services/${service.id}`}
                                        className="flex items-center justify-between p-3 rounded-xl border border-muted/60 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                    >
                                        <span className="font-medium truncate group-hover:text-primary transition-colors">{service.nom}</span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </Link>
                                ))
                            ) : (
                                <p className="text-center text-sm text-muted-foreground py-4">Aucun service...</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Services Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-foreground">Catalogue des Services</h2>
                {isServicesLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="animate-pulse bg-muted/50 h-[180px]" />
                        ))}
                    </div>
                ) : filteredServices && filteredServices.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredServices.map((service) => (
                            <Card
                                key={service.id}
                                className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-muted/60 hover:border-primary/50"
                            >
                                <CardHeader className="pb-4 pt-6 flex flex-row items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                        <Briefcase className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg font-bold truncate text-foreground group-hover:text-primary transition-colors">
                                            {service.nom}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Revenu encaissé: <span className="font-semibold text-primary">{(stats?.incomeByService[service.id] || 0).toLocaleString()} FCFA</span>
                                        </p>
                                    </div>
                                </CardHeader>

                                <CardContent className="pb-6">
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                                        {service.description || "Aucune description de service enregistrée."}
                                    </p>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="w-full gap-2 h-11 font-semibold transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
                                    >
                                        <Link to={`/services/${service.id}`}>
                                            Consulter les Détails
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center border rounded-2xl bg-muted/5 border-dashed">
                        <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                            <Briefcase className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">Aucun service catalogue</h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                            Ajoutez vos services pour commencer à générer des documents et suivre vos finances.
                        </p>
                        <Button onClick={() => setIsAddDialogOpen(true)} variant="link" className="mt-4 text-primary">
                            Ajouter un service maintenant
                        </Button>
                    </div>
                )}
            </div>

            <AddServiceDialog
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                onSuccess={() => {
                    refetch();
                    setIsAddDialogOpen(false);
                }}
            />
        </div>
    );
};

export default Services;
