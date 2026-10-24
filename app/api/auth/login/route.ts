import { loginSchema } from "@/lib/auth/schemas";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { authenticateUser } from "@/lib/services/auth.service";
import { consumeRateLimit, getTrustedClientIp } from "@/lib/auth/rate-limit";
import { NextResponse } from "next/server";


export async function POST(request: Request) {
    try {
        const ipLimit = await consumeRateLimit(
            "login-ip",
            getTrustedClientIp(request),
            30,
            15 * 60,
        );
        if (!ipLimit.allowed) {
            return NextResponse.json(
                { error: "Demasiados intentos. Intenta nuevamente más tarde." },
                {
                    status: 429,
                    headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
                },
            );
        }
    } catch (error) {
        console.error("Error aplicando límite de inicio de sesión:", error);
        return NextResponse.json(
            { error: "No se pudo iniciar sesión." },
            { status: 500 },
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "El cuerpo debe ser JSON válido." },
            { status: 400 }
        );
    }

    const result = loginSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json(
            {
                error: "Datos de inicio de sesión inválidos.",
                issues: result.error.flatten().fieldErrors,
            },
            { status: 400 }
        );
    }
    try {
        const emailLimit = await consumeRateLimit(
            "login-email",
            result.data.email,
            10,
            15 * 60,
        );
        if (!emailLimit.allowed) {
            return NextResponse.json(
                { error: "Demasiados intentos. Intenta nuevamente más tarde." },
                {
                    status: 429,
                    headers: { "Retry-After": String(emailLimit.retryAfterSeconds) },
                },
            );
        }

        const user = await (authenticateUser(result.data));
        if (!user) {
            return NextResponse.json(
                { error: "Correo electrónico o contraseña incorrectos." },
                { status: 401 }
            );
        }

        const token = await createSessionToken(user.id);
        const response = NextResponse.json({ user });
        response.cookies.set(
            "session",
            token,
            sessionCookieOptions(),
        );

        return response;
    }catch (error) {
        console.error("Error iniciando sesión:", error);
        return NextResponse.json(
            { error: "No se pudo iniciar sesión." },
            { status: 500 }
        );
    }
}