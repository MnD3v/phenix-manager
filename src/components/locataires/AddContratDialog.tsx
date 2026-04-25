import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { envoyerSmsBienvenue } from "@/services/smsService";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const AddContratDialog = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Locataire info
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [adresse, setAdresse] = useState("");
  const [pieceIdentite, setPieceIdentite] = useState("");

  // Contrat info
  const [bienId, setBienId] = useState("");
  const [dateDebut, setDateDebut] = useState<Date | undefined>(new Date());
  const [loyerMensuel, setLoyerMensuel] = useState("");
  const [cautionMois, setCautionMois] = useState("");
  const [garantieMois, setGarantieMois] = useState("");
  const [avanceMois, setAvanceMois] = useState("0");
  const [sendSms, setSendSms] = useState(true);

  const queryClient = useQueryClient();

  const { data: biensDisponibles } = useQuery({
    queryKey: ["biens-disponibles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biens")
        .select("*")
        .eq("statut", "disponible")
        .order("nom");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create locataire
      const { data: locataireData, error: locataireError } = await supabase
        .from("locataires")
        .insert({ nom, telephone, email: email || null, adresse: adresse || null, piece_identite: pieceIdentite || null })
        .select()
        .single();

      if (locataireError) throw locataireError;

      // 2. Create contrat
      const cautionFCFA = (parseFloat(cautionMois) || 0) * (parseFloat(loyerMensuel) || 0);

      const { data: contratData, error: contratError } = await supabase
        .from("contrats")
        .insert({
          locataire_id: locataireData.id,
          bien_id: bienId,
          date_debut: dateDebut ? format(dateDebut, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
          loyer_mensuel: parseFloat(loyerMensuel),
          caution: cautionFCFA,
          caution_mois: parseInt(cautionMois) || 0,
          garantie_mois: parseInt(garantieMois) || 0,
          avance_mois: parseInt(avanceMois),
        })
        .select()
        .single();

      if (contratError) throw contratError;

      // 2.5. Create advance payment if avance_mois > 0
      const avanceMoisInt = parseInt(avanceMois);
      if (avanceMoisInt > 0) {
        const montantAvance = parseFloat(loyerMensuel) * avanceMoisInt;
        const { error: paiementError } = await supabase
          .from("paiements")
          .insert({
            contrat_id: contratData.id,
            locataire_id: locataireData.id,
            bien_id: bienId,
            date_paiement: dateDebut ? format(dateDebut, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
            montant: montantAvance,
            type: "avance",
            mois_concerne: dateDebut ? format(dateDebut, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
            statut: "paye",
            notes: `Avance de ${avanceMoisInt} mois prépayés lors de la signature du contrat`,
          });

        if (paiementError) throw paiementError;
      }

      // 3. Update bien status
      const { error: bienError } = await supabase
        .from("biens")
        .update({ statut: "occupe" })
        .eq("id", bienId);
      if (bienError) throw bienError;

      // 4. Send welcome SMS
      if (sendSms && telephone) {
        const smsSent = await envoyerSmsBienvenue(
          telephone,
          nom,
          cautionFCFA,
          parseInt(avanceMois) || 0,
          parseFloat(loyerMensuel)
        );
        if (!smsSent) {
          console.error("Failed to send welcome SMS");
          // Optional: we can display a toast but the contract is already created
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrats"] });
      queryClient.invalidateQueries({ queryKey: ["contrats-actifs"] });
      queryClient.invalidateQueries({ queryKey: ["locataires"] });
      queryClient.invalidateQueries({ queryKey: ["biens"] });
      queryClient.invalidateQueries({ queryKey: ["biens-disponibles"] });
      queryClient.invalidateQueries({ queryKey: ["proprietaire-biens"] });
      queryClient.invalidateQueries({ queryKey: ["etat-parc"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["paiements"] });
      toast.success("Contrat créé avec succès");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setStep(1);
    setNom("");
    setTelephone("");
    setEmail("");
    setAdresse("");
    setPieceIdentite("");
    setBienId("");
    setDateDebut(new Date());
    setLoyerMensuel("");
    setCautionMois("");
    setGarantieMois("");
    setAvanceMois("0");
    setSendSms(true);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!bienId) {
        toast.error("Veuillez sélectionner un bien");
        return;
      }
      if (!cautionMois) {
        toast.error("Veuillez définir la caution");
        return;
      }
      setStep(2);
    } else {
      if (!nom || !telephone) {
        toast.error("Veuillez remplir les informations obligatoires du locataire");
        return;
      }
      createMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau contrat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau Contrat - Étape {step}/2</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Détails du contrat" : "Informations du locataire"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="bien">Bien *</Label>
                <Select value={bienId} onValueChange={(value) => {
                  setBienId(value);
                  const selectedBien = biensDisponibles?.find(b => b.id === value);
                  if (selectedBien) {
                    setLoyerMensuel(selectedBien.loyer_mensuel.toString());
                  }
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={biensDisponibles && biensDisponibles.length > 0 ? "Sélectionner un bien disponible" : "Aucun bien disponible"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {biensDisponibles && biensDisponibles.length > 0 ? (
                      biensDisponibles.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="cursor-pointer hover:bg-accent">
                          {b.nom} - {b.loyer_mensuel.toLocaleString()} FCFA/mois
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        Aucun bien disponible. Veuillez d'abord ajouter des biens.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date de début *</Label>
                <DatePicker
                  date={dateDebut}
                  onSelect={setDateDebut}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loyer">Loyer mensuel (FCFA) *</Label>
                <Input
                  id="loyer"
                  type="number"
                  step="0.01"
                  value={loyerMensuel}
                  readOnly
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caution">Caution (nombre de mois) *</Label>
                <Input
                  id="caution"
                  type="number"
                  min="0"
                  value={cautionMois}
                  onChange={(e) => setCautionMois(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="garantie">Garantie (nombre de mois)</Label>
                <Input
                  id="garantie"
                  type="number"
                  min="0"
                  value={garantieMois}
                  onChange={(e) => setGarantieMois(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avance">Mois d'avance prepayés</Label>
                <Input
                  id="avance"
                  type="number"
                  value={avanceMois}
                  onChange={(e) => setAvanceMois(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t mt-4">
              <Label className="text-sm font-medium">
                Envoyer un SMS de bienvenue au locataire
              </Label>
              <RadioGroup
                defaultValue="oui"
                onValueChange={(value) => setSendSms(value === "oui")}
                className="flex items-center space-x-6"
                value={sendSms ? "oui" : "non"}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oui" id="sms-oui" />
                  <Label htmlFor="sms-oui" className="cursor-pointer">Oui</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non" id="sms-non" />
                  <Label htmlFor="sms-non" className="cursor-pointer">Non</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
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
              <Label htmlFor="piece">Pièce d'identité</Label>
              <Input id="piece" value={pieceIdentite} onChange={(e) => setPieceIdentite(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2">
          {step === 2 && (
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Précédent
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleNext} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Création..." : step === 1 ? "Suivant" : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
