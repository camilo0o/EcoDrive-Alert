import { http, HttpResponse } from "msw";

export const handlers = [
  http.post("/api/auth/login", () =>
    HttpResponse.json({
      user: {
        id: "user-test",
        nombre: "Usuario de prueba",
        email: "test@example.com",
      },
    }),
  ),
  http.post("/api/auth/register", () =>
    HttpResponse.json(
      {
        user: {
          id: "user-test",
          nombre: "Usuario de prueba",
          email: "test@example.com",
        },
      },
      { status: 201 },
    ),
  ),
];