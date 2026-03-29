import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-cosmos-indigo/10 text-cosmos-indigo border border-cosmos-indigo/20 shadow-[0_0_8px_rgba(99,102,241,0.1)]",
        secondary: "bg-white/[0.06] text-muted-foreground border border-white/[0.06]",
        destructive: "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]",
        outline: "bg-transparent text-muted-foreground border border-white/[0.08]",
        success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]",
        warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
