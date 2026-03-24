import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditLocataireDialogProps {
  locataire: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditLocataireDialog = ({ locataire, open, onOpenChange }: EditLocataireDialogProps) => {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("");
  const [pieceIdentite, setPieceIdentite] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (locataire) {
      setNom(locataire.nom || "");
      setTelephone(locataire.telephone || "");
      setEmail(locataire.email || "");
      setAdresse(locataire.adresse || "");
      setPieceIdentite(locataire.piece_identite || "");
    }
  }, [locataire]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("locataires")
        .update({
          nom,
          telephone,
          email: email || null,
          adresse: adresse || null,
          piece_identite: pieceIdentite || null,
        })
        .eq("id", locataire.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      toast.success("Locataire modifié avec succès");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le Locataire</DialogTitle>
          <DialogDescription>Mettre à jour les informations du locataire</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom complet *</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone *</Label>
            <Input id="telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} required className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="piece">Pièce d'identité</Label>
            <Input id="piece" value={pieceIdentite} onChange={(e) => setPieceIdentite(e.target.value)} className="w-full" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Modification..." : "Modifier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
