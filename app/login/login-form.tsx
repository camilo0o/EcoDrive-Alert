"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { loginSchema } from "@/lib/auth/schemas";
import { postJson } from "@/lib/http/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({
      email: formData.get("email"),
      contrasenia: formData.get("contrasenia"),
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }

    setLoading(true);
    try {
      await postJson("/api/auth/login", result.data, "No se pudo iniciar sesión.");
      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      description="Ingresa para ver y reportar avistamientos en las rutas."
      footer={{ text: "¿No tienes cuenta?", linkLabel: "Crear cuenta", href: "/register" }}
      title="Iniciar sesión"
    >
      {searchParams.get("registered") === "1" && (
        <FormMessage className="mb-6" tone="success">Cuenta creada. Ahora inicia sesión.</FormMessage>
      )}
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <Field label="Email">
          <Input autoComplete="email" name="email" required type="email" />
        </Field>
        <Field label="Contraseña">
          <Input autoComplete="current-password" name="contrasenia" required type="password" />
        </Field>
        {error && <FormMessage>{error}</FormMessage>}
        <Button className="mt-1 w-full" disabled={loading} size="lg" type="submit">
          {loading ? "Ingresando…" : "Iniciar sesión"}
        </Button>
      </form>
    </AuthShell>
  );
}
