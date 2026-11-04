"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LogoutButton({ onLoggedOut }: { onLoggedOut: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("No se pudo cerrar la sesión.");
      onLoggedOut();
      router.push("/login");
      router.refresh();
    } catch (logoutError) {
      console.error(logoutError);
    } finally {
      // Con cacheComponents, Next conserva el estado del dashboard al navegar
      // (lo oculta con <Activity> en vez de desmontarlo). Si no reseteamos acá,
      // al volver a entrar el botón aparece deshabilitado.
      setLoading(false);
    }
  }

  return (
    <Button disabled={loading} onClick={() => void logout()} size="sm" variant="ghost">
      <LogOut aria-hidden="true" size={16} />
      {loading ? "Saliendo…" : "Cerrar sesión"}
    </Button>
  );
}
