import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type FormMessageProps = {
  tone?: "error" | "success";
  className?: string;
  children: ReactNode;
};

/** Mensaje de error o éxito; usa role para que los lectores de pantalla lo anuncien. */
export function FormMessage({ tone = "error", className, children }: FormMessageProps) {
  const isError = tone === "error";
  return (
    <p
      className={cn(
        "rounded-lg px-3 py-2.5 text-sm",
        isError ? "bg-danger-tint text-danger" : "bg-brand-tint text-brand",
        className,
      )}
      role={isError ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
