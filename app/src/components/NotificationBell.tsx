// app/src/components/NotificationBell.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { listNotifications, unreadCount, markRead, markAllRead, getCurrentUid, metaFor, notifHref, type Notif } from '@/utils/supabase/notifications';
import { NotifGlyph } from '@/components/NotifGlyph';

const GLASS = 'bg-white/100 backdrop-blur-xl border border-white/20 shadow-[0_10px_34px_rgba(110,120,190,0.2)]';
const GLASS_SM = 'bg-white/45 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(110,120,190,0.18),inset_0_1px_0_rgba(255,255,255,0.65)]';
const INSET = 'bg-[#e4e8f4] shadow-[inset_5px_5px_11px_rgba(163,170,205,0.38),inset_-5px_-5px_11px_rgba(255,255,255,0.85)]';
const NEU_SM = 'bg-[#edf0fa] shadow-[6px_6px_14px_rgba(163,170,205,0.38),-6px_-6px_14px_rgba(255,255,255,0.9)]';
const GRAD = 'from-indigo-500 via-violet-500 to-fuchsia-500';
const SHEEN = 'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:via-white/5 before:to-transparent';

function Well({ gradient, children }: { gradient: string; children: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-[0_8px_18px_-8px_rgba(80,90,180,0.65),inset_0_1px_0_rgba(255,255,255,0.55)]`}>
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent" />
      <span className="relative flex items-center justify-center">{children}</span>
    </div>
  );
}

function fmtRel(ts: string) {
  const d = new Date(ts).getTime(); if (isNaN(d)) return '—';
  const s = Math.floor((Date.now() - d) / 1000); if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24); if (dd < 30) return `${dd}d ago`; return new Date(ts).toLocaleDateString();
}

function BellIcon({ className }: { className?: string }) { 
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" /></svg>); 
}

// 👇 THIS IS THE CRITICAL LINE THAT FIXES THE ERROR 👇
export default function NotificationBell() {
  const supabase = createClient();
  const pathname = usePathname();
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    setLoading(true);
    Promise.all([listNotifications(25).catch(() => [] as Notif[]), unreadCount().catch(() => 0)])
      .then(([l, u]) => { setItems(l); setUnread(u); })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let alive = true;
    getCurrentUid().then((u) => { if (alive) setUid(u); });
    const { data: sub } = supabase.auth.onAuthStateChange(() => { getCurrentUid().then((u) => { if (alive) setUid(u); }); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!uid) return;
    load();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    try {
      ch = supabase.channel('notif:' + uid)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => load())
        .subscribe();
    } catch {}
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('focus', onFocus); try { ch && supabase.removeChannel(ch); } catch {} };
  }, [uid]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (uid === undefined) return <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" aria-hidden />;
  if (uid === null) return null;

  function onClickRow(n: Notif) {
    if (!n.is_read) { setItems((p) => p.map((x) => x.notification_id === n.notification_id ? { ...x, is_read: true } : x)); setUnread((c) => Math.max(0, c - 1)); markRead(n.notification_id).catch(() => {}); }
  }
  async function onMarkAll() { await markAllRead().catch(() => {}); setItems((p) => p.map((x) => ({ ...x, is_read: true }))); setUnread(0); }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className={`relative w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-95 ${open ? 'bg-white border-violet-200 shadow-md ring-2 ring-violet-50 text-violet-600' : 'bg-white/80 border-slate-200 text-slate-500 hover:text-violet-600 hover:border-slate-300 hover:shadow-md'}`}
      >
        <BellIcon className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-[0_0_0_0_rgba(244,63,94,0.6)] animate-[pulse_1.8s_ease-in-out_infinite]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] ${GLASS} rounded-2xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3)] border border-white/40 py-2 z-50 origin-top-right animate-fade-in`}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/50">
            <p className="text-sm font-black text-slate-800">Notifications {unread > 0 && <span className="text-violet-500">· {unread} new</span>}</p>
            {unread > 0 && <button type="button" onClick={onMarkAll} className="text-[11px] font-bold text-violet-600 hover:text-violet-700 transition">Mark all read</button>}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="space-y-1 p-2">{[0, 1, 2].map((i) => <div key={i} className={`h-16 rounded-xl ${INSET} animate-pulse`} />)}</div>
            ) : items.length === 0 ? (
              <div className="text-center py-10">
                <div className={`w-12 h-12 mx-auto rounded-2xl ${INSET} text-violet-300 flex items-center justify-center mb-2`}><BellIcon className="w-6 h-6" /></div>
                <p className="text-sm font-bold text-slate-500">You're all caught up</p>
                <p className="text-xs text-slate-400 mt-0.5">Updates on your reviews, trips and account appear here.</p>
              </div>
            ) : (
              items.map((n) => {
                const m = metaFor(n.type);
                return (
                  <Link
                    key={n.notification_id}
                    href={notifHref(n)}
                    onClick={() => onClickRow(n)}
                    className={`flex items-start gap-3 px-3.5 py-3 mx-1.5 my-0.5 rounded-xl transition group ${n.is_read ? 'hover:bg-white/50' : `${NEU_SM} hover:shadow-md`}`}
                  >
                    <Well gradient={m.grad}><NotifGlyph type={n.type} className="w-[18px] h-[18px]" /></Well>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-[13px] truncate ${n.is_read ? 'font-semibold text-slate-500' : 'font-black text-slate-800'}`}>{n.title}</p>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 shadow-[0_0_8px_rgba(139,92,246,0.9)]" />}
                      </div>
                      <p className="text-xs text-slate-500 leading-snug mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-1">{m.label} · {fmtRel(n.created_at)}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div className="px-3 pt-2 border-t border-white/50">
            <Link href="/notifications" onClick={() => setOpen(false)} className={`block text-center py-2.5 rounded-xl text-xs font-black bg-gradient-to-r ${GRAD} text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,0.7)] hover:brightness-110 active:scale-[0.98] transition ${SHEEN}`}>
              <span className="relative">View all notifications</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}