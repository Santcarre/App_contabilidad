# App Contabilidad Personal

Aplicación web de contabilidad personal construida con Next.js 14, TypeScript, Tailwind CSS y Google Sheets como base de datos.

## Características

- 🔐 **Autenticación Google OAuth** - Login seguro, sesiones de 30 días, refresh automático
- 👥 **Multi-usuario** - Cada usuario tiene su propio Google Spreadsheet privado
- 🔄 **Switch User** - Cambia de cuenta sin cerrar sesión
- 💰 **Transacciones** - Gastos e ingresos con categorías, fuentes, monedas, fechas y notas
- 🏷️ **Categorías y Fuentes personalizables** - Iconos (Lucide), colores (Tailwind), soft delete
- 🌍 **Multi-moneda** - COP, USD, EUR con conversión automática a moneda base
- 📊 **Tasas de cambio automáticas** - Actualización diaria via Frankfurter.dev + override manual
- 💵 **Presupuestos** - Límites mensuales por categoría con alertas 80%/100%
- 🔁 **Gastos recurrentes** - Plantillas mensuales con generación automática (cron día 1)
- 📈 **Reportes visuales** - Resumen mensual, desglose por categoría/fuente, gráficos (Recharts), export CSV
- 📱 **PWA instalable** - Offline-first con IndexedDB queue + Background Sync
- 🌙 **Dark mode** - Sistema/Claro/Oscuro persistente

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 3 + shadcn/ui |
| Auth | NextAuth.js v5 (Google OAuth) |
| Base de Datos | Google Sheets API (1 Sheet por usuario) |
| Gráficos | Recharts |
| Estado | TanStack Query (React Query) |
| Fechas | date-fns |
| Monedas | Frankfurter.dev (gratis) |
| PWA | next-pwa (Workbox) |
| Deploy | Vercel (gratis) |
| Cron Jobs | Vercel Cron |

## Estructura del Proyecto

```
app/
├── auth/
│   ├── login/page.tsx
│   └── api/auth/[...nextauth]/route.ts   # NextAuth (Google + Credentials "switch")
├── dashboard/
│   ├── layout.tsx              # Sidebar + Header + User Switcher (auth() + redirect)
│   ├── page.tsx                # Dashboard
│   ├── transacciones/          # CRUD Transacciones
│   ├── categorias/             # CRUD Categorías
│   ├── fuentes/                # CRUD Fuentes (Medio de Pago)
│   ├── presupuestos/           # Presupuestos + alertas
│   ├── recurrentes/            # Gastos recurrentes
│   ├── reportes/               # Reportes + gráficos (recharts lazy)
│   └── configuracion/          # Configuración (moneda, tema, tasas)
├── api/
│   ├── auth/users/             # Lista de cuentas activas (switch user)
│   ├── auth/[...nextauth]/     # NextAuth
│   ├── transacciones/          # CRUD Transacciones
│   ├── categorias/             # CRUD Categorías
│   ├── fuentes/                # CRUD Fuentes
│   ├── presupuestos/           # CRUD Presupuestos
│   ├── recurrentes/            # CRUD Recurrentes + generación
│   ├── exchange-rates/         # Tasas de cambio
│   └── cron/
│       ├── exchange-rates/     # Cron diario (6 AM)
│       └── recurrentes/        # Cron mensual (día 1, 9 AM)
├── lib/
│   ├── auth-options.ts         # NextAuth config
│   ├── google-sheets.ts        # Sheets API wrapper (batchGet)
│   ├── currency.ts             # Conversión y formato monedas
│   ├── encryption.ts           # AES-GCM para tokens
│   ├── validation.ts           # Zod schemas
│   ├── offline-queue.ts        # Cola offline (IndexedDB + Background Sync)
│   ├── api-client.ts           # fetch compartido con soporte offline
│   └── get-spreadsheet-id.ts   # Helpers para Server Actions
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Sidebar, Header
│   └── providers.tsx           # Session, Query, Theme, offline sync
└── worker/
    └── index.js                # Service Worker custom (Background Sync)
```

## Requisitos Previos

- Node.js 20+
- Cuenta Google Cloud con:
  - Google Sheets API habilitada
  - Google Drive API habilitada
  - OAuth 2.0 Client ID configurado
  - Service Account creado
- Cuenta Vercel (gratis)

## Configuración Inicial

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd app-contabilidad
npm install
```

### 2. Configurar Google Cloud

1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Habilitar APIs: **Google Sheets API**, **Google Drive API**
3. Crear **OAuth 2.0 Client ID**:
   - Authorized redirect URIs: `https://tu-dominio.vercel.app/api/auth/callback/google`
   - Authorized JavaScript origins: `https://tu-dominio.vercel.app`
4. Crear **Service Account**:
   - Grant access: Editor (para hoja Usuarios global)
   - Keys → Create key → JSON (para `GOOGLE_SERVICE_ACCOUNT_KEY`)

### 3. Crear hoja `Usuarios` global

1. Crear nueva Google Spreadsheet
2. Nombrar hoja: `Usuarios`
3. Headers en fila 1:
   ```
   email | name | picture | access_token_enc | refresh_token_enc | spreadsheet_id | currency_base | created_at | last_login | is_active
   ```
3. Compartir con Service Account (Editor)
4. Copiar Spreadsheet ID → `GOOGLE_USERS_SPREADSHEET_ID`

### 4. Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```bash
cp .env.example .env.local
```

Generar secrets:
```bash
# NEXTAUTH_SECRET, CRON_SECRET, ENCRYPTION_KEY (32 bytes cada uno)
openssl rand -base64 32
```

### 5. Desarrollo local

```bash
npm run dev
```

Abrir http://localhost:3000

## Despliegue en Vercel

1. Push a GitHub
2. Import Project en Vercel (framework: Next.js)
3. Configurar Environment Variables (Production, Preview, Development):
   ```
   NEXTAUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY,
   GOOGLE_USERS_SPREADSHEET_ID, ENCRYPTION_KEY, CRON_SECRET
   ```
   (`EXCHANGE_RATE_API` es opcional, apunta a Frankfurter por defecto)
4. Deploy

> Nota: `trustHost: true` ya está en `auth-options.ts`, así que Auth.js funciona
> en Vercel sin configuración extra.

### Configurar Cron Jobs en Vercel

Los crons se configuran automáticamente via `vercel.json`. Verificar en Vercel Dashboard > Cron Jobs.

## Scripts Disponibles

```bash
npm run dev          # Servidor desarrollo
npm run build        # Build producción
npm run start        # Servidor producción
npm run lint         # ESLint (next lint)
npm run typecheck    # TypeScript check
npm run format       # Prettier write
npm run test         # Vitest (unit)
npm run test:e2e     # Playwright (E2E)
```

## Modelo de Datos (Por Usuario)

Cada usuario tiene un Spreadsheet `{email}_contabilidad` con 7 hojas:

1. **Transacciones** - id, type, amountOriginal, currencyOriginal, amountBase, currencyBase, categoryId, sourceId, date, note, recurringId, createdAt, updatedAt
2. **Categorias** - id, name, type, icon, color, order, active, isDefault
3. **Fuentes** - id, name, type, icon, color, initialBalance, active, isDefault
4. **Presupuestos** - id, categoryId, limitAmount, month, alert80, alert100, createdAt
5. **Recurrentes** - id, type, amountOriginal, currencyOriginal, categoryId, sourceId, frequency, dayOfMonth, startDate, endDate, active, nextGeneration, lastGenerated, createdAt
6. **Configuracion** - key, value, updatedAt
7. **TasasCambio** - baseCurrency, targetCurrency, rate, source, date, fetchedAt

Hoja global **Usuarios** (Service Account): email, tokens encriptados, spreadsheet_id, metadata.

## Seguridad

- Tokens OAuth encriptados AES-GCM-256 en hoja `Usuarios`
- `ENCRYPTION_KEY` en env vars (32 bytes base64) - **backup obligatorio**
- Protección de rutas en `app/dashboard/layout.tsx` (`auth()` + redirect)
- CSP, `X-Frame-Options`, `nosniff` vía headers en `next.config.js`
- Rate limiting en Google Sheets (batch + exponential backoff)

## PWA / Offline

- `next-pwa` con Workbox
- Service Worker registra automáticamente
- IndexedDB queue para mutaciones offline (`lib/offline-queue.ts`)
- Background Sync al recuperar conexión (`worker/index.js`, tag `contabilidad-outbox`)
- Manifest + icons para "Add to Home Screen"

## Roadmap / Pendiente

- **Drag & drop** para reordenar categorías/fuentes.
- **Sentry** (monitoreo de errores) y **analytics** (opcional).
- **Custom domain** en Vercel (opcional).
- **Deploy a Vercel** (pendiente hasta validar el Sprint de móvil en el dispositivo real).

## Testing

```bash
# Unit tests (currency, validation, encryption, generador recurrente, Sheets)
npm run test

# E2E tests (Playwright) — requiere puerto 3000 libre
npm run test:e2e
```

### E2E (Playwright)

Los tests E2E simulan el flujo completo de un usuario en un navegador real:

- **Servidor de producción**: `playwright.config.ts` levanta `npm run build && npm run start` (evita el race del dev server y valida el bundle real, PWA incluida).
- **Sesión forjada**: no se usa OAuth real — `e2e/helpers.ts` genera un JWT con `next-auth/jwt` (misma secret que el servidor) y lo inyecta como cookie `authjs.session-token`.
- **API mockeada**: `mockApi()` intercepta `/api/**` y responde fixtures (transacciones, categorías, reportes...). Rutas no cubiertas devuelven 404 a propósito (un typo debe fallar el test).
- **Cobertura**: login → dashboard → crear transacción → lista → reportes (tabs) → switch de usuario → logout.

```bash
npx playwright test            # suite completa
npx playwright test -g "crear" # un solo test
```

### CI (GitHub Actions)

`.github/workflows/ci.yml` corre en cada push/PR:

| Job | Qué valida |
|-----|------------|
| `checks` | `tsc --noEmit` + `next lint` + `vitest` |
| `e2e` | Playwright (build + start) con subida de artefactos si falla |
| `lighthouse` | Budgets Perf > 90, A11y > 95 en 4 URLs (con sesión forjada) |

Config de Lighthouse en `lighthouserc.js`. Si el repo define el secret `E2E_SECRET`, se usa en CI; si no, cae al default de `playwright.config.ts`.

## Troubleshooting

| Problema | Solución |
|----------|----------|
| `RefreshAccessTokenError` | Usuario debe re-loguear; verificar `prompt=consent` |
| Rate limit Sheets (429) | Batch writes, backoff, cache 5min |
| Cron no ejecuta | Verificar `CRON_SECRET` en Vercel, logs en Dashboard |
| Sheets 403 | Verificar Service Account tiene Editor en Sheet usuario |
| PWA no instala | Verificar HTTPS, manifest, service worker |

## Licencia

MIT