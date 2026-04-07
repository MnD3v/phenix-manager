import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Building2,
  TreePine,
  Home,
  Tag,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { cn } from "@/lib/utils";

type Nature = "bati" | "non_bati";
type Finalite = "louer" | "vendre";

const STEPS = [
  { label: "Nature", number: 1 },
  { label: "Finalité", number: 2 },
  { label: "Informations", number: 3 },
];

const NatureCard = ({
  selected,
  onClick,
  icon: Icon,
  title,
  subtitle,
  iconColor,
  borderColor,
  bgColor,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  iconColor: string;
  borderColor: string;
  bgColor: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 text-center cursor-pointer group",
      selected
        ? `${borderColor} ${bgColor} shadow-md`
        : "border-muted hover:border-muted-foreground/40 bg-card hover:bg-muted/30"
    )}
  >
    <div
      className={cn(
        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-200",
        selected ? `${bgColor} shadow-inner` : "bg-muted/60 group-hover:bg-muted"
      )}
    >
      <Icon
        className={cn(
          "h-7 w-7 transition-colors duration-200",
          selected ? iconColor : "text-muted-foreground group-hover:text-foreground"
        )}
      />
    </div>
    <div>
      <p
        className={cn(
          "font-semibold text-base transition-colors duration-200",
          selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {title}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
    {selected && (
      <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-white", iconColor.replace("text-", "bg-"))}>
        <Check className="h-3 w-3" />
      </div>
    )}
  </button>
);

export const AddBienDialog = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [nature, setNature] = useState<Nature | null>(null);
  const [finalite, setFinalite] = useState<Finalite | null>(null);

  // Step 3 fields
  const [nom, setNom] = useState("");
  const [type, setType] = useState<"maison" | "boutique" | "chambre" | "magasin" | "villa" | "terrain">("maison");
  const [adresse, setAdresse] = useState("");
  const [proprietaireId, setProprietaireId] = useState("");
  const [montant, setMontant] = useState("");
  const [description, setDescription] = useState("");
  const [etatDesLieux, setEtatDesLieux] = useState("");
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
      const villes = Array.from(new Set(data.filter((d) => d.ville).map((d) => d.ville)));
      const quartiers = Array.from(new Set(data.filter((d) => d.quartier).map((d) => d.quartier)));
      return { villes: villes as string[], quartiers: quartiers as string[] };
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const descriptionFull = [
        nature === "bati" ? "Immeuble Bâti" : "Non Bâti",
        finalite === "louer" ? "À Louer" : "À Vendre",
        description,
      ]
        .filter(Boolean)
        .join(" | ");

      const { error } = await supabase.from("biens").insert({
        nom,
        type: (nature === "non_bati" ? "terrain" : type) as any,
        adresse,
        proprietaire_id: proprietaireId,
        loyer_mensuel: parseFloat(montant),
        description: descriptionFull || null,
        etat_des_lieux: etatDesLieux || null,
        commission_pourcentage: parseFloat(commissionPourcentage),
        ville: ville || null,
        quartier: quartier || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      queryClient.invalidateQueries({ queryKey: ["biens-locations"] });
      toast.success("Bien ajouté avec succès");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setStep(1);
    setNature(null);
    setFinalite(null);
    setNom("");
    setType("maison");
    setAdresse("");
    setProprietaireId("");
    setMontant("");
    setDescription("");
    setEtatDesLieux("");
    setCommissionPourcentage("10");
    setVille("");
    setQuartier("");
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetForm();
    setOpen(val);
  };

  const handleNext = () => {
    if (step === 1 && !nature) {
      toast.error("Veuillez sélectionner la nature du bien");
      return;
    }
    if (step === 2 && !finalite) {
      toast.error("Veuillez sélectionner la finalité du bien");
      return;
    }
    setStep((s) => s + 1);
  };

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
    addMutation.mutate();
  };

  const montantLabel = finalite === "vendre" ? "Prix de vente (FCFA)" : "Loyer mensuel (FCFA)";

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.number} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300",
                step > s.number
                  ? "bg-primary border-primary text-white"
                  : step === s.number
                    ? "border-primary text-primary bg-primary/10"
                    : "border-muted text-muted-foreground bg-muted/30"
              )}
            >
              {step > s.number ? <Check className="h-4 w-4" /> : s.number}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium transition-colors",
                step >= s.number ? "text-primary" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "h-0.5 w-10 mb-4 mx-1 transition-colors duration-300",
                step > s.number ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un bien
      </Button>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 1 && "Nature du bien"}
            {step === 2 && "Finalité du bien"}
            {step === 3 && "Informations du bien"}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator />

        {/* ── STEP 1 : Nature ── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              De quel type de bien s'agit-il ?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <NatureCard
                selected={nature === "bati"}
                onClick={() => setNature("bati")}
                icon={Building2}
                title="Immeuble Bâti"
                subtitle="Maison, villa, appartement, boutique…"
                iconColor="text-blue-600"
                borderColor="border-blue-500"
                bgColor="bg-blue-50 dark:bg-blue-950/30"
              />
              <NatureCard
                selected={nature === "non_bati"}
                onClick={() => setNature("non_bati")}
                icon={TreePine}
                title="Non Bâti"
                subtitle="Terrain, parcelle, espace nu…"
                iconColor="text-emerald-600"
                borderColor="border-emerald-500"
                bgColor="bg-emerald-50 dark:bg-emerald-950/30"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleNext} disabled={!nature}>
                Suivant
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2 : Finalité ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Quelle est la finalité de ce bien ?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <NatureCard
                selected={finalite === "louer"}
                onClick={() => setFinalite("louer")}
                icon={Home}
                title="À Louer"
                subtitle="Location mensuelle ou annuelle"
                iconColor="text-violet-600"
                borderColor="border-violet-500"
                bgColor="bg-violet-50 dark:bg-violet-950/30"
              />
              <NatureCard
                selected={finalite === "vendre"}
                onClick={() => setFinalite("vendre")}
                icon={Tag}
                title="À Vendre"
                subtitle="Cession définitive du bien"
                iconColor="text-orange-600"
                borderColor="border-orange-500"
                bgColor="bg-orange-50 dark:bg-orange-950/30"
              />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Précédent
              </Button>
              <Button onClick={handleNext} disabled={!finalite}>
                Suivant
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3 : Informations ── */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Summary badges */}
            <div className="flex gap-2 flex-wrap mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                <Building2 className="h-3 w-3" />
                {nature === "bati" ? "Immeuble Bâti" : "Non Bâti"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                {finalite === "louer" ? <Home className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                {finalite === "louer" ? "À Louer" : "À Vendre"}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nom">Nom du bien *</Label>
              <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
            </div>

            {nature === "bati" ? (
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
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <input type="hidden" value="terrain" />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville *</Label>
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
                <Label>Quartier *</Label>
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
              <Label htmlFor="montant">{montantLabel} *</Label>
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
              <Label htmlFor="commission">Commission Phenix (%) *</Label>
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
                Pourcentage de commission sur le montant (par défaut : 10%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="etatDesLieux">État des lieux</Label>
              <Textarea
                id="etatDesLieux"
                placeholder="Description de l'état du bien…"
                value={etatDesLieux}
                onChange={(e) => setEtatDesLieux(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-between pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Précédent
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Ajout en cours…" : "Ajouter le bien"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
