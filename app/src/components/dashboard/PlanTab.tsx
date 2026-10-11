// app/src/components/dashboard/PlanTab.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  NEU, NEU_SM, INSET, GLASS, GLASS_SM, SHEEN, GRAD, GRAD_TEXT, GLOSS, PILL_ACTIVE, FIELD, INPUT,
  BTN_PRIMARY, BTN_GHOST, BTN_DANGER, FLOAT_SHADOW,
  Star, Chevron, ChevronDown, PlusIcon, MapIcon, CloseIcon, EditIcon, TrashIcon, SparkleIcon, RouteIcon,
  GlassWellIcon, AccentBar, SummaryTile, EmptyBox, Link,
  getTripStatus, fmtDate, extractStopLabel, statusPill,
  type TripItem, type TripData, type ExploreCard, type ReviewMap,
} from '@/components/dashboard/kit';

const TIME_OPTIONS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

const MODAL_SURF = 'bg-white shadow-[0_28px_70px_-18px_rgba(15,23,42,0.6)] ring-1 ring-slate-900/10';

const GEO_KEY = /(province|region|state|city|municipalit|town|address|location|subdivision|district|area|country|destination)/i;
function geoOf(x: any): string {
  if (!x) return '';
  const parts: string[] = [];
  const push = (o: any) => {
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) {
        if (k.endsWith('_id')) continue;
        const v = o[k];
        if (typeof v === 'string' && v.trim() && GEO_KEY.test(k)) parts.push(v);
      }
    }
  };
  if (x.destination) push(x.destination);
  if (x.destBlob) push(x.destBlob);
  push(x);
  return parts.join(' ').toLowerCase();
}
function matchesStop(x: any, label: string): boolean {
  const l = (label ?? '').trim().toLowerCase();
  if (!l || !x) return false;
  const hay = geoOf(x);
  if (!hay) return false;
  if (hay.includes(l)) return true;
  const norm = (s: string) => s.replace(/[^a-z0-9]+/g, ' ').trim();
  const hn = norm(hay), ln = norm(l);
  if (hn.includes(ln)) return true;
  const words = ln.split(' ').filter(Boolean);
  if (!words.length) return false;
  const hw = hn.split(' ').filter(Boolean);
  const hs = new Set(hw);
  return words.every((w) => hs.has(w) || hw.some((h) => h.includes(w) || w.includes(h)));
}

if (typeof window !== 'undefined') console.log('[PlanTab] build=geo-A9');

type Props = {
  userId: string | null; trips: TripData[]; refreshTrips: () => Promise<void> | void;
  explore: ExploreCard[]; schedMap: Record<string, { open: string; close: string }>;
  allDests: { destination_name: string; region_country: string }[];
  tripReviewMap: ReviewMap; onReviewed: () => void;
};

export default function PlanTab({ userId, trips, refreshTrips, explore, schedMap, allDests, tripReviewMap, onReviewed }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showReviewTripModal, setShowReviewTripModal] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<TripItem | null>(null);
  const [tripFilter, setTripFilter] = useState<'active' | 'upcoming' | 'ongoing' | 'finished'>('active');
  const [plannerQuery, setPlannerQuery] = useState('');
  const [plannerErr, setPlannerErr] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [startName, setStartName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startBusy, setStartBusy] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [destPickerOpen, setDestPickerOpen] = useState(false);
  const [destSearch, setDestSearch] = useState('');
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<{ afterKey: string; date: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const plannerScrolledRef = useRef(false);
  const diagRef = useRef(false);

  // ---- derived ----
  const selectedTrip = trips.find((t) => t.trip_id === selectedTripId) ?? trips[0] ?? null;
  const inTripIds = new Set(selectedTrip?.items.map((i) => i.listing_id).filter((id) => id != null && id !== 'NOTE') ?? []);
  const tripStops = (selectedTrip?.stops ?? []) as { label: string; days: number }[];
  const tripDays = selectedTrip?.start_date && selectedTrip?.end_date
    ? Math.max(1, Math.round((new Date(selectedTrip.end_date + 'T00:00:00').getTime() - new Date(selectedTrip.start_date + 'T00:00:00').getTime()) / 86400000) + 1)
    : null;
  const totalAllocated = tripStops.reduce((sum, s) => sum + (s.days || 1), 0);
  const capacity = tripStops.length > 0 ? totalAllocated * 3 : tripDays ? tripDays * 3 : 6;
  const placeCount = selectedTrip ? selectedTrip.items.filter((i) => i.listing_type !== 'Note').length : 0;
  const plannedPlaceCount = selectedTrip ? selectedTrip.items.filter((i) => i.planned_date && i.listing_type !== 'Note').length : 0;
  const plannedDates = selectedTrip ? ([...new Set(selectedTrip.items.map((i) => i.planned_date).filter(Boolean))] as string[]).sort() : [];
  const unscheduledItems = selectedTrip ? selectedTrip.items.filter((i) => !i.planned_date && i.listing_type !== 'Note') : [];
  const unscheduledCount = unscheduledItems.length;
  const previewCount = destSearch.trim().length >= 2 ? explore.filter((l) => matchesStop(l, destSearch)).length : 0;
  const regionSuggestions = (() => {
    const q = destSearch.trim().toLowerCase(); if (q.length < 2) return [] as string[];
    const seen = new Set<string>(); const out: string[] = [];
    for (const d of allDests) {
      const geo = geoOf(d); if (!geo || !geo.includes(q)) continue;
      const label = String((d as any).province ?? (d as any).region ?? (d as any).state ?? d.region_country ?? d.destination_name ?? '').trim();
      if (!label || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase()); out.push(label); if (out.length >= 4) break;
    }
    return out;
  })();

  const scopedPool = tripStops.length > 0 ? explore.filter((l) => tripStops.some((s) => matchesStop(l, s.label))) : explore;
  const scopedList = scopedPool.filter((l) => !inTripIds.has(l.listing_id)).sort((a, b) => (b.average_rating ?? -1) - (a.average_rating ?? -1));
  const stopHasNoCatalogMatches = tripStops.length > 0 && scopedPool.length === 0 && explore.length > 0;
  const allStopMatchesAdded = tripStops.length > 0 && scopedPool.length > 0 && scopedList.length === 0;
  const globalFallback = explore.filter((l) => !inTripIds.has(l.listing_id)).sort((a, b) => (b.average_rating ?? -1) - (a.average_rating ?? -1)).slice(0, 8);
  const suggestions: ExploreCard[] = scopedList.length > 0 ? scopedList.slice(0, 8) : (stopHasNoCatalogMatches ? globalFallback : []);

  const plannerMatches = plannerQuery.trim().length >= 2 ? explore.filter((l) => !inTripIds.has(l.listing_id) && (tripStops.length === 0 || tripStops.some((s) => matchesStop(l, s.label))) && `${l.name} ${l.destination?.destination_name ?? ''} ${l.destination?.region_country ?? ''}`.toLowerCase().includes(plannerQuery.trim().toLowerCase())).slice(0, 6) : [];
  const addList = plannerMatches.length > 0 ? plannerMatches : suggestions;
  const sortedTrips = [...trips].sort((a, b) => { const rank = (t: TripData) => (getTripStatus(t) !== 'finished' ? 0 : tripNeedsReview(t) ? 1 : 2); return rank(a) - rank(b) || (b.start_date ?? '').localeCompare(a.start_date ?? ''); });
  const filteredTrips = sortedTrips.filter((t) => { const st = getTripStatus(t); if (tripFilter === 'active') return st !== 'finished'; return st === tripFilter; });

  function tripReviewInfo(t: TripData) { return tripReviewMap[t.trip_id] ?? { total: 0, reviewed: 0 }; }
  function tripNeedsReview(t: TripData) { const i = tripReviewInfo(t); return getTripStatus(t) === 'finished' && i.total > 0 && i.reviewed < i.total; }
  function tripFullyReviewed(t: TripData) { const i = tripReviewInfo(t); return getTripStatus(t) === 'finished' && i.total > 0 && i.reviewed >= i.total; }
  const pendingReviewCount = selectedTrip ? Math.max(0, tripReviewInfo(selectedTrip).total - tripReviewInfo(selectedTrip).reviewed) : 0;
  const needsReviewCount = trips.filter(tripNeedsReview).length;

  // ---- helpers ----
  function dbId(it: TripItem) { return it.raw?.trip_item_id ?? it.key; }
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  function fmtTime(t: string | null) { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h, 10); const ampm = hr >= 12 ? 'PM' : 'AM'; const hr12 = hr % 12 === 0 ? 12 : hr % 12; return `${hr12}:${m} ${ampm}`; }
  function slotLabel(it: TripItem) { const t = it.start_time ?? ''; if (t.startsWith('09')) return 'Morning'; if (t.startsWith('13')) return 'Afternoon'; if (t.startsWith('18')) return 'Evening'; return ['Morning', 'Afternoon', 'Evening'][(it.sequence_no ?? 1) - 1] ?? 'Stop'; }
  function stopsFor(date: string) { return (selectedTrip?.items ?? []).filter((i) => i.planned_date === date).sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0) || (a.start_time ?? '').localeCompare(b.start_time ?? '')); }
  function getItemStop(item: TripItem): string | null { if (!item.destination_name && !item.region_country && !item.destBlob) return null; for (const s of tripStops) { if (matchesStop(item, s.label)) return s.label; } return null; }
  function getStopForDate(date: string): string | null { if (!selectedTrip?.start_date || !tripStops.length) return null; const start = new Date(selectedTrip.start_date + 'T00:00:00'); const target = new Date(date + 'T00:00:00'); const off = Math.floor((target.getTime() - start.getTime()) / 86400000); let cursor = 0; for (const s of tripStops) { const n = s.days || 1; if (off >= cursor && off < cursor + n) return s.label; cursor += n; } return null; }
  function stopItemCount(label: string) { return (selectedTrip?.items ?? []).filter((i) => matchesStop(i, label)).length; }
  function pickSlotTimes(type: string | null, listingId: string): string[] { if (type === 'Restaurant') return ['12:00:00', '18:00:00']; const base = ['09:00:00', '13:00:00']; const sched = schedMap[listingId]; if (!sched) return base; const ok = base.filter((s) => sched.open <= s.slice(0, 5) && s.slice(0, 5) < sched.close); return ok.length ? ok : base; }
  function timeOptionDisabled(item: TripItem, option: string): boolean { if (!item.planned_date) return false; const om = toMin(option); const others = (selectedTrip?.items ?? []).filter((i) => i.planned_date === item.planned_date && i.key !== item.key && i.start_time); for (const o of others) { const om2 = toMin((o.start_time ?? '').slice(0, 5)); if (Math.abs(om2 - om) < 60) return true; } const seqOthers = others.sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0)); const selfSeq = item.sequence_no ?? 0; const prev = seqOthers.filter((i) => (i.sequence_no ?? 0) < selfSeq).pop(); const next = seqOthers.filter((i) => (i.sequence_no ?? 0) > selfSeq).shift(); if (prev && om < toMin((prev.start_time ?? '').slice(0, 5)) + 60) return true; if (next && om > toMin((next.start_time ?? '').slice(0, 5)) - 60) return true; return false; }

  // ---- mutations ----
  async function createTrip(name: string, start: string, end: string): Promise<string> { if (!name.trim()) throw new Error('Give your trip a name.'); if (start && end && end < start) throw new Error('End date must be after the start date.'); const { data: tripId, error: idErr } = await supabase.rpc('new_trip_id'); if (idErr) throw idErr; const { error } = await supabase.from('trips').insert({ trip_id: tripId as string, user_id: userId, trip_name: name.trim(), start_date: start || null, end_date: end || null }); if (error) throw error; return tripId as string; }
  async function handleStartCreate(e: React.FormEvent) { e.preventDefault(); setPlannerErr(null); setStartBusy(true); try { const id = await createTrip(startName, startDate, endDate); await refreshTrips(); setSelectedTripId(id); setStartName(''); setStartDate(''); setEndDate(''); } catch (err: any) { setPlannerErr(err?.message ?? 'Could not create the trip.'); } setStartBusy(false); }
  async function deleteTrip(tripId: string) { const { error: itemsErr } = await supabase.from('trip_items').delete().eq('trip_id', tripId); if (itemsErr) { setPlannerErr(itemsErr.message); return; } const { error } = await supabase.from('trips').delete().eq('trip_id', tripId); if (error) setPlannerErr(error.message); else { await refreshTrips(); setShowDeleteConfirm(null); if (selectedTripId === tripId) setSelectedTripId(null); } }
  async function addItem(listingId: string) { const trip = selectedTrip; if (!trip) return; setPlannerErr(null); setAddingId(listingId); try { const pc = trip.items.filter((i) => i.listing_type !== 'Note').length; if (pc >= capacity) { throw new Error(tripDays ? `Trip full: ${tripDays} day${tripDays === 1 ? '' : 's'} fit ${capacity} places (3 per day). Extend the dates or remove a place.` : 'Starter limit reached (6 places). Set trip dates to unlock more slots.'); } if (trip.stops.length === 0) { const listing = addList.find((l) => l.listing_id === listingId); if (listing) { const stopLabel = extractStopLabel(listing.destination?.region_country ?? null); if (stopLabel) await saveStops([{ label: stopLabel, days: tripDays ?? 1 }]); } } const { error } = await supabase.from('trip_items').insert({ trip_item_id: `ITI-${Date.now().toString().slice(-8)}`, trip_id: trip.trip_id, listing_id: listingId, sequence_no: (trip.items.length ?? 0) + 1, planned_date: null, start_time: null, notes: null }); if (error) throw error; await refreshTrips(); } catch (err: any) { setPlannerErr(err?.message ?? 'Could not add this place.'); } setAddingId(null); }
  function removeItem(it: TripItem) { setPendingRemove(it); }
  async function performRemove(it: TripItem) {
    const trip = selectedTrip;
    if (!trip) { setPendingRemove(null); return; }
    let query = supabase.from('trip_items').delete();
    if (it.raw?.trip_item_id) {
      query = query.eq('trip_item_id', it.raw.trip_item_id);
    } else if (it.listing_id && it.listing_id !== 'NOTE') {
      query = query.eq('trip_id', trip.trip_id).eq('listing_id', it.listing_id);
    } else if (it.notes != null || it.sequence_no != null) {
      query = query.eq('trip_id', trip.trip_id);
      if (it.notes != null) query = query.eq('notes', it.notes);
      if (it.sequence_no != null) query = query.eq('sequence_no', it.sequence_no);
      if (it.planned_date) query = query.eq('planned_date', it.planned_date); else query = query.is('planned_date', null);
    } else {
      setPlannerErr('This item is missing an ID. Refresh the page and try again.'); setPendingRemove(null); return;
    }
    const { error } = await query;
    if (error) setPlannerErr(error.message); else await refreshTrips();
    setPendingRemove(null);
  }
  async function normalizeDay(date: string) { const trip = selectedTrip; if (!trip) return; const dayItems = trip.items.filter((i) => i.planned_date === date).sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0) || (a.start_time ?? '').localeCompare(b.start_time ?? '')); for (let i = 0; i < dayItems.length; i++) { if ((dayItems[i].sequence_no ?? 0) !== i + 1) { const { error } = await supabase.from('trip_items').update({ sequence_no: i + 1 }).eq('trip_item_id', dbId(dayItems[i])); if (!error) dayItems[i].sequence_no = i + 1; } } }
  async function changeItemTime(itemKey: string, time: string) { const trip = selectedTrip; if (!trip || !time) return; const item = trip.items.find((i) => i.key === itemKey); if (!item) return; setPlannerErr(null); const { error } = await supabase.from('trip_items').update({ start_time: `${time}:00` }).eq('trip_item_id', dbId(item)); if (error) setPlannerErr(error.message); else await refreshTrips(); }
  async function moveItemToDay(itemKey: string, date: string) { const trip = selectedTrip; if (!trip) return; const item = trip.items.find((i) => i.key === itemKey); if (!item || item.listing_type === 'Note' || item.planned_date === date) return; const itemStop = getItemStop(item); const targetStop = getStopForDate(date); if (itemStop && targetStop && itemStop !== targetStop) { setPlannerErr(`"${item.name}" belongs to ${itemStop} — it can't move to a ${targetStop} day.`); return; } const dayPlaces = trip.items.filter((i) => i.planned_date === date && i.listing_type !== 'Note' && i.key !== itemKey); if (dayPlaces.length >= 3) { setPlannerErr('That day already has 3 places. Drop onto a card to swap instead.'); return; } await normalizeDay(date); const taken = new Set(trip.items.filter((i) => i.planned_date === date).map((i) => i.sequence_no ?? 0)); let seq = 1; while (taken.has(seq)) seq++; const slot = ['09:00', '13:00', '18:00'].find((s) => !timeOptionDisabled(item, s)); if (!slot) { setPlannerErr('No free time slot on that day — times must stay 1 hour apart.'); return; } setPlannerErr(null); const { error } = await supabase.from('trip_items').update({ planned_date: date, start_time: `${slot}:00`, sequence_no: seq }).eq('trip_item_id', dbId(item)); if (error) setPlannerErr(error.message); else await refreshTrips(); }
  async function swapItems(keyA: string, keyB: string) { const trip = selectedTrip; if (!trip || keyA === keyB) return; const a = trip.items.find((i) => i.key === keyA); const b = trip.items.find((i) => i.key === keyB); if (!a || !b || a.listing_type === 'Note' || b.listing_type === 'Note') return; const stopA = getStopForDate(a.planned_date ?? ''); const stopB = getStopForDate(b.planned_date ?? ''); const regionA = getItemStop(a); const regionB = getItemStop(b); if (stopA && regionB && stopA !== regionB) { setPlannerErr(`Can't swap — "${b.name}" isn't in ${stopA}.`); return; } if (stopB && regionA && stopB !== regionA) { setPlannerErr(`Can't swap — "${a.name}" isn't in ${stopB}.`); return; } const dayA = a.planned_date!; const dayB = b.planned_date!; await normalizeDay(dayA); if (dayB !== dayA) await normalizeDay(dayB); setPlannerErr(null); const { error: e1 } = await supabase.from('trip_items').update({ planned_date: b.planned_date, start_time: b.start_time, sequence_no: b.sequence_no }).eq('trip_item_id', dbId(a)); const { error: e2 } = await supabase.from('trip_items').update({ planned_date: a.planned_date, start_time: a.start_time, sequence_no: a.sequence_no }).eq('trip_item_id', dbId(b)); if (e1 || e2) setPlannerErr((e1 ?? e2)?.message ?? 'Swap failed.'); else await refreshTrips(); }
  async function addNoteBetween() { const trip = selectedTrip; if (!trip || !showNoteModal || !noteText.trim()) return; const { afterKey, date } = showNoteModal; setPlannerErr(null); const dayItems = trip.items.filter((i) => i.planned_date === date).sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0)); const after = dayItems.find((i) => i.key === afterKey); if (!after) return; const insertSeq = (after.sequence_no ?? 0) + 1; try { for (const i of dayItems.filter((x) => (x.sequence_no ?? 0) >= insertSeq)) { const { error } = await supabase.from('trip_items').update({ sequence_no: (i.sequence_no ?? 0) + 1 }).eq('trip_item_id', dbId(i)); if (error) throw error; } const { error } = await supabase.from('trip_items').insert({ trip_item_id: `NOTE-${Date.now().toString().slice(-8)}`, trip_id: trip.trip_id, listing_id: null, sequence_no: insertSeq, planned_date: date, start_time: null, notes: noteText.trim() }); if (error) throw error; setShowNoteModal(null); setNoteText(''); await refreshTrips(); } catch (e: any) { setPlannerErr(e?.message ?? 'Could not add note.'); } }
  async function updateTripDates(start: string, end: string) { const trip = selectedTrip; if (!trip) return; if (start && end && end < start) { setPlannerErr('End date must be after the start date.'); return; } setPlannerErr(null); const { error } = await supabase.from('trips').update({ start_date: start || null, end_date: end || null }).eq('trip_id', trip.trip_id); if (error) setPlannerErr(error.message); else await refreshTrips(); }
  async function saveStops(next: { label: string; days: number }[]) { const trip = selectedTrip; if (!trip) return; const { error } = await supabase.from('trips').update({ stops: next }).eq('trip_id', trip.trip_id); if (error) setPlannerErr(error.message); else await refreshTrips(); }
  async function addStop(label: string) { const clean = label.trim(); if (clean.length < 2) return; if (tripStops.some((s) => s.label.toLowerCase() === clean.toLowerCase())) { setPlannerErr('That stop is already in the trip.'); return; } setPlannerErr(null); await saveStops([...tripStops, { label: clean, days: 1 }]); setDestPickerOpen(false); setDestSearch(''); }
  async function removeStop(label: string) { await saveStops(tripStops.filter((s) => s.label !== label)); }
  async function setStopDays(label: string, days: number) { await saveStops(tripStops.map((s) => (s.label === label ? { ...s, days: Math.max(1, days) } : s))); }
  async function autoPlan() {
    const trip = selectedTrip; if (!trip) return; setPlannerErr(null);
    if (!trip.start_date || !trip.end_date) { setPlannerErr('Set the trip dates above first — the planner needs days to fill.'); return; }
    if (tripStops.length === 0) { setPlannerErr('Add a destination stop first (e.g., "La Union"), then add places inside it.'); return; }
    if (trip.items.filter((i) => i.listing_type !== 'Note').length === 0) { setPlannerErr('Add at least one place first.'); return; }
    setPlanning(true);
    try {
      const allDays: string[] = []; const d0 = new Date(trip.start_date + 'T00:00:00'); const d1 = new Date(trip.end_date + 'T00:00:00');
      for (const d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) allDays.push(d.toISOString().slice(0, 10));
      const blocks = new Map<string, string[]>(); let cursor = 0;
      for (const s of tripStops) { const n = Math.max(1, s.days || 1); blocks.set(s.label, allDays.slice(cursor, cursor + n)); cursor += n; }
      const daySeqTaken = new Map<string, Set<number>>();
      function takeSeq(date: string): number { if (!daySeqTaken.has(date)) daySeqTaken.set(date, new Set(trip.items.filter((i) => i.planned_date === date && i.listing_type === 'Note').map((i) => i.sequence_no ?? 0))); const set = daySeqTaken.get(date)!; let s = 1; while (set.has(s)) s++; set.add(s); return s; }
      const typeRank: Record<string, number> = { Attraction: 0, Restaurant: 1, Hotel: 2 };
      const assignments: { item: TripItem; date: string; time: string; seq: number }[] = [];
      const usedTimesPerDay = new Map<string, Set<string>>();
      function getUsedTimes(date: string) { if (!usedTimesPerDay.has(date)) usedTimesPerDay.set(date, new Set()); return usedTimesPerDay.get(date)!; }
      function getTime(date: string, slotIdx: number, allowed: string[]): string { const usedTimes = getUsedTimes(date); const preferred = ['09:00:00', '13:00:00', '18:00:00']; const pref = preferred[slotIdx]; if (allowed.includes(pref) && !usedTimes.has(pref)) { usedTimes.add(pref); return pref; } for (const t of allowed) { if (!usedTimes.has(t)) { usedTimes.add(t); return t; } } if (!usedTimes.has(pref)) { usedTimes.add(pref); return pref; } const baseHour = [9, 13, 18][slotIdx]; let h = baseHour, m = 0; while (usedTimes.has(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)) { m += 30; if (m >= 60) { m = 0; h += 1; } if (h >= 23) { h = 9; m = 0; break; } } const finalTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`; usedTimes.add(finalTime); return finalTime; }
      for (const s of tripStops) { const days = blocks.get(s.label) ?? []; if (!days.length) continue; const items = trip.items.filter((i) => matchesStop(i, s.label) && i.listing_type !== 'Note').sort((a, b) => { const ta = typeRank[a.listing_type ?? ''] ?? 3; const tb = typeRank[b.listing_type ?? ''] ?? 3; if (ta !== tb) return ta - tb; return (b.rating ?? -1) - (a.rating ?? -1); }); let dayIdx = 0; let used = 0; for (const item of items) { if (item.listing_type === 'Hotel') continue; const allowed = pickSlotTimes(item.listing_type, item.listing_id); if (used >= 3) { dayIdx += 1; used = 0; } if (dayIdx >= days.length) dayIdx = days.length - 1; const time = getTime(days[dayIdx], used, allowed); assignments.push({ item, date: days[dayIdx], time, seq: takeSeq(days[dayIdx]) }); used += 1; } }
      const assignedKeys = new Set(assignments.map((a) => a.item.key));
      const leftovers = trip.items.filter((i) => !assignedKeys.has(i.key) && i.listing_type !== 'Hotel' && i.listing_type !== 'Note');
      if (leftovers.length) { const restDays = allDays.slice(cursor); const days = restDays.length ? restDays : allDays; let dayIdx = 0; let used = 0; for (const item of leftovers.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))) { const allowed = pickSlotTimes(item.listing_type, item.listing_id); if (used >= 3) { dayIdx += 1; used = 0; } if (dayIdx >= days.length) dayIdx = days.length - 1; const time = getTime(days[dayIdx], used, allowed); assignments.push({ item, date: days[dayIdx], time, seq: takeSeq(days[dayIdx]) }); used += 1; } }
      for (const a of assignments) { const { error } = await supabase.from('trip_items').update({ planned_date: a.date, start_time: a.time, sequence_no: a.seq }).eq('trip_item_id', dbId(a.item)); if (error) throw error; }
      await refreshTrips();
    } catch (err: any) { setPlannerErr(err?.message ?? 'Could not auto-plan this trip.'); }
    setPlanning(false);
  }
  async function clearPlan() { const trip = selectedTrip; if (!trip) return; const { error } = await supabase.from('trip_items').update({ planned_date: null, start_time: null, sequence_no: null }).eq('trip_id', trip.trip_id); if (!error) await refreshTrips(); else setPlannerErr(error.message); }

  // ---- effects ----
  useEffect(() => { if (selectedTrip && selectedTrip.stops.length > 0 && selectedTrip.items.length > 0 && plannedDates.length > 0) setSetupCollapsed(true); }, [selectedTrip?.trip_id, plannedDates.length]);
  useEffect(() => { const fromUrl = searchParams.get('trip'); const fromSession = typeof window !== 'undefined' ? window.sessionStorage.getItem('tm-open-trip') : null; const t = fromUrl ?? fromSession; if (t && trips.some((x) => x.trip_id === t)) { setSelectedTripId(t); if (fromSession && typeof window !== 'undefined') window.sessionStorage.removeItem('tm-open-trip'); } }, [trips, searchParams]);
  useEffect(() => { if (plannerScrolledRef.current) return; const fromUrl = Boolean(searchParams.get('trip')); const fromSession = typeof window !== 'undefined' && window.sessionStorage.getItem('tm-scroll-planner') === '1'; if (!fromUrl && !fromSession) return; const el = document.getElementById('trip-planner'); if (!el) return; plannerScrolledRef.current = true; if (typeof window !== 'undefined') { window.sessionStorage.removeItem('tm-scroll-planner'); window.sessionStorage.removeItem('tm-open-trip'); } requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' })); }, [searchParams, trips, selectedTripId]);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || diagRef.current || !stopHasNoCatalogMatches) return;
    diagRef.current = true;
    // eslint-disable-next-line no-console
    console.group('[TravelMate] stop-matcher diagnostic');
    console.warn(`Stop(s) [${tripStops.map((s) => s.label).join(', ')}] matched 0 of ${explore.length} explore rows.`);
    console.table(explore.slice(0, 10).map((l) => ({ name: l.name, destination_name: l.destination?.destination_name ?? '(null)', region_country: l.destination?.region_country ?? '(null)', geo: geoOf(l).slice(0, 80) })));
    console.groupEnd();
  }, [stopHasNoCatalogMatches, tripStops, explore]);

  // ---- suggestion panel ----
  const SuggestionPanel = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500">{plannerMatches.length > 0 ? 'Search results' : 'Suggested for this trip'}</h4>
        <button type="button" onClick={() => setDrawerOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 transition"><CloseIcon className="w-5 h-5" /></button>
      </div>
      <input value={plannerQuery} onChange={(e) => setPlannerQuery(e.target.value)} maxLength={50} placeholder="Add any place — type to search…" className={`${INPUT} mb-3`} />
      <div className="space-y-2.5 overflow-y-auto pr-1 -mr-1 flex-1">
        {stopHasNoCatalogMatches && addList.length > 0 && (
          <p className={`text-[11px] font-bold text-amber-700 ${GLASS} border-amber-200/70 rounded-2xl px-3 py-2`}>
            No catalog places match your stop{tripStops.length > 1 ? 's' : ''} ({tripStops.map((s) => s.label).join(', ')}) yet — showing top picks instead.
          </p>
        )}
        {allStopMatchesAdded && (
          <p className={`text-[11px] font-bold text-emerald-700 ${GLASS} border-emerald-200/70 rounded-2xl px-3 py-2`}>
            You’ve already added every catalog place that matches {tripStops.map((s) => s.label).join(', ')}. Remove one from the itinerary to see it here again.
          </p>
        )}
        {addList.length === 0 && !allStopMatchesAdded && (
          <EmptyBox icon={<MapIcon className="w-6 h-6" />} title="Nothing matches" sub="Try another keyword, or your catalog may not cover this stop." />
        )}
        {addList.map((l) => (
          <div key={l.listing_id} className={`flex items-center gap-3 rounded-2xl ${NEU_SM} px-3 py-3`}>
            {l.image_url ? (<img src={l.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-md" />) : (<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 shrink-0 flex items-center justify-center text-violet-400 font-black">{l.listing_type.charAt(0)}</div>)}
            <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-sm truncate">{l.name}</p><p className="text-[11px] text-slate-500 truncate">{l.destination?.destination_name}{l.average_rating != null ? ` · ★ ${Number(l.average_rating).toFixed(1)}` : ''}</p></div>
            <button type="button" onClick={() => { addItem(l.listing_id); setDrawerOpen(false); }} disabled={addingId === l.listing_id} className={`shrink-0 ${BTN_PRIMARY} px-3 py-2 text-xs disabled:opacity-60`}><span className="relative flex items-center gap-1"><PlusIcon className="w-3.5 h-3.5" />Add</span></button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div id="trip-planner" className="space-y-5 scroll-mt-24 animate-fade-in">
      <div className={`${GLASS} rounded-3xl p-4`}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(['active', 'upcoming', 'ongoing', 'finished'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setTripFilter(f)} className={`px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide transition active:scale-95 ${tripFilter === f ? PILL_ACTIVE : `${NEU_SM} text-slate-500 hover:text-violet-600`}`}>
              <span className="relative">{f === 'active' ? `Active (${trips.filter((t) => getTripStatus(t) !== 'finished').length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${trips.filter((t) => getTripStatus(t) === f).length})`}</span>
            </button>
          ))}
          <button type="button" onClick={() => setShowTripModal(true)} className={`ml-auto ${BTN_PRIMARY} px-4 py-2 text-xs`}><span className="relative flex items-center gap-1.5"><PlusIcon className="w-4 h-4" />New trip</span></button>
        </div>
        {trips.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 -mx-1 px-1">
            {filteredTrips.length === 0 ? (<p className="text-sm text-slate-500 px-2 py-3 font-medium">No {tripFilter === 'active' ? 'active ' : `${tripFilter} `}trips yet.</p>) : filteredTrips.map((t) => {
              const sel = selectedTrip?.trip_id === t.trip_id; const status = getTripStatus(t); const nr = tripNeedsReview(t); const fr = tripFullyReviewed(t); const info = tripReviewInfo(t);
              return (
                <button key={t.trip_id} type="button" onClick={() => setSelectedTripId(t.trip_id)} className={`shrink-0 text-left rounded-2xl px-4 py-3 min-w-[180px] transition-all duration-300 ${sel ? `${GLASS_SM} ring-2 ring-violet-400/60 shadow-[0_10px_28px_-10px_rgba(124,58,237,0.5)]` : fr ? `${NEU_SM} opacity-60 saturate-[.7] hover:opacity-90` : `${NEU_SM} hover:-translate-y-0.5 hover:shadow-[8px_8px_22px_rgba(163,170,205,0.5)]`}`}>
                  <div className="flex items-center justify-between gap-2 mb-1"><p className={`font-black truncate text-sm ${fr && !sel ? 'text-slate-500' : 'text-slate-800'}`}>{t.trip_name ?? `Trip ${t.trip_id}`}</p><span className={`shrink-0 w-2 h-2 rounded-full ${status === 'ongoing' ? 'bg-sky-500' : status === 'finished' ? 'bg-slate-400' : 'bg-emerald-500'}`} /></div>
                  <p className="text-[11px] text-slate-500 font-semibold truncate">{fmtDate(t.start_date)} → {fmtDate(t.end_date)} · {t.items.length} place{t.items.length === 1 ? '' : 's'}</p>
                  {nr && <p className="mt-1 text-[10px] font-black text-amber-600">{info.total - info.reviewed} to review</p>}
                  {fr && <p className="mt-1 text-[10px] font-bold text-slate-400">✓ Reviewed</p>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {userId && needsReviewCount > 0 && (
        <Link href="/my-trips" className={`group flex items-center gap-3 p-4 rounded-3xl ${GLASS} border-amber-200/70 hover:bg-white/70 transition`} style={{ boxShadow: '0 10px 34px rgba(245,158,11,0.18)' }}>
          <GlassWellIcon gradient="from-amber-400 to-orange-500"><Star className="w-5 h-5" /></GlassWellIcon>
          <span className="flex-1 text-sm font-bold text-amber-700">{needsReviewCount} finished trip{needsReviewCount === 1 ? '' : 's'} waiting for your review — rate the places you visited!</span>
          <span className="text-xs font-black text-amber-600 whitespace-nowrap">Go to My trips →</span>
        </Link>
      )}

      {!userId ? (
        <div className={`${NEU} rounded-[2rem] p-12 text-center`}>
          <GlassWellIcon gradient="from-indigo-500 to-violet-500" size="lg"><MapIcon className="w-7 h-7" /></GlassWellIcon>
          <h3 className="text-2xl font-black text-slate-800 mt-5 mb-3">Plan trips with a free account</h3>
          <p className="text-base text-slate-500 max-w-md mx-auto mb-8">Save places into dated itineraries and get suggestions tailored to each destination.</p>
          <div className="flex justify-center gap-4"><Link href="/signup" className={`${BTN_PRIMARY} px-7 py-3.5 text-base`}><span className="relative">Create a free account</span></Link><Link href="/login" className={`${BTN_GHOST} px-7 py-3.5 text-base`}>Sign in</Link></div>
        </div>
      ) : trips.length === 0 ? (
        <div className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${GRAD} p-10 md:p-14 text-white ${FLOAT_SHADOW} ${SHEEN}`}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10" /><div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-white/5" />
          <div className="relative">
            <h3 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Where to next?</h3>
            <p className="text-white/80 max-w-lg text-base md:text-lg mb-8">Create a trip, pick your dates, and we'll suggest the best-rated places to fill your itinerary.</p>
            <form onSubmit={handleStartCreate} className="grid grid-cols-1 md:grid-cols-[1fr_170px_170px_auto] gap-4">
              <div><input value={startName} onChange={(e) => setStartName(e.target.value)} maxLength={100} placeholder="Trip name — e.g., Japan Spring Adventure" className="w-full px-5 py-4 rounded-2xl bg-white/15 border border-white/25 text-white placeholder-white/60 focus:ring-2 focus:ring-white/70 outline-none transition backdrop-blur-sm" /><p className="text-xs text-white/70 mt-2 text-right">{startName.length}/100</p></div>
              <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className="px-5 py-4 rounded-2xl bg-white/15 border border-white/25 text-white focus:ring-2 focus:ring-white/70 outline-none transition backdrop-blur-sm [color-scheme:dark]" />
              <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="px-5 py-4 rounded-2xl bg-white/15 border border-white/25 text-white focus:ring-2 focus:ring-white/70 outline-none transition backdrop-blur-sm [color-scheme:dark]" />
              <button type="submit" disabled={startBusy} className="px-8 py-4 rounded-2xl bg-white text-violet-700 text-base font-black hover:bg-violet-50 active:scale-[0.97] transition shadow-lg disabled:opacity-60">{startBusy ? 'Creating…' : 'Start planning'}</button>
            </form>
            {plannerErr && <p className="mt-4 text-sm text-white bg-white/20 rounded-2xl px-4 py-3 backdrop-blur-sm">{plannerErr}</p>}
          </div>
        </div>
      ) : selectedTrip ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5">
          <div className={`${GLASS} rounded-[2rem] p-6 md:p-7 min-h-[70vh]`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-2xl font-black tracking-tight text-slate-800 truncate">{selectedTrip.trip_name ?? `Trip ${selectedTrip.trip_id}`}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${statusPill(getTripStatus(selectedTrip))}`}>{getTripStatus(selectedTrip)}</span>
                  <span className="text-sm text-slate-500 font-bold">{fmtDate(selectedTrip.start_date)} → {fmtDate(selectedTrip.end_date)}</span>
                  <button type="button" onClick={() => setShowEditTripModal(true)} className="text-xs font-black text-violet-600 hover:text-violet-700 transition">Edit</button>
                  <button type="button" onClick={() => setShowDeleteConfirm(selectedTrip.trip_id)} className="text-xs font-black text-rose-500 hover:text-rose-600 transition">Delete</button>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {getTripStatus(selectedTrip) === 'finished' && pendingReviewCount > 0 && (<button type="button" onClick={() => setShowReviewTripModal(true)} className={`${BTN_PRIMARY} px-4 py-2 text-xs`} style={{ backgroundImage: 'linear-gradient(to right,#f59e0b,#f97316)' }}><span className="relative flex items-center gap-1.5"><SparkleIcon className="w-4 h-4" />Review {pendingReviewCount}</span></button>)}
                <button type="button" onClick={autoPlan} disabled={planning} className={`${BTN_PRIMARY} px-4 py-2 text-xs disabled:opacity-60`}><span className="relative flex items-center gap-1.5"><SparkleIcon className="w-4 h-4" />{planning ? 'Planning…' : 'Auto-plan'}</span></button>
                {plannedDates.length > 0 && (<button type="button" onClick={clearPlan} className={`${BTN_GHOST} px-3 py-2 text-xs`}>Clear</button>)}
                <button type="button" onClick={() => setDrawerOpen(true)} className={`lg:hidden ${BTN_PRIMARY} px-3 py-2 text-xs`}><span className="relative flex items-center gap-1.5"><PlusIcon className="w-4 h-4" />Add</span></button>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className={`${INSET} flex-1 h-3 rounded-full overflow-hidden`}><div className={`h-full rounded-full transition-all duration-700 ${GLOSS} bg-gradient-to-r ${GRAD}`} style={{ width: `${Math.min(100, (plannedPlaceCount / capacity) * 100)}%` }} /></div>
              <span className="text-xs text-slate-600 font-black">
                {plannedPlaceCount}/{capacity} planned
                {placeCount !== plannedPlaceCount ? ` · ${placeCount - plannedPlaceCount} unscheduled` : ''}
                {tripDays ? ` · ${tripDays}d` : ''}
              </span>
            </div>
            {plannerErr && <p className={`mb-3 ${GLASS} border-rose-200/70 text-rose-700 rounded-2xl px-4 py-2.5 text-sm font-semibold`}>{plannerErr}</p>}

            {unscheduledCount > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">Added, not scheduled yet</h4>
                  <button type="button" onClick={autoPlan} disabled={planning} className={`${BTN_PRIMARY} px-3 py-1.5 text-[11px]`}><span className="relative flex items-center gap-1"><SparkleIcon className="w-3.5 h-3.5" />{planning ? 'Planning…' : 'Schedule all'}</span></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {unscheduledItems.map((it) => (
                    <div key={it.key} className={`relative flex items-center gap-3 rounded-2xl ${NEU_SM} px-3 py-3`}>
                      <div className="flex-1 min-w-0">
                        <Link href={`/listing/${it.listing_id}`} className="block font-black text-slate-800 text-sm truncate hover:text-violet-700">{it.name}</Link>
                        <p className="text-[11px] text-slate-500 truncate">{it.listing_type ?? 'Place'}{it.destination_name ? ` · ${it.destination_name}` : ''}</p>
                      </div>
                      {it.rating != null && (<span className="shrink-0 text-xs font-black text-amber-600 flex items-center gap-1"><Star className="w-3.5 h-3.5" />{Number(it.rating).toFixed(1)}</span>)}
                      <button type="button" onClick={() => removeItem(it)} aria-label={`Remove ${it.name}`} className="w-7 h-7 shrink-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 transition flex items-center justify-center"><CloseIcon className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="button" onClick={() => setSetupCollapsed(!setupCollapsed)} className="w-full flex items-center justify-between py-2.5 text-left group border-t border-white/60 mt-2">
              <h4 className="text-xs font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-violet-600 transition">Trip setup</h4>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition ${setupCollapsed ? '-rotate-90' : ''}`} />
            </button>
            {!setupCollapsed && (
              <div className="pt-3 space-y-5 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" value={selectedTrip.start_date ?? ''} max={selectedTrip.end_date || undefined} onChange={(e) => updateTripDates(e.target.value, selectedTrip.end_date ?? '')} className={`${INPUT} w-auto py-2.5`} />
                  <span className="text-slate-400 font-black">→</span>
                  <input type="date" value={selectedTrip.end_date ?? ''} min={selectedTrip.start_date || undefined} onChange={(e) => updateTripDates(selectedTrip.start_date ?? '', e.target.value)} className={`${INPUT} w-auto py-2.5`} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2"><h5 className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">Destination stops</h5><button type="button" onClick={() => setDestPickerOpen(true)} className={`${BTN_PRIMARY} px-3 py-1.5 text-[11px]`}><span className="relative flex items-center gap-1"><PlusIcon className="w-3.5 h-3.5" />Add stop</span></button></div>
                  {tripStops.length === 0 ? (<p className={`text-sm text-slate-500 ${INSET} rounded-2xl px-5 py-6 text-center font-medium`}>No stops yet — add a province, city, or country to scope suggestions.</p>) : (
                    <div className="space-y-2">
                      {tripStops.map((s) => (
                        <div key={s.label} className={`flex items-center gap-3 rounded-2xl ${NEU_SM} px-4 py-3`}>
                          <div className="flex-1 min-w-0"><p className="font-black text-slate-800 text-sm truncate">{s.label}</p><p className="text-[11px] text-slate-500 truncate">{stopItemCount(s.label)} of your places here</p></div>
                          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 shrink-0">Days</label>
                          <div className={`${INSET} flex items-center rounded-xl overflow-hidden`}>
                            <button type="button" onClick={() => setStopDays(s.label, Math.max(1, s.days - 1))} disabled={s.days <= 1} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition" aria-label="Decrease days"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14" strokeLinecap="round" /></svg></button>
                            <span className="w-8 text-center text-sm font-black text-slate-700 tabular-nums">{s.days}</span>
                            <button type="button" onClick={() => setStopDays(s.label, Math.min(tripDays ?? 60, s.days + 1))} disabled={s.days >= (tripDays ?? 60)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition" aria-label="Increase days"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg></button>
                          </div>
                          <button type="button" onClick={() => removeStop(s.label)} aria-label={`Remove ${s.label}`} className="w-8 h-8 shrink-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 transition flex items-center justify-center"><CloseIcon className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {tripDays != null && totalAllocated !== tripDays && (<p className={`text-xs text-amber-700 ${GLASS} border-amber-200/70 rounded-2xl px-3 py-2 font-semibold`}>Allocated ({totalAllocated}) ≠ trip length ({tripDays}) — planner follows your allocation.</p>)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTrip.items.length > 0 && (
              <div className="mt-14 border-t border-white/60 pt-6">
                {plannedDates.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
                      <SummaryTile label="Days" value={String(plannedDates.length)} /><SummaryTile label="Places" value={String(placeCount)} />
                      <SummaryTile label="Destinations" value={String(new Set(selectedTrip.items.map((i) => i.destination_name).filter(Boolean)).size)} />
                      <SummaryTile label="Pace" value={`${(placeCount / plannedDates.length).toFixed(1)}/day`} />
                    </div>
                    <div className="relative pl-7">
                      {plannedDates.map((date, di) => (
                        <div key={date}
                          onDragOver={(e) => { e.preventDefault(); setDragOverDay(date); }}
                          onDragLeave={() => setDragOverDay((d) => (d === date ? null : d))}
                          onDrop={(e) => { e.preventDefault(); const key = e.dataTransfer.getData('text/plain') || dragKey; if (key) moveItemToDay(key, date); setDragOverDay(null); setDragKey(null); }}
                          className={`relative mb-8 last:mb-0 rounded-3xl transition ${dragOverDay === date ? 'ring-2 ring-violet-400 ring-offset-4 ring-offset-[#e8ecf8] bg-violet-50/40' : ''}`}>
                          <span className={`absolute -left-7 top-0.5 z-10 w-5 h-5 rounded-full bg-gradient-to-br ${GRAD} shadow-[0_0_12px_rgba(139,92,246,0.7)] ring-4 ring-[#e8ecf8]`} />
                          {di < plannedDates.length - 1 && (<span className={`absolute -left-[19px] top-7 -bottom-[36px] w-0.5 bg-gradient-to-b ${GRAD} rounded-full opacity-50`} aria-hidden="true" />)}
                          <div className="flex items-baseline gap-3 mb-3"><p className="text-base font-black text-slate-800">Day {di + 1}</p><p className="text-xs text-slate-500 font-bold">{fmtDate(date)}</p>{dragOverDay === date && <span className="text-[11px] font-black text-violet-600">Drop to move</span>}</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {stopsFor(date).map((it, idx, arr) => (
                              <div key={it.key} className="relative group/note h-full">
                                <div className="h-full flex flex-col">
                                  {it.listing_type === 'Note' ? (
                                    <div className={`flex-1 rounded-2xl ${NEU_SM} ring-1 ring-amber-300/70 p-4 flex flex-col`}>
                                      <span className="self-start px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm mb-2">📝 Note</span>
                                      <p className="text-sm text-slate-700 leading-relaxed flex-1">{it.notes}</p>
                                      <button type="button" onClick={() => removeItem(it)} className="mt-3 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition self-start">Remove</button>
                                    </div>
                                  ) : (
                                    <div draggable
                                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', it.key); e.dataTransfer.effectAllowed = 'move'; setDragKey(it.key); }}
                                      onDragEnd={() => { setDragKey(null); setDragOverDay(null); }}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const key = e.dataTransfer.getData('text/plain') || dragKey; if (key && key !== it.key) swapItems(key, it.key); setDragOverDay(null); setDragKey(null); }}
                                      title="Drag onto another day to move · drop on a card to swap"
                                      className={`group/card relative flex-1 cursor-grab active:cursor-grabbing rounded-2xl transition-all duration-200 ${dragKey === it.key ? 'opacity-40 scale-95 ring-2 ring-violet-400' : `${NEU_SM} hover:-translate-y-1 hover:shadow-[12px_12px_28px_rgba(163,170,205,0.5)]`}`}>
                                      <button type="button" draggable={false} onClick={() => removeItem(it)} title="Remove from trip" aria-label={`Remove ${it.name}`} className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-rose-600 hover:border-rose-400 hover:bg-rose-50 shadow-sm opacity-0 group-hover/card:opacity-100 focus:opacity-100 transition flex items-center justify-center"><CloseIcon className="w-3 h-3" /></button>
                                      <Link href={`/listing/${it.listing_id}`} draggable={false} className="block h-full flex flex-col p-4">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <span className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${GRAD} text-white text-[9px] font-black uppercase tracking-wider shadow-sm`}>{slotLabel(it)}</span>
                                          <select value={(it.start_time ?? '09:00:00').slice(0, 5)} onChange={(e) => changeItemTime(it.key, e.target.value)} onClick={(e) => e.stopPropagation()} draggable={false} aria-label={`Edit time for ${it.name}`} className="w-[5.25rem] shrink-0 px-1 py-1 rounded-lg bg-[#e4e8f4] shadow-[inset_2px_2px_5px_rgba(163,170,205,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] border border-transparent text-[10px] font-bold text-slate-700 focus:ring-2 focus:ring-violet-400/60 outline-none">
                                            {!TIME_OPTIONS.includes((it.start_time ?? '09:00:00').slice(0, 5)) && (<option value={(it.start_time ?? '09:00:00').slice(0, 5)}>{fmtTime(it.start_time)}</option>)}
                                            {TIME_OPTIONS.map((opt) => (<option key={opt} value={opt} disabled={timeOptionDisabled(it, opt)}>{fmtTime(`${opt}:00`)}</option>))}
                                          </select>
                                        </div>
                                        <div className="flex-1 min-h-0"><p className="font-black text-slate-800 text-sm truncate mb-0.5">{it.name}</p><p className="text-[11px] text-slate-500 truncate">{it.listing_type ?? 'Place'}{it.destination_name ? ` · ${it.destination_name}` : ''}</p></div>
                                        {it.rating != null && (<p className="mt-2 pt-2 border-t border-white/60 flex items-center gap-1 text-xs font-black text-amber-600"><Star className="w-3.5 h-3.5" />{Number(it.rating).toFixed(1)}</p>)}
                                      </Link>
                                    </div>
                                  )}
                                </div>
                                {idx < arr.length - 1 && (<button type="button" draggable={false} onClick={() => { setShowNoteModal({ afterKey: it.key, date }); setNoteText(''); }} title="Add a note between these cards" aria-label="Add a note between these cards" className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-500 hover:border-violet-500 hover:text-violet-600 flex items-center justify-center opacity-0 group-hover/note:opacity-100 focus:opacity-100 transition shadow-sm"><PlusIcon className="w-3 h-3" /></button>)}
                              </div>
                            ))}
                            {stopsFor(date).length === 0 && (<p className={`col-span-full text-center text-xs text-slate-400 font-semibold py-6 ${INSET} rounded-2xl`}>Empty day — drag a place here or auto-plan.</p>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={`rounded-3xl border-2 border-dashed border-violet-300/60 ${NEU} p-10 text-center`}>
                    <GlassWellIcon gradient="from-indigo-500 to-violet-500" size="lg"><SparkleIcon className="w-7 h-7" /></GlassWellIcon>
                    <p className="text-base text-slate-700 font-bold mt-5 mb-2">Ready to plan your itinerary?</p>
                    <p className="text-sm text-slate-500">Add places, then press <span className="font-black text-violet-600">Auto-plan</span> — TravelMate assigns mornings, afternoons and evenings across your dates, keeping same-area places together.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className={`hidden lg:block ${GLASS} rounded-[2rem] p-5 sticky top-24 h-[calc(100vh-8rem)]`}><SuggestionPanel /></aside>
        </div>
      ) : null}

      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden bg-slate-900/75 flex justify-end animate-fade-in" onClick={() => setDrawerOpen(false)}>
          <div className={`${MODAL_SURF} w-[88%] max-w-sm h-full p-5 animate-slide-up`} onClick={(e) => e.stopPropagation()}><SuggestionPanel /></div>
        </div>
      )}

      {showNoteModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/75 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowNoteModal(null)}>
          <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full animate-slide-up`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-black text-slate-800">Add a note</h3><button type="button" onClick={() => setShowNoteModal(null)} className="text-slate-400 hover:text-slate-600 transition"><CloseIcon className="w-5 h-5" /></button></div>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={300} rows={3} autoFocus placeholder='e.g., "Withdraw cash before the next stop"' className={`${INPUT} resize-none`} />
            <p className="text-xs text-slate-400 text-right mt-1 font-semibold">{noteText.length}/300</p>
            <div className="flex gap-3 mt-5"><button type="button" onClick={() => setShowNoteModal(null)} className={`flex-1 ${BTN_GHOST} py-3 text-sm`}>Cancel</button><button type="button" onClick={addNoteBetween} disabled={!noteText.trim()} className={`flex-1 ${BTN_PRIMARY} py-3 text-sm disabled:opacity-60`}><span className="relative">Add note</span></button></div>
          </div>
        </div>
      )}

      {destPickerOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/75 flex items-center justify-center p-4 animate-fade-in" onClick={() => setDestPickerOpen(false)}>
          <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full animate-slide-up`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-black text-slate-800">Add destination stop</h3><button type="button" onClick={() => setDestPickerOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><CloseIcon className="w-5 h-5" /></button></div>
            <input value={destSearch} onChange={(e) => setDestSearch(e.target.value)} maxLength={50} placeholder="Search province, city, or country…" autoFocus className={`${INPUT} mb-2`} />
            <p className="text-xs text-slate-400 text-right mb-3 font-semibold">{destSearch.length}/50</p>
            <p className="text-sm text-slate-600 mb-4">{destSearch.trim().length >= 2 ? (<><span className="font-black text-violet-600">{previewCount}</span> place{previewCount === 1 ? '' : 's'} fall inside "{destSearch.trim()}"</>) : 'Type a province, city, or country — e.g., "La Union", "Kyoto".'}</p>
            {regionSuggestions.length > 0 && (<div className="flex flex-wrap gap-2 mb-5">{regionSuggestions.map((r) => (<button key={r} type="button" onClick={() => setDestSearch(r)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${NEU_SM} text-slate-600 hover:text-violet-600 transition active:scale-95`}>{r}</button>))}</div>)}
            <button type="button" disabled={destSearch.trim().length < 2} onClick={() => addStop(destSearch)} className={`w-full ${BTN_PRIMARY} py-3.5 text-sm disabled:opacity-60`}><span className="relative">Add stop "{destSearch.trim() || '…'}"</span></button>
          </div>
        </div>
      )}

      {showTripModal && userId && (<NewTripModal userId={userId} onClose={() => setShowTripModal(false)} onCreated={async (id) => { setShowTripModal(false); await refreshTrips(); setSelectedTripId(id); }} />)}
      {showEditTripModal && selectedTrip && (<EditTripModal trip={selectedTrip} onClose={() => setShowEditTripModal(false)} onUpdated={async () => { setShowEditTripModal(false); await refreshTrips(); }} />)}
      {showReviewTripModal && selectedTrip && userId && (<ReviewTripModal trip={selectedTrip} userId={userId} onClose={() => setShowReviewTripModal(false)} onReviewed={onReviewed} />)}
      {pendingRemove && (
        <div className="fixed inset-0 z-[70] bg-slate-900/75 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPendingRemove(null)}>
          <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full animate-slide-up`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4"><GlassWellIcon gradient="from-rose-500 to-red-500"><TrashIcon className="w-6 h-6" /></GlassWellIcon><div className="min-w-0"><h3 className="text-lg font-black text-slate-800">{pendingRemove.listing_type === 'Note' ? 'Delete this note?' : 'Remove this place?'}</h3><p className="text-sm text-slate-500 truncate">{pendingRemove.name}</p></div></div>
            <p className="text-sm text-slate-600 mb-6">{pendingRemove.listing_type === 'Note' ? 'This note will be permanently removed from your itinerary.' : 'This place will be taken off your itinerary. You can add it back anytime.'}</p>
            <div className="flex gap-3"><button type="button" onClick={() => setPendingRemove(null)} className={`flex-1 ${BTN_GHOST} py-3 text-sm`}>Cancel</button><button type="button" onClick={async () => { await performRemove(pendingRemove); }} className={`flex-1 ${BTN_DANGER} py-3 text-sm`}>{pendingRemove.listing_type === 'Note' ? 'Delete note' : 'Remove'}</button></div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] bg-slate-900/75 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDeleteConfirm(null)}>
          <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full animate-slide-up`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800 mb-3">Delete this trip?</h3>
            <p className="text-sm text-slate-600 mb-6">This permanently deletes the trip and all its places. Cannot be undone.</p>
            <div className="flex gap-3"><button type="button" onClick={() => setShowDeleteConfirm(null)} className={`flex-1 ${BTN_GHOST} py-3 text-sm`}>Cancel</button><button type="button" onClick={() => deleteTrip(showDeleteConfirm)} className={`flex-1 ${BTN_DANGER} py-3 text-sm`}>Delete trip</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewTripModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: (id: string) => void }) {
  const supabase = createClient();
  const [name, setName] = useState(''); const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function create() { setErr(null); setBusy(true); try { if (!name.trim()) throw new Error('Give your trip a name.'); if (start && end && end < start) throw new Error('End date must be after the start date.'); const { data: tripId, error: idErr } = await supabase.rpc('new_trip_id'); if (idErr) throw idErr; const { error } = await supabase.from('trips').insert({ trip_id: tripId as string, user_id: userId, trip_name: name.trim(), start_date: start || null, end_date: end || null }); if (error) throw error; onCreated(tripId as string); } catch (e: any) { setErr(e?.message ?? 'Could not create the trip.'); setBusy(false); } }
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/75 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full animate-slide-up`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-black text-slate-800">Plan a new trip</h3><button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition"><CloseIcon className="w-5 h-5" /></button></div>
        {err && <p className={`${GLASS} border-rose-200/70 text-rose-700 rounded-2xl px-4 py-2.5 text-sm font-semibold mb-4`}>{err}</p>}
        <div className="space-y-4">
          <div><div className="flex items-baseline justify-between mb-1.5"><label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Trip name</label><span className="text-[11px] text-slate-400 font-semibold">{name.length}/100</span></div><input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g., Japan Spring Adventure" className={INPUT} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500 mb-1.5">Start</label><input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} className={INPUT} /></div><div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500 mb-1.5">End</label><input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={INPUT} /></div></div>
        </div>
        <div className="flex gap-3 mt-6"><button type="button" onClick={onClose} className={`flex-1 ${BTN_GHOST} py-3 text-sm`}>Cancel</button><button type="button" onClick={create} disabled={busy} className={`flex-1 ${BTN_PRIMARY} py-3 text-sm disabled:opacity-60`}><span className="relative">{busy ? 'Creating…' : 'Create trip'}</span></button></div>
      </div>
    </div>
  );
}
function EditTripModal({ trip, onClose, onUpdated }: { trip: TripData; onClose: () => void; onUpdated: () => void }) {
  const supabase = createClient();
  const [name, setName] = useState(trip.trip_name ?? ''); const [start, setStart] = useState(trip.start_date ?? ''); const [end, setEnd] = useState(trip.end_date ?? ''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function update() { setErr(null); setBusy(true); try { if (!name.trim()) throw new Error('Give your trip a name.'); if (start && end && end < start) throw new Error('End date must be after the start date.'); const { error } = await supabase.from('trips').update({ trip_name: name.trim(), start_date: start || null, end_date: end || null }).eq('trip_id', trip.trip_id); if (error) throw error; onUpdated(); } catch (e: any) { setErr(e?.message ?? 'Could not update the trip.'); setBusy(false); } }
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/75 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className={`${MODAL_SURF} rounded-3xl p-7 max-w-md w-full animate-slide-up`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-black text-slate-800">Edit trip</h3><button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition"><CloseIcon className="w-5 h-5" /></button></div>
        {err && <p className={`${GLASS} border-rose-200/70 text-rose-700 rounded-2xl px-4 py-2.5 text-sm font-semibold mb-4`}>{err}</p>}
        <div className="space-y-4">
          <div><div className="flex items-baseline justify-between mb-1.5"><label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Trip name</label><span className="text-[11px] text-slate-400 font-semibold">{name.length}/100</span></div><input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={INPUT} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500 mb-1.5">Start</label><input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} className={INPUT} /></div><div><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500 mb-1.5">End</label><input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={INPUT} /></div></div>
        </div>
        <div className="flex gap-3 mt-6"><button type="button" onClick={onClose} className={`flex-1 ${BTN_GHOST} py-3 text-sm`}>Cancel</button><button type="button" onClick={update} disabled={busy} className={`flex-1 ${BTN_PRIMARY} py-3 text-sm disabled:opacity-60`}><span className="relative">{busy ? 'Updating…' : 'Update trip'}</span></button></div>
      </div>
    </div>
  );
}
function ReviewTripModal({ trip, userId, onClose, onReviewed }: { trip: TripData; userId: string; onClose: () => void; onReviewed?: (listingId: string) => void }) {
  const supabase = createClient();
  const [places] = useState<TripItem[]>(() => trip.items.filter((i) => i.listing_type !== 'Note'));
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [rating, setRating] = useState(0); const [hoverStar, setHoverStar] = useState(0); const [title, setTitle] = useState(''); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [checking, setChecking] = useState(true);
  const current = places.find((p) => !doneKeys.has(p.key)) ?? null;
  const doneCount = places.filter((p) => doneKeys.has(p.key)).length;
  const allDone = !current; const pct = places.length ? Math.round((doneCount / places.length) * 100) : 100;
  useEffect(() => { async function checkExisting() { const listingIds = [...new Set(places.map((p) => p.listing_id))]; if (!listingIds.length) { setChecking(false); return; } const { data } = await supabase.from('reviews').select('listing_id').eq('user_id', userId).in('listing_id', listingIds); const reviewed = new Set((data ?? []).map((r: any) => r.listing_id)); setDoneKeys(new Set(places.filter((p) => reviewed.has(p.listing_id)).map((p) => p.key))); setChecking(false); } checkExisting(); }, []);
  function resetForm() { setRating(0); setHoverStar(0); setTitle(''); setText(''); setErr(null); }
  async function recalcAverage(listingId: string) { const { data: all } = await supabase.from('reviews').select('rating').eq('listing_id', listingId); if (!all || !all.length) return; const avg = all.reduce((s, r: any) => s + Number(r.rating), 0) / all.length; await supabase.from('listings').update({ average_rating: Math.round(avg * 10) / 10 }).eq('listing_id', listingId); }
  async function submit(markDoneOnly = false) { if (!current) return; if (!markDoneOnly && rating < 1) { setErr('Tap a star to rate this place.'); return; } setErr(null); setBusy(true); try { if (!markDoneOnly) { const { error } = await supabase.from('reviews').insert({ review_id: `REV-${Date.now().toString().slice(-8)}`, listing_id: current.listing_id, user_id: userId, rating, title: title.trim() || null, review_text: text.trim() || `(rated ${rating}/5 — no written review)`, visit_date: trip.end_date || new Date().toISOString().slice(0, 10), submission_date: new Date().toISOString().slice(0, 10), helpful_votes_count: 0, photo_url: null }); if (error) throw error; await recalcAverage(current.listing_id); onReviewed?.(current.listing_id); } setDoneKeys((prev) => new Set(prev).add(current.key)); resetForm(); } catch (e: any) { setErr(e?.message ?? 'Could not save your review.'); } setBusy(false); }
  const starLabels = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Excellent']; const shown = hoverStar || rating;
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/75 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className={`${MODAL_SURF} rounded-3xl p-6 md:p-7 max-w-lg w-full animate-slide-up max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5"><div><h3 className="text-lg font-black text-slate-800">Review your trip</h3><p className="text-xs text-slate-500 mt-0.5 font-semibold">{trip.trip_name ?? 'This trip'} · {fmtDate(trip.end_date)}</p></div><button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 transition"><CloseIcon className="w-5 h-5" /></button></div>
        {checking ? (
          <div className="py-10 text-center text-sm text-slate-500 font-medium">Checking your reviews…</div>
        ) : places.length === 0 ? (
          <div className="text-center py-8"><p className="text-4xl mb-3">🗺️</p><p className="text-sm text-slate-600">This trip has no places to review yet.</p><button type="button" onClick={onClose} className={`mt-6 w-full ${BTN_GHOST} py-3 text-sm`}>Close</button></div>
        ) : allDone ? (
          <div className="text-center py-8"><GlassWellIcon gradient="from-emerald-400 to-teal-500" size="lg"><span className="text-2xl">🎉</span></GlassWellIcon><h4 className="text-lg font-black text-slate-800 mt-4 mb-2">{doneCount === places.length ? 'All reviewed!' : 'All caught up!'}</h4><p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">{doneCount === places.length ? 'Your reviews are live on each place page — thank you for helping other travelers.' : 'You have already reviewed every place on this trip.'}</p><button type="button" onClick={onClose} className={`w-full ${BTN_PRIMARY} py-3 text-sm`}><span className="relative">Done</span></button></div>
        ) : current ? (
          <>
            <div className="flex items-center justify-between text-[11px] font-black text-slate-500 mb-1.5"><span>Place {doneCount + 1} of {places.length}</span><span className={GRAD_TEXT}>{pct}%</span></div>
            <div className={`${INSET} w-full h-2.5 rounded-full mb-5 overflow-hidden`}><div className={`h-full rounded-full transition-all duration-700 ${GLOSS} bg-gradient-to-r ${GRAD}`} style={{ width: `${pct}%` }} /></div>
            <div className={`flex items-center gap-3 p-3.5 rounded-2xl ${NEU_SM} mb-5`}><GlassWellIcon gradient="from-indigo-500 to-violet-500"><span className="w-12 h-12 flex items-center justify-center font-black">{current.listing_type?.charAt(0) ?? 'P'}</span></GlassWellIcon><div className="min-w-0"><p className="font-black text-slate-800 truncate text-sm">{current.name}</p><p className="text-[11px] text-slate-500 truncate font-semibold">{current.listing_type}{current.destination_name ? ` · ${current.destination_name}` : ''}</p></div></div>
            {err && <p className={`${GLASS} border-rose-200/70 text-rose-700 rounded-2xl px-4 py-2.5 text-sm font-semibold mb-4`}>{err}</p>}
            <div className="mb-4"><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500 mb-2">Your rating</label><div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((n) => (<button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHoverStar(n)} onMouseLeave={() => setHoverStar(0)} aria-label={`${n} star${n === 1 ? '' : 's'}`} className={`p-1 rounded-lg transition hover:scale-110 active:scale-95 ${n <= shown ? 'text-amber-400' : 'text-slate-300'}`}><Star className="w-8 h-8" /></button>))}{shown > 0 && <span className="ml-2 text-sm font-black text-slate-600">{starLabels[shown]}</span>}</div></div>
            <div className="mb-3"><div className="flex items-baseline justify-between mb-1"><label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Headline <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></label><span className="text-[11px] text-slate-400 font-semibold">{title.length}/60</span></div><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Sum it up in a few words" className={INPUT} /></div>
            <div className="mb-5"><div className="flex items-baseline justify-between mb-1"><label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Your review <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></label><span className="text-[11px] text-slate-400 font-semibold">{text.length}/300</span></div><textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={300} placeholder="What stood out? Food, service, vibes, tips…" className={`${INPUT} resize-none`} /></div>
            <div className="flex gap-3"><button type="button" onClick={() => submit(true)} disabled={busy} className={`flex-1 ${BTN_GHOST} py-3 text-sm disabled:opacity-60`}>Skip</button><button type="button" onClick={() => submit(false)} disabled={busy || rating < 1} className={`flex-1 ${BTN_PRIMARY} py-3 text-sm disabled:opacity-60`}><span className="relative">{busy ? 'Saving…' : doneCount + 1 === places.length ? 'Submit & finish' : 'Submit & next'}</span></button></div>
          </>
        ) : null}
      </div>
    </div>
  );
}