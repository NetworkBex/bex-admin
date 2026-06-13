/**
 * Read-only chain + asset registry for the admin wallets page.
 *
 * Mirrors the canonical catalog in frontend/src/lib/wallet.ts (the user
 * app), but stripped to what the admin panel needs: public RPC reads of
 * native and ERC-20 balances across every supported network.
 */

import { JsonRpcProvider, Contract, formatUnits, isAddress } from 'ethers';

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  symbol: string;
  rpc: string;
  explorer: string;
  testnet: boolean;
}

export const CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1, name: 'Ethereum', shortName: 'ETH', symbol: 'ETH',
    rpc: 'https://ethereum-rpc.publicnode.com',
    explorer: 'https://etherscan.io', testnet: false,
  },
  137: {
    id: 137, name: 'Polygon', shortName: 'MATIC', symbol: 'POL',
    rpc: 'https://polygon-bor-rpc.publicnode.com',
    explorer: 'https://polygonscan.com', testnet: false,
  },
  8453: {
    id: 8453, name: 'Base', shortName: 'BASE', symbol: 'ETH',
    rpc: 'https://base-rpc.publicnode.com',
    explorer: 'https://basescan.org', testnet: false,
  },
  42161: {
    id: 42161, name: 'Arbitrum', shortName: 'ARB', symbol: 'ETH',
    rpc: 'https://arbitrum-one-rpc.publicnode.com',
    explorer: 'https://arbiscan.io', testnet: false,
  },
  11155111: {
    id: 11155111, name: 'Sepolia', shortName: 'SEP', symbol: 'ETH',
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io', testnet: true,
  },
};

export interface Currency {
  id: string;
  symbol: string;
  name: string;
  chainId: number;
  native: boolean;
  contract?: string;
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  // ─ Ethereum mainnet
  { id: 'eth-eth',   symbol: 'ETH',  name: 'Ether',         chainId: 1,        native: true,  decimals: 18 },
  { id: 'usdc-eth',  symbol: 'USDC', name: 'USD Coin',      chainId: 1,        native: false, decimals: 6, contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { id: 'usdt-eth',  symbol: 'USDT', name: 'Tether',        chainId: 1,        native: false, decimals: 6, contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  // ─ Arbitrum One
  { id: 'eth-arb',   symbol: 'ETH',  name: 'Ether',         chainId: 42161,    native: true,  decimals: 18 },
  { id: 'usdc-arb',  symbol: 'USDC', name: 'USD Coin',      chainId: 42161,    native: false, decimals: 6, contract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  { id: 'usdt-arb',  symbol: 'USDT', name: 'Tether',        chainId: 42161,    native: false, decimals: 6, contract: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
  // ─ Polygon PoS
  { id: 'pol-pol',   symbol: 'POL',  name: 'Polygon',       chainId: 137,      native: true,  decimals: 18 },
  { id: 'usdc-pol',  symbol: 'USDC', name: 'USD Coin',      chainId: 137,      native: false, decimals: 6, contract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  { id: 'usdt-pol',  symbol: 'USDT', name: 'Tether',        chainId: 137,      native: false, decimals: 6, contract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
  // ─ Base
  { id: 'eth-base',  symbol: 'ETH',  name: 'Ether',         chainId: 8453,     native: true,  decimals: 18 },
  { id: 'usdc-base', symbol: 'USDC', name: 'USD Coin',      chainId: 8453,     native: false, decimals: 6, contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  // ─ Sepolia (testnet)
  { id: 'eth-sep',   symbol: 'ETH',  name: 'Sepolia ether', chainId: 11155111, native: true,  decimals: 18 },
];

/* ─── Balance scanning ─────────────────────────────────────────────── */

export interface AssetBalance {
  currency: Currency;
  chain: ChainConfig;
  /** Token units (already decimal-adjusted). `null` = RPC unreachable. */
  balance: number | null;
}

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
const RPC_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('rpc timeout')), RPC_TIMEOUT_MS)),
  ]);
}

/** Fetch every supported asset balance for `address` across all networks.
 *  Failures are per-asset (`balance: null`) — one dead RPC never blanks
 *  the whole scan. */
export async function scanWalletBalances(address: string): Promise<AssetBalance[]> {
  if (!isAddress(address)) {
    return CURRENCIES.map((currency) => ({ currency, chain: CHAINS[currency.chainId], balance: null }));
  }

  // One provider per chain, shared across that chain's assets.
  const providers = new Map<number, JsonRpcProvider>();
  const providerFor = (chainId: number) => {
    let p = providers.get(chainId);
    if (!p) {
      const chain = CHAINS[chainId];
      p = new JsonRpcProvider(chain.rpc, chain.id, { staticNetwork: true });
      providers.set(chainId, p);
    }
    return p;
  };

  const results = await Promise.all(CURRENCIES.map(async (currency): Promise<AssetBalance> => {
    const chain = CHAINS[currency.chainId];
    try {
      const provider = providerFor(currency.chainId);
      const raw: bigint = currency.native
        ? await withTimeout(provider.getBalance(address))
        : await withTimeout(new Contract(currency.contract!, ERC20_ABI, provider).balanceOf(address));
      return { currency, chain, balance: Number(formatUnits(raw, currency.decimals)) };
    } catch {
      return { currency, chain, balance: null };
    }
  }));

  providers.forEach((p) => p.destroy());
  return results;
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

export function shortAddress(addr?: string | null, head = 6, tail = 4): string {
  if (!addr) return '—';
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function explorerAddressUrl(chain: ChainConfig, address: string): string {
  return `${chain.explorer}/address/${address}`;
}

export { isAddress };
