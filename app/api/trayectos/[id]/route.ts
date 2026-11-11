import { connection, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { isObjectId } from "@/lib/http/params";
import { finalizarTrayecto } from "@/lib/services/trayecto.service";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Id de trayecto inválido." }, { status: 400 });
  }

  try {
    const trayecto = await finalizarTrayecto(id, auth.user.id);
    if (!trayecto) {
      return NextResponse.json({ error: "No se encontró un trayecto activo para finalizar." }, { status: 404 });
    }
    return NextResponse.json({ trayecto });
  } catch (error) {
    console.error("Error finalizando trayecto:", error);
    return NextResponse.json({ error: "No se pudo finalizar el trayecto." }, { status: 500 });
  }
}
