import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Search, Edit, Trash2, Building, UsersRound, TrendingUp } from "lucide-react";
import { AddProprietaireDialog } from "@/components/proprietaires/AddProprietaireDialog";
import { EditProprietaireDialog } from "@/components/proprietaires/EditProprietaireDialog";
import { DeleteProprietaireDialog } from "@/components/proprietaires/DeleteProprietaireDialog";
import { ProprietaireBiensDialog } from "@/components/proprietaires/ProprietaireBiensDialog";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Palette de couleurs pour les avatars (cycles)
const AVATAR_COLORS = [
  { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200" },
  { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" },
  { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200" },
  { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  { bg: "bg-indigo-100", text: "text-indigo-700", ring: "ring-indigo-200" },
];

const Proprietaires = () => {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProprietaire, setEditingProprietaire] = useState<any>(null);
  const [deletingProprietaire, setDeletingProprietaire] = useState<any>(null);
  const [viewingBiens, setViewingBiens] = useState<any>(null);

  const { data: proprietaires, isLoading } = useQuery({
    queryKey: ["proprietaires"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proprietaires")
        .select("*, biens(id, loyer_mensuel)")
        .order("nom");
      if (error) throw error;
      return data;
    },
  });

  const getInitials = (nom: string) =>
    nom.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const calculateRevenuMensuel = (biens: any[]) =>
    biens.reduce((sum, bien) => sum + (bien.loyer_mensuel || 0), 0);

  const filteredProprietaires = proprietaires?.filter(
    (p) =>
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.telephone.includes(searchQuery) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-semibold text-foreground tracking-tight">
            Propriétaires
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les propriétaires de vos biens immobiliers
          </p>
        </div>
        {isAdmin && <AddProprietaireDialog />}
      </div>

      {/* Search + Count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          <Input
            placeholder="Nom, téléphone ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-white/60 border-border/40 focus:bg-white transition-colors"
          />
        </div>
        <span className="text-sm text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full">
          {filteredProprietaires?.length || 0} propriétaire{(filteredProprietaires?.length || 0) > 1 ? "s" : ""}
        </span>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Grid of Cards */}
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {filteredProprietaires?.map((proprietaire, index) => {
              const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
              const revenu = calculateRevenuMensuel(proprietaire.biens || []);
              const nbBiens = proprietaire.biens?.length || 0;

              return (
                <Card key={proprietaire.id} className="group overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 border-primary/15 hover:border-primary/30 relative bg-card" style={{ animationDelay: `${index * 50}ms` }}>
                  <CardHeader className="pb-3 pt-5 bg-gradient-to-b from-muted/30 to-transparent">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ring-1 shadow-sm",
                          color.bg, color.text, color.ring
                        )}>
                          {getInitials(proprietaire.nom)}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold leading-none mb-1.5 text-foreground">{proprietaire.nom}</CardTitle>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[11px] font-medium h-5 border-primary/20 text-primary bg-primary/5">
                              <Building className="h-3 w-3 mr-1" strokeWidth={1.5} />
                              {nbBiens} bien{nbBiens > 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 pt-4">
                    <div className="space-y-3 text-sm px-2">
                      {proprietaire.telephone && (
                        <div className="flex items-center gap-3 text-muted-foreground p-2 rounded-lg bg-muted/30 border border-muted/50">
                          <Phone className="h-4 w-4 flex-shrink-0 text-primary/70" strokeWidth={1.5} />
                          <span className="truncate font-medium flex-1 text-foreground/80">{proprietaire.telephone}</span>
                        </div>
                      )}
                      {proprietaire.email && (
                        <div className="flex items-center gap-3 text-muted-foreground px-2">
                          <Mail className="h-4 w-4 flex-shrink-0 text-primary/70" strokeWidth={1.5} />
                          <span className="truncate font-medium text-foreground/80">{proprietaire.email}</span>
                        </div>
                      )}
                      {proprietaire.adresse && (
                        <div className="flex items-center gap-3 text-muted-foreground px-2">
                          <MapPin className="h-4 w-4 flex-shrink-0 text-primary/70" strokeWidth={1.5} />
                          <span className="truncate font-medium text-foreground/80">{proprietaire.adresse}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <TrendingUp className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
                          Revenu mensuel
                        </span>
                        <span className={cn("font-bold text-base", revenu > 0 ? "text-foreground" : "text-muted-foreground")}>
                          {revenu.toLocaleString()} FCFA
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-3 border-t">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setViewingBiens(proprietaire)}
                        className="w-full h-9 text-xs font-medium shadow-sm transition-all hover:translate-y-[-1px]"
                      >
                        <Building className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                        Voir les biens
                      </Button>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProprietaire(proprietaire)}
                            className="flex-1 h-9 text-xs font-medium text-slate-600 hover:text-primary hover:border-primary/50 hover:bg-primary/5 shadow-sm transition-all"
                          >
                            <Edit className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                            Modifier
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingProprietaire(proprietaire)}
                            className="flex-1 h-9 text-xs font-medium text-destructive hover:text-destructive hover:border-destructive/50 hover:bg-destructive/5 shadow-sm transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                            Supprimer
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {
            filteredProprietaires?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white/40 rounded-2xl border border-dashed border-border/30">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                  <UsersRound className="h-6 w-6 text-slate-400" strokeWidth={1.25} />
                </div>
                <h3 className="text-base font-semibold text-foreground">Aucun propriétaire trouvé</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Modifiez votre recherche ou ajoutez un nouveau propriétaire.
                </p>
              </div>
            )
          }
        </>
      )}

      {/* Dialogs */}
      {editingProprietaire && (
        <EditProprietaireDialog
          proprietaire={editingProprietaire}
          open={!!editingProprietaire}
          onOpenChange={(open) => !open && setEditingProprietaire(null)}
        />
      )}
      {deletingProprietaire && (
        <DeleteProprietaireDialog
          proprietaire={deletingProprietaire}
          open={!!deletingProprietaire}
          onOpenChange={(open) => !open && setDeletingProprietaire(null)}
        />
      )}
      {viewingBiens && (
        <ProprietaireBiensDialog
          proprietaire={viewingBiens}
          open={!!viewingBiens}
          onOpenChange={(open) => !open && setViewingBiens(null)}
        />
      )}
    </div>
  );
};

export default Proprietaires;
