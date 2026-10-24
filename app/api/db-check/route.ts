import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";

export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return new Response(null, { status: 404 });
    }
    try{
        await connectDB();
        return NextResponse.json({ok: true, message: "Conexión a la base en MongoDB de datos exitosa"});
    }catch (error) {
       console.error("Error al conectar con MongoDB:", error);
        return NextResponse.json({ ok: false, message: "No se pudo conectar con MongoDB" }, { status: 500 });
    }
}