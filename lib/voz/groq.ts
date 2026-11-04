import OpenAI from "openai";

let cliente: OpenAI | null = null;

export function getGroq(): OpenAI {
    if (cliente) return cliente;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Falta configurar GROQ_API_KEY.");

    cliente = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
    return cliente;
}