// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("página principal", () => {
  it("presenta accesos directos para iniciar sesión y crear una cuenta", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("heading", { name: "Fauna en Ruta" })).toBeVisible();
  });
});
