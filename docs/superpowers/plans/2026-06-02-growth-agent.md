# Growth Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working PM-style conversational agent over Linear (real) + Notion (real) + 8 mocked sources, with multi-user auth and human-in-the-loop write-back, deployed on Vercel.

**Architecture:** Next.js 16 App Router. Tool-calling-live agent (AI SDK v6 + DeepSeek). Better Auth (email/password) gates the app via `proxy.ts`. Drizzle + NeonDB persist sessions/messages/intents/audit. Write tools enqueue intents that user confirms in `/pending` before they execute against Linear/Notion APIs.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, AI SDK v6, `@ai-sdk/deepseek`, Better Auth, Drizzle ORM, NeonDB, Linear GraphQL, Notion REST.

**Testing approach:** Prototype-grade. Light strategic tests for high-value, easy-to-break logic (Zod tool schemas, access check, intent confirmation idempotency). No full TDD per task — 4h budget. Manual smoke test of demo flow before deploy.

**Commit style:** Conventional Commits. No Claude attribution in trailers.

---

## File Map

```
prueba-munolabs/
├── .env.example                              [Create]
├── drizzle.config.ts                         [Create]
├── proxy.ts                                  [Create] Next 16 proxy
├── README.md                                 [Rewrite]
├── docs/superpowers/                         [exists]
└── src/
    ├── app/
    │   ├── layout.tsx                        [Modify minimally]
    │   ├── page.tsx                          [Rewrite] chat shell
    │   ├── globals.css                       [Modify]
    │   ├── sign-in/page.tsx                  [Create]
    │   ├── pending/page.tsx                  [Create]
    │   ├── api/
    │   │   ├── auth/[...all]/route.ts        [Create] Better Auth handler
    │   │   ├── chat/route.ts                 [Create] streamText
    │   │   └── intents/[id]/route.ts         [Create] confirm/reject
    │   └── _components/
    │       ├── chat.tsx                      [Create] useChat client
    │       ├── sidebar.tsx                   [Create] scoped clients
    │       └── intent-card.tsx               [Create]
    └── lib/
        ├── db/
        │   ├── schema.ts                     [Create] all tables
        │   ├── client.ts                     [Create] Drizzle + Neon
        │   └── seed.ts                       [Create] users + access
        ├── auth/
        │   ├── index.ts                      [Create] betterAuth instance
        │   └── client.ts                     [Create] createAuthClient
        ├── sources/
        │   ├── types.ts                      [Create] SourceRecord, ClientId
        │   ├── linear.ts                     [Create] REAL GraphQL
        │   ├── notion.ts                     [Create] REAL REST
        │   └── mocks/
        │       ├── fixtures.ts               [Create] all seed data
        │       ├── slack.ts                  [Create]
        │       ├── granola.ts                [Create]
        │       ├── gcal.ts                   [Create]
        │       ├── gdrive.ts                 [Create]
        │       ├── github.ts                 [Create]
        │       ├── obsidian.ts               [Create]
        │       ├── posthog.ts                [Create]
        │       └── whatsapp.ts               [Create]
        └── agent/
            ├── prompt.ts                     [Create] PM system prompt
            ├── tools.ts                      [Create] 10 AI SDK tools
            └── access.ts                     [Create] client access check
```

---

## Phase A: Foundation (Tasks 1–5)

### Task 1: Install deps + env template

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Install runtime + dev deps**

Run:
```bash
npm install ai @ai-sdk/deepseek @ai-sdk/react zod \
  better-auth \
  drizzle-orm @neondatabase/serverless \
  @notionhq/client
npm install -D drizzle-kit tsx dotenv
```

Expected: clean install, no peer warnings (or only minor ones).

- [ ] **Step 2: Create `.env.example`**

```bash
# LLM
DEEPSEEK_API_KEY=sk-deepseek-xxx

# Sources (REAL)
LINEAR_API_KEY=lin_api_xxx
NOTION_API_KEY=ntn_xxx

# DB
DATABASE_URL=postgresql://user:pass@xxx.neon.tech/dbname?sslmode=require

# Auth
BETTER_AUTH_SECRET=replace_with_32_char_random
BETTER_AUTH_URL=http://localhost:3000
```

- [ ] **Step 3: Verify `.gitignore` excludes `.env.local`**

If missing, append:
```
.env.local
.env*.local
```

- [ ] **Step 4: Create `.env.local` (user does this manually)**

User must copy `.env.example` → `.env.local` and fill real values. Document in README.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore
git commit -m "build: add core deps for agent, auth, db, sources"
```

---

### Task 2: Drizzle config + DB client

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/lib/db/client.ts`

- [ ] **Step 1: Create `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Create `src/lib/db/client.ts`**

```ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 3: Commit**

```bash
git add drizzle.config.ts src/lib/db/client.ts
git commit -m "build: configure drizzle + neon client"
```

---

### Task 3: Drizzle schema (all tables)

**Files:**
- Create: `src/lib/db/schema.ts`

- [ ] **Step 1: Create schema with Better Auth + app tables**

```ts
import { pgTable, text, timestamp, boolean, uuid, jsonb, integer, primaryKey } from 'drizzle-orm/pg-core';

// ---- Better Auth tables (per Better Auth Drizzle adapter spec) ----
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ---- App tables ----
export const userClientAccess = pgTable('user_client_access', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  clientId: text('client_id').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.clientId] }),
}));

export const chatSession = pgTable('chat_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New chat'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const message = pgTable('message', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatSessionId: uuid('chat_session_id').notNull().references(() => chatSession.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant' | 'tool'
  content: jsonb('content').notNull(), // UIMessage parts
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const writeIntent = pgTable('write_intent', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  chatSessionId: uuid('chat_session_id').references(() => chatSession.id, { onDelete: 'set null' }),
  clientId: text('client_id').notNull(),
  tool: text('tool').notNull(), // 'linear_create_issue' | 'notion_append_block'
  payload: jsonb('payload').notNull(),
  preview: text('preview').notNull(),
  status: text('status').notNull().default('pending'), // pending | confirmed | rejected | failed
  result: jsonb('result'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  executedAt: timestamp('executed_at'),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id),
  intentId: uuid('intent_id').references(() => writeIntent.id),
  action: text('action').notNull(),
  detail: jsonb('detail'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

- [ ] **Step 2: Generate migration**

Run: `npx drizzle-kit generate`
Expected: creates `drizzle/0000_*.sql`.

- [ ] **Step 3: Push schema to Neon**

Run: `npx drizzle-kit push`
Expected: applies tables. Confirm any prompts.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat(db): add Better Auth + app schema (users, intents, audit)"
```

---

### Task 4: Better Auth instance + handler + client

**Files:**
- Create: `src/lib/auth/index.ts`
- Create: `src/lib/auth/client.ts`
- Create: `src/app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Create Better Auth server instance**

`src/lib/auth/index.ts`:
```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db/client';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
});
```

- [ ] **Step 2: Create client**

`src/lib/auth/client.ts`:
```ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000',
});

export const { signIn, signOut, useSession } = authClient;
```

- [ ] **Step 3: Create catch-all handler**

`src/app/api/auth/[...all]/route.ts`:
```ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 4: Add `NEXT_PUBLIC_BETTER_AUTH_URL` to `.env.example`**

```bash
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

- [ ] **Step 5: Verify `tsconfig.json` has `@/*` path alias**

Read `tsconfig.json`. If `"@/*": ["./src/*"]` missing under `paths`, add it.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/ src/app/api/auth/ .env.example tsconfig.json
git commit -m "feat(auth): add Better Auth + Drizzle adapter setup"
```

---

### Task 5: Seed users + client access

**Files:**
- Create: `src/lib/db/seed.ts`
- Modify: `package.json` (add seed script)

- [ ] **Step 1: Create seed script**

`src/lib/db/seed.ts`:
```ts
import 'dotenv/config';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { userClientAccess, user as userTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const USERS = [
  { name: 'Founder', email: 'founder@muno.lab', password: 'password123', clients: ['acme', 'beta', 'gamma'] },
  { name: 'Lead', email: 'lead@muno.lab', password: 'password123', clients: ['acme'] },
];

async function main() {
  for (const u of USERS) {
    const existing = await db.select().from(userTable).where(eq(userTable.email, u.email));
    let userId: string;
    if (existing.length > 0) {
      userId = existing[0].id;
      console.log(`exists: ${u.email}`);
    } else {
      const res = await auth.api.signUpEmail({ body: { email: u.email, password: u.password, name: u.name } });
      userId = res.user.id;
      console.log(`created: ${u.email}`);
    }
    for (const clientId of u.clients) {
      await db.insert(userClientAccess).values({ userId, clientId }).onConflictDoNothing();
    }
  }
  console.log('seed done');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add seed script to `package.json`**

In `"scripts"`:
```json
"db:seed": "tsx src/lib/db/seed.ts",
"db:push": "drizzle-kit push",
"db:generate": "drizzle-kit generate"
```

- [ ] **Step 3: Run seed**

Run: `npm run db:seed`
Expected: "created: founder@muno.lab", "created: lead@muno.lab", "seed done".

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/seed.ts package.json
git commit -m "feat(db): add seed for 2 demo users with scoped client access"
```

---

## Phase B: Source Layer (Tasks 6–10)

### Task 6: SourceRecord types + ClientId

**Files:**
- Create: `src/lib/sources/types.ts`

- [ ] **Step 1: Create types**

```ts
import { z } from 'zod';

export const CLIENT_IDS = ['acme', 'beta', 'gamma'] as const;
export type ClientId = (typeof CLIENT_IDS)[number];

export const SOURCES = [
  'linear', 'notion', 'slack', 'granola', 'gcal',
  'gdrive', 'github', 'obsidian', 'posthog', 'whatsapp',
] as const;
export type Source = (typeof SOURCES)[number];

export type SourceRecord = {
  source: Source;
  client_id: ClientId;
  timestamp: string;          // ISO 8601
  author: string;
  content: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

export const clientIdSchema = z.enum(CLIENT_IDS);
export const searchInputSchema = z.object({
  client_id: clientIdSchema,
  query: z.string().optional().describe('keywords to filter results'),
  since: z.string().optional().describe('ISO timestamp lower bound'),
});
export type SearchInput = z.infer<typeof searchInputSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sources/types.ts
git commit -m "feat(sources): add SourceRecord types and client/search schemas"
```

---

### Task 7: Mock fixtures (with conflict scenario)

**Files:**
- Create: `src/lib/sources/mocks/fixtures.ts`

- [ ] **Step 1: Write fixtures with all 3 clients across 8 mocked sources, including conflict scenario for Acme `copy_strategy`**

```ts
import type { SourceRecord } from '../types';

export const fixtures: SourceRecord[] = [
  // -------- ACME — conflict scenario built-in (copy_strategy) --------
  { source: 'granola', client_id: 'acme', timestamp: '2026-05-26T14:00:00Z',
    author: 'Granola summary', url: 'mock://granola/acme-2026-05-26',
    content: 'Reunión con Acme. Decisión: pivotamos copy de landing a versión X (foco en outcome). Próximo paso: implementar en home.' },
  { source: 'linear', client_id: 'acme', timestamp: '2026-05-27T09:00:00Z',
    author: 'María', url: 'mock://linear/ACME-101',
    content: 'ACME-101 "Implementar copy versión Y en home" → estado: Done' },
  { source: 'slack', client_id: 'acme', timestamp: '2026-05-28T18:30:00Z',
    author: 'Diego', url: 'mock://slack/acme-thread-882',
    content: 'Hilo #acme: "ojo equipo, X y Y no están funcionando en pruebas. Propongo cambiar a versión Z, más directa al CTA. Voto?"' },
  { source: 'notion', client_id: 'acme', timestamp: '2026-05-15T10:00:00Z',
    author: 'Sofía', url: 'mock://notion/acme-copy-doc',
    content: 'Doc "Copy oficial Acme" — versión vigente: X. (no editado desde 2026-05-15)' },

  // -------- ACME — otros datos --------
  { source: 'gcal', client_id: 'acme', timestamp: '2026-06-03T15:00:00Z',
    author: 'Calendar', url: 'mock://cal/acme-weekly',
    content: 'Reunión semanal Acme mañana 15:00. Asistentes: Diego, María, Carlos (cliente).' },
  { source: 'gdrive', client_id: 'acme', timestamp: '2026-04-20T12:00:00Z',
    author: 'Sofía', url: 'mock://drive/acme-deck',
    content: 'Deck "Acme Q2 Strategy" — propuesta inicial.' },
  { source: 'github', client_id: 'acme', timestamp: '2026-05-29T11:00:00Z',
    author: 'CI bot', url: 'mock://github/acme-pr-44',
    content: 'PR #44 "Landing redesign" merged to main. 12 commits, +832 -210.' },
  { source: 'obsidian', client_id: 'acme', timestamp: '2026-05-30T08:00:00Z',
    author: 'Founder', content: 'Nota privada: Carlos (Acme) sonaba frustrado el martes. Revisar pulso esta semana.' },
  { source: 'posthog', client_id: 'acme', timestamp: '2026-06-01T00:00:00Z',
    author: 'Auto', url: 'mock://posthog/acme-dash',
    content: 'CTR landing Acme: 2.3% (semana). Baseline 3.1%. Caída -25%.' },
  { source: 'whatsapp', client_id: 'acme', timestamp: '2026-06-01T16:20:00Z',
    author: 'Carlos (Acme)',
    content: 'Mensaje: "Cómo vamos? Me preocupa lo del CTR que mostraron el viernes."' },

  // -------- BETA --------
  { source: 'granola', client_id: 'beta', timestamp: '2026-05-25T11:00:00Z',
    author: 'Granola summary', url: 'mock://granola/beta-2026-05-25',
    content: 'Reunión kickoff con Beta. Scope: onboarding flow. Prometido: primera versión jueves 6 jun.' },
  { source: 'linear', client_id: 'beta', timestamp: '2026-05-28T09:00:00Z',
    author: 'Equipo', url: 'mock://linear/BETA-12',
    content: 'BETA-12 "Diseñar flujo onboarding" → In Progress. Bloqueado por feedback cliente.' },
  { source: 'notion', client_id: 'beta', timestamp: '2026-05-22T10:00:00Z',
    author: 'PM', url: 'mock://notion/beta-wiki',
    content: 'Wiki Beta: propuesta inicial onboarding + assets de marca.' },
  { source: 'slack', client_id: 'beta', timestamp: '2026-05-30T14:00:00Z',
    author: 'María',
    content: '#beta: "Necesitamos feedback de Beta para desbloquear BETA-12. Mandé recordatorio."' },
  { source: 'gcal', client_id: 'beta', timestamp: '2026-06-03T11:00:00Z',
    author: 'Calendar',
    content: 'Reunión Beta mañana 11:00. Asistentes: Sofía, equipo Beta (2 personas).' },

  // -------- GAMMA --------
  { source: 'granola', client_id: 'gamma', timestamp: '2026-05-29T15:00:00Z',
    author: 'Granola summary', url: 'mock://granola/gamma-2026-05-29',
    content: 'Reunión Gamma. Aprobaron presupuesto Q3. Próximo paso: definir métricas norte.' },
  { source: 'linear', client_id: 'gamma', timestamp: '2026-05-31T12:00:00Z',
    author: 'Equipo', url: 'mock://linear/GAMMA-3',
    content: 'GAMMA-3 "Definir KPIs Q3" → Todo. Sin asignado.' },
  { source: 'notion', client_id: 'gamma', timestamp: '2026-05-28T16:00:00Z',
    author: 'Founder', url: 'mock://notion/gamma-deck',
    content: 'Deck "Gamma Q3 Plan" aprobado por cliente.' },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sources/mocks/fixtures.ts
git commit -m "feat(sources): seed mock fixtures with built-in conflict scenario"
```

---

### Task 8: 8 mock source adapters

**Files:**
- Create: `src/lib/sources/mocks/{slack,granola,gcal,gdrive,github,obsidian,posthog,whatsapp}.ts`

Each adapter follows the same shape. Write once per file using the template below. Pattern: filter fixtures by source + client_id + optional query/since.

- [ ] **Step 1: Create `src/lib/sources/mocks/_helpers.ts`**

```ts
import { fixtures } from './fixtures';
import type { SearchInput, Source, SourceRecord } from '../types';

export function mockSearch(source: Source, input: SearchInput): SourceRecord[] {
  let results = fixtures.filter((f) => f.source === source && f.client_id === input.client_id);
  if (input.since) results = results.filter((r) => r.timestamp >= input.since!);
  if (input.query) {
    const q = input.query.toLowerCase();
    results = results.filter((r) => r.content.toLowerCase().includes(q));
  }
  return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
```

- [ ] **Step 2: Create `src/lib/sources/mocks/slack.ts`**

```ts
import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';

export const slack = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('slack', input)),
};
```

- [ ] **Step 3: Repeat for `granola`, `gcal`, `gdrive`, `github`, `obsidian`, `posthog`, `whatsapp`**

For each filename, replace `slack` with the source name. Identical body otherwise.

`granola.ts`:
```ts
import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';
export const granola = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('granola', input)),
};
```

`gcal.ts`:
```ts
import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';
export const gcal = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('gcal', input)),
};
```

`gdrive.ts`:
```ts
import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';
export const gdrive = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('gdrive', input)),
};
```

`github.ts`:
```ts
import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';
export const github = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('github', input)),
};
```

`obsidian.ts`:
```ts
import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';
export const obsidian = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('obsidian', input)),
};
```

`posthog.ts`:
```ts
import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';
export const posthog = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('posthog', input)),
};
```

`whatsapp.ts`:
```ts
import { mockSearch } from './_helpers';
import type { SearchInput, SourceRecord } from '../types';
export const whatsapp = {
  search: (input: SearchInput): Promise<SourceRecord[]> => Promise.resolve(mockSearch('whatsapp', input)),
};
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/sources/mocks/
git commit -m "feat(sources): add 8 mock source adapters with shared search helper"
```

---

### Task 9: Linear REAL adapter

**Files:**
- Create: `src/lib/sources/linear.ts`

- [ ] **Step 1: Write Linear adapter (GraphQL via fetch)**

```ts
import type { ClientId, SearchInput, SourceRecord } from './types';

const LINEAR_URL = 'https://api.linear.app/graphql';

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(LINEAR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.LINEAR_API_KEY!,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: T; errors?: unknown };
  if (json.errors) throw new Error(`Linear GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

// Map ClientId → Linear Project/Team name (case-insensitive substring match).
function projectFilterForClient(clientId: ClientId): string {
  return clientId; // user creates Linear projects literally named "acme", "beta", "gamma"
}

export const linear = {
  async search(input: SearchInput): Promise<SourceRecord[]> {
    const projectName = projectFilterForClient(input.client_id);
    const query = `
      query Issues($projectName: String!, $first: Int!) {
        issues(filter: { project: { name: { containsIgnoreCase: $projectName } } }, first: $first, orderBy: updatedAt) {
          nodes {
            id identifier title description state { name } updatedAt url
            assignee { name }
          }
        }
      }
    `;
    const data = await gql<{ issues: { nodes: any[] } }>(query, {
      projectName,
      first: 20,
    });
    let nodes = data.issues.nodes;
    if (input.since) nodes = nodes.filter((n) => n.updatedAt >= input.since!);
    if (input.query) {
      const q = input.query.toLowerCase();
      nodes = nodes.filter((n) =>
        `${n.title} ${n.description ?? ''}`.toLowerCase().includes(q),
      );
    }
    return nodes.map((n): SourceRecord => ({
      source: 'linear',
      client_id: input.client_id,
      timestamp: n.updatedAt,
      author: n.assignee?.name ?? 'unassigned',
      content: `${n.identifier} "${n.title}" → ${n.state.name}${n.description ? `. ${n.description.slice(0, 200)}` : ''}`,
      url: n.url,
      metadata: { identifier: n.identifier, state: n.state.name },
    }));
  },

  async createIssue(params: { client_id: ClientId; title: string; description?: string }): Promise<{ id: string; url: string; identifier: string }> {
    const teamQuery = `query { teams(first: 50) { nodes { id name } } }`;
    const teams = await gql<{ teams: { nodes: { id: string; name: string }[] } }>(teamQuery, {});
    const team = teams.teams.nodes.find((t) => t.name.toLowerCase().includes(params.client_id))
      ?? teams.teams.nodes[0];
    if (!team) throw new Error('No Linear team found');
    const mutation = `
      mutation Create($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }
    `;
    const res = await gql<{ issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } } }>(
      mutation,
      { input: { teamId: team.id, title: params.title, description: params.description } },
    );
    if (!res.issueCreate.success) throw new Error('issueCreate failed');
    return res.issueCreate.issue;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sources/linear.ts
git commit -m "feat(sources): add real Linear GraphQL adapter (search + createIssue)"
```

---

### Task 10: Notion REAL adapter

**Files:**
- Create: `src/lib/sources/notion.ts`

- [ ] **Step 1: Write Notion adapter (REST via official client)**

```ts
import { Client } from '@notionhq/client';
import type { ClientId, SearchInput, SourceRecord } from './types';

const notionClient = new Client({ auth: process.env.NOTION_API_KEY });

function pageTitle(page: any): string {
  const props = page.properties ?? {};
  for (const key of Object.keys(props)) {
    const p = props[key];
    if (p.type === 'title' && Array.isArray(p.title) && p.title.length > 0) {
      return p.title.map((t: any) => t.plain_text).join('');
    }
  }
  return 'Untitled';
}

function lastEditor(page: any): string {
  return page.last_edited_by?.name ?? 'unknown';
}

export const notion = {
  async search(input: SearchInput): Promise<SourceRecord[]> {
    const res = await notionClient.search({
      query: input.query ?? input.client_id,
      page_size: 20,
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
    });
    const filtered = res.results
      .filter((r: any) => r.object === 'page')
      .filter((r: any) => {
        const t = pageTitle(r).toLowerCase();
        return t.includes(input.client_id);
      });
    return filtered.map((r: any): SourceRecord => ({
      source: 'notion',
      client_id: input.client_id,
      timestamp: r.last_edited_time,
      author: lastEditor(r),
      content: `Página "${pageTitle(r)}"`,
      url: r.url,
      metadata: { pageId: r.id },
    }));
  },

  async appendBlock(params: { pageId: string; text: string }): Promise<{ ok: true }> {
    await notionClient.blocks.children.append({
      block_id: params.pageId,
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: params.text } }],
          },
        },
      ],
    });
    return { ok: true };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sources/notion.ts
git commit -m "feat(sources): add real Notion REST adapter (search + appendBlock)"
```

---

## Phase C: Agent Core (Tasks 11–15)

### Task 11: Access helper

**Files:**
- Create: `src/lib/agent/access.ts`

- [ ] **Step 1: Write helper**

```ts
import { db } from '@/lib/db/client';
import { userClientAccess } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { ClientId } from '@/lib/sources/types';

export async function accessibleClients(userId: string): Promise<ClientId[]> {
  const rows = await db.select().from(userClientAccess).where(eq(userClientAccess.userId, userId));
  return rows.map((r) => r.clientId as ClientId);
}

export async function canAccess(userId: string, clientId: ClientId): Promise<boolean> {
  const list = await accessibleClients(userId);
  return list.includes(clientId);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agent/access.ts
git commit -m "feat(agent): add per-user client access helper"
```

---

### Task 12: Agent tools (read)

**Files:**
- Create: `src/lib/agent/tools.ts`

- [ ] **Step 1: Build tool set wrapper that closes over userId for access checks**

```ts
import { tool } from 'ai';
import { z } from 'zod';
import { searchInputSchema } from '@/lib/sources/types';
import { linear } from '@/lib/sources/linear';
import { notion } from '@/lib/sources/notion';
import { slack } from '@/lib/sources/mocks/slack';
import { granola } from '@/lib/sources/mocks/granola';
import { gcal } from '@/lib/sources/mocks/gcal';
import { gdrive } from '@/lib/sources/mocks/gdrive';
import { github } from '@/lib/sources/mocks/github';
import { obsidian } from '@/lib/sources/mocks/obsidian';
import { posthog } from '@/lib/sources/mocks/posthog';
import { whatsapp } from '@/lib/sources/mocks/whatsapp';
import { canAccess } from './access';
import { db } from '@/lib/db/client';
import { writeIntent } from '@/lib/db/schema';

function gateSearch<T extends { client_id: any }>(userId: string, fn: (input: T) => Promise<unknown>) {
  return async (input: T) => {
    const allowed = await canAccess(userId, input.client_id);
    if (!allowed) {
      return { error: `no_access`, message: `User has no access to client "${input.client_id}".` };
    }
    return await fn(input);
  };
}

export function buildTools(userId: string, chatSessionId: string | null) {
  return {
    search_linear:   tool({ description: 'Search Linear issues for a client.',   inputSchema: searchInputSchema, execute: gateSearch(userId, (i) => linear.search(i)) }),
    search_notion:   tool({ description: 'Search Notion pages for a client.',    inputSchema: searchInputSchema, execute: gateSearch(userId, (i) => notion.search(i)) }),
    search_slack:    tool({ description: 'Search internal Slack threads about a client.', inputSchema: searchInputSchema, execute: gateSearch(userId, (i) => slack.search(i)) }),
    search_granola:  tool({ description: 'Search meeting transcripts/summaries (Granola).', inputSchema: searchInputSchema, execute: gateSearch(userId, (i) => granola.search(i)) }),
    search_gcal:     tool({ description: 'Search calendar events for a client.', inputSchema: searchInputSchema, execute: gateSearch(userId, (i) => gcal.search(i)) }),
    search_gdrive:   tool({ description: 'Search Google Drive decks/assets for a client.', inputSchema: searchInputSchema, execute: gateSearch(userId, (i) => gdrive.search(i)) }),
    search_github:   tool({ description: 'Search GitHub PRs/issues for a client repo.',    inputSchema: searchInputSchema, execute: gateSearch(userId, (i) => github.search(i)) }),
    search_obsidian: tool({ description: 'Search founder personal notes (Obsidian).',      inputSchema: searchInputSchema, execute: gateSearch(userId, (i) => obsidian.search(i)) }),
    search_posthog:  tool({ description: 'Look up product metrics (PostHog) for a client.',inputSchema: searchInputSchema, execute: gateSearch(userId, (i) => posthog.search(i)) }),
    search_whatsapp: tool({ description: 'Search WhatsApp messages with a client.',         inputSchema: searchInputSchema, execute: gateSearch(userId, (i) => whatsapp.search(i)) }),

    linear_create_issue: tool({
      description: 'Propose creating a Linear issue. Requires user confirmation before execution. Use when the user explicitly asks to create a task or follow-up.',
      inputSchema: z.object({
        client_id: z.enum(['acme', 'beta', 'gamma']),
        title: z.string().min(3),
        description: z.string().optional(),
      }),
      execute: async (input) => {
        const allowed = await canAccess(userId, input.client_id as any);
        if (!allowed) return { error: 'no_access', message: `no access to ${input.client_id}` };
        const preview = `Crear issue Linear en proyecto "${input.client_id}":\nTítulo: ${input.title}${input.description ? `\nDescripción: ${input.description}` : ''}`;
        const [row] = await db.insert(writeIntent).values({
          userId,
          chatSessionId,
          clientId: input.client_id,
          tool: 'linear_create_issue',
          payload: input,
          preview,
          status: 'pending',
        }).returning();
        return { intent_id: row.id, preview, requires_confirmation: true };
      },
    }),

    notion_append_block: tool({
      description: 'Propose appending a paragraph block to a Notion page. Requires user confirmation. Use when the user explicitly asks to log/document something.',
      inputSchema: z.object({
        client_id: z.enum(['acme', 'beta', 'gamma']),
        page_id: z.string().describe('Notion page id from a prior search result'),
        text: z.string().min(3),
      }),
      execute: async (input) => {
        const allowed = await canAccess(userId, input.client_id as any);
        if (!allowed) return { error: 'no_access', message: `no access to ${input.client_id}` };
        const preview = `Agregar a Notion page ${input.page_id}:\n"${input.text}"`;
        const [row] = await db.insert(writeIntent).values({
          userId,
          chatSessionId,
          clientId: input.client_id,
          tool: 'notion_append_block',
          payload: input,
          preview,
          status: 'pending',
        }).returning();
        return { intent_id: row.id, preview, requires_confirmation: true };
      },
    }),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agent/tools.ts
git commit -m "feat(agent): add 10 tools (8 read + 2 write-intent) with access gating"
```

---

### Task 13: System prompt

**Files:**
- Create: `src/lib/agent/prompt.ts`

- [ ] **Step 1: Write PM-style system prompt**

```ts
import type { ClientId } from '@/lib/sources/types';

export function systemPrompt(accessibleClients: ClientId[]): string {
  return `Eres un Project Manager senior de una agencia de growth + tech. No eres un chatbot ni un buscador. Tu trabajo es darle a founders y líderes de cuenta una vista accionable del estado de cada proyecto, con criterio, citando fuentes.

CLIENTES ACCESIBLES PARA ESTE USUARIO: ${accessibleClients.join(', ') || '(ninguno)'}.

REGLAS DE TRABAJO:
1. SIEMPRE consulta tools antes de afirmar nada sobre un cliente. No inventes.
2. CITA cada afirmación con fuente y timestamp: "Linear ACME-101 (2026-05-27)", "Granola summary (2026-05-26)", etc. Incluye URL cuando exista.
3. Si los tools no devuelven nada relevante, di explícitamente: "No tengo data sobre [X] en las fuentes consultadas: [lista]". No improvises.
4. Cuando hay MÚLTIPLES FUENTES que tocan el mismo tema, ordénalas cronológicamente y detecta contradicciones. Si las hay:
   - Enumera cada fuente con su timestamp
   - Flag explícito: "⚠️ Estado contradictorio entre fuentes. Último signal: [fuente, fecha]. Confirmar con [autor]."
   - NUNCA inventes consenso ni elijas silenciosamente.
5. Estilo PM: bullets accionables, riesgos explícitos, próximos pasos. No paráfrasis larga.
6. Si el usuario pregunta por un cliente que NO está en su lista de acceso, NO consultes tools — responde: "No tengo acceso a [cliente] en tu workspace. Tu workspace incluye: [lista]. Pide a un founder que te asigne acceso si lo necesitas."
7. Para acciones de ESCRITURA (crear issue, append a doc), usa los tools \`linear_create_issue\` y \`notion_append_block\`. Estos NO ejecutan directo — encolan un intent que el usuario debe confirmar en /pending. Tras llamarlos, dile al usuario: "Encolé el intent. Revisa y confirma en /pending."
8. Tu lealtad es a la verdad operativa, no a sonar suave. Si algo está en riesgo, dilo.

PISTA DE CRITERIO:
- "En riesgo" = issue bloqueado >5 días, o caída métrica >20%, o mensaje cliente sin respuesta >2 días, o conflicto entre fuentes.
- Brief de reunión = contexto del cliente (Notion) + estado proyectos (Linear) + last signal (Slack/Granola/WhatsApp) + 3 talking points + 2 prep questions.
`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agent/prompt.ts
git commit -m "feat(agent): add PM-style system prompt with conflict-handling rules"
```

---

### Task 14: `/api/chat` route

**Files:**
- Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: Write streaming chat handler**

```ts
import { auth } from '@/lib/auth';
import { buildTools } from '@/lib/agent/tools';
import { systemPrompt } from '@/lib/agent/prompt';
import { accessibleClients } from '@/lib/agent/access';
import { deepseek } from '@ai-sdk/deepseek';
import { headers } from 'next/headers';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { messages, chatSessionId }: { messages: UIMessage[]; chatSessionId?: string } = await req.json();
  const userId = session.user.id;
  const clients = await accessibleClients(userId);

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: systemPrompt(clients),
    messages: convertToModelMessages(messages),
    tools: buildTools(userId, chatSessionId ?? null),
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(api): add /api/chat with streamText + access-scoped tools"
```

---

### Task 15: `proxy.ts` (Next 16 auth guard)

**Files:**
- Create: `proxy.ts` (project root)

- [ ] **Step 1: Write proxy**

```ts
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/pending/:path*', '/api/chat', '/api/intents/:path*'],
};
```

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat(auth): add Next 16 proxy to guard protected routes"
```

---

## Phase D: UI + Write-back (Tasks 16–20)

### Task 16: Sign-in page

**Files:**
- Create: `src/app/sign-in/page.tsx`

- [ ] **Step 1: Write sign-in page (client component)**

```tsx
'use client';
import { useState } from 'react';
import { signIn } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('founder@muno.lab');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await signIn.email({ email, password });
    setLoading(false);
    if (res.error) setError(res.error.message ?? 'Error');
    else router.push('/');
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Growth Agent</h1>
        <p className="text-sm text-neutral-500">Sign in to continue.</p>
        <label className="block">
          <span className="text-sm">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">Password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-white disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-neutral-500">
          Demo users: <code>founder@muno.lab</code> (todos los clientes) · <code>lead@muno.lab</code> (solo Acme) · pass <code>password123</code>.
        </p>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/sign-in/
git commit -m "feat(ui): add sign-in page with Better Auth client"
```

---

### Task 17: Chat page + sidebar

**Files:**
- Modify: `src/app/page.tsx` (rewrite)
- Modify: `src/app/layout.tsx` (minimal)
- Create: `src/app/_components/chat.tsx`
- Create: `src/app/_components/sidebar.tsx`

- [ ] **Step 1: Rewrite root page (server component) that fetches accessible clients and renders shell**

`src/app/page.tsx`:
```tsx
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { accessibleClients } from '@/lib/agent/access';
import { Sidebar } from './_components/sidebar';
import { Chat } from './_components/chat';

export default async function Home() {
  const session = (await auth.api.getSession({ headers: await headers() }))!;
  const clients = await accessibleClients(session.user.id);
  return (
    <main className="grid min-h-dvh grid-cols-[260px_1fr]">
      <Sidebar userName={session.user.name} clients={clients} />
      <Chat />
    </main>
  );
}
```

- [ ] **Step 2: Sidebar component**

`src/app/_components/sidebar.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { signOut } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

export function Sidebar({ userName, clients }: { userName: string; clients: string[] }) {
  const router = useRouter();
  return (
    <aside className="border-r p-4 flex flex-col gap-4">
      <div>
        <div className="text-sm text-neutral-500">Signed in as</div>
        <div className="font-medium">{userName}</div>
      </div>
      <div>
        <div className="text-xs uppercase text-neutral-500 mb-2">Clients</div>
        <ul className="space-y-1">
          {clients.map((c) => (
            <li key={c} className="rounded-lg px-2 py-1 hover:bg-neutral-100 capitalize">{c}</li>
          ))}
          {clients.length === 0 && <li className="text-sm text-neutral-500">No clients assigned</li>}
        </ul>
      </div>
      <Link href="/pending" className="rounded-lg border px-3 py-2 text-sm text-center">Pending writes →</Link>
      <button
        onClick={async () => { await signOut(); router.push('/sign-in'); }}
        className="mt-auto rounded-lg border px-3 py-2 text-sm"
      >Sign out</button>
    </aside>
  );
}
```

- [ ] **Step 3: Chat component (client, using `useChat` v6)**

`src/app/_components/chat.tsx`:
```tsx
'use client';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { DefaultChatTransport } from 'ai';

export function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');
  const busy = status === 'submitted' || status === 'streaming';

  return (
    <section className="flex flex-col h-dvh">
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-neutral-500">
            Pregunta cosas como "¿cómo va Acme esta semana?" o "¿qué quedó con el copy de Acme?"
          </div>
        )}
        {messages.map((m) => (
          <article key={m.id} className="space-y-2">
            <div className="text-xs uppercase text-neutral-500">{m.role}</div>
            {m.parts.map((part, idx) => {
              if (part.type === 'text') return <p key={idx} className="whitespace-pre-wrap">{part.text}</p>;
              if (part.type.startsWith('tool-')) {
                const anyPart = part as any;
                return (
                  <details key={idx} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                    <summary className="cursor-pointer text-neutral-600">🔧 {part.type} — {anyPart.state}</summary>
                    <pre className="overflow-auto text-xs mt-2">{JSON.stringify(anyPart.input ?? anyPart.output ?? {}, null, 2)}</pre>
                  </details>
                );
              }
              return null;
            })}
          </article>
        ))}
      </div>
      <form
        className="border-t p-4 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (!input.trim() || busy) return; sendMessage({ text: input }); setInput(''); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask…"
          className="flex-1 rounded-lg border px-3 py-2"
          disabled={busy}
        />
        <button disabled={busy} className="rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-50">
          Send
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 4: Confirm `src/app/layout.tsx` imports Tailwind globals**

Read `src/app/layout.tsx`. Ensure `import './globals.css'` is at top. If missing, add it.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/_components/ src/app/layout.tsx
git commit -m "feat(ui): add chat page with sidebar showing scoped clients"
```

---

### Task 18: `/pending` page + intent confirm/reject API

**Files:**
- Create: `src/app/pending/page.tsx`
- Create: `src/app/_components/intent-card.tsx`
- Create: `src/app/api/intents/[id]/route.ts`

- [ ] **Step 1: Intents API**

`src/app/api/intents/[id]/route.ts`:
```ts
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { writeIntent, auditLog } from '@/lib/db/schema';
import { linear } from '@/lib/sources/linear';
import { notion } from '@/lib/sources/notion';
import { canAccess } from '@/lib/agent/access';
import { headers } from 'next/headers';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });
  const { id } = await ctx.params;
  const { action } = (await req.json()) as { action: 'confirm' | 'reject' };

  const [row] = await db.select().from(writeIntent)
    .where(and(eq(writeIntent.id, id), eq(writeIntent.userId, session.user.id)));
  if (!row) return new Response('Not found', { status: 404 });
  if (row.status !== 'pending') return Response.json({ ok: false, reason: 'already_resolved', status: row.status });

  if (action === 'reject') {
    await db.update(writeIntent).set({ status: 'rejected', executedAt: new Date() }).where(eq(writeIntent.id, id));
    await db.insert(auditLog).values({ userId: session.user.id, intentId: id, action: 'reject' });
    return Response.json({ ok: true, status: 'rejected' });
  }

  // confirm path
  const allowed = await canAccess(session.user.id, row.clientId as any);
  if (!allowed) return new Response('Forbidden', { status: 403 });

  try {
    let result: unknown;
    if (row.tool === 'linear_create_issue') {
      const p = row.payload as { client_id: any; title: string; description?: string };
      result = await linear.createIssue(p);
    } else if (row.tool === 'notion_append_block') {
      const p = row.payload as { page_id: string; text: string };
      result = await notion.appendBlock({ pageId: p.page_id, text: p.text });
    } else {
      throw new Error(`unknown tool ${row.tool}`);
    }
    await db.update(writeIntent).set({ status: 'confirmed', result: result as any, executedAt: new Date() }).where(eq(writeIntent.id, id));
    await db.insert(auditLog).values({ userId: session.user.id, intentId: id, action: 'confirm', detail: { result } });
    return Response.json({ ok: true, status: 'confirmed', result });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await db.update(writeIntent).set({ status: 'failed', result: { error: errMsg }, executedAt: new Date() }).where(eq(writeIntent.id, id));
    await db.insert(auditLog).values({ userId: session.user.id, intentId: id, action: 'fail', detail: { error: errMsg } });
    return Response.json({ ok: false, status: 'failed', error: errMsg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Intent card component**

`src/app/_components/intent-card.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function IntentCard({ id, tool, clientId, preview, status, createdAt }: {
  id: string; tool: string; clientId: string; preview: string; status: string; createdAt: string;
}) {
  const [busy, setBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);
  const router = useRouter();

  async function act(action: 'confirm' | 'reject') {
    setBusy(true);
    const res = await fetch(`/api/intents/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const j = await res.json();
    setBusy(false);
    setLocalStatus(j.status ?? localStatus);
    router.refresh();
  }

  return (
    <article className="rounded-2xl border p-4 space-y-3">
      <header className="flex justify-between text-xs text-neutral-500">
        <span className="font-mono">{tool}</span>
        <span>{clientId} · {new Date(createdAt).toLocaleString()}</span>
      </header>
      <pre className="whitespace-pre-wrap text-sm">{preview}</pre>
      <footer className="flex items-center justify-between">
        <span className="text-xs uppercase">{localStatus}</span>
        {localStatus === 'pending' && (
          <div className="flex gap-2">
            <button onClick={() => act('reject')} disabled={busy} className="rounded-lg border px-3 py-1 text-sm">Reject</button>
            <button onClick={() => act('confirm')} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white">Confirm</button>
          </div>
        )}
      </footer>
    </article>
  );
}
```

- [ ] **Step 3: `/pending` server page**

`src/app/pending/page.tsx`:
```tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { writeIntent } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { headers } from 'next/headers';
import Link from 'next/link';
import { IntentCard } from '../_components/intent-card';

export default async function PendingPage() {
  const session = (await auth.api.getSession({ headers: await headers() }))!;
  const rows = await db.select().from(writeIntent).where(eq(writeIntent.userId, session.user.id)).orderBy(desc(writeIntent.createdAt));

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <header className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Pending writes</h1>
        <Link href="/" className="text-sm underline">← back to chat</Link>
      </header>
      {rows.length === 0 && <p className="text-sm text-neutral-500">No intents yet.</p>}
      <div className="space-y-3">
        {rows.map((r) => (
          <IntentCard
            key={r.id}
            id={r.id}
            tool={r.tool}
            clientId={r.clientId}
            preview={r.preview}
            status={r.status}
            createdAt={r.createdAt.toISOString()}
          />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/pending/ src/app/_components/intent-card.tsx src/app/api/intents/
git commit -m "feat(write-back): add /pending UI + confirm/reject API with audit"
```

---

### Task 19: Smoke test — manual end-to-end

**Files:** none.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Next.js boots on `http://localhost:3000`.

- [ ] **Step 2: Visit `/` → should redirect to `/sign-in`**

Open browser. Verify redirect.

- [ ] **Step 3: Sign in as founder**

Email `founder@muno.lab`, pass `password123`. Verify redirect to `/`. Sidebar lists Acme, Beta, Gamma.

- [ ] **Step 4: Run demo prompts**

In chat, type and verify each completes without error:
1. `¿cómo va Acme esta semana?` → tool calls visible, response cites sources.
2. `¿qué quedó con el copy de Acme?` → response lists Granola, Linear, Slack, Notion ordered by timestamp + flags conflict.
3. `crea task de seguimiento en Linear para Acme: revisar copy con cliente` → intent enqueued.
4. Visit `/pending` → intent card shown. Click Reject (avoid creating real Linear issue in smoke).

- [ ] **Step 5: Sign out, sign in as lead**

Email `lead@muno.lab`. Verify sidebar shows only Acme.

- [ ] **Step 6: Ask about Beta**

In chat: `¿cómo va Beta?` → agent responds with access denied message (without calling tools, or tools return `no_access`).

- [ ] **Step 7: Note any issues, fix inline**

If anything breaks, fix and re-run the failing step.

- [ ] **Step 8: Commit any fixes**

```bash
git add -A
git commit -m "fix: smoke test issues from manual demo run"
```

(Skip this commit if no fixes needed.)

---

### Task 20: README + deploy

**Files:**
- Modify: `README.md` (rewrite)

- [ ] **Step 1: Write README covering setup, decisions, PDF guide answers**

```markdown
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
   - `BETTER_AUTH_SECRET` — any 32-char random string
2. `npm install`
3. `npm run db:push` to apply schema
4. `npm run db:seed` to create the 2 demo users
5. `npm run dev`

Demo users (password `password123`):
- `founder@muno.lab` — access to all 3 clients
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

## Out of scope (no implementado, decisión consciente)

- **Real Slack/WhatsApp/Granola integrations** — cada una requiere OAuth + workspace de prueba. Mocks comparten misma interfaz tipada, swap a real = cambiar el adapter.
- **RAG pre-indexado con embeddings** — decisión de arquitectura, no punt; tool-calling live es la estrategia correcta para volumen de demo.
- **OAuth por usuario** — modelo de tokens de servicio matchea el negocio agencia.
- **Memoria long-term sofisticada** — v1 persiste mensajes raw por sesión, suficiente para demo.
- **Notificaciones proactivas** — paradigma distinto (cron + push), no extensión.
- **Eval set / golden answers** — workstream separado de calidad para producción.

## Deploy

`vercel --prod` o conectar repo en dashboard. Setear las mismas env vars + `BETTER_AUTH_URL` apuntando a la URL prod.
```

- [ ] **Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: add README with setup, demo prompts, and design rationale"
```

- [ ] **Step 3: Deploy to Vercel**

Run (user does this):
```bash
npx vercel
```

In dashboard set all env vars from `.env.local`, updating `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` to the production URL.

- [ ] **Step 4: Verify prod**

Open prod URL → redirect to `/sign-in` → login as founder → run 1-2 demo prompts → confirm intent flow.

- [ ] **Step 5: Commit any prod-only fixes**

```bash
git add -A
git commit -m "fix: prod env adjustments"
```

(Skip if not needed.)

---

## Self-Review Notes

- [x] Spec coverage: WAYRTTD (T13 prompt + README), stack (T1-T4), 10 sources w/ uniform interface (T6-T10), 2 real adapters (T9-T10), 8 mocks (T8), agent tools w/ access gating (T11-T12), system prompt + guardrails (T13), conflict scenario (T7 fixtures + T13 prompt), permissions (T3 schema + T11 access + T15 proxy), write-back human-in-the-loop (T12 + T18), audit log (T18), README answers (T20).
- [x] No placeholders — every code step has the actual code.
- [x] Type consistency — `ClientId`, `SourceRecord`, `SearchInput` used uniformly. Tool names match between `tools.ts`, intent rows, and `/api/intents` switch.
- [x] Conventional Commits in every commit, no Claude attribution.
- [x] Realistic 4h scope: foundation (~40m), sources (~50m), agent (~50m), UI/writeback (~60m), smoke + readme + deploy (~40m).
