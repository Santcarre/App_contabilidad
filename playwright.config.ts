import { defineConfig, devices } from "@playwright/test";

// Secret de test: el webServer arranca next (producción) con este valor
// (sobrescribe .env), así podemos forjar la cookie de sesión JWT en los
// tests sin OAuth real. En CI se inyecta vía env; local cae al default.
export const E2E_SECRET =
  process.env.E2E_SECRET ?? "e2e-secret-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  // Servidor de producción: sin compilación por demanda, chunks estables.
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // build + start evita el race del dev server (chunk a medias al compilar
    // en caliente, "Invalid or unexpected token") y valida el bundle real.
    command: "npm run build && npm run start",
    url: "http://localhost:3000/auth/login",
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXTAUTH_SECRET: E2E_SECRET,
      NEXTAUTH_URL: "http://localhost:3000",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
