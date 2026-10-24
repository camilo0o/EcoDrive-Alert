import { expect, test } from "@playwright/test";

test("permite crear cuenta, iniciar sesión y cerrar sesión", async ({ page }) => {
    const email = `usuario-${Date.now()}@example.com`;
    const password = "unaClaveSegura123";

    await page.goto("/register");
    await page.getByLabel("Nombre").fill("Usuario E2E");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByLabel("Confirmar contraseña").fill(password);

    const registerResponsePromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/auth/register") &&
            response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Crear cuenta" }).click();

    const registerResponse = await registerResponsePromise;
    expect(registerResponse.status()).toBe(201);
    await expect(page).toHaveURL(/\/login\?registered=1/);

    const loginForm = page.locator("form").filter({
        has: page.getByRole("button", { name: "Iniciar sesión" }),
    });
    await loginForm.getByLabel("Email").fill(email);
    await loginForm.getByLabel("Contraseña").fill(password);
    await loginForm.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
        page.getByRole("heading", { name: "Panel de usuario" }),
    ).toBeVisible();
    await expect(page.getByText("Sesión iniciada para Usuario E2E.")).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
});