'use client';

import { useEffect, useMemo, useState } from 'react';
import { listDestinations, createDestination, updateDestination, deleteDestination } from '@/utils/supabase/admin';

const NEU = 'bg-[#edf0fa] shadow-[10px_10px_24px_rgba(163,170,205,0.42),-10px_-10px_24px_rgba(255,255,255,0.95)]';
const NEU_SM = 'bg-[#edf0fa] shadow-[6px_6px_14px_rgba(163,170,205,0.38),-6px_-6px_14px_rgba(255,255,255,0.9)]';
const INSET = 'bg-[#e4e8f4] shadow-[inset_5px_5px_11px_rgba(163,170,205,0.38),inset_-5px_-5px_11px_rgba(255,255,255,0.85)]';
const GLASS = 'bg-white/60 backdrop-blur-xl border border-white/70 shadow-[0_10px_34px_rgba(110,120,190,0.15)]';
const GLASS_SM = 'bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(110,120,190,0.12)]';
const SHEEN = 'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:via-white/5 before:to-transparent';
const GRAD = 'from-indigo-500 via-violet-500 to-fuchsia-500';
const PILL_ACTIVE = `relative overflow-hidden bg-gradient-to-r ${GRAD} text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.6),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition-all duration-200 ${SHEEN}`;
const FIELD = 'w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none';
const INPUT = 'w-full px-4 py-2.5 rounded-xl bg-[#e4e8f4] shadow-[inset_4px_4px_9px_rgba(163,170,205,0.4),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] border border-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-400/60 transition';
const LBL = 'block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5';

function Globe({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Pin({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}><path d="M12 21s-7-5.1-7-11a7 7 0 1114 0c0 5.9-7 11-7 11z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.5" /></svg>); }
function Plus({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className ?? 'w-4 h-4'}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>); }
function Edit({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Trash({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Check({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className ?? 'w-4 h-4'}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function X({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>); }
function Search({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>); }
function AlertTriangle({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>); }

function Well({ gradient, children }: { gradient: string; children: React.ReactNode }) {
  return (<div className={`relative overflow-hidden w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_-8px_rgba(80,90,180,0.5),inset_0_1px_0_rgba(255,255,255,0.55)]`}><span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent" /><span className="relative flex items-center justify-center">{children}</span></div>);
}
type Notify = (t: { k: 'ok' | 'err'; m: string }) => void;
type Dest = { destination_id: string; destination_name: string; region_country: string };

export default function AdminDestinations({ notify, onChanged }: { notify: Notify; onChanged: () => void }) {
  const [rows, setRows] = useState<Dest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addRegion, setAddRegion] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRegion, setEditRegion] = useState('');

  useEffect(() => {
    let alive = true; setLoading(true); setError(null);
    listDestinations('')
      .then((r) => { if (alive) setRows(r as Dest[]); })
      .catch((e: any) => { if (alive) setError(e?.message ?? 'Could not load destinations.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadKey]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = q ? rows.filter((d) => `${d.destination_name} ${d.region_country} ${d.destination_id}`.toLowerCase().includes(q)) : rows;
    return [...arr].sort((a, b) => a.destination_name.localeCompare(b.destination_name));
  }, [rows, search]);

  async function run(key: string, fn: () => Promise<any>, ok: string | ((res: any) => string)) {
    setBusy(key);
    try { const res = await fn(); notify({ k: 'ok', m: typeof ok === 'function' ? ok(res) : ok }); setReloadKey((k) => k + 1); onChanged(); return true; }
    catch (e: any) { notify({ k: 'err', m: e?.message ?? 'Action failed.' }); return false; }
    finally { setBusy(null); }
  }

  async function submitAdd() {
    if (!addName.trim() || !addRegion.trim()) { notify({ k: 'err', m: 'Destination needs both a name and a region/country.' }); return; }
    const ok = await run('add', () => createDestination(addName, addRegion), (id) => `Destination ${id} created.`);
    if (ok) { setAddName(''); setAddRegion(''); setShowAdd(false); }
  }
  function startEdit(d: Dest) { setEditId(d.destination_id); setEditName(d.destination_name); setEditRegion(d.region_country); }
  async function saveEdit() {
    if (!editId) return;
    if (!editName.trim() || !editRegion.trim()) { notify({ k: 'err', m: 'Name and region cannot be empty.' }); return; }
    const ok = await run(`e:${editId}`, () => updateDestination(editId, editName, editRegion), `Destination ${editId} updated.`);
    if (ok) setEditId(null);
  }
  async function remove(d: Dest) {
    if (!confirm(`Delete destination ${d.destination_name} (${d.destination_id})? Blocked if any listing still references it.`)) return;
    await run(`d:${d.destination_id}`, () => deleteDestination(d.destination_id), `Destination ${d.destination_id} deleted.`);
  }

  return (
    <div className={`${GLASS} rounded-3xl p-6 md:p-7`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Well gradient="from-fuchsia-500 to-purple-500"><Globe className="w-5 h-5" /></Well>
          <div><h2 className="text-lg font-black text-slate-800 leading-tight">Destination registry</h2><p className="text-xs text-slate-400 font-semibold">{shown.length} of {rows.length} destinations</p></div>
        </div>
        <div className="flex items-center gap-3 flex-1 lg:max-w-md">
          <div className={`${INSET} flex items-center gap-2 rounded-xl px-4 py-2.5 flex-1`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, region or ID…" className={FIELD} />
          </div>
          <button type="button" onClick={() => { setShowAdd((v) => !v); setEditId(null); }} className={`relative overflow-hidden px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${GRAD} shadow-[0_10px_22px_-8px_rgba(124,58,237,0.7),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-95 transition whitespace-nowrap`}><span className="relative flex items-center gap-1.5"><Plus className="w-4 h-4" />Add</span></button>
        </div>
      </div>

      {showAdd && (
        <div className={`${NEU_SM} rounded-2xl p-5 mb-6 border border-white/60`}>
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-violet-600 mb-4">New destination</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={LBL}>Name</label><input value={addName} onChange={(e) => setAddName(e.target.value)} maxLength={100} placeholder="e.g. Vigan" className={INPUT} autoFocus /></div>
            <div><label className={LBL}>Region / Country</label><input value={addRegion} onChange={(e) => setAddRegion(e.target.value)} maxLength={100} placeholder="Ilocos Sur (Philippines)" className={INPUT} /></div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="button" onClick={() => { setShowAdd(false); setAddName(''); setAddRegion(''); }} className={`${GLASS_SM} px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white/80 transition active:scale-95`}>Cancel</button>
            <button type="button" disabled={busy === 'add' || !addName.trim() || !addRegion.trim()} onClick={submitAdd} className={`relative overflow-hidden px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${GRAD} shadow-[0_10px_22px_-8px_rgba(124,58,237,0.7),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-95 transition disabled:opacity-50`}><span className="relative flex items-center gap-1.5"><Check className="w-4 h-4" />Create destination</span></button>
          </div>
        </div>
      )}

      {error ? (
        <div className="p-4 rounded-2xl bg-rose-50/90 backdrop-blur-md border border-rose-200 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" /><p className="text-sm font-semibold text-rose-700 flex-1">{error}</p><button type="button" onClick={() => setReloadKey((k) => k + 1)} className="px-4 py-2 rounded-xl bg-white/80 text-xs font-bold text-rose-600 hover:bg-white transition">Retry</button></div>
      ) : loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className={`h-16 rounded-2xl ${INSET} animate-pulse`} />)}</div>
      ) : shown.length === 0 ? (
        <div className="text-center py-14"><div className={`w-16 h-16 mx-auto rounded-2xl ${INSET} text-violet-300 flex items-center justify-center mb-4`}><Globe className="w-7 h-7" /></div><p className="text-sm font-bold text-slate-500">{search ? 'No destinations match your search.' : 'No destinations yet — add the first one.'}</p></div>
      ) : (
        <div className="space-y-3 max-h-[66vh] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
          {shown.map((d) => {
            const editing = editId === d.destination_id; const isBusy = busy === `e:${d.destination_id}` || busy === `d:${d.destination_id}`;
            return (
              <div key={d.destination_id} className={`${NEU_SM} rounded-2xl p-4 flex items-center gap-4 border border-transparent hover:border-white/60 transition`}>
                <Well gradient="from-fuchsia-500 to-purple-500"><Pin className="w-4 h-4" /></Well>
                {editing ? (
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} className={INPUT} autoFocus />
                    <input value={editRegion} onChange={(e) => setEditRegion(e.target.value)} maxLength={100} className={INPUT} />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-800 text-sm truncate">{d.destination_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{d.region_country} · <span className="font-mono text-slate-300">{d.destination_id}</span></p>
                  </div>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  {editing ? (<>
                    <button type="button" disabled={isBusy} onClick={saveEdit} className="relative overflow-hidden w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_8px_16px_-6px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-90 transition disabled:opacity-50" title="Save"><Check className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setEditId(null)} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 bg-white/60 backdrop-blur-md border border-white/70 hover:bg-white/90 active:scale-90 transition" title="Cancel"><X className="w-4 h-4" /></button>
                  </>) : (<>
                    <button type="button" disabled={isBusy} onClick={() => startEdit(d)} className={`${GLASS_SM} w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-violet-600 hover:bg-white/80 active:scale-90 transition disabled:opacity-50`} title="Edit"><Edit className="w-4 h-4" /></button>
                    <button type="button" disabled={isBusy} onClick={() => remove(d)} className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-600 bg-rose-50/80 border border-rose-200/80 hover:bg-rose-100/80 active:scale-90 transition disabled:opacity-50" title="Delete"><Trash className="w-4 h-4" /></button>
                  </>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}