import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/auth.service";
import LogoutButton from "./logout-button";

export default function DashboardPage() {
    return (
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
            <h1 className="text-3xl font-bold">Panel de usuario</h1>
            <Suspense fallback={<p className="mt-4">Cargando sesión...</p>}>
                <DashboardContent />
            </Suspense>
        </main>
    );
}

async function DashboardContent() {
    const userId = await getSessionUserId();

    if (!userId) {
        redirect("/login");
    }

    const user = await getUserById(userId);

    if (!user) {
        redirect("/login");
    }
    return (
        <>
            <p className="mt-4">Sesión iniciada para {user.nombre}.</p>
            <LogoutButton />
        </>
    );
}