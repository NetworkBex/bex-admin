'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Radio, Wifi, WifiOff, RefreshCcw, ArrowUpRight, Search, ChevronDown, Activity,
  TrendingUp, TrendingDown, Hash, ExternalLink, Filter, Play, Pause,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, PulseDot } from '@/components/ui/Badge';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Input, Field } from '@/components/ui/Input';
import { formatMoney, cn, relativeTime } from '@/lib/utils';

type Trade = {
  id: string;
  coin: string;
  side: 'B' | 'A';
  px: number;
  sz: number;
  notional_usd: number;
  hash: string;
  time_ms: number;
  buyer: string;
  seller: string;
  received_ms: number;
  explorer_url: string;
};

type StatusResp = {
  buffer_size: number;
  subscribers: number;
  total_received: number;
  total_emitted: number;
  connected: boolean;
  connected_since: number | null;
  last_message: number | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const SSE_URL  = `${API_BASE}/hl-trades/stream/`;
const RECENT   = `${API_BASE}/hl-trades/recent/`;
const STATUS   = `${API_BASE}/hl-trades/status/`;

const KNOWN_COINS = ['BTC', 'ETH', 'SOL', 'ARB', 'OP', 'AVAX', 'MATIC', 'DOGE'];

export default function LiveTradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [paused, setPaused] = useState(false);
  const [minNotional, setMinNotional] = useState(50_000);
  const [sideFilter, setSideFilter] = useState<'all' | 'B' | 'A'>('all');
  const [coinFilter, setCoinFilter] = useState<string>('all');
  const [now, setNow] = useState<number>(Date.now());
  const [connState, setConnState] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');
  const sseRef = useRef<EventSource | null>(null);
  const [hasNewBurst, setHasNewBurst] = useState(false);

  // Heartbeat — drives relative time refreshes.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Status poller — every 5s, independent of SSE.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(STATUS, { cache: 'no-store' });
        if (r.ok && alive) setStatus(await r.json());
      } catch {}
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Recent-trades bootstrap + polling fallback.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${RECENT}?limit=100&min_notional_usd=${minNotional}`, { cache: 'no-store' });
        if (r.ok && alive) {
          const d = await r.json();
          setTrades(d.trades || []);
        }
      } catch {}
    };
    load();
    // SSE is the primary path; /recent/ polls every 10s as a safety net.
    const id = setInterval(load, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, [minNotional]);

  // SSE — primary live path.
  useEffect(() => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    setConnState('connecting');
    const url = `${SSE_URL}?min_notional_usd=${minNotional}`;
    const es = new EventSource(url);
    sseRef.current = es;
    es.onopen = () => setConnState('open');
    es.onerror = () => setConnState('error');
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'trade') {
          if (paused) return;
          const t = msg as Trade;
          setTrades((prev) => {
            // Dedup by id and cap buffer.
            if (prev.some((p) => p.id === t.id)) return prev;
            const next = [t, ...prev];
            return next.slice(0, 500);
          });
          setHasNewBurst(true);
          setTimeout(() => setHasNewBurst(false), 800);
        }
      } catch {}
    };
    return () => { es.close(); sseRef.current = null; };
  }, [minNotional, paused]);

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (sideFilter !== 'all' && t.side !== sideFilter) return false;
      if (coinFilter !== 'all' && t.coin !== coinFilter) return false;
      if (t.notional_usd < minNotional) return false;
      return true;
    });
  }, [trades, sideFilter, coinFilter, minNotional]);

  const lastMessageAge = status?.last_message ? Math.max(0, Math.floor((now - status.last_message) / 1000)) : null;
  const seenLast30s = trades.filter((t) => now - t.received_ms < 30_000).length;

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        eyebrow="Operate"
        title="Live trades"
        description="Whale trades on Hyperliquid. Streamed in real time over Server-Sent Events."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 text-[11.5px]">
              {connState === 'open' ? (
                <><Wifi className="size-3.5 text-success" /><span className="text-success font-semibold">live</span></>
              ) : connState === 'connecting' ? (
                <><PulseDot tone="warning" />connecting…</>
              ) : (
                <><WifiOff className="size-3.5 text-danger" /><span className="text-danger font-semibold">{connState}</span></>
              )}
            </span>
            <Button size="sm" variant="secondary" onClick={() => setPaused((p) => !p)} leadingIcon={paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}>
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setTrades([])} leadingIcon={<RefreshCcw className="size-3.5" />}>
              Clear
            </Button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi label="Connected"      value={status?.connected ? 'yes' : 'no'}
              tone={status?.connected ? 'success' : 'danger'}
              sub={status?.connected_since ? `since ${relativeTime(String(status.connected_since))}` : '—'} />
        <Kpi label="Whales shown"   value={filtered.length}
              sub={`${seenLast30s} in last 30s`}
              tone="accent" />
        <Kpi label="Total received" value={status?.total_received ?? 0}
              sub={`emitted ${status?.total_emitted ?? 0}`} />
        <Kpi label="Last message"   value={lastMessageAge != null ? `${lastMessageAge}s ago` : '—'}
              sub={status?.buffer_size != null ? `buffer ${status.buffer_size}/1000` : ''} />
      </div>

      {/* Filter bar */}
      <Card className="mb-4">
        <CardBody className="py-3 grid sm:grid-cols-[200px_140px_1fr_auto] gap-3 items-end">
          <Field label="Whale threshold" hint={`$${minNotional.toLocaleString()}+`}>
            <Input
              type="number" min="0" step="1000"
              value={minNotional}
              onChange={(e) => setMinNotional(Math.max(0, +e.target.value || 0))}
            />
          </Field>
          <Field label="Side">
            <select value={sideFilter} onChange={(e) => setSideFilter(e.target.value as any)}
                    className="h-9 px-3 bg-surface text-fg text-sm border border-border rounded-md">
              <option value="all">All</option>
              <option value="B">Buy</option>
              <option value="A">Sell</option>
            </select>
          </Field>
          <Field label="Coin">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCoinFilter('all')}
                className={cn('h-7 px-2.5 rounded-full text-[11.5px] font-semibold border transition-colors',
                  coinFilter === 'all' ? 'bg-fg text-fg-inverse border-fg' : 'bg-surface text-fg-muted border-border hover:border-border-strong')}>
                All
              </button>
              {KNOWN_COINS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCoinFilter(c)}
                  className={cn('h-7 px-2.5 rounded-full text-[11.5px] font-mono font-semibold border transition-colors',
                    coinFilter === c ? 'bg-fg text-fg-inverse border-fg' : 'bg-surface text-fg-muted border-border hover:border-border-strong')}>
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex items-center gap-2 text-[11.5px] text-fg-subtle">
            <Filter className="size-3" /> {filtered.length} of {trades.length}
          </div>
        </CardBody>
      </Card>

      {/* Trade tape */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Radio}
          title={trades.length === 0 ? 'Waiting for trades…' : 'No trades match the filter'}
          description={trades.length === 0
            ? `Whale trades (≥$${minNotional.toLocaleString()}) will appear here as they execute on Hyperliquid.`
            : 'Lower the threshold or change the side/coin filter.'}
        />
      ) : (
        <Card>
          <div className="border-b border-hairline bg-surface-sunk/40 px-5 py-2 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold">
            <span className="flex-1 grid grid-cols-[80px_60px_1fr_120px_140px_120px] gap-3">
              <span>Time</span>
              <span>Coin</span>
              <span>Side · Size · Price</span>
              <span className="text-right">Notional</span>
              <span>Buyer</span>
              <span>Hash</span>
            </span>
          </div>
          <ul className={cn('divide-y divide-hairline max-h-[70vh] overflow-y-auto', hasNewBurst && 'ring-1 ring-accent/30 transition-all')}>
            {filtered.map((t) => (
              <li key={t.id} className="px-5 py-2.5 hover:bg-surface-2/40 transition-colors">
                <a
                  href={t.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid grid-cols-[80px_60px_1fr_120px_140px_120px] gap-3 items-center text-sm group"
                  title="Open buyer address on Hyperliquid explorer"
                >
                  <span className="text-[11.5px] text-fg-muted tabular whitespace-nowrap">
                    {new Date(t.received_ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="font-mono font-semibold text-fg text-[12px]">{t.coin}</span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded',
                      t.side === 'B' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
                      {t.side === 'B' ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {t.side === 'B' ? 'BUY' : 'SELL'}
                    </span>
                    <span className="font-mono text-fg text-[12.5px] tabular">
                      {t.sz.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                    <span className="text-fg-subtle text-[11.5px]">@</span>
                    <span className="font-mono text-fg tabular text-[12.5px]">
                      ${t.px.toLocaleString(undefined, { maximumFractionDigits: t.px < 1 ? 4 : 2 })}
                    </span>
                  </span>
                  <span className="text-right font-mono font-semibold tabular text-fg">
                    {formatMoney(t.notional_usd, { decimals: 0 })}
                  </span>
                  <span className="font-mono text-[11.5px] text-fg-muted truncate" title={t.buyer}>
                    {t.buyer.slice(0, 6)}…{t.buyer.slice(-4)}
                  </span>
                  <span className="font-mono text-[11px] text-fg-subtle flex items-center gap-1 group-hover:text-accent">
                    <Hash className="size-3" />{t.hash.slice(0, 10)}…
                    <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone = 'neutral' }: { label: string; value: any; sub?: string; tone?: 'neutral' | 'success' | 'danger' | 'accent' }) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold">{label}</div>
        <div className={cn('text-2xl font-semibold tabular mt-2',
          tone === 'success' && 'text-success',
          tone === 'danger'  && 'text-danger',
          tone === 'accent'  && 'text-accent',
        )}>
          {value}
        </div>
        {sub && <div className="text-[11px] text-fg-subtle mt-1">{sub}</div>}
      </CardBody>
    </Card>
  );
}
