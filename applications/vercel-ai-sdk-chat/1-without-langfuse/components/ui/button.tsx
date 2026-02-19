import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "default" | "sm" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-[var(--foreground)] text-white hover:bg-[color:var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  secondary:
    "bg-[color:var(--chip)] text-[var(--foreground)] hover:bg-[color:var(--border)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[color:var(--border-soft)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  outline:
    "border border-[var(--border)] bg-[color:var(--card-strong)] text-[var(--foreground)] hover:bg-[color:var(--border-soft)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  danger:
    "bg-[var(--foreground)] text-white hover:bg-[color:var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--foreground)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-9 px-3 text-xs",
  icon: "h-10 w-10",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };
