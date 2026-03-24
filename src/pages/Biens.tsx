import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, User, DollarSign, Search, Edit, Trash2 } from "lucide-react";
import { AddBienDialog } from "@/components/biens/AddBienDialog";
import { EditBienDialog } from "@/components/biens/EditBienDialog";
import { DeleteBienDialog } from "@/components/biens/DeleteBienDialog";
import { useAuth } from "@/contexts/AuthContext";

const Biens = () => {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBien, setEditingBien] = useState<any>(null);
  const [deletingBien, setDeletingBien] = useState<any>(null);

  const { data: biens, isLoading } = useQuery({
    queryKey: ["biens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biens")
        .select("*, proprietaires(nom), contrats(statut)")
        .order("nom");
      if (error) throw error;
      return data;
    },
  });

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      maison: "Maison",
      boutique: "Boutique",
      chambre: "Chambre",
      magasin: "Magasin",
    };
    return labels[type] || type;
  };

  const getStatutBadge = (statut: string) => {
    if (statut === "disponible") {
      return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 border-transparent shadow-sm">Disponible</Badge>;
    }
    return <Badge className="bg-amber-500 text-white hover:bg-amber-600 border-transparent shadow-sm">Occupé</Badge>;
  };

  const filteredBiens = biens?.filter(
    (b) =>
      b.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.adresse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.ville?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.quartier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.proprietaires?.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Biens Immobiliers
          </h1>
          <p className="text-muted-foreground">
            Gérez votre parc immobilier et suivez les occupations
          </p>
        </div>
        {isAdmin && <AddBienDialog />}
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, adresse, ville, quartier ou propriétaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="text-sm text-muted-foreground hidden sm:block">
          {filteredBiens?.length || 0} bien{(filteredBiens?.length || 0) > 1 ? 's' : ''} trouvé{(filteredBiens?.length || 0) > 1 ? 's' : ''}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {filteredBiens?.map((bien, index) => (
            <Card key={bien.id} className="group overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-primary/10 hover:border-primary/30 relative bg-card" style={{ animationDelay: `${index * 50}ms` }}>
              <CardHeader className="pb-3 pt-5 bg-gradient-to-b from-muted/30 to-transparent">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold leading-none mb-1.5 text-foreground">{bien.nom}</CardTitle>
                      <Badge variant="outline" className="text-[11px] font-medium h-5 border-primary/20 text-primary bg-primary/5">
                        {getTypeLabel(bien.type)}
                      </Badge>
                    </div>
                  </div>
                  {getStatutBadge(bien.statut)}
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                <div className="space-y-3 text-sm px-2">
                  <div className="flex items-center gap-3 text-muted-foreground p-2 rounded-lg bg-muted/30 border border-muted/50">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-primary/70" />
                    <span className="truncate font-medium flex-1 text-foreground/80" title={`${bien.adresse}${bien.quartier || bien.ville ? ` - ${[bien.quartier, bien.ville].filter(Boolean).join(", ")}` : ""}`}>
                      {bien.adresse}
                      {(bien.quartier || bien.ville) && (
                        <span className="text-muted-foreground/70 ml-1 font-normal">
                          • {[bien.quartier, bien.ville].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground px-2">
                    <User className="h-4 w-4 flex-shrink-0 text-primary/70" />
                    <span className="truncate font-medium text-foreground/80">{bien.proprietaires?.nom}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      Loyer mensuel
                    </span>
                    <span className="font-bold text-foreground text-base">
                      {bien.loyer_mensuel.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t border-primary/10 pt-2">
                    <span className="text-muted-foreground">Commission ({bien.commission_pourcentage}%)</span>
                    <span className="font-bold text-primary">
                      {(bien.loyer_mensuel * (bien.commission_pourcentage / 100)).toLocaleString()} FCFA
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 pt-1 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingBien(bien)}
                      className="flex-1 h-9 mt-2 text-xs font-medium hover:bg-primary/10 text-primary"
                    >
                      <Edit className="h-3.5 w-3.5 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingBien(bien)}
                      className="flex-1 h-9 mt-2 text-xs font-medium hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredBiens?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/5 border-dashed">
          <Building2 className="h-10 w-10 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">Aucun bien trouvé</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Essayez de modifier vos critères de recherche ou ajoutez un nouveau bien.
          </p>
        </div>
      )}

      {editingBien && (
        <EditBienDialog
          bien={editingBien}
          open={!!editingBien}
          onOpenChange={(open) => !open && setEditingBien(null)}
        />
      )}

      {deletingBien && (
        <DeleteBienDialog
          bien={deletingBien}
          open={!!deletingBien}
          onOpenChange={(open) => !open && setDeletingBien(null)}
        />
      )}
    </div>
  );
};

export default Biens;
