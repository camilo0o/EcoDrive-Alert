import { z } from "zod";
const passwordSchema = z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .refine(
        (password) => new TextEncoder().encode(password).length <= 72,
        "La contraseña no debe exceder los 72 caracteres"
    )

const registerFields = {
    nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
    email: z.string().trim().toLowerCase().email("El correo electrónico no es válido"),
    contrasenia: passwordSchema
};

export const registerSchema = z.object(registerFields).strict();
export const registerFormSchema = z
    .object({
        ...registerFields,
        confirmacion: z.string(),
    })
    .strict()
    .refine((data) => data.contrasenia === data.confirmacion, {
        path: ["confirmacion"],
        message: "Las contraseñas no coinciden",
    });

export const loginSchema = z
    .object({
        email: z.string().trim().toLowerCase().email("Escribe un email válido."),
        contrasenia: z
            .string()
            .min(1, "Escribe tu contraseña.")
            .refine(
            (password) => new TextEncoder().encode(password).length <= 72,
            "La contraseña es demasiado larga.",
            ),
        })
    .strict()

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;