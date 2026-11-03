/**
 * Helpers de fetch para el cliente. Convierten las respuestas de error de la API
 * ({ error: string }) en excepciones con un mensaje listo para mostrar.
 */

const NETWORK_ERROR = "No se pudo conectar con el servidor.";

export async function parseJson<T>(response: Response, fallbackError: string): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? fallbackError);
  }
  return body as T;
}

export async function getJson<T>(url: string, fallbackError = "No se pudo completar la solicitud."): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(NETWORK_ERROR);
  }
  return parseJson<T>(response, fallbackError);
}

export async function postJson<T = unknown>(
  url: string,
  body: unknown,
  fallbackError = "No se pudo completar la solicitud.",
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(NETWORK_ERROR);
  }
  return parseJson<T>(response, fallbackError);
}
