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
