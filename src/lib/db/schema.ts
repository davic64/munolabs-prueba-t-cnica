import { pgTable, text, timestamp, boolean, uuid, jsonb, primaryKey } from 'drizzle-orm/pg-core';

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
  content: jsonb('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const writeIntent = pgTable('write_intent', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  chatSessionId: uuid('chat_session_id').references(() => chatSession.id, { onDelete: 'set null' }),
  clientId: text('client_id').notNull(),
  tool: text('tool').notNull(),
  payload: jsonb('payload').notNull(),
  preview: text('preview').notNull(),
  status: text('status').notNull().default('pending'),
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
