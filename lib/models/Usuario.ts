import type { UsuarioDatos } from "../types/usuario";
import { model, models, Schema } from "mongoose";

const usuarioSchema = new Schema<UsuarioDatos>({
    nombre: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    contraseniaHash: { type: String, required: true, select: false },
}, { timestamps: true });

const UsuarioModel = models.Usuario ?? model<UsuarioDatos>("Usuario", usuarioSchema);

export default UsuarioModel;
