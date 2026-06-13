'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tiny hook that removes the boilerplate around "fetch a list on mount,
 * expose rows + loading + error, let the caller refresh". The fetcher
 * is an arbitrary promise; we just unwrap ``res.data``.
 *
 *   const { rows, loading, error, reload, params, setParams } =
 *     useResourceList((p) => userAPI.list(p), { page: 1 });
 */
export function useResourceList<T>(
  fetcher: (params: Record<string, any>) => Promise<{ data: T[] }>,
  initialParams: Record<string, any> = {},
  deps: any[] = [],
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, any>>(initialParams);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current(params);
      const data = res.data;
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { load(); }, [load, ...deps]);

  return { rows, loading, error, reload: load, params, setParams };
}
