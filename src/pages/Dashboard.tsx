import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OccupancyChart } from "@/components/dashboard/OccupancyChart";
import { PaymentStatusChart } from "@/components/dashboard/PaymentStatusChart";
import { Building, UsersRound, UserCheck, TrendingUp, AlertCircle, CheckCircle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSmsBalance } from "@/services/smsService";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Realtime subscription - Synchronisation complète
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "biens" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contrats" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "depenses" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "proprietaires" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: smsBalance } = useQuery({
    queryKey: ["sms-balance"],
    queryFn: getSmsBalance,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const totalSms = smsBalance?.reduce((acc, curr) => acc + curr.solde, 0) || 0;

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Get total properties
      const { data: allBiens, error: biensError } = await supabase.from("biens").select("statut");
      if (biensError) throw biensError;

      const totalBiens = allBiens?.length || 0;
      const biensOccupes = allBiens?.filter((b) => b.statut === "occupe").length || 0;
      const biensDisponibles = allBiens?.filter((b) => b.statut === "disponible").length || 0;

      // Get total proprietaires
      const { count: totalProprietaires, error: propError } = await supabase
        .from("proprietaires")
        .select("*", { count: "exact", head: true });
      if (propError) throw propError;

      // Get active contracts
      const { data: contratsActifs, error: contratsError } = await supabase
        .from("contrats")
        .select("*")
        .eq("statut", "actif");
      if (contratsError) throw contratsError;

      const totalLocataires = contratsActifs?.length || 0;

      // Get monthly revenue (paiements du mois en cours)
      // Get monthly revenue and calculate actual commissions
      // Get monthly revenue (paiements du mois en cours)
      const now = new Date();
      let startYear = now.getFullYear();
      let startMonth = now.getMonth();
      let endYear = now.getFullYear();
      let endMonth = now.getMonth() + 1;

      if (now.getDate() <= 15) {
        startMonth = now.getMonth() - 1;
        endMonth = now.getMonth();
      }

      const startDate = new Date(Date.UTC(startYear, startMonth, 16));
      const endDate = new Date(Date.UTC(endYear, endMonth, 15));

      const startOfMonth = startDate.toISOString().split('T')[0];
      const endOfMonth = endDate.toISOString().split('T')[0];

      const { data: paiementsMois, error: paiementsError } = await supabase
        .from("paiements")
        .select(`
          montant,
          biens (
            commission_pourcentage
          )
        `)
        .gte("date_paiement", startOfMonth)
        .lte("date_paiement", endOfMonth);
      if (paiementsError) throw paiementsError;

      const revenusMensuels = paiementsMois?.reduce((sum, p) => sum + parseFloat(p.montant.toString()), 0) || 0;

      const commissionTotale = paiementsMois?.reduce((sum, p) => {
        const commissionPct = p.biens?.commission_pourcentage || 0;
        return sum + (p.montant * (commissionPct / 100));
      }, 0) || 0;

      // Get late payments
      const { data: paiementsRetard, error: retardError } = await supabase
        .from("paiements")
        .select("id")
        .eq("statut", "retard");
      if (retardError) throw retardError;

      const paiementsEnRetard = paiementsRetard?.length || 0;

      // Get today's payments
      const today = new Date().toISOString().split("T")[0];
      const { data: paiementsAujourdhui, error: todayError } = await supabase
        .from("paiements")
        .select("id")
        .eq("date_paiement", today);
      if (todayError) throw todayError;

      const paiementsDuJour = paiementsAujourdhui?.length || 0;

      return {
        totalBiens,
        biensOccupes,
        biensDisponibles,
        totalProprietaires,
        totalLocataires,
        revenusMensuels,
        paiementsEnRetard,
        paiementsDuJour,
        commissionMensuelle: commissionTotale,
      };
    },
  });

  const statsCards = [
    {
      title: "Biens totaux",
      value: stats?.totalBiens || 0,
      icon: Building,
      description: `${stats?.biensOccupes || 0} occupés, ${stats?.biensDisponibles || 0} disponibles`,
      color: "blue" as const,
      badge: stats?.biensDisponibles ? { label: "Disponibles", variant: "success" as const } : undefined,
    },
    {
      title: "Propriétaires",
      value: stats?.totalProprietaires || 0,
      icon: UsersRound,
      description: "Actifs dans le système",
      color: "violet" as const,
      badge: { label: "Actifs", variant: "info" as const },
    },
    {
      title: "Locataires actifs",
      value: stats?.totalLocataires || 0,
      icon: UserCheck,
      description: "Contrats en cours",
      color: "emerald" as const,
      badge: { label: "Vérifié", variant: "success" as const },
    },
    {
      title: "Paiements en retard",
      value: `${stats?.paiementsEnRetard || 0} Alertes`,
      icon: MessageSquare,
      description: "À vérifier ce jour",
      color: "rose" as const,
      badge: stats?.paiementsEnRetard ? { label: "Non confirmé", variant: "warning" as const } : { label: "À jour", variant: "success" as const },
    },
    {
      title: "Occupation globale",
      value: `${stats?.biensDisponibles || 0} Disponibles`,
      icon: CheckCircle,
      description: `${stats?.biensOccupes || 0} Occupés`,
      onClick: () => navigate("/etat-parc"),
      color: "cyan" as const,
    },
    {
      title: "Revenus du mois",
      value: `${stats?.revenusMensuels?.toLocaleString() || 0} FCFA`,
      icon: TrendingUp,
      description: `Dont ${stats?.commissionMensuelle?.toLocaleString() || 0} FCFA de commissions`,
      color: "amber" as const,
      badge: { label: "Ce mois", variant: "info" as const },
    },
  ];

  const recentAlerts = [
    ...(stats?.paiementsEnRetard && stats.paiementsEnRetard > 0
      ? [
        {
          id: 1,
          type: "warning" as const,
          message: `${stats.paiementsEnRetard} paiement${stats.paiementsEnRetard > 1 ? "s" : ""} en retard`,
          date: "Aujourd'hui",
        },
      ]
      : []),
    ...(stats?.paiementsDuJour && stats.paiementsDuJour > 0
      ? [
        {
          id: 2,
          type: "success" as const,
          message: `${stats.paiementsDuJour} paiement${stats.paiementsDuJour > 1 ? "s" : ""} reçu${stats.paiementsDuJour > 1 ? "s" : ""} aujourd'hui`,
          date: "Aujourd'hui",
        },
      ]
      : []),
  ];

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const currentHour = new Date().getHours();

  // Nom d'utilisateur dynamique via le contexte
  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || "Administrateur";

  return (
    <div className="space-y-8 animate-fade-in p-6 max-w-7xl mx-auto">
      {/* Header Soft */}
      <div className="flex flex-col gap-6 pb-2">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground/80 flex items-center gap-2 text-sm">
            Voici un aperçu de votre activité immobilière d'aujourd'hui.
          </p>
        </div>


        {/* Quick Actions (Pill buttons) */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => navigate("/biens")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/60 bg-white hover:bg-muted/30 transition-colors text-sm font-medium"
          >
            <Building className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            Ajouter un bien
          </button>
          <button
            onClick={() => navigate("/locataires")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/60 bg-white hover:bg-muted/30 transition-colors text-sm font-medium"
          >
            <UserCheck className="w-4 h-4 text-muted-foreground" />
            Nouveau locataire
          </button>
          <button
            onClick={() => navigate("/paiements")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/60 bg-white hover:bg-muted/30 transition-colors text-sm font-medium"
          >
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Encaisser
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((stat, index) => (
          <div key={stat.title} className="animate-in" style={{ animationDelay: `${index * 100}ms` }}>
            <StatsCard {...stat} />
          </div>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <RevenueChart />
        </div>
        <div className="lg:col-span-3">
          <OccupancyChart />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 pt-4">
        <div className="lg:col-span-1 bg-white rounded-3xl p-6">
          <PaymentStatusChart />
        </div>

        {/* Recent Alerts - Soft Style */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Activité Récente
            </h2>
            <button className="text-sm font-medium px-4 py-1.5 rounded-full border border-border/60 hover:bg-muted/30 transition-colors">
              Voir tout
            </button>
          </div>
          <div className="flex-1 bg-[#f4f6f8]/80 backdrop-blur-sm rounded-3xl p-6 flex flex-col gap-3">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-4 p-4 rounded-2xl bg-white shadow-sm border border-black/[0.02] hover:bg-muted/20 transition-colors">
                  {alert.type === "warning" && <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />}
                  {alert.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground/90">{alert.message}</p>
                    <p className="text-xs font-medium text-muted-foreground">{alert.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-6 text-center text-muted-foreground/60">
                <CheckCircle className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">Aucune alerte pour le moment</p>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Summary - Soft Style */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Occupation du Portefeuille
            </h2>
          </div>
          <div className="flex-1 bg-[#f4f6f8]/80 backdrop-blur-sm rounded-3xl p-6 flex flex-col justify-center gap-4">
            <div className="flex items-center justify-between p-5 rounded-2xl bg-white shadow-sm border border-black/[0.02] hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground/90">Unités louées</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">Génèrent des revenus</p>
                </div>
              </div>
              <span className="text-3xl font-extrabold tracking-tight">
                {stats?.biensOccupes || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-5 rounded-2xl bg-white shadow-sm border border-black/[0.02] hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Building className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground/90">Unités vacantes</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">En attente de location</p>
                </div>
              </div>
              <span className="text-3xl font-extrabold tracking-tight">
                {stats?.biensDisponibles || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
