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
