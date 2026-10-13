// app/src/app/trip/page.tsx — LIVE TRIP COCKPIT (read-only viewing page)
'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  CANVAS, NEU, NEU_SM, INSET, GLASS, GLASS_SM, GRAD, GRAD_TEXT, GLOSS, FLOAT_SHADOW,
  BTN_PRIMARY, BTN_GHOST,
  Star, MapIcon, RouteIcon, SparkleIcon, GlassWellIcon, SummaryTile, EmptyBox, Link,
  getTripStatus, fmtDate, statusPill,
  type TripItem, type TripData,
} from '@/components/dashboard/kit';

// Freshness canary — if this never prints, the server isn't compiling this route.
if (typeof window !== 'undefined') console.log('[TripPage] build=trip-2');

function fmtTime(t: string | null) { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h, 10); const ampm = hr >= 12 ? 'PM' : 'AM'; const hr12 = hr % 12 === 0 ? 12 : hr % 12; return `${hr12}:${m} ${ampm}`; }
function slotLabel(it: TripItem) { const t = it.start_time ?? ''; if (t.startsWith('09')) return 'Morning'; if (t.startsWith('13')) return 'Afternoon'; if (t.startsWith('18')) return 'Evening'; return ['Morning', 'Afternoon', 'Evening'][(it.sequence_no ?? 1) - 1] ?? 'Stop'; }

export default function TripCockpit() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState<string | null>(null);
  const seededRef = useRef(false);

  // ---- read-only load (same shapes as the dashboard) ----
  useEffect(() => {
    async function fetchTrips(uid: string): Promise<TripData[]> {
      const { data: t } = await supabase.from('trips').select('*').eq('user_id', uid).order('start_date', { ascending: false });
      const rows = (t ?? []) as any[]; if (!rows.length) return [];
      const ids = rows.map((r) => r.trip_id);
      const { data: items } = await supabase.from('trip_items').select('*').in('trip_id', ids);
      const listingIds = [...new Set((items ?? []).map((i: any) => i.listing_id).filter((id: any) => id && id !== 'NOTE'))];
      const lMap: Record<string, any> = {};
      if (listingIds.length) {
        const { data: ls } = await supabase.from('listings').select('listing_id, name, listing_type, average_rating, image_url, destination:destination_id(*)').in('listing_id', listingIds);
        (ls ?? []).forEach((l: any) => { lMap[l.listing_id] = { name: l.name, destination_id: l.destination?.destination_id ?? null, destination_name: l.destination?.destination_name ?? null, region_country: l.destination?.region_country ?? null, destBlob: l.destination ?? null, listing_type: l.listing_type ?? null, average_rating: l.average_rating != null ? Number(l.average_rating) : null, image_url: l.image_url ?? null }; });
      }
      const map: Record<string, any[]> = {};
      (items ?? []).forEach((i: any) => {
        const isNote = i.listing_id == null || i.listing_id === 'NOTE';
        (map[i.trip_id] ??= []).push({ key: i.trip_item_id ?? i.item_id ?? i.id ?? `${i.trip_id}|${i.listing_id}`, listing_id: i.listing_id, name: isNote ? (i.notes ?? 'Note') : lMap[i.listing_id]?.name ?? i.listing_id, destination_name: isNote ? null : lMap[i.listing_id]?.destination_name ?? null, region_country: isNote ? null : lMap[i.listing_id]?.region_country ?? null, listing_type: isNote ? 'Note' : lMap[i.listing_id]?.listing_type ?? null, rating: isNote ? null : lMap[i.listing_id]?.average_rating ?? null, image_url: isNote ? null : lMap[i.listing_id]?.image_url ?? null, planned_date: i.planned_date ?? null, start_time: i.start_time ?? null, sequence_no: i.sequence_no ?? null, notes: i.notes ?? null, raw: i });
      });
      return rows.map((r) => ({ trip_id: r.trip_id, trip_name: r.trip_name ?? r.name ?? null, start_date: r.start_date ?? null, end_date: r.end_date ?? null, status: r.status ?? null, stops: Array.isArray(r.stops) ? r.stops : [], items: map[r.trip_id] ?? [] }));
    }
    async function load() {
      try {
        const { data: session } = await supabase.auth.getSession();
        const authId = session.session?.user?.id ?? null;
        if (authId) {
          const { data: profile } = await supabase.from('app_users').select('user_id').eq('auth_user_id', authId).maybeSingle();
          if (profile) { setUserId(profile.user_id); setTrips(await fetchTrips(profile.user_id)); }
        }
      } finally { setLoading(false); }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- derived (view-only) ----
  const liveTrips = trips.filter((t) => getTripStatus(t) !== 'finished');
  const ongoing = liveTrips.find((t) => getTripStatus(t) === 'ongoing') ?? null;
  const nextUp = liveTrips.find((t) => getTripStatus(t) === 'upcoming') ?? null;
  const selectedTrip = trips.find((t) => t.trip_id === selectedTripId) ?? ongoing ?? nextUp ?? null;

  useEffect(() => {
    if (seededRef.current || !trips.length) return;
    const fromUrl = searchParams.get('trip');
    if (fromUrl && trips.some((t) => t.trip_id === fromUrl)) setSelectedTripId(fromUrl);
    seededRef.current = true;
  }, [trips, searchParams]);

  const tripStops = (selectedTrip?.stops ?? []) as { label: string; days: number }[];
  const tripDays = selectedTrip?.start_date && selectedTrip?.end_date ? Math.max(1, Math.round((new Date(selectedTrip.end_date + 'T00:00:00').getTime() - new Date(selectedTrip.start_date + 'T00:00:00').getTime()) / 86400000) + 1) : null;
  const capacity = tripStops.length > 0 ? tripStops.reduce((s, x) => s + (x.days || 1), 0) * 3 : tripDays ? tripDays * 3 : 6;
  const placeCount = selectedTrip ? selectedTrip.items.filter((i) => i.listing_type !== 'Note').length : 0;
  const plannedPlaceCount = selectedTrip ? selectedTrip.items.filter((i) => i.planned_date && i.listing_type !== 'Note').length : 0;
  const plannedDates = selectedTrip ? ([...new Set(selectedTrip.items.map((i) => i.planned_date).filter(Boolean))] as string[]).sort() : [];
  const unscheduled = selectedTrip ? selectedTrip.items.filter((i) => !i.planned_date && i.listing_type !== 'Note') : [];
  const status = selectedTrip ? getTripStatus(selectedTrip) : null;
  const todayISO = new Date().toISOString().slice(0, 10);
  const dayIndex = selectedTrip?.start_date && status === 'ongoing' ? Math.max(1, Math.floor((Date.now() - new Date(selectedTrip.start_date + 'T00:00:00').getTime()) / 86400000) + 1) : null;

  function stopsFor(date: string) { return (selectedTrip?.items ?? []).filter((i) => i.planned_date === date).sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0) || (a.start_time ?? '').localeCompare(b.start_time ?? '')); }
  function getStopForDate(date: string): string | null { if (!selectedTrip?.start_date || !tripStops.length) return null; const start = new Date(selectedTrip.start_date + 'T00:00:00'); const target = new Date(date + 'T00:00:00'); const off = Math.floor((target.getTime() - start.getTime()) / 86400000); let cursor = 0; for (const s of tripStops) { const n = s.days || 1; if (off >= cursor && off < cursor + n) return s.label; cursor += n; } return null; }
  function stopItemCount(label: string) { return (selectedTrip?.items ?? []).filter((i) => `${i.destination_name ?? ''} ${i.region_country ?? ''}`.toLowerCase().includes(label.trim().toLowerCase())).length; }

  async function copyItinerary() {
    if (!selectedTrip) return;
    setCopyErr(null);
    const lines: string[] = [`${selectedTrip.trip_name ?? 'Trip'} — ${fmtDate(selectedTrip.start_date)} → ${fmtDate(selectedTrip.end_date)}`, ''];
    plannedDates.forEach((d, i) => {
      lines.push(`DAY ${i + 1} · ${fmtDate(d)}${getStopForDate(d) ? ` · ${getStopForDate(d)}` : ''}`);
      stopsFor(d).forEach((it) => {
        if (it.listing_type === 'Note') lines.push(`   📝 ${it.notes}`);
        else lines.push(`   ${fmtTime(it.start_time) || '—'} · ${slotLabel(it)} · ${it.name}${it.rating != null ? ` (★${Number(it.rating).toFixed(1)})` : ''}`);
      });
      lines.push('');
    });
    if (unscheduled.length) { lines.push('NOT SCHEDULED YET:'); unscheduled.forEach((u) => lines.push(`   · ${u.name}`)); }
    const text = lines.join('\n');
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { setCopyErr('Could not copy — your browser blocked clipboard access.'); }
  }

  // ---- render ----
  if (loading) return (<main className={`${CANVAS} min-h-[70vh] flex items-center justify-center`}><div className={`${NEU} rounded-[2rem] px-10 py-8 text-sm font-bold text-slate-500 animate-pulse`}>Loading your live trip…</div></main>);
  if (!userId) return (
    <main className={`${CANVAS} min-h-[70vh] flex items-center justify-center p-8`}>
      <div className={`${GLASS} rounded-[2rem] p-10 max-w-md w-full text-center ${FLOAT_SHADOW}`}>
        <GlassWellIcon gradient="from-indigo-500 to-violet-500" size="lg"><RouteIcon className="w-7 h-7" /></GlassWellIcon>
        <h1 className="text-2xl font-black text-slate-800 mt-5 mb-2">Trip cockpit</h1>
        <p className="text-sm text-slate-500 mb-7">Sign in to view your live trip day by day.</p>
        <Link href="/login" className={`${BTN_PRIMARY} inline-block px-7 py-3 text-base`}><span className="relative">Sign in</span></Link>
      </div>
    </main>
  );
  if (!selectedTrip) return (
    <main className={`${CANVAS} min-h-[70vh] flex items-center justify-center p-8`}>
      <div className={`${GLASS} rounded-[2rem] p-10 max-w-md w-full text-center ${FLOAT_SHADOW}`}>
        <GlassWellIcon gradient="from-indigo-500 to-violet-500" size="lg"><MapIcon className="w-7 h-7" /></GlassWellIcon>
        <h1 className="text-2xl font-black text-slate-800 mt-5 mb-2">No live trips right now</h1>
        <p className="text-sm text-slate-500 mb-7">The cockpit shows your ongoing or upcoming trip. Plan one and it will appear here.</p>
        <Link href="/?tab=plan" className={`${BTN_PRIMARY} inline-block px-7 py-3 text-base`}><span className="relative">Open the planner</span></Link>
      </div>
    </main>
  );

  return (
    <main className={`${CANVAS} page-enter`}>
      <style>{`@keyframes tmRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } } .tm-rise { animation: tmRise .55s cubic-bezier(.22,.9,.32,1) both; }`}</style>
      <div className="pointer-events-none fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-violet-300/30 blur-3xl z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sky-300/25 blur-3xl z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

        {/* Switcher (live trips only) */}
        {liveTrips.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {liveTrips.map((t) => {
              const sel = t.trip_id === selectedTrip.trip_id;
              return (
                <button key={t.trip_id} type="button" onClick={() => setSelectedTripId(t.trip_id)} className={`shrink-0 text-left rounded-2xl px-4 py-2.5 min-w-[170px] transition-all duration-300 ${sel ? `${GLASS_SM} ring-2 ring-violet-400/60` : `${NEU_SM} hover:-translate-y-0.5`}`}>
                  <p className={`font-black truncate text-sm ${sel ? 'text-slate-800' : 'text-slate-600'}`}>{t.trip_name ?? `Trip ${t.trip_id}`}</p>
                  <p className="text-[10px] font-bold text-slate-500 truncate">{fmtDate(t.start_date)} · {getTripStatus(t)}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Header */}
        <div className={`${GLASS} rounded-[2rem] p-6 md:p-8 ${FLOAT_SHADOW} relative overflow-hidden tm-rise`}>
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gradient-to-br from-violet-400/25 to-fuchsia-400/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${statusPill(status!)}`}>{status === 'ongoing' ? 'Live now' : status}</span>
              {status === 'ongoing' && dayIndex && (<span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${GLASS_SM} text-emerald-700`}><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />Day {dayIndex}{tripDays ? ` of ${tripDays}` : ''}</span>)}
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 truncate">{selectedTrip.trip_name ?? `Trip ${selectedTrip.trip_id}`}</h1>
            <p className="mt-1.5 text-sm font-bold text-slate-500">{fmtDate(selectedTrip.start_date)} → {fmtDate(selectedTrip.end_date)} · {tripStops.length} stop{tripStops.length === 1 ? '' : 's'} · {placeCount} places</p>
            <div className="mt-5 flex items-center gap-3">
              <div className={`${INSET} flex-1 h-3 rounded-full overflow-hidden`}><div className={`h-full rounded-full transition-all duration-700 ${GLOSS} bg-gradient-to-r ${GRAD}`} style={{ width: `${Math.min(100, (plannedPlaceCount / capacity) * 100)}%` }} /></div>
              <span className="text-xs text-slate-600 font-black whitespace-nowrap">{plannedPlaceCount}/{capacity} scheduled</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/?trip=${selectedTrip.trip_id}`} className={`${BTN_PRIMARY} px-5 py-2.5 text-sm`}><span className="relative flex items-center gap-2"><RouteIcon className="w-4 h-4" />Edit in planner</span></Link>
              <button type="button" onClick={copyItinerary} className={`${BTN_GHOST} px-5 py-2.5 text-sm`}><span className="relative">{copied ? '✓ Copied!' : 'Copy itinerary'}</span></button>
            </div>
            {copyErr && <p className={`mt-3 text-xs font-semibold text-rose-700 ${GLASS} border-rose-200/70 rounded-xl px-3 py-2`}>{copyErr}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 tm-rise" style={{ animationDelay: '60ms' }}>
          <SummaryTile label="Days" value={String(plannedDates.length || (tripDays ?? 0))} />
          <SummaryTile label="Places" value={String(placeCount)} />
          <SummaryTile label="Scheduled" value={String(plannedPlaceCount)} />
          <SummaryTile label="Stops" value={String(tripStops.length)} />
        </div>

        {/* Stops summary */}
        {tripStops.length > 0 && (
          <div className={`${GLASS} rounded-[2rem] p-5 tm-rise`} style={{ animationDelay: '90ms' }}>
            <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500 mb-3">Route</h2>
            <div className="flex flex-wrap gap-2">
              {tripStops.map((s, i) => (
                <span key={s.label} className={`inline-flex items-center gap-2 rounded-2xl ${NEU_SM} px-3.5 py-2 text-sm font-bold text-slate-700`}>
                  <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${GRAD} text-white text-[10px] font-black flex items-center justify-center`}>{i + 1}</span>
                  {s.label}
                  <span className="text-[10px] font-black text-slate-400">{s.days}d · {stopItemCount(s.label)} places</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline (read-only) */}
        {plannedDates.length === 0 ? (
          <div className={`rounded-3xl border-2 border-dashed border-violet-300/60 ${NEU} p-10 text-center tm-rise`}>
            <GlassWellIcon gradient="from-indigo-500 to-violet-500" size="lg"><SparkleIcon className="w-7 h-7" /></GlassWellIcon>
            <p className="text-base text-slate-700 font-bold mt-5 mb-2">Nothing scheduled yet</p>
            <p className="text-sm text-slate-500 mb-6">This trip has places but no days assigned. Open the planner and hit Auto-plan.</p>
            <Link href={`/?trip=${selectedTrip.trip_id}`} className={`${BTN_PRIMARY} inline-block px-6 py-3 text-sm`}><span className="relative">Edit in planner</span></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {plannedDates.map((date, di) => {
              const dayItems = stopsFor(date);
              const isToday = date === todayISO;
              return (
                <div key={date} className={`rounded-3xl p-5 tm-rise ${isToday ? 'bg-white ring-2 ring-emerald-400/70 shadow-[0_18px_44px_-18px_rgba(16,185,129,0.45)]' : `${NEU_SM}`}`} style={{ animationDelay: `${120 + di * 60}ms` }}>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${GRAD} text-white text-sm font-black flex items-center justify-center shadow-md`}>{di + 1}</span>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 text-base leading-tight">{fmtDate(date)}{isToday && <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-emerald-600">Today</span>}</p>
                        <p className="text-[11px] font-bold text-slate-500 truncate">{getStopForDate(date) ? `📍 ${getStopForDate(date)}` : 'No stop assigned'}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-slate-400 shrink-0">{dayItems.filter((i) => i.listing_type !== 'Note').length}/3 places</span>
                  </div>
                  <div className="space-y-2">
                    {dayItems.map((it) => (
                      it.listing_type === 'Note' ? (
                        <div key={it.key} className="flex items-start gap-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 px-4 py-3">
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm mt-0.5">📝 Note</span>
                          <p className="flex-1 text-sm text-slate-700 leading-relaxed">{it.notes}</p>
                        </div>
                      ) : (
                        <Link key={it.key} href={`/listing/${it.listing_id}`} className="group flex items-center gap-3 rounded-2xl bg-white/75 border border-white/80 px-4 py-3 shadow-[0_4px_16px_rgba(110,120,190,0.12)] transition hover:shadow-[0_8px_24px_rgba(110,120,190,0.2)] hover:-translate-y-0.5">
                          {it.image_url ? (<img src={it.image_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-md" />) : (<span className={`shrink-0 px-2.5 py-1 rounded-full bg-gradient-to-r ${GRAD} text-white text-[9px] font-black uppercase tracking-wider shadow-sm`}>{slotLabel(it)}</span>)}
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-800 text-base truncate group-hover:text-violet-700 transition">{it.name}</p>
                            <p className="text-[11px] font-semibold text-slate-500 truncate">{it.listing_type ?? 'Place'}{it.destination_name ? ` · ${it.destination_name}` : ''}</p>
                          </div>
                          {it.rating != null && (<span className="shrink-0 flex items-center gap-1 text-xs font-black text-amber-600"><Star className="w-3.5 h-3.5" />{Number(it.rating).toFixed(1)}</span>)}
                          <span className="shrink-0 text-xs font-black text-slate-600 bg-[#e4e8f4] rounded-lg px-2.5 py-1.5 tabular-nums">{fmtTime(it.start_time) || slotLabel(it)}</span>
                        </Link>
                      )
                    ))}
                    {dayItems.length === 0 && (<p className={`text-center text-xs text-slate-400 font-semibold py-5 ${INSET} rounded-2xl`}>Rest day — nothing planned.</p>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Unscheduled (view-only) */}
        {unscheduled.length > 0 && (
          <div className={`${GLASS} rounded-[2rem] p-5 tm-rise`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500">Not scheduled yet</h2>
              <Link href={`/?trip=${selectedTrip.trip_id}`} className="text-[11px] font-black text-violet-600 hover:text-violet-700 transition">Schedule in planner →</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {unscheduled.map((u) => (
                <span key={u.key} className={`inline-flex items-center gap-2 rounded-2xl ${NEU_SM} px-3.5 py-2 text-sm font-bold text-slate-700`}>{u.name}<span className="text-[10px] font-black text-slate-400">{u.listing_type ?? 'Place'}</span></span>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] font-semibold text-slate-400 pb-4">Viewing only — edits happen in the planner so your itinerary stays consistent everywhere.</p>
      </div>
    </main>
  );
}