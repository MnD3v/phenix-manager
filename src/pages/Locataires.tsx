import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Building2, Search, Edit, Trash2, FileText } from "lucide-react";
import { AddContratDialog } from "@/components/locataires/AddContratDialog";
import { EditLocataireDialog } from "@/components/locataires/EditLocataireDialog";
import { DeleteLocataireDialog } from "@/components/locataires/DeleteLocataireDialog";
import { EditContratDialog } from "@/components/locataires/EditContratDialog";
import { DeleteContratDialog } from "@/components/locataires/DeleteContratDialog";
import { ContratDetailsDialog } from "@/components/locataires/ContratDetailsDialog";
import { RecycleBinDialog } from "@/components/locataires/RecycleBinDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Locataires = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocataire, setSelectedLocataire] = useState<any>(null);
  const [selectedContrat, setSelectedContrat] = useState<any>(null);
  const [editLocataireOpen, setEditLocataireOpen] = useState(false);
  const [deleteLocataireOpen, setDeleteLocataireOpen] = useState(false);
  const [editContratOpen, setEditContratOpen] = useState(false);
  const [deleteContratOpen, setDeleteContratOpen] = useState(false);
  const [viewContratOpen, setViewContratOpen] = useState(false);

  const { data: contrats, isLoading: isLoadingContrats } = useQuery({
    queryKey: ["contrats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrats")
        .select("*, locataires(*), biens(*, proprietaires(*))")
        .eq("statut", "actif")
        .order("date_debut", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch inactive tenants if searching
  const { data: inactiveLocataires, isLoading: isLoadingInactive } = useQuery({
    queryKey: ["inactive-locataires", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from("locataires")
        .select("*")
        .ilike("nom", `%${searchQuery}%`)
        .neq("statut", "corbeille"); // Exclude trash

      if (error) throw error;

      // Filter out those who already have active contracts loaded
      const activeLocataireIds = new Set(contrats?.map(c => c.locataire_id));
      return data.filter(l => !activeLocataireIds.has(l.id));
    },
    enabled: !!searchQuery && searchQuery.length >= 2 && !!contrats,
  });

  const isLoading = isLoadingContrats || isLoadingInactive;

  const getInitials = (nom: string) => {
    return nom.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const filteredContrats = contrats?.filter((c) =>
    c.locataires?.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Locataires
          </h1>
          <p className="text-muted-foreground">
            Gérez les locataires et leurs contrats de location
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => navigate("/arrieres")}
            >
              <FileText className="h-4 w-4" />
              Voir les Arriérés
            </Button>
            <RecycleBinDialog />
            <AddContratDialog />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="text-sm text-muted-foreground hidden sm:block">
          {filteredContrats?.length || 0} contrat{(filteredContrats?.length || 0) > 1 ? 's' : ''} actif{(filteredContrats?.length || 0) > 1 ? 's' : ''}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredContrats?.map((contrat, index) => (
            <Card key={contrat.id} className="group hover:shadow-md transition-all duration-200 border-muted/60" style={{ animationDelay: `${index * 50}ms` }}>
              <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <Avatar className="h-12 w-12 ring-1 ring-border transition-all">
                  <AvatarFallback className="bg-primary/5 text-primary font-semibold text-sm">
                    {getInitials(contrat.locataires?.nom || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <CardTitle className="text-base font-semibold truncate leading-none">{contrat.locataires?.nom}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">
                      Actif
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{contrat.locataires?.telephone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{contrat.biens?.nom}</span>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Loyer mensuel</span>
                    <span className="font-bold text-primary">
                      {contrat.loyer_mensuel.toLocaleString()} FCFA
                    </span>
                  </div>
                  {contrat.avance_mois > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Avance</span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {contrat.avance_mois} mois
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedContrat(contrat);
                      setViewContratOpen(true);
                    }}
                    className="w-full h-8 text-xs hover:bg-accent/50"
                  >
                    <FileText className="h-3.5 w-3.5 mr-2" />
                    Détails du contrat
                  </Button>
                  {isAdmin && (
                    <>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLocataire(contrat.locataires);
                            setEditLocataireOpen(true);
                          }}
                          className="flex-1 h-8 text-xs hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Locataire
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedContrat(contrat);
                            setEditContratOpen(true);
                          }}
                          className="flex-1 h-8 text-xs hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Contrat
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedContrat(contrat);
                          setDeleteContratOpen(true);
                        }}
                        className="w-full h-8 text-xs hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Terminer le contrat
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {inactiveLocataires?.map((locataire, index) => (
            <Card key={locataire.id} className="group hover:shadow-md transition-all duration-200 border-muted/60 opacity-75 hover:opacity-100" style={{ animationDelay: `${index * 50}ms` }}>
              <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <Avatar className="h-12 w-12 ring-1 ring-border transition-all grayscale">
                  <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm">
                    {getInitials(locataire.nom || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <CardTitle className="text-base font-semibold truncate leading-none text-muted-foreground">{locataire.nom}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      Sans contrat actif
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{locataire.telephone}</span>
                  </div>
                </div>

                <div className="pt-3 border-t mt-8">
                  <div className="text-xs text-muted-foreground text-center italic py-2">
                    Aucun contrat en cours
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {isAdmin && (
                    <>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLocataire(locataire);
                            setEditLocataireOpen(true);
                          }}
                          className="flex-1 h-8 text-xs hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLocataire(locataire);
                            setDeleteLocataireOpen(true);
                          }}
                          className="flex-1 h-8 text-xs hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Corbeille
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredContrats?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/5 border-dashed">
          <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Aucun locataire trouvé</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Essayez de modifier vos critères de recherche ou ajoutez un nouveau contrat.
          </p>
        </div>
      )}

      {selectedLocataire && (
        <>
          <EditLocataireDialog
            locataire={selectedLocataire}
            open={editLocataireOpen}
            onOpenChange={setEditLocataireOpen}
          />
          <DeleteLocataireDialog
            locataire={selectedLocataire}
            open={deleteLocataireOpen}
            onOpenChange={setDeleteLocataireOpen}
          />
        </>
      )}

      {selectedContrat && (
        <>
          <ContratDetailsDialog
            contrat={selectedContrat}
            open={viewContratOpen}
            onOpenChange={setViewContratOpen}
          />
          <EditContratDialog
            contrat={selectedContrat}
            open={editContratOpen}
            onOpenChange={setEditContratOpen}
          />
          <DeleteContratDialog
            contrat={selectedContrat}
            open={deleteContratOpen}
            onOpenChange={setDeleteContratOpen}
          />
        </>
      )}
    </div>
  );
};

export default Locataires;
