'use client';

import { Menu } from 'lucide-react';
import { useMenu } from './app-shell';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';

export function PendingHeader() {
  const { openMenu } = useMenu();
  return (
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
      <span className="chat-title">Pending writes</span>
      <span className="header-spacer" />
      <ThemeToggle />
    </header>
  );
}
