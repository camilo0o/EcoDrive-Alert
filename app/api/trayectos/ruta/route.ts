import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { calculateDrivingRoute, RoutingServiceError } from "@/lib/services/routing.service";

const pointSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
}).strict();

const routeSchema = z.object({
  origen: pointSchema,
  destino: pointSchema,
}).strict().refine(
  ({ origen, destino }) => origen.lat !== destino.lat || origen.lng !== destino.lng,
  { path: ["destino"], message: "El punto B debe ser distinto del punto A." },
);

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

  const parsed = routeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Selecciona un origen y un destino válidos.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const ruta = await calculateDrivingRoute(parsed.data.origen, parsed.data.destino);
    return NextResponse.json({ ruta }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof RoutingServiceError ? error.message : "No se pudo calcular el recorrido.";
    console.error("Error calculando el recorrido:", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
