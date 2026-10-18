import type { UsuarioDatos } from '../types/usuario';
import { model, models, Schema } from 'mongoose';

const usuarioSchema = new Schema<UsuarioDatos>({
    nombre: { type: String, required: true, trim: true }, //con trim eliminamos espacios sobrantes
    email: { type: String, required: true, unique: true, trim: true},
    contraseniaHash: { type: String, required: true, trim: true },
});

const UsuarioModel = models.Usuario ?? model<UsuarioDatos>("Usuario", usuarioSchema);

export default UsuarioModel;