'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Inbox, LogOut, User } from 'lucide-react';
import { motion } from 'motion/react';
import { signOut } from '@/lib/auth/client';
import { BrandMark } from './brand-mark';
import { ClientModal } from './client-modal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SidebarUser = { name: string; role?: string };

export function SidebarInner({
  user,
  clients,
  pendingCount = 0,
  onItemClick,
}: {
  user: SidebarUser;
  clients: string[];
  pendingCount?: number;
  onItemClick?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const onPending = pathname?.startsWith('/pending');
  const [activeClient, setActiveClient] = useState<string | null>(null);

  return (
    <>
      <div className="sb-brand">
        <BrandMark size={30} />
        <span className="pname">Growth Agent</span>
      </div>

      <div className="sb-user">
        <Avatar className="size-[34px] rounded-[9px]">
          <AvatarFallback className="rounded-[9px] bg-[var(--surface-2)] text-[var(--muted)]">
            <User size={17} />
          </AvatarFallback>
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <div className="uname">{user.name}</div>
          <div className="umeta">
            {user.role ?? 'Founder'} · {clients.length} cuenta{clients.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="sb-label">Cuentas</div>
      <motion.nav
        className="sb-clients"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
      >
        {clients.length === 0 && (
          <span style={{ padding: '8px 12px', fontSize: '.85em', color: 'var(--muted)' }}>
            Sin cuentas asignadas
          </span>
        )}
        {clients.map((c) => (
          <motion.div
            key={c}
            variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          >
            <Button
              variant="ghost"
              onClick={() => { setActiveClient(c); onItemClick?.(); }}
              className="sb-client w-full justify-start h-auto px-3 py-[7px] rounded-[8px] text-[.9em] text-[var(--fg)] capitalize hover:bg-[var(--surface-2)] gap-[9px] font-normal"
            >
              <motion.span
                className="dot"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              {c}
            </Button>
          </motion.div>
        ))}
      </motion.nav>

      <div className="sb-foot">
        <Link
          href="/pending"
          onClick={onItemClick}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'sb-link w-full justify-start h-auto px-3 py-2 rounded-[8px] text-[.9em] text-[var(--fg)] hover:bg-[var(--surface-2)] gap-[9px] font-normal',
            onPending && 'bg-[var(--surface-2)]',
          )}
        >
          <Inbox size={16} />
          <span>Pending writes</span>
          {pendingCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-auto rounded-full bg-[var(--surface-2)] text-[var(--muted)] font-semibold text-[0.76em] px-[8px] py-0 h-auto leading-tight"
            >
              {pendingCount}
            </Badge>
          )}
        </Link>
        <Button
          variant="ghost"
          onClick={async () => { await signOut(); router.push('/sign-in'); }}
          className="sb-link w-full justify-start h-auto px-3 py-2 rounded-[8px] text-[.9em] text-[var(--muted)] hover:bg-[var(--surface-2)] gap-[9px] font-normal"
        >
          <LogOut size={16} />
          Cerrar sesión
        </Button>
      </div>

      <ClientModal
        clientId={activeClient}
        open={activeClient !== null}
        onOpenChange={(v) => { if (!v) setActiveClient(null); }}
      />
    </>
  );
}

/** Desktop persistent sidebar — hidden on mobile via CSS .sb in @media. */
export function Sidebar(props: { user: SidebarUser; clients: string[]; pendingCount?: number }) {
  return (
    <aside className="sb">
      <SidebarInner {...props} />
    </aside>
  );
}
