import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[10px] border border-white/[0.08] bg-background px-4 py-[11px] text-sm text-foreground ring-offset-background transition-all duration-200",
          "shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]",
          "placeholder:text-muted-foreground/60",
          "hover:border-white/[0.12]",
          "focus-visible:outline-none focus-visible:border-cosmos-indigo focus-visible:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3),0_0_0_3px_rgba(99,102,241,0.1),0_0_16px_rgba(99,102,241,0.08)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
