import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-tight ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] active:shadow-none cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_2px_0px_0px_hsl(var(--primary)/0.4),0_4px_12px_0px_hsl(var(--primary)/0.2)] hover:brightness-105 hover:shadow-[0_4px_2px_0px_hsl(var(--primary)/0.3),0_6px_16px_0px_hsl(var(--primary)/0.25)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_2px_0px_0px_hsl(var(--destructive)/0.4),0_4px_12px_0px_hsl(var(--destructive)/0.2)] hover:brightness-105 hover:shadow-[0_4px_2px_0px_hsl(var(--destructive)/0.3),0_6px_16px_0px_hsl(var(--destructive)/0.25)]",
        outline:
          "border-[1.5px] border-border bg-background text-foreground shadow-[0_1px_3px_0px_rgba(0,0,0,0.06)] hover:bg-muted/60 hover:border-primary/40 hover:text-primary hover:shadow-[0_2px_8px_0px_rgba(0,0,0,0.08)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_2px_0px_0px_hsl(var(--secondary)/0.5),0_4px_12px_0px_hsl(var(--secondary)/0.2)] hover:brightness-105 hover:shadow-[0_4px_2px_0px_hsl(var(--secondary)/0.3),0_6px_16px_0px_hsl(var(--secondary)/0.25)]",
        ghost:
          "text-foreground/70 hover:text-foreground hover:bg-muted/60 hover:shadow-none",
        link: "text-primary underline-offset-4 hover:underline shadow-none",
        soft:
          "bg-primary/10 text-primary hover:bg-primary/15 shadow-none",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
