// app/src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useSuperuser } from '@/utils/supabase/useSuperuser';
import {
  getAuditLogs,
  listUsers, setUserStatus, type AdminUser,
  listListings, setListingModeration, softRemoveListing, hardDeleteListing, type AdminListing,
  listReviews, flagReview, deleteReview, type AdminReview,
} from '@/utils/supabase/admin';
import AdminReviews from '@/components/AdminReviews';
import AdminApplications from '@/components/AdminApplications';
import AdminDestinations from '@/components/AdminDestinations';

/* ─────────  Neumorphic + Glass tokens (identical to Business Hub)  ───────── */
const NEU = 'bg-[#edf0fa] shadow-[10px_10px_24px_rgba(163,170,205,0.42),-10px_-10px_24px_rgba(255,255,255,0.95)]';
const NEU_SM = 'bg-[#edf0fa] shadow-[6px_6px_14px_rgba(163,170,205,0.38),-6px_-6px_14px_rgba(255,255,255,0.9)]';
const NEU_HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:shadow-[14px_14px_32px_rgba(163,170,205,0.5),-14px_-14px_32px_rgba(255,255,255,1)]';
const INSET = 'bg-[#e4e8f4] shadow-[inset_5px_5px_11px_rgba(163,170,205,0.38),inset_-5px_-5px_11px_rgba(255,255,255,0.85)]';
const GLASS = 'bg-white/55 backdrop-blur-xl border border-white/70 shadow-[0_10px_34px_rgba(110,120,190,0.2)]';
const GLASS_SM = 'bg-white/45 backdrop-blur-md border border-white/60 shadow-[0_4px_16px_rgba(110,120,190,0.18),inset_0_1px_0_rgba(255,255,255,0.65)]';
const SHEEN = 'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:via-white/5 before:to-transparent';
const GRAD = 'from-indigo-500 via-violet-500 to-fuchsia-500';
const GRAD_TEXT = 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent';
const GLOSS = 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(70,80,150,0.25)]';
const PILL_ACTIVE = `relative overflow-hidden bg-gradient-to-r ${GRAD} text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.75)] ${SHEEN}`;
const FIELD = 'w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none';

type Tab = 'overview' | 'users' | 'listings' | 'reviews' | 'applications' | 'destinations' | 'audit';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'listings', label: 'Listings' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'applications', label: 'Applications' },
  { id: 'destinations', label: 'Destinations' },
  { id: 'audit', label: 'Audit log' },
];

/* ─────────  Icons  ───────── */
function Shield({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Users({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" /></svg>); }
function Store({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M4 10v10h16V10" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 6l1.5-3h15L21 6c0 1.7-1.3 3-3 3s-3-1.3-3-3c0 1.7-1.3 3-3 3S9 7.7 9 6c0 1.7-1.3 3-3 3S3 7.7 3 6z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 20v-6h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Message({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Flag({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round" /><line x1="4" y1="22" x2="4" y2="15" /></svg>); }
function AlertTriangle({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>); }
function Inbox({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Globe({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Camera({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="13.5" r="3.5" /></svg>); }
function Scroll({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}><path d="M8 3H6a2 2 0 00-2 2v14a2 2 0 002 2h2M16 3h2a2 2 0 012 2v14a2 2 0 01-2 2h-2M9 8h6M9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Lock({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" /></svg>); }
function Search({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>); }
function Trash({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Eye({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>); }
function EyeOff({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-3.5 h-3.5'}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function Pause({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-3.5 h-3.5'}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>); }
function Ban({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-3.5 h-3.5'}><circle cx="12" cy="12" r="9" /><line x1="5.6" y1="5.6" x2="18.4" y2="18.4" strokeLinecap="round" /></svg>); }
function Check({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className ?? 'w-3.5 h-3.5'}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>); }
function X({ className }: { className?: string }) { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-5 h-5'}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>); }
function Star({ className, filled }: { className?: string; filled?: boolean }) { return (<svg viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={className ?? 'w-4 h-4'}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" /></svg>); }

function GlassWellIcon({ gradient, children, size = 'md' }: { gradient: string; children: React.ReactNode; size?: 'md' | 'lg' }) {
  return (
    <div className={`relative overflow-hidden ${size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-12 h-12 rounded-2xl'} bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_-8px_rgba(80,90,180,0.65),inset_0_1px_0_rgba(255,255,255,0.55)]`}>
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent" />
      <span className="relative flex items-center justify-center">{children}</span>
    </div>
  );
}
function AccentBar() { return <div className={`mt-2.5 h-1.5 w-20 rounded-full bg-gradient-to-r ${GRAD} shadow-[0_0_14px_rgba(139,92,246,0.65)]`} />; }

function fmtRel(ts: string | null) {
  if (!ts) return '—';
  const d = new Date(ts).getTime(); if (isNaN(d)) return '—';
  const s = Math.floor((Date.now() - d) / 1000); if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24); if (dd < 30) return `${dd}d ago`;
  return new Date(ts).toLocaleDateString();
}

function StatTile({ label, value, gradient, icon, badge, badgeTone }: { label: string; value: number | string; gradient: string; icon: React.ReactNode; badge?: string; badgeTone?: string }) {
  return (
    <div className={`${NEU} ${NEU_HOVER} rounded-3xl p-6`}>
      <div className="flex items-start justify-between mb-4">
        <GlassWellIcon gradient={gradient}>{icon}</GlassWellIcon>
        {badge && <span className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-black ${badgeTone ?? 'bg-white/60 border-white/70 text-slate-500'}`}>{badge}</span>}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-800">{value}</p>
    </div>
  );
}
function HealthBar({ label, pct, value, grad }: { label: string; pct: number | null; value: string; grad: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-bold text-slate-500">{label}</span><span className="text-xs font-black text-slate-700">{value}</span></div>
      <div className={`${INSET} h-3 rounded-full overflow-hidden`}><div className={`h-full rounded-full transition-all duration-700 ${GLOSS} ${grad}`} style={{ width: `${pct ?? 0}%` }} /></div>
    </div>
  );
}

function actionTone(action: string): { grad: string; verb: string } {
  if (action.startsWith('user.')) return { grad: 'from-indigo-500 to-violet-500', verb: action.replace('user.', 'User ') };
  if (action.startsWith('listing.')) return { grad: 'from-sky-500 to-indigo-500', verb: action.replace('listing.', 'Listing ') };
  if (action.startsWith('review.')) return { grad: 'from-amber-500 to-orange-500', verb: action.replace('review.', 'Review ') };
  if (action.startsWith('application.')) return { grad: 'from-emerald-500 to-teal-500', verb: action.replace('application.', 'Application ') };
  if (action.startsWith('destination.')) return { grad: 'from-fuchsia-500 to-purple-500', verb: action.replace('destination.', 'Destination ') };
  return { grad: 'from-slate-500 to-slate-600', verb: action };
}
function AuditRow({ r }: { r: AuditRowT }) {
  const t = actionTone(r.action);
  const reason = r.detail?.reason || r.detail?.note || null;
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl hover:bg-white/50 transition">
      <GlassWellIcon gradient={t.grad}><span className="w-12 h-12 flex items-center justify-center"><Scroll className="w-5 h-5" /></span></GlassWellIcon>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800 truncate capitalize">{t.verb.replace(/[._]/g, ' ')}</p>
        <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{r.target_table ?? '—'} · {r.target_id ?? '—'}</p>
        {reason && <p className="text-xs text-slate-500 mt-1 italic truncate">“{reason}”</p>}
      </div>
      <div className="text-right shrink-0"><p className="text-[11px] font-bold text-slate-500">{fmtRel(r.created_at)}</p><p className="text-[10px] font-semibold text-violet-500 truncate max-w-[7rem]">{r.admin_name}</p></div>
    </div>
  );
}
function StubPanel({ icon, gradient, title, blurb, move }: { icon: React.ReactNode; gradient: string; title: string; blurb: string; move: string }) {
  return (
    <div className={`${NEU} rounded-3xl p-14 text-center animate-fade-in`}>
      <GlassWellIcon gradient={gradient} size="lg">{icon}</GlassWellIcon>
      <h3 className="text-xl font-black text-slate-800 mt-5 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">{blurb}</p>
      <span className={`inline-flex items-center gap-1.5 mt-6 px-4 py-2 rounded-full ${GLASS_SM} text-xs font-black uppercase tracking-widest text-violet-600`}><Lock className="w-3.5 h-3.5" /> Arrives in {move}</span>
    </div>
  );
}

/* small shared UI for the live tabs */
function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className={`${INSET} flex items-center gap-2 rounded-2xl px-4 py-2.5 flex-1 min-w-[12rem]`}>
      <Search className="w-4 h-4 text-slate-400 shrink-0" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={FIELD} />
    </div>
  );
}
function Chip({ active, onClick, children, tone }: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: 'rose' | 'amber' }) {
  const activeCls = tone === 'rose' ? 'relative overflow-hidden bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_8px_18px_-6px_rgba(244,63,94,0.7)]'
    : tone === 'amber' ? 'relative overflow-hidden bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_8px_18px_-6px_rgba(245,158,11,0.7)]'
    : PILL_ACTIVE;
  return <button type="button" onClick={onClick} className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-200 active:scale-95 ${active ? activeCls : `${NEU_SM} text-slate-600 hover:text-violet-600`}`}><span className="relative flex items-center gap-1.5">{children}</span></button>;
}
function ErrBanner({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="m-2 p-4 rounded-2xl bg-rose-50/90 backdrop-blur-md border border-rose-200 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
      <p className="text-sm font-semibold text-rose-700 flex-1">{msg}</p>
      <button type="button" onClick={onRetry} className="px-3 py-1.5 rounded-full bg-white/80 text-xs font-bold text-rose-600 hover:bg-white transition">Retry</button>
    </div>
  );
}
function SkeletonRows({ n = 5 }: { n?: number }) {
  return <div className="space-y-2 p-2">{Array.from({ length: n }).map((_, i) => <div key={i} className={`h-16 rounded-2xl ${INSET} animate-pulse`} />)}</div>;
}
function EmptyBox({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="text-center py-14">
      <div className={`w-14 h-14 mx-auto rounded-2xl ${INSET} text-violet-300 flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-sm font-bold text-slate-500">{title}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

const userStatusTone = (s: string) =>
  s === 'banned' ? { grad: 'from-rose-400 to-red-500', badge: 'bg-rose-50/80 border-rose-200/80 text-rose-600', label: 'Banned' }
  : s === 'suspended' ? { grad: 'from-amber-400 to-orange-500', badge: 'bg-amber-50/80 border-amber-200/80 text-amber-600', label: 'Suspended' }
  : { grad: 'from-emerald-400 to-teal-500', badge: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-600', label: 'Active' };

type Overview = { usersTotal: number; usersInactive: number; listingsTotal: number; listingsHidden: number; reviewsTotal: number; reviewsFlagged: number; reviewsCritical: number; appsTotal: number; appsPending: number; appsApproved: number; photosTotal: number; };
const OV0: Overview = { usersTotal: 0, usersInactive: 0, listingsTotal: 0, listingsHidden: 0, reviewsTotal: 0, reviewsFlagged: 0, reviewsCritical: 0, appsTotal: 0, appsPending: 0, appsApproved: 0, photosTotal: 0 };
type AuditRowT = { log_id: number; action: string; target_table: string | null; target_id: string | null; detail: any; created_at: string; admin_name: string };

export default function AdminPage() {
  const su = useSuperuser();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [pulse, setPulse] = useState(0);

  const [ov, setOv] = useState<Overview>(OV0);
  const [ovLoading, setOvLoading] = useState(true);
  const [audit, setAudit] = useState<AuditRowT[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  // live datasets
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErr, setUsersErr] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const [listings, setListings] = useState<AdminListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsErr, setListingsErr] = useState<string | null>(null);
  const [listingSearch, setListingSearch] = useState('');
  const [listingType, setListingType] = useState('All');

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsErr, setReviewsErr] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'flagged' | 'critical'>('all');
  const [reviewSearch, setReviewSearch] = useState('');

  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ k: 'ok' | 'err'; m: string } | null>(null);
  const [flagTarget, setFlagTarget] = useState<AdminReview | null>(null);
  const [flagReason, setFlagReason] = useState('');

  /* ── Overview head-counts (gated: non-super fires ZERO queries) ─ */
  useEffect(() => {
    if (su.loading || !su.isSuperadmin) return;
    let alive = true; setOvLoading(true);
    const c = (tbl: string, filt?: (q: any) => any) => { let q = supabase.from(tbl).select('*', { count: 'exact', head: true }); if (filt) q = filt(q); return q; };
    Promise.all([
      c('app_users'), c('app_users', (q) => q.neq('status', 'active')),
      c('listings'), c('listings', (q) => q.eq('is_visible', false)),
      c('reviews'), c('reviews', (q) => q.eq('flagged', true)), c('reviews', (q) => q.lte('rating', 2)),
      c('business_applications'), c('business_applications', (q) => q.eq('status', 'pending')), c('business_applications', (q) => q.eq('status', 'approved')),
      c('photos'),
    ]).then(([uT, uI, lT, lH, rT, rF, rC, aT, aP, aA, ph]) => {
      if (!alive) return; const n = (r: any) => r?.count ?? 0;
      setOv({ usersTotal: n(uT), usersInactive: n(uI), listingsTotal: n(lT), listingsHidden: n(lH), reviewsTotal: n(rT), reviewsFlagged: n(rF), reviewsCritical: n(rC), appsTotal: n(aT), appsPending: n(aP), appsApproved: n(aA), photosTotal: n(ph) });
      setOvLoading(false);
    }).catch(() => { if (alive) setOvLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [su.loading, su.isSuperadmin, pulse]);

  /* ── Audit feed ─ */
  useEffect(() => {
    if (su.loading || !su.isSuperadmin) return;
    let alive = true; setAuditLoading(true);
    getAuditLogs(20).then((rows) => { if (alive) setAudit(rows as AuditRowT[]); }).catch(() => { if (alive) setAudit([]); }).finally(() => { if (alive) setAuditLoading(false); });
    return () => { alive = false; };
  }, [su.loading, su.isSuperadmin, pulse, tab]);

  /* ── Lazy per-tab datasets (only fetch when that tab is open) ── */
  useEffect(() => {
    if (su.loading || !su.isSuperadmin || tab !== 'users') return;
    let alive = true; setUsersLoading(true); setUsersErr(null);
    listUsers().then((r) => { if (alive) setUsers(r); }).catch((e) => { if (alive) setUsersErr(e?.message ?? 'Could not load users.'); }).finally(() => { if (alive) setUsersLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [su.loading, su.isSuperadmin, tab, pulse]);

  useEffect(() => {
    if (su.loading || !su.isSuperadmin || tab !== 'listings') return;
    let alive = true; setListingsLoading(true); setListingsErr(null);
    listListings('', 'All').then((r) => { if (alive) setListings(r); }).catch((e) => { if (alive) setListingsErr(e?.message ?? 'Could not load listings.'); }).finally(() => { if (alive) setListingsLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [su.loading, su.isSuperadmin, tab, pulse]);

  useEffect(() => {
    if (su.loading || !su.isSuperadmin || tab !== 'reviews') return;
    let alive = true; setReviewsLoading(true); setReviewsErr(null);
    listReviews('all', '').then((r) => { if (alive) setReviews(r); }).catch((e) => { if (alive) setReviewsErr(e?.message ?? 'Could not load reviews.'); }).finally(() => { if (alive) setReviewsLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [su.loading, su.isSuperadmin, tab, pulse]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2800); return () => clearTimeout(t); }, [toast]);

  /* ─ guards (after all hooks) ── */
  if (su.loading) {
    return (
      <main className="min-h-screen bg-[#e8ecf8] flex items-center justify-center">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto rounded-full ${INSET} flex items-center justify-center`}><div className="w-9 h-9 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" /></div>
          <p className="mt-5 text-sm font-medium text-slate-400">Verifying superuser clearance…</p>
        </div>
      </main>
    );
  }
  if (!su.isSuperadmin) {
    return (
      <main className="min-h-screen bg-[#e8ecf8] relative overflow-x-hidden flex items-center justify-center p-8">
        <div className="pointer-events-none fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/30 blur-3xl z-0" />
        <div className={`relative z-10 ${NEU} rounded-3xl p-10 max-w-md text-center`}>
          <GlassWellIcon gradient="from-rose-500 to-red-500" size="lg"><Shield className="w-7 h-7" /></GlassWellIcon>
          <h1 className="text-2xl font-black text-slate-800 mt-5 mb-2">Restricted zone</h1>
          <p className="text-slate-500 text-sm leading-relaxed">This console is for platform superusers only. Your account isn’t on the <code className="font-mono text-violet-600">administrators</code> whitelist.</p>
          <Link href="/" className={`inline-flex mt-7 px-6 py-3 rounded-full bg-gradient-to-r ${GRAD} text-white text-sm font-bold shadow-[0_12px_26px_-10px_rgba(124,58,237,0.8)] hover:brightness-110 transition ${SHEEN}`}><span className="relative">Return to TravelMate</span></Link>
        </div>
      </main>
    );
  }

  /* ── mutation helper: toast + pulse on success, contained error on fail ── */
  async function act(key: string, fn: () => Promise<void>, ok: string) {
    setBusy(key);
    try { await fn(); setToast({ k: 'ok', m: ok }); setPulse((p) => p + 1); }
    catch (e: any) { setToast({ k: 'err', m: e?.message ?? 'Action failed.' }); }
    finally { setBusy(null); }
  }

  const activeUsers = ov.usersTotal - ov.usersInactive;
  const visibleListings = ov.listingsTotal - ov.listingsHidden;
  const cleanReviews = ov.reviewsTotal - ov.reviewsFlagged;
  const visPct = ov.listingsTotal ? Math.round((visibleListings / ov.listingsTotal) * 100) : null;
  const cleanPct = ov.reviewsTotal ? Math.round((cleanReviews / ov.reviewsTotal) * 100) : null;
  const apprPct = ov.appsTotal ? Math.round((ov.appsApproved / ov.appsTotal) * 100) : null;
  const adminName = su.profile?.full_name || su.profile?.email || 'Superuser';
  const level = su.profile?.role_level ?? 'superuser';

  const shownUsers = users.filter(u => !userSearch.trim() || `${u.name ?? ''} ${u.email ?? ''} ${u.user_id}`.toLowerCase().includes(userSearch.trim().toLowerCase()));
  const shownListings = listings.filter(l => (listingType === 'All' || l.listing_type === listingType) && (!listingSearch.trim() || `${l.name} ${l.listing_id}`.toLowerCase().includes(listingSearch.trim().toLowerCase())));
  const shownReviews = reviews.filter(r => (reviewFilter === 'all' ? true : reviewFilter === 'flagged' ? r.flagged : r.rating <= 2) && (!reviewSearch.trim() || `${r.title ?? ''} ${r.review_text ?? ''} ${r.user_name ?? ''}`.toLowerCase().includes(reviewSearch.trim().toLowerCase())));

  return (
    <main className="min-h-screen bg-[#e8ecf8] relative overflow-x-hidden">
      <div className="pointer-events-none fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/30 blur-3xl z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sky-300/25 blur-3xl z-0" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full bg-fuchsia-300/20 blur-3xl z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
                {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-start gap-5 mb-7 animate-fade-in-up">
          <div>
            <p className={`text-[11px] font-black uppercase tracking-[0.25em] ${GRAD_TEXT} mb-2`}>Root access · {level}</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-800">Superuser console</h1>
            <AccentBar />
            <p className="mt-3 text-sm text-slate-500">
              Signed in as <span className="font-bold text-slate-700">{adminName}</span> — unrestricted control over every record on TravelMate.
            </p>
          </div>
        </div>

        {/* Authority banner */}
        <div className={`${GLASS} rounded-3xl p-5 mb-8 flex items-center gap-4 animate-fade-in-up`} style={{ animationDelay: '40ms' }}>
          <GlassWellIcon gradient="from-indigo-500 to-violet-500"><Shield className="w-6 h-6" /></GlassWellIcon>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-800">You hold platform-wide write access</p>
            <p className="text-sm text-slate-500 mt-0.5">Ban users, unpublish or hard-delete listings, moderate reviews, approve publishers, edit destinations. <span className="font-semibold text-violet-600">Every action is written to the audit log.</span></p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2.5 mb-9 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            const dot = t.id === 'applications' && ov.appsPending > 0 ? ov.appsPending
              : t.id === 'reviews' && ov.reviewsFlagged > 0 ? ov.reviewsFlagged
              : t.id === 'users' && ov.usersInactive > 0 ? ov.usersInactive
              : t.id === 'listings' && ov.listingsHidden > 0 ? ov.listingsHidden : 0;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black tracking-wide transition-all duration-300 active:scale-95 ${active ? PILL_ACTIVE : `${NEU_SM} text-slate-600 hover:text-violet-600`}`}>
                <span className="relative">{t.label}</span>
                {dot > 0 && <span className={`relative min-w-[1.3rem] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${active ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-600'}`}>{dot}</span>}
              </button>
            );
          })}
        </div>

        {/* ═══════ OVERVIEW ═══════ */}
        {tab === 'overview' && (
          <div className="animate-fade-in space-y-9">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}><StatTile label="Total users" value={ov.usersTotal} gradient="from-indigo-500 to-violet-500" icon={<Users className="w-6 h-6" />} badge={ov.usersInactive > 0 ? `${ov.usersInactive} restricted` : 'all active'} badgeTone={ov.usersInactive > 0 ? 'bg-rose-50/80 border-rose-200/80 text-rose-600' : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-600'} /></div>
              <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}><StatTile label="Active listings" value={visibleListings} gradient="from-sky-500 to-indigo-500" icon={<Store className="w-6 h-6" />} badge={ov.listingsHidden > 0 ? `${ov.listingsHidden} hidden` : 'all live'} badgeTone={ov.listingsHidden > 0 ? 'bg-amber-50/80 border-amber-200/80 text-amber-600' : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-600'} /></div>
              <div className="animate-fade-in-up" style={{ animationDelay: '180ms' }}><StatTile label="Total reviews" value={ov.reviewsTotal} gradient="from-emerald-500 to-teal-500" icon={<Message className="w-6 h-6" />} badge={`${ov.photosTotal} photos`} /></div>
              <div className="animate-fade-in-up" style={{ animationDelay: '240ms' }}><StatTile label="Flagged reviews" value={ov.reviewsFlagged} gradient="from-rose-500 to-red-500" icon={<Flag className="w-6 h-6" />} badge={ov.reviewsCritical > 0 ? `${ov.reviewsCritical} critical` : 'clear'} badgeTone={ov.reviewsCritical > 0 ? 'bg-rose-50/80 border-rose-200/80 text-rose-600' : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-600'} /></div>
              <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}><StatTile label="Pending applications" value={ov.appsPending} gradient="from-amber-400 to-orange-500" icon={<Inbox className="w-6 h-6" />} badge={ov.appsPending > 0 ? 'needs review' : 'queue empty'} badgeTone={ov.appsPending > 0 ? 'bg-amber-50/80 border-amber-200/80 text-amber-600' : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-600'} /></div>
              <div className="animate-fade-in-up" style={{ animationDelay: '360ms' }}><StatTile label="Approved publishers" value={ov.appsApproved} gradient="from-fuchsia-500 to-purple-500" icon={<Shield className="w-6 h-6" />} /></div>
              <div className="animate-fade-in-up" style={{ animationDelay: '420ms' }}><StatTile label="Critical reviews" value={ov.reviewsCritical} gradient="from-orange-500 to-red-500" icon={<AlertTriangle className="w-6 h-6" />} badge="≤ 2 ★" /></div>
              <div className="animate-fade-in-up" style={{ animationDelay: '480ms' }}><StatTile label="Media assets" value={ov.photosTotal} gradient="from-cyan-500 to-sky-500" icon={<Camera className="w-6 h-6" />} /></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${GLASS} rounded-3xl p-7`}>
                <h2 className="text-lg font-black text-slate-800">Platform health</h2><AccentBar />
                {ovLoading ? (<div className="space-y-5 mt-6 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className={`h-3 rounded-full ${INSET}`} />)}</div>) : (
                  <div className="space-y-5 mt-6">
                    <HealthBar label="Listings visible" pct={visPct} value={visPct == null ? '—' : `${visPct}%`} grad="bg-gradient-to-r from-sky-400 to-indigo-400" />
                    <HealthBar label="Reviews clean (unflagged)" pct={cleanPct} value={cleanPct == null ? '—' : `${cleanPct}%`} grad="bg-gradient-to-r from-emerald-400 to-teal-400" />
                    <HealthBar label="Publisher approval rate" pct={apprPct} value={apprPct == null ? '—' : `${apprPct}%`} grad="bg-gradient-to-r from-fuchsia-400 to-purple-400" />
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className={`${INSET} rounded-2xl p-3 text-center`}><p className="text-lg font-black text-slate-700">{activeUsers}</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Active</p></div>
                      <div className={`${INSET} rounded-2xl p-3 text-center`}><p className="text-lg font-black text-rose-500">{ov.usersInactive}</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Restricted</p></div>
                      <div className={`${INSET} rounded-2xl p-3 text-center`}><p className="text-lg font-black text-amber-500">{ov.appsPending}</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">In queue</p></div>
                    </div>
                  </div>
                )}
              </div>

              <div className={`${GLASS} rounded-3xl p-7 flex flex-col`}>
                <div className="flex items-center justify-between"><h2 className="text-lg font-black text-slate-800">Recent activity</h2><button type="button" onClick={() => setTab('audit')} className="text-sm font-bold text-violet-600 hover:text-violet-700 transition">Full log →</button></div>
                <AccentBar />
                <div className="mt-5 space-y-1 max-h-[22rem] overflow-y-auto pr-1 -mr-1">
                  {auditLoading ? (<div className="space-y-2 animate-pulse">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-14 rounded-2xl ${INSET}`} />)}</div>)
                    : audit.length === 0 ? (<EmptyBox icon={<Scroll className="w-7 h-7" />} title="No actions logged yet." sub="Your moderation moves will stream here in real time." />)
                    : audit.slice(0, 5).map((r) => <AuditRow key={r.log_id} r={r} />)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ USERS (live) ═══════ */}
        {tab === 'users' && (
          <div className={`${GLASS} rounded-3xl p-6 md:p-7 animate-fade-in`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div><h2 className="text-lg font-black text-slate-800">User management</h2><p className="text-xs text-slate-400 font-semibold mt-0.5">{shownUsers.length} of {users.length} accounts · soft-delete preserves trips & reviews</p></div>
              <SearchField value={userSearch} onChange={setUserSearch} placeholder="Search name, email or ID…" />
            </div>
            {usersErr ? <ErrBanner msg={usersErr} onRetry={() => setPulse((p) => p + 1)} />
              : usersLoading ? <SkeletonRows />
              : shownUsers.length === 0 ? <EmptyBox icon={<Users className="w-7 h-7" />} title="No users match your search." />
              : (
                <div className="space-y-2.5 max-h-[68vh] overflow-y-auto pr-1 -mr-1">
                  {shownUsers.map((u) => {
                    const tone = userStatusTone(u.status); const key = `user:${u.user_id}`; const isBusy = busy === key;
                    return (
                      <div key={u.user_id} className={`${NEU_SM} rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <GlassWellIcon gradient={tone.grad}><span className="w-12 h-12 flex items-center justify-center font-black text-base">{String(u.name ?? 'U').trim().charAt(0).toUpperCase()}</span></GlassWellIcon>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{u.name ?? 'Unnamed'}</p>
                            <p className="text-xs text-slate-400 truncate">{u.email ?? '—'}</p>
                            <p className="text-[10px] text-slate-300 font-mono mt-0.5">{u.user_id}{u.location ? ` · ${u.location}` : ''}{u.sex ? ` · ${u.sex}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <span className="px-2 py-1 rounded-lg bg-violet-50/80 border border-violet-200/70 text-violet-600">{u.listings} listings</span>
                            <span className="px-2 py-1 rounded-lg bg-sky-50/80 border border-sky-200/70 text-sky-600">{u.reviews} reviews</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-black uppercase tracking-wider ${tone.badge}`}>{tone.label}</span>
                          {u.status === 'active' && (<>
                            <button type="button" disabled={isBusy} onClick={() => act(key, () => setUserStatus(u.user_id, 'suspended', 'suspended by superuser'), `${u.name ?? u.user_id} suspended`)} className={`${GLASS_SM} px-3 py-1.5 rounded-full text-xs font-bold text-amber-600 hover:bg-white/80 transition active:scale-95 disabled:opacity-50 flex items-center gap-1`}><Pause className="w-3 h-3" />Suspend</button>
                            <button type="button" disabled={isBusy} onClick={() => { if (confirm(`Ban ${u.name ?? u.user_id}? They will be unable to sign in.`)) act(key, () => setUserStatus(u.user_id, 'banned', 'banned by superuser'), `${u.name ?? u.user_id} banned`); }} className="px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 bg-rose-50/80 backdrop-blur-md border border-rose-200/80 hover:bg-rose-100/80 transition active:scale-95 disabled:opacity-50 flex items-center gap-1"><Ban className="w-3 h-3" />Ban</button>
                          </>)}
                          {u.status === 'suspended' && (<>
                            <button type="button" disabled={isBusy} onClick={() => act(key, () => setUserStatus(u.user_id, 'active', 'reactivated by superuser'), `${u.name ?? u.user_id} reactivated`)} className="px-3 py-1.5 rounded-full text-xs font-bold text-emerald-600 bg-emerald-50/80 backdrop-blur-md border border-emerald-200/80 hover:bg-emerald-100/80 transition active:scale-95 disabled:opacity-50 flex items-center gap-1"><Check className="w-3 h-3" />Reactivate</button>
                            <button type="button" disabled={isBusy} onClick={() => { if (confirm(`Ban ${u.name ?? u.user_id}?`)) act(key, () => setUserStatus(u.user_id, 'banned', 'banned by superuser'), `${u.name ?? u.user_id} banned`); }} className="px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 bg-rose-50/80 backdrop-blur-md border border-rose-200/80 hover:bg-rose-100/80 transition active:scale-95 disabled:opacity-50 flex items-center gap-1"><Ban className="w-3 h-3" />Ban</button>
                          </>)}
                          {u.status === 'banned' && (
                            <button type="button" disabled={isBusy} onClick={() => act(key, () => setUserStatus(u.user_id, 'active', 'unbanned by superuser'), `${u.name ?? u.user_id} reinstated`)} className="px-3 py-1.5 rounded-full text-xs font-bold text-emerald-600 bg-emerald-50/80 backdrop-blur-md border border-emerald-200/80 hover:bg-emerald-100/80 transition active:scale-95 disabled:opacity-50 flex items-center gap-1"><Check className="w-3 h-3" />Reinstate</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        {/* ═══════ LISTINGS (live) ═══════ */}
        {tab === 'listings' && (
          <div className={`${GLASS} rounded-3xl p-6 md:p-7 animate-fade-in`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <div><h2 className="text-lg font-black text-slate-800">Listing management</h2><p className="text-xs text-slate-400 font-semibold mt-0.5">{shownListings.length} of {listings.length} listings platform-wide</p></div>
              <SearchField value={listingSearch} onChange={setListingSearch} placeholder="Search name or ID…" />
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {['All', 'Attraction', 'Hotel', 'Restaurant'].map((t) => <Chip key={t} active={listingType === t} onClick={() => setListingType(t)}>{t}</Chip>)}
            </div>
            {listingsErr ? <ErrBanner msg={listingsErr} onRetry={() => setPulse((p) => p + 1)} />
              : listingsLoading ? <SkeletonRows />
              : shownListings.length === 0 ? <EmptyBox icon={<Store className="w-7 h-7" />} title="No listings match." />
              : (
                <div className="space-y-2.5 max-h-[64vh] overflow-y-auto pr-1 -mr-1">
                  {shownListings.map((l) => {
                    const key = `listing:${l.listing_id}`; const isBusy = busy === key;
                    const removed = l.moderation_status === 'removed';
                    return (
                      <div key={l.listing_id} className={`${NEU_SM} rounded-2xl p-3.5 flex items-center gap-3.5`}>
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-indigo-100 to-violet-100">
                          {l.image_url ? <img src={l.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-violet-300 font-black text-xl">{l.listing_type.charAt(0)}</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-sm truncate">{l.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{l.listing_type} · {l.destination ?? '—'} · by {l.owner_name ?? 'unknown'}</p>
                          <p className="text-[10px] text-slate-300 font-mono mt-0.5">{l.listing_id}{l.average_rating != null ? ` · ★ ${Number(l.average_rating).toFixed(1)}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border backdrop-blur-md ${l.is_visible ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-600' : 'bg-amber-50/80 border-amber-200/80 text-amber-600'}`}>{l.is_visible ? 'Live' : 'Hidden'}</span>
                          {removed && <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50/80 border border-rose-200/80 text-rose-600 backdrop-blur-md">Removed</span>}
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          <button type="button" disabled={isBusy} onClick={() => act(key, () => setListingModeration(l.listing_id, { is_visible: !l.is_visible }), l.is_visible ? `${l.name} unpublished` : `${l.name} republished`)} className={`${GLASS_SM} w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-violet-600 hover:bg-white/80 transition active:scale-90 disabled:opacity-50`} title={l.is_visible ? 'Unpublish' : 'Publish'}>{l.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                          {!removed && <button type="button" disabled={isBusy} onClick={() => { if (confirm(`Soft-remove ${l.name}? It will be hidden and marked removed (reversible).`)) act(key, () => softRemoveListing(l.listing_id, 'soft-removed by superuser'), `${l.name} soft-removed`); }} className="w-8 h-8 rounded-xl flex items-center justify-center text-amber-600 bg-amber-50/80 border border-amber-200/80 hover:bg-amber-100/80 transition active:scale-90 disabled:opacity-50" title="Soft-remove"><AlertTriangle className="w-4 h-4" /></button>}
                          <button type="button" disabled={isBusy} onClick={() => { if (confirm(`PERMANENTLY delete ${l.name} (${l.listing_id})? This removes its photos, trip-items and reviews and cannot be undone.`)) act(key, () => hardDeleteListing(l.listing_id), `${l.name} deleted`); }} className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-600 bg-rose-50/80 border border-rose-200/80 hover:bg-rose-100/80 transition active:scale-90 disabled:opacity-50" title="Hard-delete"><Trash className="w-4 h-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

               {/* ═══════ REVIEWS (live) ═══════ */}
        {tab === 'reviews' && (
          <AdminReviews notify={setToast} onChanged={() => setPulse((p) => p + 1)} />
        )}

        {/* ═══════ AUDIT LOG (full) ═══════ */}
        {tab === 'audit' && (
          <div className={`${GLASS} rounded-3xl p-7 animate-fade-in`}>
            <div className="flex items-center justify-between mb-1"><h2 className="text-lg font-black text-slate-800">Audit trail</h2><span className={`${GLASS_SM} px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest text-violet-600`}>{audit.length} shown</span></div>
            <AccentBar />
            <p className="text-sm text-slate-500 mt-3 mb-5">Immutable record of every superuser action. Newest first.</p>
            <div className="space-y-1">
              {auditLoading ? (<div className="space-y-2 animate-pulse">{[0, 1, 2, 3, 4].map((i) => <div key={i} className={`h-16 rounded-2xl ${INSET}`} />)}</div>)
                : audit.length === 0 ? (<div className={`${NEU} rounded-3xl p-12 text-center`}><div className={`w-14 h-14 mx-auto rounded-2xl ${INSET} text-violet-300 flex items-center justify-center mb-3`}><Scroll className="w-7 h-7" /></div><p className="text-sm text-slate-400 font-medium">The log is empty — ban a user, hide a listing or flag a review and it appears here instantly.</p></div>)
                : audit.map((r) => <AuditRow key={r.log_id} r={r} />)}
            </div>
          </div>
        )}

        {/* ═══════ STUBS (Move 4) ══════ */}
        {tab === 'applications' && (
          <AdminApplications notify={setToast} onChanged={() => setPulse((p) => p + 1)} />
        )}
        {tab === 'destinations' && (
          <AdminDestinations notify={setToast} onChanged={() => setPulse((p) => p + 1)} />
        )}
      </div>

      {/* Flag-reason modal */}
      {flagTarget && (
        <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setFlagTarget(null)}>
          <div className={`${NEU} rounded-3xl p-6 max-w-md w-full animate-slide-up`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Flag className="w-5 h-5 text-rose-500" />Flag review</h3><button type="button" onClick={() => setFlagTarget(null)} className="text-slate-400 hover:text-slate-600 transition"><X /></button></div>
            <p className="text-sm text-slate-500 mb-4">Flagging <span className="font-bold text-slate-800">{flagTarget.user_name ?? 'a review'}</span>’s {flagTarget.rating}★ comment on <span className="font-bold text-slate-800">{flagTarget.listing_name}</span>. The reason is written to the audit log.</p>
            <textarea value={flagReason} onChange={(e) => setFlagReason(e.target.value)} rows={3} maxLength={200} placeholder="e.g. Hate speech / spam / off-topic" className={`${INSET} w-full px-4 py-3 rounded-2xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-rose-400/60 resize-none`} />
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setFlagTarget(null)} className={`${GLASS_SM} flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-white/80 transition active:scale-95`}>Cancel</button>
              <button type="button" disabled={busy === `review:${flagTarget.review_id}`} onClick={() => { const t = flagTarget; act(`review:${t.review_id}`, () => flagReview(t.review_id, true, flagReason.trim() || 'flagged by superuser'), 'Review flagged').then(() => setFlagTarget(null)); }} className={`relative overflow-hidden flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-500 shadow-[0_12px_28px_-8px_rgba(244,63,94,0.7),inset_0_1px_0_rgba(255,255,255,0.5)] hover:brightness-110 active:scale-[0.97] transition ${SHEEN} disabled:opacity-60`}><span className="relative">Confirm flag</span></button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[70] max-w-sm px-5 py-3.5 rounded-2xl backdrop-blur-xl border shadow-xl animate-fade-in flex items-center gap-3 ${toast.k === 'ok' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 'bg-rose-50/90 border-rose-200 text-rose-800'}`}>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.k === 'ok' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]'}`} />
          <p className="text-sm font-bold">{toast.m}</p>
        </div>
      )}
    </main>
  );
}