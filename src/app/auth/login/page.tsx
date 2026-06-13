'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, ShieldCheck, History, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { authAPI, parseApiError } from '@/lib/api';
import { useToast } from '@/components/Toast';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const { push } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { is_admin, tokens } = res.data || {};
      if (!is_admin) {
        push('These credentials are not admin accounts.', 'error');
        setLoading(false);
        return;
      }
      localStorage.setItem('admin_access', tokens.access);
      localStorage.setItem('admin_refresh', tokens.refresh);
      push('Welcome back, admin.', 'success');
      router.push(next);
    } catch (err) {
      push(parseApiError(err, 'Login failed'), 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-canvas text-fg">
      <div className="flex flex-col px-6 py-8 lg:px-12 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid place-items-center rounded-md size-7 bg-fg text-fg-inverse">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
                <path d="M6 5h7a4 4 0 0 1 0 8H6V5z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
                <path d="M6 11h8a4 4 0 0 1 0 8H6v-8z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[15px]">BEX<span className="text-fg-muted">·Admin</span></span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto animate-rise-in">
            <h1 className="text-2xl font-semibold tracking-tight text-fg leading-tight">Operator sign in</h1>
            <p className="text-sm text-fg-muted mt-2">Restricted area. Standard user accounts cannot sign in here.</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <Field label="Email" required>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="admin@bexnetwork.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leadingIcon={<Mail />}
                />
              </Field>
              <Field label="Password" required>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  leadingIcon={<Lock />}
                />
              </Field>
              <Button size="lg" className="w-full" loading={loading} trailingIcon={!loading ? <ArrowRight className="size-4" /> : undefined}>
                Sign in
              </Button>
            </form>
          </div>
        </div>

        <div className="text-[11px] text-fg-subtle">© 2026 Bayes-Euler Limited (BVI).</div>
      </div>

      <div className="hidden lg:flex relative overflow-hidden bg-surface-sunk border-l border-hairline">
        <div aria-hidden className="absolute inset-0 grid-bg opacity-50 mask-radial-fade" />
        <div aria-hidden className="absolute -top-32 -right-32 size-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative w-full flex flex-col p-12 justify-between">
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <span className="relative inline-flex size-2">
              <span className="absolute inset-0 rounded-full opacity-60 animate-ping bg-success" />
              <span className="relative inline-flex rounded-full size-2 bg-success" />
            </span>
            <span>Operator console · all systems operational</span>
          </div>

          <div className="space-y-7">
            <h2 className="text-4xl font-semibold tracking-tight text-fg leading-[1.1]">
              Run the platform, <span className="text-gradient">with proof</span>.
            </h2>
            <p className="text-base text-fg-muted max-w-md">
              Every admin action is recorded in an immutable audit log. Customers, transactions, plans, ops — one console.
            </p>
            <ul className="space-y-3 max-w-md text-sm">
              <li className="flex items-start gap-3 py-2.5">
                <span className="text-accent shrink-0 mt-0.5"><ShieldCheck className="size-4" /></span>
                <div>
                  <div className="text-sm font-semibold text-fg">Admin-only</div>
                  <div className="text-xs text-fg-muted">Standard user JWTs are rejected at the layout level.</div>
                </div>
              </li>
              <li className="flex items-start gap-3 py-2.5">
                <span className="text-accent shrink-0 mt-0.5"><History className="size-4" /></span>
                <div>
                  <div className="text-sm font-semibold text-fg">Append-only audit</div>
                  <div className="text-xs text-fg-muted">Every mutation is logged with actor, target, and diff.</div>
                </div>
              </li>
              <li className="flex items-start gap-3 py-2.5">
                <span className="text-accent shrink-0 mt-0.5"><Activity className="size-4" /></span>
                <div>
                  <div className="text-sm font-semibold text-fg">Live ops</div>
                  <div className="text-xs text-fg-muted">Health, beat schedule, earnings runs, manual triggers.</div>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-3 text-xs text-fg-subtle font-mono">
            <span>cycle 28,401 · block 19,283,114</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
