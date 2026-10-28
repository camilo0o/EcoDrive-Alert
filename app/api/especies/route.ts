import z from "zod";
import { connection, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { buscarEspecies } from "@/lib/services/especie.service";

const querySchema = z.object({
    q: z.string().trim().max(60).optional()
});

export async function GET(request:Request){
    await connection();
    const auth = await requireUser();

    if(!auth.ok) return auth.response;

    const{ searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ q: searchParams.get("q") ?? undefined });
    if(!parsed.success){
        return NextResponse.json({error: "Parámetro q invalido"}, { status: 400 });
    }

    try{
        const especies = await buscarEspecies(parsed.data.q || undefined);
        return NextResponse.json({ especies });
    }catch (error){
        console.error("Error listando especies:", error);
        return NextResponse.json({ error: "No se pudieron obtener las especies." }, { status: 500 });
    }
}