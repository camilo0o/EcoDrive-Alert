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
        <button className="min-h-[38px] rounded-[11px] border border-[#dce5df] bg-white px-[13px] text-xs font-bold text-[#20534a] hover:bg-[#f0f6f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287568]" onClick={logout}>
            Cerrar sesión
        </button>
    );
}