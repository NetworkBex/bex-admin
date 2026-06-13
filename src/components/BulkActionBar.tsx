'use client';

import { CheckSquare, X } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

export type BulkAction = {
  label: string;
  value: string;
  tone?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
  confirm?: string;
};

type Props = {
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
  actions: BulkAction[];
  onAction: (value: string) => void;
  className?: string;
};

/**
 * Sticky footer that surfaces bulk actions when ≥1 row is selected.
 * Pass `actions` to define what the admin can do with the selection;
 * the bar shows a "Select all on this page" hint, the count, and
 * one Button per action.
 */
export function BulkActionBar({ selectedCount, totalCount, onClear, actions, onAction, className }: Props) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'sticky bottom-3 z-30 mx-3 mb-3 flex items-center justify-between gap-3',
        'rounded-xl border border-accent/30 bg-surface shadow-[var(--shadow-md)] px-4 py-2.5',
        'animate-rise-in',
        className,
      )}
      role="region"
      aria-label="Bulk actions"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center size-7 rounded-full bg-accent text-accent-fg text-[12px] font-semibold tabular">
          {selectedCount}
        </span>
        <span className="text-[13px] text-fg">
          <span className="font-semibold tabular">{selectedCount}</span> of {totalCount} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="ml-1 text-[12px] text-fg-muted hover:text-fg inline-flex items-center gap-1"
        >
          <X className="size-3" /> Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((a) => (
          <Button
            key={a.value}
            size="sm"
            variant={a.tone ?? 'secondary'}
            leadingIcon={<CheckSquare className="size-3.5" />}
            onClick={() => {
              if (a.confirm && !window.confirm(a.confirm)) return;
              onAction(a.value);
            }}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
