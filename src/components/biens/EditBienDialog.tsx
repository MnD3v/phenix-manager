import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";

interface EditBienDialogProps {
  bien: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditBienDialog = ({ bien, open, onOpenChange }: EditBienDialogProps) => {
  const [nom, setNom] = useState("");
  const [nature, setNature] = useState<"bati" | "non_bati">("bati");
  const [finalite, setFinalite] = useState<"louer" | "vendre">("louer");
  const [type, setType] = useState<"maison" | "boutique" | "chambre" | "magasin" | "villa" | "terrain">("maison");
  const [estMeuble, setEstMeuble] = useState<"meuble" | "non_meuble" | "">("");
  const [adresse, setAdresse] = useState("");
  const [proprietaireId, setProprietaireId] = useState("");
  const [loyerMensuel, setLoyerMensuel] = useState("");
  const [description, setDescription] = useState("");
  const [commissionPourcentage, setCommissionPourcentage] = useState("10");
  const [ville, setVille] = useState("");
  const [quartier, setQuartier] = useState("");
  const queryClient = useQueryClient();

  const { data: proprietaires } = useQuery({
    queryKey: ["proprietaires"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proprietaires").select("*").order("nom");
      if (error) throw error;
      return data;
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["biens-locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("biens").select("ville, quartier");
      if (error) throw error;

      const villes = Array.from(new Set(data.filter(d => d.ville).map(d => d.ville)));
      const quartiers = Array.from(new Set(data.filter(d => d.quartier).map(d => d.quartier)));

      return { villes: villes as string[], quartiers: quartiers as string[] };
    },
  });

  useEffect(() => {
    if (bien) {
      setNom(bien.nom || "");
      setNature(bien.nature || "bati");
      setFinalite(bien.finalite || "louer");
      setType(bien.type || "maison");
      setAdresse(bien.adresse || "");
      setProprietaireId(bien.proprietaire_id || "");
      setLoyerMensuel(bien.loyer_mensuel?.toString() || "");
      setDescription(bien.etat_des_lieux || "");
      setCommissionPourcentage(bien.commission_pourcentage?.toString() || "10");
      setVille(bien.ville || "");
      setQuartier(bien.quartier || "");
      setEstMeuble(bien.est_meuble === true ? "meuble" : bien.est_meuble === false ? "non_meuble" : "");
    }
  }, [bien]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("biens")
        .update({
          nom,
          type: type as any,
          nature,
          finalite,
          adresse,
          proprietaire_id: proprietaireId,
          loyer_mensuel: parseFloat(loyerMensuel),
          description: null,
          etat_des_lieux: description || null,
          commission_pourcentage: parseFloat(commissionPourcentage),
          ville: ville || null,
          quartier: quartier || null,
          est_meuble: type !== "terrain" && estMeuble ? estMeuble === "meuble" : null,
        })
        .eq("id", bien.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      queryClient.invalidateQueries({ queryKey: ["biens-locations"] });
      toast.success("Bien modifié avec succès");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proprietaireId) {
      toast.error("Veuillez sélectionner un propriétaire");
      return;
    }

    if (!ville) {
      toast.error("Veuillez sélectionner ou ajouter une ville");
      return;
    }

    if (!quartier) {
      toast.error("Veuillez sélectionner ou ajouter un quartier");
      return;
    }

    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le Bien</DialogTitle>
          <DialogDescription>Mettre à jour les informations du bien</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du bien *</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nature">Nature *</Label>
              <Select value={nature} onValueChange={(v: any) => setNature(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bati">Immeuble Bâti</SelectItem>
                  <SelectItem value="non_bati">Non Bâti</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalite">Finalité *</Label>
              <Select value={finalite} onValueChange={(v: any) => setFinalite(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="louer">À Louer</SelectItem>
                  <SelectItem value="vendre">À Vendre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maison">Maison</SelectItem>
                  <SelectItem value="boutique">Boutique</SelectItem>
                  <SelectItem value="chambre">Chambre</SelectItem>
                  <SelectItem value="magasin">Magasin</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="terrain">Terrain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {nature === "bati" && type !== "terrain" && (
              <div className="space-y-2">
                <Label htmlFor="ameublement">Ameublement *</Label>
                <Select value={estMeuble} onValueChange={(v: any) => setEstMeuble(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meuble">Meublé</SelectItem>
                    <SelectItem value="non_meuble">Non meublé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ville">Ville *</Label>
              <CreatableCombobox
                options={locations?.villes || []}
                value={ville}
                onValueChange={setVille}
                placeholder="Sélectionner ou ajouter"
                emptyText="Aucune ville trouvée."
                createLabel="Ajouter la ville"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quartier">Quartier *</Label>
              <CreatableCombobox
                options={locations?.quartiers || []}
                value={quartier}
                onValueChange={setQuartier}
                placeholder="Sélectionner ou ajouter"
                emptyText="Aucun quartier trouvé."
                createLabel="Ajouter le quartier"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse *</Label>
            <Input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proprietaire">Propriétaire *</Label>
            <Select value={proprietaireId} onValueChange={setProprietaireId}>
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="loyer">Loyer mensuel (FCFA) *</Label>
            <Input
              id="loyer"
              type="number"
              step="0.01"
              value={loyerMensuel}
              onChange={(e) => setLoyerMensuel(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commission">Commission phenix (%) *</Label>
            <Input
              id="commission"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={commissionPourcentage}
              onChange={(e) => setCommissionPourcentage(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Pourcentage de commission sur le loyer mensuel
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (état des lieux)</Label>
            <Textarea
              id="description"
              placeholder="Description de l'état du bien..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
