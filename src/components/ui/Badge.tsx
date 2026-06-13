import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

const toneStyles: Record<Tone, string> = {
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger:  'bg-danger-soft  text-danger  border-danger/25',
  info:    'bg-info-soft    text-info    border-info/25',
  neutral: 'bg-surface-2    text-fg-muted border-border',
  accent:  'bg-accent-soft  text-accent-fg border-accent/30',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
  dot,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold tracking-[0.01em] leading-[1.4] tabular',
        toneStyles[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusPill({ status, labels }: { status: number; labels?: { 0?: string; 1?: string; 2?: string; 3?: string; 4?: string } }) {
  const map: Record<number, { tone: Tone; label: string }> = {
    0: { tone: 'warning', label: labels?.[0] ?? 'Pending' },
    1: { tone: 'success', label: labels?.[1] ?? 'Active' },
    2: { tone: 'info',    label: labels?.[2] ?? 'Processing' },
    3: { tone: 'success', label: labels?.[3] ?? 'Completed' },
    4: { tone: 'danger',  label: labels?.[4] ?? 'Failed' },
  };
  const entry = map[status] ?? { tone: 'neutral' as Tone, label: 'Unknown' };
  return <Badge tone={entry.tone} dot>{entry.label}</Badge>;
}

export function PulseDot({ tone = 'success', className }: { tone?: 'success' | 'warning' | 'danger' | 'info'; className?: string }) {
  const colorMap: Record<string, string> = {
    success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info',
  };
  return (
    <span className={cn('relative inline-flex size-2', className)}>
      <span className={cn('absolute inset-0 rounded-full opacity-60 animate-ping', colorMap[tone])} />
      <span className={cn('relative inline-flex rounded-full size-2', colorMap[tone])} />
    </span>
  );
}
