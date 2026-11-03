import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "border border-line-strong bg-white text-brand hover:bg-surface-hover",
  ghost: "text-brand hover:bg-surface-hover",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-6 text-base",
};

/** Clases de botón reutilizables también en <Link>. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], focusRing, className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button className={buttonStyles({ variant, size, className })} type={type} {...props} />;
}
