import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell, Search, CheckCircle2, Mail, Smartphone, MessageSquare,
  AlertCircle, RotateCcw, BellOff, Send
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { verifierEtEnvoyerRappels, relancerEchecsSms } from "@/services/smsService";
import { cn } from "@/lib/utils";

const Notifications = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, locataires(nom, telephone)")
        .order("date_envoi", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const checkOverdueRents = useMutation({
    mutationFn: async () => await verifierEtEnvoyerRappels(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`Traitement terminé : ${data.envoyes} envoyé(s), ${data.erreurs} erreur(s), ${data.deja_traites} déjà traités.`);
    },
    onError: (error: any) => toast.error(`Erreur: ${error.message}`),
  });

  const retryFailed = useMutation({
    mutationFn: async () => await relancerEchecsSms(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`Relance terminée : ${data.relances} envoyé(s), ${data.erreurs} toujours en erreur.`);
    },
    onError: (error: any) => toast.error(`Erreur lors de la relance: ${error.message}`),
  });

  const markAsReceived = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("notifications")
        .update({ date_reception: new Date().toISOString(), statut: "recu" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSelectedNotif(null);
      toast.success("Notification marquée comme reçue");
    },
    onError: (error: any) => toast.error(`Erreur: ${error.message}`),
  });

  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { value: format(date, "yyyy-MM"), label: format(date, "MMMM yyyy", { locale: fr }) };
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredNotifications = (notifications ?? []).filter((n) => {
    const notifDate = new Date(n.date_envoi);
    const inMonth = format(notifDate, "yyyy-MM") === selectedMonth;
    if (!inMonth) return false;
    if (!normalizedQuery) return true;
    const locataireNom = (n.locataires?.nom ?? "").toLowerCase();
    const message = (n.message ?? "").toLowerCase();
    return locataireNom.includes(normalizedQuery) || message.includes(normalizedQuery);
  });

  const stats = {
    total: notifications?.length || 0,
    envoyes: notifications?.filter((n) => n.statut === "envoye").length || 0,
    erreurs: notifications?.filter((n) => n.statut === "erreur").length || 0,
  };

  const getStatutConfig = (statut: string, hasReception: boolean) => {
    if (statut === "recu" || hasReception) return { label: "Reçu", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    if (statut === "envoye") return { label: "Envoyé", className: "bg-sky-50 text-sky-700 border-sky-100" };
    if (statut === "en_attente") return { label: "En attente", className: "bg-amber-50 text-amber-700 border-amber-100" };
    if (statut === "erreur") return { label: "Erreur", className: "bg-rose-50 text-rose-700 border-rose-100" };
    return { label: statut, className: "bg-slate-50 text-slate-600 border-slate-100" };
  };

  const getCanalIcon = (canal: string) => {
    const cls = "h-4 w-4 text-slate-500";
    if (canal === "email") return <Mail className={cls} strokeWidth={1.5} />;
    if (canal === "sms") return <Smartphone className={cls} strokeWidth={1.5} />;
    if (canal === "whatsapp") return <MessageSquare className={cls} strokeWidth={1.5} />;
    return <Bell className={cls} strokeWidth={1.5} />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-semibold text-foreground tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            Suivi des rappels et alertes envoyés aux locataires
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => retryFailed.mutate()}
            disabled={retryFailed.isPending}
            className="gap-2"
          >
            <RotateCcw className={cn("h-4 w-4", retryFailed.isPending && "animate-spin")} strokeWidth={1.5} />
            Relancer les échecs
          </Button>
          <Button
            size="sm"
            onClick={() => checkOverdueRents.mutate()}
            disabled={checkOverdueRents.isPending}
            className="gap-2"
          >
            <Send className={cn("h-4 w-4", checkOverdueRents.isPending && "animate-spin")} strokeWidth={1.5} />
            {checkOverdueRents.isPending ? "Vérification..." : "Vérifier maintenant"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total envoyées", value: stats.total, color: "text-foreground" },
          { label: "Envoyées avec succès", value: stats.envoyes, color: "text-sky-600" },
          { label: "Erreurs d'envoi", value: stats.erreurs, color: stats.erreurs > 0 ? "text-rose-600" : "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#f4f6f8]/80 rounded-2xl p-5 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            <span className={cn("text-3xl font-extrabold tracking-tight", s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          <Input
            placeholder="Rechercher un locataire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/60 border-border/40 rounded-xl h-10 focus:bg-white transition-colors"
          />
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px] rounded-xl h-10 bg-white/60 border-border/40 focus:bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Notification Feed */}
      <div className="bg-white/60 rounded-2xl border border-white/70 overflow-hidden shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)]">
        {/* Feed header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
            <Bell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            Historique des notifications
          </div>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="divide-y divide-border/30">
            {filteredNotifications.map((notif) => {
              const statutConfig = getStatutConfig(notif.statut, !!notif.date_reception);
              return (
                <button
                  key={notif.id}
                  onClick={() => setSelectedNotif(notif)}
                  className="w-full flex items-start gap-4 px-6 py-4 hover:bg-muted/20 transition-colors text-left group"
                >
                  {/* Canal Icon */}
                  <div className="mt-0.5 h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
                    {getCanalIcon(notif.canal_envoi || "systeme")}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-foreground">
                        {notif.locataires?.nom || "N/A"}
                      </span>
                      <span className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded-full border",
                        statutConfig.className
                      )}>
                        {statutConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate max-w-lg">
                      {notif.message}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-muted-foreground/70 whitespace-nowrap mt-1 flex-shrink-0">
                    {new Date(notif.date_envoi).toLocaleDateString("fr-FR", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
              <BellOff className="h-6 w-6 text-slate-400" strokeWidth={1.25} />
            </div>
            <h3 className="text-base font-semibold text-foreground">Aucune notification</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Aucune notification trouvée pour ce mois ou cette recherche.
            </p>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-[#f4f6f8]/60 rounded-2xl p-5 border border-border/20">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Comment ça fonctionne</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            "Vérification automatique des loyers en retard chaque jour",
            "Un délai de grâce de 5 jours est accordé après le début du mois",
            "Une seule notification par mois par locataire en retard",
            "Vous pouvez lancer une vérification manuelle à tout moment",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" strokeWidth={1.5} />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedNotif} onOpenChange={() => setSelectedNotif(null)}>
        <DialogContent className="max-w-md rounded-2xl border-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Détails de la notification</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Message complet et informations d'envoi
            </DialogDescription>
          </DialogHeader>
          {selectedNotif && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Locataire", value: selectedNotif.locataires?.nom || "N/A" },
                  { label: "Canal", value: <span className="capitalize">{selectedNotif.canal_envoi || "Système"}</span> },
                  { label: "Date d'envoi", value: new Date(selectedNotif.date_envoi).toLocaleString("fr-FR") },
                  { label: "Statut", value: (() => { const c = getStatutConfig(selectedNotif.statut, !!selectedNotif.date_reception); return <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", c.className)}>{c.label}</span>; })() },
                ].map((field) => (
                  <div key={field.label} className="bg-[#f4f6f8]/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{field.label}</p>
                    <p className="text-sm font-medium text-foreground">{field.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#f4f6f8]/80 rounded-xl p-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Message</p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedNotif.message}
                </p>
              </div>

              {selectedNotif.date_reception && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-emerald-700">
                      Reçu le {new Date(selectedNotif.date_reception).toLocaleString("fr-FR")}
                    </p>
                    {selectedNotif.recu_par && (
                      <p className="text-xs text-emerald-600">Par : {selectedNotif.recu_par}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedNotif(null)}>
              Fermer
            </Button>
            {selectedNotif && !selectedNotif.date_reception && (
              <Button
                onClick={() => markAsReceived.mutate({ id: selectedNotif.id })}
                disabled={markAsReceived.isPending}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                Marquer comme reçu
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;
