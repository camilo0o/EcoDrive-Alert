import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { focusRing } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { FeatureList } from "./_components/feature-list";
import { HomeHeader } from "./_components/home-header";
import { HomeHero } from "./_components/home-hero";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <HomeHeader />
      <HomeHero />
      <FeatureList />
      <footer className="flex flex-col gap-3 border-t border-brand/10 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Fauna en Ruta, Uruguay</span>
        <Link
          className={cn("inline-flex items-center gap-1.5 rounded-md text-base font-semibold text-brand underline-offset-4 hover:text-brand-accent hover:underline", focusRing)}
          href="/login"
        >
          Ingresar a mi cuenta <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </footer>
    </main>
  );
}
