import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/auth/schemas";
import { AuthError } from "@/lib/auth/auth.error";
import { registerUser } from "@/lib/services/auth.service";
import { consumeRateLimit, getTrustedClientIp } from "@/lib/auth/rate-limit";
export async function POST(req: Request) {
    try {
        const limit = await consumeRateLimit(
            "register-ip",
            getTrustedClientIp(req),
            5,
            60 * 60,
        );
        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Demasiados intentos. Intenta nuevamente más tarde." },
                {
                    status: 429,
                    headers: { "Retry-After": String(limit.retryAfterSeconds) },
                },
            );
        }
    } catch (error) {
        console.error("Error aplicando límite de registro:", error);
        return NextResponse.json(
            { error: "No se pudo crear la cuenta." },
            { status: 500 },
        );
    }

    let body: unknown;
    try{
        body = await req.json();

    } catch {
        return NextResponse.json(
            { error: "El cuerpo debe ser JSON válido." },
            { status: 400 }
        );
    } 
    
    const result = registerSchema.safeParse(body);

    if (!result.success) {
        return NextResponse.json(
            {
                error: "Datos de registro inválidos.",
                issues: result.error.flatten().fieldErrors,
            },
            { status: 400 }
        );
    }

    try{
        const user = await registerUser(result.data);

        return NextResponse.json(
            { user },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json(
                { error: error.message },
                { status: 409 }
            );
        }

        console.error("Error registrando usuario:", error);
        return NextResponse.json(
            { error: "No se pudo crear la cuenta." },
            { status: 500 }
        );
    }
}