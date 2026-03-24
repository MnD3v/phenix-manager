import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  CreditCard,
  Receipt,
  Bell,
  FileText,
  Shield,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavigationProps {
  mobile?: boolean;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/biens", icon: Building2, label: "Biens" },
  { to: "/proprietaires", icon: Users, label: "Propriétaires" },
  { to: "/locataires", icon: UserCheck, label: "Locataires" },
  // { to: "/paiements", icon: CreditCard, label: "Paiements" },
  // { to: "/depenses", icon: Receipt, label: "Dépenses" },
  // { to: "/notifications", icon: Bell, label: "Notifications" },
  // { to: "/rapports", icon: FileText, label: "Rapports" },
  // { to: "/audit-logs", icon: Shield, label: "Audit" },
];

export const Navigation = ({ mobile }: NavigationProps) => {
  if (mobile) {
    return (
      <nav className="flex flex-col space-y-2 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 w-full active:scale-95 hover:translate-x-1"
              )}
              activeClassName="text-primary-foreground bg-white/20 shadow-sm font-semibold hover:bg-white/20 hover:translate-x-0"
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    );
  }

  // Multi-breakpoint Responsive strategy
  const alwaysVisibleItems = navItems.slice(0, 4); // Visibles des LG (~1024px)
  const xlVisibleItems = navItems.slice(4, 6);     // Visibles en plus des XL (~1280px)
  const xxlVisibleItems = navItems.slice(6, 9);    // Visibles en plus des 2XL (~1536px)

  const renderMainItem = (item: typeof navItems[0], displayClass: string) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={cn(
          displayClass,
          "items-center gap-1.5 px-2 lg:px-3 lg:py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0",
          "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10",
          "hover:scale-105 active:scale-95"
        )}
        activeClassName="text-primary bg-white shadow-sm font-semibold hover:bg-white"
      >
        <Icon className="h-4 w-4" />
        <span className="leading-none">{item.label}</span>
      </NavLink>
    );
  };

  const renderDropdownItem = (item: typeof navItems[0], hiddenClass: string = "") => {
    const Icon = item.icon;
    return (
      <DropdownMenuItem key={item.to} asChild className={cn(hiddenClass, "cursor-pointer focus:bg-accent/20 p-0 mb-1 last:mb-0 rounded-md")}>
        <NavLink
          to={item.to}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium text-foreground/80 rounded-md transition-all hover:text-primary"
          activeClassName="text-primary bg-accent/15 font-semibold"
        >
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </NavLink>
      </DropdownMenuItem>
    );
  };

  return (
    <nav className="flex items-center justify-start xl:justify-center gap-1 xl:gap-2 w-full">
      {alwaysVisibleItems.map(item => renderMainItem(item, "flex"))}
      {xlVisibleItems.map(item => renderMainItem(item, "hidden xl:flex"))}
      {xxlVisibleItems.map(item => renderMainItem(item, "hidden 2xl:flex"))}

      {/* Bouton "Plus..." via Dropdown pour ecrans n'ayant pas atteint 2xl */}
      <div className="flex 2xl:hidden items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex-shrink-0 outline-none",
              "text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10",
              "hover:scale-105 active:scale-95"
            )}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="leading-none">Plus</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 bg-white rounded-xl shadow-lg border border-border p-1.5 focus:outline-none focus:ring-0">
            {/* Ces items passent de Dropdown a Main quand l'ecran devient xl */}
            {xlVisibleItems.map(item => renderDropdownItem(item, "xl:hidden"))}
            {/* Ces items restent dans le Dropdown jusqu'a ce que l'ecran soit 2xl */}
            {xxlVisibleItems.map(item => renderDropdownItem(item, ""))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};
