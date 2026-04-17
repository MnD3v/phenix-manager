import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

export const AddDepenseDialog = () => {
  const [open, setOpen] = useState(false);
  const [bienId, setBienId] = useState("");
  const [categorie, setCategorie] = useState<"reparation" | "electricite" | "eau" | "vidange" | "autre">("reparation");
  const [description, setDescription] = useState("");
  const [montant, setMontant] = useState("");
  const [dateDepense, setDateDepense] = useState<Date | undefined>(new Date());
  const [selectedProprietaireId, setSelectedProprietaireId] = useState("");
  const queryClient = useQueryClient();

  const { data: proprietaires } = useQuery({
    queryKey: ["proprietaires"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proprietaires").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  const { data: biens } = useQuery({
    queryKey: ["biens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("biens").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  const filteredBiens = biens?.filter(b => b.proprietaire_id === selectedProprietaireId);

  const addMutation = useMutation({
    mutationFn: async () => {
      // Si bienId est 'none' ou vide, on envoie null à la base de données
      const finalBienId = (!bienId || bienId === "none") ? null : bienId;

      const { error } = await supabase.from("depenses").insert({
        bien_id: finalBienId,
        proprietaire_id: selectedProprietaireId || null,
        categorie,
        description,
        montant: parseFloat(montant),
        date_depense: dateDepense ? format(dateDepense, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["depenses"] });
      toast.success("Dépense enregistrée avec succès");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedProprietaireId("");
    setBienId("");
    setCategorie("reparation");
    setDescription("");
    setMontant("");
    setDateDepense(new Date());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(montant);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Le montant doit être supérieur à 0");
      return;
    }

    if (!selectedProprietaireId) {
      toast.error("Veuillez sélectionner un propriétaire");
      return;
    }

    addMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une dépense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle Dépense</DialogTitle>
          <DialogDescription>Enregistrer une nouvelle dépense pour un bien</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="proprietaire">Propriétaire *</Label>
            <Select value={selectedProprietaireId} onValueChange={(val) => {
              setSelectedProprietaireId(val);
              setBienId(""); // Reset bien selection when owner changes
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un propriétaire" />
              </SelectTrigger>
              <SelectContent>
                {proprietaires?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProprietaireId && (
            <div className="space-y-2">
              <Label htmlFor="bien">Bien concerné (Optionnel)</Label>
              <Select value={bienId} onValueChange={setBienId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un bien (facultatif)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun bien spécifique (Dépense générale)</SelectItem>
                  {filteredBiens?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nom} - {b.adresse}
                    </SelectItem>
                  ))}
                  {filteredBiens?.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">Aucun bien pour ce propriétaire</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="categorie">Catégorie *</Label>
            <Select value={categorie} onValueChange={(v: any) => setCategorie(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reparation">Réparation</SelectItem>
                <SelectItem value="electricite">Électricité</SelectItem>
                <SelectItem value="eau">Eau</SelectItem>
                <SelectItem value="vidange">Vidange</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="montant">Montant (FCFA) *</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Date de la dépense *</Label>
            <DatePicker
              date={dateDepense}
              onSelect={setDateDepense}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
