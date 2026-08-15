# Registro de Bugs y Mejoras

## Arreglados
- [x] Sidebar marcaba siempre "Dashboard" como activo en todas las pestañas (26/01)
- [x] Colores del icono en Fuentes: 12 colores vs 17 en Categorías (ahora usa los mismos DEFAULT_COLORS) (26/01)
- [x] Eliminación de categorías/fuentes: ahora verifica si hay transacciones asociadas; si las hay, devuelve error 409 con mensaje; si no, borra la fila físicamente (antes solo desactivaba) (26/01)
- [x] Quitada la columna "Orden" de la tabla de categorías (el order se asigna automáticamente al crear y se conserva al editar) (26/01)
- [x] API /api/transacciones: GET fallaba con 500 por JSON.parse de la hoja Configuracion (headers y valores no-JSON como "COP") (26/01)
- [x] Reportes: navegación de meses rota por zona horaria (new Date("YYYY-MM-01") se interpreta UTC → en UTC-5 era el mes anterior). Ahora usa fecha local con date-fns subMonths/addMonths (26/01)
- [x] Campo de monto en nueva/editar transacción: ahora formatea miles y decimales mientras escribes (es-CO: 50.000,50). Nuevo componente MoneyInput (26/01)
- [x] Configuración: página reescrita con tabs General/Monedas/Presupuestos — monedas activas (switch), tasas con override manual por fila, botón de actualizar tasas al montar si falta la de hoy (12/08)
- [x] Preview de conversión de moneda en nueva/editar transacción (12/08)
- [x] CurrencySelect (S3-02): bandera + símbolo + código en el selector de moneda de nueva/editar transacción (12/08)
- [x] formatCurrency consolidado en lib/currency con locale por moneda (DoD: COP $1.000, USD $1,000.00, EUR 1.000,00 €); lib/utils re-exporta (12/08)
- [x] Reportes, Fuentes y Presupuestos ya no hardcodean "COP": usan la moneda base del usuario (12/08)
- [x] Tests vitest S3-11: convert, prioridad de tasas (manual > auto día > último > 1.0), getLatestRate/getTodayRate, formatCurrency, formatMoneyDisplay/parseMoneyInput (25 tests verdes) (12/08)
- [x] Transacciones (POST/PUT) ahora usan los overrides manuales al calcular amountBase (antes pasaban manualRates=[]) (12/08)
- [x] PATCH /api/exchange-rates y cron de tasas deduplican filas del día (update si existe, skip si es manual de hoy) (12/08)
- [x] Switch de usuario funcional: provider Credentials "switch" + getOrCreateUserSheet persiste refreshTokenEnc en hoja Usuarios + API /api/auth/users + header lista cuentas activas. Eliminada la API /api/auth/switch defectuosa (12/08)
- [x] Sprint 4 completo: página Reportes con datos reales (API /api/reportes) — tabs Resumen/Categorías/Fuentes/Tendencia, gráficos Recharts, export CSV por tab, empty states (13/08)
- [x] Reportes S4-09: filtros persistentes en URL (?month=YYYY-MM) con router.replace + sync por botones back/forward del browser; selector de mes (input type=month) junto a las flechas (13/08)
- [x] Dashboard con datos reales: las 3 cards (Ingresos/Gastos/Balance del mes + % vs mes anterior) ahora consumen /api/reportes; antes mostraban $0/+0% mock (ningún sprint lo cubría → bug por mostrar datos falsos como reales) (13/08)
- [x] Sprint 5: Presupuestos y Recurrentes conectados a datos reales (antes UI mock: no cargaban listas, submit/delete eran TODO) (13/08)
- [x] Presupuestos: formulario con MoneyInput (monto formateado es-CO) + moneda base visible; color de categoría con getColorValue (antes var(--...) inválido) (13/08)
- [x] Recurrentes: formulario con Combobox categoría/fuente (con búsqueda), MoneyInput, CurrencySelect; toggle activar/pausar y eliminar funcionales; botón "Generar ahora" (PATCH) (13/08)
- [x] Recurrentes generación (S5-04): conversión de moneda real usando TasasCambio + moneda base del usuario (antes hardcodeaba amountBase=monto y COP); fechas locales sin desfase UTC; lógica compartida en lib/recurrent-generator.ts usada por PATCH y cron (13/08)
- [x] Presupuestos GET: eliminado N+1 (antes 1 query por presupuesto; ahora 1 sola lectura de transacciones) (13/08)
- [x] Alerta de presupuesto al crear gasto (S5-03): POST /api/transacciones devuelve budgetAlert (80%→toast warning, 100%→toast error) (13/08)
- [x] "Fuentes" renombrado a "Medio de Pago"/"Medios de Pago" en toda la UI visible (sidebar, título de página, diálogos, filtros, tab de reportes, headers de tablas/CSV). Rutas, API y nombre de la hoja se mantienen internos (13/08)
- [x] Configuración: el selector de tema ahora aplica el cambio real (useTheme del ThemeProvider + localStorage); antes solo guardaba la preferencia sin cambiar light/dark (13/08)
- [x] Color de Davivienda en Fuentes: el seed usaba "red-600" que no existía en COLOR_VALUES (color inválido/transparente). Añadido red-600 al mapa, fallback #64748b en getColorValue para valores desconocidos, y seed actualizado a red-500/blue-500 (13/08)
- [x] Rendimiento: las rutas GET de transacciones/reportes/presupuestos/recurrentes pasan de 3-5 lecturas separadas a 1 batchGet (una sola llamada HTTP a Google Sheets) (13/08)
- [x] Rendimiento: recharts (gráficas) ya no se carga en el bundle principal de Reportes; se hace lazy-load (next/dynamic) en components/report-charts.tsx con placeholder de carga (13/08)
- [x] Recurrentes: nuevo campo "Descripción" (col O) que aparece como nota en cada transacción generada (si se deja vacío, cae al tag "Recurrente: <id>" anterior) (13/08)
- [x] Checkboxes reemplazados por Switch (patrón UI unificado): Activa en Recurrentes, alertas 80%/100% en Presupuestos (13/08)
- [x] Fuentes: "Saldo inicial" ahora usa MoneyInput (formato miles/decimales es-CO) como el resto de campos de dinero (13/08)
- [x] Sprint 6 (S6-01): `next build` vuelve a pasar completo con next-pwa activo — el error de prerender de las 8 páginas del dashboard ya no ocurre (14/08)
- [x] S6-02: manifest.json + iconos 192/512/maskable generados; layout enlaza manifest, apple-touch-icon y theme-color (14/08)
- [x] S6-03: cola offline — lib/offline-queue.ts (IndexedDB outbox, reintentos exponenciales, listeners online/visibility), lib/api-client.ts compartido por los 6 hooks; las mutaciones sin red se encolan, avisan "se guardó para sincronizar" y se sincronizan al reconectar; Background Sync (tag contabilidad-outbox) vía worker/index.js + customWorkerDir (14/08)
- [x] S6-05: tema persiste en localStorage + cookie (ThemeProvider) y el layout server lee la cookie para aplicar la clase antes de hidratar (sin flash de tema) (14/08)
- [x] S6-06: tests unitarios nuevos — validation.ts (schemas transacciones/categorías/fuentes/presupuestos/recurrentes/config), encryption.ts (roundtrip, IVs únicos, datos corruptos), generador recurrente con mock de Sheets (4 casos: genera, nota descripción, omite no vencidas, conversión moneda). 46 tests verdes (14/08)
- [x] S6-04: error boundaries (app/error.tsx global, app/dashboard/error.tsx), skeleton de carga (app/dashboard/loading.tsx), página 404 (app/not-found.tsx) (14/08)
- [x] Transacciones "no cargaban" tras el batchGet: Google normaliza los rangos devueltos (p.ej. "Transacciones!A1:M1000") y las rutas buscaban la clave exacta pedida → 200 con lista vacía. Fix: batchGet normaliza las claves al rango solicitado (lib/google-sheets.ts) + test de regresión (14/08)
- [x] S6-07 (E2E): descubierto que en producción (next start / Vercel) Auth.js rechaza /api/auth/* con "UntrustedHost" — añadido `trustHost: true` a authOptions (en dev localhost se auto-confía, por eso no se veía). Sin esto, login y sesión fallarían en el deploy (14/08)
- [x] S6-07 (E2E): los E2E usan servidor de producción (build + start) porque el dev server compila por demanda y el navegador podía recibir un chunk a medias ("Invalid or unexpected token") en la 1ª carga de cada ruta (14/08)
- [x] Lint roto: eslint.config.mjs usaba `eslint/config` (API de ESLint 9) con ESLint 8.57 instalado → `next lint` caía en prompt interactivo. Migrado a `.eslintrc.json` (next/core-web-vitals, next 14.2) + comillas escapadas en Configuración (14/08)
- [x] S6-08: workflow CI en `.github/workflows/ci.yml` (typecheck + lint + vitest, E2E Playwright con upload de report en fallo) + Lighthouse CI con `lighthouserc.js` (budgets Perf > 90, A11y > 95; sesión forjada por cookie para auditar páginas autenticadas) (14/08)
- [x] CRÍTICO monedas: gasto/ingreso en moneda distinta a la base no se registraba en el dashboard (amountBase NaN/vacío → 0 en reportes). Causa raíz (14/08):
  1. Frankfurter.dev/ECB **no publica COP** → el auto-refresh escribía NaN en `TasasCambio` SIEMPRE (celda vacía).
  2. `getCopRates` devolvía la tasa **invertida** (unidades por 1 COP) mientras toda la conversión multiplica `monto × tasa` (COP por unidad) → incluso con tasa válida el monto era 4.000× menor.
  3. `getRate` caía a **1.0** silencioso sin tasa (p.ej. MXN nunca se fetcheaba: solo USD/EUR).
  4. PATCH concurrente (cron + auto-refresh de Configuración) duplicaba filas.
  Fix: proveedor → open.er-api.com (166 monedas, COP incluido), `getCopRates` corregido + validado (`isFinite`), `getRate` lanza error claro ("Actualiza las tasas en Configuración"), PATCH valida/dedupe filas corruptas, POST manual valida `isFinite`, columna **Moneda** en transacciones (desktop + card móvil), aviso ámbar en el formulario si falta la tasa. Datos corruptos de la hoja real eliminados (transacción USD rota + filas de tasas vacías).
- [x] Drawer móvil: botón de cerrar duplicado (el SheetContent de Radix renderiza su propio X y el sidebar añadía otro). Añadida prop `hideCloseButton` al SheetContent (15/08)
- [x] Móvil: los toasts ahora salen abajo (position bottom-center en < 768px vía matchMedia) para no tapar el menú del header (15/08)
- [x] Recurrentes: DELETE /api/recurrentes solo pausaba (escribía isActive=FALSE). Ahora borra la fila físicamente con deleteRows (15/08)
- [x] Cambio de moneda base en tiempo real: antes cambiar COP→USD solo cambiaba el formato (decimales), no los valores. Ahora reportes, presupuestos (límite + gasto) y la alerta de presupuesto convierten cada transacción desde su moneda base almacenada (col F) a la base actual usando las tasas de la fecha. Presupuestos guardan su moneda base (col H, default COP) (15/08)
- [x] Monedas activas: al activar una moneda se actualiza su tasa al instante (PATCH); las tasas son de solo lectura (eliminados el input manual y el botón Guardar + API POST + hook useOverrideRate) (15/08)
- [x] Cohesión de formularios: nuevo MoneyField (icono $ + pl-9, mismo diseño que Monto en nueva transacción) aplicado a Límite mensual (presupuesto) y Monto (recurrente) (15/08)
- [x] Evolución mensual: eliminada la barra de Balance del gráfico (quedaban Ingresos verdes y Gastos rojos, más natural) (15/08)

## Diferidos (backlog)
- **Drag & drop para reordenar categorías/fuentes** (icono de arrastre a la izquierda). Requiere @dnd-kit o similar. No está en el plan de sprints actual. Prioridad: media.
- **Eliminar "Saldo inicial" de fuentes**: está contemplado en el plan (S2-11) para el balance por fuente en reportes. Decisión pendiente.
- **Diseño móvil**: todo el dashboard no está adaptado a pantallas pequeñas. Pendiente de Sprint 6 (polish) o "port" móvil.
