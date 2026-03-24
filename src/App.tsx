import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Biens from "./pages/Biens";
import Proprietaires from "./pages/Proprietaires";
import Locataires from "./pages/Locataires";
import Paiements from "./pages/Paiements";
import Depenses from "./pages/Depenses";
import Notifications from "./pages/Notifications";
import Rapports from "./pages/Rapports";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import EtatParc from "./pages/EtatParc";
import DebugData from "./pages/DebugData";
import Arrieres from "./pages/Arrieres";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useEffect } from "react";
import { verifierEtEnvoyerRappels } from "@/services/smsService";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

const App = () => {
  // Vérifier les rappels SMS au chargement de l'app (uniquement après le 10 du mois)
  useEffect(() => {
    const checkSmsReminders = async () => {
      const aujourdhui = new Date();
      const jour = aujourdhui.getDate();
      const currentMonthStr = aujourdhui.toISOString().slice(0, 7); // Ex: "2026-02"
      const lastCheckMonth = localStorage.getItem('sms_reminder_last_check_month');

      // Ne vérifier que le 07 ou le 08 de chaque mois
      // Vérification unique par mois (pour éviter un déclenchement tardif si le cache était vidé)
      const allowedDays = jour === 7 || jour === 8;

      if (allowedDays && lastCheckMonth !== currentMonthStr) {
        console.log("Vérification mensuelle des rappels SMS...");
        // Marquer comme vérifié AVANT l'exécution pour bloquer les autres onglets immédiatement
        localStorage.setItem('sms_reminder_last_check_month', currentMonthStr);

        try {
          const result = await verifierEtEnvoyerRappels();
          console.log(`Rappels SMS: ${result.envoyes}/${result.total} envoyés, ${result.erreurs} erreurs`);
        } catch (error) {
          console.error("Erreur durant la vérification des rappels:", error);
          // En cas d'erreur critique, peut-être retirer le flag ? 
          // localStorage.removeItem('sms_reminder_last_check_month');
        }
      } else {
        if (!allowedDays) {
          console.log("Les rappels SMS ne sont envoyés que le 07 ou 08 du mois, vérification ignorée.");
        } else {
          console.log(`Rappels SMS déjà vérifiés pour ce mois (${currentMonthStr}).`);
        }
      }
    };

    // Attendre 2 secondes après le chargement pour ne pas bloquer l'UI
    const timer = setTimeout(checkSmsReminders, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <div className="flex min-h-screen bg-muted/20">
                      {/* Sidebar fixes on left for lg screens */}
                      <div className="hidden lg:block w-[280px] fixed inset-y-0 z-50">
                        <Sidebar />
                      </div>

                      {/* Main content shifted right based on sidebar width */}
                      <div className="flex-1 flex flex-col lg:pl-[280px] min-h-screen">
                        {/* Header only visible on mobile/tablet or used for breadcrumbs on desktop */}
                        <Header />

                        <main className="flex-1 p-6 sm:p-8 lg:p-10">
                          <div className="max-w-7xl mx-auto space-y-6">
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/biens" element={<Biens />} />
                              <Route path="/proprietaires" element={<Proprietaires />} />
                              <Route path="/locataires" element={<Locataires />} />
                              <Route path="/paiements" element={<Paiements />} />
                              <Route path="/depenses" element={<Depenses />} />
                              <Route path="/notifications" element={<Notifications />} />
                              <Route path="/rapports" element={<Rapports />} />
                              <Route path="/audit-logs" element={<AuditLogs />} />
                              <Route path="/etat-parc" element={<EtatParc />} />
                              <Route path="/arrieres" element={<Arrieres />} />
                              <Route path="/debug-data" element={<DebugData />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </div>
                        </main>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
