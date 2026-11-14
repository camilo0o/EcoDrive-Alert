import { Logo } from "@/components/brand/logo";
import LogoutButton from "../logout-button";

type DashboardHeaderProps = { userName: string; onLoggedOut: () => void };

export function DashboardHeader({ userName, onLoggedOut }: DashboardHeaderProps) {
  const initial = userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="flex h-14 items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 px-3 shadow-lg backdrop-blur-md sm:h-16 sm:px-5">
      {/* Logueado, el logo lleva al panel y no a la portada pública. */}
      <Logo compactOnMobile href="/dashboard" />
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="hidden size-9 place-items-center rounded-full bg-brand-tint text-base font-semibold text-brand sm:grid"
          >
            {initial}
          </span>
          <span className="sr-only sm:not-sr-only sm:max-w-40 sm:truncate sm:text-base sm:font-semibold sm:text-brand-strong">
            {userName}
          </span>
        </div>
        <span aria-hidden="true" className="h-6 w-px bg-line" />
        <LogoutButton onLoggedOut={onLoggedOut} />
      </div>
    </header>
  );
}
