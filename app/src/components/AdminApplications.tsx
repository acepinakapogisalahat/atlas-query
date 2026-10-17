'use client';

import { useEffect, useMemo, useState } from 'react';
import { listApplications, decideApplication, type AdminApplication } from '@/utils/supabase/admin';

const CARD = 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-200';
const CARD_INSET = 'bg-[#f1f3f8] shadow-[inset_2px_2px_4px_rgba(163,170,205,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]';
const GRAD = 'from-violet-600 to-indigo-600';
const BTN_PRIMARY = 'relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:brightness-110 active:scale-[0.98] transition-all duration-200';
const BTN_SUCCESS = 'relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition-all duration-200';
const BTN_DANGER = 'relative overflow-hidden bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/20 hover:brightness-110 active:scale-[0.98] transition-all duration-200';
const FIELD = 'w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none';

function Well({ gradient, children }: { gradient: string; children: React.ReactNode }) {
  return (<div className={`relative overflow-hidden w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-lg`}><span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent" /><span className="relative flex items-center justify-center">{children}</span></div>);
}

type Notify = (t: { k: 'ok' | 'err'; m: string }) => void;
type Filter = 'pending' | 'approved' | 'rejected' | 'all';

export default function AdminApplications({ notify, onChanged }: { notify: Notify; onChanged: () => void }) {
  const [rows, setRows] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<{ decision: 'approved' | 'rejected'; row: AdminApplication } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true; setLoading(true);
    listApplications('all').then((r) => { if (alive) setRows(r); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadKey]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: rows.length };
    for (const r of rows) { const s = r.status ?? 'pending'; if (s === 'pending') c.pending++; else if (s === 'approved') c.approved++; else if (s === 'rejected') c.rejected++; }
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    let arr = filter === 'all' ? rows : rows.filter((r) => (r.status ?? 'pending') === filter);
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((r) => `${r.company_name ?? ''} ${r.user_name ?? ''} ${r.contact_email ?? ''}`.toLowerCase().includes(q));
    return arr;
  }, [rows, filter, search]);

  async function run(key: string, fn: () => Promise<void>, ok: string) {
    setBusy(key);
    try { await fn(); notify({ k: 'ok', m: ok }); setReloadKey((k) => k + 1); onChanged(); }
    catch (e: any) { notify({ k: 'err', m: e?.message ?? 'Action failed.' }); }
    finally { setBusy(null); }
  }

  return (
    <div className={`${CARD} rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Well gradient="from-emerald-500 to-teal-500"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></Well>
          <div><h2 className="text-xl font-black text-slate-800">Publisher Applications</h2><p className="text-sm text-slate-500">{counts.pending} awaiting review</p></div>
        </div>
        <div className={`${CARD_INSET} flex items-center gap-3 rounded-xl px-4 py-3 flex-1 lg:max-w-xs`}>
          <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company or email…" className={FIELD} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {([['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']] as [Filter, string][]).map(([k, lbl]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${filter === k ? (k === 'approved' ? BTN_SUCCESS : k === 'rejected' ? BTN_DANGER : BTN_PRIMARY) : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {lbl} <span className="ml-1.5 opacity-70">({counts[k]})</span>
          </button>
        ))}
      </div>

      {loading ? (<div className="space-y-3 animate-pulse">{[0,1,2].map(i => <div key={i} className={`h-32 rounded-2xl ${CARD_INSET}`} />)}</div>)
        : shown.length === 0 ? (<p className="text-slate-500 text-center py-12">No applications found.</p>)
        : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
            {shown.map((a) => {
              const st = a.status ?? 'pending'; const key = a.application_id;
              return (
                <div key={key} className={`${CARD_INSET} rounded-2xl p-5 flex flex-col md:flex-row md:items-start gap-5 ${st === 'pending' ? 'ring-2 ring-amber-200/50' : ''}`}>
                  <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-black text-xl shrink-0">
                    {(a.company_name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <p className="font-black text-slate-800 text-lg">{a.company_name ?? 'Unnamed business'}</p>
                      <span className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${st === 'pending' ? 'bg-amber-100 text-amber-700' : st === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{st}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 mb-3">
                      <span className="font-semibold text-violet-600">{a.business_type}</span>
                      <span>{a.user_name ?? 'Unknown applicant'}</span>
                      <span>{a.contact_email}</span>
                      <span className="font-mono text-xs text-slate-400">{a.application_id}</span>
                    </div>
                    {a.pitch && <p className="text-sm text-slate-600 leading-relaxed bg-white/60 p-3 rounded-xl border border-slate-100 italic">"{a.pitch}"</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 md:self-center mt-2 md:mt-0">
                    {st === 'pending' ? (<>
                      <button disabled={busy === key} onClick={() => { setModal({ decision: 'approved', row: a }); setNote(''); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${BTN_SUCCESS}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg> Approve
                      </button>
                      <button disabled={busy === key} onClick={() => { setModal({ decision: 'rejected', row: a }); setNote(''); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${BTN_DANGER}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg> Reject
                      </button>
                    </>) : (
                      <span className="text-sm font-bold text-slate-400 px-4 py-2 rounded-xl bg-white/50 border border-slate-200">{st === 'approved' ? 'Granted' : 'Declined'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {modal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => { setModal(null); setNote(''); }}>
          <div className={`${CARD} rounded-3xl p-6 max-w-md w-full`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800 mb-4">{modal.decision === 'approved' ? 'Approve Application' : 'Reject Application'}</h3>
            <p className="text-sm text-slate-500 mb-4">For <span className="font-bold text-slate-800">{modal.row.company_name}</span></p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} placeholder="Optional note (logged)…" className={`${CARD_INSET} w-full px-4 py-3 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-violet-400/50 resize-none`} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setModal(null); setNote(''); }} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
              <button disabled={busy === `d:${modal.row.application_id}`} onClick={() => { run(`d:${modal.row.application_id}`, () => decideApplication(modal.row.application_id, modal.decision, note.trim()), modal.decision === 'approved' ? 'Approved' : 'Rejected').then(() => setModal(null)); }} className={`flex-1 py-3 rounded-xl text-sm font-bold text-white ${modal.decision === 'approved' ? BTN_SUCCESS : BTN_DANGER} disabled:opacity-50`}>
                Confirm {modal.decision === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}