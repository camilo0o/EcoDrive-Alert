import { connection, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { isObjectId } from "@/lib/http/params";
import { marcarAlertaVista } from "@/lib/services/alerta.service";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Id de alerta inválido." }, { status: 400 });
  }

  try {
    const alerta = await marcarAlertaVista(id, auth.user.id);
    if (!alerta) {
      return NextResponse.json({ error: "Alerta no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ alerta }, { status: 200 });
  } catch (error) {
    console.error("Error marcando alerta como vista:", error);
    return NextResponse.json({ error: "No se pudo actualizar la alerta." }, { status: 500 });
  }
}
