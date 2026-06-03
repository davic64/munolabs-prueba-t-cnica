'use client';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

function fontSizeFor(size: number) {
  if (size >= 48) return `${Math.round(size * 0.42)}px`;
  if (size >= 30) return `${Math.round(size * 0.5)}px`;
  return `${Math.round(size * 0.55)}px`;
}

export function BrandMark({
  size = 30,
  className,
  animate = true,
}: {
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const avatar = (
    <Avatar style={{ width: size, height: size, borderRadius: 9 }}>
      <AvatarFallback
        className="text-white font-semibold tracking-tight"
        style={{
          background: 'linear-gradient(135deg, var(--grad-from), var(--grad-to))',
          borderRadius: 9,
          fontSize: fontSizeFor(size),
        }}
      >
        GA
      </AvatarFallback>
    </Avatar>
  );

  if (!animate) {
    return (
      <span
        className={cn('brand-mark', className)}
        style={{ display: 'inline-flex', borderRadius: 9, lineHeight: 0 }}
      >
        {avatar}
      </span>
    );
  }

  return (
    <motion.span
      className={cn('brand-mark', className)}
      style={{ display: 'inline-flex', borderRadius: 9, lineHeight: 0 }}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        boxShadow: [
          '0 0 0 1px color-mix(in srgb, var(--grad-from) 30%, transparent), 0 6px 18px -6px color-mix(in srgb, var(--grad-from) 50%, transparent)',
          '0 0 0 1px color-mix(in srgb, var(--grad-from) 60%, transparent), 0 10px 28px -6px color-mix(in srgb, var(--grad-from) 70%, transparent)',
          '0 0 0 1px color-mix(in srgb, var(--grad-from) 30%, transparent), 0 6px 18px -6px color-mix(in srgb, var(--grad-from) 50%, transparent)',
        ],
      }}
      transition={{
        scale: { type: 'spring', stiffness: 200, damping: 18 },
        opacity: { duration: 0.3 },
        boxShadow: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
      }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
    >
      {avatar}
    </motion.span>
  );
}
