import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { isObjectId } from "@/lib/http/params";
import {
  listarAlertasPorTrayecto,
  revisarAlertasParaUbicacion,
} from "@/lib/services/alerta.service";

const puntoSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

const getSchema = z.object({
  trayectoId: z.string().refine(isObjectId, "Id de trayecto inválido."),
});

const checkSchema = z.object({
  trayectoId: z.string().refine(isObjectId, "Id de trayecto inválido."),
  location: puntoSchema,
  radioMetros: z.coerce.number().min(10).max(2000).default(200),
});

export async function GET(request: Request) {
  await connection();

  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const parsed = getSchema.safeParse({
    trayectoId: searchParams.get("trayectoId"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const alertas = await listarAlertasPorTrayecto(parsed.data.trayectoId, auth.user.id);
    return NextResponse.json({ alertas }, { status: 200 });
  } catch (error) {
    console.error("Error listando alertas:", error);
    return NextResponse.json({ error: "No se pudieron obtener las alertas." }, { status: 500 });
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
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const rateLimit = await consumeRateLimit("alertas-verificar", auth.user.id, 60, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Se recibieron demasiadas actualizaciones GPS. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const result = await revisarAlertasParaUbicacion(
      parsed.data.trayectoId,
      auth.user.id,
      parsed.data.location,
      parsed.data.radioMetros,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error verificando alertas:", error);
    return NextResponse.json({ error: "No se pudo verificar la ubicación." }, { status: 500 });
  }
}