'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, RefreshCcw, Wallet, X, DollarSign } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { investmentAPI } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { formatMoney, relativeTime, cn } from '@/lib/utils';

type Inv = {
  id: number; customer: number; customer_name: string; name: string | null; plan_name: string | null;
  amount: string; profit: string; profit_gained: string;
  due_date: string | null; status: number; date_created: string;
};

const STATUS_PILLS: { value: 'all' | 'active' | 'completed'; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'active',    label: 'Active'    },
  { value: 'completed', label: 'Completed' },
];

export default function InvestmentsPage() {
  const [rows, setRows] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState<'all' | 'active' | 'completed'>('all');
  const { push } = useToast();

  useEffect(() => {
    setLoading(true);
    investmentAPI.list({ page_size: 100 })
      .then((res) => setRows(res.data?.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  const filtered = useMemo(() => {
    if (status === 'all') return rows;
    if (status === 'active')    return rows.filter((r) => r.status === 0);
    if (status === 'completed') return rows.filter((r) => r.status !== 0);
    return rows;
  }, [rows, status]);

  const totals = useMemo(() => {
    const active   = rows.filter((r) => r.status === 0);
    const totalStake  = active.reduce((s, r) => s + Number(r.amount), 0);
    const totalProfit = active.reduce((s, r) => s + Number(r.profit_gained), 0);
    return { totalStake, totalProfit, activeCount: active.length };
  }, [rows]);

  const action = async (id: number, op: 'cashout' | 'cancel') => {
    if (op === 'cancel' && !window.confirm('Cancel this cycle? The user will lose all accrued earnings.')) return;
    try {
      if (op === 'cashout') await investmentAPI.cashout(id);
      else                  await investmentAPI.cancel(id);
      push(`Cycle ${op}ed`, 'success');
      setRefresh((n) => n + 1);
    } catch (e) { push('Action failed', 'error'); }
  };

  const columns: Column<Inv>[] = [
    { key: 'created', header: 'Started', sortBy: (r) => r.date_created,
      cell: (r) => <span className="text-[11.5px] text-fg-muted whitespace-nowrap">{relativeTime(r.date_created)}</span>, width: '110px' },
    { key: 'customer', header: 'Customer', sortBy: (r) => r.customer_name,
      cell: (r) => <span className="font-medium text-fg truncate max-w-[180px]">{r.customer_name}</span> },
    { key: 'plan', header: 'Plan', sortBy: (r) => r.plan_name || r.name || '',
      cell: (r) => <span className="text-fg">{r.plan_name || r.name || '—'}</span>, width: '180px' },
    { key: 'amount', header: 'Stake', align: 'right', sortBy: (r) => Number(r.amount),
      cell: (r) => <span className="tabular font-semibold text-fg">{formatMoney(r.amount)}</span>, width: '120px' },
    { key: 'gained', header: 'Earned', align: 'right', sortBy: (r) => Number(r.profit_gained),
      cell: (r) => <span className="tabular text-success font-semibold">{formatMoney(r.profit_gained)}</span>, width: '120px' },
    { key: 'expected', header: 'Expected', align: 'right',
      cell: (r) => <span className="tabular text-fg-muted text-[12px]">{formatMoney(r.profit)}</span>, width: '120px' },
    { key: 'due', header: 'Due', sortBy: (r) => r.due_date || '',
      cell: (r) => <span className="text-[11.5px] font-mono text-fg-muted">{r.due_date?.slice(0, 10) || '—'}</span>, width: '110px' },
    { key: 'status', header: 'Status', sortBy: (r) => r.status,
      cell: (r) => <Badge tone={r.status === 0 ? 'warning' : 'success'} dot>{r.status === 0 ? 'Active' : 'Completed'}</Badge>, width: '110px' },
    { key: 'actions', header: '', align: 'right',
      cell: (r) => r.status === 0 ? (
        <div className="flex items-center justify-end gap-1">
          <Button size="xs" variant="secondary" onClick={() => action(r.id, 'cashout')} leadingIcon={<DollarSign className="size-3" />}>
            Cash out
          </Button>
          <Button size="xs" variant="ghost" onClick={() => action(r.id, 'cancel')} leadingIcon={<X className="size-3" />}>
            Cancel
          </Button>
        </div>
      ) : null, width: '170px' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        eyebrow="Operate"
        title="Investments"
        description="Every active cycle, stake, expected yield, and lifetime profit-gained."
        actions={
          <Button size="sm" variant="secondary" onClick={() => setRefresh((n) => n + 1)} leadingIcon={<RefreshCcw className="size-3.5" />}>
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Tile label="Active cycles"  value={totals.activeCount} />
        <Tile label="Total stake"    value={formatMoney(totals.totalStake)} tone="accent" />
        <Tile label="Profit earned"  value={formatMoney(totals.totalProfit)} tone="success" />
        <Tile label="Total cycles"   value={rows.length} />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {STATUS_PILLS.map((p) => (
          <button
            key={p.value}
            onClick={() => setStatus(p.value)}
            className={cn(
              'h-7 px-3 rounded-full border text-[12px] font-semibold transition-colors',
              status === p.value
                ? 'bg-fg text-fg-inverse border-fg'
                : 'bg-surface text-fg-muted border-border hover:text-fg hover:border-border-strong',
            )}
            aria-pressed={status === p.value}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card><CardBody className="py-8"><div className="skeleton h-32" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wallet} title="No cycles match the filter" description="Try switching the status filter above." />
      ) : (
        <DataTable rows={filtered} columns={columns} pageSize={25} />
      )}
    </div>
  );
}

function Tile({ label, value, tone = 'neutral' }: { label: string; value: any; tone?: 'neutral' | 'success' | 'accent' }) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold">{label}</div>
        <div className={cn('text-2xl font-semibold tabular mt-2', tone === 'success' && 'text-success', tone === 'accent' && 'text-accent')}>
          {value}
        </div>
      </CardBody>
    </Card>
  );
}
