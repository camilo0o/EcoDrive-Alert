import bcrypt from "bcryptjs";
import { AuthError } from "../auth/auth.error";
import { PublicUser } from "../auth/auth.types";
import { LoginInput, RegisterInput } from "../auth/schemas";
import { connectDB } from "../db/mongodb";
import UsuarioModel from "../models/Usuario";


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
): Promise<PublicUser | null> {
  await connectDB();

  const user = await UsuarioModel.findOne({ email: input.email })
    .select("+contraseniaHash")
    .exec();

  if (!user) return null;

  const passwordMatches = await bcrypt.compare(
    input.contrasenia,
    user.contraseniaHash,
  );

  if (!passwordMatches) return null;

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
  };
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  await connectDB();

  const user = await UsuarioModel.findById(userId).exec();

  if (!user) return null;

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
  };
}