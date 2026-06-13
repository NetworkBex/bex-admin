'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Check, ChevronRight, Clock, Database, FileText,
  Play, RefreshCcw, RotateCcw, Server, ShieldCheck, Timer, Zap, Hash, ListOrdered,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, PulseDot } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { opsAPI, earningsAPI } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { cn, formatMoney, formatCompact, relativeTime } from '@/lib/utils';

export default function OpsPage() {
  const [health, setHealth] = useState<any>(null);
  const [beat, setBeat] = useState<any>(null);
  const [tasks, setTasks] = useState<any>(null);
  const [logs, setLogs] = useState<{ available: boolean; path?: string; lines: string[]; hint?: string; size_bytes?: number; line_count?: number } | null>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { push } = useToast();

  const refresh = async () => {
    try {
      const [h, b, t, l, e] = await Promise.all([
        opsAPI.health(),
        opsAPI.beat(),
        opsAPI.taskResults(),
        opsAPI.logs(300),
        earningsAPI.summary(),
      ]);
      setHealth(h.data); setBeat(b.data); setTasks(t.data); setLogs(l.data); setEarnings(e.data);
    } catch {}
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  const triggerCredit = async () => {
    setBusy('credit');
    try {
      const r = await opsAPI.triggerCredit();
      push(`Credit run completed: ${r.data.processed} processed, $${r.data.total_usd} credited`, 'success');
      refresh();
    } catch (e) { push('Credit run failed', 'error'); }
    setBusy(null);
  };

  const triggerBackfill = async (days: number) => {
    setBusy(`backfill-${days}`);
    try {
      const r = await opsAPI.triggerBackfill(days);
      push(`Backfill ${days}d completed: ${r.data.count} run(s)`, 'success');
      refresh();
    } catch (e) { push('Backfill failed', 'error'); }
    setBusy(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="Operate"
        title="Ops console"
        description="Health, beat schedule, task results, logs, and manual triggers. Refreshes every 15s."
        actions={
          <Button size="sm" variant="secondary" onClick={refresh} leadingIcon={<RefreshCcw className="size-3.5" />}>
            Refresh
          </Button>
        }
      />

      {/* Health tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <HealthTile
          icon={Database}
          label="Database"
          status={health?.db?.ok}
          sub={health?.db?.engine}
          extra={health?.db?.size_bytes ? `${formatCompact(health.db.size_bytes)}B` : ''}
          error={health?.db?.error}
        />
        <HealthTile
          icon={Server}
          label="Redis / Celery"
          status={health?.redis?.ok}
          sub="broker"
          extra={health?.redis?.url}
          error={health?.redis?.error}
        />
        <HealthTile
          icon={Activity}
          label="Last earnings run"
          status={health?.last_run ? true : null}
          sub={health?.last_run?.run_date || '—'}
          extra={health?.last_run ? `$${health.last_run.credited} credited` : ''}
          error={health?.last_run?.error}
        />
        <HealthTile
          icon={Zap}
          label="Earnings engine"
          status={earnings ? true : null}
          sub="today"
          extra={earnings ? `$${earnings.today}` : ''}
        />
      </div>

      {/* Manual triggers */}
      <Card className="mb-4">
        <CardHeader title="Manual triggers" description="Run jobs that the beat scheduler would normally do." icon={<Play className="size-4" />} />
        <CardBody className="flex flex-wrap items-end gap-3">
          <Button onClick={triggerCredit} loading={busy === 'credit'} leadingIcon={<Play className="size-3.5" />}>
            Run today's earnings credit
          </Button>
          <div className="text-xs text-fg-subtle">or backfill:</div>
          {[3, 7, 14, 30].map((d) => (
            <Button
              key={d}
              size="sm"
              variant="secondary"
              loading={busy === `backfill-${d}`}
              onClick={() => triggerBackfill(d)}
              leadingIcon={<RotateCcw className="size-3" />}
            >
              last {d}d
            </Button>
          ))}
        </CardBody>
      </Card>

      {/* Beat schedule */}
      <Card className="mb-4">
        <CardHeader title="Beat schedule" description="Periodic tasks registered with django-celery-beat." icon={<Clock className="size-4" />} />
        <CardBody className="px-0 pb-0">
          {beat?.tasks?.length ? (
            <ul className="divide-y divide-hairline">
              {beat.tasks.map((t: any) => (
                <li key={t.id} className="px-5 py-3 flex items-center gap-3">
                  <PulseDot tone={t.enabled ? 'success' : 'warning'} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-fg truncate">{t.name}</div>
                    <div className="text-[11.5px] text-fg-subtle font-mono">{t.task}</div>
                  </div>
                  <div className="text-right text-[11.5px] text-fg-muted font-mono">
                    {t.crontab
                      ? `cron ${t.crontab.minute} ${t.crontab.hour} ${t.crontab.day_of_month} ${t.crontab.month_of_year} ${t.crontab.day_of_week}`
                      : t.interval
                        ? `every ${t.interval.every} ${t.interval.period}`
                        : '—'}
                  </div>
                  <div className="text-right text-[11.5px] text-fg-muted w-20">
                    {t.last_run_at ? relativeTime(t.last_run_at) : 'never'}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-6 text-center text-fg-muted text-sm">No tasks registered.</div>
          )}
        </CardBody>
      </Card>

      {/* Task results */}
      <Card className="mb-4">
        <CardHeader title="Recent task results" description="From django-celery-results." icon={<ListOrdered className="size-4" />} />
        <CardBody className="px-0 pb-0">
          {tasks?.results?.length ? (
            <ul className="divide-y divide-hairline max-h-96 overflow-y-auto">
              {tasks.results.map((r: any) => (
                <li key={r.id} className="px-5 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge tone={r.status === 'SUCCESS' ? 'success' : r.status === 'FAILURE' ? 'danger' : 'neutral'} dot>
                      {r.status}
                    </Badge>
                    <span className="font-mono text-fg">{r.task_name}</span>
                    <span className="text-fg-subtle ml-auto">{r.date_done ? relativeTime(r.date_done) : ''}</span>
                  </div>
                  {r.result && <div className="mt-1 font-mono text-fg-muted break-all whitespace-pre-wrap">{r.result.slice(0, 200)}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-6 text-center text-fg-muted text-sm">No task results yet.</div>
          )}
        </CardBody>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader
          title="Recent logs"
          description={logs?.path ? logs.path : 'No log file found in standard locations.'}
          icon={<FileText className="size-4" />}
        />
        <CardBody className="px-0 pb-0">
          {logs?.available ? (
            <pre className="font-mono text-[11px] text-fg-muted leading-relaxed bg-surface-sunk/40 border-t border-hairline p-4 max-h-[420px] overflow-y-auto whitespace-pre-wrap break-all">
{logs.lines.join('\n')}
            </pre>
          ) : (
            <div className="px-5 py-6 text-fg-muted text-sm">
              {logs?.hint || 'No log file found.'}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function HealthTile({ icon: Icon, label, status, sub, extra, error }: { icon: any; label: string; status: boolean | null; sub?: string; extra?: string; error?: string }) {
  const tone = status === null ? 'warning' : status ? 'success' : 'danger';
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold">
          <Icon className="size-3 text-fg-subtle" />
          {label}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <PulseDot tone={tone} />
          <span className={cn('text-sm font-semibold', tone === 'success' && 'text-success', tone === 'danger' && 'text-danger', tone === 'warning' && 'text-warning')}>
            {status === null ? 'checking' : status ? 'ok' : 'degraded'}
          </span>
        </div>
        {sub && <div className="text-[11.5px] text-fg-subtle font-mono mt-1">{sub}</div>}
        {extra && <div className="text-[11px] text-fg-subtle font-mono break-all">{extra}</div>}
        {error && <div className="text-[11px] text-danger font-mono mt-1 break-all">{error}</div>}
      </CardBody>
    </Card>
  );
}
