import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";
import { connectDB, disconnectDB } from "../../lib/db/mongodb";
import { NivelRiesgo } from "../../lib/enums";
import AvistamientoModel from "../../lib/models/Avistamiento";
import EspecieModel from "../../lib/models/Especie";
import RateLimitModel from "../../lib/models/RateLimit";
import RutaModel from "../../lib/models/Ruta";
import UsuarioModel from "../../lib/models/Usuario";

const runId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const speciesName = `Especie E2E ${runId}`;
const routeName = `Ruta E2E ${runId}`;
const reportDescription = `Reporte e2e ${runId}`;
const reportUserEmail = `reporte-${runId}@example.com`;
const reportUserPassword = "unaClaveSegura123";

let speciesId: string;
let routeId: string;
let reportUserId: string;

function rateLimitKey(scope: string, identifier: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET debe estar configurado para las pruebas E2E.");
    return createHmac("sha256", secret).update(`${scope}:${identifier}`).digest("hex");
}

async function login(page: Page, email: string, password: string) {
    await page.goto("/login");
    const loginForm = page.locator("form").filter({
        has: page.getByRole("button", { name: "Iniciar sesión" }),
    });
    await loginForm.getByLabel("Email").fill(email);
    await loginForm.getByLabel("Contraseña").fill(password);
    const loginResponsePromise = page.waitForResponse(
        (response) =>
            response.url().endsWith("/api/auth/login") &&
            response.request().method() === "POST",
    );
    await loginForm.getByRole("button", { name: "Iniciar sesión" }).click();
    const loginResponse = await loginResponsePromise;
    const loginBody = await loginResponse.json();
    expect(loginResponse.status(), JSON.stringify(loginBody)).toBe(200);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Conduce con más información." })).toBeVisible();
}

async function registerAndLogin(page: Page) {
    const email = `usuario-${runId}-${Math.floor(Math.random() * 1_000_000)}@example.com`;
    const password = "unaClaveSegura123";

    await page.goto("/register");
    await page.getByLabel("Nombre").fill("Usuario E2E");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByLabel("Confirmar contraseña").fill(password);
    const registrationResponsePromise = page.waitForResponse(
        (response) =>
            response.url().endsWith("/api/auth/register") &&
            response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    const registrationResponse = await registrationResponsePromise;
    const registrationBody = await registrationResponse.json();
    expect(registrationResponse.status(), JSON.stringify(registrationBody)).toBe(201);
    await expect(page).toHaveURL(/\/login\?registered=1/);
    await login(page, email, password);
}

test.beforeAll(async () => {
    await connectDB();
    await RateLimitModel.deleteMany({
        key: {
            $in: [
                rateLimitKey("register-ip", "::1"),
                rateLimitKey("login-ip", "::1"),
            ],
        },
    });
    const [species, route, reportUser] = await Promise.all([
        EspecieModel.create({ nombre: speciesName, alias: [], nivelRiesgo: NivelRiesgo.ALTO }),
        RutaModel.create({ nombre: routeName, longitudKm: 100 }),
        UsuarioModel.create({
            nombre: "Usuario E2E Reportes",
            email: reportUserEmail,
            contraseniaHash: await bcrypt.hash(reportUserPassword, 12),
        }),
    ]);
    speciesId = String(species._id);
    routeId = String(route._id);
    reportUserId = String(reportUser._id);
});

test.afterAll(async () => {
    if (speciesId || routeId) {
        await Promise.all([
            AvistamientoModel.deleteMany({ descripcion: reportDescription }),
            speciesId ? EspecieModel.findByIdAndDelete(speciesId) : Promise.resolve(),
            routeId ? RutaModel.findByIdAndDelete(routeId) : Promise.resolve(),
            reportUserId ? UsuarioModel.findByIdAndDelete(reportUserId) : Promise.resolve(),
        ]);
    }
    await disconnectDB();
});

test("la portada da acceso a registro e inicio de sesión", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Fauna en Ruta" })).toBeVisible();
    await page.getByRole("link", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole("heading", { name: "Crear cuenta" })).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("permite crear cuenta, iniciar sesión y cerrar sesión", async ({ page }) => {
    await registerAndLogin(page);
    await expect(page.getByText("Usuario E2E", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("permite reportar, filtrar y consultar el detalle de un avistamiento", async ({ page }) => {
    await login(page, reportUserEmail, reportUserPassword);

    await page.getByRole("button", { name: /Reportar avistamiento/ }).click();
    await page.locator('[name="especieId"]').selectOption(speciesId);
    await page.locator('[name="rutaId"]').selectOption(routeId);
    await page.getByLabel("Kilómetro").fill("42");
    await page.getByLabel("Longitud").fill("-56.2");
    await page.getByLabel("Latitud").fill("-34.5");
    await page.getByLabel("Descripción (opcional)").fill(reportDescription);
    await page.getByLabel("Publicar este reporte de forma anónima").check();

    const createResponsePromise = page.waitForResponse(
        (response) =>
            response.url().endsWith("/api/avistamientos") &&
            response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Confirmar avistamiento" }).click();

    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();
    expect(createBody.avistamiento).toMatchObject({
        especie: { id: speciesId, nombre: speciesName },
        rutaId: routeId,
        km: 42,
        ubicacion: { type: "Point", coordinates: [-56.2, -34.5] },
        descripcion: reportDescription,
        metodo: "MANUAL",
        esAnonimo: true,
        estado: "ACTIVO",
    });

    await expect(page.getByRole("dialog").getByRole("status"))
        .toContainText("El avistamiento quedó registrado");
    await page.getByRole("button", { name: "Volver al mapa" }).click();
    await expect(page.getByRole("heading", { name: speciesName })).toBeVisible();

    await page.getByLabel("Filtrar por ruta").selectOption(routeId);
    await expect(page.getByText("1 reporte", { exact: true })).toBeVisible();
    await expect(page.getByText(reportDescription)).toBeVisible();

    await page.getByLabel("Filtrar por especie").selectOption(speciesId);
    await expect(page.getByRole("heading", { name: speciesName })).toBeVisible();
    await page.getByRole("button", { name: "Reportes" }).click();
    const detailResponsePromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/avistamientos/") &&
            response.request().method() === "GET",
    );
    await page.getByRole("button", { name: "Ver detalle" }).click();
    const detailResponse = await detailResponsePromise;
    expect(detailResponse.status()).toBe(200);

    const detailDialog = page.getByRole("dialog");
    await expect(detailDialog.getByRole("heading", { name: "Detalle del avistamiento" })).toBeVisible();
    await expect(detailDialog.getByText(reportDescription)).toBeVisible();
    await expect(detailDialog.getByText("Reporte anónimo")).toBeVisible();
    await expect(detailDialog.getByText("-56.2, -34.5")).toBeVisible();
});
