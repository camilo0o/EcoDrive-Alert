// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import { server } from "../mocks/server";

const { push, refresh } = vi.hoisted(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, refresh }),
    useSearchParams: () => new URLSearchParams(),
}));

describe("formulario de login", () => {
    beforeEach(() => {
        push.mockReset();
        refresh.mockReset();
    });

    it("envía las credenciales y navega al panel", async () => {
        render(<LoginPage />);

        fireEvent.change(screen.getByLabelText("Email"), {
            target: { value: "test@example.com" },
        });
        fireEvent.change(screen.getByLabelText("Contraseña"), {
            target: { value: "password123" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

        await vi.waitFor(() => {
        expect(push).toHaveBeenCalledWith("/dashboard");
        });
    });

    it("muestra el error de credenciales incorrectas", async () => {
        server.use(
        http.post("/api/auth/login", () =>
            HttpResponse.json(
            { error: "Email o contraseña incorrectos." },
            { status: 401 },
            ),
        ),
        );

        render(<LoginPage />);

        fireEvent.change(screen.getByLabelText("Email"), {
            target: { value: "test@example.com" },
        });
        fireEvent.change(screen.getByLabelText("Contraseña"), {
            target: { value: "incorrecta123" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Email o contraseña incorrectos.",);
    });
});