# Growth Agent — Design Spec

**Project**: MunoLabs Tech & Growth Agent — prueba técnica
**Date**: 2026-06-02
**Status**: Approved for implementation

---

## 1. WAYRTTD (What Are You Really Trying To Do)

> Hacer que el estado operativo de N clientes deje de vivir en cabezas humanas. El agente es la **memoria operativa de la agencia**, no un buscador ni un chatbot.

El éxito no se mide en "respondió la pregunta". Se mide en: ¿un founder puede empezar su día sin pedir update a nadie? ¿Un líder de cuenta entra a una reunión sin prep manual?

## 2. Usuarios y identidad del agente

- **Usuarios**: founders + líderes de cuenta de la agencia (internos, no clientes finales).
- **Identidad del agente**: Project Manager con criterio. Responde como PM: bullets accionables, riesgos explícitos, próximos pasos, brief para reuniones, "qué prometimos vs qué entregamos". No es un chatbot conversacional.

## 3. Stack técnico

| Capa | Elección | Razón |
|------|----------|-------|
| Framework | Next.js 16 App Router + React 19 | Scaffold existente; streaming nativo; deploy Vercel one-click |
| Estilos | Tailwind 4 | Ya configurado |
| LLM | DeepSeek `deepseek-chat` (V3) via `@ai-sdk/deepseek` | Tool calling sólido; costo bajo; ya soportado por AI SDK v6. NO usar `deepseek-reasoner` (R1) — tool calling históricamente flojo |
| Agent runtime | Vercel AI SDK v6 `streamText` + `tool()` | Streaming UI nativo, multi-step con `stepCountIs(8)`, schema validation con Zod |
| Auth | Better Auth + Drizzle adapter | TypeScript-first, Next.js 16 `proxy.ts` nativo, 2 users seed para demo multi-permisos |
| DB | NeonDB (Postgres serverless) | Vercel Marketplace, free tier suficiente para demo |
| ORM | Drizzle ORM | Tipado fuerte, migrations declarativas, mismo schema usado por Better Auth |
| Deploy | Vercel | Native AI SDK + Neon integration |

## 4. Fuentes de datos

### 4.1 Reales
- **Linear**: GraphQL API, personal token. Lee issues, projects, cycles. Escribe issues.
- **Notion**: REST API, integration token. Lee páginas, búsqueda. Escribe appends a páginas.

### 4.2 Mockeadas (misma interfaz tipada)
Slack, Granola/Circleback, Google Calendar, Google Drive, GitHub, Obsidian, PostHog, WhatsApp. Fixtures JSON in-memory con records realistas.

**Razón de mockear**: el escenario de conflicto del PDF (Granola vs Linear vs Slack vs Notion) requiere ≥4 fuentes para ser demostrable. Sin mocks, demo cojo. Mocks comparten la misma firma de tool que las reales — el agente no distingue. Swap a real = cambiar adapter.

### 4.3 Interfaz uniforme
```ts
type SourceRecord = {
  source: 'linear' | 'notion' | 'slack' | 'granola' | 'gcal'
        | 'gdrive' | 'github' | 'obsidian' | 'posthog' | 'whatsapp'
  client_id: string         // "acme", "beta", "gamma"
  timestamp: string         // ISO 8601
  author: string
  content: string           // text or summary
  url?: string              // deep link
  metadata?: Record<string, unknown>
}
```

## 5. Arquitectura

```
┌─ UI (Next.js App Router) ────────────────────────────┐
│  /sign-in       → email/password (Better Auth)        │
│  /              → chat + sidebar clientes (scoped)   │
│  /pending       → cola de write intents del user      │
└────────┬─────────────────────────────────────────────┘
         │ requests → proxy.ts (Next.js 16)
┌────────▼─────────────────────────────────────────────┐
│  proxy.ts → auth.api.getSession                      │
│  no session → redirect /sign-in                      │
└────────┬─────────────────────────────────────────────┘
         │ POST /api/chat (streaming, autenticado)
┌────────▼─────────────────────────────────────────────┐
│  Agent Core (/api/chat/route.ts)                     │
│  - lee session.user.id                                │
│  - resuelve user_client_access[]                      │
│  - streamText + tools (AI SDK v6)                    │
│  - model: deepseek('deepseek-chat')                  │
│  - stopWhen: stepCountIs(8)                          │
│  - system: PM prompt + guardrails + clientes user    │
└────────┬─────────────────────────────────────────────┘
         │
┌────────▼─────────────┐  ┌──────────────────────────┐
│  Read Tools          │  │  Write Tools (intent)    │
│  (validan client_id  │  │  linear_create_issue     │
│   contra access)     │  │  notion_append_block     │
│  search_linear       │  │  → encolan en DB         │
│  search_notion       │  │    no ejecutan           │
│  ...                 │  └──────────┬───────────────┘
│  (10 tools, 2 real)  │             │
└────────┬─────────────┘             │
         │                           │
┌────────▼───────────────────────────▼─────────────────┐
│  Drizzle + NeonDB                                    │
│  Better Auth: users, sessions, accounts              │
│  App: chat_sessions, messages, write_intents,        │
│       audit_log, user_client_access                  │
└──────────────────────────────────────────────────────┘
         ▲
         │ POST /api/intents/[id]/confirm
         │ verifica acceso → ejecuta write real → audit
         └─ desde UI /pending
```

## 6. Components

### `/src/lib/db/`
- `schema.ts` — Drizzle schema:
  - Better Auth tables: `users`, `sessions` (auth), `accounts`, `verifications`
  - App tables: `chat_sessions`, `messages`, `write_intents` (status: pending/confirmed/rejected/failed), `audit_log`
  - Custom: `user_client_access` (rows `{user_id, client_id}` para scoped permissions)
- `client.ts` — Neon HTTP client + Drizzle instance
- `migrations/` — drizzle-kit generated
- `seed.ts` — 2 users hardcoded (`founder@muno.lab` con acceso a Acme+Beta+Gamma; `lead@muno.lab` solo Acme) + mock fixtures

### `/src/lib/auth/`
- `index.ts` — `betterAuth({...})` con Drizzle adapter Postgres, email/password provider, session expiry
- `client.ts` — `authClient` para usar en componentes Client
- `/src/app/api/auth/[...all]/route.ts` — handler estándar Better Auth

### `/src/lib/sources/`
- `types.ts` — `SourceRecord`, `ClientId`, tool input/output schemas
- `linear.ts` — `searchIssues`, `getIssue`, `createIssue` (REAL via GraphQL)
- `notion.ts` — `search`, `getPage`, `appendBlock` (REAL via REST)
- `mocks/fixtures.ts` — seed data: 3 clientes (Acme, Beta, Gamma) con records en cada fuente, incluyendo escenario conflicto built-in
- `mocks/{slack,granola,gcal,gdrive,github,obsidian,posthog,whatsapp}.ts` — adapters in-memory que filtran fixtures por `client_id`, `query`, `since`

### `/src/lib/agent/`
- `prompt.ts` — system prompt PM-style con guardrails (ver §8)
- `tools.ts` — definiciones AI SDK `tool({inputSchema, execute})` envolviendo sources. Tools de escritura insertan `write_intents` row y devuelven `{intent_id, preview, requires_confirmation: true}`

### `/src/app/api/`
- `chat/route.ts` — POST streaming, `streamText`, retorna `UIMessageStreamResponse`. Lee `session.user.id` via `auth.api.getSession`, filtra tools por `user_client_access`.
- `intents/[id]/route.ts` — POST `{action: 'confirm' | 'reject'}`. Verifica que el intent pertenece a un cliente que el user tiene acceso. Si confirm: ejecuta write real, escribe `audit_log` (incluye `user_id`), marca intent como `confirmed`.

### `/proxy.ts` (Next.js 16 raíz)
Proxy de Next.js 16 que valida session via `auth.api.getSession`. Rutas protegidas: `/`, `/pending`, `/api/chat`, `/api/intents/*`. No autenticado → redirect a `/sign-in`.

### `/src/app/`
- `sign-in/page.tsx` — form email/password (Better Auth client)
- `page.tsx` — chat con `useChat` (AI SDK), sidebar clientes (filtrado por permisos del user logueado), render de tool-calls inline (mostrando qué fuente consultó), badge cuando hay intents pending. Muestra `session.user.name` en header.
- `pending/page.tsx` — lista intents pendientes del user actual, card por cada uno con preview + botones Confirm/Reject

## 7. Manejo de conflicto entre fuentes

System prompt instruye al agente:

1. Cuando hay múltiples records sobre el mismo tema, ordenar por timestamp asc.
2. Detectar contradicciones explícitas (mismo sujeto, conclusiones distintas).
3. Responder con bloque ordenado:
   - "Granola (2026-05-26): decidieron X"
   - "Linear ABC-123 (2026-05-27): tarea Y cerrada"
   - "Slack #acme (2026-05-28): hilo propone Z"
   - "Notion 'Copy Acme' (2026-05-15, stale): aún dice X"
4. Recomendar el más reciente como estado actual, **flag explícito** de conflicto: "⚠️ Estado contradictorio entre fuentes. Último signal fue Slack jueves. Confirmar con [autor]."
5. **Nunca** inventar consenso ni elegir silenciosamente.

Mock seed incluye este escenario built-in para Acme con `copy_strategy` como tema.

## 8. Guardrails LLM

- **Citas obligatorias**: toda afirmación cita fuente + timestamp + URL (cuando aplica). Sin cita, no se dice.
- **"No sé" explícito**: si tools retornan vacío, agente dice "no tengo data sobre X en [fuentes consultadas]". No inventa.
- **Writes con human-in-the-loop**: writes nunca ejecutan directo. Siempre encolan intent → UI confirm.
- **Step limit**: `stepCountIs(8)` evita loops infinitos.
- **Scope lock**: system prompt rechaza preguntas fuera de los 3 clientes seeded. No habla de personal/founder/empresa.
- **Audit log**: toda escritura confirmada registra `{user, intent, executed_at, result}` en Postgres.
- **Rate limit**: middleware simple por session, 30 msg/min.

## 9. Permisos (implementado en v1)

**Stack auth**: Better Auth + Drizzle adapter Postgres. Email/password (sin OAuth en v1 para ahorrar tiempo).

**Modelo**:
- Tabla `users` (gestionada por Better Auth) + tabla custom `user_client_access` con rows `{user_id, client_id}`.
- Tokens de Linear/Notion son **de servicio** (uno solo, en `.env`) — la app accede a la cuenta de la agencia, no del usuario. Lo que cambia por user es **qué `client_id`s puede consultar**, no qué token usa.
- `proxy.ts` valida sesión en todas las rutas protegidas.
- `/api/chat` lee `session.user.id` y filtra:
  - Tools de read: si el LLM intenta `search_linear(client_id="acme")` y el user no tiene acceso a Acme → tool devuelve `{error: "no access to client acme"}` y el agente responde "No tengo acceso a ese cliente en tu workspace".
  - Tools de write: misma validación antes de encolar intent.
- Sidebar UI muestra solo clientes accesibles para el user logueado.
- Audit log incluye `user_id` en cada escritura confirmada.

**Seed (2 users hardcoded para demo)**:
- `founder@muno.lab` / `password123` → acceso a Acme, Beta, Gamma (todos)
- `lead@muno.lab` / `password123` → acceso solo a Acme

**Demo del escenario PDF** (líder de cuenta pregunta por proyecto que no es suyo):
- Login como `lead@muno.lab` → preguntar "¿cómo va Beta?" → agente responde "No tengo acceso a Beta en tu workspace. Tu workspace incluye: Acme."

**Out of scope (documentado en README)**: OAuth flows (Google/GitHub), scoped Linear/Notion tokens por user, organizations/teams, RBAC granular más allá de `client_id`. La arquitectura ya está lista para extenderse — solo es añadir providers a Better Auth y otra tabla `roles`.

## 10. MCP vs API directa vs scrape

**v1 = API directa** (Linear GraphQL, Notion REST). Razones:

| Opción | Pro | Contra |
|--------|-----|--------|
| API directa | Control fino de tool result shape; latencia mínima; tipos propios | Mantienes wrappers |
| MCP | Plug-and-play, swap fuentes fácil | Shape genérico, harder a sintonizar para criterio PM, latencia extra |
| Scrape | Cuando no hay API (WhatsApp Web?) | Frágil, ToS riesgo, último recurso |

**Decisión**: directa para v1. MCP atractivo cuando agencia ya tenga su MCP server interno y quieras swap fuentes sin recompilar. Para prototype con 2 fuentes reales, overkill.

## 11. Costo de integrar todo v1 — las 3 primeras

Aunque mockeamos 8, si tuviéramos que integrar 3 reales, serían **Linear + Notion + Granola/Circleback**. Razón:

- **Notion** = "qué prometimos / wiki canónica"
- **Linear** = "en qué estamos / qué se entregó"
- **Granola** = "qué se dijo último en la reunión"

Las 3 cubren el ciclo prometido → en progreso → último signal. Slack/WhatsApp tienen alto volumen y ruido — segunda iteración con clustering/dedup. GitHub/PostHog son útiles para clientes técnicos específicos, no universales.

## 12. Demo flow (15 min)

0. **Login como `founder@muno.lab`** → sidebar muestra Acme, Beta, Gamma.
1. **"¿cómo va Acme esta semana?"**
   → tools llamados: `search_linear(acme, since=7d)`, `search_notion(acme)`, `search_granola(acme, since=7d)`, `search_slack(acme, since=7d)`
   → respuesta: bullets status + citas + timestamps
2. **"¿qué proyectos en riesgo?"**
   → criterio PM: Linear issues bloqueados + sin actividad >7d + flags Granola
   → respuesta agrupada por cliente con razón
3. **"prepárame brief reunión mañana con Beta"**
   → `search_gcal(beta)` + `search_notion(beta)` + `search_linear(beta, status=open)`
   → respuesta: contexto, pendientes, talking points, prep questions
4. **"¿qué quedó con el copy de Acme?"** ← escenario conflicto built-in
   → agente lista 4 fuentes ordenadas, flag contradicción, recomienda último signal
5. **"crea task de seguimiento en Linear para Acme: revisar copy con cliente"**
   → encola `write_intent` → UI muestra preview card → confirm → ejecuta Linear API real → audit log
6. **Sign out → login como `lead@muno.lab`** → sidebar muestra solo Acme.
7. **"¿cómo va Beta?"** ← pregunta del PDF: líder pregunta por proyecto que no es suyo
   → tool retorna `{error: "no access to client beta"}` → agente responde:
   *"No tengo acceso a Beta en tu workspace. Tienes acceso solo a: Acme. Pídele a un founder que te asigne acceso si lo necesitas."*

## 13. Out of scope v1 (documentado en README)

- **Integraciones reales de Slack/WhatsApp/Granola/etc**: mockeadas con misma interfaz. Razón: cada una requiere OAuth + workspace de prueba (Slack ~1h, Granola es invitación, WhatsApp Business API son días). Mock cubre el escenario de conflicto del PDF sin esos costos.
- **RAG pre-indexado con embeddings**: decisión de arquitectura, no punt. Tool-calling live es una sola estrategia bien implementada vs dos a medias. Mencionado en README como evolución natural cuando volumen Notion crezca.
- **OAuth flows + scoped tokens por user**: v1 usa email/password + tokens Linear/Notion de servicio. La separación `user_client_access` ya prepara la arquitectura para OAuth real.
- **Memoria long-term sofisticada (summaries cross-session, extracción de hechos)**: v1 persiste mensajes raw por `chat_session`. Suficiente para demo.
- **Notificaciones proactivas** (`"ojo, esto está en riesgo"`): paradigma distinto (cron + push). Agente v1 es reactivo only.
- **Eval set / golden answers**: workstream separado de calidad. Mencionado en README como siguiente paso para producción.

## 14. Plan de testing

- **Manual**: 5 prompts del demo flow ejecutan end-to-end sin error
- **Unit**: tool input schemas validados con Zod (free)
- **Integration**: `/api/chat` test que mockea LLM y verifica que tools se invocan
- **Demo dry-run**: full flow ejecutado 2x antes de live para confirmar mocks responden + Linear/Notion no rate-limit

## 15. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|-----------|
| DeepSeek tool calling falla con muchas tools (10+) | Limitar tools registradas a las 12 críticas; si falla, fallback a `gpt-4o-mini` via AI Gateway |
| Linear/Notion rate limit en demo | Workspace de prueba con pocos calls; cache simple in-memory por session |
| Neon cold start en Vercel | Connection pooling + serverless driver |
| Mock data poco realista en demo | Fixtures revisadas con escenarios PDF explícitos |
| LLM inventa cita | System prompt estricto + post-validation que cada cita matchea un tool result |
