import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/auth/schemas";
import { AuthError } from "@/lib/auth/auth.error";
import { registerUser } from "@/lib/services/auth.service";
export async function POST(req: Request) {
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