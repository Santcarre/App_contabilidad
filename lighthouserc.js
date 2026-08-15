// S6-08: budgets de Lighthouse CI (Perf > 90, A11y > 95).
// El job de CI forja la cookie de sesión (.lhci-cookie) y la inyecta como
// header para auditar páginas autenticadas, no el redirect a /auth/login.
const fs = require("fs");
const E2E_SECRET = process.env.E2E_SECRET || "e2e-secret-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP";
const cookie = (fs.existsSync(".lhci-cookie") ? fs.readFileSync(".lhci-cookie", "utf8").trim() : "").trim();

module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/auth/login",
        "http://localhost:3000/dashboard",
        "http://localhost:3000/dashboard/transacciones",
        "http://localhost:3000/dashboard/reportes",
      ],
      // build + start: mismo servidor de producción que los E2E
      startServerCommand: `NEXTAUTH_SECRET=${E2E_SECRET} NEXTAUTH_URL=http://localhost:3000 npm run build && npm run start`,
      startServerReadyPattern: "Ready in",
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
        extraHeaders: cookie ? { Cookie: `authjs.session-token=${cookie}` } : undefined,
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
