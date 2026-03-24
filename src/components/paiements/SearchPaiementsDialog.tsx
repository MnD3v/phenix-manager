import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

const getStatutBadge = (statut: string) => {
  if (statut === "paye") return <Badge>Payé</Badge>;
  if (statut === "en_attente") return <Badge variant="secondary">En attente</Badge>;
  return <Badge variant="destructive">Retard</Badge>;
};

export const SearchPaiementsDialog = () => {
  const [open, setOpen] = useState(false);
  const [searchTenant, setSearchTenant] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const { data: allPaiements, isLoading } = useQuery({
    queryKey: ["all-paiements-search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiements")
        .select(`
          *,
          locataires(nom, telephone, email, adresse),
          biens(nom, adresse, type)
        `)
        .order("date_paiement", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open, // Only fetch when dialog is open
  });

  // Calculate distinct months from data
  const availableMonths = Array.from(
    new Set((allPaiements || []).map((p) => getRegistrationMonth(p.date_paiement)))
  );

  const getMonthSortValue = (monthStr: string) => {
    const [m, y] = monthStr.split(" ");
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const monthIndex = months.indexOf(m);
    return parseInt(y) * 12 + monthIndex;
  };

  availableMonths.sort((a, b) => getMonthSortValue(b) - getMonthSortValue(a));

  const filteredPaiements = (allPaiements || []).filter((p) => {
    const matchTenant = searchTenant === "" || p.locataires?.nom?.toLowerCase().includes(searchTenant.toLowerCase());
    const pMonth = getRegistrationMonth(p.date_paiement);
    const matchMonth = selectedMonth === "all" || pMonth === selectedMonth;
    return matchTenant && matchMonth;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative w-64 cursor-pointer" onClick={() => setOpen(true)}>
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-8 cursor-pointer pointer-events-none"
            readOnly
          />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col pointer-events-auto">
        <DialogHeader>
          <DialogTitle>Recherche des paiements</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4 py-4">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground mb-1 block">Locataire</label>
            <Input
              placeholder="Nom du locataire..."
              value={searchTenant}
              onChange={(e) => setSearchTenant(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <label className="text-sm text-muted-foreground mb-1 block">Mois d'enregistrement</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les mois" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto border rounded-md">
          {isLoading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 border-b shadow-sm">
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Mois(Règle)</TableHead>
                  <TableHead className="whitespace-nowrap">Locataire</TableHead>
                  <TableHead className="whitespace-nowrap">Bien</TableHead>
                  <TableHead className="whitespace-nowrap">Montant</TableHead>
                  <TableHead className="whitespace-nowrap">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPaiements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun paiement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPaiements.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">{new Date(p.date_paiement).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="whitespace-nowrap">{getRegistrationMonth(p.date_paiement)}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{p.locataires?.nom}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.biens?.nom}</TableCell>
                      <TableCell className="font-bold whitespace-nowrap">{parseFloat(p.montant.toString()).toLocaleString()} FCFA</TableCell>
                      <TableCell className="whitespace-nowrap">{getStatutBadge(p.statut)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
