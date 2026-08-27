import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[11px] font-semibold transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "border border-brand bg-brand text-white shadow-[var(--lift-brand)] hover:-translate-y-0.5 hover:bg-brand-dark",
        variant === "secondary" && "border border-line bg-surface text-ink-2 shadow-[var(--lift-1)] hover:-translate-y-0.5 hover:border-[var(--line-2)] hover:bg-surface-2 hover:text-ink",
        variant === "ghost" && "text-ink-3 hover:bg-surface-3 hover:text-ink",
        variant === "danger" && "border border-danger/15 bg-[var(--danger-page)] text-danger hover:border-danger/25",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "md" && "min-h-11 px-4 text-sm",
        size === "lg" && "min-h-12 px-5 text-[0.95rem]",
        size === "icon" && "size-11 p-0",
        className,
      )}
      {...props}
    />
  );
}
