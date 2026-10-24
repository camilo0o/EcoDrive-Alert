"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton(){
    const router = useRouter();

    async function logout(){
        const response = await fetch("/api/auth/logout", { method: "POST" });

        if (!response.ok) {
            throw new Error("No se pudo cerrar la sesión.");
        }

        router.push("/login");
        router.refresh();
    }
    return (
        <button className="mt-6 rounded border p-2" onClick={logout}>
            Cerrar sesión
        </button>
    );
}