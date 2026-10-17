// app/src/app/my-trips/page.tsx — TRAVELER HQ (mt-B1)
'use client';
import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useRole } from '@/utils/supabase/role';
import {
  NEU_SM, INSET, GLASS, GLASS_SM, GRAD, GRAD_TEXT, GLOSS, PILL_ACTIVE, CANVAS, FLOAT_SHADOW,
  BTN_PRIMARY, BTN_GHOST, Star, Chevron, PlusIcon, MapIcon, RouteIcon, CalendarIcon as _unused,
  GlassWellIcon, EmptyBox, Link, getTripStatus, fmtDate, statusPill,
} from '@/components/dashboard/kit';

if (typeof window !== 'undefined') console.log('[MyTrips] build=mt-B1');

type TripItemLite = { name: string; listing_id: string | null; planned_date: string | null; isNote: boolean };
type TripRow = {
  trip_id: string;
  trip_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  stops: { label: string; days: number }[];
  items: TripItemLite[];
  placesCount: number;
  reviewedCount: number;
};
type BookingRow = {
  booking_id: string;
  listing_id: string;
  check_in: string | null;
  check_out: string | null;
  guests: number | null;
  special_requests: string | null;
  status: string | null;
  listing_name?: string;
  listing_type?: string;
  image_url?: string | null;
};

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-5 h-5'}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STOP_LINE = ['bg-violet-400', 'bg-sky-400', 'bg-amber-400', 'bg-emerald-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400', 'bg-rose-400'];
const STOP_FILL = ['bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500'];
const STOP_BORDER = ['border-violet-500', 'border-sky-500', 'border-amber-500', 'border-emerald-500', 'border-pink-500', 'border-indigo-500', 'border-teal-500', 'border-rose-500'];

function dayRange(start: string | null, end: string | null): string[] {
  if (!start || !end) return [];
  const out: string[] = [];
  const d0 = new Date(start + 'T00:00:00'); const d1 = new Date(end + 'T00:00:00');
  for (const d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}

function stopIdxForDate(start: string | null, stops: { label: string; days: number }[], date: string): number {
  if (!start || !stops.length) return 0;
  const off = Math.floor((new Date(date + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000);
  let cur = 0;
  for (let i = 0; i < stops.length; i++) { 
    const n = Math.max(1, stops[i].days || 1); 
    if (off >= cur && off < cur + n) return i; 
    cur += n; 
  }
  return stops.length - 1;
}

/* Condensed, decorative roadmap */
function MiniRoadmap({ trip, todayISO }: { trip: TripRow; todayISO: string }) {
  const days = dayRange(trip.start_date, trip.end_date);
  if (!days.length) return null;
  const stops = trip.stops ?? [];
  const placeDays = new Set(trip.items.filter((i) => !i.isNote && i.planned_date).map((i) => i.planned_date as string));
  const shown: (string | null)[] = days.length > 16 ? [...days.slice(0, 9), null, ...days.slice(days.length - 6)] : days;
  return (
    <div className="flex items-center overflow-hidden py-2" aria-hidden="true" title={`${days.length} day${days.length === 1 ? '' : 's'} · ${placeDays.size} with plans`}>
      {shown.map((d, i) => {
        if (d === null) return <span key={`e${i}`} className="shrink-0 px-1 text-[10px] font-black leading-none text-slate-300">···</span>;
        const si = stopIdxForDate(trip.start_date, stops, d);
        const filled = placeDays.has(d);
        const isToday = d === todayISO;
        const prev = shown[i - 1];
        return (
          <Fragment key={d}>
            {i > 0 && prev !== null && <span className={`h-1 w-2 sm:w-4 shrink-0 rounded-full ${STOP_LINE[si % STOP_LINE.length]}`} />}
            <span className={`relative w-4 h-4 sm:w-5 sm:h-5 shrink-0 rounded-full border-2 ${STOP_BORDER[si % STOP_BORDER.length]} ${filled ? STOP_FILL[si % STOP_FILL.length] : 'bg-white'} ${isToday ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-white' : ''}`} />
          </Fragment>
        );
      })}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'emerald' | 'slate' }) {
  const num = tone === 'amber' ? 'text-amber-600' : tone === 'emerald' ? 'text-emerald-600' : `${GRAD_TEXT}`;
  return (
    <div className={`rounded-2xl ${INSET} px-4 py-4 text-center border border-white/60`}>
      <p className={`text-2xl font-black tabular-nums leading-none ${num}`}>{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function bookingChip(status: string | null) {
  const s = status ?? 'pending';
  const cls =
    s === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
    : s === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200/80'
    : s === 'cancelled' ? 'bg-slate-100 text-slate-600 border-slate-200/80'
    : 'bg-amber-50 text-amber-700 border-amber-200/80';
  return <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${cls}`}>{s}</span>;
}

export default function MyTripsPage() {
  const supabase = createClient();
  const role = useRole();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [tab, setTab] = useState<'trips' | 'bookings'>('trips');
  const [tripFilter, setTripFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'finished'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!role.loading && role.userId) load(role.userId);
    if (!role.loading && !role.userId) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.loading, role.userId]);

  // Managers (owners/admins) have no traveler trips — send them to the hub
  useEffect(() => {
    if (!role.loading && (role.isOwner || role.isAdmin)) router.replace('/business');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.loading, role.isOwner, role.isAdmin]);

  async function load(uid: string) {
    const { data: t } = await supabase.from('trips').select('*').eq('user_id', uid).order('start_date', { ascending: false });
    const rows = (t ?? []) as any[];
    const tripIds = rows.map((r) => r.trip_id);
    const itemsByTrip: Record<string, TripItemLite[]> = {};
    const allListingIds = new Set<string>();

    if (tripIds.length) {
      const { data: items } = await supabase.from('trip_items').select('*').in('trip_id', tripIds);
      const listingIds = [...new Set((items ?? []).map((i: any) => i.listing_id).filter((id: any) => id && id !== 'NOTE'))] as string[];
      listingIds.forEach((id) => allListingIds.add(id));
      const nameMap: Record<string, string> = {};
      if (listingIds.length) {
        const { data: ls } = await supabase.from('listings').select('listing_id, name').in('listing_id', listingIds);
        (ls ?? []).forEach((l: any) => { nameMap[l.listing_id] = l.name; });
      }
      (items ?? []).forEach((i: any) => {
        const isNote = i.listing_id == null || i.listing_id === 'NOTE';
        (itemsByTrip[i.trip_id] ??= []).push({
          name: isNote ? (i.notes ?? 'Note') : nameMap[i.listing_id] ?? i.listing_id,
          listing_id: isNote ? null : i.listing_id,
          planned_date: i.planned_date ?? null,
          isNote,
        });
      });
    }

    const reviewedSet = new Set<string>();
    if (allListingIds.size) {
      const { data: revs } = await supabase.from('reviews').select('listing_id').eq('user_id', uid).in('listing_id', [...allListingIds]);
      (revs ?? []).forEach((r: any) => reviewedSet.add(r.listing_id));
    }

    setTrips(
      rows.map((r) => {
        const items = itemsByTrip[r.trip_id] ?? [];
        const placeIds = [...new Set(items.filter((it) => it.listing_id).map((it) => it.listing_id as string))];
        return {
          trip_id: r.trip_id,
          trip_name: r.trip_name ?? null,
          start_date: r.start_date ?? null,
          end_date: r.end_date ?? null,
          status: r.status ?? null,
          stops: Array.isArray(r.stops) ? r.stops : [],
          items,
          placesCount: placeIds.length,
          reviewedCount: placeIds.filter((id) => reviewedSet.has(id)).length,
        };
      })
    );

    const { data: b } = await supabase.from('bookings').select('*').eq('user_id', uid).order('booking_id', { ascending: false });
    const brows = (b ?? []) as BookingRow[];
    const lids = [...new Set(brows.map((x) => x.listing_id))];
    if (lids.length) {
      const { data: ls } = await supabase.from('listings').select('listing_id, name, listing_type, image_url').in('listing_id', lids);
      const lm: Record<string, any> = {};
      (ls ?? []).forEach((l: any) => { lm[l.listing_id] = l; });
      brows.forEach((x) => {
        x.listing_name = lm[x.listing_id]?.name;
        x.listing_type = lm[x.listing_id]?.listing_type;
        x.image_url = lm[x.listing_id]?.image_url;
      });
    }
    setBookings(brows);
    setLoading(false);
  }

  async function cancelBooking(id: string) {
    setBusyId(id);
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('booking_id', id);
    if (!error && role.userId) await load(role.userId);
    setBusyId(null);
  }

  // ---- loading skeleton ----
  if (role.loading || loading) {
    return (
      <main className={`${CANVAS} min-h-screen pb-16 page-enter`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-32">
          <div className={`${GLASS} rounded-2xl h-24 mb-6 animate-pulse`} />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">{[0, 1, 2, 3, 4].map((i) => <div key={i} className={`${INSET} rounded-2xl h-24 animate-pulse`} />)}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{[0, 1, 2].map((i) => <div key={i} className={`${INSET} rounded-2xl h-64 animate-pulse`} />)}</div>
        </div>
      </main>
    );
  }

  // ---- signed out ----
  if (!role.authId) {
    return (
      <main className={`${CANVAS} min-h-screen flex items-center justify-center p-8 page-enter pt-32`}>
        <div className="rounded-[2rem] bg-white/85 px-8 py-14 text-center max-w-md w-full shadow-[0_18px_44px_-16px_rgba(110,120,190,0.4)] border border-white/60">
          <GlassWellIcon gradient="from-indigo-500 to-violet-500" size="lg"><MapIcon className="w-8 h-8" /></GlassWellIcon>
          <h1 className="text-2xl font-black text-slate-800 mt-6 mb-3">My trips & bookings</h1>
          <p className="text-base text-slate-500 mb-8 leading-relaxed">Sign in to see everything you've planned, booked, and reviewed.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login" className={`${BTN_PRIMARY} px-8 py-3.5 text-sm font-bold`}><span className="relative">Sign in</span></Link>
            <Link href="/signup" className={`${BTN_GHOST} px-8 py-3.5 text-sm font-bold`}>Create account</Link>
          </div>
        </div>
      </main>
    );
  }

  const needsReview = (t: TripRow) => getTripStatus(t) === 'finished' && t.placesCount > 0 && t.reviewedCount < t.placesCount;
  const fullyReviewed = (t: TripRow) => getTripStatus(t) === 'finished' && t.placesCount > 0 && t.reviewedCount >= t.placesCount;

  const sortedTrips = [...trips].sort((a, b) => {
    const rank = (t: TripRow) => (getTripStatus(t) !== 'finished' ? 0 : needsReview(t) ? 1 : 2);
    return rank(a) - rank(b) || (b.start_date ?? '').localeCompare(a.start_date ?? '');
  });

  const activeTrips = trips.filter((t) => getTripStatus(t) !== 'finished');
  const finishedTrips = trips.filter((t) => getTripStatus(t) === 'finished');
  const pendingBookings = bookings.filter((b) => (b.status ?? 'pending') === 'pending');
  const pendingReviews = trips.filter(needsReview).length;

  const filteredTrips = sortedTrips.filter((t) => tripFilter === 'all' || getTripStatus(t) === tripFilter);
  const filterCount = (f: typeof tripFilter) => (f === 'all' ? trips.length : trips.filter((t) => getTripStatus(t) === f).length);

  return (
    <main className={`${CANVAS} min-h-screen pb-16 page-enter relative`}>
      <style>{`
        @keyframes tmPopM { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .tm-pop-m { animation: tmPopM .45s cubic-bezier(.22,.9,.32,1) both; }
      `}</style>
      
      {/* Decorative blur elements - safely contained in background */}
      <div className="pointer-events-none fixed top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sky-300/15 blur-3xl" />
      </div>

      {/* Increased top padding (pt-28 md:pt-32) to clear the global navbar */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-32 pb-10">

        {/* Mission bar */}
        <div className="mb-8">
          <div className={`${GLASS} rounded-2xl px-5 py-5 md:px-6 shadow-lg backdrop-blur-xl border border-white/60`}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-1">Traveler HQ</p>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 truncate leading-tight">My trips & bookings</h1>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs font-bold text-slate-600">
                <span className="px-3 py-1.5 rounded-full bg-white/70 border border-white/80 tabular-nums">{activeTrips.length} active</span>
                <span className="px-3 py-1.5 rounded-full bg-white/70 border border-white/80 tabular-nums">{finishedTrips.length} finished</span>
                {pendingReviews > 0 && <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 tabular-nums">{pendingReviews} to review</span>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href="/" className={`${BTN_PRIMARY} px-5 py-3 text-sm font-bold`}><span className="relative flex items-center gap-2"><PlusIcon className="w-4 h-4" />Plan a trip</span></Link>
                <Link href="/" className={`${BTN_GHOST} px-5 py-3 text-sm font-bold whitespace-nowrap`}>Dashboard</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Review alert */}
        {pendingReviews > 0 && (
          <div className="mb-6 flex items-center gap-4 p-5 rounded-2xl bg-amber-50/90 border border-amber-200/80 shadow-sm">
            <GlassWellIcon gradient="from-amber-400 to-orange-500"><Star className="w-6 h-6" /></GlassWellIcon>
            <p className="flex-1 text-sm font-semibold text-amber-800 leading-relaxed">{pendingReviews} finished trip{pendingReviews === 1 ? '' : 's'} still need{pendingReviews === 1 ? 's' : ''} reviews — rate the places you visited to help other travelers.</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatTile label="Active trips" value={String(activeTrips.length)} />
          <StatTile label="Finished" value={String(finishedTrips.length)} tone="slate" />
          <StatTile label="Bookings" value={String(bookings.length)} tone="emerald" />
          <StatTile label="Awaiting reply" value={String(pendingBookings.length)} tone={pendingBookings.length ? 'amber' : 'slate'} />
          <StatTile label="To review" value={String(pendingReviews)} tone={pendingReviews ? 'amber' : 'slate'} />
        </div>

        {/* Tabs */}
        <div className={`${GLASS} rounded-2xl p-1.5 inline-flex gap-1.5 mb-6 border border-white/60`}>
          {([['trips', `Trips (${trips.length})`, <RouteIcon key="r" className="w-4 h-4" />], ['bookings', `Bookings (${bookings.length})`, <CalendarIcon key="c" className="w-4 h-4" />]] as const).map(([id, label, ic]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold tracking-wide whitespace-nowrap transition active:scale-95 ${tab === id ? PILL_ACTIVE : 'text-slate-500 hover:text-violet-600 hover:bg-white/50'}`}>
              <span className="relative flex items-center gap-2">{ic}{label}</span>
            </button>
          ))}
        </div>

        {tab === 'trips' ? (
          trips.length === 0 ? (
            <div className={`${GLASS} rounded-[2rem] p-12 text-center border border-white/60`}>
              <EmptyBox icon={<MapIcon className="w-8 h-8" />} title="No trips yet" sub="Create your first trip on the dashboard and start saving places into a day-by-day plan." />
              <Link href="/" className={`mt-8 inline-block ${BTN_PRIMARY} px-8 py-3.5 text-sm font-bold`}><span className="relative flex items-center gap-2"><PlusIcon className="w-5 h-5" />Open trip planner</span></Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-6">
                {(['all', 'upcoming', 'ongoing', 'finished'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setTripFilter(f)} className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide whitespace-nowrap transition active:scale-95 ${tripFilter === f ? PILL_ACTIVE : `${NEU_SM} text-slate-600 hover:text-violet-600 hover:bg-white/60`}`}>
                    <span className="relative">{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} {filterCount(f)}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredTrips.map((t, ti) => {
                  const st = getTripStatus(t);
                  const nr = needsReview(t);
                  const fr = fullyReviewed(t);
                  const progress = t.placesCount > 0 ? Math.round((t.reviewedCount / t.placesCount) * 100) : 0;
                  const placeItems = t.items.filter((it) => !it.isNote);
                  const stripe = STOP_FILL[0 % STOP_FILL.length];
                  return (
                    <article
                      key={t.trip_id}
                      className={`relative rounded-2xl p-6 pl-7 tm-pop-m transition hover:-translate-y-1 hover:shadow-xl ${
                        fr ? 'bg-white/60 border border-white/80 opacity-80 saturate-[.85] hover:opacity-100' : `${GLASS} hover:shadow-[0_20px_40px_-16px_rgba(110,120,190,0.6)] border border-white/60`
                      }`}
                      style={{ animationDelay: `${Math.min(ti, 12) * 45}ms` }}
                    >
                      <span className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full ${fr ? 'bg-slate-300' : stripe}`} aria-hidden="true" />

                      <div className="flex items-start gap-4 mb-2">
                        <span className={`w-12 h-12 shrink-0 rounded-2xl ${fr ? 'bg-slate-200 text-slate-400' : `bg-gradient-to-br ${GRAD} text-white shadow-md`} flex items-center justify-center`}><RouteIcon className="w-6 h-6" /></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-black text-lg truncate ${fr ? 'text-slate-500' : 'text-slate-800'}`}>{t.trip_name ?? `Trip ${t.trip_id}`}</p>
                            <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${st === 'ongoing' ? 'bg-sky-500 animate-pulse' : st === 'finished' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                          </div>
                          <p className="text-xs font-semibold text-slate-500 truncate tabular-nums mt-0.5">{fmtDate(t.start_date)} → {fmtDate(t.end_date)}</p>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusPill(st)}`}>{st}</span>
                      </div>

                      <p className="text-xs font-semibold text-slate-500 mb-2">{placeItems.length} place{placeItems.length === 1 ? '' : 's'}{t.stops.length ? ` · ${t.stops.length} stop${t.stops.length === 1 ? '' : 's'}` : ''}</p>

                      <MiniRoadmap trip={t} todayISO={todayISO} />

                      {st === 'finished' && t.placesCount > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5"><span>Reviews</span><span className="tabular-nums">{t.reviewedCount}/{t.placesCount}</span></div>
                          <div className={`${INSET} w-full h-2.5 rounded-full overflow-hidden border border-white/50`}><div className={`h-full rounded-full transition-all duration-700 ${GLOSS} ${fr ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : `bg-gradient-to-r ${GRAD}`}`} style={{ width: `${progress}%` }} /></div>
                        </div>
                      )}

                      <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2">
                          {nr && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-black uppercase tracking-wider text-amber-700 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />Needs review</span>}
                          {fr && <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 whitespace-nowrap"><CheckIcon className="w-4 h-4 text-emerald-500" />Fully reviewed</span>}
                          {!nr && !fr && <span className="text-xs font-bold text-slate-500 truncate">{st === 'ongoing' ? 'In progress' : 'Ready to plan'}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {nr ? (
                            <Link href={`/my-trips/${t.trip_id}/review`} className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:shadow-lg transition flex items-center gap-2`} style={{ backgroundImage: 'linear-gradient(to right,#f59e0b,#f97316)' }}><span className="relative flex items-center gap-1.5"><Star className="w-4 h-4" />Review {t.placesCount - t.reviewedCount}</span></Link>
                          ) : null}
                          <Link href={`/?trip=${t.trip_id}`} className={`px-4 py-2.5 rounded-xl text-xs font-bold ${nr ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm' : `${BTN_PRIMARY} shadow-md`} transition flex items-center gap-2`}><span className="relative flex items-center gap-1.5"><MapIcon className="w-4 h-4" />Open board</span></Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredTrips.length === 0 && (
                <div className={`${GLASS} rounded-2xl p-12 text-center border border-white/60`}><p className="text-base font-semibold text-slate-500">No trips match this filter.</p></div>
              )}
            </>
          )
        ) : bookings.length === 0 ? (
          <div className={`${GLASS} rounded-[2rem] p-12 text-center border border-white/60`}>
            <EmptyBox icon={<CalendarIcon className="w-8 h-8" />} title="No booking requests yet" sub="When you request dates on a listing, the request and its status will show up here." />
            <Link href="/search" className={`mt-8 inline-block ${BTN_PRIMARY} px-8 py-3.5 text-sm font-bold`}><span className="relative flex items-center gap-2"><MapIcon className="w-5 h-5" />Browse places</span></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bookings.map((b, bi) => {
              const pending = (b.status ?? 'pending') === 'pending';
              return (
                <div key={b.booking_id} className={`relative rounded-2xl ${GLASS} p-5 pl-6 flex flex-col sm:flex-row sm:items-center gap-4 tm-pop-m transition hover:-translate-y-1 hover:shadow-xl border border-white/60`} style={{ animationDelay: `${Math.min(bi, 12) * 40}ms` }}>
                  <span className={`absolute left-0 top-5 bottom-5 w-1.5 rounded-r-full ${pending ? 'bg-gradient-to-b from-amber-400 to-orange-400' : b.status === 'confirmed' ? 'bg-gradient-to-b from-emerald-400 to-teal-500' : b.status === 'rejected' ? 'bg-gradient-to-b from-rose-400 to-red-500' : 'bg-slate-300'}`} aria-hidden="true" />
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-md border border-white/50" />
                  ) : (
                    <div className={`w-16 h-16 rounded-xl shrink-0 bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-violet-500 font-black text-lg border border-white/60`}>
                      {(b.listing_name ?? 'P').charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-base truncate">{b.listing_name ?? b.listing_id}</p>
                    <p className="text-xs font-semibold text-slate-500 truncate tabular-nums mt-1">{b.listing_type ?? 'Place'} · {fmtDate(b.check_in)} → {fmtDate(b.check_out)} · {b.guests ?? 1} guest{(b.guests ?? 1) === 1 ? '' : 's'}</p>
                    {b.special_requests && <p className="text-xs font-medium text-slate-500 mt-1.5 truncate italic bg-slate-50 p-2 rounded-lg border border-slate-100">"{b.special_requests}"</p>}
                  </div>
                  <div className="flex flex-col sm:items-end gap-3 shrink-0 mt-2 sm:mt-0">
                    {bookingChip(b.status)}
                    <div className="flex items-center gap-2">
                      <Link href={`/listing/${b.listing_id}`} className="px-4 py-2 rounded-lg text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-100 transition whitespace-nowrap">View Listing</Link>
                      {pending && (
                        <button 
                          type="button" 
                          onClick={() => cancelBooking(b.booking_id)} 
                          disabled={busyId === b.booking_id} 
                          className="px-4 py-2 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition disabled:opacity-60 whitespace-nowrap"
                        >
                          {busyId === b.booking_id ? 'Canceling...' : 'Cancel Request'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}