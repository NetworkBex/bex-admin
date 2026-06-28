'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Save, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/Toast';
import { onrampAPI, parseApiError } from '@/lib/api';

type Provider = {
  key: string; label: string; enabled: boolean; is_live: boolean;
  environment: string; public_key: string;
  secret_key_set: boolean; secret_key_preview: string; webhook_secret_set: boolean;
  crypto_currency: string; destination_address: string; min_amount_usd: number;
  webhook_url: string;
};

export function FiatOnramps() {
  const { push } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);

  const load = () => onrampAPI.list().then((r) => setProviders(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <Card className="mb-4">
      <CardHeader
        title="Fiat on-ramps (Card / Bank)"
        icon={<CreditCard className="size-4" />}
        description="Add a provider's keys and activate it to make 'Pay with Card or Bank Transfer' a live deposit option. Until then it stays 'Coming soon'."
      />
      <CardBody className="space-y-3">
        {providers.map((p) => (
          <ProviderRow key={p.key} provider={p} onSaved={(np) => { setProviders((xs) => xs.map((x) => x.key === np.key ? np : x)); push(`${np.label} saved`, 'success'); }} onError={(m) => push(m, 'error')} />
        ))}
        {providers.length === 0 && <div className="text-[13px] text-fg-muted">Loading providers…</div>}
      </CardBody>
    </Card>
  );
}

function ProviderRow({ provider, onSaved, onError }: { provider: Provider; onSaved: (p: Provider) => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    environment: provider.environment,
    public_key: provider.public_key,
    secret_key: '',
    webhook_secret: '',
    crypto_currency: provider.crypto_currency,
    destination_address: provider.destination_address,
    min_amount_usd: String(provider.min_amount_usd),
    enabled: provider.enabled,
  });

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const save = async (overrideEnabled?: boolean) => {
    setBusy(true);
    try {
      const body: any = {
        key: provider.key,
        environment: f.environment,
        public_key: f.public_key.trim(),
        crypto_currency: f.crypto_currency.trim(),
        destination_address: f.destination_address.trim(),
        min_amount_usd: f.min_amount_usd,
        enabled: overrideEnabled !== undefined ? overrideEnabled : f.enabled,
      };
      if (f.secret_key.trim()) body.secret_key = f.secret_key.trim();
      if (f.webhook_secret.trim()) body.webhook_secret = f.webhook_secret.trim();
      const r = await onrampAPI.save(body);
      setF((p) => ({ ...p, secret_key: '', webhook_secret: '', enabled: r.data.enabled }));
      onSaved(r.data);
    } catch (e) {
      onError(parseApiError(e) || 'Could not save');
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-border bg-surface-sunk/40">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="grid place-items-center size-9 rounded-lg bg-surface-2 text-accent shrink-0"><CreditCard className="size-4" /></span>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-fg">{provider.label}</div>
          <div className="text-[11.5px] text-fg-muted">{provider.environment} · {provider.public_key ? 'key set' : 'no key'}</div>
        </div>
        {provider.is_live ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success"><CheckCircle2 className="size-3.5" /> Active</span>
        ) : provider.public_key ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning"><AlertCircle className="size-3.5" /> Configured</span>
        ) : (
          <span className="text-[11px] text-fg-subtle">Not set up</span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-hairline">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Environment">
              <Select value={f.environment} onChange={(e) => set('environment', e.target.value)}>
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </Select>
            </Field>
            <Field label="Min deposit (USD)">
              <Input type="number" value={f.min_amount_usd} onChange={(e) => set('min_amount_usd', e.target.value)} />
            </Field>
          </div>
          <Field label="Publishable / API key" hint="safe to expose to the browser">
            <Input value={f.public_key} onChange={(e) => set('public_key', e.target.value)} placeholder={provider.key === 'ramp' ? 'hostApiKey' : provider.key === 'transak' ? 'apiKey' : 'pk_live_…'} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Secret key" hint={provider.secret_key_set ? `saved ${provider.secret_key_preview}` : (provider.key === 'moonpay' ? 'required for MoonPay' : 'optional')}>
              <Input type="password" value={f.secret_key} onChange={(e) => set('secret_key', e.target.value)} placeholder={provider.secret_key_set ? '•••• leave blank to keep' : 'sk_live_…'} />
            </Field>
            <Field label="Webhook secret" hint={provider.webhook_secret_set ? 'saved' : 'optional'}>
              <Input type="password" value={f.webhook_secret} onChange={(e) => set('webhook_secret', e.target.value)} placeholder={provider.webhook_secret_set ? '•••• leave blank to keep' : 'webhook signing key'} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Crypto delivered" hint="provider's code">
              <Input value={f.crypto_currency} onChange={(e) => set('crypto_currency', e.target.value)} placeholder={provider.key === 'ramp' ? 'ETH_USDC' : 'usdc'} />
            </Field>
            <Field label="Destination address" hint="platform wallet that receives the crypto">
              <Input value={f.destination_address} onChange={(e) => set('destination_address', e.target.value)} placeholder="0x…" />
            </Field>
          </div>
          <Field label="Webhook URL" hint="paste this into the provider dashboard">
            <div className="flex items-center gap-2">
              <Input readOnly value={provider.webhook_url} className="font-mono text-[11px]" />
              <Button size="sm" variant="secondary" leadingIcon={<Copy className="size-3.5" />} onClick={() => { navigator.clipboard.writeText(provider.webhook_url); }}>Copy</Button>
            </div>
          </Field>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button size="sm" variant="secondary" loading={busy} leadingIcon={<Save className="size-3.5" />} onClick={() => save()}>Save</Button>
            {provider.is_live ? (
              <Button size="sm" variant="ghost" loading={busy} onClick={() => save(false)}>Deactivate</Button>
            ) : (
              <Button size="sm" loading={busy} onClick={() => save(true)}>Save & activate</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
