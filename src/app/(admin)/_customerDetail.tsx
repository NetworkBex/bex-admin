'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, ChevronRight, KeyRound, Mail,
  RefreshCcw, ShieldAlert, ShieldCheck, Wallet as WalletIcon, Copy,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/Drawer';
import { useToast } from '@/components/Toast';
import { userAPI, parseApiError } from '@/lib/api';
import { formatMoney, formatCompact, relativeTime, shortDate, cn } from '@/lib/utils';

type CustomerDetailResponse = {
  customer: any;
  wallets: any[];
  kyc: any | null;
  verifications: any[];
  investments: { active: number; completed: number; rows: any[] };
  transactions: { deposits: number; withdrawals: number; rows: any[] };
  referrals: { referrer: any | null; direct: number; indirect: number; rows: any[] };
  audit: any[];
};

type Props = {
  customerId: number | null;
  onClose: () => void;
  onMutated?: () => void;
};

export function CustomerDetailDrawer({ customerId, onClose, onMutated }: Props) {
  const { push } = useToast();
  const [data, setData] = useState<CustomerDetailResponse | null>(null);
  const [downline, setDownline] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<{ token: string; code: string; expires_at: string } | null>(null);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjType, setAdjType] = useState<'credit' | 'debit'>('credit');

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true); setError(null);
    try {
      const [res, dl] = await Promise.all([
        userAPI.detail(customerId),
        userAPI.downline(customerId).catch(() => null),
      ]);
      setData(res.data);
      setDownline(dl?.data ?? null);
    } catch (e) {
      setError(parseApiError(e, 'Failed to load customer'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const run = useCallback(async (label: string, fn: () => Promise<any>, successMsg: string) => {
    setActing(label);
    try {
      await fn();
      push(successMsg);
      onMutated?.();
      await load();
    } catch (e) {
      push(parseApiError(e, `${label} failed`), 'error');
    } finally {
      setActing(null);
    }
  }, [load, onMutated, push]);

  const c = data?.customer;
  const statusTone = c?.status === 1 ? 'success' : c?.status === 2 ? 'danger' : 'warning';
  const statusLabel = c?.status === 1 ? 'Active' : c?.status === 2 ? 'Suspended' : 'Inactive';

  const copy = (txt: string) => { navigator.clipboard.writeText(txt).then(() => push('Copied')); };

  return (
    <Drawer
      open={!!customerId}
      onClose={onClose}
      wide
      title={
        c ? (
          <div className="flex items-center gap-3">
            <Avatar name={c.username || c.email} size={32} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate">{c.fullname || c.username}</span>
                <Badge tone={statusTone as any}>{statusLabel}</Badge>
              </div>
              <div className="text-[12px] text-fg-muted font-mono">{c.email}</div>
            </div>
          </div>
        ) : loading ? 'Loading…' : 'Customer'
      }
      description={c ? <span className="font-mono text-[11px]">#{c.customer_id ?? c.id} · joined {shortDate(c.date_created)}</span> : undefined}
      footer={c ? (
        <div className="flex items-center gap-2">
          {c.status === 2 ? (
            <Button size="sm" variant="secondary" loading={acting === 'activate'} onClick={() => run('activate', () => userAPI.activate(c.customer_id ?? c.id), 'User activated')}>
              <ShieldCheck className="size-3.5" /> Activate
            </Button>
          ) : (
            <Button size="sm" variant="ghost" loading={acting === 'suspend'} onClick={() => run('suspend', () => userAPI.suspend(c.customer_id ?? c.id), 'User suspended')}>
              <ShieldAlert className="size-3.5" /> Suspend
            </Button>
          )}
          <Button size="sm" variant="secondary" loading={acting === 'reset'} onClick={() => run('reset', () => userAPI.sendPasswordReset(c.customer_id ?? c.id), 'Reset code generated')}>
            <KeyRound className="size-3.5" /> Password reset
          </Button>
        </div>
      ) : undefined}
    >
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          <AlertTriangle className="size-4" /> {error}
        </div>
      )}
      {loading && !data && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-surface-2/60 animate-pulse" />
          ))}
        </div>
      )}

      {data && c && (
        <div className="space-y-5">
          {/* Balance + adjust inline */}
          <section>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">Account balance</div>
                <div className="text-[28px] font-semibold tabular tracking-tight text-fg">
                  {formatMoney(c.acc_balance ?? 0, { decimals: 2 })}
                </div>
              </div>
              <div className="text-[11px] text-fg-muted">
                Last login: {c.last_login ? relativeTime(new Date(c.last_login).toISOString()) : '—'}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value as any)}
                className="h-8 px-2 rounded-md border border-border bg-surface-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                className="h-8 w-32 px-2 rounded-md border border-border bg-surface-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <Button
                size="sm"
                variant="accent"
                loading={acting === 'adjust'}
                disabled={!adjAmount || parseFloat(adjAmount) <= 0}
                onClick={() => run('adjust', () => userAPI.adjustBalance(c.customer_id ?? c.id, { amount: parseFloat(adjAmount), type: adjType }), 'Balance updated').then(() => setAdjAmount(''))}
              >
                Apply
              </Button>
            </div>
          </section>

          {/* KYC */}
          <section>
            <SectionTitle>KYC</SectionTitle>
            {data.kyc ? (
              <div className="rounded-md border border-border bg-surface-2/30 p-3 text-[12px]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-success" />
                  <span className="font-medium">{data.kyc.full_name || '—'}</span>
                  <Badge tone="success" className="ml-auto">{data.kyc.status || 'submitted'}</Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 text-fg-muted tabular">
                  <div><span className="text-fg-subtle">DOB</span> {data.kyc.dob || '—'}</div>
                  <div><span className="text-fg-subtle">Country</span> {data.kyc.country || '—'}</div>
                  <div><span className="text-fg-subtle">Doc</span> {data.kyc.document_type || '—'} · {data.kyc.document_number || '—'}</div>
                  <div><span className="text-fg-subtle">Submitted</span> {shortDate(data.kyc.date_created)}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-3 text-[12px] text-fg-muted">
                No KYC submitted.
              </div>
            )}
          </section>

          {/* Wallets */}
          <section>
            <SectionTitle>Wallets <span className="text-fg-muted font-normal">({data.wallets.length})</span></SectionTitle>
            {data.wallets.length === 0 ? (
              <div className="text-[12px] text-fg-muted">No wallets on file.</div>
            ) : (
              <div className="space-y-1.5">
                {data.wallets.map((w: any) => (
                  <div key={w.id} className="flex items-center gap-2 rounded-md border border-border bg-surface-2/30 px-3 py-2 text-[12px]">
                    <WalletIcon className="size-3.5 text-fg-subtle" />
                    <span className="font-mono truncate flex-1 text-fg-muted">{w.address}</span>
                    {w.is_default && <Badge tone="accent">default</Badge>}
                    <Button size="xs" variant="ghost" onClick={() => copy(w.address)}>
                      <Copy className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Investments */}
          <section>
            <SectionTitle>Investments
              <span className="text-fg-muted font-normal ml-2">
                ({data.investments.active} active · {data.investments.completed} completed)
              </span>
            </SectionTitle>
            <div className="space-y-1">
              {data.investments.rows.slice(0, 8).map((inv: any) => (
                <div key={inv.id} className="flex items-center gap-2 text-[12px] py-1.5 border-b border-hairline last:border-b-0">
                  <span className="text-fg font-medium flex-1">{inv.plan || `Cycle #${inv.id}`}</span>
                  <span className="tabular text-fg-muted">{formatMoney(inv.amount)}</span>
                  <Badge tone={inv.status === 0 ? 'success' : 'neutral'}>
                    {inv.status === 0 ? 'Live' : 'Done'}
                  </Badge>
                </div>
              ))}
              {data.investments.rows.length === 0 && <div className="text-[12px] text-fg-muted">No investments yet.</div>}
            </div>
          </section>

          {/* Transactions */}
          <section>
            <SectionTitle>Recent transactions
              <span className="text-fg-muted font-normal ml-2">
                ({data.transactions.deposits} dep · {data.transactions.withdrawals} wd)
              </span>
            </SectionTitle>
            <div className="space-y-1">
              {data.transactions.rows.slice(0, 8).map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-2 text-[12px] py-1.5 border-b border-hairline last:border-b-0">
                  <Badge tone={tx.type === 'deposit' ? 'success' : tx.type === 'withdraw' ? 'warning' : 'neutral'} className="capitalize">{tx.type}</Badge>
                  <span className="tabular text-fg-muted w-24">${parseFloat(tx.amount).toFixed(2)}</span>
                  <span className="text-fg-subtle flex-1">{tx.method || '—'}</span>
                  <span className="text-fg-subtle">{shortDate(tx.date_created)}</span>
                </div>
              ))}
              {data.transactions.rows.length === 0 && <div className="text-[12px] text-fg-muted">No transactions yet.</div>}
            </div>
          </section>

          {/* Referrals */}
          <section>
            <SectionTitle>Referrals
              <span className="text-fg-muted font-normal ml-2">
                ({data.referrals.direct} direct)
              </span>
            </SectionTitle>
            {data.referrals.referrer ? (
              <div className="text-[12px] text-fg-muted mb-1.5">
                Referred by <span className="text-fg font-medium">{data.referrals.referrer.username}</span>
              </div>
            ) : null}
            {data.referrals.rows.length === 0 ? (
              <div className="text-[12px] text-fg-muted">No directs yet.</div>
            ) : (
              <div className="space-y-1">
                {data.referrals.rows.slice(0, 6).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-[12px] py-1.5 border-b border-hairline last:border-b-0">
                    <Avatar name={r.username} size={20} />
                    <span className="text-fg">{r.username}</span>
                    <span className="text-fg-muted flex-1 truncate">{r.email}</span>
                    <span className="text-fg-subtle">{shortDate(r.date_created)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Full downline tree */}
          <section>
            <SectionTitle>Downline tree
              {downline ? (
                <span className="text-fg-muted font-normal ml-2">
                  ({downline.totalMembers} members · {downline.activeMembers} active · {downline.levels} levels · {formatMoney(downline.totalVolumeUsd)})
                </span>
              ) : null}
            </SectionTitle>
            {!downline || (downline.tree?.length ?? 0) === 0 ? (
              <div className="text-[12px] text-fg-muted">No downline yet.</div>
            ) : (
              <div className="-my-0.5">
                {downline.tree.map((n: any) => <DownlineNode key={n.id} node={n} depth={0} />)}
                {downline.truncated && (
                  <div className="text-[11px] text-fg-subtle mt-2">Showing the first {downline.totalMembers} members.</div>
                )}
              </div>
            )}
          </section>

          {/* Audit trail */}
          <section>
            <SectionTitle>Audit trail
              <span className="text-fg-muted font-normal ml-2">({data.audit.length})</span>
            </SectionTitle>
            {data.audit.length === 0 ? (
              <div className="text-[12px] text-fg-muted">No audit events yet.</div>
            ) : (
              <div className="space-y-1">
                {data.audit.slice(0, 10).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-[12px] py-1.5 border-b border-hairline last:border-b-0">
                    <Badge tone={a.severity === 'error' ? 'danger' : a.severity === 'warn' ? 'warning' : 'neutral'}>
                      {a.severity}
                    </Badge>
                    <span className="text-fg-subtle tabular w-32">{relativeTime(new Date(a.created_at).toISOString())}</span>
                    <span className="text-fg flex-1 truncate">{a.summary}</span>
                    <span className="text-fg-subtle font-mono text-[11px]">{a.action}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reset info card */}
          {resetInfo && (
            <div className="rounded-md border border-accent/30 bg-accent-soft/30 p-3 text-[12px]">
              <div className="font-semibold text-fg mb-1.5">One-time reset issued</div>
              <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-fg-muted">
                <span className="text-fg-subtle">Code</span>
                <code className="text-fg">{resetInfo.code}</code>
                <span className="text-fg-subtle">Token</span>
                <code className="text-fg break-all">{resetInfo.token}</code>
                <span className="text-fg-subtle">Expires</span>
                <span className="text-fg">{relativeTime(new Date(resetInfo.expires_at).toISOString())}</span>
              </div>
              <div className="mt-2 text-fg-muted text-[11px]">Deliver through whatever channel you have — email integration is a future project.</div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider font-semibold text-fg-subtle mb-1.5 pb-1.5 border-b border-hairline">
      {children}
    </div>
  );
}

function DownlineNode({ node, depth }: { node: any; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  return (
    <div>
      <div className="flex items-center gap-1.5 py-1 text-[12px]" style={{ paddingLeft: depth * 14 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={!hasChildren}
          className={cn('grid place-items-center size-4 rounded transition-colors', hasChildren ? 'text-fg-muted hover:text-fg' : 'opacity-0 pointer-events-none')}
        >
          <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
        </button>
        <Avatar name={node.username} size={20} />
        <span className="text-fg truncate max-w-[120px]">{node.username}</span>
        <Badge tone="neutral">L{node.level}</Badge>
        {node.active && <Badge tone="success">active</Badge>}
        <span className="text-fg-muted flex-1 truncate hidden sm:block">{node.email}</span>
        <span className="text-fg-subtle tabular">{formatMoney(node.volumeUsd)}</span>
      </div>
      {open && hasChildren && (
        <div className="border-l border-hairline ml-2">
          {node.children.map((c: any) => <DownlineNode key={c.id} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}
