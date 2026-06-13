'use client';

import { useEffect, useState } from 'react';
import { History, Search, RefreshCcw, Download, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/Drawer';
import api from '@/lib/api';
import { relativeTime, cn, shortDate } from '@/lib/utils';

type Event = {
  id: number; created_at: string; severity: string; category: string;
  action: string; actor: string; target_id: string; summary: string; detail: any;
};

const CATS = ['all', 'auth', 'customer', 'transaction', 'investment', 'plan', 'settings', 'ops'];
const SEVS = ['all', 'info', 'warn', 'error'];

export default function AuditPage() {
  const [rows, setRows] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [sev, setSev] = useState('all');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [target, setTarget] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [q, setQ] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState<Event | null>(null);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page_size: 50 };
    if (cat !== 'all') params.category   = cat;
    if (sev !== 'all') params.severity   = sev;
    if (action)        params.action     = action;
    if (actor)         params.actor      = actor;
    if (target)        params.target_id  = target;
    if (from)          params.from       = from;
    if (to)            params.to         = to;
    if (q)             params.search     = q;
    api.get('/audit/', { params })
      .then((r) => {
        setRows(r.data?.results || []);
        setTotal(r.data?.count   ?? (r.data?.results?.length ?? 0));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cat, sev, action, actor, target, from, to, q, refresh]);

  const clearFilters = () => { setCat('all'); setSev('all'); setAction(''); setActor(''); setTarget(''); setFrom(''); setTo(''); setQ(''); };

  const exportCsv = async () => {
    // Use the backend's ?format=csv response.
    const params: Record<string, any> = { format: 'csv', per_page: 1000 };
    if (cat !== 'all') params.category   = cat;
    if (sev !== 'all') params.severity   = sev;
    if (action)        params.action     = action;
    if (actor)         params.actor      = actor;
    if (target)        params.target_id  = target;
    if (from)          params.from       = from;
    if (to)            params.to         = to;
    if (q)             params.search     = q;
    const res = await api.get('/audit/', { params, responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<Event>[] = [
    { key: 'created', header: 'When', sortBy: (r) => r.created_at,
      cell: (r) => (
        <div className="text-[11.5px] text-fg-muted whitespace-nowrap">
          <div>{relativeTime(r.created_at)}</div>
          <div className="text-fg-subtle">{shortDate(r.created_at)}</div>
        </div>
      ), width: '130px' },
    { key: 'sev', header: 'Severity', sortBy: (r) => r.severity, width: '90px',
      cell: (r) => <Badge tone={r.severity === 'error' ? 'danger' : r.severity === 'warn' ? 'warning' : 'info'} dot>{r.severity}</Badge> },
    { key: 'cat', header: 'Category', sortBy: (r) => r.category, width: '110px',
      cell: (r) => <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">{r.category}</span> },
    { key: 'action', header: 'Action', sortBy: (r) => r.action, width: '180px',
      cell: (r) => <span className="text-[11.5px] font-mono text-fg">{r.action}</span> },
    { key: 'actor', header: 'Actor', cell: (r) => <span className="text-[12px] text-fg-muted truncate max-w-[140px]">{r.actor}</span>, width: '150px' },
    { key: 'summary', header: 'Summary', cell: (r) => (
        <div className="min-w-0">
          <div className="text-[12.5px] text-fg truncate">{r.summary}</div>
          {r.target_id && <div className="text-[10.5px] text-fg-subtle font-mono">target #{r.target_id}</div>}
        </div>
    ) },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        eyebrow="Operate"
        title="Audit log"
        description={`Every admin mutation, in chronological order. ${total.toLocaleString()} events on file.`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={exportCsv} leadingIcon={<Download className="size-3.5" />}>
              Export CSV
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRefresh((n) => n + 1)} leadingIcon={<RefreshCcw className="size-3.5" />}>
              Refresh
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardBody className="py-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold mr-1">Category</span>
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={cn('h-7 px-2.5 rounded-full text-[11.5px] font-semibold border transition-colors',
                  cat === c ? 'bg-fg text-fg-inverse border-fg' : 'bg-surface text-fg-muted border-border hover:border-border-strong')}>
                {c}
              </button>
            ))}
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold ml-3 mr-1">Severity</span>
            {SEVS.map((s) => (
              <button key={s} onClick={() => setSev(s)}
                className={cn('h-7 px-2.5 rounded-full text-[11.5px] font-semibold border transition-colors',
                  sev === s ? 'bg-fg text-fg-inverse border-fg' : 'bg-surface text-fg-muted border-border hover:border-border-strong')}>
                {s}
              </button>
            ))}
            <Button size="xs" variant="ghost" onClick={clearFilters} className="ml-auto">
              <X className="size-3" /> Clear
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="action (exact, e.g. customer.balance.credit)" className="w-72" />
            <Input value={actor}  onChange={(e) => setActor(e.target.value)}  placeholder="actor (substring)"  className="w-56" />
            <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="target_id (exact)"     className="w-48" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 px-2 rounded-md border border-border bg-surface text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
              aria-label="From"
            />
            <span className="text-fg-muted text-[12px]">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 px-2 rounded-md border border-border bg-surface text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
              aria-label="To"
            />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="free-text search…" leadingIcon={<Search className="size-3.5" />} className="flex-1 min-w-[200px]" />
          </div>
        </CardBody>
      </Card>

      {loading ? <Card><CardBody className="py-8"><div className="skeleton h-32" /></CardBody></Card> :
        rows.length === 0 ? <EmptyState icon={History} title="No audit events match" /> :
        <DataTable
          rows={rows}
          columns={columns}
          pageSize={50}
          onRowClick={(r) => setOpen(r)}
        />}

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? `Audit #${open.id}` : 'Audit'}
        description={open && (
          <span className="font-mono text-[11px]">
            {open.action} · {open.category} · {open.severity}
          </span>
        )}
      >
        {open && (
          <div className="space-y-4 text-[13px]">
            <KV label="When"    value={new Date(open.created_at).toLocaleString()} />
            <KV label="Actor"   value={open.actor} />
            <KV label="Target"  value={open.target_id || '—'} />
            <KV label="Summary" value={open.summary} />
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-fg-subtle mb-1.5">Detail (JSON)</div>
              <pre className="rounded-md border border-border bg-surface-sunk/40 p-3 text-[11.5px] font-mono overflow-x-auto whitespace-pre-wrap break-words text-fg">
                {JSON.stringify(open.detail ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-hairline pb-2 last:border-b-0 last:pb-0">
      <div className="text-fg-muted text-[11px] uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-fg break-words">{value}</div>
    </div>
  );
}
