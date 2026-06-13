'use client';

import { useEffect, useState } from 'react';
import { Vote, Check, X, RefreshCcw, Mail, User } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { planAPI } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { formatMoney, relativeTime, cn } from '@/lib/utils';

type App = {
  id: number; customer: number; investment_amount: string; note: string; status: string;
  created_at: string; decided_at: string | null;
};

const TONE: Record<string, any> = { pending: 'warning', approved: 'success', rejected: 'danger' };

export default function ApplicationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const { push } = useToast();

  useEffect(() => {
    setLoading(true);
    planAPI.applications(filter === 'all' ? undefined : filter)
      .then((r) => setRows(r.data?.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh, filter]);

  const decide = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await planAPI.decideApplication(id, status);
      push(`Application ${status}`, 'success');
      setRefresh((n) => n + 1);
    } catch (e) { push('Decision failed', 'error'); }
  };

  const columns: Column<App>[] = [
    { key: 'created', header: 'Submitted', sortBy: (r) => r.created_at,
      cell: (r) => <span className="text-[11.5px] text-fg-muted whitespace-nowrap">{relativeTime(r.created_at)}</span>, width: '120px' },
    { key: 'customer', header: 'Customer', sortBy: (r) => r.customer,
      cell: (r) => <span className="font-mono text-[11.5px] text-fg">#{r.customer}</span>, width: '80px' },
    { key: 'amount', header: 'Investment', align: 'right', sortBy: (r) => Number(r.investment_amount),
      cell: (r) => <span className="tabular font-semibold text-fg">{formatMoney(r.investment_amount)}</span>, width: '140px' },
    { key: 'note', header: 'Note',
      cell: (r) => <span className="text-[12px] text-fg-muted line-clamp-2">{r.note || '—'}</span> },
    { key: 'status', header: 'Status', sortBy: (r) => r.status, width: '120px',
      cell: (r) => <Badge tone={TONE[r.status] || 'neutral'} dot>{r.status}</Badge> },
    { key: 'actions', header: '', align: 'right',
      cell: (r) => r.status === 'pending' ? (
        <div className="flex items-center justify-end gap-1">
          <Button size="xs" variant="secondary" onClick={() => decide(r.id, 'approved')} leadingIcon={<Check className="size-3" />}>
            Approve
          </Button>
          <Button size="xs" variant="ghost" onClick={() => decide(r.id, 'rejected')} leadingIcon={<X className="size-3" />}>
            Reject
          </Button>
        </div>
      ) : <span className="text-[11px] text-fg-subtle">{r.decided_at ? relativeTime(r.decided_at) : ''}</span>, width: '170px' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1300px] mx-auto">
      <PageHeader
        eyebrow="Operate"
        title="Founding Partner applications"
        description="Pre-launch submissions for the Founding Partner programme."
        actions={
          <Button size="sm" variant="secondary" onClick={() => setRefresh((n) => n + 1)} leadingIcon={<RefreshCcw className="size-3.5" />}>
            Refresh
          </Button>
        }
      />

      <Card className="mb-4">
        <CardBody className="py-3 flex items-center gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'h-7 px-3 rounded-full text-xs font-semibold border transition-colors',
                filter === s ? 'bg-fg text-fg-inverse border-fg' : 'bg-surface text-fg-muted border-border hover:border-border-strong',
              )}
            >
              {s}
            </button>
          ))}
        </CardBody>
      </Card>

      {loading ? (
        <Card><CardBody className="py-8"><div className="skeleton h-32" /></CardBody></Card>
      ) : rows.length === 0 ? (
        <EmptyState icon={Vote} title="No applications match this filter" />
      ) : (
        <DataTable rows={rows} columns={columns} pageSize={25} />
      )}
    </div>
  );
}
