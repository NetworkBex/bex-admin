'use client';

import { useEffect, useState } from 'react';
import {
  Award, Crown, Sparkles, Save, RefreshCcw, Check, AlertCircle, Lock, Zap,
  CircleDollarSign, Users, Plus, Trash2, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Field, Textarea, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/PageHeader';
import { planAPI } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { formatMoney, cn } from '@/lib/utils';

type Plan = {
  tokenTicker: string;
  managementFeePercent: number;
  partnerPoolSharePercent: number;
  maxLegContributionPercent: number;
  activeInvestorMinUsd: number;
  fastStartWindowDays: number;
  lrpFundingPercent: number;
  payoutCadence: string;
  ranks: any[];
  unilevel: any[];
  fastStart: any[];
  matching: any[];
  rankBonuses: any[];
  milestones: any[];
  lrpAllocation: any[];
  founding: any;
  compliance: string[];
};

export default function PlanEditorPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    planAPI.adminGet().then((r) => { setPlan(r.data); setDraft(r.data); });
  }, []);

  // `update` takes a single mutator callback that mutates the draft in place.
  // The structuredClone + spread on `setDraft` would otherwise be a no-op for
  // in-place mutations; we hand the mutator a fresh clone to mutate.
  const update = (mutator: (p: Plan) => void) => {
    setDraft((d) => {
      if (!d) return d;
      const next = structuredClone(d);
      mutator(next);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const res = await planAPI.adminUpdate(draft);
      setPlan(res.data); setDraft(res.data); setDirty(false);
      push('Compensation plan saved', 'success');
    } catch (e) {
      push('Save failed', 'error');
    }
    setBusy(false);
  };

  const reset = () => { setDraft(plan); setDirty(false); };

  if (!draft) {
    return <div className="p-8"><div className="skeleton h-32" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto">
      <PageHeader
        eyebrow="Operate"
        title="Ambassador compensation plan"
        description="The single source of truth that drives the affiliate UI. Edits are audited."
        actions={
          <>
            {dirty && <Badge tone="warning" dot>unsaved changes</Badge>}
            <Button size="sm" variant="secondary" onClick={reset} disabled={!dirty || busy} leadingIcon={<RefreshCcw className="size-3.5" />}>
              Revert
            </Button>
            <Button size="sm" onClick={save} loading={busy} disabled={!dirty} leadingIcon={<Save className="size-3.5" />}>
              Save plan
            </Button>
          </>
        }
      />

      {/* ─── Token & economics ───────────────────────────────────── */}
      <Card className="mb-4">
        <CardHeader title="Token & economics" icon={<Sparkles className="size-4" />} />
        <CardBody className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Token ticker">
            <Input value={draft.tokenTicker} onChange={(e) => update((p) => { p.tokenTicker = e.target.value; })} />
          </Field>
          <Field label="Management fee (%)" hint="of net trading profits">
            <Input type="number" step="0.1" value={draft.managementFeePercent} onChange={(e) => update((p) => { p.managementFeePercent = +e.target.value; })} />
          </Field>
          <Field label="Partner pool share (%)" hint="of mgmt fee">
            <Input type="number" step="0.1" value={draft.partnerPoolSharePercent} onChange={(e) => update((p) => { p.partnerPoolSharePercent = +e.target.value; })} />
          </Field>
          <Field label="Max leg contribution (%)" hint="single-leg cap">
            <Input type="number" step="0.1" value={draft.maxLegContributionPercent} onChange={(e) => update((p) => { p.maxLegContributionPercent = +e.target.value; })} />
          </Field>
          <Field label="Active investor minimum ($)">
            <Input type="number" step="10" value={draft.activeInvestorMinUsd} onChange={(e) => update((p) => { p.activeInvestorMinUsd = +e.target.value; })} />
          </Field>
          <Field label="Fast-Start window (days)">
            <Input type="number" value={draft.fastStartWindowDays} onChange={(e) => update((p) => { p.fastStartWindowDays = +e.target.value; })} />
          </Field>
          <Field label="LRP funding (% of fee)">
            <Input type="number" step="0.1" value={draft.lrpFundingPercent} onChange={(e) => update((p) => { p.lrpFundingPercent = +e.target.value; })} />
          </Field>
          <Field label="Payout cadence">
            <Input value={draft.payoutCadence} onChange={(e) => update((p) => { p.payoutCadence = e.target.value; })} />
          </Field>
        </CardBody>
      </Card>

      {/* ─── Ranks ──────────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardHeader title="Ranks" description="Edit thresholds, ornaments, level unlocks, LRP tier." icon={<Award className="size-4" />} />
        <CardBody className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                  <th className="text-left px-4 py-2">Key</th>
                  <th className="text-left px-2 py-2">Title</th>
                  <th className="text-right px-2 py-2">Directs</th>
                  <th className="text-right px-2 py-2">Team vol</th>
                  <th className="text-right px-2 py-2">Personal invest</th>
                  <th className="text-right px-2 py-2">Levels</th>
                  <th className="text-right px-2 py-2">LRP tier</th>
                </tr>
              </thead>
              <tbody>
                {draft.ranks.map((r, i) => (
                  <tr key={r.key} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-1.5 font-mono text-[11.5px] text-fg-muted">{r.key}</td>
                    <td className="px-2 py-1.5">
                      <Input className="h-7 text-xs" value={r.title} onChange={(e) => update((p) => { p.ranks[i].title = e.target.value; })} />
                    </td>
                    <td className="px-2 py-1.5 w-24">
                      <Input className="h-7 text-xs text-right" type="number" value={r.directRequired} onChange={(e) => update((p) => { p.ranks[i].directRequired = +e.target.value; })} />
                    </td>
                    <td className="px-2 py-1.5 w-32">
                      <Input className="h-7 text-xs text-right" type="number" value={r.teamVolumeUsd} onChange={(e) => update((p) => { p.ranks[i].teamVolumeUsd = +e.target.value; })} />
                    </td>
                    <td className="px-2 py-1.5 w-32">
                      <Input className="h-7 text-xs text-right" type="number" value={r.personalInvestUsd} onChange={(e) => update((p) => { p.ranks[i].personalInvestUsd = +e.target.value; })} />
                    </td>
                    <td className="px-2 py-1.5 w-20">
                      <Input className="h-7 text-xs text-right" type="number" value={r.unlockedLevels} onChange={(e) => update((p) => { p.ranks[i].unlockedLevels = +e.target.value; })} />
                    </td>
                    <td className="px-2 py-1.5 w-24">
                      <Input className="h-7 text-xs text-right" type="number" value={r.lrpTier} onChange={(e) => update((p) => { p.ranks[i].lrpTier = +e.target.value; })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* ─── Unilevel ──────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardHeader title="Unilevel levels" description="7-level deep commission structure." icon={<ArrowDown className="size-4" />} />
        <CardBody className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                  <th className="text-left px-4 py-2">Level</th>
                  <th className="text-left px-2 py-2">Relationship</th>
                  <th className="text-right px-2 py-2">Rate (% of pool)</th>
                  <th className="text-left px-2 py-2">Unlocks at rank</th>
                </tr>
              </thead>
              <tbody>
                {draft.unilevel.map((u, i) => (
                  <tr key={u.level} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-1.5 font-mono text-[11.5px] text-fg-muted">L{u.level}</td>
                    <td className="px-2 py-1.5"><Input className="h-7 text-xs" value={u.relationship} onChange={(e) => update((p) => { p.unilevel[i].relationship = e.target.value; })} /></td>
                    <td className="px-2 py-1.5 w-32"><Input className="h-7 text-xs text-right" type="number" step="0.1" value={u.rate} onChange={(e) => update((p) => { p.unilevel[i].rate = +e.target.value; })} /></td>
                    <td className="px-2 py-1.5 w-40"><Input className="h-7 text-xs font-mono" value={u.unlockRank} onChange={(e) => update((p) => { p.unilevel[i].unlockRank = e.target.value; })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* ─── Fast-Start ────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardHeader title="Fast-Start bonuses" description="Cash + token bonus tiers for early direct sponsors." icon={<Zap className="size-4" />} />
        <CardBody className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                  <th className="text-left px-4 py-2">ID</th>
                  <th className="text-right px-2 py-2">Window (d)</th>
                  <th className="text-right px-2 py-2">Directs</th>
                  <th className="text-right px-2 py-2">Min/direct</th>
                  <th className="text-right px-2 py-2">Cash bonus</th>
                  <th className="text-right px-2 py-2">Token bonus</th>
                </tr>
              </thead>
              <tbody>
                {draft.fastStart.map((f, i) => (
                  <tr key={f.id} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-1.5 font-mono text-[11.5px] text-fg-muted">{f.id}</td>
                    <td className="px-2 py-1.5 w-24"><Input className="h-7 text-xs text-right" type="number" value={f.windowDays} onChange={(e) => update((p) => { p.fastStart[i].windowDays = +e.target.value; })} /></td>
                    <td className="px-2 py-1.5 w-24"><Input className="h-7 text-xs text-right" type="number" value={f.directRequired} onChange={(e) => update((p) => { p.fastStart[i].directRequired = +e.target.value; })} /></td>
                    <td className="px-2 py-1.5 w-32"><Input className="h-7 text-xs text-right" type="number" value={f.minimumPerDirectUsd} onChange={(e) => update((p) => { p.fastStart[i].minimumPerDirectUsd = +e.target.value; })} /></td>
                    <td className="px-2 py-1.5 w-32"><Input className="h-7 text-xs text-right" type="number" value={f.cashBonusUsd} onChange={(e) => update((p) => { p.fastStart[i].cashBonusUsd = +e.target.value; })} /></td>
                    <td className="px-2 py-1.5 w-32"><Input className="h-7 text-xs text-right" type="number" value={f.tokenBonus} onChange={(e) => update((p) => { p.fastStart[i].tokenBonus = +e.target.value; })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* ─── Matching bonus + Rank bonuses ─────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader title="Matching bonuses" description="% match on L1 partner residuals." icon={<ArrowUp className="size-4" />} />
          <CardBody className="px-0 pb-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-hairline text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                <th className="text-left px-4 py-2">From rank</th>
                <th className="text-right px-4 py-2">Match %</th>
              </tr></thead>
              <tbody>
                {draft.matching.map((m, i) => (
                  <tr key={m.fromRank} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-1.5"><Input className="h-7 text-xs font-mono" value={m.fromRank} onChange={(e) => update((p) => { p.matching[i].fromRank = e.target.value; })} /></td>
                    <td className="px-4 py-1.5 w-32"><Input className="h-7 text-xs text-right" type="number" value={m.matchPercent} onChange={(e) => update((p) => { p.matching[i].matchPercent = +e.target.value; })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Rank bonuses" description="Monthly cash + $BEX per rank." icon={<CircleDollarSign className="size-4" />} />
          <CardBody className="px-0 pb-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-hairline text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                <th className="text-left px-4 py-2">Rank</th>
                <th className="text-right px-2 py-2">Cash</th>
                <th className="text-right px-4 py-2">$BEX</th>
              </tr></thead>
              <tbody>
                {draft.rankBonuses.map((b, i) => (
                  <tr key={b.rank} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-1.5"><Input className="h-7 text-xs font-mono" value={b.rank} onChange={(e) => update((p) => { p.rankBonuses[i].rank = e.target.value; })} /></td>
                    <td className="px-2 py-1.5 w-32"><Input className="h-7 text-xs text-right" type="number" value={b.cashUsd} onChange={(e) => update((p) => { p.rankBonuses[i].cashUsd = +e.target.value; })} /></td>
                    <td className="px-2 py-1.5 w-32"><Input className="h-7 text-xs text-right" type="number" value={b.tokenBex} onChange={(e) => update((p) => { p.rankBonuses[i].tokenBex = +e.target.value; })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      {/* ─── Milestones + LRP + Founding ───────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader title="Milestone gifts" description="Lifestyle gifts awarded at each rank." icon={<Crown className="size-4" />} />
          <CardBody className="px-0 pb-0">
            <ul className="divide-y divide-hairline">
              {draft.milestones.map((m, i) => (
                <li key={m.rank} className="px-4 py-2.5 space-y-1.5">
                  <div className="grid grid-cols-[1fr_120px] gap-2">
                    <Input className="h-7 text-xs font-mono" value={m.rank} onChange={(e) => update((p) => { p.milestones[i].rank = e.target.value; })} />
                    <Input className="h-7 text-xs text-right" type="number" value={m.valueUsd} onChange={(e) => update((p) => { p.milestones[i].valueUsd = +e.target.value; })} />
                  </div>
                  <Textarea className="text-xs" value={m.description} onChange={(e) => update((p) => { p.milestones[i].description = e.target.value; })} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="LRP allocation" description="Leadership Revenue Pool share per tier." icon={<Users className="size-4" />} />
          <CardBody className="px-0 pb-0">
            <ul className="divide-y divide-hairline">
              {draft.lrpAllocation.map((l, i) => (
                <li key={l.rank + l.tier} className="px-4 py-2.5 grid grid-cols-[1fr_80px_80px] gap-2 items-center">
                  <Input className="h-7 text-xs font-mono" value={l.rank} onChange={(e) => update((p) => { p.lrpAllocation[i].rank = e.target.value; })} />
                  <Input className="h-7 text-xs text-right" type="number" value={l.tier} onChange={(e) => update((p) => { p.lrpAllocation[i].tier = +e.target.value; })} />
                  <Input className="h-7 text-xs text-right" type="number" value={l.allocationPercent} onChange={(e) => update((p) => { p.lrpAllocation[i].allocationPercent = +e.target.value; })} />
                </li>
              ))}
            </ul>

            <div className="border-t border-hairline p-4 space-y-3">
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold">Founding Partner programme</div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Slots"><Input type="number" value={draft.founding.slotsTotal} onChange={(e) => update((p) => { p.founding.slotsTotal = +e.target.value; })} /></Field>
                <Field label="L1 boost %"><Input type="number" step="0.1" value={draft.founding.l1CommissionRateBoost} onChange={(e) => update((p) => { p.founding.l1CommissionRateBoost = +e.target.value; })} /></Field>
                <Field label="Pre-launch $/BEX"><Input type="number" step="0.001" value={draft.founding.preLaunchTokenPrice} onChange={(e) => update((p) => { p.founding.preLaunchTokenPrice = +e.target.value; })} /></Field>
                <Field label="TGE $/BEX"><Input type="number" step="0.001" value={draft.founding.tgePrice} onChange={(e) => update((p) => { p.founding.tgePrice = +e.target.value; })} /></Field>
                <Field label="Rate lock (months)"><Input type="number" value={draft.founding.rateLockMonths} onChange={(e) => update((p) => { p.founding.rateLockMonths = +e.target.value; })} /></Field>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ─── Compliance ────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Compliance" description="One bullet per line. Shown in the affiliate UI." icon={<Lock className="size-4" />} />
        <CardBody>
          <Textarea
            rows={8}
            value={draft.compliance.join('\n')}
            onChange={(e) => update((p) => { p.compliance = e.target.value.split('\n'); })}
          />
        </CardBody>
      </Card>
    </div>
  );
}
