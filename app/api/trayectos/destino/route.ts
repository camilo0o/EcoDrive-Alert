import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { requireUser } from "@/lib/auth/require-user";
import { geocodeDestination, GeocodingServiceError } from "@/lib/services/geocoding.service";

const destinationSchema = z.object({
  query: z.string().trim().min(3).max(120),
}).strict();

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

  const parsed = destinationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Escribe un destino de al menos tres caracteres.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const userLimit = await consumeRateLimit("destino-buscar", auth.user.id, 10, 60);
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: "Se alcanzó el límite de búsquedas de destinos. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSeconds) } },
      );
    }

    const serviceLimit = await consumeRateLimit("nominatim-global", "global", 1, 1);
    if (!serviceLimit.allowed) {
      return NextResponse.json(
        { error: "La búsqueda está ocupada. Inténtalo de nuevo en un segundo." },
        { status: 429, headers: { "Retry-After": String(serviceLimit.retryAfterSeconds) } },
      );
    }

    const destino = await geocodeDestination(parsed.data.query);
    if (!destino) {
      return NextResponse.json({ error: "No encontramos ese destino en Uruguay. Prueba con otro nombre." }, { status: 404 });
    }

    return NextResponse.json({ destino }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof GeocodingServiceError) {
      console.error("Error buscando el destino:", error);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("Error buscando el destino:", error);
    return NextResponse.json({ error: "No se pudo buscar el destino." }, { status: 500 });
  }
}
