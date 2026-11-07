import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";
import { connectDB, disconnectDB } from "../../lib/db/mongodb";
import AvistamientoModel from "../../lib/models/Avistamiento";
import EspecieModel from "../../lib/models/Especie";
import RateLimitModel from "../../lib/models/RateLimit";
import UsuarioModel from "../../lib/models/Usuario";

const runId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const reportDescription = `Reporte e2e ${runId}`;
const reportUserEmail = `reporte-${runId}@example.com`;
const reportUserPassword = "unaClaveSegura123";
const inaturalistTaxonId = 74442;

let reportUserId: string;
let taxonSpeciesExisted: boolean;

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
    taxonSpeciesExisted = Boolean(await EspecieModel.exists({ inaturalistTaxonId }));
    const reportUser = await UsuarioModel.create({
            nombre: "Usuario E2E Reportes",
            email: reportUserEmail,
            contraseniaHash: await bcrypt.hash(reportUserPassword, 12),
        });
    reportUserId = String(reportUser._id);
});

test.afterAll(async () => {
    await AvistamientoModel.deleteMany({ descripcion: reportDescription });
    if (!taxonSpeciesExisted) {
        await EspecieModel.deleteMany({ inaturalistTaxonId });
    }
    if (reportUserId) await UsuarioModel.findByIdAndDelete(reportUserId);
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
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: -34.5, longitude: -56.2 });
    await registerAndLogin(page);
    await expect(page.getByText("Usuario E2E", { exact: true })).toBeVisible();

    const map = page.getByRole("application", { name: "Mapa de avistamientos en Uruguay" });
    await page.getByRole("button", { name: "Mi ubicación" }).click();
    await expect(map.locator('.leaflet-overlay-pane path[fill="#4aa3df"]')).toHaveCount(1);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();

    await login(page, reportUserEmail, reportUserPassword);
    const otherAccountMap = page.getByRole("application", { name: "Mapa de avistamientos en Uruguay" });
    await expect(otherAccountMap.locator('.leaflet-overlay-pane path[fill="#4aa3df"]')).toHaveCount(0);
});

test("permite reportar, filtrar y consultar el detalle de un avistamiento", async ({ page }) => {
    test.setTimeout(60_000);
    const leafletErrors: string[] = [];
    page.on("pageerror", (error) => {
        if (error.message.includes("_leaflet_pos")) leafletErrors.push(error.message);
    });
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: -34.5, longitude: -56.2 });
    await login(page, reportUserEmail, reportUserPassword);
    const sightingsBeforeLocation = await AvistamientoModel.countDocuments({ usuarioId: reportUserId });
    let createRequests = 0;
    page.on("request", (request) => {
        if (request.url().endsWith("/api/avistamientos") && request.method() === "POST") {
            createRequests += 1;
        }
    });

    const map = page.getByRole("application", { name: "Mapa de avistamientos en Uruguay" });
    await page.getByRole("button", { name: "Mi ubicación" }).click();
    await expect(map.locator('.leaflet-overlay-pane path[fill="#4aa3df"]')).toHaveCount(1);
    await expect(page.getByText("Tu ubicación solo es visible para ti y se elimina en 2 minutos.")).toBeVisible();
    expect(createRequests).toBe(0);
    expect(await AvistamientoModel.countDocuments({ usuarioId: reportUserId })).toBe(sightingsBeforeLocation);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Conduce con más información." })).toBeVisible();
    const reloadedMap = page.getByRole("application", { name: "Mapa de avistamientos en Uruguay" });
    await expect(reloadedMap.locator('.leaflet-overlay-pane path[fill="#4aa3df"]')).toHaveCount(0);

    await page.route("**/api/especies/buscar**", (route) =>
        route.fulfill({
            json: {
                taxa: [{
                    id: inaturalistTaxonId,
                    nombreCientifico: "Hydrochoerus hydrochaeris",
                    nombreComun: "Capybara",
                }],
            },
        }),
    );
    await page.getByRole("button", { name: /Reportar avistamiento/ }).click();
    await page.getByRole("textbox", { name: /Qué animal viste/ }).fill("Capybara");
    await page.getByRole("button", { name: /Capybara/ }).click();
    await page.getByLabel("Nivel de riesgo inicial").selectOption("MEDIO");
    await page.getByRole("button", { name: "Usar mi ubicación actual" }).click();
    await expect(page.getByText(/Ubicación lista/)).toBeVisible();
    await expect(page.getByLabel("Longitud")).toHaveCount(0);
    await expect(page.getByLabel("Latitud")).toHaveCount(0);
    expect(createRequests).toBe(0);
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
    expect(createRequests).toBe(1);
    const createBody = await createResponse.json();
    const reportedSpeciesId = createBody.avistamiento.especie.id as string;
    const reportedSpeciesName = createBody.avistamiento.especie.nombre as string;
    expect(createBody.avistamiento).toMatchObject({
        especie: {
            id: reportedSpeciesId,
            inaturalistTaxonId,
            nombreCientifico: "Hydrochoerus hydrochaeris",
            nivelRiesgo: "MEDIO",
        },
        rutaId: null,
        km: null,
        ubicacion: { type: "Point", coordinates: [-56.2, -34.5] },
        descripcion: reportDescription,
        metodo: "MANUAL",
        esAnonimo: true,
        estado: "ACTIVO",
    });

    await expect(page.getByRole("dialog").getByRole("status"))
        .toContainText("El avistamiento quedó registrado");
    await page.getByRole("button", { name: "Volver al mapa" }).click();
    await expect(page.getByRole("heading", { name: reportedSpeciesName })).toBeVisible();

    await page.getByLabel("Filtrar por especie").selectOption(reportedSpeciesId);
    await expect(page.getByText("1 reporte", { exact: true })).toBeVisible();
    await expect(page.getByText(reportDescription)).toBeVisible();
    await expect(page.getByRole("heading", { name: reportedSpeciesName })).toBeVisible();
    await expect(map.locator('.leaflet-overlay-pane path[fill="#e2bb67"]')).toHaveCount(1);
    await expect(map.locator('.leaflet-overlay-pane path[fill="#4aa3df"]')).toHaveCount(0);

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
    await expect(detailDialog.getByText("Coordenadas")).toHaveCount(0);
    expect(leafletErrors).toEqual([]);
});
