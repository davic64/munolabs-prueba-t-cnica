'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CornerDownLeft,
  Inbox,
  Loader2,
  Menu,
  Search,
  Send,
  TrendingUp,
} from 'lucide-react';
import { BrandMark } from './brand-mark';
import { ThemeToggle } from './theme-toggle';
import { Markdown } from './markdown';
import { useMenu } from './app-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  { id: 's1', cat: 'Estado',    label: '¿Cómo van mis cuentas esta semana?',      icon: TrendingUp,    prompt: 'Dame el estado de mis cuentas esta semana. Resumen breve por cliente, con riesgos y decisiones pendientes.' },
  { id: 's2', cat: 'Riesgos',   label: '¿Qué proyectos están en riesgo?',         icon: AlertTriangle, prompt: '¿Qué proyectos están en riesgo en todas las cuentas? Lista los más urgentes con razón.' },
  { id: 's3', cat: 'Reunión',   label: 'Brief para mi próxima reunión',           icon: Calendar,      prompt: 'Prepárame el brief para mi próxima reunión: contexto, talking points y prep questions.' },
  { id: 's4', cat: 'Auditoría', label: 'Audita los últimos compromisos',          icon: Search,        prompt: '¿Qué prometimos a los clientes el último mes y qué ya entregamos? Detecta brechas.' },
];

type ToolPart = {
  type: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'result' | string;
  input?: { client_id?: string } & Record<string, unknown>;
  output?: unknown;
  toolCallId?: string;
};

function ToolCard({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false);
  const toolName = part.type.replace(/^tool-/, '');
  const isDone = part.state === 'output-available' || part.state === 'result';
  const isStreaming = part.state === 'input-streaming' || part.state === 'input-available';

  const StateIcon = isDone ? CheckCircle2 : isStreaming ? Loader2 : Clock;
  const clientId = part.input?.client_id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
    >
      <Collapsible open={open} onOpenChange={setOpen} className={cn('tool-card', open && 'open')}>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className="tool-head h-auto w-full justify-start px-3 py-[9px] gap-[9px] text-[var(--fg)] hover:bg-transparent font-normal text-[15px]"
            />
          }
        >
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
            <ChevronRight size={14} className="tool-chev" />
          </motion.span>
          <span className={cn('tool-state', isDone && 'done')}>
            <StateIcon size={14} className={isStreaming ? 'spin' : undefined} />
          </span>
          <span className="tool-name">{toolName}</span>
          {clientId && (
            <motion.span
              className="tool-client"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
            >
              client_id: {clientId}
            </motion.span>
          )}
        </CollapsibleTrigger>
        <AnimatePresence initial={false}>
          {open && (
            <CollapsibleContent forceMount asChild>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div className="tool-body">
                  <span className="mono" style={{ fontSize: '.85em' }}>
                    {JSON.stringify(part.input ?? part.output ?? {}, null, 2)}
                  </span>
                </div>
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </Collapsible>
    </motion.div>
  );
}

type AssistantParts = Array<{ type: string; text?: string } & ToolPart>;

const WRITE_TOOL_TYPES = new Set([
  'tool-linear_create_issue',
  'tool-notion_append_block',
]);

function getEnqueuedIntents(parts: AssistantParts): { intentId: string; tool: string }[] {
  return parts
    .filter((p) => WRITE_TOOL_TYPES.has(p.type))
    .map((p) => {
      const out = (p.output ?? {}) as { intent_id?: string; requires_confirmation?: boolean };
      if (out.intent_id && out.requires_confirmation) {
        return { intentId: out.intent_id, tool: p.type.replace(/^tool-/, '') };
      }
      return null;
    })
    .filter((x): x is { intentId: string; tool: string } => x !== null);
}

function PendingCTA({ active, count }: { active: boolean; count: number }) {
  const label = count > 1 ? `${count} acciones encoladas` : 'Acción encolada';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="mt-3"
    >
      {active ? (
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Link
            href="/pending"
            className="group flex items-center gap-3 rounded-[12px] border px-4 py-3 transition w-full"
            style={{
              background: 'color-mix(in srgb, var(--amber) 8%, var(--surface))',
              borderColor: 'color-mix(in srgb, var(--amber) 35%, transparent)',
              color: 'var(--fg)',
            }}
          >
            <span
              className="grid place-items-center rounded-[9px] w-9 h-9 shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--amber) 18%, var(--surface))',
                color: 'var(--amber-ink)',
              }}
            >
              <Inbox size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[0.92em] font-medium">{label}</div>
              <div className="text-[0.78em]" style={{ color: 'var(--muted)' }}>
                Confirma o rechaza en Pending Writes
              </div>
            </div>
            <motion.span
              className="grid place-items-center text-[var(--muted)] group-hover:text-[var(--fg)]"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight size={16} />
            </motion.span>
          </Link>
        </motion.div>
      ) : (
        <div
          className="flex items-center gap-3 rounded-[12px] border px-4 py-3 w-full opacity-50 cursor-not-allowed"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--muted)',
          }}
          aria-disabled
          title="Botón inactivo — esta propuesta ya no es la más reciente"
        >
          <span
            className="grid place-items-center rounded-[9px] w-9 h-9 shrink-0 bg-[var(--surface)] text-[var(--muted)]"
          >
            <Inbox size={16} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[0.92em] font-medium line-through decoration-[var(--border-strong)]">
              {label}
            </div>
            <div className="text-[0.78em]">Continúa abajo · revisa en Pending Writes cuando quieras</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AssistantMessage({ parts, isLatest }: { parts: AssistantParts; isLatest: boolean }) {
  const tools = parts.filter((p) => typeof p.type === 'string' && p.type.startsWith('tool-')) as ToolPart[];
  const textBuf = parts.filter((p) => p.type === 'text').map((p) => p.text ?? '').join('\n');
  const enqueued = getEnqueuedIntents(parts);

  return (
    <motion.div
      className="msg-row"
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <BrandMark size={30} className="asst-avatar" />
      <div className="bubble-asst">
        <Card className="asst-card !p-0 !gap-0 !border-[var(--border)] !bg-[var(--surface)] !text-[var(--fg)] !rounded-[16px]">
          <div className="px-[18px] pt-[12px] pb-[14px]">
            {tools.length > 0 && (
              <div className="tools" style={{ marginTop: 14 }}>
                {tools.map((t, i) => <ToolCard key={t.toolCallId ?? i} part={t} />)}
              </div>
            )}
            {textBuf && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: tools.length ? 0.15 : 0 }}
              >
                <Markdown source={textBuf} />
              </motion.div>
            )}
            {enqueued.length > 0 && (
              <PendingCTA active={isLatest} count={enqueued.length} />
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function Typing() {
  return (
    <motion.div
      className="msg-row"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
    >
      <BrandMark size={30} className="asst-avatar" animate={false} />
      <div style={{ flex: 'none' }}>
        <Card className="!p-0 !gap-0 !border-[var(--border)] !bg-[var(--surface)] !rounded-[16px] !shadow-sm inline-block">
          <div className="px-[14px]" style={{ paddingTop: 6, paddingBottom: 6 }}>
            <div className="typing" style={{ padding: '7px 2px' }}>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.95, repeat: Infinity, delay: i * 0.13, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <motion.div
      className="empty"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
    >
      <BrandMark size={54} className="empty-hero" />
      <motion.h1
        className="empty-title"
        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        ¿Qué necesitás saber?
      </motion.h1>
      <motion.p
        className="empty-sub"
        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        Sintetizo Linear, Notion, Slack, Granola y Calendar de tus cuentas. Pedime un estado, los riesgos abiertos o el brief de tu próxima reunión.
      </motion.p>
      <motion.div
        className="suggest-grid"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } } }}
      >
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.id}
              variants={{
                hidden: { opacity: 0, y: 14, scale: 0.97 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                role="button"
                tabIndex={0}
                onClick={() => onPick(s.prompt)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(s.prompt); } }}
                className="suggest-card !gap-[10px] !p-[14px] !border-[var(--border)] !bg-[var(--surface)] !text-[var(--fg)] hover:!border-[var(--border-strong)] cursor-pointer h-full"
              >
                <span className="suggest-corner"><CornerDownLeft size={14} /></span>
                <span className="suggest-icon"><Icon size={17} /></span>
                <div>
                  <div className="suggest-cat">{s.cat}</div>
                  <div className="suggest-label">{s.label}</div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

function Composer({ onSend, sending }: { onSend: (text: string) => void; sending: boolean }) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };
  const submit = () => {
    const t = val.trim();
    if (!t || sending) return;
    onSend(t);
    setVal('');
    if (ref.current) ref.current.style.height = 'auto';
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        <Textarea
          ref={ref}
          rows={1}
          value={val}
          placeholder="Preguntá por una cuenta, un riesgo o un brief…"
          onChange={(e) => { setVal(e.target.value); grow(e.target); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          className="!border-0 !bg-transparent !shadow-none !ring-0 !rounded-none !min-h-0 !p-0 !py-[7px] resize-none max-h-[160px] font-[inherit] text-[15px] leading-[1.5] text-[var(--fg)] placeholder:text-[var(--faint)] focus-visible:!ring-0 focus-visible:!border-0"
        />
        <motion.div whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.04 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!val.trim() || sending}
            aria-label="Enviar"
            className="send-btn h-[38px] w-[38px] rounded-[12px] bg-[var(--fg)] text-[var(--bg)] hover:bg-[var(--fg)] hover:opacity-[0.85] disabled:opacity-40 shrink-0"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={sending ? 'loading' : 'send'}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18 }}
                className="grid place-items-center"
              >
                {sending ? <Loader2 size={17} className="spin" /> : <Send size={16} />}
              </motion.span>
            </AnimatePresence>
          </Button>
        </motion.div>
      </div>
      <div className="composer-hint">Enter para enviar · Shift+Enter para salto de línea</div>
    </div>
  );
}

export function ChatShell({ title }: { title: string }) {
  const { openMenu } = useMenu();
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const sending = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const handleSend = (text: string) => {
    if (sending) return;
    sendMessage({ text });
  };

  return (
    <>
      <header className="chat-header">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={openMenu}
          aria-label="Menú"
          className="icon-btn menu-btn h-[34px] w-[34px] rounded-[9px] bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
        >
          <Menu size={18} />
        </Button>
        <span className="chat-title">{title}</span>
        <Badge
          variant="outline"
          className="status-badge gap-[7px] rounded-full border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] text-[0.8em] px-[9px] py-[4px] font-normal"
        >
          <motion.span
            className={cn('dot', !sending && 'live')}
            style={{ background: sending ? 'var(--amber)' : 'var(--emerald)' }}
            animate={sending ? { scale: [1, 1.4, 1], opacity: [1, 0.7, 1] } : { scale: 1, opacity: 1 }}
            transition={sending ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={sending ? 'thinking' : 'connected'}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18 }}
            >
              {sending ? 'Pensando' : 'Conectado'}
            </motion.span>
          </AnimatePresence>
        </Badge>
        <span className="header-spacer" />
        <ThemeToggle />
      </header>

      <div className="chat-scroll" ref={scrollRef}>
        <AnimatePresence mode="wait" initial={false}>
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <EmptyState onPick={handleSend} />
            </motion.div>
          ) : (
            <motion.div
              key="msgs"
              className="msgs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              <AnimatePresence initial={false}>
                {(() => {
                  const lastAssistantIdx = (() => {
                    for (let i = messages.length - 1; i >= 0; i--) {
                      if (messages[i].role === 'assistant') return i;
                    }
                    return -1;
                  })();
                  return messages.map((m, idx) => (
                    m.role === 'user' ? (
                      <motion.div
                        className="msg-row user"
                        key={m.id}
                        layout
                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      >
                        <div className="bubble-user">
                          {m.parts.filter((p: { type: string; text?: string }) => p.type === 'text').map((p: { text?: string }) => p.text).join('')}
                        </div>
                      </motion.div>
                    ) : (
                      <AssistantMessage
                        key={m.id}
                        parts={m.parts as AssistantParts}
                        isLatest={idx === lastAssistantIdx && !sending}
                      />
                    )
                  ));
                })()}
                {sending && <Typing key="typing" />}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Composer onSend={handleSend} sending={sending} />
    </>
  );
}
