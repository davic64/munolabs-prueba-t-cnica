'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Inbox } from 'lucide-react';
import { IntentCard } from './intent-card';

export type IntentRow = {
  id: string; tool: string; clientId: string; preview: string; status: string; createdAt: string;
};

export function PendingGrid({ intents }: { intents: IntentRow[] }) {
  if (intents.length === 0) {
    return (
      <motion.div
        className="pending-empty"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.span
          className="ico-box"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Inbox size={24} />
        </motion.span>
        <h3>No hay nada pendiente</h3>
        <p>Cuando el agente proponga escribir en Linear o Notion, aparece aquí para que lo confirmes.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="intent-grid"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
    >
      <AnimatePresence initial={false}>
        {intents.map((r) => (
          <IntentCard
            key={r.id}
            id={r.id}
            tool={r.tool}
            clientId={r.clientId}
            preview={r.preview}
            status={r.status}
            createdAt={r.createdAt}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
