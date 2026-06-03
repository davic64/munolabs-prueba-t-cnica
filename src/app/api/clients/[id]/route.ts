import { auth } from '@/lib/auth';
import { canAccess } from '@/lib/agent/access';
import { buildClientMeta } from '@/lib/clients-meta';
import { headers } from 'next/headers';
import type { ClientId } from '@/lib/sources/types';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });
  const { id } = await ctx.params;

  const allowed = await canAccess(session.user.id, id as ClientId);
  if (!allowed) return new Response('Forbidden', { status: 403 });

  const meta = await buildClientMeta(id);
  if (!meta) return new Response('Not found', { status: 404 });

  return Response.json(meta);
}
