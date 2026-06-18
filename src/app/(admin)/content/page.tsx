'use client';

import { useEffect, useMemo, useState } from 'react';
import { Newspaper, Wallet, RefreshCcw, Plus, Trash2, Save, Megaphone, Trash, Video } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import api, { coreAPI, parseApiError } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { formatMoney, cn } from '@/lib/utils';

type Tab = 'currencies' | 'invest-plans' | 'testimonies' | 'blog' | 'announcements' | 'webinars';

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>('currencies');
  const { push } = useToast();
  return (
    <div className="p-6 md:p-8 max-w-[1300px] mx-auto">
      <PageHeader
        eyebrow="Operate"
        title="Content & plans"
        description="Currencies, invest tiers, marketing copy."
      />

      <div className="flex items-center gap-1 mb-4 border-b border-hairline overflow-x-auto">
        {([
          ['currencies',    'Currencies',    Wallet],
          ['invest-plans',  'Invest plans',  Plus],
          ['testimonies',   'Testimonies',   Newspaper],
          ['blog',          'Blog posts',    Newspaper],
          ['announcements', 'Announcements', Megaphone],
          ['webinars',      'Webinars',      Video],
        ] as [Tab, string, any][]).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-3 h-10 text-[12.5px] font-medium inline-flex items-center gap-1.5 border-b-2 transition-colors shrink-0 whitespace-nowrap',
              tab === key ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            <Icon className="size-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === 'currencies'    && <CurrenciesTab />}
      {tab === 'invest-plans'  && <InvestPlansTab />}
      {tab === 'testimonies'   && <TestimoniesTab />}
      {tab === 'blog'          && <BlogTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
      {tab === 'webinars'      && <WebinarsTab />}
    </div>
  );
}

const EMPTY_WEBINAR = {
  title: '', speaker: '', hosts: [] as any[], description: '', image_url: '',
  scheduled_for: '', duration_minutes: 60, join_url: '', replay_url: '',
  is_published: true, sort_order: 100,
};

function WebinarsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<any | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    setLoading(true);
    api.get('/core/webinars/')
      .then((r: any) => setRows(r.data?.results || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  const d = draft || EMPTY_WEBINAR;
  const set = (k: string, v: any) => setDraft({ ...(draft || EMPTY_WEBINAR), [k]: v });
  const hosts: any[] = d.hosts || [];
  const addHost = () => set('hosts', [...hosts, { name: '', role: '', avatar_url: '' }]);
  const updateHost = (i: number, k: string, v: string) => set('hosts', hosts.map((h, idx) => idx === i ? { ...h, [k]: v } : h));
  const removeHost = (i: number) => set('hosts', hosts.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!d.title) { push('Title is required', 'error'); return; }
    if (!d.scheduled_for) { push('Air date & time is required', 'error'); return; }
    setSaving(true);
    try {
      const body = { ...EMPTY_WEBINAR, ...draft };
      if (editing) await api.patch(`/core/webinars/${editing.id}/`, body);
      else await api.post('/core/webinars/', body);
      push(editing ? 'Webinar updated' : 'Webinar created', 'success');
      setDraft(null); setEditing(null); setRefresh((n) => n + 1);
    } catch { push('Save failed', 'error'); } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this webinar?')) return;
    try { await api.delete(`/core/webinars/${id}/`); push('Deleted', 'success'); setRefresh((n) => n + 1); }
    catch { push('Delete failed', 'error'); }
  };

  const columns: Column<any>[] = [
    { key: 'title', header: 'Title', cell: (r) => <span className="font-medium text-fg line-clamp-1">{r.title}</span> },
    { key: 'speaker', header: 'Speaker', cell: (r) => <span className="text-[12px] text-fg-muted">{r.speaker || '—'}</span>, width: '160px' },
    { key: 'when', header: 'Air date', cell: (r) => <span className="tabular text-[12px] text-fg-muted">{r.scheduled_for ? new Date(r.scheduled_for).toLocaleString() : '—'}</span>, width: '180px' },
    { key: 'status', header: 'Status', cell: (r) => <span className="text-[11px] uppercase tracking-wider font-semibold text-fg-muted">{r.status || '—'}</span>, width: '90px' },
    { key: 'pub', header: 'Live', align: 'center', cell: (r) => r.is_published ? <span className="inline-flex size-2 rounded-full bg-success" /> : <span className="inline-flex size-2 rounded-full bg-fg-subtle" />, width: '60px' },
    { key: 'act', header: '', align: 'right', cell: (r) => (
      <div className="flex justify-end gap-1">
        <Button size="xs" variant="ghost" onClick={() => { setEditing(r); setDraft({ ...r, scheduled_for: r.scheduled_for ? String(r.scheduled_for).slice(0, 16) : '', hosts: (r.hosts && r.hosts.length) ? r.hosts : (r.speaker ? [{ name: r.speaker, role: '', avatar_url: '' }] : []) }); }}>Edit</Button>
        <Button size="xs" variant="ghost" onClick={() => remove(r.id)} leadingIcon={<Trash className="size-3" />}>Delete</Button>
      </div>
    ), width: '130px' },
  ];

  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title={editing ? 'Edit webinar' : 'Add webinar'}
          action={editing && <Button size="sm" variant="secondary" onClick={() => { setEditing(null); setDraft(null); }}>Cancel</Button>}
        />
        <CardBody className="space-y-4">
          <Field label="Title" required><Input value={d.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Description"><Textarea rows={3} value={d.description} onChange={(e) => set('description', e.target.value)} /></Field>

          {/* Hosts / speakers — add as many as needed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-medium text-fg">Hosts / speakers</label>
              <Button size="xs" variant="secondary" onClick={addHost} leadingIcon={<Plus className="size-3" />}>Add host</Button>
            </div>
            {hosts.length === 0 && <p className="text-[12px] text-fg-muted mb-2">No hosts yet — add one or more speakers for this session.</p>}
            <div className="space-y-2">
              {hosts.map((h, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.4fr_auto] gap-2 items-center">
                  <Input value={h.name || ''} onChange={(e) => updateHost(i, 'name', e.target.value)} placeholder="Name" />
                  <Input value={h.role || ''} onChange={(e) => updateHost(i, 'role', e.target.value)} placeholder="Role (e.g. Head of Trading)" />
                  <Input value={h.avatar_url || ''} onChange={(e) => updateHost(i, 'avatar_url', e.target.value)} placeholder="Avatar image URL" />
                  <Button size="xs" variant="ghost" onClick={() => removeHost(i)} leadingIcon={<Trash className="size-3" />} aria-label="Remove host" />
                </div>
              ))}
            </div>
          </div>
          <Field label="Cover image URL">
            <Input value={d.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…/cover.jpg  (full URL or /public path)" />
          </Field>
          {d.image_url ? <img src={d.image_url} alt="" className="h-28 rounded-lg border border-hairline object-cover" /> : null}
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Air date & time" required><Input type="datetime-local" value={d.scheduled_for} onChange={(e) => set('scheduled_for', e.target.value)} /></Field>
            <Field label="Duration (min)"><Input type="number" value={d.duration_minutes} onChange={(e) => set('duration_minutes', parseInt(e.target.value) || 0)} /></Field>
            <Field label="Sort order"><Input type="number" value={d.sort_order} onChange={(e) => set('sort_order', parseInt(e.target.value) || 0)} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Join URL (live)"><Input value={d.join_url} onChange={(e) => set('join_url', e.target.value)} placeholder="https://zoom.us/j/…" /></Field>
            <Field label="Replay URL"><Input value={d.replay_url} onChange={(e) => set('replay_url', e.target.value)} placeholder="https://youtu.be/…" /></Field>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-fg cursor-pointer">
            <input type="checkbox" checked={!!d.is_published} onChange={(e) => set('is_published', e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Published (visible to users)
          </label>
          <div>
            <Button onClick={save} loading={saving} leadingIcon={<Save className="size-4" />}>{editing ? 'Update' : 'Create'} webinar</Button>
          </div>
        </CardBody>
      </Card>

      {loading ? <div className="skeleton h-32" />
        : rows.length === 0 ? <EmptyState icon={Video} title="No webinars yet" />
        : <DataTable rows={rows} columns={columns} pageSize={15} />}
    </>
  );
}

const NETWORK_OPTIONS = ['Ethereum', 'Polygon', 'Arbitrum', 'Tron', 'BSC', 'Solana', 'Bitcoin', 'Base', 'Optimism', 'Avalanche'];

function CurrenciesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [draft, setDraft] = useState<{ currency: string; network: string; address: string } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const { push } = useToast();

  const blank = { currency: '', network: '', address: '' };

  useEffect(() => {
    setLoading(true);
    coreAPI.currencies().then((r) => setRows(r.data?.results || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [refresh]);

  const save = async () => {
    if (!draft || !draft.currency || !draft.network || !draft.address) { push('Ticker, network and address are all required', 'error'); return; }
    try {
      if (editing) { await coreAPI.updateCurrency(editing.id, draft); push('Currency updated', 'success'); }
      else { await coreAPI.createCurrency(draft); push('Currency added', 'success'); }
      setDraft(null); setEditing(null);
      setRefresh((n) => n + 1);
    } catch (e) { push(parseApiError(e, 'Save failed'), 'error'); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this deposit address?')) return;
    try {
      await coreAPI.deleteCurrency(id);
      push('Deleted', 'success');
      setRefresh((n) => n + 1);
    } catch (e) { push(parseApiError(e, 'Delete failed'), 'error'); }
  };

  const columns: Column<any>[] = [
    { key: 'currency', header: 'Ticker', sortBy: (r) => r.currency, cell: (r) => <span className="font-mono font-semibold text-fg">{r.currency}</span>, width: '100px' },
    { key: 'network', header: 'Network', sortBy: (r) => r.network, cell: (r) => <span className="text-fg-muted text-[13px]">{r.network || '—'}</span>, width: '120px' },
    { key: 'address', header: 'Deposit address', cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted break-all">{r.address || '—'}</span> },
    { key: 'actions', header: '', align: 'right',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="xs" variant="ghost" onClick={() => { setEditing(r); setDraft({ currency: r.currency, network: r.network || '', address: r.address || '' }); }}>Edit</Button>
          <Button size="xs" variant="ghost" onClick={() => remove(r.id)} leadingIcon={<Trash2 className="size-3" />}>Delete</Button>
        </div>
      ), width: '140px' },
  ];

  return (
    <>
      <Card className="mb-4">
        <CardHeader title={editing ? 'Edit deposit address' : 'Add deposit address'}
          description="Each asset can have one address per network — users pick the network on the deposit page and see the matching wallet." />
        <CardBody className="grid sm:grid-cols-[120px_160px_1fr_auto] gap-3 items-end">
          <Field label="Ticker"><Input value={draft?.currency || ''} onChange={(e) => setDraft({ ...(draft || blank), currency: e.target.value.toUpperCase().slice(0, 8) })} placeholder="USDT" /></Field>
          <Field label="Network">
            <Input list="net-opts" value={draft?.network || ''} onChange={(e) => setDraft({ ...(draft || blank), network: e.target.value })} placeholder="Ethereum" />
            <datalist id="net-opts">{NETWORK_OPTIONS.map((n) => <option key={n} value={n} />)}</datalist>
          </Field>
          <Field label="Deposit address"><Input value={draft?.address || ''} onChange={(e) => setDraft({ ...(draft || blank), address: e.target.value })} placeholder="0x… / T… / bc1…" /></Field>
          <div className="flex gap-2">
            {editing && <Button variant="secondary" onClick={() => { setEditing(null); setDraft(null); }}>Cancel</Button>}
            <Button onClick={save} leadingIcon={<Save className="size-3.5" />}>{editing ? 'Update' : 'Add'}</Button>
          </div>
        </CardBody>
      </Card>

      {loading ? <div className="skeleton h-32" /> :
        rows.length === 0 ? <EmptyState icon={Wallet} title="No currencies yet" /> :
        <DataTable rows={rows} columns={columns} pageSize={25} />}
    </>
  );
}

function InvestPlansTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<any | null>(null);
  const [draft, setDraft] = useState<any | null>(null);
  const { push } = useToast();

  useEffect(() => {
    setLoading(true);
    coreAPI.investPlans().then((r) => setRows(r.data?.results || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [refresh]);

  const save = async () => {
    if (!draft) return;
    if (!draft.name?.trim()) { push('Name is required', 'error'); return; }
    try {
      if (editing) await coreAPI.updateInvestPlan(editing.id, draft);
      else await coreAPI.createInvestPlan(draft);
      push(editing ? 'Plan updated' : 'Plan created', 'success');
      setDraft(null); setEditing(null);
      setRefresh((n) => n + 1);
    } catch (e) { push(parseApiError(e, 'Save failed'), 'error'); }
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Name', sortBy: (r) => r.name, cell: (r) => <span className="font-medium text-fg">{r.name}</span> },
    { key: 'min', header: 'Min', align: 'right', sortBy: (r) => Number(r.min_amount), cell: (r) => <span className="tabular text-fg-muted">{formatMoney(r.min_amount)}</span>, width: '120px' },
    { key: 'max', header: 'Max', align: 'right', sortBy: (r) => Number(r.max_amount), cell: (r) => <span className="tabular text-fg-muted">{formatMoney(r.max_amount)}</span>, width: '120px' },
    { key: 'pct', header: 'Daily %', align: 'right', sortBy: (r) => Number(r.percentage), cell: (r) => <span className="tabular text-accent font-semibold">{Number(r.percentage).toFixed(2)}%</span>, width: '100px' },
    { key: 'days', header: 'Days', align: 'right', cell: (r) => <span className="tabular text-fg-muted">{r.duration}</span>, width: '80px' },
    { key: 'actions', header: '', align: 'right', cell: (r) => <Button size="xs" variant="ghost" onClick={() => { setEditing(r); setDraft({ ...r }); }}>Edit</Button>, width: '80px' },
  ];

  return (
    <>
      <Card className="mb-4">
        <CardHeader title={editing ? 'Edit invest plan' : 'Add invest plan'} action={editing && <Button size="sm" variant="secondary" onClick={() => { setEditing(null); setDraft(null); }}>Cancel</Button>} />
        <CardBody>
          <div className="grid sm:grid-cols-5 gap-3">
            <Field label="Name"><Input value={draft?.name || ''} onChange={(e) => setDraft({ ...(draft || {}), name: e.target.value })} /></Field>
            <Field label="Min $"><Input type="number" value={draft?.min_amount || ''} onChange={(e) => setDraft({ ...(draft || {}), min_amount: +e.target.value })} /></Field>
            <Field label="Max $"><Input type="number" value={draft?.max_amount || ''} onChange={(e) => setDraft({ ...(draft || {}), max_amount: +e.target.value })} /></Field>
            <Field label="Daily %"><Input type="number" step="0.01" value={draft?.percentage || ''} onChange={(e) => setDraft({ ...(draft || {}), percentage: +e.target.value })} /></Field>
            <Field label="Days"><Input type="number" value={draft?.duration || ''} onChange={(e) => setDraft({ ...(draft || {}), duration: +e.target.value })} /></Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={save} leadingIcon={<Save className="size-3.5" />}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </CardBody>
      </Card>

      {loading ? <div className="skeleton h-32" /> :
        <DataTable rows={rows} columns={columns} pageSize={25} />}
    </>
  );
}

function TestimoniesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [draft, setDraft] = useState<{ author: string; body: string } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const { push } = useToast();

  useEffect(() => {
    setLoading(true);
    coreAPI.testimonies().then((r) => setRows(r.data?.results || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [refresh]);

  const save = async () => {
    if (!draft?.author || !draft.body) { push('Author and body are required', 'error'); return; }
    try {
      if (editing) await coreAPI.updateTestimony(editing.id, draft);
      else await coreAPI.createTestimony(draft);
      push(editing ? 'Testimony updated' : 'Testimony created', 'success');
      setDraft(null); setEditing(null); setRefresh((n) => n + 1);
    } catch (e) { push(parseApiError(e, 'Save failed'), 'error'); }
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader title={editing ? 'Edit testimony' : 'Add testimony'} />
        <CardBody className="space-y-3">
          <Field label="Author"><Input value={draft?.author || ''} onChange={(e) => setDraft({ ...(draft || { author: '', body: '' }), author: e.target.value })} /></Field>
          <Field label="Body"><Textarea rows={3} value={draft?.body || ''} onChange={(e) => setDraft({ ...(draft || { author: '', body: '' }), body: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            {editing && <Button variant="secondary" onClick={() => { setEditing(null); setDraft(null); }}>Cancel</Button>}
            <Button onClick={save} leadingIcon={<Save className="size-3.5" />}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </CardBody>
      </Card>
      {loading ? <div className="skeleton h-32" /> :
        <ul className="space-y-2">
          {(rows || []).map((t) => (
            <li key={t.id} className="panel p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-fg">{t.author}</div>
                <div className="text-[12.5px] text-fg-muted mt-0.5 line-clamp-2">{t.body}</div>
              </div>
              <Button size="xs" variant="ghost" onClick={() => { setEditing(t); setDraft({ author: t.author, body: t.body }); }}>Edit</Button>
            </li>
          ))}
          {rows.length === 0 && <EmptyState icon={Newspaper} title="No testimonies yet" />}
        </ul>}
    </>
  );
}

function BlogTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [draft, setDraft] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const { push } = useToast();

  useEffect(() => {
    setLoading(true);
    coreAPI.blog().then((r) => setRows(r.data?.results || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [refresh]);

  const save = async () => {
    if (!draft?.title) { push('Title is required', 'error'); return; }
    try {
      if (editing) await coreAPI.updateBlog(editing.id, draft);
      else await coreAPI.createBlog(draft);
      push(editing ? 'Post updated' : 'Post created', 'success');
      setDraft(null); setEditing(null); setRefresh((n) => n + 1);
    } catch (e) { push(parseApiError(e, 'Save failed'), 'error'); }
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader title={editing ? 'Edit post' : 'Add post'} />
        <CardBody className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Title"><Input value={draft?.title || ''} onChange={(e) => setDraft({ ...(draft || {}), title: e.target.value })} /></Field>
            <Field label="URL slug"><Input value={draft?.url || ''} onChange={(e) => setDraft({ ...(draft || {}), url: e.target.value })} /></Field>
          </div>
          <Field label="Description"><Textarea rows={2} value={draft?.description || ''} onChange={(e) => setDraft({ ...(draft || {}), description: e.target.value })} /></Field>
          <Field label="Body (HTML allowed)"><Textarea rows={6} value={draft?.body || ''} onChange={(e) => setDraft({ ...(draft || {}), body: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            {editing && <Button variant="secondary" onClick={() => { setEditing(null); setDraft(null); }}>Cancel</Button>}
            <Button onClick={save} leadingIcon={<Save className="size-3.5" />}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </CardBody>
      </Card>
      {loading ? <div className="skeleton h-32" /> :
        <ul className="space-y-2">
          {(rows || []).map((b) => (
            <li key={b.id} className="panel p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-fg truncate">{b.title}</div>
                <div className="text-[12.5px] text-fg-muted mt-0.5 line-clamp-2">{b.description || b.body?.slice(0, 140)}</div>
                {b.url && <div className="text-[11px] text-fg-subtle font-mono mt-0.5">{b.url}</div>}
              </div>
              <Button size="xs" variant="ghost" onClick={() => { setEditing(b); setDraft({ ...b }); }}>Edit</Button>
            </li>
          ))}
          {rows.length === 0 && <EmptyState icon={Newspaper} title="No blog posts yet" />}
        </ul>}
    </>
  );
}

const CATEGORIES = [
  { value: 'office_opening', label: 'Global launch' },
  { value: 'trip',           label: 'Trip / event'   },
  { value: 'webinar',        label: 'Webinar'        },
  { value: 'general',        label: 'General'        },
];

const EMPTY_DRAFT: any = {
  title: '',
  subtitle: '',
  body: '',
  background_image: '/announcements/nyc.svg',
  category: 'office_opening',
  event_start: '',
  event_end: '',
  location: '',
  hotel_covered: false,
  flight_covered: false,
  qualification_start: '',
  qualification_end: '',
  scheduled_for: '',
  spots_total: 0,
  spots_filled: 0,
  volume_target_usd: 0,
  volume_weights: { '1': 100, '2': 40, '3': 20 },
  rank_target: '',
  sort_order: 100,
  is_published: true,
};

function AnnouncementsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<any | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    setLoading(true);
    coreAPI.announcements().then((r) => setRows(r.data?.results || r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [refresh]);

  const save = async () => {
    if (!draft?.title) { push('Title is required', 'error'); return; }
    setSaving(true);
    try {
      // DateFields come back as "" when empty — convert to null for the API.
      const clean = { ...draft };
      ['event_start', 'event_end', 'qualification_start', 'qualification_end'].forEach((k) => {
        if (clean[k] === '') clean[k] = null;
      });
      if (editing) await coreAPI.updateAnnouncement(editing.id, clean);
      else await coreAPI.createAnnouncement(clean);
      push(editing ? 'Announcement updated' : 'Announcement created', 'success');
      setDraft(null); setEditing(null);
      setRefresh((n) => n + 1);
    } catch (e: any) {
      push(parseApiError(e, 'Save failed'), 'error');
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await coreAPI.deleteAnnouncement(id);
      push('Deleted', 'success');
      setRefresh((n) => n + 1);
    } catch (e) { push(parseApiError(e, 'Delete failed'), 'error'); }
  };

  const call = async (id: number, endpoint: 'publish' | 'unpublish' | 'duplicate', successMsg: string) => {
    try {
      const fn = (coreAPI as any)[endpoint === 'publish' ? 'publishAnnouncement' : endpoint === 'unpublish' ? 'unpublishAnnouncement' : 'duplicateAnnouncement'];
      const res = await fn(id);
      if (endpoint === 'duplicate' && res.data?.id) {
        setEditing(res.data);
        setDraft({ ...res.data });
      }
      push(successMsg, 'success');
      setRefresh((n) => n + 1);
    } catch (e) {
      push('Action failed', 'error');
    }
  };

  const columns: Column<any>[] = [
    { key: 'title', header: 'Title', sortBy: (r) => r.title, cell: (r) => <span className="font-medium text-fg line-clamp-1">{r.title}</span> },
    { key: 'cat', header: 'Category', cell: (r) => <span className="text-[11px] uppercase tracking-wider font-semibold text-fg-muted">{r.category}</span>, width: '140px' },
    { key: 'dates', header: 'Event dates', cell: (r) => <span className="tabular text-[12px] text-fg-muted">{r.event_start || '—'} → {r.event_end || '—'}</span>, width: '180px' },
    { key: 'spots', header: 'Spots', align: 'right', cell: (r) => <span className="tabular text-fg-muted">{r.spots_filled} / {r.spots_total}</span>, width: '90px' },
    { key: 'pub', header: 'Live', align: 'center', cell: (r) => r.is_published ? <span className="inline-flex size-2 rounded-full bg-success" /> : <span className="inline-flex size-2 rounded-full bg-fg-subtle" />, width: '60px' },
    { key: 'act', header: '', align: 'right', cell: (r) => (
      <div className="flex justify-end gap-1">
        {!r.is_published && (
          <Button size="xs" variant="secondary" onClick={() => call(r.id, 'publish', 'Published')}>Publish</Button>
        )}
        {r.is_published && (
          <Button size="xs" variant="ghost" onClick={() => call(r.id, 'unpublish', 'Unpublished')}>Unpublish</Button>
        )}
        <Button size="xs" variant="ghost" onClick={() => call(r.id, 'duplicate', 'Duplicated')}>Duplicate</Button>
        <Button size="xs" variant="ghost" onClick={() => { setEditing(r); setDraft({ ...r }); }}>Edit</Button>
        <Button size="xs" variant="ghost" onClick={() => remove(r.id)} leadingIcon={<Trash className="size-3" />}>Delete</Button>
      </div>
    ), width: '160px' },
  ];

  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title={editing ? 'Edit announcement' : 'Add announcement'}
          action={editing && <Button size="sm" variant="secondary" onClick={() => { setEditing(null); setDraft(null); }}>Cancel</Button>}
        />
        <CardBody className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Title" required><Input value={draft?.title ?? ''} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), title: e.target.value })} /></Field>
            <Field label="Subtitle"><Input value={draft?.subtitle ?? ''} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), subtitle: e.target.value })} /></Field>
          </div>
          <Field label="Body"><Textarea rows={4} value={draft?.body ?? ''} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), body: e.target.value })} /></Field>

          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Background image">
              <Input value={draft?.background_image ?? '/announcements/nyc.svg'} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), background_image: e.target.value })} />
            </Field>
            <Field label="Category">
              <select
                value={draft?.category ?? 'office_opening'}
                onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), category: e.target.value })}
                className="h-9 px-3 rounded-md border border-border bg-surface text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Location">
              <Input value={draft?.location ?? ''} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), location: e.target.value })} placeholder="Dubai, UAE" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Event start"><Input type="date" value={draft?.event_start ?? ''} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), event_start: e.target.value })} /></Field>
            <Field label="Event end"><Input type="date" value={draft?.event_end ?? ''} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), event_end: e.target.value })} /></Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Qualification window — start"><Input type="date" value={draft?.qualification_start ?? ''} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), qualification_start: e.target.value })} /></Field>
            <Field label="Qualification window — end"><Input type="date" value={draft?.qualification_end ?? ''} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), qualification_end: e.target.value })} /></Field>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <Field label="Spots total"><Input type="number" value={draft?.spots_total ?? 0} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), spots_total: +e.target.value })} /></Field>
            <Field label="Spots filled"><Input type="number" value={draft?.spots_filled ?? 0} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), spots_filled: +e.target.value })} /></Field>
            <Field label="Volume target (USDT)"><Input type="number" step="0.01" value={draft?.volume_target_usd ?? 0} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), volume_target_usd: +e.target.value })} /></Field>
            <Field label="Rank target"><Input value={draft?.rank_target ?? ''} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), rank_target: e.target.value })} placeholder="sapphire" /></Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="L1 weight %"><Input type="number" value={draft?.volume_weights?.['1'] ?? 100} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), volume_weights: { ...(draft?.volume_weights || {}), '1': +e.target.value } })} /></Field>
            <Field label="L2 weight %"><Input type="number" value={draft?.volume_weights?.['2'] ?? 40} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), volume_weights: { ...(draft?.volume_weights || {}), '2': +e.target.value } })} /></Field>
            <Field label="L3 weight %"><Input type="number" value={draft?.volume_weights?.['3'] ?? 20} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), volume_weights: { ...(draft?.volume_weights || {}), '3': +e.target.value } })} /></Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Sort order"><Input type="number" value={draft?.sort_order ?? 100} onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), sort_order: +e.target.value })} /></Field>
            <label className="flex items-center gap-2 self-end h-9 px-3 rounded-md border border-border bg-surface cursor-pointer">
              <input
                type="checkbox"
                checked={draft?.is_published ?? true}
                onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), is_published: e.target.checked })}
                className="size-4 accent-[var(--accent)]"
              />
              <span className="text-[13px] text-fg">Published</span>
            </label>
            <label className="flex items-center gap-2 self-end h-9 px-3 rounded-md border border-border bg-surface cursor-pointer">
              <input
                type="checkbox"
                checked={!!draft?.hotel_covered}
                onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), hotel_covered: e.target.checked })}
                className="size-4 accent-[var(--accent)]"
              />
              <span className="text-[13px] text-fg">Hotel covered</span>
            </label>
          </div>

          <label className="flex items-center gap-2 self-end h-9 px-3 rounded-md border border-border bg-surface cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={!!draft?.flight_covered}
              onChange={(e) => setDraft({ ...(draft || EMPTY_DRAFT), flight_covered: e.target.checked })}
              className="size-4 accent-[var(--accent)]"
            />
            <span className="text-[13px] text-fg">Flight covered</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            {editing && <Button variant="secondary" onClick={() => { setEditing(null); setDraft(null); }}>Cancel</Button>}
            <Button onClick={save} loading={saving} leadingIcon={<Save className="size-3.5" />}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {loading ? <div className="skeleton h-32" /> :
        rows.length === 0 ? <EmptyState icon={Megaphone} title="No announcements yet" description="Create one to feature an event on the dashboard." /> :
        <DataTable rows={rows} columns={columns} pageSize={25} />}
    </>
  );
}
