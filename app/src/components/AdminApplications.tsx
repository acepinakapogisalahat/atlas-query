// app/src/components/AdminApplications.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { listApplications, decideApplication, type AdminApplication } from '@/utils/supabase/admin';

/* ───── local tokens (self-contained, mirrors AdminReviews) ───── */
const NEU = 'bg-[#edf0fa] shadow-[10px_10px_24px_rgba(163,170,205,0.42),-10px_-10px_24px_rgba(255,255,255,0.95)]';
const NEU_SM = 'bg-[#edf0fa] shadow-[6px_6px_14px_rgba(163,170,205,0.38),-6px_-6px_14px_rgba(255,255,255,0.9)]';
const INSET = 'bg-[#e4e8f4] shadow-[inset_5px_5px_11px_rgba(163,170,205,0.38),inset_-5px_-5px_11px_rgba(255,255,255,0.85)]';
const GLASS = 'bg-white/55 backdrop-blur-xl border border-white/70 shadow-[0_10px_34px_rgba(110,120,190,0.2)]';
const GLASS_SM = 'bg-white/45 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(110,120,190,0.18),inset_0_1px_0_rgba(255,255,255,0.65)]';
const SHEEN = 'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:via-white/5 before:to-transparent';
const GRAD = 'from-indigo-500 via-violet-500 to-fuchsia-500';
const PILL_ACTIVE = `relative overflow-hidden bg-gradient-to-r ${GRAD} text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.75)] ${SHEEN}`;
const FIELD = 'w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none';

function Inbox({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Building({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function User({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Mail({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Calendar({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" /></svg>); }
function Check({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className ?? 'w-3.5 h-3.5'}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function X({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-3.5 h-3.5'}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>); }
function Search({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>); }
function AlertTriangle({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>); }

function Well({ gradient, children, size = 'md' }: { gradient: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  return (<div className={`relative overflow-hidden ${size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-12 h-12 rounded-2xl'} bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_-8px_rgba(80,90,180,0.65),inset_0_1px_0_rgba(255,255,255,0.55)]`}><span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent" /><span className="relative flex items-center justify-center">{children}</span></div>);
}
function Bar() { return <div className={`mt-2 h-1.5 w-16 rounded-full bg-gradient-to-r ${GRAD} shadow-[0_0_14px_rgba(139,92,246,0.65)]`} />; }
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
function typeGrad(t: string | null) {
  const s = (t ?? '').toLowerCase();
  if (s.includes('hotel') || s.includes('resort')) return 'from-sky-400 to-indigo-500';
  if (s.includes('restaurant') || s.includes('cafe') || s.includes('food')) return 'from-amber-400 to-orange-500';
  if (s.includes('attraction') || s.includes('tour') || s.includes('activity')) return 'from-emerald-400 to-teal-500';
  return 'from-fuchsia-500 to-purple-500';
}
const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50/90 border-amber-200/80 text-amber-600',
  approved: 'bg-emerald-50/90 border-emerald-200/80 text-emerald-600',
  rejected: 'bg-rose-50/90 border-rose-200/80 text-rose-600',
};
type Notify = (t: { k: 'ok' | 'err'; m: string }) => void;
type Filter = 'pending' | 'approved' | 'rejected' | 'all';

export default function AdminApplications({ notify, onChanged }: { notify: Notify; onChanged: () => void }) {
  const [rows, setRows] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<{ decision: 'approved' | 'rejected'; row: AdminApplication } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true; setLoading(true); setError(null);
    listApplications('all')
      .then((r) => { if (alive) setRows(r); })
      .catch((e: any) => { if (alive) setError(e?.message ?? 'Could not load applications.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: rows.length };
    for (const r of rows) { const s = r.status ?? 'pending'; if (s === 'pending') c.pending++; else if (s === 'approved') c.approved++; else if (s === 'rejected') c.rejected++; }
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    let arr = filter === 'all' ? rows : rows.filter((r) => (r.status ?? 'pending') === filter);
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((r) => `${r.company_name ?? ''} ${r.user_name ?? ''} ${r.contact_email ?? ''} ${r.application_id} ${r.business_type ?? ''}`.toLowerCase().includes(q));
    return arr;
  }, [rows, filter, search]);

  async function run(key: string, fn: () => Promise<void>, ok: string) {
    setBusy(key);
    try { await fn(); notify({ k: 'ok', m: ok }); setReloadKey((k) => k + 1); onChanged(); }
    catch (e: any) { notify({ k: 'err', m: e?.message ?? 'Action failed.' }); }
    finally { setBusy(null); }
  }
  function confirmDecision() {
    const m = modal; if (!m) return;
    const isApprove = m.decision === 'approved';
    run(`d:${m.row.application_id}`, () => decideApplication(m.row.application_id, m.decision, note.trim()), isApprove ? 'Application approved' : 'Application rejected')
      .then(() => { setModal(null); setNote(''); if (isApprove) notify({ k: 'ok', m: 'Approved — if the applicant still can’t publish, their grant lives in a separate step; paste role.ts + business_owners schema and I’ll wire it.' }); });
  }

  return (
    <div className={`${GLASS} rounded-3xl p-6 md:p-7 animate-fade-in`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Well gradient="from-emerald-500 to-teal-500"><Inbox className="w-5 h-5" /></Well>
          <div><h2 className="text-lg font-black text-slate-800 leading-tight">Publisher applications</h2><p className="text-xs text-slate-400 font-semibold">{shown.length} shown · {counts.pending} awaiting review</p></div>
        </div>
        <div className={`${INSET} flex items-center gap-2 rounded-2xl px-3 py-2 flex-1 lg:max-w-xs`}>
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, applicant, email…" className={FIELD} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {([['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']] as [Filter, string][]).map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition active:scale-95 ${filter === k ? (k === 'approved' ? 'relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_8px_18px_-6px_rgba(16,185,129,0.7)]' : k === 'rejected' ? 'relative overflow-hidden bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_8px_18px_-6px_rgba(244,63,94,0.7)]' : PILL_ACTIVE) : `${NEU_SM} text-slate-600 hover:text-violet-600`}`}>
            <span className="relative flex items-center gap-1.5">{lbl}<span className={`min-w-[1.2rem] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${filter === k ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-500'}`}>{counts[k]}</span></span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="m-1 p-4 rounded-2xl bg-rose-50/90 backdrop-blur-md border border-rose-200 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" /><p className="text-sm font-semibold text-rose-700 flex-1">{error}</p><button type="button" onClick={() => setReloadKey((k) => k + 1)} className="px-3 py-1.5 rounded-full bg-white/80 text-xs font-bold text-rose-600 hover:bg-white transition">Retry</button></div>
      ) : loading ? (
        <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className={`h-28 rounded-2xl ${INSET} animate-pulse`} />)}</div>
      ) : shown.length === 0 ? (
        <div className="text-center py-14"><div className={`w-14 h-14 mx-auto rounded-2xl ${INSET} text-violet-300 flex items-center justify-center mb-3`}><Inbox className="w-7 h-7" /></div><p className="text-sm font-bold text-slate-500">{filter === 'pending' ? 'No pending applications — queue is clear.' : 'Nothing here yet.'}</p></div>
      ) : (
        <div className="space-y-2.5 max-h-[66vh] overflow-y-auto pr-1 -mr-1">
          {shown.map((a) => {
            const st = a.status ?? 'pending'; const key = a.application_id; const isBusy = busy === `d:${key}`;
            return (
              <div key={key} className={`${NEU_SM} rounded-2xl p-4 flex flex-col md:flex-row md:items-start gap-4 ${st === 'pending' ? 'ring-1 ring-amber-200' : ''}`}>
                <Well gradient={typeGrad(a.business_type)}><Building className="w-6 h-6" /></Well>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-slate-800 text-base truncate">{a.company_name ?? 'Unnamed business'}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border backdrop-blur-md ${STATUS_TONE[st] ?? STATUS_TONE.pending}`}>{st}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] font-semibold text-slate-400">
                    {a.business_type && <span className="uppercase tracking-wider text-violet-500">{a.business_type}</span>}
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{a.user_name ?? 'Unknown applicant'}</span>
                    {a.contact_email && <span className="flex items-center gap-1 truncate max-w-[14rem]"><Mail className="w-3 h-3" />{a.contact_email}</span>}
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(a.submitted_at)}</span>
                    <span className="font-mono text-slate-300">{a.application_id}</span>
                  </div>
                  {a.pitch && <p className="text-sm text-slate-600 leading-relaxed mt-2 line-clamp-3" title={a.pitch}>{a.pitch}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 md:self-center">
                  {st === 'pending' ? (<>
                    <button type="button" disabled={isBusy} onClick={() => { setModal({ decision: 'approved', row: a }); setNote(''); }} className="relative overflow-hidden px-4 py-2 rounded-full text-xs font-black text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_10px_22px_-8px_rgba(16,185,129,0.7),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5 ${SHEEN}"><span className="relative flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />Approve</span></button>
                    <button type="button" disabled={isBusy} onClick={() => { setModal({ decision: 'rejected', row: a }); setNote(''); }} className="px-4 py-2 rounded-full text-xs font-black text-rose-600 bg-rose-50/80 backdrop-blur-md border border-rose-200/80 hover:bg-rose-100/80 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5"><X className="w-3.5 h-3.5" />Reject</button>
                  </>) : (
                    <span className="text-[11px] font-bold text-slate-400 px-3 py-1.5 rounded-full bg-white/50 border border-white/70 backdrop-blur-md">{st === 'approved' ? 'Granted' : 'Declined'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => { setModal(null); setNote(''); }}>
          <div className={`${NEU} rounded-3xl p-6 max-w-md w-full animate-slide-up`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">{modal.decision === 'approved' ? <><Check className="w-5 h-5 text-emerald-500" />Approve application</> : <><X className="w-5 h-5 text-rose-500" />Reject application</>}</h3>
              <button type="button" onClick={() => { setModal(null); setNote(''); }} className="text-slate-400 hover:text-slate-600 transition"><X /></button>
            </div>
            <p className="text-sm text-slate-500 mb-1">For <span className="font-bold text-slate-800">{modal.row.company_name ?? modal.row.application_id}</span> by <span className="font-bold text-slate-800">{modal.row.user_name ?? 'applicant'}</span>.</p>
            {modal.decision === 'approved' && <p className="text-[11px] text-amber-600 font-semibold mb-3">Stamps you as reviewer + today’s date and flips status to approved.</p>}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} placeholder={modal.decision === 'approved' ? 'Optional note to the applicant (logged)…' : 'Reason for rejection (logged, shown to applicant)…'} className={`${INSET} w-full px-4 py-3 rounded-2xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-400/60 resize-none`} />
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => { setModal(null); setNote(''); }} className={`${GLASS_SM} flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-white/80 transition active:scale-95`}>Cancel</button>
              <button type="button" disabled={busy === `d:${modal.row.application_id}`} onClick={confirmDecision}
                className={`relative overflow-hidden flex-1 py-3 rounded-2xl text-sm font-bold text-white shadow-[0_12px_28px_-8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition disabled:opacity-60 ${SHEEN} ${modal.decision === 'approved' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-rose-500 to-red-500'}`}>
                <span className="relative">{modal.decision === 'approved' ? 'Confirm approve' : 'Confirm reject'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}