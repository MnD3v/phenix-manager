import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CardColor = "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan" | "orange";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  color?: CardColor;
  badge?: { label: string; variant: "warning" | "success" | "info" };
  className?: string;
  onClick?: () => void;
}

const colorConfig: Record<CardColor, { title: string; iconBg: string; iconColor: string }> = {
  blue: { title: "text-blue-500", iconBg: "bg-blue-100", iconColor: "text-blue-500" },
  violet: { title: "text-violet-500", iconBg: "bg-violet-100", iconColor: "text-violet-500" },
  emerald: { title: "text-emerald-600", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  amber: { title: "text-amber-500", iconBg: "bg-amber-100", iconColor: "text-amber-500" },
  rose: { title: "text-rose-500", iconBg: "bg-rose-100", iconColor: "text-rose-500" },
  cyan: { title: "text-cyan-600", iconBg: "bg-cyan-100", iconColor: "text-cyan-600" },
  orange: { title: "text-orange-500", iconBg: "bg-orange-100", iconColor: "text-orange-500" },
};

const badgeConfig = {
  warning: "bg-amber-100 text-amber-600",
  success: "bg-emerald-100 text-emerald-600",
  info: "bg-blue-100 text-blue-600",
};

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  description,
  color,
  badge,
  className,
  onClick,
}: StatsCardProps) => {
  const c = color ? colorConfig[color] : null;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-all duration-200",
        "flex flex-col gap-3",
        onClick && "cursor-pointer hover:shadow-md hover:border-gray-200 active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      {/* Top row: title + icon */}
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm font-semibold leading-tight", c ? c.title : "text-muted-foreground")}>
          {title}
        </p>
        {Icon && (
          <div className={cn("flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", c ? c.iconBg : "bg-muted")}>
            <Icon className={cn("h-5 w-5", c ? c.iconColor : "text-muted-foreground")} strokeWidth={1.75} />
          </div>
        )}
      </div>

      {/* Value */}
      <h3 className="text-3xl font-extrabold tracking-tight text-gray-900">
        {value}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs text-muted-foreground leading-snug">{description}</p>
      )}

      {/* Badge */}
      {badge && (
        <div className="mt-1">
          <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", badgeConfig[badge.variant])}>
            {badge.variant === "success" && <span>✓</span>}
            {badge.label}
          </span>
        </div>
      )}
    </div>
  );
};
