// app/src/app/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listNotifications, markRead, markAllRead, metaFor, notifHref, type Notif } from '@/utils/supabase/notifications';
import { NotifGlyph } from '@/components/NotifGlyph';

const NEU = 'bg-[#edf0fa] shadow-[10px_10px_24px_rgba(163,170,205,0.42),-10px_-10px_24px_rgba(255,255,255,0.95)]';
const NEU_SM = 'bg-[#edf0fa] shadow-[6px_6px_14px_rgba(163,170,205,0.38),-6px_-6px_14px_rgba(255,255,255,0.9)]';
const INSET = 'bg-[#e4e8f4] shadow-[inset_5px_5px_11px_rgba(163,170,205,0.38),inset_-5px_-5px_11px_rgba(255,255,255,0.85)]';
const GLASS = 'bg-white/55 backdrop-blur-xl border border-white/70 shadow-[0_10px_34px_rgba(110,120,190,0.2)]';
const GLASS_SM = 'bg-white/45 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(110,120,190,0.18),inset_0_1px_0_rgba(255,255,255,0.65)]';
const SHEEN = 'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:via-white/5 before:to-transparent';
const GRAD = 'from-indigo-500 via-violet-500 to-fuchsia-500';
const GRAD_TEXT = 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent';
const PILL_ACTIVE = `relative overflow-hidden bg-gradient-to-r ${GRAD} text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.75)] ${SHEEN}`;

function Well({ gradient, children, size = 'md' }: { gradient: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  return (<div className={`relative overflow-hidden ${size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-11 h-11 rounded-2xl'} bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_-8px_rgba(80,90,180,0.65),inset_0_1px_0_rgba(255,255,255,0.55)]`}><span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent" /><span className="relative flex items-center justify-center">{children}</span></div>);
}

function Bar() { 
  return <div className={`mt-2.5 h-1.5 w-20 rounded-full bg-gradient-to-r ${GRAD} shadow-[0_0_14px_rgba(139,92,246,0.65)]`} />; 
}

function fmtRel(ts: string) {
  const d = new Date(ts).getTime(); 
  if (isNaN(d)) return '—';
  const s = Math.floor((Date.now() - d) / 1000); 
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); 
  if (m < 60) return `${m}m ago`; 
  const h = Math.floor(m / 60); 
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24); 
  if (dd < 30) return `${dd}d ago`; 
  return new Date(ts).toLocaleDateString();
}

function BellIcon({ className }: { className?: string }) { 
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" /></svg>); 
}

function AlertTriangle({ className }: { className?: string }) { 
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>); 
}

function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  function load() {
    setLoading(true); 
    setError(null);
    listNotifications(60)
      .then(setItems)
      .catch((e: any) => setError(e?.message ?? 'Could not load notifications.'))
      .finally(() => setLoading(false));
  }
  
  useEffect(() => { 
    load(); 
  }, []);

  const unread = items.filter((n) => !n.is_read).length;
  const shown = filter === 'unread' ? items.filter((n) => !n.is_read) : items;

  function onRow(n: Notif) { 
    if (!n.is_read) { 
      setItems((p) => p.map((x) => x.notification_id === n.notification_id ? { ...x, is_read: true } : x)); 
      markRead(n.notification_id).catch(() => {}); 
    } 
  }
  
  async function onMarkAll() { 
    await markAllRead().catch(() => {}); 
    setItems((p) => p.map((x) => ({ ...x, is_read: true }))); 
  }

  return (
    <main className="min-h-screen bg-[#e8ecf8] relative overflow-x-hidden">
      <div className="pointer-events-none fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/30 blur-3xl z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sky-300/25 blur-3xl z-0" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full bg-fuchsia-300/20 blur-3xl z-0" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7 animate-fade-in-up">
          <div>
            <p className={`text-[11px] font-black uppercase tracking-[0.25em] ${GRAD_TEXT} mb-2`}>Your activity</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800">Notifications</h1>
            <Bar />
            <p className="mt-3 text-sm text-slate-500">{unread > 0 ? `${unread} unread update${unread === 1 ? '' : 's'}.` : 'You\'re all caught up.'}</p>
          </div>
          <Link href="/" className={`${GLASS_SM} px-5 py-2.5 rounded-full text-sm font-bold text-slate-600 hover:text-violet-600 hover:bg-white/70 transition active:scale-95 whitespace-nowrap`}> Back home</Link>
        </div>

        <div className="flex items-center gap-2 mb-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <button type="button" onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition active:scale-95 ${filter === 'all' ? PILL_ACTIVE : `${NEU_SM} text-slate-600 hover:text-violet-600`}`}>
            <span className="relative">All ({items.length})</span>
          </button>
          <button type="button" onClick={() => setFilter('unread')} className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition active:scale-95 ${filter === 'unread' ? PILL_ACTIVE : `${NEU_SM} text-slate-600 hover:text-violet-600`}`}>
            <span className="relative">Unread ({unread})</span>
          </button>
          {unread > 0 && (
            <button type="button" onClick={onMarkAll} className={`ml-auto relative overflow-hidden px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r ${GRAD} shadow-[0_8px_18px_-8px_rgba(124,58,237,0.7)] hover:brightness-110 active:scale-95 transition ${SHEEN}`}>
              <span className="relative">Mark all read</span>
            </button>
          )}
        </div>

        {error ? (
          <div className={`${GLASS} rounded-3xl p-4 flex items-center gap-3`}>
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-sm font-semibold text-rose-700 flex-1">{error}</p>
            <button type="button" onClick={load} className="px-3 py-1.5 rounded-full bg-white/80 text-xs font-bold text-rose-600 hover:bg-white transition">Retry</button>
          </div>
        ) : loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => <div key={i} className={`h-24 rounded-2xl ${INSET} animate-pulse`} />)}
          </div>
        ) : shown.length === 0 ? (
          <div className={`${NEU} rounded-3xl p-14 text-center`}>
            <div className={`w-16 h-16 mx-auto rounded-3xl ${INSET} text-violet-300 flex items-center justify-center mb-4`}>
              <BellIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              When a moderator acts on your review, a publisher decision is made, or your account status changes, you'll see it here and in the bell up top.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shown.map((n, i) => {
              const m = metaFor(n.type);
              return (
                <Link 
                  key={n.notification_id} 
                  href={notifHref(n)} 
                  onClick={() => onRow(n)}
                  className={`${n.is_read ? NEU_SM : `${GLASS} ring-1 ring-violet-200/70`} rounded-2xl p-4 flex items-start gap-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[10px_10px_24px_rgba(163,170,205,0.5)] active:scale-[0.99] animate-fade-in-up`}
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                >
                  <Well gradient={m.grad}>
                    <NotifGlyph type={n.type} />
                  </Well>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm truncate ${n.is_read ? 'font-bold text-slate-600' : 'font-black text-slate-800'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.9)]" />}
                      <span className={`ml-auto shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        m.tone === 'rose' ? 'bg-rose-50/80 border border-rose-200/80 text-rose-600' : 
                        m.tone === 'amber' ? 'bg-amber-50/80 border border-amber-200/80 text-amber-600' : 
                        m.tone === 'emerald' ? 'bg-emerald-50/80 border border-emerald-200/80 text-emerald-600' : 
                        m.tone === 'sky' ? 'bg-sky-50/80 border border-sky-200/80 text-sky-600' : 
                        'bg-slate-100/80 border border-slate-200/80 text-slate-500'
                      }`}>
                        {m.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed mt-1">{n.message}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1.5">{fmtRel(n.created_at)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default NotificationsPage;