'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Sidebar, SidebarInner, type SidebarUser } from './sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type AppShellCtx = { openMenu: () => void; closeMenu: () => void; menuOpen: boolean };
const Ctx = createContext<AppShellCtx | null>(null);

export function useMenu() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMenu must be used within AppShell');
  return v;
}

export function AppShell({
  user, clients, pendingCount = 0, children,
}: {
  user: SidebarUser; clients: string[]; pendingCount?: number; children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);

  return (
    <Ctx.Provider value={{ openMenu, closeMenu, menuOpen }}>
      <div className="shell">
        {/* desktop persistent */}
        <Sidebar user={user} clients={clients} pendingCount={pendingCount} />

        {/* mobile drawer via shadcn Sheet */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="sb !p-0 w-[260px] sm:max-w-[260px] bg-[var(--surface)] border-r border-[var(--border)]"
          >
            <SidebarInner user={user} clients={clients} pendingCount={pendingCount} onItemClick={closeMenu} />
          </SheetContent>
        </Sheet>

        <main className="main">{children}</main>
      </div>
    </Ctx.Provider>
  );
}
