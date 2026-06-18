'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Users, UserCheck, Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  Coins, BadgeDollarSign, Clock, RefreshCcw, Globe2,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/PageHeader';
import { opsAPI } from '@/lib/api';
import { formatMoney, formatCompact, cn } from '@/lib/utils';

const C = {
  accent: '#10b981',
  info:   '#6366f1',
  warn:   '#f59e0b',
  danger: '#ef4444',
  cyan:   '#06b6d4',
  violet: '#8b5cf6',
  grid:   'rgba(148,163,184,0.15)',
  axis:   'rgba(148,163,184,0.7)',
};
const PIE = [C.accent, C.info, C.warn, C.cyan, C.violet, C.danger, '#ec4899', '#84cc16'];

function fmtDay(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = (d: number) => {
    setLoading(true);
    opsAPI.analytics(d).then((r) => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false));
  };
  useEffect(() => { load(days); }, [days]);

  const k = data?.kpis;
  const series = useMemo(() => (data?.series ?? []).map((s: any) => ({ ...s, label: fmtDay(s.date) })), [data]);

  return (
    <div className="p-6 md:p-8 max-w-[1300px] mx-auto">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Growth, treasury flows, investments and your top performers."
        actions={
          <div className="flex items-center gap-1.5">
            {[7, 30, 90].map((d) => (
              <Button key={d} size="sm" variant={days === d ? 'primary' : 'secondary'} onClick={() => setDays(d)}>{d}d</Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => load(days)} leadingIcon={<RefreshCcw className="size-3.5" />}>Refresh</Button>
          </div>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi icon={<Users className="size-4" />} label="Total users" value={k ? k.totalUsers.toLocaleString() : '—'} sub={k ? `${k.verifiedUsers} verified` : ''} loading={loading} />
        <Kpi icon={<UserCheck className="size-4" />} label="Signups (30d)" value={k ? k.signups30d.toLocaleString() : '—'} sub={k ? `${k.signupsToday} today` : ''} loading={loading} />
        <Kpi icon={<TrendingUp className="size-4" />} label="AUM (active stake)" value={k ? formatMoney(k.aumUsd) : '—'} sub={k ? `${k.activeInvestments} active cycles` : ''} loading={loading} accent />
        <Kpi icon={<Wallet className="size-4" />} label="User balances" value={k ? formatMoney(k.totalBalancesUsd) : '—'} loading={loading} />
        <Kpi icon={<ArrowDownToLine className="size-4" />} label="Deposits (total)" value={k ? formatMoney(k.totalDepositsUsd) : '—'} sub={k ? `${k.pendingDeposits} pending` : ''} loading={loading} />
        <Kpi icon={<ArrowUpFromLine className="size-4" />} label="Withdrawals (total)" value={k ? formatMoney(k.totalWithdrawalsUsd) : '—'} sub={k ? `${k.pendingWithdrawals} pending` : ''} loading={loading} />
        <Kpi icon={<Coins className="size-4" />} label="Profit paid" value={k ? formatMoney(k.profitPaidUsd) : '—'} loading={loading} />
        <Kpi icon={<BadgeDollarSign className="size-4" />} label="Commissions paid" value={k ? formatMoney(k.commissionsPaidUsd) : '—'} loading={loading} />
      </div>

      {/* Treasury flows */}
      <Card className="mb-4">
        <CardHeader title="Deposits vs withdrawals" description={`Completed flows over the last ${days} days`} />
        <CardBody className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity={0.35} /><stop offset="100%" stopColor={C.accent} stopOpacity={0} /></linearGradient>
                <linearGradient id="gWd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.danger} stopOpacity={0.3} /><stop offset="100%" stopColor={C.danger} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} width={48} />
              <Tooltip content={<ChartTip money />} />
              <Area type="monotone" dataKey="deposits" name="Deposits" stroke={C.accent} fill="url(#gDep)" strokeWidth={2} />
              <Area type="monotone" dataKey="withdrawals" name="Withdrawals" stroke={C.danger} fill="url(#gWd)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Signups */}
        <Card>
          <CardHeader title="New signups" description={`Daily registrations · last ${days} days`} />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="signups" name="Signups" fill={C.info} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Profit + invested */}
        <Card>
          <CardHeader title="Profit credited & new investments" description={`Daily · last ${days} days`} />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} width={48} />
                <Tooltip content={<ChartTip money />} />
                <Line type="monotone" dataKey="profit" name="Profit paid" stroke={C.accent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="invested" name="New investments" stroke={C.violet} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Volume by plan */}
        <Card>
          <CardHeader title="Volume by plan" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.byPlan ?? []} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                <XAxis type="number" stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                <YAxis type="category" dataKey="name" stroke={C.axis} fontSize={11} tickLine={false} axisLine={false} width={120} />
                <Tooltip content={<ChartTip money k="volumeUsd" />} />
                <Bar dataKey="volumeUsd" name="Volume" radius={[0, 3, 3, 0]}>
                  {(data?.byPlan ?? []).map((_: any, i: number) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Transactions by type */}
        <Card>
          <CardHeader title="Transactions by type" />
          <CardBody>
            <div className="space-y-1.5">
              {(data?.txByType ?? []).map((t: any) => (
                <div key={t.type} className="flex items-center gap-3 text-[13px] py-1.5 border-b border-hairline last:border-0">
                  <Badge tone="neutral" className="capitalize w-24 justify-center">{t.type}</Badge>
                  <span className="text-fg-muted">{t.count.toLocaleString()} tx</span>
                  <span className="ml-auto tabular text-fg font-medium">{formatMoney(t.volumeUsd)}</span>
                </div>
              ))}
              {(!data || data.txByType.length === 0) && <div className="text-[13px] text-fg-muted py-4">No transactions yet.</div>}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <RankTable title="Top investors" rows={data?.topInvestors} render={(r: any) => formatMoney(r.totalUsd)} sub={(r: any) => `${r.cycles} cycles`} />
        <RankTable title="Top earners (commission)" rows={data?.topEarners} render={(r: any) => formatMoney(r.totalUsd)} />
        <Card>
          <CardHeader title="By country" icon={<Globe2 className="size-4" />} />
          <CardBody>
            <div className="space-y-1.5">
              {(data?.byCountry ?? []).map((r: any) => (
                <div key={r.country} className="flex items-center gap-2 text-[13px] py-1.5 border-b border-hairline last:border-0">
                  <span className="text-fg truncate">{r.country}</span>
                  <span className="ml-auto tabular text-fg-muted">{r.count}</span>
                </div>
              ))}
              {(!data || data.byCountry.length === 0) && <div className="text-[13px] text-fg-muted py-4">No country data.</div>}
            </div>
          </CardBody>
        </Card>
      </div>

      {data?.generatedAt && (
        <div className="mt-4 text-[11px] text-fg-subtle flex items-center gap-1.5">
          <Clock className="size-3" /> Generated {new Date(data.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, sub, loading, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; loading?: boolean; accent?: boolean }) {
  return (
    <Card className={cn(accent && 'ring-1 ring-accent/30')}>
      <CardBody className="p-4">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-fg-subtle">
          <span className={accent ? 'text-accent' : 'text-fg-muted'}>{icon}</span>{label}
        </div>
        <div className={cn('mt-1.5 text-2xl font-semibold tabular tracking-tight', loading && 'opacity-40')}>{value}</div>
        {sub && <div className="text-[12px] text-fg-muted mt-0.5">{sub}</div>}
      </CardBody>
    </Card>
  );
}

function RankTable({ title, rows, render, sub }: { title: string; rows: any[] | undefined; render: (r: any) => string; sub?: (r: any) => string }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        <div className="space-y-1">
          {(rows ?? []).map((r: any, i: number) => (
            <div key={i} className="flex items-center gap-2.5 text-[13px] py-1.5 border-b border-hairline last:border-0">
              <span className="grid place-items-center size-5 rounded-full bg-surface-sunk text-[11px] font-semibold text-fg-muted shrink-0">{i + 1}</span>
              <div className="min-w-0">
                <div className="text-fg truncate">{r.username || '—'}</div>
                {sub && <div className="text-[11px] text-fg-subtle">{sub(r)}</div>}
              </div>
              <span className="ml-auto tabular text-fg font-medium">{render(r)}</span>
            </div>
          ))}
          {(!rows || rows.length === 0) && <div className="text-[13px] text-fg-muted py-4">No data yet.</div>}
        </div>
      </CardBody>
    </Card>
  );
}

function ChartTip({ active, payload, label, money, k }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface shadow-lg px-3 py-2 text-[12px]">
      {label && <div className="text-fg-subtle mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-fg-muted">{p.name}</span>
          <span className="ml-auto tabular text-fg font-medium">
            {money ? formatMoney(p.value) : Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
