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
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "bg-brand text-white shadow-[0_8px_22px_rgba(12,110,93,.19)] hover:bg-brand-dark",
        variant === "secondary" && "border border-line bg-white text-ink hover:border-[#b9ccc5] hover:bg-surface-muted",
        variant === "ghost" && "text-ink-soft hover:bg-surface-muted hover:text-ink",
        variant === "danger" && "bg-[#fff0ef] text-[#a6383b] hover:bg-[#ffe4e2]",
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
