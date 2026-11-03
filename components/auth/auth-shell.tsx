import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { RoadSign } from "@/components/brand/road-sign";
import { focusRing } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type AuthShellProps = {
  title: string;
  description: string;
  footer: { text: string; linkLabel: string; href: string };
  children: ReactNode;
};

/** Layout compartido por login y registro: formulario a la izquierda, señal a la derecha. */
export function AuthShell({ title, description, footer, children }: AuthShellProps) {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-5 py-6 sm:px-8 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col">
        <Logo />
        <div className="my-auto w-full max-w-md py-12">
          <h1 className="text-4xl font-bold tracking-[-0.04em] text-brand-strong">{title}</h1>
          <p className="mt-3 text-lg text-muted">{description}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-base text-muted">
            {footer.text}{" "}
            <Link
              className={cn("rounded font-semibold text-brand underline-offset-4 hover:text-brand-accent hover:underline", focusRing)}
              href={footer.href}
            >
              {footer.linkLabel}
            </Link>
          </p>
        </div>
      </div>
      <RoadSign className="hidden min-h-[36rem] lg:grid" />
    </main>
  );
}
