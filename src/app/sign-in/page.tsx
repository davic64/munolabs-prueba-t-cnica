'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { signIn } from '@/lib/auth/client';
import { BrandMark } from '../_components/brand-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const QUICK = [
  { email: 'founder@muno.lab', name: 'Founder', scope: 'Todas' },
  { email: 'lead@muno.lab',    name: 'Lead Acme', scope: 'Solo Acme' },
];

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email || loading) return;
    setLoading(true); setError(null);
    const res = await signIn.email({ email, password: pw || 'password123' });
    setLoading(false);
    if (res.error) setError(res.error.message ?? 'No pude iniciar sesión');
    else router.push('/');
  };

  const fill = (q: { email: string }) => { setEmail(q.email); setPw('password123'); };

  return (
    <main className="signin-wrap">
      <motion.div
        className="signin-card"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="signin-hero"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
          }}
        >
          <BrandMark size={48} />
          <motion.h1 variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            Growth Agent
          </motion.h1>
          <motion.p variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            El PM que ya leyó la última reunión. Estado, riesgos y briefs de tus cuentas.
          </motion.p>
        </motion.div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[0.8em] text-[var(--muted)]">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              placeholder="vos@studio.co"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="rounded-[var(--r-btn)] border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] focus-visible:border-[var(--fg)] focus-visible:ring-0 h-auto px-[13px] py-[10px] text-[15px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pw" className="text-[0.8em] text-[var(--muted)]">Contraseña</Label>
            <Input
              id="pw"
              type="password"
              value={pw}
              placeholder="••••••••"
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="rounded-[var(--r-btn)] border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] focus-visible:border-[var(--fg)] focus-visible:ring-0 h-auto px-[13px] py-[10px] text-[15px]"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-[9px] border px-3 py-2 text-[0.85em]"
            style={{
              background: 'color-mix(in srgb, var(--red) 8%, var(--surface))',
              borderColor: 'color-mix(in srgb, var(--red) 30%, transparent)',
              color: 'var(--red-ink)',
            }}>
            {error}
          </div>
        )}

        <Button
          onClick={submit}
          disabled={!email || loading}
          className="mt-4 w-full h-auto rounded-[var(--r-btn)] bg-[var(--fg)] text-[var(--bg)] hover:bg-[var(--fg)] hover:opacity-[0.88] py-[9px] px-[14px] text-[15px] font-medium"
        >
          {loading ? <Loader2 size={16} className="spin" /> : 'Entrar'}
        </Button>

        <div className="qlogin-label">o entrá como demo</div>
        <motion.div
          className="space-y-2 mb-2"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } },
          }}
        >
          {QUICK.map((q) => (
            <motion.button
              key={q.email}
              type="button"
              onClick={() => fill(q)}
              className="qlogin"
              variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Avatar className="size-8 rounded-[9px] bg-[var(--surface-2)]">
                <AvatarFallback className="rounded-[9px] bg-[var(--surface-2)] text-[var(--muted)]">
                  <UserIcon size={16} />
                </AvatarFallback>
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <div className="ql-name">{q.name}</div>
                <div className="ql-scope">{q.email}</div>
              </div>
              <Badge
                variant="outline"
                className="ml-auto rounded-full border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] font-semibold text-[0.72em] px-[9px] py-[2px]"
              >
                {q.scope}
              </Badge>
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          className="pwhint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          Demo · contraseña <span className="mono">password123</span>.
        </motion.div>
      </motion.div>
    </main>
  );
}
