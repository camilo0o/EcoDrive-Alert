"use client";

import { loginSchema } from "@/lib/auth/schemas";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      const data: { error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se pudo iniciar sesión.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error enviando login:", error);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold">Iniciar sesión</h1>
      {searchParams.get("registered") === "1" && (
        <p role="status">Cuenta creada. Ahora inicia sesión.</p>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          Email
          <input
            className="rounded border p-2"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          Contraseña
          <input
            className="rounded border p-2"
            name="contrasenia"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p role="alert">{error}</p>}

        <button
          className="rounded bg-black p-3 text-white disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
      <p className="mt-4">
        ¿No tienes cuenta? <Link href="/register">Crear cuenta</Link>
      </p>
    </main>
  );
}
