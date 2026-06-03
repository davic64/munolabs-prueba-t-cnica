import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { writeIntent } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { accessibleClients } from '@/lib/agent/access';
import { AppShell } from './_components/app-shell';
import { ChatShell } from './_components/chat';

export default async function Home() {
  const session = (await auth.api.getSession({ headers: await headers() }))!;
  const clients = await accessibleClients(session.user.id);
  const pending = await db
    .select()
    .from(writeIntent)
    .where(and(eq(writeIntent.userId, session.user.id), eq(writeIntent.status, 'pending')));

  return (
    <AppShell
      user={{ name: session.user.name, role: 'Founder' }}
      clients={clients}
      pendingCount={pending.length}
    >
      <ChatShell title="Todas las cuentas" />
    </AppShell>
  );
}
