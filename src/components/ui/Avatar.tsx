'use client';

import { cn } from '@/lib/utils';

type Props = {
  name?: string | null;
  size?: number;
  className?: string;
};

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+|[@._-]/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || name[0]?.toUpperCase() || '?';
}

/**
 * Tiny initials avatar — drop-in for the user-app's <Avatar /> but
 * smaller. Shows the first 1–2 characters of the name inside an
 * accent-tinted circle.
 */
export function Avatar({ name, size = 28, className }: Props) {
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) }}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold tabular select-none',
        'bg-accent-soft text-accent-fg border border-accent/30',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
