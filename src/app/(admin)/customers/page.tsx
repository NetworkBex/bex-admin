'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Drawer } from '@/components/Drawer';
import { BulkActionBar, type BulkAction } from '@/components/BulkActionBar';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/Toast';
import { userAPI, parseApiError } from '@/lib/api';
import { formatMoney, shortDate, cn } from '@/lib/utils';
import { CustomerDetailDrawer } from '../_customerDetail';

type StatusFilter = 'all' | 'active' | 'suspended' | 'unverified';

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: 'all',        label: 'All'        },
  { value: 'active',     label: 'Active'     },
  { value: 'suspended',  label: 'Suspended'  },
  { value: 'unverified', label: 'Unverified' },
];

export default function CustomersPage() {
  const { push } = useToast() || { push: (_: string) => {} } as any;
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<StatusFilter>('all');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [openId, setOpenId]   = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await userAPI.list({ page_size: 100 });
      setRows(res.data?.results || res.data || []);
    } catch (e) {
      setError(parseApiError(e, 'Failed to load customers'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((u: any) => {
      if (filter === 'active'     && u.status !== 1) return false;
      if (filter === 'suspended'  && u.status !== 2) return false;
      if (filter === 'unverified' && (u.status === 1)) return false; // unverified != active
      if (q) {
        const hay = `${u.username ?? ''} ${u.email ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  const runBulk = async (action: BulkAction['value']) => {
    const ids = Array.from(selected).map((s) => Number(s));
    if (ids.length === 0) return;
    try {
      const res = await userAPI.bulkAction({ ids, action: action as any });
      const { updated, failed } = res.data as { updated: number[]; failed: any[] };
      push(`${action}: ${updated.length} updated${failed.length ? `, ${failed.length} failed` : ''}`);
      setSelected(new Set());
      await load();
    } catch (e) {
      push(parseApiError(e, 'Bulk action failed'), 'error');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'user',
      header: 'User',
      sortBy: (r) => r.username ?? '',
      cell: (r) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={r.username} size={28} />
          <div className="min-w-0">
            <div className="text-fg font-medium truncate">{r.username || '—'}</div>
            <div className="text-[11px] text-fg-subtle font-mono">#{r.customer_id ?? r.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortBy: (r) => r.email ?? '',
      cell: (r) => <span className="text-fg-muted truncate max-w-[200px] block">{r.email}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      cell: (r) => (
        r.status === 1 ? <Badge tone="success">Active</Badge>
        : r.status === 2 ? <Badge tone="danger">Suspended</Badge>
        : <Badge tone="warning">Inactive</Badge>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      sortBy: (r) => parseFloat(r.acc_balance ?? 0),
      cell: (r) => <span className="tabular font-medium">{formatMoney(r.acc_balance ?? 0, { decimals: 2 })}</span>,
    },
    {
      key: 'joined',
      header: 'Joined',
      align: 'right',
      sortBy: (r) => r.date_created ?? '',
      cell: (r) => <span className="text-fg-muted text-[12px]">{shortDate(r.date_created)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Customers"
        description="Accounts, balances, KYC, and access. Click any row to drill in."
        actions={
          <Button variant="secondary" onClick={load}>Refresh</Button>
        }
      />

      {/* Status pills */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {STATUS_PILLS.map((p) => {
          const active = filter === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setFilter(p.value)}
              className={cn(
                'h-7 px-3 rounded-full border text-[12px] font-semibold transition-colors',
                active
                  ? 'bg-fg text-fg-inverse border-fg'
                  : 'bg-surface text-fg-muted border-border hover:text-fg hover:border-border-strong',
              )}
              aria-pressed={active}
            >
              {p.label}
            </button>
          );
        })}
        <div className="ml-auto max-w-xs flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-fg-subtle pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username or email…"
              className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-surface text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {error}
        </div>
      )}

      <DataTable
        rows={filtered}
        columns={columns}
        searchableKeys={['username', 'email']}
        selectable
        selected={selected}
        onSelectChange={setSelected}
        onRowClick={(r) => setOpenId(r.customer_id ?? r.id)}
        pageSize={20}
        empty={
          loading ? <div className="p-8 text-center text-fg-muted">Loading…</div>
                  : <div className="p-8 text-center text-fg-muted">No customers match the current filter.</div>
        }
      />

      <BulkActionBar
        selectedCount={selected.size}
        totalCount={filtered.length}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: 'Activate',    value: 'activate', tone: 'secondary' },
          { label: 'Suspend',     value: 'suspend',  tone: 'danger',
            confirm: `Suspend ${selected.size} customer(s)? They will not be able to log in.` },
          { label: 'Send reset',  value: 'reset',    tone: 'secondary' },
        ]}
        onAction={runBulk}
      />

      <CustomerDetailDrawer
        customerId={openId}
        onClose={() => setOpenId(null)}
        onMutated={load}
      />
    </>
  );
}
