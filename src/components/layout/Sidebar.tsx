import { NavLink } from "@/components/NavLink";
import {
  Home,
  Building,
  UsersRound,
  UserCheck,
  Wallet,
  ReceiptText,
  BellRing,
  FileSpreadsheet,
  ShieldCheck,
  Briefcase,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-phenix.png";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const navGroups = [
  {
    title: "Application",
    items: [
      { to: "/", icon: Home, label: "Tableau de bord" },
      { to: "/notifications", icon: BellRing, label: "Notifications" },
    ]
  },
  {
    title: "Gestion",
    items: [
      { to: "/biens", icon: Building, label: "Biens" },
      { to: "/proprietaires", icon: UsersRound, label: "Propriétaires" },
      { to: "/locataires", icon: UserCheck, label: "Locataires" },
    ]
  },
  {
    title: "Finances",
    items: [
      { to: "/paiements", icon: Wallet, label: "Paiements" },
      { to: "/depenses", icon: ReceiptText, label: "Dépenses" },
    ]
  },
  {
    title: "Services",
    items: [
      { to: "/services", icon: Briefcase, label: "Autres Services" },
    ]
  },
  {
    title: "Système",
    items: [
      { to: "/rapports", icon: FileSpreadsheet, label: "Rapports" },
      { to: "/audit-logs", icon: ShieldCheck, label: "Audit" },
    ]
  }
];

export const Sidebar = () => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-[260px] h-full">
      <div className="flex flex-col h-full bg-primary backdrop-blur-md shadow-[4px_0_24px_-10px_rgba(0,0,0,0.1)] border-r border-primary/50 overflow-hidden">
        <div className="flex h-20 items-center px-6 shrink-0 bg-transparent mb-2">
          <div className="flex items-center gap-3 w-full mt-2">
            <img
              src={logo}
              alt="Phenix Immobilier"
              className="h-8 w-auto rounded-lg bg-white p-1"
            />
            <h1 className="text-xl font-bold text-primary-foreground tracking-tight">
              PHENIX
            </h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-2 pb-6 px-4 flex flex-col gap-8 w-full bg-transparent scrollbar-hide">
          {navGroups.map((group, index) => (
            <div key={index} className="flex flex-col gap-2">
              <h3 className="px-3 text-[13px] font-medium text-primary-foreground/60 mb-1">
                {group.title}
              </h3>
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3.5 px-3 py-2.5 text-[15px] font-normal rounded-xl transition-all duration-300",
                        "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 hover:translate-x-1"
                      )}
                      activeClassName="text-primary-foreground bg-white/20 font-semibold hover:bg-white/20 hover:translate-x-0"
                    >
                      <Icon className="h-[20px] w-[20px] flex-shrink-0" strokeWidth={1.25} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="p-4 bg-transparent w-full">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-start gap-3.5 px-3 py-2.5 text-[15px] font-normal text-primary-foreground/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
              >
                <LogOut className="h-[20px] w-[20px]" strokeWidth={1.25} />
                <span>Déconnexion</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold">
                  Confirmer la déconnexion
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Vous allez être déconnecté de votre session. Voulez-vous continuer ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="rounded-xl border-[1.5px]">
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSignOut}
                  className="rounded-xl bg-destructive text-destructive-foreground hover:brightness-105 shadow-[0_2px_0px_0px_hsl(var(--destructive)/0.4),0_4px_12px_0px_hsl(var(--destructive)/0.2)]"
                >
                  Se déconnecter
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </aside>
  );
};
