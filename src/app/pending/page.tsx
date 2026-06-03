import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { writeIntent } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { accessibleClients } from '@/lib/agent/access';
import { AppShell } from '../_components/app-shell';
import { PendingHeader } from '../_components/pending-header';
import { PendingStats } from '../_components/pending-stats';
import { PendingGrid } from '../_components/pending-grid';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ORDER = ['pending', 'confirmed', 'rejected', 'failed'] as const;

export default async function PendingPage() {
  const session = (await auth.api.getSession({ headers: await headers() }))!;
  const clients = await accessibleClients(session.user.id);
  const rows = await db
    .select()
    .from(writeIntent)
    .where(eq(writeIntent.userId, session.user.id))
    .orderBy(desc(writeIntent.createdAt));
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  const counts: Record<string, number> = { pending: 0, confirmed: 0, rejected: 0, failed: 0 };
  rows.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
  const sorted = [...rows].sort(
    (a, b) =>
      (ORDER as readonly string[]).indexOf(a.status) -
      (ORDER as readonly string[]).indexOf(b.status),
  );

  return (
    <AppShell
      user={{ name: session.user.name, role: 'Founder' }}
      clients={clients}
      pendingCount={pendingCount}
    >
      <PendingHeader />
      <div className="pending-page">
        <div className="pending-inner">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'back-link h-auto p-0 text-[var(--muted)] hover:text-[var(--fg)] hover:bg-transparent font-normal gap-[6px] text-[.86em] mb-[14px]',
            )}
          >
            <ArrowLeft size={15} /> Volver al chat
          </Link>

          <div className="pending-head">
            <h1>Pending writes</h1>
            <p>Acciones que el agente quiere ejecutar en tus herramientas. Nada se escribe sin tu confirmación.</p>
          </div>

          <PendingStats counts={counts} />

          <PendingGrid
            intents={sorted.map((r) => ({
              id: r.id,
              tool: r.tool,
              clientId: r.clientId,
              preview: r.preview,
              status: r.status,
              createdAt: r.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
