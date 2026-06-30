'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, RefreshCcw, Power, ShieldCheck } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/PageHeader';
import { coreAPI } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import { FiatOnramps } from '@/components/settings/FiatOnramps';

export default function SettingsPage() {
  const [draft, setDraft] = useState<any | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    coreAPI.settings().then((r) => setDraft(r.data)).catch(() => {});
  }, []);

  const update = (k: string, v: any) => { setDraft((d: any) => ({ ...d, [k]: v })); setDirty(true); };

  const save = async () => {
    setBusy(true);
    try {
      await coreAPI.updateSettings(draft);
      push('Settings saved', 'success');
      setDirty(false);
    } catch (e) { push('Save failed', 'error'); }
    setBusy(false);
  };

  if (!draft) return <div className="p-8"><div className="skeleton h-32" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-[900px] mx-auto">
      <PageHeader
        eyebrow="Configure"
        title="System settings"
        description="Runtime-mutable platform knobs. Changes are cached for 5 minutes."
        actions={
          <>
            {dirty && <span className="text-[11.5px] text-warning font-semibold">unsaved</span>}
            <Button onClick={save} loading={busy} disabled={!dirty} leadingIcon={<Save className="size-3.5" />}>Save</Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardHeader title="Branding & support" icon={<Settings className="size-4" />} />
        <CardBody className="grid sm:grid-cols-2 gap-3">
          <Field label="Site name"><Input value={draft.site_name || ''} onChange={(e) => update('site_name', e.target.value)} /></Field>
          <Field label="Support email"><Input type="email" value={draft.support_email || ''} onChange={(e) => update('support_email', e.target.value)} /></Field>
          <Field label="Featured currency"><Input value={draft.featured_currency || ''} onChange={(e) => update('featured_currency', e.target.value)} /></Field>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Feature flags" icon={<Power className="size-4" />} />
        <CardBody className="space-y-2.5">
          {([
            ['deposits_enabled',                'Deposits',                'Users can credit their account'],
            ['withdrawals_enabled',             'Withdrawals',             'Users can cash out earnings'],
            ['new_signups_enabled',             'New signups',             'Open registration'],
            ['ambassador_applications_enabled', 'Ambassador applications', 'Founding partner applications accepted'],
            ['maintenance_mode',                'Maintenance mode',        'Locks non-admin endpoints with a 503'],
          ] as const).map(([k, label, desc]) => (
            <Toggle key={k} label={label} description={desc} value={!!draft[k]} onChange={(v) => update(k, v)} />
          ))}
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Limits" icon={<ShieldCheck className="size-4" />} />
        <CardBody className="grid sm:grid-cols-2 gap-3">
          <Field label="Min deposit (USD)"><Input type="number" step="0.01" value={draft.min_deposit_usd} onChange={(e) => update('min_deposit_usd', +e.target.value)} /></Field>
          <Field label="Min withdraw (USD)"><Input type="number" step="0.01" value={draft.min_withdraw_usd} onChange={(e) => update('min_withdraw_usd', +e.target.value)} /></Field>
          <Field label="Max withdraw (USD)" hint="0 = no maximum"><Input type="number" step="0.01" value={draft.max_withdraw_usd} onChange={(e) => update('max_withdraw_usd', +e.target.value)} /></Field>
          <div />
          <Field label="Withdraw fee (%)" hint="percentage of each withdrawal"><Input type="number" step="0.01" value={draft.withdraw_fee_percent} onChange={(e) => update('withdraw_fee_percent', +e.target.value)} /></Field>
          <Field label="Withdraw fee (flat USD)" hint="fixed fee per withdrawal"><Input type="number" step="0.01" value={draft.withdraw_fee_flat_usd} onChange={(e) => update('withdraw_fee_flat_usd', +e.target.value)} /></Field>
        </CardBody>
        <CardBody className="border-t border-hairline grid sm:grid-cols-2 gap-3">
          <Toggle label="Fortnightly withdrawal window" description="Only allow withdrawal requests on the 1st & 16th (admins bypass)." value={!!draft.withdrawal_window_enabled} onChange={(v) => update('withdrawal_window_enabled', v)} />
          <Field label="Window length (days)" hint="days the window stays open from the 1st / 16th"><Input type="number" min="1" max="14" value={draft.withdrawal_window_days ?? 3} onChange={(e) => update('withdrawal_window_days', +e.target.value)} /></Field>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Earnings engine" description="Daily yield band used by the Celery task." icon={<RefreshCcw className="size-4" />} />
        <CardBody className="grid sm:grid-cols-2 gap-3">
          <Field label="Daily min (%)" hint="lower bound of the band"><Input type="number" step="0.01" value={draft.earnings_daily_min_percent} onChange={(e) => update('earnings_daily_min_percent', +e.target.value)} /></Field>
          <Field label="Daily max (%)" hint="upper bound of the band"><Input type="number" step="0.01" value={draft.earnings_daily_max_percent} onChange={(e) => update('earnings_daily_max_percent', +e.target.value)} /></Field>
        </CardBody>
      </Card>

      <FiatOnramps />

      <Card>
        <CardHeader title="Announcement banner" description="Shown at the top of the user dashboard when set." />
        <CardBody>
          <Textarea rows={3} value={draft.announcement_banner || ''} onChange={(e) => update('announcement_banner', e.target.value)} />
        </CardBody>
      </Card>
    </div>
  );
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5 hover:border-border-strong text-left transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-fg">{label}</div>
        <div className="text-[11.5px] text-fg-muted">{description}</div>
      </div>
      <span className={cn('relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0', value ? 'bg-accent' : 'bg-border')}>
        <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform', value ? 'translate-x-4' : 'translate-x-0.5')} />
      </span>
    </button>
  );
}
