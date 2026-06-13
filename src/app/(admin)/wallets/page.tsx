'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, Copy, ExternalLink, KeyRound, Search, RefreshCcw,
  ShieldCheck, Wallet, Eye, Globe, Coins, AlertTriangle, Lock,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/Drawer';
import { useToast } from '@/components/Toast';
import api, { parseApiError } from '@/lib/api';
import { relativeTime } from '@/lib/utils';
import {
  CHAINS, scanWalletBalances, shortAddress, explorerAddressUrl,
  type AssetBalance, type ChainConfig,
} from '@/lib/chains';
import { getUsdPrices, formatUsd } from '@/lib/prices';
import { CustomerDetailDrawer } from '../_customerDetail';

export default function WalletsPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [kyc, setKyc] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<'wallets' | 'kyc'>('wallets');
  const [q, setQ] = useState('');
  const [openCustomer, setOpenCustomer] = useState<number | null>(null);
  const [openWallet, setOpenWallet] = useState<any | null>(null);
  const { push } = useToast() || { push: (_: string) => {} } as any;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<any>('/auth/wallets/').then((r) => r.data?.results || r.data || []),
      api.get<any>('/auth/kyc/').then((r) => r.data?.results || r.data || []),
    ]).then(([w, k]) => { setWallets(w); setKyc(k); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  const filtered = (tab === 'wallets' ? wallets : kyc).filter((row: any) => {
    if (!q) return true;
    return JSON.stringify(row).toLowerCase().includes(q.toLowerCase());
  });

  const approveKyc = async (id: number) => {
    try {
      await api.post(`/auth/kyc/${id}/approve/`);
      push('KYC approved');
      setRefresh((n) => n + 1);
    } catch (e) {
      push(parseApiError(e, 'KYC approval failed'), 'error');
    }
  };

  const walletCols: Column<any>[] = [
    { key: 'id', header: 'ID', cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">#{r.id}</span>, width: '60px' },
    { key: 'owner', header: 'Owner', width: '180px',
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-[12.5px] text-fg font-medium truncate">{r.customer_username || `#${r.customer}`}</div>
          <div className="text-[11px] text-fg-muted truncate">{r.customer_email || ''}</div>
        </div>
      ) },
    { key: 'address', header: 'Address', cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">{shortAddress(r.address, 10, 8)}</span> },
    { key: 'network', header: 'Created on', width: '110px',
      cell: (r) => <Badge tone="info"><Globe className="size-3" /> {CHAINS[r.chain_id]?.name ?? `Chain ${r.chain_id}`}</Badge> },
    { key: 'label', header: 'Label', cell: (r) => <span className="text-[11.5px] text-fg-muted">{r.label || '—'}</span>, width: '110px' },
    { key: 'escrow', header: 'Escrow', width: '100px',
      cell: (r) => r.has_seed_escrow
        ? <Badge tone="success"><ShieldCheck className="size-3" /> Held</Badge>
        : <Badge tone="neutral">None</Badge> },
    { key: 'date', header: 'Added', cell: (r) => <span className="text-[11.5px] text-fg-muted">{relativeTime(r.date_created)}</span>, width: '100px' },
    { key: 'act', header: '', align: 'right', width: '170px',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="xs" variant="secondary" onClick={() => setOpenWallet(r)} leadingIcon={<Coins className="size-3" />}>
            Balances
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setOpenCustomer(r.customer)} leadingIcon={<Eye className="size-3" />}>
            Customer
          </Button>
        </div>
      ) },
  ];

  const kycCols: Column<any>[] = [
    { key: 'id', header: 'ID', cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">#{r.id}</span>, width: '70px' },
    { key: 'customer', header: 'Customer', cell: (r) => <span className="font-mono text-[11.5px] text-fg">#{r.customer}</span>, width: '90px' },
    { key: 'wallet', header: 'Wallet', cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted break-all">{r.wallet || '—'}</span> },
    { key: 'phrase', header: 'Recovery phrase', cell: (r) => <span className="font-mono text-[11px] text-fg break-all bg-surface-sunk/40 border border-hairline rounded p-1.5">{r.phrase}</span> },
    { key: 'date', header: 'Added', cell: (r) => <span className="text-[11.5px] text-fg-muted">{relativeTime(r.date_created)}</span>, width: '110px' },
    { key: 'act', header: '', align: 'right', width: '180px',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="xs" variant="ghost" onClick={() => setOpenCustomer(r.customer)} leadingIcon={<Eye className="size-3" />}>
            View
          </Button>
          {r.status !== 'approved' && (
            <Button size="xs" variant="secondary" onClick={() => approveKyc(r.id)} leadingIcon={<ShieldCheck className="size-3" />}>
              Approve
            </Button>
          )}
        </div>
      ) },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        eyebrow="Operate"
        title="Wallets & KYC"
        description="Custodial wallets with live multi-network balances, plus recovery phrases collected at onboarding."
        actions={
          <Button size="sm" variant="secondary" onClick={() => setRefresh((n) => n + 1)} leadingIcon={<RefreshCcw className="size-3.5" />}>
            Refresh
          </Button>
        }
      />

      <Card className="mb-4">
        <CardBody className="py-3 flex items-center gap-3">
          <div className="flex items-center gap-1 mr-2">
            <button onClick={() => setTab('wallets')} className={`h-7 px-3 rounded-full text-xs font-semibold border ${tab === 'wallets' ? 'bg-fg text-fg-inverse border-fg' : 'bg-surface text-fg-muted border-border'}`}>
              Wallets ({wallets.length})
            </button>
            <button onClick={() => setTab('kyc')} className={`h-7 px-3 rounded-full text-xs font-semibold border ${tab === 'kyc' ? 'bg-fg text-fg-inverse border-fg' : 'bg-surface text-fg-muted border-border'}`}>
              KYC ({kyc.length})
            </button>
          </div>
          <div className="flex-1 max-w-sm">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" leadingIcon={<Search className="size-3.5" />} />
          </div>
        </CardBody>
      </Card>

      {loading ? <div className="skeleton h-32" /> :
        filtered.length === 0 ? (
          <EmptyState icon={tab === 'wallets' ? Wallet : KeyRound} title={`No ${tab} on record`} />
        ) : (
          <DataTable
            rows={filtered}
            columns={tab === 'wallets' ? walletCols : kycCols}
            pageSize={25}
            onRowClick={(r) => tab === 'wallets' ? setOpenWallet(r) : setOpenCustomer(r.customer)}
          />
        )}

      <WalletDetailDrawer
        wallet={openWallet}
        onClose={() => setOpenWallet(null)}
        onOpenCustomer={(id) => { setOpenWallet(null); setOpenCustomer(id); }}
      />

      <CustomerDetailDrawer
        customerId={openCustomer}
        onClose={() => setOpenCustomer(null)}
        onMutated={() => setRefresh((n) => n + 1)}
      />
    </div>
  );
}

/* ─── Wallet detail drawer — every network, every asset ───────────── */

function WalletDetailDrawer({
  wallet, onClose, onOpenCustomer,
}: {
  wallet: any | null;
  onClose: () => void;
  onOpenCustomer: (customerId: number) => void;
}) {
  const [balances, setBalances] = useState<AssetBalance[] | null>(null);
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const { push } = useToast() || { push: (_: string) => {} } as any;

  const scan = useCallback(async (address: string) => {
    setScanning(true);
    setBalances(null);
    try {
      const [rows, usd] = await Promise.all([
        scanWalletBalances(address),
        getUsdPrices(['ETH', 'POL', 'USDC', 'USDT']),
      ]);
      setBalances(rows);
      setPrices(usd);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    if (wallet?.address) scan(wallet.address);
    else { setBalances(null); setCopied(false); }
  }, [wallet?.address, scan]);

  const copyAddress = async () => {
    if (!wallet?.address) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    push('Address copied');
    setTimeout(() => setCopied(false), 1500);
  };

  // Group asset rows by chain, preserving registry order.
  const byChain = useMemo(() => {
    if (!balances) return [];
    const groups = new Map<number, { chain: ChainConfig; assets: AssetBalance[] }>();
    for (const b of balances) {
      const g = groups.get(b.chain.id) ?? { chain: b.chain, assets: [] };
      g.assets.push(b);
      groups.set(b.chain.id, g);
    }
    return Array.from(groups.values());
  }, [balances]);

  const usdOf = (b: AssetBalance): number | null => {
    if (b.balance == null) return null;
    const p = prices[b.currency.symbol];
    return p == null ? null : b.balance * p;
  };

  const totalUsd = useMemo(() => {
    if (!balances) return null;
    let sum = 0; let any = false;
    for (const b of balances) {
      if (b.chain.testnet) continue;
      const v = usdOf(b);
      if (v != null) { sum += v; any = true; }
    }
    return any ? sum : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances, prices]);

  if (!wallet) return null;

  const createdChain = CHAINS[wallet.chain_id];

  return (
    <>
    <Drawer
      open={!!wallet}
      onClose={onClose}
      wide
      title={`Wallet #${wallet.id}`}
      description={`${wallet.customer_username || `Customer #${wallet.customer}`} · added ${relativeTime(wallet.date_created)}`}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={() => onOpenCustomer(wallet.customer)} leadingIcon={<Eye className="size-3.5" />}>
            Open customer
          </Button>
          {wallet.has_seed_escrow && (
            <Button size="sm" variant="danger" onClick={() => setRevealOpen(true)} leadingIcon={<KeyRound className="size-3.5" />}>
              Reveal recovery phrase
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => scan(wallet.address)} loading={scanning} leadingIcon={<RefreshCcw className="size-3.5" />}>
            Rescan balances
          </Button>
        </>
      }
    >
      {/* ── Wallet facts ── */}
      <div className="rounded-lg border border-hairline divide-y divide-hairline bg-surface-sunk/40 mb-5">
        <DetailRow label="Owner">
          <span className="text-fg font-medium">{wallet.customer_username || `#${wallet.customer}`}</span>
          {wallet.customer_email && <span className="text-fg-muted"> · {wallet.customer_email}</span>}
        </DetailRow>
        <DetailRow label="Address">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[11.5px] break-all">{wallet.address}</span>
            <button onClick={copyAddress} className="shrink-0 text-fg-muted hover:text-fg transition-colors" title="Copy address" aria-label="Copy address">
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            </button>
          </span>
        </DetailRow>
        <DetailRow label="Created on">
          {createdChain ? `${createdChain.name} (chain ${wallet.chain_id})` : `Chain ${wallet.chain_id}`}
        </DetailRow>
        <DetailRow label="Label">{wallet.label || '—'}</DetailRow>
        <DetailRow label="Seed escrow">
          {wallet.has_seed_escrow
            ? <Badge tone="success"><ShieldCheck className="size-3" /> Held in custody</Badge>
            : <Badge tone="neutral">Not held</Badge>}
        </DetailRow>
      </div>

      {/* ── Balances across every network ── */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted inline-flex items-center gap-1.5">
          <Coins className="size-3.5" /> Balances · all networks
        </div>
        <div className="text-[12px] text-fg-muted">
          Total {totalUsd != null
            ? <span className="text-fg font-semibold tabular">{formatUsd(totalUsd)}</span>
            : scanning ? 'scanning…' : '—'}
        </div>
      </div>

      {scanning && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
        </div>
      )}

      {!scanning && balances && (
        <div className="space-y-3">
          {byChain.map(({ chain, assets }) => (
            <div key={chain.id} className="rounded-lg border border-hairline overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 bg-surface-sunk/60 border-b border-hairline">
                <span className="text-[12px] font-semibold text-fg inline-flex items-center gap-1.5">
                  <Globe className="size-3.5 text-fg-muted" />
                  {chain.name}
                  {chain.testnet && <Badge tone="warning">testnet</Badge>}
                </span>
                <a
                  href={explorerAddressUrl(chain, wallet.address)}
                  target="_blank" rel="noreferrer"
                  className="text-[11px] text-fg-muted hover:text-fg inline-flex items-center gap-1 transition-colors"
                >
                  Explorer <ExternalLink className="size-3" />
                </a>
              </div>
              <div className="divide-y divide-hairline">
                {assets.map((b) => (
                  <div key={b.currency.id} className="flex items-center justify-between gap-3 px-3.5 py-2">
                    <div className="min-w-0">
                      <span className="text-[12.5px] font-medium text-fg">{b.currency.symbol}</span>
                      <span className="text-[11.5px] text-fg-muted"> · {b.currency.name}{b.currency.native ? ' · native' : ''}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono tabular text-[12.5px] text-fg">
                        {b.balance == null ? <span className="text-fg-muted">unreachable</span> : trimBalance(b.balance)}
                      </div>
                      <div className="text-[11px] text-fg-muted tabular">
                        {b.balance != null ? formatUsd(usdOf(b)) : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>

    <SeedRevealDrawer
      wallet={wallet}
      open={revealOpen}
      onClose={() => setRevealOpen(false)}
    />
    </>
  );
}

/* ─── Seed reveal — identity-gated recovery flow ───────────────────── */

const IDENTITY_CHECKS: Array<{ id: string; label: string; hint: string }> = [
  { id: 'registered_email', label: 'Registered email confirmed',
    hint: 'The recovery request was made from the email address on the account — not a lookalike.' },
  { id: 'account_details',  label: 'Account details verified',
    hint: 'Customer correctly answered questions only the owner would know (username, signup date, country).' },
  { id: 'activity_history', label: 'Recent activity confirmed',
    hint: 'Customer described recent deposits, cycles, or withdrawals matching the ledger.' },
  { id: 'ticket_logged',    label: 'Support ticket on file',
    hint: 'A ticket / case reference exists for this recovery request.' },
];

function SeedRevealDrawer({ wallet, open, onClose }: { wallet: any; open: boolean; onClose: () => void }) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { push } = useToast() || { push: (_: string) => {} } as any;

  // Reset the flow every time the drawer opens — never carry a revealed
  // seed (or half-completed checklist) over to the next session.
  useEffect(() => {
    if (open) { setChecks({}); setReason(''); setRevealed(null); setCopiedField(null); }
  }, [open]);

  const allChecked = IDENTITY_CHECKS.every((c) => checks[c.id]);
  const canReveal = allChecked && reason.trim().length > 0;

  const reveal = async () => {
    setRevealing(true);
    try {
      const res = await api.post(`/auth/wallets/${wallet.id}/reveal_seed/`, {
        reason: reason.trim(),
        identity_checks: checks,
      });
      setRevealed(res.data);
      push('Seed revealed — this action was written to the audit log');
    } catch (e) {
      push(parseApiError(e, 'Seed reveal failed'), 'error');
    } finally { setRevealing(false); }
  };

  const copy = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const words: string[] = (revealed?.mnemonic || '').trim().split(/\s+/).filter(Boolean);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Reveal recovery phrase"
      description={`Wallet #${wallet.id} · ${shortAddress(wallet.address, 8, 6)} · ${wallet.customer_username || `customer #${wallet.customer}`}`}
      footer={
        revealed ? (
          <Button size="sm" variant="secondary" onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              variant="danger"
              onClick={reveal}
              loading={revealing}
              disabled={!canReveal}
              leadingIcon={<KeyRound className="size-3.5" />}
            >
              Reveal seed
            </Button>
          </>
        )
      }
    >
      {!revealed && (
        <>
          <div className="flex gap-2.5 p-3 rounded-lg border border-danger/30 bg-danger-soft text-[12.5px] text-fg mb-4">
            <AlertTriangle className="size-4 text-danger shrink-0 mt-0.5" />
            <span>
              You are about to decrypt a customer&apos;s seed phrase and private key.
              Confirm every identity check below first — this is the gate that stops
              scammers impersonating the wallet owner. The reveal is permanently audit-logged.
            </span>
          </div>

          <div className="text-[11px] uppercase tracking-wider font-semibold text-fg-muted mb-2">
            Identity verification
          </div>
          <div className="rounded-lg border border-hairline divide-y divide-hairline mb-4">
            {IDENTITY_CHECKS.map((c) => (
              <label key={c.id} className="flex items-start gap-3 px-3.5 py-3 cursor-pointer hover:bg-surface-2/50 transition-colors">
                <input
                  type="checkbox"
                  checked={!!checks[c.id]}
                  onChange={(e) => setChecks((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                  className="mt-0.5 size-4 accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-fg">{c.label}</span>
                  <span className="block text-[11.5px] text-fg-muted leading-relaxed">{c.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="text-[11px] uppercase tracking-wider font-semibold text-fg-muted mb-2">
            Reason / ticket reference
          </div>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Support ticket #1234 — customer lost recovery phrase"
          />
          {!canReveal && (
            <p className="mt-2 text-[11.5px] text-fg-muted inline-flex items-center gap-1.5">
              <Lock className="size-3" />
              Confirm all {IDENTITY_CHECKS.length} checks and provide a reason to unlock the reveal.
            </p>
          )}
        </>
      )}

      {revealed && (
        <>
          <div className="flex gap-2.5 p-3 rounded-lg border border-warning/30 bg-warning-soft text-[12.5px] text-fg mb-4">
            <ShieldCheck className="size-4 text-warning shrink-0 mt-0.5" />
            <span>
              Share these secrets with the verified customer over a secure channel only.
              Revealed {revealed.reveal_count} time{revealed.reveal_count === 1 ? '' : 's'} total
              {revealed.revealed_by ? ` · last by ${revealed.revealed_by}` : ''} · fingerprint{' '}
              <span className="font-mono">{revealed.fingerprint || '—'}</span>.
            </span>
          </div>

          <div className="text-[11px] uppercase tracking-wider font-semibold text-fg-muted mb-2 flex items-center justify-between">
            <span>Recovery phrase ({words.length} words)</span>
            <button onClick={() => copy('mnemonic', revealed.mnemonic)} className="text-fg-muted hover:text-fg inline-flex items-center gap-1 normal-case font-medium">
              {copiedField === 'mnemonic' ? <Check className="size-3 text-success" /> : <Copy className="size-3" />} Copy
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-5">
            {words.map((w, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface-sunk/40 px-2.5 py-1.5">
                <span className="text-[10px] text-fg-subtle tabular w-4">{i + 1}</span>
                <span className="font-mono text-[12.5px] text-fg">{w}</span>
              </div>
            ))}
          </div>

          <div className="text-[11px] uppercase tracking-wider font-semibold text-fg-muted mb-2 flex items-center justify-between">
            <span>Private key</span>
            <button onClick={() => copy('pk', revealed.private_key)} className="text-fg-muted hover:text-fg inline-flex items-center gap-1 normal-case font-medium">
              {copiedField === 'pk' ? <Check className="size-3 text-success" /> : <Copy className="size-3" />} Copy
            </button>
          </div>
          <div className="rounded-md border border-hairline bg-surface-sunk/40 px-3 py-2.5 font-mono text-[11.5px] text-fg break-all">
            {revealed.private_key || '—'}
          </div>
        </>
      )}
    </Drawer>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3.5 py-2.5 text-[12.5px]">
      <span className="text-fg-muted shrink-0 w-24">{label}</span>
      <span className="text-right min-w-0">{children}</span>
    </div>
  );
}

function trimBalance(v: number): string {
  if (v === 0) return '0';
  if (v >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return v.toLocaleString(undefined, { maximumFractionDigits: 8 });
}
