export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(' ');
}

export function formatMoney(value: number | string | null | undefined, opts: { decimals?: number; sign?: boolean } = {}) {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  const v = Number.isFinite(n) ? n : 0;
  const decimals = opts.decimals ?? (Math.abs(v) >= 1000 ? 0 : 2);
  const fmt = v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const prefix = opts.sign && v > 0 ? '+' : '';
  return `${prefix}$${fmt}`;
}

export function formatCompact(value: number | string | null | undefined) {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 });
}

export function shortDate(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function relativeTime(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)    return `${Math.round(diff)}s ago`;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.round(diff / 86400)}d ago`;
  return shortDate(s);
}

export function formatDateTime(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
