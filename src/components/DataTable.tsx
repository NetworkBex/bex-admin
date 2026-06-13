'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortBy?: (row: T) => string | number;
  width?: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
};

export function DataTable<T extends { id?: string | number }>({
  rows, columns, pageSize = 25, searchableKeys, empty,
  selectable = false, selected, onSelectChange, selectionKey, onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  pageSize?: number;
  searchableKeys?: (keyof T | string)[];
  empty?: ReactNode;
  /** When true, renders a leading checkbox column. */
  selectable?: boolean;
  /** Currently-selected id set. Caller owns the state. */
  selected?: Set<string | number>;
  onSelectChange?: (next: Set<string | number>) => void;
  /** Defaults to `(row) => row.id`. */
  selectionKey?: (row: T) => string | number;
  /** Clicking a row (anywhere except interactive children) fires this. */
  onRowClick?: (row: T) => void;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const keyOf = (r: T) => (selectionKey ? selectionKey(r) : (r.id as string | number));

  // Defensive: callers occasionally hand us a paginated envelope
  // (e.g. `{ count, next, previous, results }`) or a bare object instead
  // of an array. Coerce to a safe array so the rest of the component
  // can rely on `rows` being iterable.
  const safeRows: T[] = useMemo(() => {
    if (Array.isArray(rows)) return rows;
    if (rows && Array.isArray((rows as any).results)) return (rows as any).results as T[];
    return [];
  }, [rows]);

  const filtered = query
    ? safeRows.filter((r) => {
        const q = query.toLowerCase();
        if (searchableKeys?.length) {
          return searchableKeys.some((k) => String((r as any)[k] ?? '').toLowerCase().includes(q));
        }
        return JSON.stringify(r).toLowerCase().includes(q);
      })
    : rows;

  const sorted = (() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortBy) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = col.sortBy!(a);
      const bv = col.sortBy!(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  })();

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Selection helpers — operate on the *visible page* (matches user
  // expectations: "select all" selects the current page, not the whole
  // server result set).
  const allOnPageSelected = !!selected && slice.length > 0 && slice.every((r) => selected.has(keyOf(r)));
  const toggleAllOnPage = () => {
    if (!onSelectChange) return;
    const next = new Set(selected ?? []);
    if (allOnPageSelected) {
      slice.forEach((r) => next.delete(keyOf(r)));
    } else {
      slice.forEach((r) => next.add(keyOf(r)));
    }
    onSelectChange(next);
  };
  const toggleOne = (k: string | number) => {
    if (!onSelectChange) return;
    const next = new Set(selected ?? []);
    if (next.has(k)) next.delete(k); else next.add(k);
    onSelectChange(next);
  };

  return (
    <div className="space-y-3">
      {searchableKeys && (
        <div className="flex items-center gap-2 max-w-sm">
          <Input
            placeholder="Search…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            leadingIcon={<Search className="size-3.5" />}
          />
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-2/40">
                {selectable && (
                  <th className="w-10 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={toggleAllOnPage}
                      className={cn(
                        'inline-flex items-center justify-center size-4 rounded border-2 transition-colors',
                        allOnPageSelected ? 'bg-accent border-accent text-accent-fg' : 'border-border-strong hover:border-accent',
                      )}
                      aria-label={allOnPageSelected ? 'Clear page selection' : 'Select page'}
                    >
                      {allOnPageSelected && <Check className="size-3" strokeWidth={3} />}
                    </button>
                  </th>
                )}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={{ width: c.width }}
                    className={cn(
                      'text-left text-[10.5px] uppercase tracking-[0.14em] font-semibold text-fg-subtle px-4 py-2.5 select-none',
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                    )}
                  >
                    {c.sortBy ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 hover:text-fg"
                      >
                        {c.header}
                        {sortKey === c.key
                          ? (sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)
                          : <ChevronsUpDown className="size-3 opacity-50" />}
                      </button>
                    ) : c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={(selectable ? 1 : 0) + columns.length} className="p-0">
                    {empty || <div className="px-4 py-10 text-center text-sm text-fg-muted">No results.</div>}
                  </td>
                </tr>
              ) : (
                slice.map((row) => {
                  const k = keyOf(row);
                  const isSelected = !!selected?.has(k);
                  return (
                    <tr
                      key={k}
                      onClick={onRowClick ? (e) => {
                        // Don't fire when clicking an interactive child
                        // (checkbox, button, link, input).
                        const t = e.target as HTMLElement;
                        if (t.closest('button, a, input, [role="button"]')) return;
                        onRowClick(row);
                      } : undefined}
                      className={cn(
                        'border-b border-hairline last:border-b-0 transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-surface-2/40',
                        isSelected && 'bg-accent-soft/30',
                      )}
                    >
                      {selectable && (
                        <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleOne(k)}
                            className={cn(
                              'inline-flex items-center justify-center size-4 rounded border-2 transition-colors',
                              isSelected ? 'bg-accent border-accent text-accent-fg' : 'border-border-strong hover:border-accent',
                            )}
                            aria-label={isSelected ? 'Deselect row' : 'Select row'}
                          >
                            {isSelected && <Check className="size-3" strokeWidth={3} />}
                          </button>
                        </td>
                      )}
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            'px-4 py-2.5 align-middle',
                            c.align === 'right' && 'text-right',
                            c.align === 'center' && 'text-center',
                            c.className,
                          )}
                        >
                          {c.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-hairline text-xs text-fg-muted">
            <div>
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-2.5 h-7 rounded-md border border-border bg-surface hover:bg-surface-2 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-2 tabular">{safePage} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2.5 h-7 rounded-md border border-border bg-surface hover:bg-surface-2 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
