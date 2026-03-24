import { Menu, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Navigation } from "./Navigation";
import logo from "@/assets/logo-phenix.png";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Header = () => {
  const { user, role, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white lg:bg-transparent lg:border-none">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between px-3 sm:px-4 lg:px-8 gap-3">

          {/* Logo et Menu Burger (Mobile seulement) */}
          <div className="flex lg:hidden items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <Sheet>
              <SheetTrigger asChild className="lg:hidden flex-shrink-0 mr-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 bg-sidebar border-r-0">
                <div className="flex h-16 items-center px-6 border-b border-sidebar-border bg-white mb-4">
                  <div className="flex items-center gap-3">
                    <img src={logo} alt="Phenix Immobilier" className="h-10 w-auto rounded-lg shadow-sm" />
                    <h1 className="text-xl font-bold text-foreground">PHENIX</h1>
                  </div>
                </div>
                <div className="px-3">
                  <Navigation mobile />
                </div>
              </SheetContent>
            </Sheet>

            <img
              src={logo}
              alt="Phenix Immobilier"
              className="h-8 sm:h-10 w-auto rounded-lg shadow-sm bg-white"
            />
          </div>

          <div className="hidden lg:flex flex-1">
            {/* Espace libre pour un Breadcrumb ou Titre contextuel futur sur desktop */}
          </div>

          {/* Profil et actions */}
          <div className="flex items-center gap-2 flex-shrink-0 lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-sidebar-border hover:bg-sidebar-accent">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {user?.email?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Compte</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs font-semibold text-primary mt-1 capitalize">
                      {role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Se déconnecter</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </div>
    </header>
  );
};
