'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CreditCard, RefreshCcw, Search, Check, X, Upload, ArrowUpRight, ArrowDownRight,
  Receipt, AlertCircle, ChevronRight, Paperclip, Maximize2,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, StatusPill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { transactionAPI, parseApiError } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Drawer } from '@/components/Drawer';
import { BulkActionBar, type BulkAction } from '@/components/BulkActionBar';
import { formatMoney, relativeTime, shortDate, cn } from '@/lib/utils';

type Tx = {
  id: number; customer: number; customer_name: string; type: string; method: string;
  currency: number | null; currency_name: string | null; amount: string; status: number;
  company_address: string | null; customer_address: string | null; code: string | null;
  date_created: string;
};

const TX_STATUS: Record<number, string> = { 0: 'Pending', 1: 'Cancelled', 2: 'Processing', 3: 'Completed', 4: 'Failed' };

export default function TransactionsPage() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [openTx, setOpenTx] = useState<Tx | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const { push } = useToast();

  useEffect(() => {
    if (!previewSrc) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewSrc(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewSrc]);

  useEffect(() => {
    setLoading(true);
    transactionAPI.list({ page_size: 100 })
      .then((res) => setRows(res.data?.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  const runBulk = async (action: BulkAction['value']) => {
    const ids = Array.from(selected).map((s) => Number(s));
    if (ids.length === 0) return;
    try {
      const res = await transactionAPI.bulkAction({ ids, action: action as any });
      const { updated, failed } = res.data as { updated: number[]; failed: any[] };
      push(`${action}: ${updated.length} updated${failed.length ? `, ${failed.length} failed` : ''}`);
      setSelected(new Set());
      setRefresh((n) => n + 1);
    } catch (e) {
      push(parseApiError(e, 'Bulk action failed'), 'error');
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (statusFilter !== 'all' && String(r.status) !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return [r.customer_name, r.method, r.currency_name, r.code, r.company_address, r.customer_address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, typeFilter, statusFilter]);

  const totals = useMemo(() => {
    const deposits = filtered.filter((r) => r.type === 'deposit').reduce((s, r) => s + Number(r.amount), 0);
    const withdrawals = filtered.filter((r) => r.type === 'withdraw').reduce((s, r) => s + Number(r.amount), 0);
    const pending = filtered.filter((r) => r.status === 0).length;
    return { deposits, withdrawals, pending };
  }, [filtered]);

  const decide = async (id: number, action: 'approve' | 'cancel', tx?: Tx) => {
    const t = tx ?? rows.find((r) => r.id === id);
    const amt = t ? formatMoney(t.amount) : 'this transaction';
    const verb = action === 'approve'
      ? (t?.type === 'deposit' ? `approve & CREDIT ${amt}` : t?.type === 'withdraw' ? `approve (mark paid) ${amt}` : `approve ${amt}`)
      : (t?.type === 'deposit' ? `cancel ${amt} (debits the user if it was credited)` : `cancel ${amt} (refunds the user)`);
    if (!window.confirm(`Are you sure you want to ${verb}?`)) return false;
    try {
      if (action === 'approve') await transactionAPI.approve(id);
      else                      await transactionAPI.cancel(id);
      push(`Transaction ${action}d`, 'success');
      setRefresh((n) => n + 1);
      return true;
    } catch (e) { push('Action failed', 'error'); return false; }
  };

  const changeStatus = async (id: number, status: number, tx?: Tx): Promise<boolean> => {
    const t = tx ?? rows.find((r) => r.id === id);
    const amt = t ? formatMoney(t.amount) : 'this transaction';
    const label = TX_STATUS[status] ?? `status ${status}`;
    let effect = '';
    if (t?.type === 'deposit') effect = status === 3 ? ` — credits ${amt}` : t.status === 3 ? ` — debits ${amt}` : '';
    if (t?.type === 'withdraw') effect = (status === 1 || status === 4) && (t.status === 0 || t.status === 2 || t.status === 3) ? ` — refunds ${amt}` : '';
    if (!window.confirm(`Set this transaction to "${label}"${effect}?`)) return false;
    try {
      await transactionAPI.setStatus(id, status);
      push(`Marked ${label}`, 'success');
      setRefresh((n) => n + 1);
      return true;
    } catch (e: any) { push(e?.response?.data?.error || 'Action failed', 'error'); return false; }
  };

  const columns: Column<Tx>[] = [
    { key: 'created', header: 'Created', sortBy: (r) => r.date_created,
      cell: (r) => <span className="text-[11.5px] text-fg-muted whitespace-nowrap">{relativeTime(r.date_created)}</span>,
      width: '110px' },
    { key: 'customer', header: 'Customer', sortBy: (r) => r.customer_name,
      cell: (r) => <span className="font-medium text-fg truncate max-w-[180px]">{r.customer_name}</span> },
    { key: 'type', header: 'Type', sortBy: (r) => r.type, width: '100px',
      cell: (r) => (
        <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', r.type === 'deposit' ? 'text-success' : r.type === 'withdraw' ? 'text-warning' : 'text-fg-muted')}>
          {r.type === 'deposit' ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
          <span className="capitalize">{r.type}</span>
        </span>
      ) },
    { key: 'method', header: 'Method', width: '110px',
      cell: (r) => <span className="text-[11.5px] font-mono text-fg-muted">{r.method || '—'}</span> },
    { key: 'amount', header: 'Amount', align: 'right', sortBy: (r) => Number(r.amount),
      cell: (r) => <span className="tabular font-semibold text-fg">{formatMoney(r.amount)}</span>, width: '130px' },
    { key: 'status', header: 'Status', sortBy: (r) => r.status, width: '130px',
      cell: (r) => <StatusPill status={r.status} labels={TX_STATUS} /> },
    { key: 'actions', header: '', align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === 0 && (
            <>
              <Button size="xs" variant="secondary" onClick={() => decide(r.id, 'approve')} leadingIcon={<Check className="size-3" />}>
                Approve
              </Button>
              <Button size="xs" variant="ghost"   onClick={() => decide(r.id, 'cancel')} leadingIcon={<X className="size-3" />}>
                Cancel
              </Button>
            </>
          )}
        </div>
      ),
      width: '180px' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        eyebrow="Operate"
        title="Transactions"
        description="Approve pending deposits, cancel stuck withdrawals, audit the ledger."
        actions={
          <Button size="sm" variant="secondary" onClick={() => setRefresh((n) => n + 1)} leadingIcon={<RefreshCcw className="size-3.5" />}>
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Tile label="Filtered rows"  value={filtered.length} />
        <Tile label="Pending"        value={totals.pending} tone={totals.pending > 0 ? 'warning' : 'neutral'} />
        <Tile label="Deposits (sum)" value={formatMoney(totals.deposits)} tone="success" />
        <Tile label="Withdrawals (sum)" value={formatMoney(totals.withdrawals)} tone="warning" />
      </div>

      <Card className="mb-4">
        <CardBody className="py-3 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer, method, address, code…"
                className="w-full h-9 pl-9 pr-3 bg-surface text-fg text-sm border border-border rounded-md focus:outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--ring)]"
              />
            </div>
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 px-3 bg-surface text-fg text-sm border border-border rounded-md">
            <option value="all">All types</option>
            <option value="deposit">Deposits</option>
            <option value="withdraw">Withdrawals</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 bg-surface text-fg text-sm border border-border rounded-md">
            <option value="all">All statuses</option>
            <option value="0">Pending</option>
            <option value="1">Cancelled</option>
            <option value="2">Processing</option>
            <option value="3">Completed</option>
            <option value="4">Failed</option>
          </select>
        </CardBody>
      </Card>

      {loading ? (
        <Card><CardBody className="py-8"><div className="skeleton h-32" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="No transactions match the filter" />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          pageSize={25}
          selectable
          selected={selected}
          onSelectChange={setSelected}
          onRowClick={(r) => setOpenTx(r)}
        />
      )}

      <BulkActionBar
        selectedCount={selected.size}
        totalCount={filtered.length}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: 'Approve',  value: 'approve', tone: 'secondary' },
          { label: 'Cancel',   value: 'cancel',  tone: 'danger',
            confirm: `Cancel ${selected.size} transaction(s)?` },
        ]}
        onAction={runBulk}
      />

      <Drawer
        open={!!openTx}
        onClose={() => setOpenTx(null)}
        title={openTx ? `Transaction #${openTx.id}` : 'Transaction'}
        description={openTx && (
          <span className="font-mono text-[11px]">
            {openTx.customer_name} · {openTx.type} · {openTx.method || '—'}
          </span>
        )}
        footer={openTx && (openTx.type === 'deposit' || openTx.type === 'withdraw') && (
          <div className="flex flex-wrap items-center gap-2">
            {openTx.status !== 3 && (
              <Button size="sm" variant="primary" leadingIcon={<Check className="size-3.5" />}
                      onClick={async () => { if (await decide(openTx.id, 'approve', openTx)) setOpenTx(null); }}>
                {openTx.type === 'deposit' ? 'Approve & credit' : 'Mark paid'}
              </Button>
            )}
            {openTx.status !== 0 && (
              <Button size="sm" variant="secondary"
                      onClick={async () => { if (await changeStatus(openTx.id, 0, openTx)) setOpenTx(null); }}>
                Mark pending
              </Button>
            )}
            {openTx.status !== 1 && (
              <Button size="sm" variant="ghost" leadingIcon={<X className="size-3.5" />}
                      onClick={async () => { if (await decide(openTx.id, 'cancel', openTx)) setOpenTx(null); }}>
                Cancel
              </Button>
            )}
          </div>
        )}
      >
        {openTx && (
          <div className="space-y-4 text-[13px]">
            <KV label="Amount"     value={formatMoney(openTx.amount)} />
            {openTx.type === 'withdraw' && Number((openTx as any).fee) > 0 && (
              <>
                <KV label="Fee"        value={`− ${formatMoney((openTx as any).fee)}`} />
                <KV label="Net to pay" value={<span className="font-semibold text-fg">{formatMoney(Number(openTx.amount) - Number((openTx as any).fee))}</span>} />
              </>
            )}
            <KV label="Status"     value={<StatusPill status={openTx.status} labels={TX_STATUS} />} />
            <KV label="Customer"   value={openTx.customer_name} />
            <KV label="Method"     value={openTx.method || '—'} />
            <KV label="Asset"      value={openTx.currency_name || (openTx as any).name || '—'} />
            {(openTx as any).network && <KV label="Network" value={(openTx as any).network} />}
            <KV label="Created"    value={`${shortDate(openTx.date_created)} · ${relativeTime(new Date(openTx.date_created).toISOString())}`} />
            {openTx.customer_address && <KV label="Customer addr" value={<code className="text-[12px] break-all">{openTx.customer_address}</code>} />}
            {openTx.company_address  && <KV label="Company addr"  value={<code className="text-[12px] break-all">{openTx.company_address}</code>} />}
            {openTx.code             && <KV label="Withdrawal code" value={openTx.code} />}
            {((openTx as any).prove_url || (openTx as any).prove) && (() => {
              const src = (openTx as any).prove_url || (openTx as any).prove;
              const isPdf = String(src).toLowerCase().split('?')[0].endsWith('.pdf');
              return (
                <KV label="Payment proof" value={
                  isPdf ? (
                    <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-accent hover:underline">
                      <Paperclip className="size-3.5" /> Open PDF
                    </a>
                  ) : (
                    <button type="button" onClick={() => setPreviewSrc(src)}
                      className="group relative block size-20 rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
                      title="Click to enlarge">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="Payment proof" className="size-full object-cover" />
                      <span className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/35 transition-colors">
                        <Maximize2 className="size-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </button>
                  )
                } />
              );
            })()}
          </div>
        )}
      </Drawer>

      {/* Receipt lightbox */}
      {previewSrc && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewSrc(null)}
        >
          <button
            onClick={() => setPreviewSrc(null)}
            className="absolute top-4 right-4 grid place-items-center size-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Payment proof"
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg shadow-2xl object-contain animate-rise-in"
          />
          <a
            href={previewSrc}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 text-[12px] text-white/80 hover:text-white"
          >
            <Maximize2 className="size-3.5" /> Open original
          </a>
        </div>
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-hairline pb-2 last:border-b-0 last:pb-0">
      <div className="text-fg-muted text-[11px] uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-fg">{value}</div>
    </div>
  );
}

function Tile({ label, value, tone = 'neutral' }: { label: string; value: any; tone?: 'neutral' | 'warning' | 'success' }) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold">{label}</div>
        <div className={cn('text-2xl font-semibold tabular mt-2', tone === 'success' && 'text-success', tone === 'warning' && 'text-warning')}>
          {value}
        </div>
      </CardBody>
    </Card>
  );
}
