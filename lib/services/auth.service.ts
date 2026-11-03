import bcrypt from "bcryptjs";
import { AuthError } from "../auth/auth.error";
import { PublicUser } from "../auth/auth.types";
import { LoginInput, RegisterInput } from "../auth/schemas";
import { connectDB } from "../db/mongodb";
import UsuarioModel from "../models/Usuario";
import type { Session } from "../auth/session";

const DUMMY_HASH = bcrypt.hashSync("usuario-inexistente", 12);

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  await connectDB();
  const existingUser = await UsuarioModel.exists({ email: input.email });

  if (existingUser) {
    throw new AuthError("EMAIL_TAKEN", "El correo electrónico ya está en uso.");
  }

  const contraseniaHash = await bcrypt.hash(input.contrasenia, 12);
  try {
    const user = await UsuarioModel.create({
      nombre: input.nombre,
      email: input.email,
      contraseniaHash,
    });

    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
    };
  } catch (error) {
    // El índice único también protege contra dos registros simultáneos.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AuthError("EMAIL_TAKEN", "Ese email ya está registrado.");
    }

    throw error;
  }
}

export async function authenticateUser(
  input: LoginInput,
): Promise<{ user: PublicUser; sesionVersion: number } | null> {
  await connectDB();

  const user = await UsuarioModel.findOne({ email: input.email })
    .select("+contraseniaHash")
    .exec();

  const passwordMatches = await bcrypt.compare(
    input.contrasenia,
    user?.contraseniaHash ?? DUMMY_HASH,
  );

  if (!user || !passwordMatches) return null;

  return {
    user: { id: user.id, nombre: user.nombre, email: user.email },
    sesionVersion: user.sesionVersion,
  };
}

export async function getUserBySession(session: Session): Promise<PublicUser | null> { // esta función obtiene el usuario a partir de la sesión, verificando la versión de sesión
  await connectDB();
  const user = await UsuarioModel.findById(session.userId).exec();

  if (!user || user.sesionVersion !== session.sesionVersion) return null;

  return { id: user.id, nombre: user.nombre, email: user.email };
}

export async function cerrarSesiones(userId: string): Promise<void> {
  await connectDB();
  await UsuarioModel.updateOne({ _id: userId }, { $inc: { sesionVersion: 1 } }).exec(); // Incrementa la versión de sesión para invalidar todas las sesiones existentes.
}