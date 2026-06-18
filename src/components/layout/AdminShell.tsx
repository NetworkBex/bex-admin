'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, AlertTriangle, Award, BookOpen, Boxes, ChevronDown, ChevronsLeft, ChevronsRight,
  CircleDollarSign, Cog, Cpu, CreditCard, Database, FileCheck2, FileText, Gavel,
  Globe2, GraduationCap, History, KeyRound, LayoutDashboard, LifeBuoy, LogOut,
  Mail, MessageSquare, Network, Newspaper, Plug, Radio, Receipt, Server, Settings, ShieldCheck,
  Sparkles, Sun, Moon, TrendingUp, UserCog, Users, Vote, Wallet, Zap, BarChart3, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRequireAdmin } from '@/components/auth/useAuth';
import { PulseDot, Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { auditAPI, opsAPI } from '@/lib/api';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group?: string;
  badge?: 'health' | 'audit';
};

const NAV: NavItem[] = [
  { href: '/dashboard',     label: 'Overview',         icon: LayoutDashboard },
  { href: '/analytics',     label: 'Analytics',        icon: BarChart3 },
  { href: '/customers',     label: 'Customers',        icon: Users,         group: 'Operate' },
  { href: '/transactions',  label: 'Transactions',     icon: CreditCard,   group: 'Operate' },
  { href: '/investments',   label: 'Investments',      icon: TrendingUp,   group: 'Operate' },
  { href: '/affiliate',     label: 'Ambassador plan',  icon: Award,        group: 'Operate' },
  { href: '/affiliate/applications', label: 'Founding apps', icon: Vote,        group: 'Operate' },
  { href: '/content',       label: 'Content',          icon: Newspaper,    group: 'Operate' },
  { href: '/wallets',       label: 'Wallets & KYC',    icon: KeyRound,     group: 'Operate' },
  { href: '/ops',           label: 'Ops console',      icon: Activity,     group: 'Operate', badge: 'health' },
  { href: '/livetrades',    label: 'Live trades',      icon: Radio,        group: 'Operate' },
  { href: '/audit',         label: 'Audit log',        icon: History,      group: 'Operate', badge: 'audit' },
  { href: '/settings',      label: 'System settings',  icon: Settings,     group: 'Configure' },
  { href: '/docs',          label: 'API reference',    icon: BookOpen,     group: 'Configure' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useRequireAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [auditCount, setAuditCount] = useState<number | null>(null);

  // Live status pill for "Ops console" and "Audit log" badges.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const tick = () => {
      opsAPI.health().then((r) => { if (alive) setHealthOk(r.data?.db?.ok && r.data?.redis?.ok !== false); }).catch(() => { if (alive) setHealthOk(false); });
      auditAPI.summary().then((r) => { if (alive) setAuditCount(r.data?.total ?? null); }).catch(() => {});
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [ready]);

  const grouped = useMemo(() => {
    const out: Record<string, NavItem[]> = {};
    for (const item of NAV) {
      const g = item.group || 'Main';
      if (!out[g]) out[g] = [];
      out[g].push(item);
    }
    return out;
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center text-fg-subtle text-sm">
        <div className="flex items-center gap-2">
          <PulseDot tone="info" /> Authenticating…
        </div>
      </div>
    );
  }

  const signOut = () => {
    localStorage.removeItem('admin_access');
    localStorage.removeItem('admin_refresh');
    router.push('/auth/login');
  };

  return (
    <div className={cn('min-h-screen grid bg-canvas text-fg', collapsed ? 'grid-cols-[64px_1fr]' : 'grid-cols-[260px_1fr]')}>
      {/* ─── Sidebar ──────────────────────────────────────────────── */}
      <aside className="border-r border-hairline bg-surface flex flex-col">
        <div className="h-14 px-4 flex items-center justify-between border-b border-hairline">
          <Link href="/dashboard" className={cn('flex items-center gap-2 font-semibold tracking-tight', collapsed && 'justify-center w-full')}>
            <span className="size-7 rounded-md bg-center bg-cover shrink-0"
                  style={{ backgroundImage: 'url(/logo.png)' }} role="img" aria-label="BEX" />
            {!collapsed && <span className="text-[15px]">BEX<span className="text-fg-muted">·Admin</span></span>}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-fg-subtle hover:text-fg hidden lg:grid place-items-center size-6 rounded-md hover:bg-surface-2"
            aria-label="toggle sidebar"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              {!collapsed && (
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold px-2 mb-2">{group}</div>
              )}
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = pathname === it.href || (it.href !== '/dashboard' && pathname.startsWith(it.href + '/'));
                  const dot =
                    it.badge === 'health' ? (
                      <PulseDot tone={healthOk === false ? 'danger' : healthOk === null ? 'warning' : 'success'} />
                    ) : it.badge === 'audit' && auditCount != null ? (
                      <span className="text-[10px] font-mono text-fg-subtle tabular">{auditCount}</span>
                    ) : null;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-2.5 h-8 text-[13px] font-medium transition-colors',
                          active
                            ? 'bg-accent-soft text-accent-fg'
                            : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                          collapsed && 'justify-center',
                        )}
                        title={collapsed ? it.label : undefined}
                      >
                        <it.icon className="size-3.5 shrink-0" />
                        {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                        {!collapsed && dot}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-hairline px-3 py-3">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-accent-soft text-accent-fg grid place-items-center text-xs font-semibold">
                {(user?.admin?.email || 'A').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-fg truncate">{user?.admin?.email}</div>
                <div className="text-[10.5px] text-fg-subtle truncate">Administrator</div>
              </div>
              <button onClick={signOut} className="text-fg-subtle hover:text-fg" title="Sign out">
                <LogOut className="size-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={signOut} className="w-full grid place-items-center text-fg-subtle hover:text-fg" title="Sign out">
              <LogOut className="size-3.5" />
            </button>
          )}
        </div>
      </aside>

      {/* ─── Main column ──────────────────────────────────────────── */}
      <main className="min-w-0 flex flex-col">
        <header className="h-14 border-b border-hairline bg-surface/80 backdrop-blur-md px-5 flex items-center justify-between sticky top-0 z-10">
          <Breadcrumb pathname={pathname} />
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
              <PulseDot tone={healthOk === false ? 'danger' : healthOk === null ? 'warning' : 'success'} />
              {healthOk === null ? 'checking…' : healthOk ? 'all systems ok' : 'degraded'}
            </span>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return <div className="text-sm font-semibold text-fg">Overview</div>;
  return (
    <nav className="text-sm text-fg-muted flex items-center gap-1.5 min-w-0">
      {parts.map((p, i) => {
        const href = '/' + parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;
        return (
          <span key={href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-fg-subtle/60">/</span>}
            <Link
              href={href}
              className={cn('capitalize truncate', isLast ? 'text-fg font-semibold' : 'hover:text-fg transition-colors')}
            >
              {p.replace(/-/g, ' ')}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

function BexMonogram({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden>
      <path d="M6 5h7a4 4 0 0 1 0 8H6V5z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M6 11h8a4 4 0 0 1 0 8H6v-8z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}
