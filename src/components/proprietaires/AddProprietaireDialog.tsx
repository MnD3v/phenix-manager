import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, User, Phone, Mail, MapPin, FileText } from "lucide-react";
import { toast } from "sonner";

const FormField = ({
  id, label, icon: Icon, required, type = "text", value, onChange, placeholder
}: {
  id: string; label: string; icon: any; required?: boolean;
  type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
      {label}
      {required && <span className="text-primary text-xs">*</span>}
    </Label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={1.5} />
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="pl-9 h-10 rounded-xl border-border/50 bg-[#f8f9fb] focus:bg-white transition-colors"
      />
    </div>
  </div>
);

export const AddProprietaireDialog = () => {
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("proprietaires").insert({
        nom, telephone,
        email: email || null,
        adresse: adresse || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proprietaires"] });
      toast.success("Propriétaire ajouté avec succès");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(`Erreur: ${error.message}`),
  });

  const resetForm = () => {
    setNom(""); setTelephone(""); setEmail(""); setAdresse(""); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" strokeWidth={2} />
          Ajouter un propriétaire
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl border-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-[#f8f9fb] px-6 pt-6 pb-5 border-b border-border/30">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Nouveau propriétaire
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Renseignez les informations du propriétaire
            </p>
          </DialogHeader>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }}
          className="px-6 py-5 space-y-4"
        >
          <FormField
            id="nom" label="Nom complet" icon={User} required
            value={nom} onChange={setNom} placeholder="Jean Dupont"
          />
          <FormField
            id="telephone" label="Téléphone" icon={Phone} required
            value={telephone} onChange={setTelephone} placeholder="+221 77 000 00 00"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="email" label="Email" icon={Mail} type="email"
              value={email} onChange={setEmail} placeholder="email@exemple.com"
            />
            <FormField
              id="adresse" label="Adresse" icon={MapPin}
              value={adresse} onChange={setAdresse} placeholder="Dakar, Sénégal"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations supplémentaires..."
              className="rounded-xl border-border/50 bg-[#f8f9fb] focus:bg-white resize-none min-h-[80px] transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addMutation.isPending} className="min-w-[100px]">
              {addMutation.isPending ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
