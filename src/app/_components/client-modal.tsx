'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  Calendar,
  CircleDot,
  Loader2,
  Mail,
  Minus,
  TrendingDown,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ClientMeta } from '@/lib/clients-meta';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[color-mix(in_srgb,var(--emerald)_12%,var(--surface))] text-[var(--emerald-ink)] border-[color-mix(in_srgb,var(--emerald)_30%,transparent)]',
  paused: 'bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]',
  'at-risk': 'bg-[color-mix(in_srgb,var(--amber)_12%,var(--surface))] text-[var(--amber-ink)] border-[color-mix(in_srgb,var(--amber)_30%,transparent)]',
};

// Brand-inspired hues per source, mapped via color-mix on solid base for theming.
const SOURCE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  linear:   { bg: '#5e6ad2', fg: '#5e6ad2', border: '#5e6ad2' }, // Linear indigo
  notion:   { bg: '#111111', fg: '#111111', border: '#111111' }, // Notion monochrome
  slack:    { bg: '#611f69', fg: '#611f69', border: '#611f69' }, // Slack aubergine
  granola:  { bg: '#7c3aed', fg: '#7c3aed', border: '#7c3aed' }, // Granola violet
  gcal:     { bg: '#1a73e8', fg: '#1a73e8', border: '#1a73e8' }, // Google blue
  calendar: { bg: '#1a73e8', fg: '#1a73e8', border: '#1a73e8' },
  gdrive:   { bg: '#f9ab00', fg: '#a76e00', border: '#f9ab00' }, // Drive amber
  drive:    { bg: '#f9ab00', fg: '#a76e00', border: '#f9ab00' },
  github:   { bg: '#24292e', fg: '#24292e', border: '#24292e' }, // GitHub charcoal
  obsidian: { bg: '#a855f7', fg: '#7e22ce', border: '#a855f7' }, // Obsidian purple
  posthog:  { bg: '#f54e00', fg: '#c0410a', border: '#f54e00' }, // PostHog orange
  whatsapp: { bg: '#25d366', fg: '#0d8a3f', border: '#25d366' }, // WhatsApp green
};

function sourceStyle(name: string): React.CSSProperties {
  const key = name.toLowerCase();
  const c = SOURCE_COLORS[key];
  if (!c) return {};
  return {
    background: `color-mix(in srgb, ${c.bg} 10%, var(--surface))`,
    color: c.fg,
    borderColor: `color-mix(in srgb, ${c.border} 35%, transparent)`,
  };
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  paused: 'Pausada',
  'at-risk': 'En riesgo',
};

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp size={13} className="text-[var(--emerald-ink)]" />;
  if (trend === 'down') return <TrendingDown size={13} className="text-[var(--red-ink)]" />;
  return <Minus size={13} className="text-[var(--muted)]" />;
}

export function ClientModal({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [meta, setMeta] = useState<ClientMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clientId) return;
    let cancelled = false;
    setLoading(true); setError(null); setMeta(null);
    fetch(`/api/clients/${clientId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<ClientMeta>;
      })
      .then((data) => { if (!cancelled) setMeta(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, clientId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-2xl !w-[92vw] !rounded-[18px] !border-[var(--border)] !bg-[var(--surface)] !text-[var(--fg)] !shadow-lg !p-0 !gap-0 max-h-[88vh] flex flex-col overflow-hidden"
      >
        <div className="overflow-y-auto pl-6 pr-10 py-6 sm:pl-8 sm:pr-12 sm:py-8 flex-1">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 grid place-items-center gap-3 text-[var(--muted)] text-sm"
            >
              <Loader2 size={28} className="spin" />
              <span>Sincronizando fuentes…</span>
            </motion.div>
          )}

          {!loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center text-[var(--red-ink)] text-sm"
            >
              No pude cargar la información de la cuenta ({error}).
            </motion.div>
          )}

          {!loading && !error && meta && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              <DialogHeader className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <Avatar className="size-12 rounded-[10px] shrink-0">
                    <AvatarFallback
                      className="text-white font-semibold rounded-[10px] text-base"
                      style={{ background: 'linear-gradient(135deg, var(--grad-from), var(--grad-to))' }}
                    >
                      {meta.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-lg font-semibold tracking-tight capitalize">
                      {meta.name}
                    </DialogTitle>
                    <DialogDescription className="text-[0.85em] text-[var(--muted)] mt-0.5">
                      {meta.industry}
                    </DialogDescription>
                  </div>
                  <Badge variant="outline" className={`rounded-full text-[0.72em] font-semibold border ${STATUS_STYLES[meta.status]}`}>
                    <CircleDot size={11} className="mr-1" />
                    {STATUS_LABEL[meta.status]}
                  </Badge>
                </div>
              </DialogHeader>

              <Separator className="bg-[var(--border)]" />

              {/* contact + contract */}
              <div className="grid sm:grid-cols-2 gap-4 text-[0.85em]">
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-semibold">Contacto</div>
                  <div className="flex items-center gap-2">
                    <UserIcon size={13} className="text-[var(--muted)] shrink-0" />
                    <span className="font-medium truncate">{meta.contact.name}</span>
                  </div>
                  <div className="text-[var(--muted)] text-[0.92em] truncate">{meta.contact.role}</div>
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate font-mono text-[0.85em]">{meta.contact.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-semibold">Contrato</div>
                  <div className="font-medium">{meta.contractValue}</div>
                  <div className="flex items-center gap-2 text-[var(--muted)] text-[0.92em]">
                    <Calendar size={12} className="shrink-0" />
                    Desde {new Date(meta.startedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* metrics */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-semibold mb-2">Métricas</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {meta.metrics.map((m, i) => (
                    <motion.div
                      key={m.label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i, duration: 0.25 }}
                      className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold leading-tight">{m.label}</div>
                      <div className="flex items-baseline justify-between gap-2 mt-1">
                        <span className="font-semibold text-[0.95em]">{m.value}</span>
                        <TrendIcon trend={m.trend} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* source counts */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-semibold mb-2">Cobertura por fuente</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(meta.counts).map(([k, v]) => (
                    <Badge
                      key={k}
                      variant="outline"
                      className="rounded-full font-mono text-[0.7em] font-medium px-[8px] py-[2px] border"
                      style={v > 0 ? sourceStyle(k) : { color: 'var(--muted-2)', background: 'transparent', borderColor: 'var(--border)', opacity: 0.55 }}
                    >
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* recent activity */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-semibold mb-2">Actividad reciente</div>
                {meta.recentActivity.length === 0 ? (
                  <div className="text-[0.86em] text-[var(--muted)]">Sin actividad reciente en ninguna fuente.</div>
                ) : (
                  <ul className="space-y-2">
                    {meta.recentActivity.map((a, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 * i, duration: 0.25 }}
                        className="flex gap-3 text-[0.86em]"
                      >
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-full font-mono text-[0.7em] font-medium px-[8px] py-[1px] h-fit border"
                          style={sourceStyle(a.source)}
                        >
                          {a.source}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <div className="leading-snug">{a.text}</div>
                          <div className="text-[0.78em] text-[var(--muted-2)] mt-0.5">{a.ts}</div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </div>

              {/* links */}
              {meta.links.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] font-semibold mb-2">Enlaces</div>
                  <div className="flex flex-wrap gap-2">
                    {meta.links.map((l) => (
                      <Button
                        key={l.label}
                        variant="outline"
                        size="sm"
                        onClick={() => l.url && l.url !== '#' && window.open(l.url, '_blank')}
                        className="h-auto rounded-[8px] px-3 py-1.5 text-[0.82em] gap-1.5 bg-[var(--surface)] border-[var(--border)] text-[var(--fg)] hover:bg-[var(--surface-2)]"
                      >
                        {l.label}
                        <ArrowUpRight size={12} />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
