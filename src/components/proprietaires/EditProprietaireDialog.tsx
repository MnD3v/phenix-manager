import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EditProprietaireDialogProps {
  proprietaire: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditProprietaireDialog = ({ proprietaire, open, onOpenChange }: EditProprietaireDialogProps) => {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (proprietaire) {
      setNom(proprietaire.nom || "");
      setTelephone(proprietaire.telephone || "");
      setEmail(proprietaire.email || "");
      setAdresse(proprietaire.adresse || "");
      setNotes(proprietaire.notes || "");
    }
  }, [proprietaire]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("proprietaires")
        .update({
          nom,
          telephone,
          email: email || null,
          adresse: adresse || null,
          notes: notes || null,
        })
        .eq("id", proprietaire.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proprietaires"] });
      toast.success("Propriétaire modifié avec succès");
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
          <DialogTitle>Modifier le Propriétaire</DialogTitle>
          <DialogDescription>Mettre à jour les informations du propriétaire</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom complet *</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required className="w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone *</Label>
            <Input id="telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
