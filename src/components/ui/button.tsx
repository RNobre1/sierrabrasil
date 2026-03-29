import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[13.5px] font-semibold tracking-[0.01em] ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-cosmos-indigo via-cosmos-violet to-cosmos-lavender text-white shadow-[0_2px_8px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.4),0_0_40px_rgba(99,102,241,0.15)] hover:-translate-y-px active:translate-y-0 active:scale-[0.98] relative overflow-hidden",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-white/[0.08] bg-white/[0.05] backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/[0.12] text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-white/[0.04] hover:text-foreground text-muted-foreground",
        link: "text-cosmos-indigo underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-[22px] py-[10px]",
        sm: "h-9 rounded-[10px] px-4",
        lg: "h-11 rounded-[10px] px-8",
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
