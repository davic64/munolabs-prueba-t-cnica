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
