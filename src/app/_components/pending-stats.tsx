'use client';

import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { useEffect, useState } from 'react';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  rejected: 'Rechazado',
  failed: 'Falló',
};
const ORDER = ['pending', 'confirmed', 'rejected', 'failed'] as const;

function Counter({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on('change', setDisplay);
    return () => { controls.stop(); unsub(); };
  }, [value, mv, rounded]);

  return <>{display}</>;
}

export function PendingStats({ counts }: { counts: Record<string, number> }) {
  return (
    <motion.div
      className="stat-row"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
    >
      {ORDER.map((s) => (
        <motion.div
          key={s}
          variants={{
            hidden: { opacity: 0, y: 10, scale: 0.94 },
            show: { opacity: 1, y: 0, scale: 1 },
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          whileHover={{ y: -2 }}
        >
          <div className={`stat-pill s-${s}`}>
            <span className="dot" />
            <span className="stat-n"><Counter value={counts[s] ?? 0} /></span>
            <span className="stat-l">{STATUS_LABEL[s]}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
