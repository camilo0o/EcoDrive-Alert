import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils/cn";

// text-base (16px) evita que Safari en iOS haga zoom al enfocar el campo.
const controlStyles =
  "w-full rounded-lg border border-line-input bg-surface-input px-3 text-base text-ink outline-none transition-colors placeholder:text-faint focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";

type FieldProps = {
  label: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/** Etiqueta + control. El <label> envuelve al control, así queda asociado sin ids. */
export function Field({ label, required, className, children }: FieldProps) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-sm font-semibold text-brand-strong">
        {label}
        {required && <span aria-hidden="true" className="text-danger-required"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlStyles, "h-11", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlStyles, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlStyles, "min-h-24 resize-y py-2.5", className)} {...props} />;
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="flex items-center gap-3 text-base text-brand-strong">
      <input className="size-4 accent-brand" type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
