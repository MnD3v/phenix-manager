import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COLORS = {
  occupe: "hsl(var(--success))",
  disponible: "hsl(var(--primary))",
};

export const OccupancyChart = () => {
  const { data: occupancyData } = useQuery({
    queryKey: ["occupancy-chart"],
    queryFn: async () => {
      const { data: biens } = await supabase.from("biens").select("statut");
      
      const occupe = biens?.filter((b) => b.statut === "occupe").length || 0;
      const disponible = biens?.filter((b) => b.statut === "disponible").length || 0;
      const total = occupe + disponible;
      
      return {
        data: [
          { name: "Occupés", value: occupe, percent: total ? Math.round((occupe / total) * 100) : 0 },
          { name: "Disponibles", value: disponible, percent: total ? Math.round((disponible / total) * 100) : 0 },
        ],
        tauxOccupation: total ? Math.round((occupe / total) * 100) : 0,
      };
    },
  });

  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Taux d'occupation
        </CardTitle>
        <CardDescription>
          {occupancyData?.tauxOccupation}% de biens occupés
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={occupancyData?.data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${percent}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {occupancyData?.data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.name === "Occupés" ? COLORS.occupe : COLORS.disponible}
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string) => [value, name]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
