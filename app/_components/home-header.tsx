import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonStyles, focusRing } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function HomeHeader() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-brand/10">
      <Logo compactOnMobile />
      <nav aria-label="Navegación principal" className="flex items-center gap-2 sm:gap-6">
        <Link
          className={cn("whitespace-nowrap rounded-md px-2 py-1 text-sm font-semibold text-brand underline-offset-4 hover:text-brand-accent hover:underline sm:text-base", focusRing)}
          href="/login"
        >
          Iniciar sesión
        </Link>
        <Link className={buttonStyles({ size: "sm", className: "sm:h-11 sm:px-5 sm:text-base" })} href="/register">
          Crear cuenta
        </Link>
      </nav>
    </header>
  );
}
