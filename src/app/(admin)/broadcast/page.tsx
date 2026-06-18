'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Send, Mail, BellRing, RefreshCcw, Search, Users, CheckCircle2,
  AlertCircle, Clock, MailCheck, Megaphone,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { broadcastAPI, parseApiError } from '@/lib/api';
import { formatMoney, relativeTime, cn } from '@/lib/utils';

type Recipient = {
  id: number; username: string; email: string;
  status: number; emailVerified: boolean; balance: number; joined: string | null;
};
type Segment = { value: string; label: string };
type Reminder = { value: string; label: string; description: string };
type Broadcast = {
  id: number; kind: string; subject: string; reminder_type: string; segment: string;
  recipient_count: number; sent_count: number; failed_count: number; status: string;
  created_by: string; created_at: string | null;
};

export default function BroadcastPage() {
  const { push } = useToast();
  const [mode, setMode] = useState<'custom' | 'reminder'>('custom');

  // Meta
  const [segments, setSegments] = useState<Segment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [segment, setSegment] = useState('no_deposit');
  const [reminderType, setReminderType] = useState('no_deposit');

  // Compose fields
  const [subject, setSubject] = useState('');
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  // Recipients
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loadingRecips, setLoadingRecips] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Broadcast[]>([]);

  // ── Load meta + history once ──────────────────────────────────────────────
  useEffect(() => {
    broadcastAPI.meta().then((r) => {
      setSegments(r.data?.segments || []);
      setReminders(r.data?.reminders || []);
      if (r.data?.reminders?.[0]) setReminderType(r.data.reminders[0].value);
    }).catch(() => {});
    loadHistory();
  }, []);

  const loadHistory = () => {
    broadcastAPI.history().then((r) => setHistory(r.data || [])).catch(() => {});
  };

  // ── Load recipients whenever the segment changes ──────────────────────────
  const loadRecipients = (seg: string) => {
    setLoadingRecips(true);
    broadcastAPI.recipients(seg)
      .then((r) => {
        const rows: Recipient[] = r.data?.recipients || [];
        setRecipients(rows);
        setTotal(r.data?.total ?? rows.length);
        setTruncated(!!r.data?.truncated);
        setSelected(new Set(rows.map((x) => x.id))); // default: everyone selected
      })
      .catch(() => { setRecipients([]); setSelected(new Set()); push('Could not load recipients', 'error'); })
      .finally(() => setLoadingRecips(false));
  };

  useEffect(() => { loadRecipients(segment); /* eslint-disable-next-line */ }, [segment]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => r.username.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [recipients, search]);

  const visibleIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggle = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectAllVisible = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    return next;
  });

  const reminderLabel = reminders.find((r) => r.value === reminderType)?.label || reminderType;

  // ── Send ──────────────────────────────────────────────────────────────────
  const canSend = selected.size > 0 && (mode === 'reminder' || (subject.trim() && body.trim()));

  const send = async () => {
    const ids = Array.from(selected);
    if (!ids.length) { push('Select at least one recipient', 'error'); return; }
    const what = mode === 'custom' ? `"${subject.trim()}"` : `the "${reminderLabel}" reminder`;
    if (!window.confirm(`Send ${what} to ${ids.length} recipient${ids.length === 1 ? '' : 's'}? This emails real users.`)) return;

    setSending(true);
    try {
      await broadcastAPI.send({
        kind: mode, user_ids: ids, segment,
        ...(mode === 'custom'
          ? { subject: subject.trim(), heading: heading.trim(), body: body.trim(), cta_label: ctaLabel.trim(), cta_url: ctaUrl.trim() }
          : { reminder_type: reminderType }),
      });
      push(`Queued for ${ids.length} recipient${ids.length === 1 ? '' : 's'}`, 'success');
      if (mode === 'custom') { setSubject(''); setHeading(''); setBody(''); setCtaLabel(''); setCtaUrl(''); }
      setTimeout(loadHistory, 1200);
    } catch (e) {
      push(parseApiError(e) || 'Send failed', 'error');
    } finally { setSending(false); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
      <PageHeader
        eyebrow="Outreach"
        title="Broadcast"
        description="Send a one-off message or a reminder to a chosen, editable set of users."
        actions={
          <Button size="sm" variant="secondary" leadingIcon={<RefreshCcw className="size-3.5" />}
                  onClick={() => { loadRecipients(segment); loadHistory(); }}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ── Composer ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader icon={<Megaphone />} title="Message" />
          <CardBody className="space-y-4">
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-sunk/60 border border-hairline">
              {([['custom', 'Compose', Mail], ['reminder', 'Reminder', BellRing]] as const).map(([m, label, Icon]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn('flex items-center justify-center gap-1.5 h-9 rounded-md text-[12.5px] font-medium transition-colors',
                    mode === m ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}>
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>

            {mode === 'custom' ? (
              <>
                <Field label="Subject" required>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. New trading venues are live" maxLength={200} />
                </Field>
                <Field label="Heading" hint="optional — shown big at the top of the email">
                  <Input value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Defaults to the subject" maxLength={200} />
                </Field>
                <Field label="Message" required hint={`${body.length} chars`}>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7}
                            placeholder="Write your message… line breaks are preserved." />
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Button label" hint="optional">
                    <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Open dashboard" maxLength={80} />
                  </Field>
                  <Field label="Button link" hint="optional">
                    <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://…" maxLength={300} />
                  </Field>
                </div>
              </>
            ) : (
              <Field label="Reminder template">
                <div className="space-y-2">
                  {reminders.map((r) => {
                    const active = r.value === reminderType;
                    return (
                      <button key={r.value} type="button" onClick={() => setReminderType(r.value)}
                        className={cn('w-full text-left p-3 rounded-lg border transition-colors',
                          active ? 'border-accent bg-accent-soft/40' : 'border-border hover:border-border-strong')}>
                        <div className="flex items-center gap-2">
                          <span className={cn('size-4 rounded-full border-2 shrink-0', active ? 'border-accent bg-accent' : 'border-border')} />
                          <span className="text-[13.5px] font-semibold text-fg">{r.label}</span>
                        </div>
                        <p className="text-[12px] text-fg-muted mt-1 ml-6">{r.description}</p>
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          </CardBody>
        </Card>

        {/* ── Recipients ───────────────────────────────────────────── */}
        <Card>
          <CardHeader
            icon={<Users />}
            title="Recipients"
            action={
              <span className="text-[12px] text-fg-muted tabular">
                <b className="text-fg">{selected.size}</b> of {recipients.length} selected
              </span>
            }
          />
          <CardBody className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Audience">
                <Select value={segment} onChange={(e) => setSegment(e.target.value)}>
                  {segments.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
              <Field label="Filter list">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name or email"
                       leadingIcon={<Search className="size-3.5" />} />
              </Field>
            </div>

            <div className="flex items-center justify-between text-[12px]">
              <button onClick={selectAllVisible} className="text-accent hover:underline font-medium">
                {allVisibleSelected ? 'Deselect all' : 'Select all'}{search ? ' (filtered)' : ''}
              </button>
              {truncated && (
                <span className="inline-flex items-center gap-1 text-warning">
                  <AlertCircle className="size-3.5" /> showing first {recipients.length} of {total}
                </span>
              )}
            </div>

            <div className="rounded-lg border border-hairline divide-y divide-hairline max-h-[360px] overflow-y-auto">
              {loadingRecips ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 skeleton" />)
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-[13px] text-fg-muted">No users match this audience.</div>
              ) : (
                filtered.map((r) => {
                  const on = selected.has(r.id);
                  return (
                    <button key={r.id} type="button" onClick={() => toggle(r.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2/60 transition-colors">
                      <span className={cn('grid place-items-center size-4 rounded border shrink-0',
                        on ? 'bg-accent border-accent text-accent-fg' : 'border-border-strong')}>
                        {on && <CheckCircle2 className="size-3.5" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium text-fg truncate">{r.username}</span>
                        <span className="block text-[11.5px] text-fg-muted truncate">{r.email}</span>
                      </span>
                      <span className="text-[11px] text-fg-subtle tabular shrink-0">{formatMoney(r.balance)}</span>
                    </button>
                  );
                })
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Send bar ───────────────────────────────────────────────── */}
      <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-surface/90 backdrop-blur px-4 py-3">
        <div className="text-[12.5px] text-fg-muted">
          {mode === 'custom'
            ? <>Compose · <b className="text-fg">{selected.size}</b> recipient{selected.size === 1 ? '' : 's'}</>
            : <>Reminder “{reminderLabel}” · <b className="text-fg">{selected.size}</b> recipient{selected.size === 1 ? '' : 's'}</>}
        </div>
        <Button onClick={send} loading={sending} disabled={!canSend} leadingIcon={<Send className="size-4" />}>
          Send to {selected.size}
        </Button>
      </div>

      {/* ── History ────────────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader icon={<MailCheck />} title="Recent broadcasts" />
        <CardBody className="p-0">
          {history.length === 0 ? (
            <EmptyState icon={Send} title="No broadcasts yet"
                        description="Reminders and messages you send will be logged here." />
          ) : (
            <div className="divide-y divide-hairline">
              {history.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn('grid place-items-center size-8 rounded-lg shrink-0',
                    b.kind === 'reminder' ? 'bg-accent-soft text-accent-fg' : 'bg-surface-sunk text-fg-muted')}>
                    {b.kind === 'reminder' ? <BellRing className="size-4" /> : <Mail className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-fg truncate">
                      {b.subject || b.reminder_type || b.kind}
                    </div>
                    <div className="text-[11.5px] text-fg-muted truncate">
                      {b.segment || '—'} · {b.created_by || 'admin'} · {b.created_at ? relativeTime(b.created_at) : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12.5px] font-semibold text-fg tabular">
                      {b.sent_count}/{b.recipient_count} sent{b.failed_count ? ` · ${b.failed_count} failed` : ''}
                    </div>
                    <StatusChip status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    done:    { cls: 'text-success', icon: <CheckCircle2 className="size-3" /> },
    sending: { cls: 'text-accent',  icon: <Clock className="size-3 animate-pulse" /> },
    queued:  { cls: 'text-fg-muted', icon: <Clock className="size-3" /> },
    failed:  { cls: 'text-danger',  icon: <AlertCircle className="size-3" /> },
  };
  const s = map[status] || map.queued;
  return <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium justify-end', s.cls)}>{s.icon}{status}</span>;
}
