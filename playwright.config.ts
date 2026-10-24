import dotenv from "dotenv";
import { defineConfig } from "@playwright/test";

dotenv.config({ path: ".env.test" });

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    throw new Error("Configura MONGODB_URI y JWT_SECRET en .env.test.");
}

export default defineConfig({
    testDir: "./tests/e2e",
    use: {
        baseURL: "http://localhost:3001",
        headless: true,
    },
    webServer: {
        command: "npm run dev -- --port 3001",
        url: "http://localhost:3001",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});