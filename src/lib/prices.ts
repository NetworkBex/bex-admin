/**
 * Best-effort USD price feed for the wallets balance scan.
 *
 * Natives (ETH, POL) come from CoinGecko's free `simple/price` endpoint,
 * cached for 60s; stables (USDC, USDT) are pinned at $1. Any failure
 * yields `null` so the UI degrades to balance-only rows.
 */

const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  POL: 'matic-network',
};

const STABLE_USD: Record<string, number> = {
  USDC: 1,
  USDT: 1,
};

let cache: { fetchedAt: number; prices: Record<string, number | null> } | null = null;
const TTL_MS = 60_000;

/** USD price per asset symbol (ETH, POL, USDC, USDT…), or null when unknown. */
export async function getUsdPrices(symbols: string[]): Promise<Record<string, number | null>> {
  const want = Array.from(new Set(symbols));
  const out: Record<string, number | null> = {};
  const needFetch: string[] = [];

  for (const s of want) {
    if (STABLE_USD[s] != null) out[s] = STABLE_USD[s];
    else if (COINGECKO_IDS[s]) needFetch.push(s);
    else out[s] = null;
  }
  if (!needFetch.length) return out;

  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    for (const s of needFetch) out[s] = cache.prices[s] ?? null;
    return out;
  }

  const ids = Array.from(new Set(needFetch.map((s) => COINGECKO_IDS[s])));
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`,
      { cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    const data = await res.json();
    const prices: Record<string, number | null> = {};
    for (const s of needFetch) {
      const v = data?.[COINGECKO_IDS[s]]?.usd;
      prices[s] = typeof v === 'number' && Number.isFinite(v) ? v : null;
      out[s] = prices[s];
    }
    cache = { fetchedAt: now, prices };
  } catch {
    cache = { fetchedAt: now, prices: Object.fromEntries(needFetch.map((s) => [s, null])) };
    for (const s of needFetch) out[s] = null;
  }
  return out;
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}
