'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';

type Spark = { x: number; y: number; nextIsDark: boolean; id: number };

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [spark, setSpark] = useState<Spark | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  function handleClick() {
    if (!mounted) return;
    const rect = btnRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 24;
    const y = rect ? rect.top + rect.height / 2 : 24;
    const nextIsDark = !isDark;
    const root = document.documentElement;
    const maxR = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    root.style.setProperty('--vt-x', `${x}px`);
    root.style.setProperty('--vt-y', `${y}px`);
    root.style.setProperty('--vt-r', `${maxR}px`);

    // Sparkle flash through motion portal — independent of the view transition.
    setSpark({ x, y, nextIsDark, id: Date.now() });
    window.setTimeout(() => setSpark(null), 750);

    // Prefer the native API — it actually reveals the new theme through an
    // expanding circle (old state stays visible outside the circle).
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (typeof doc.startViewTransition !== 'function') {
      setTheme(nextIsDark ? 'dark' : 'light');
      return;
    }

    doc.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextIsDark ? 'dark' : 'light');
      });
    });
  }

  return (
    <>
      <Button
        ref={btnRef}
        type="button"
        variant="outline"
        size="icon"
        onClick={handleClick}
        aria-label="Cambiar tema"
        className="icon-btn h-[34px] w-[34px] rounded-[9px] bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] relative overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? 'sun' : 'moon'}
            initial={{ y: 18, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -18, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 grid place-items-center"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </motion.span>
        </AnimatePresence>
      </Button>

      {mounted && spark && createPortal(<Spark spark={spark} />, document.body)}
    </>
  );
}

function Spark({ spark }: { spark: Spark }) {
  const accent = spark.nextIsDark ? '#d946ef' : '#8b5cf6';
  return (
    <AnimatePresence>
      <motion.div
        key={spark.id}
        className="fixed inset-0 z-[10000] pointer-events-none"
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{
          background: `radial-gradient(circle 220px at ${spark.x}px ${spark.y}px, color-mix(in srgb, ${accent} 35%, transparent), transparent 70%)`,
        }}
      />
    </AnimatePresence>
  );
}
