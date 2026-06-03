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
