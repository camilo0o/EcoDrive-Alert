import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { focusRing } from "@/components/ui/button";

type LogoProps = { compactOnMobile?: boolean; href?: string };

/** Logo con link. En pantallas chicas puede mostrarse solo el ícono. */
export function Logo({ compactOnMobile = false, href = "/" }: LogoProps) {
  return (
    <Link
      aria-label="Fauna en Ruta, inicio"
      className={cn("inline-flex items-center gap-3 rounded-lg text-xl font-bold tracking-tight text-brand-strong", focusRing)}
      href={href}
    >
      <span aria-hidden="true" className="grid size-9 place-items-center rounded-[12px_12px_12px_4px] bg-brand text-lg text-white">
        F
      </span>
      <span className={cn(compactOnMobile && "hidden sm:inline")}>
        Fauna <span className="font-medium">en Ruta</span>
      </span>
    </Link>
  );
}
