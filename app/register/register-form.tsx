"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { registerFormSchema } from "@/lib/auth/schemas";
import { postJson } from "@/lib/http/client";

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const result = registerFormSchema.safeParse({
      nombre: formData.get("nombre"),
      email: formData.get("email"),
      contrasenia: formData.get("contrasenia"),
      confirmacion: formData.get("confirmacion"),
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }

    setLoading(true);
    try {
      const { nombre, email, contrasenia } = result.data;
      await postJson("/api/auth/register", { nombre, email, contrasenia }, "No se pudo crear la cuenta.");
      router.push("/login?registered=1");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      description="Súmate a la comunidad que reporta fauna en las rutas de Uruguay."
      footer={{ text: "¿Ya tienes cuenta?", linkLabel: "Inicia sesión", href: "/login" }}
      title="Crear cuenta"
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <Field label="Nombre">
          <Input autoComplete="name" name="nombre" required />
        </Field>
        <Field label="Email">
          <Input autoComplete="email" name="email" required type="email" />
        </Field>
        <Field label="Contraseña">
          <Input autoComplete="new-password" minLength={8} name="contrasenia" required type="password" />
        </Field>
        <Field label="Confirmar contraseña">
          <Input autoComplete="new-password" name="confirmacion" required type="password" />
        </Field>
        {error && <FormMessage>{error}</FormMessage>}
        <Button className="mt-1 w-full" disabled={loading} size="lg" type="submit">
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
    </AuthShell>
  );
}
