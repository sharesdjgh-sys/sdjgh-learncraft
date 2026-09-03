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
        "inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[11px] font-semibold transition-[transform,box-shadow,border-color,background-color,color] duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:active:scale-100 motion-reduce:hover:transform-none",
        variant === "primary" && "border border-brand/20 bg-[linear-gradient(135deg,#ffffff_0%,#f0edff_48%,#e8e2ff_100%)] text-brand-dark shadow-[0_7px_18px_rgba(86,58,194,.14),inset_0_1px_0_rgba(255,255,255,.9)] hover:border-brand/35 hover:bg-[linear-gradient(135deg,#ffffff_0%,#ebe6ff_45%,#ddd5ff_100%)] hover:text-[#3f27aa] hover:shadow-[0_11px_24px_rgba(86,58,194,.2),inset_0_1px_0_rgba(255,255,255,.95)]",
        variant === "secondary" && "border border-line bg-white text-ink-2 shadow-[var(--lift-1)] hover:border-brand/20 hover:bg-brand-page hover:text-brand-dark hover:shadow-[0_7px_18px_rgba(65,55,120,.1)]",
        variant === "ghost" && "border border-transparent text-ink-3 shadow-none hover:border-brand/10 hover:bg-brand-page hover:text-brand-dark",
        variant === "danger" && "border border-danger/15 bg-[linear-gradient(135deg,#fff_0%,var(--danger-page)_100%)] text-danger shadow-[0_4px_12px_rgba(183,70,87,.08)] hover:border-danger/30 hover:bg-[var(--danger-page)] hover:shadow-[0_8px_18px_rgba(183,70,87,.13)]",
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
