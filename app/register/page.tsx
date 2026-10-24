"use client";

import { registerFormSchema } from "@/lib/auth/schemas";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    
    async function handleSubmit(event: FormEvent<HTMLFormElement>){
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
            setError(result.error.issues[0]?.message ?? "Revisa los datos");
            return;
        }

        setLoading(true);

        try{
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json"},
                body: JSON.stringify({
                    nombre: result.data.nombre,
                    email: result.data.email,
                    contrasenia: result.data.contrasenia,
                }),
            });

            const data: { error?: string } = await response.json();

            if (!response.ok) {
                setError(data.error ?? "No se pudo crear la cuenta");
                return;
            }

            router.push("/login?registered=1");
        }catch (error) {
            console.error("Error enviando registro", error);
            setError("No se pudo conectar con el servidor.");
        }finally{
            setLoading(false);
        }
    }
    return(
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
            <h1 className="mb-6 text-3xl font-bold">Crear cuenta</h1>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} method="post">
                <label className="flex flex-col gap-1">
                    Nombre
                    <input className="rounded border p-2" name="nombre" required />
                </label>
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
                        autoComplete="new-password"
                        required
                    />
                </label>
                <label className="flex flex-col gap-1">
                    Confirmar contraseña
                    <input
                        className="rounded border p-2"
                        name="confirmacion"
                        type="password"
                        autoComplete="new-password"
                        required
                    />
                </label>

                {error && <p role="alert">{error}</p>}

                <button
                    className="rounded bg-black p-3 text-white disabled:opacity-50"
                    disabled={loading}
                    type="submit"
                >
                    {loading ? "Creando cuenta" : "Crear cuenta"}

                </button>
            </form>
            <p className="mt-4">
                ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
            </p>
        </main>
    );
}