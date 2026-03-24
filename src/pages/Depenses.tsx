import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, DollarSign, Wrench, Zap, Droplet, Trash2, Receipt } from "lucide-react";
import { AddDepenseDialog } from "@/components/depenses/AddDepenseDialog";
import { DeleteDepenseDialog } from "@/components/depenses/DeleteDepenseDialog";
import { DepenseDetailsDialog } from "@/components/depenses/DepenseDetailsDialog";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useAuth } from "@/contexts/AuthContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const Depenses = () => {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingDepense, setDeletingDepense] = useState<any>(null);
  const [viewingDepense, setViewingDepense] = useState<any>(null);

  const { data: depenses, isLoading } = useQuery({
    queryKey: ["depenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depenses")
        .select(`
          *,
          biens (
            nom,
            adresse,
            proprietaires (
              id,
              nom,
              telephone,
              email
            )
          ),
          proprietaires (
            id,
            nom,
            telephone,
            email
          )
        `)
        .order("date_depense", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getCategorieColor = (categorie: string) => {
    const colors: Record<string, string> = {
      reparation: "bg-orange-500",
      electricite: "bg-yellow-500",
      eau: "bg-blue-500",
      vidange: "bg-purple-500",
      autre: "bg-gray-500",
    };
    return colors[categorie] || "bg-gray-500";
  };

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

  const getRegistrationMonth = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    let targetDate = date;
    if (day <= 15) {
      targetDate = new Date(year, month - 1, 1);
    }

    const monthName = targetDate.toLocaleDateString("fr-FR", { month: "long" });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${targetDate.getFullYear()}`;
  };

  const currentMonthName = getRegistrationMonth(new Date().toISOString());
  const currentMonthDepenses = depenses?.filter(
    (d) => getRegistrationMonth(d.date_depense) === currentMonthName
  ) || [];

  const totalDepenses = currentMonthDepenses.reduce((sum, d) => sum + parseFloat(d.montant.toString()), 0);
  const reparations = currentMonthDepenses.filter((d) => d.categorie === "reparation").reduce((sum, d) => sum + parseFloat(d.montant.toString()), 0);
  const electricite = currentMonthDepenses.filter((d) => d.categorie === "electricite").reduce((sum, d) => sum + parseFloat(d.montant.toString()), 0);
  const autres = totalDepenses - reparations - electricite;

  const filteredDepenses = depenses?.filter(
    (d) =>
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.biens?.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategorieLabel(d.categorie).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedDepenses = filteredDepenses?.reduce((acc: Record<string, typeof depenses>, depense) => {
    const month = getRegistrationMonth(depense.date_depense);
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month]!.push(depense);
    return acc;
  }, {});

  const getMonthSortValue = (monthStr: string) => {
    const [m, y] = monthStr.split(" ");
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const monthIndex = months.indexOf(m);
    return parseInt(y) * 12 + monthIndex;
  };

  const sortedMonths = Object.keys(groupedDepenses || {}).sort((a, b) => getMonthSortValue(b) - getMonthSortValue(a));

  return (
    <div className="space-y-8 animate-fade-in p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dépenses
          </h1>
          <p className="text-muted-foreground">
            Suivi et gestion des dépenses par bien immobilier
          </p>
        </div>
        {isAdmin && <AddDepenseDialog />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Dépenses" value={`${totalDepenses.toLocaleString()} FCFA`} icon={DollarSign} />
        <StatsCard title="Réparations" value={`${reparations.toLocaleString()} FCFA`} icon={Wrench} />
        <StatsCard title="Électricité" value={`${electricite.toLocaleString()} FCFA`} icon={Zap} />
        <StatsCard title="Autres" value={`${autres.toLocaleString()} FCFA`} icon={Droplet} />
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par description, bien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        {/* <Button variant="outline" className="whitespace-nowrap h-10">
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button> */}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card className="border-muted/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/5 border-b py-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Historique des dépenses
            </CardTitle>
          </CardHeader>
          <div className="p-4">
            {!isLoading && sortedMonths.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Aucune dépense trouvée</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Essayez de modifier vos critères de recherche ou ajoutez une nouvelle dépense.
                </p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full space-y-4">
                {sortedMonths.map((month) => {
                  const monthDepenses = groupedDepenses![month] || [];
                  const monthTotal = monthDepenses.reduce((sum, d) => sum + parseFloat(d.montant.toString()), 0);

                  return (
                    <AccordionItem key={month} value={month} className="border rounded-lg px-4 bg-card shadow-sm">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex flex-1 items-center justify-between pr-4">
                          <h3 className="text-lg font-semibold">{month}</h3>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-muted-foreground bg-muted/10">
                              {monthDepenses.length} dépense{monthDepenses.length > 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="secondary" className="font-semibold text-base py-1">
                              {monthTotal.toLocaleString()} FCFA
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="overflow-x-auto pt-4 border-t border-muted">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-b border-muted/60">
                                <TableHead className="w-[120px]">Date</TableHead>
                                <TableHead>Bien</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead className="min-w-[300px]">Description</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                                <TableHead className="text-right w-[80px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {monthDepenses.map((depense) => (
                                <TableRow key={depense.id} className="hover:bg-muted/5 transition-colors border-muted/60">
                                  <TableCell className="font-medium text-muted-foreground">
                                    {new Date(depense.date_depense).toLocaleDateString("fr-FR")}
                                  </TableCell>
                                  <TableCell className="font-medium">{depense.biens?.nom}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="secondary"
                                      className={`font-normal ${depense.categorie === 'reparation' ? 'bg-orange-500/10 text-orange-700' :
                                        depense.categorie === 'electricite' ? 'bg-yellow-500/10 text-yellow-700' :
                                          depense.categorie === 'eau' ? 'bg-blue-500/10 text-blue-700' :
                                            depense.categorie === 'vidange' ? 'bg-purple-500/10 text-purple-700' :
                                              'bg-gray-500/10 text-gray-700'
                                        }`}
                                    >
                                      {getCategorieLabel(depense.categorie)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{depense.description}</TableCell>
                                  <TableCell className="text-right font-bold text-foreground">
                                    {parseFloat(depense.montant.toString()).toLocaleString()} FCFA
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewingDepense(depense)}
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                      >
                                        <Receipt className="h-4 w-4" />
                                      </Button>
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setDeletingDepense(depense)}
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </Card>
      )}

      {deletingDepense && (
        <DeleteDepenseDialog
          depense={deletingDepense}
          open={!!deletingDepense}
          onOpenChange={(open) => !open && setDeletingDepense(null)}
        />
      )}

      {viewingDepense && (
        <DepenseDetailsDialog
          depense={viewingDepense}
          open={!!viewingDepense}
          onOpenChange={(open) => !open && setViewingDepense(null)}
        />
      )}
    </div>
  );
};

export default Depenses;
