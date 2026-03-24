import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  description,
  className,
  onClick,
}: StatsCardProps) => {
  return (
    <div
      className={cn(
        "bg-[#f4f6f8]/80 backdrop-blur-sm rounded-3xl p-6 transition-all duration-300",
        "flex flex-col gap-4 border-none shadow-none hover:bg-black/[0.03]",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground/70">
          {Icon && <Icon className="h-[20px] w-[20px]" strokeWidth={1.25} />}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-3xl font-extrabold tracking-tight text-foreground/90">
          {value}
        </h3>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          {title}
        </p>
      </div>

      {description && (
        <div className="mt-auto pt-2 flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          {description}
        </div>
      )}
    </div>
  );
};
