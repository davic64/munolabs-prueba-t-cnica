'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Calendar, Check, CheckCircle2, Clock, FileText,
  ListTodo, Loader2, MessageSquare, Wrench, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const TOOL_ICON = (tool: string): LucideIcon => {
  if (tool.startsWith('notion')) return FileText;
  if (tool.startsWith('linear')) return ListTodo;
  if (tool.startsWith('calendar')) return Calendar;
  if (tool.startsWith('slack')) return MessageSquare;
  return Wrench;
};

const STATUS_META: Record<string, { label: string; icon: LucideIcon }> = {
  pending:   { label: 'Pendiente', icon: Clock },
  confirmed: { label: 'Confirmado', icon: CheckCircle2 },
  rejected:  { label: 'Rechazado', icon: X },
  failed:    { label: 'Falló', icon: AlertTriangle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.7, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: -4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      >
        <Badge variant="outline" className={`status-pill s-${status} gap-[7px] rounded-full px-[9px] py-[4px] font-medium text-[0.8em] capitalize`}>
          <Icon size={13} />
          {meta.label}
        </Badge>
      </motion.div>
    </AnimatePresence>
  );
}

export function IntentCard({
  id, tool, clientId, preview, status, createdAt,
}: {
  id: string; tool: string; clientId: string; preview: string; status: string; createdAt: string;
}) {
  const [busy, setBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);
  const router = useRouter();

  async function act(action: 'confirm' | 'reject') {
    setBusy(true);
    setLocalStatus(action === 'confirm' ? 'confirmed' : 'rejected');
    const res = await fetch(`/api/intents/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const j = await res.json();
    setBusy(false);
    setLocalStatus(j.status ?? localStatus);
    router.refresh();
  }

  const Icon = TOOL_ICON(tool);
  const title = preview.split('\n')[0]?.replace(/^.*?:\s*/, '') ?? tool;

  const dimmed = localStatus === 'rejected' || localStatus === 'failed';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: dimmed ? 0.72 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      whileHover={dimmed ? undefined : { y: -2 }}
    >
    <Card
      className="intent-card !p-0 !gap-0 !border-[var(--border)] !bg-[var(--surface)] !text-[var(--fg)] !rounded-[var(--r-card)] overflow-hidden"
    >
      <header className="intent-head">
        <span className="intent-toolicon"><Icon size={16} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="intent-title">{title}</div>
          <div className="intent-tool">{tool}</div>
        </div>
        <span className="intent-ts">{new Date(createdAt).toLocaleString()}</span>
      </header>

      <div className="intent-body">{preview}</div>

      <footer className="intent-foot">
        <Badge
          variant="outline"
          className="rounded-full font-mono text-[0.7em] font-medium text-[var(--muted)] bg-[var(--surface-2)] border-[var(--border)] capitalize px-[9px] py-[2px]"
        >
          {clientId}
        </Badge>
        <StatusBadge status={localStatus} />
        <AnimatePresence>
          {localStatus === 'pending' && (
            <motion.div
              className="intent-actions"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, x: 10, transition: { duration: 0.18 } }}
            >
              <motion.div whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.03 }}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => act('reject')}
                  disabled={busy}
                  className="h-auto rounded-[8px] px-[11px] py-[6px] text-[0.82em] gap-[7px] text-[var(--red-ink)] border-[color-mix(in_srgb,var(--red)_30%,var(--border))] bg-[var(--surface)] hover:bg-[color-mix(in_srgb,var(--red)_8%,var(--surface))]"
                >
                  <X size={14} /> Rechazar
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.03 }}>
                <Button
                  type="button"
                  onClick={() => act('confirm')}
                  disabled={busy}
                  size="sm"
                  className="h-auto rounded-[8px] px-[11px] py-[6px] text-[0.82em] gap-[7px] bg-[var(--fg)] text-[var(--bg)] hover:bg-[var(--fg)] hover:opacity-[0.88]"
                >
                  {busy ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                  Confirmar
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </Card>
    </motion.div>
  );
}
