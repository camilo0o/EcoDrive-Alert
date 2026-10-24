// @vitest-environment node

import { MongoMemoryServer } from "mongodb-memory-server";
import UsuarioModel from "@/lib/models/Usuario";
import { connectDB, disconnectDB } from "@/lib/db/mongodb";
import {
  authenticateUser,
  registerUser,
} from "@/lib/services/auth.service";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";

let mongo: MongoMemoryServer;

beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();

    await connectDB();
    await UsuarioModel.init();
});

beforeEach(async () => {
    await UsuarioModel.deleteMany({});
});

afterAll(async () => {
    await disconnectDB();
    await mongo.stop();
});

describe("servicio de autenticación", () => {
    it("registra el usuario guardando un hash, no la contraseña original", async () => {
        const user = await registerUser({
            nombre: "Ana",
            email: "ana@example.com",
            contrasenia: "unaClave123",
            confirmacion: "unaClave123",
        });

        const saved = await UsuarioModel.findById(user.id)
            .select("+contraseniaHash")
            .exec();

        expect(saved).not.toBeNull();
        expect(saved?.contraseniaHash).not.toBe("unaClave123");
    });

    it("rechaza un email duplicado", async () => {
        const input = {
            nombre: "Ana",
            email: "ana@example.com",
            contrasenia: "unaClave123",
            confirmacion: "unaClave123",
        };

        await registerUser(input);

        await expect(registerUser(input)).rejects.toMatchObject({
            code: "EMAIL_TAKEN",
        });
    });

    it("acepta la contraseña correcta y rechaza la incorrecta", async () => {
        await registerUser({
            nombre: "Ana",
            email: "ana@example.com",
            contrasenia: "unaClave123",
            confirmacion: "unaClave123",
        });

        await expect(
            authenticateUser({
            email: "ana@example.com",
            contrasenia: "unaClave123",
        }),
        ).resolves.toMatchObject({ email: "ana@example.com" });

        await expect(
            authenticateUser({
                email: "ana@example.com",
                contrasenia: "otraClave123",
            }),
        ).resolves.toBeNull();
    });
});