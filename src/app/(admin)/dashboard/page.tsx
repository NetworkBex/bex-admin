'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowUpRight, ChevronRight, CircleDollarSign, CreditCard, Database,
  History, RefreshCcw, ShieldCheck, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, PulseDot } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import {
  auditAPI, earningsAPI, investmentAPI, opsAPI, transactionAPI,
} from '../_api';
import { formatMoney, formatCompact, relativeTime, cn } from '@/lib/utils';

type Snapshot = {
  counts: { customers: number; investments: number; transactions: number; earning_runs: number; investments_active: number };
  health: any;
  stats: any;
  earnings: any;
  plan: any;
  audit: any;
  recent_transactions: any[];
  recent_investments: any[];
};

export default function DashboardPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [last, setLast] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [h, stats, e, plan, audit, txs, invs] = await Promise.all([
        opsAPI.health(),
        opsAPI.stats().catch(() => ({ data: null })),
        earningsAPI.summary(),
        fetch('http://localhost:8000/api/affiliate/plan/').then((r) => r.json()),
        auditAPI.summary(),
        transactionAPI.list({ page_size: 5 }),
        investmentAPI.list({ page_size: 5 }),
      ]);
      setSnap({
        counts: h.data.counts,
        health: h.data,
        stats: stats.data,
        earnings: e.data,
        plan,
        audit: audit.data,
        recent_transactions: txs.data?.results || [],
        recent_investments:  invs.data?.results  || [],
      });
      setLast(new Date());
    } catch {
      // error surfaces on individual tiles
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const totalActiveStake = (snap?.recent_investments || [])
    .filter((i: any) => i.status === 0)
    .reduce((s: number, i: any) => s + Number(i.amount), 0);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="Overview"
        title="Operator console"
        description="Live platform status. Tiles refresh every 30 seconds; click any tile for the underlying list."
        actions={
          <>
            {last && <span className="text-[11px] text-fg-subtle">Updated {relativeTime(last.toISOString())}</span>}
            <Button size="sm" variant="secondary" onClick={load} leadingIcon={<RefreshCcw className="size-3.5" />}>
              Refresh
            </Button>
          </>
        }
      />

      {/* ─── Health banner ───────────────────────────────────────── */}
      {snap && (
        <HealthBanner health={snap.health} />
      )}

      {/* ─── KPI grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Kpi icon={Users}          label="Customers"        value={snap?.counts.customers}        loading={loading} href="/customers" />
        <Kpi icon={TrendingUp}     label="Active cycles"   value={snap?.counts.investments_active} loading={loading} href="/investments" />
        <Kpi icon={CreditCard}     label="Transactions"    value={snap?.counts.transactions}     loading={loading} href="/transactions" />
        <Kpi icon={CircleDollarSign} label="Lifetime earned" value={snap?.earnings ? formatMoney(snap.earnings.lifetime) : undefined} loading={loading} href="/investments" />
        <Kpi icon={ShieldCheck}    label="Earning runs"    value={snap?.counts.earning_runs}     loading={loading} href="/ops" />
        <Kpi icon={History}        label="Audit events"    value={snap?.audit?.total}            loading={loading} href="/audit" />
      </div>

      {/* ─── Two-column: live ops + earnings + recent activity ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Live ops tile — uses the new /ops/stats/ endpoint */}
        <Card>
          <CardHeader title="Live ops" description="Tiles from /ops/stats/" icon={<Database className="size-4" />} />
          <CardBody>
            {snap?.stats ? (
              <div className="space-y-1.5 text-[12.5px]">
                <Stat label="Active cycles"   value={snap.stats.active_investments} />
                <Stat label="Today's deposits" value={formatMoney(snap.stats.todays_deposits_usd)} tone="success" />
                <Stat label="Pending withdrawals" value={snap.stats.pending_withdrawals} tone="warning" />
                <Stat label="7d credits"     value={formatMoney(snap.stats.credits_7d_usd)} tone="accent" />
                <Stat label="Error rate (24h)" value={`${(snap.stats.error_rate_24h * 100).toFixed(1)}%`} tone={(snap.stats.error_rate_24h ?? 0) > 0.1 ? 'warning' : 'success'} />
                <Stat label="Last credit run" value={snap.stats.last_credit_run ? relativeTime(new Date(snap.stats.last_credit_run).toISOString()) : '—'} />
              </div>
            ) : <div className="skeleton h-24" />}
          </CardBody>
        </Card>

        {/* Earnings strip */}
        <Card>
          <CardHeader title="Earnings engine" description="Today's daily-yield credit" icon={<TrendingUp className="size-4" />} />
          <CardBody>
            {snap?.earnings ? (
              <>
                <div className="text-3xl font-semibold tabular text-fg">{formatMoney(snap.earnings.today)}</div>
                <div className="text-[11.5px] text-fg-subtle mt-1">
                  30-day: {formatMoney(snap.earnings.last_30_days)} · Lifetime: {formatMoney(snap.earnings.lifetime)}
                </div>
                <Link href="/ops" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:gap-2 transition-all">
                  Trigger credit now <ArrowUpRight className="size-3" />
                </Link>
              </>
            ) : <div className="skeleton h-16" />}
          </CardBody>
        </Card>

        {/* DB stats */}
        <Card>
          <CardHeader title="Database" description={snap?.health?.db?.engine || ''} icon={<Database className="size-4" />} />
          <CardBody>
            {snap?.health ? (
              <>
                <div className="flex items-center gap-2">
                  <PulseDot tone={snap.health.db.ok ? 'success' : 'danger'} />
                  <span className="text-sm font-semibold text-fg">{snap.health.db.ok ? 'Healthy' : 'Error'}</span>
                </div>
                <div className="text-[11.5px] text-fg-subtle mt-1 font-mono">
                  size: {snap.health.db.size_bytes ? formatCompact(snap.health.db.size_bytes) + 'B' : '—'}
                </div>
                {snap.health.db.error && (
                  <div className="mt-2 text-[11.5px] text-danger font-mono break-all">{snap.health.db.error}</div>
                )}
              </>
            ) : <div className="skeleton h-16" />}
          </CardBody>
        </Card>

        {/* Plan + founding */}
        <Card>
          <CardHeader title="Compensation plan" description={snap?.plan?.tokenTicker} icon={<ShieldCheck className="size-4" />} />
          <CardBody>
            {snap?.plan ? (
              <>
                <div className="text-2xl font-semibold tabular text-fg">
                  {snap.plan.partnerPoolSharePercent}% <span className="text-xs font-normal text-fg-muted">partner pool</span>
                </div>
                <div className="text-[11.5px] text-fg-subtle mt-1">
                  {snap.plan.ranks.length} ranks · {snap.plan.unilevel.length} unilevel levels
                </div>
                <Link href="/affiliate" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:gap-2 transition-all">
                  Open plan editor <ArrowUpRight className="size-3" />
                </Link>
              </>
            ) : <div className="skeleton h-16" />}
          </CardBody>
        </Card>
      </div>

      {/* ─── Recent activity ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Recent transactions"
            description="Last 5 platform transactions"
            icon={<CreditCard className="size-4" />}
            action={<Link href="/transactions" className="text-xs text-fg-muted hover:text-fg inline-flex items-center gap-0.5">View all <ChevronRight className="size-3" /></Link>}
          />
          <CardBody className="px-0 pb-0">
            <ul className="divide-y divide-hairline">
              {(snap?.recent_transactions || []).map((t: any) => (
                <li key={t.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                  <span className="grid place-items-center size-7 rounded-md bg-surface-2 text-fg-muted">
                    <CreditCard className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-fg truncate">{t.customer_name} · <span className="text-fg-muted capitalize">{t.type}</span></div>
                    <div className="text-[11.5px] text-fg-subtle font-mono">{t.method} · {t.currency_name} · {relativeTime(t.date_created)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular text-fg">{formatMoney(t.amount)}</div>
                    <Badge tone={t.status === 3 ? 'success' : t.status === 0 ? 'warning' : 'info'} className="mt-0.5">
                      {t.status === 3 ? 'Completed' : t.status === 0 ? 'Pending' : 'Processing'}
                    </Badge>
                  </div>
                </li>
              ))}
              {!loading && (snap?.recent_transactions || []).length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-fg-muted">No transactions yet.</li>
              )}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent cycles"
            description="Last 5 investments"
            icon={<TrendingUp className="size-4" />}
            action={<Link href="/investments" className="text-xs text-fg-muted hover:text-fg inline-flex items-center gap-0.5">View all <ChevronRight className="size-3" /></Link>}
          />
          <CardBody className="px-0 pb-0">
            <ul className="divide-y divide-hairline">
              {(snap?.recent_investments || []).map((i: any) => (
                <li key={i.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                  <span className="grid place-items-center size-7 rounded-md bg-surface-2 text-fg-muted">
                    <Wallet className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-fg truncate">{i.customer_name} · {i.plan_name || i.name}</div>
                    <div className="text-[11.5px] text-fg-subtle font-mono">due {i.due_date?.slice(0, 10)} · {relativeTime(i.date_created)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular text-fg">{formatMoney(i.amount)}</div>
                    <Badge tone={i.status === 0 ? 'warning' : 'success'} className="mt-0.5">
                      {i.status === 0 ? 'Active' : 'Completed'}
                    </Badge>
                  </div>
                </li>
              ))}
              {!loading && (snap?.recent_investments || []).length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-fg-muted">No cycles yet.</li>
              )}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, loading, href }: { icon: any; label: string; value: any; loading: boolean; href: string }) {
  return (
    <Link href={href} className="block">
      <Card className="hover:border-border-strong transition-colors">
        <CardBody className="p-4">
          <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold">
            <Icon className="size-3 text-fg-subtle" />
            {label}
          </div>
          <div className="text-2xl font-semibold tabular text-fg mt-2">
            {loading ? <span className="skeleton inline-block h-7 w-16" /> : (value ?? '—')}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: any; tone?: 'neutral' | 'success' | 'warning' | 'accent' | 'danger' }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'accent' ? 'text-accent' : tone === 'danger' ? 'text-danger' : 'text-fg';
  return (
    <div className="flex items-baseline justify-between border-b border-hairline last:border-b-0 py-1">
      <span className="text-fg-muted text-[11px] uppercase tracking-wider font-semibold">{label}</span>
      <span className={cn('tabular font-semibold', toneClass)}>{value ?? '—'}</span>
    </div>
  );
}

function HealthBanner({ health }: { health: any }) {
  if (!health) return null;
  const dbOk = health.db?.ok;
  const redisOk = health.redis?.ok;
  if (dbOk && redisOk) return null; // green path → don't show banner
  return (
    <div className={cn(
      'mb-4 rounded-lg border p-3.5 flex items-start gap-3',
      dbOk ? 'border-warning/30 bg-warning-soft' : 'border-danger/30 bg-danger-soft',
    )}>
      <AlertTriangle className={cn('size-4 shrink-0 mt-0.5', dbOk ? 'text-warning' : 'text-danger')} />
      <div className="text-sm">
        <div className="font-semibold">
          {dbOk ? 'One or more background services are degraded.' : 'Critical service degraded — investigate immediately.'}
        </div>
        <div className="text-[12.5px] mt-0.5 space-y-0.5">
          {dbOk ? null : <div>Database: {health.db.error}</div>}
          {redisOk ? null : <div>Redis / Celery broker: {health.redis.error || 'unreachable'}</div>}
        </div>
      </div>
    </div>
  );
}
