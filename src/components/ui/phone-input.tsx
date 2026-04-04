import * as React from "react";
import { IMaskInput } from "react-imask";
import { cn } from "@/lib/utils";

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  /** The formatted (masked) value, e.g. "(11) 99999-8888" */
  value: string;
  /** Called with the formatted (masked) value and unmasked digits on change */
  onAccept: (value: string, unmaskedValue: string) => void;
}

/**
 * Masked phone input for Brazilian numbers.
 * Format: (00) 00000-0000
 * Stores the raw unmasked digits internally but displays formatted.
 */
const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onAccept, placeholder = "(00) 00000-0000", ...props }, ref) => {
    return (
      <IMaskInput
        mask="(00) 00000-0000"
        value={value}
        unmask={false}
        onAccept={(val: string) => {
          const unmasked = val.replace(/\D/g, "");
          onAccept(val, unmasked);
        }}
        placeholder={placeholder}
        inputRef={ref as React.Ref<HTMLInputElement>}
        className={cn(
          "flex h-10 w-full rounded-[10px] border border-white/[0.08] bg-background px-4 py-[11px] text-sm text-foreground ring-offset-background transition-all duration-200",
          "shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]",
          "placeholder:text-muted-foreground/60",
          "hover:border-white/[0.12]",
          "focus-visible:outline-none focus-visible:border-cosmos-indigo focus-visible:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3),0_0_0_3px_rgba(99,102,241,0.1),0_0_16px_rgba(99,102,241,0.08)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
