# Growth Agent — MunoLabs Tech Case

PM-style conversational agent over Linear + Notion (real) + 8 mocked sources (Slack, Granola, Calendar, Drive, GitHub, Obsidian, PostHog, WhatsApp).

## Stack
Next.js 16 · React 19 · Tailwind 4 · AI SDK v6 + DeepSeek (`deepseek-chat`) · Better Auth · Drizzle + NeonDB.

## Setup local

1. `cp .env.example .env.local` and fill values:
   - `DEEPSEEK_API_KEY` from <https://platform.deepseek.com/api_keys>
   - `LINEAR_API_KEY` from Linear → Settings → API → Personal API keys
   - `NOTION_API_KEY` from <https://notion.so/my-integrations> (then share target pages with the integration)
   - `DATABASE_URL` from Neon
   - `BETTER_AUTH_SECRET` — any 32-char random string (`openssl rand -base64 32`)
2. `npm install`
3. `npm run db:push` to apply schema
4. `npm run db:seed` to create the 2 demo users
5. `npm run dev`

Demo users (password `password123`):
- `founder@muno.lab` — access to all 3 clients (Acme, Beta, Gamma)
- `lead@muno.lab` — access only to Acme

## Demo prompts
1. ¿Cómo va Acme esta semana?
2. ¿Qué proyectos están en riesgo?
3. Prepárame brief para reunión mañana con Beta.
4. ¿Qué quedó con el copy de Acme? *(escenario conflicto)*
5. Crea task en Linear para Acme: revisar copy con cliente. → `/pending` → Confirm.

## Decisiones de diseño (respuestas a las preguntas guía del PDF)

### WAYRTTD
> Hacer que el estado operativo de N clientes deje de vivir en cabezas humanas. El agente es la memoria operativa de la agencia, no un buscador.

### Integración (lectura en tiempo real vs pre-indexado)
Tool-calling live para v1 — toda fuente se lee on-demand cuando el LLM decide. Razón: cubre el principio de "frescura" sin construir un pipeline de embeddings que añadiría 2h sin beneficio para los volúmenes de un demo. Evolución natural: cuando Notion crezca >1k pages por cliente, pre-indexar Notion solamente.

### Escritura y autonomía
El agente PROPONE escrituras vía `linear_create_issue` y `notion_append_block`, pero NUNCA ejecuta directo. Cada llamada inserta un `write_intent` en Postgres y retorna `intent_id + preview` al LLM. El usuario ve la card en `/pending` y aprueba o rechaza. La autonomía es human-in-the-loop. Razón: en agencia B2B, escribir mal en Linear/Notion afecta al cliente final — la confirmación es barata y la confianza alta.

### MCP vs API directa vs scrape
API directa para v1 (Linear GraphQL, Notion REST). Da control fino del shape del tool result, latencia menor, tipos propios. MCP sería atractivo si la agencia ya tuviera un MCP server interno y se quisieran swappear fuentes sin recompilar — para 2 fuentes reales, overkill. Scrape se reserva como último recurso para canales sin API estable (ej: WhatsApp Web).

### Permisos
Tokens Linear/Notion son **de servicio** (uno solo, en `.env`) — la app vive contra el workspace de la agencia. Lo que cambia por usuario es **qué `client_id`s puede consultar**, no qué token usa. Esto es realista para una agencia donde todos los líderes ven los workspaces compartidos. Implementado vía tabla `user_client_access`. OAuth por usuario está fuera de v1 — sería necesario si cada cliente final tuviera workspace propio y la agencia entrara como guest individual.

### Conflicto entre fuentes
El system prompt instruye al agente a (a) ordenar fuentes cronológicamente, (b) detectar contradicciones explícitas, (c) listar cada fuente con timestamp, (d) flag `⚠️ Estado contradictorio` cuando aplica, (e) recomendar el último signal como estado actual pero pidiendo confirmación con el autor. NUNCA inventa consenso. El escenario está seedeado built-in en fixtures (Acme `copy_strategy`).

### Costo de integrar todo v1 — las 3 reales que arrancaría
**Linear + Notion + Granola/Circleback**:
- Notion = qué prometimos (wiki canónica)
- Linear = en qué estamos (tareas/proyectos)
- Granola = qué se dijo último (transcripts de reuniones)

Cubren el ciclo prometido → en curso → último signal. Slack/WhatsApp dejé fuera porque su alto volumen y ruido necesitan clustering/dedup antes de ser útiles al LLM.

### Guardrails
- Citas obligatorias (fuente + timestamp + URL)
- "No sé" explícito ante tools vacíos
- Writes siempre con human-in-the-loop
- `stepCountIs(8)` evita loops
- Scope lock — agente no responde por clientes fuera del acceso del user
- Audit log de toda escritura confirmada en Postgres

### Arquitectura (componentes)
```
Browser → proxy.ts (auth gate) → /api/chat (streamText + tools) → Linear/Notion/Mocks
                                       ↓
                                 write_intents → /api/intents/[id] (confirm) → real write + audit
                                       ↓
                                NeonDB (sessions, messages, intents, audit, access)
```

## Deploy

```bash
npx vercel
```

En el dashboard de Vercel set las mismas env vars de `.env.local`, ajustando `BETTER_AUTH_URL` y `NEXT_PUBLIC_BETTER_AUTH_URL` a la URL prod.
