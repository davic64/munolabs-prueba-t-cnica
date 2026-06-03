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
