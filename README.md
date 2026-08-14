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
├── (auth)/
│   ├── login/page.tsx
│   └── callback/route.ts
├── (dashboard)/
│   ├── layout.tsx              # Sidebar + Header + User Switcher
│   ├── page.tsx                # Dashboard
│   ├── transacciones/          # CRUD Transacciones
│   ├── categorias/             # CRUD Categorías
│   ├── fuentes/                # CRUD Fuentes
│   ├── presupuestos/           # Presupuestos + alertas
│   ├── recurrentes/            # Gastos recurrentes
│   ├── reportes/               # Reportes + gráficos
│   └── configuracion/          # Configuración (moneda, tema, tasas)
├── api/
│   ├── auth/[...nextauth]/     # NextAuth
│   ├── auth/switch/            # Switch user
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
│   ├── auth.ts                 # NextAuth config
│   ├── google-sheets.ts        # Sheets API wrapper
│   ├── currency.ts             # Conversión y formato monedas
│   ├── encryption.ts           # AES-GCM para tokens
│   ├── validation.ts           # Zod schemas
│   └── get-spreadsheet-id.ts   # Helpers para Server Actions
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Sidebar, Header
│   └── providers.tsx           # Session, Query, Theme providers
└── middleware.ts               # Auth protection + spreadsheetId injection
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
2. Import Project en Vercel
3. Configurar Environment Variables (Production, Preview, Development)
4. Deploy

### Configurar Cron Jobs en Vercel

Los crons se configuran automáticamente via `vercel.json`. Verificar en Vercel Dashboard > Cron Jobs.

## Scripts Disponibles

```bash
npm run dev          # Servidor desarrollo
npm run build        # Build producción
npm run start        # Servidor producción
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run format       # Prettier write
npm run test         # Vitest
npm run test:e2e     # Playwright
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
- Middleware inyecta `spreadsheetId` por sesión (row-level security)
- CSP headers configurados
- Rate limiting en Google Sheets (batch + exponential backoff)

## PWA / Offline

- `next-pwa` con Workbox
- Service Worker registra automáticamente
- IndexedDB queue para mutaciones offline
- Background Sync al recuperar conexión
- Manifest + icons para "Add to Home Screen"

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Lighthouse CI (en PRs)
```

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