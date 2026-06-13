/**
 * Re-exports the API client. The dashboard module re-imports from './_api'
 * (a private module that won't be routed) instead of '@/lib/api' so the
 * /dashboard route stays thin and tree-shakable.
 */
export {
  authAPI, userAPI, transactionAPI, investmentAPI, earningsAPI,
  planAPI, coreAPI, auditAPI, opsAPI, parseApiError, default as api,
} from '@/lib/api';

// User-facing name used by dashboard tiles.
export { userAPI as customerAPI } from '@/lib/api';
