import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import {
  iniciarTrayecto,
  obtenerTrayectoEnCurso,
  TrayectoEnCursoExistenteError,
} from "@/lib/services/trayecto.service";

const origenSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
}).strict();

const iniciarSchema = z.object({
  origen: origenSchema,
  destino: origenSchema,
  destinoNombre: z.string().trim().min(1).max(100),
  distanciaKm: z.number().finite().positive().max(2500),
  duracionEstimadaMin: z.number().int().positive().max(2880),
}).strict();

export async function GET() {
  await connection();
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const trayecto = await obtenerTrayectoEnCurso(auth.user.id);
    return NextResponse.json({ trayecto }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error consultando el trayecto activo:", error);
    return NextResponse.json({ error: "No se pudo consultar el trayecto activo." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await connection();
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo debe ser JSON válido." }, { status: 400 });
  }

  const parsed = iniciarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos del trayecto inválidos.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const trayecto = await iniciarTrayecto(parsed.data, auth.user.id);
    return NextResponse.json({ trayecto }, { status: 201 });
  } catch (error) {
    if (error instanceof TrayectoEnCursoExistenteError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Error iniciando trayecto:", error);
    return NextResponse.json({ error: "No se pudo iniciar el trayecto." }, { status: 500 });
  }
}
