import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const RevenueChart = () => {
  const { data: revenueData } = useQuery({
    queryKey: ["revenue-chart"],
    queryFn: async () => {
      const currentDate = new Date();
      const months = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();

        // Calculate dynamic start and end dates
        const startDate = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
        const endDate = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];

        const { data: paiements } = await supabase
          .from("paiements")
          .select("montant")
          .gte("date_paiement", startDate)
          .lte("date_paiement", endDate);

        const total = paiements?.reduce((sum, p) => sum + parseFloat(p.montant.toString()), 0) || 0;

        months.push({
          mois: date.toLocaleDateString("fr-FR", { month: "short" }),
          revenus: Math.round(total / 1000),
        });
      }

      return months;
    },
  });

  const totalRevenue = revenueData?.reduce((sum, item) => sum + item.revenus, 0) || 0;
  const avgRevenue = Math.round(totalRevenue / (revenueData?.length || 1));

  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Évolution des revenus
        </CardTitle>
        <CardDescription>
          Moyenne: {avgRevenue.toFixed(0)}K CFA/mois
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="mois"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Milliers CFA', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number) => [`${value}K CFA`, 'Revenus']}
            />
            <Area
              type="monotone"
              dataKey="revenus"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
