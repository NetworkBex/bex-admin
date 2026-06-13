'use client';

import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/PageHeader';
import { BookOpen, Server, Globe2, ShieldCheck, Zap, Database } from 'lucide-react';

const ENDPOINTS: { group: string; rows: { method: string; path: string; auth: string; desc: string }[] }[] = [
  {
    group: 'Auth',
    rows: [
      { method: 'POST', path: '/api/auth/login/',    auth: 'public',   desc: 'Authenticate user OR admin. Returns tokens + is_admin flag.' },
      { method: 'POST', path: '/api/auth/register/', auth: 'public',   desc: 'Create a customer account.' },
      { method: 'GET',  path: '/api/auth/me/',       auth: 'user|admin', desc: 'Return the current user/admin payload.' },
    ],
  },
  {
    group: 'Customer admin',
    rows: [
      { method: 'GET',    path: '/api/auth/customers/',                auth: 'user (own)', desc: 'List customers. Admin sees all.' },
      { method: 'POST',   path: '/api/auth/customers/{id}/suspend/',    auth: 'user (own)', desc: 'Suspend account (status=2).' },
      { method: 'POST',   path: '/api/auth/customers/{id}/activate/',   auth: 'user (own)', desc: 'Activate account (status=1).' },
      { method: 'POST',   path: '/api/auth/customers/{id}/adjust_balance/', auth: 'user (own)', desc: 'Credit or debit the account balance.' },
      { method: 'PATCH',  path: '/api/auth/customers/{id}/update_profile/', auth: 'user (own)', desc: 'Update profile fields.' },
      { method: 'POST',   path: '/api/auth/customers/change_password/', auth: 'user', desc: 'Change own password.' },
    ],
  },
  {
    group: 'Transactions',
    rows: [
      { method: 'GET',  path: '/api/transactions/',                  auth: 'user|admin', desc: 'List transactions; admin sees all.' },
      { method: 'POST', path: '/api/transactions/{id}/approve/',     auth: 'user (own)', desc: 'Approve a pending deposit or withdrawal.' },
      { method: 'POST', path: '/api/transactions/{id}/cancel/',      auth: 'user (own)', desc: 'Cancel a pending transaction.' },
      { method: 'POST', path: '/api/transactions/upload_proof/',     auth: 'user (own)', desc: 'Upload payment proof for a pending transaction.' },
    ],
  },
  {
    group: 'Investments',
    rows: [
      { method: 'GET',  path: '/api/investments/',                    auth: 'user|admin', desc: 'List investments.' },
      { method: 'POST', path: '/api/investments/invest/',              auth: 'user',        desc: 'Start a new cycle.' },
      { method: 'POST', path: '/api/investments/{id}/cashout/',        auth: 'user (own)', desc: 'Cash out a completed cycle.' },
      { method: 'POST', path: '/api/investments/{id}/cancel/',         auth: 'user (own)', desc: 'Cancel a cycle before it starts.' },
    ],
  },
  {
    group: 'Earnings',
    rows: [
      { method: 'GET', path: '/api/earnings/',            auth: 'user (own)', desc: 'Daily-yield credit ledger.' },
      { method: 'GET', path: '/api/earnings/summary/',    auth: 'user (own)', desc: 'Aggregated 30-day series + lifetime totals.' },
      { method: 'GET', path: '/api/earnings/runs/',       auth: 'admin',      desc: 'Audit trail of scheduler runs.' },
    ],
  },
  {
    group: 'Affiliates',
    rows: [
      { method: 'GET',  path: '/api/affiliate/plan/',                          auth: 'public',         desc: 'Published compensation plan.' },
      { method: 'GET',  path: '/api/affiliate/me/',                           auth: 'user',           desc: 'Live position within the plan.' },
      { method: 'GET',  path: '/api/affiliate/earnings/',                     auth: 'user (own)',     desc: 'Breakdown by source.' },
      { method: 'GET',  path: '/api/affiliate/commissions/',                  auth: 'user (own)',     desc: 'Paginated commission ledger.' },
      { method: 'GET',  path: '/api/affiliate/team/',                          auth: 'user (own)',     desc: 'Downline grouped by level.' },
      { method: 'GET',  path: '/api/affiliate/admin/plan/',                    auth: 'admin',          desc: 'Plan editor (read).' },
      { method: 'PUT',  path: '/api/affiliate/admin/plan/',                    auth: 'admin',          desc: 'Plan editor (write). Audited.' },
      { method: 'GET',  path: '/api/affiliate/admin/applications/',            auth: 'admin',          desc: 'Founding applications list.' },
      { method: 'POST', path: '/api/affiliate/admin/applications/{id}/decide/', auth: 'admin',          desc: 'Approve / reject an application.' },
    ],
  },
  {
    group: 'Core',
    rows: [
      { method: 'GET',    path: '/api/core/currencies/',     auth: 'public',  desc: 'Deposit currencies.' },
      { method: 'GET',    path: '/api/core/invest-plans/',   auth: 'public',  desc: 'Active invest plans.' },
      { method: 'GET',    path: '/api/core/testimonies/',    auth: 'public',  desc: 'Marketing testimonies.' },
      { method: 'GET',    path: '/api/core/blog/',           auth: 'public',  desc: 'Blog posts.' },
      { method: 'GET',    path: '/api/core/settings/',       auth: 'admin',   desc: 'System settings.' },
      { method: 'PATCH',  path: '/api/core/settings/',       auth: 'admin',   desc: 'Update system settings. Audited.' },
    ],
  },
  {
    group: 'Ops & audit',
    rows: [
      { method: 'GET',  path: '/api/ops/health/',               auth: 'admin', desc: 'System health summary.' },
      { method: 'GET',  path: '/api/ops/beat/',                 auth: 'admin', desc: 'Beat schedule.' },
      { method: 'GET',  path: '/api/ops/task-results/',         auth: 'admin', desc: 'Recent Celery task results.' },
      { method: 'GET',  path: '/api/ops/logs/',                 auth: 'admin', desc: 'Tail of the backend log file.' },
      { method: 'POST', path: '/api/ops/trigger/credit/',       auth: 'admin', desc: 'Run today\'s earnings synchronously.' },
      { method: 'POST', path: '/api/ops/trigger/backfill/',     auth: 'admin', desc: 'Backfill N days of earnings runs.' },
      { method: 'GET',  path: '/api/audit/',                    auth: 'admin', desc: 'List audit events.' },
      { method: 'GET',  path: '/api/audit/summary/',            auth: 'admin', desc: 'Counts per category/severity.' },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET:    'text-info',
  POST:   'text-success',
  PUT:    'text-warning',
  PATCH:  'text-warning',
  DELETE: 'text-danger',
};

export default function DocsPage() {
  return (
    <div className="p-6 md:p-8 max-w-[1100px] mx-auto">
      <PageHeader
        eyebrow="Configure"
        title="API reference"
        description="The full BEX Network admin API. All requests are JSON; auth is Bearer JWT in the Authorization header."
      />

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <Info icon={Server}     title="Backend URL"  body="http://localhost:8000/api" mono />
        <Info icon={ShieldCheck} title="Auth"         body='Authorization: Bearer <jwt>' mono />
        <Info icon={Globe2}     title="Admin app"    body="http://localhost:4000" mono />
        <Info icon={Database}   title="Storage"      body="SQLite at backend/db.sqlite3" mono />
      </div>

      <div className="space-y-4">
        {ENDPOINTS.map((g) => (
          <Card key={g.group}>
            <CardHeader title={g.group} />
            <CardBody className="px-0 pb-0">
              <ul className="divide-y divide-hairline">
                {g.rows.map((r) => (
                  <li key={r.method + r.path} className="px-5 py-2.5 grid grid-cols-[70px_1fr_120px] items-center gap-3 text-xs">
                    <span className={`font-mono font-bold text-[11px] ${METHOD_COLOR[r.method] || 'text-fg'}`}>{r.method}</span>
                    <span className="font-mono text-fg">{r.path}</span>
                    <span className="text-right">
                      <Badge tone={r.auth === 'public' ? 'neutral' : r.auth === 'admin' ? 'accent' : 'info'}>{r.auth}</Badge>
                    </span>
                    <p className="col-span-3 text-fg-muted -mt-1">{r.desc}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Info({ icon: Icon, title, body, mono }: { icon: any; title: string; body: string; mono?: boolean }) {
  return (
    <Card>
      <CardBody className="p-4 flex items-center gap-3">
        <span className="grid place-items-center size-9 rounded-md bg-accent-soft text-accent shrink-0">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold">{title}</div>
          <div className={`text-fg ${mono ? 'font-mono text-[12.5px]' : 'text-sm'}`}>{body}</div>
        </div>
      </CardBody>
    </Card>
  );
}
