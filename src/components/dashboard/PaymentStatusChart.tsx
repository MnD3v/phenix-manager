import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PaymentStatusChart = () => {
  const { data: paymentData } = useQuery({
    queryKey: ["payment-status-chart"],
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
          .select("statut, montant")
          .gte("date_paiement", startDate)
          .lte("date_paiement", endDate);

        const payes = paiements?.filter(p => p.statut === "paye").reduce((sum, p) => sum + parseFloat(p.montant.toString()), 0) || 0;
        const enAttente = paiements?.filter(p => p.statut === "en_attente").reduce((sum, p) => sum + parseFloat(p.montant.toString()), 0) || 0;
        const retard = paiements?.filter(p => p.statut === "retard").reduce((sum, p) => sum + parseFloat(p.montant.toString()), 0) || 0;

        months.push({
          mois: date.toLocaleDateString("fr-FR", { month: "short" }),
          payés: Math.round(payes / 1000),
          "en attente": Math.round(enAttente / 1000),
          retard: Math.round(retard / 1000),
        });
      }

      return months;
    },
  });

  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Statut des paiements
        </CardTitle>
        <CardDescription>
          Répartition par statut sur 6 mois
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={paymentData}>
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
              formatter={(value: number) => `${value}K CFA`}
            />
            <Legend />
            <Bar dataKey="payés" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="en attente" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="retard" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
