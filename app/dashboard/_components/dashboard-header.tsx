import { Logo } from "@/components/brand/logo";
import LogoutButton from "../logout-button";

export function DashboardHeader({ userName }: { userName: string }) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-brand/10">
      <Logo compactOnMobile />
      <div className="flex items-center gap-4">
        <span className="hidden text-base text-muted sm:inline">
          Hola, <strong className="font-semibold text-brand-strong">{userName}</strong>
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
