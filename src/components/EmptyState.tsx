import type { LucideIcon } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon, title, description, action, className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardBody className="py-10 flex flex-col items-center text-center gap-2.5">
        <span className="grid place-items-center size-10 rounded-full bg-surface-2 text-fg-subtle">
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {description && <p className="text-xs text-fg-muted max-w-sm">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </CardBody>
    </Card>
  );
}
