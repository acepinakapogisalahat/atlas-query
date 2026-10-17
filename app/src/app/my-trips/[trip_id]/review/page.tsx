// app/src/app/my-trips/[trip_id]/review/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useRole } from '@/utils/supabase/role';

type TripDetail = {
  trip_id: string;
  trip_name: string | null;
  start_date: string | null;
  end_date: string | null;
};

type ReviewPlace = {
  listing_id: string;
  name: string;
  listing_type: string | null;
  image_url: string | null;
  destination_name: string | null;
  planned_date: string | null;
  start_time: string | null;
  sequence_no: number | null;
};

type PlaceStatus = 'reviewed' | 'skipped';

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className ?? 'w-4 h-4'}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" />
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? 'w-4 h-4'}>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" strokeLinecap="round" />
    </svg>
  );
}

function getTripStatus(t: { start_date: string | null; end_date: string | null }): string {
  const today = new Date().toISOString().slice(0, 10);
  if (!t.start_date || !t.end_date) return 'upcoming';
  if (today > t.end_date) return 'finished';
  if (today >= t.start_date && today <= t.end_date) return 'ongoing';
  return 'upcoming';
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function fmtTime(t: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const hr12 = hr % 12 === 0 ? 12 : hr % 12;
  return `${hr12}:${m} ${ampm}`;
}

export default function ReviewTripPage() {
  const supabase = createClient();
  const role = useRole();
  const router = useRouter();
  const params = useParams() as { trip_id?: string | string[] };
  const tripId = Array.isArray(params.trip_id) ? params.trip_id[0] : params.trip_id ?? '';

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [places, setPlaces] = useState<ReviewPlace[]>([]);
  const [status, setStatus] = useState<Record<string, PlaceStatus>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!role.loading && (role.isOwner || role.isAdmin)) router.replace('/business');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.loading, role.isOwner, role.isAdmin]);

  useEffect(() => {
    if (!role.loading && role.userId && tripId) load(role.userId);
    if (!role.loading && !role.userId) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.loading, role.userId, tripId]);

  async function load(uid: string) {
    setLoading(true);
    setNotFound(false);

    const { data: tripRow } = await supabase
      .from('trips')
      .select('trip_id, trip_name, start_date, end_date')
      .eq('trip_id', tripId)
      .eq('user_id', uid)
      .maybeSingle();

    if (!tripRow) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setTrip({
      trip_id: tripRow.trip_id,
      trip_name: tripRow.trip_name ?? null,
      start_date: tripRow.start_date ?? null,
      end_date: tripRow.end_date ?? null,
    });

    const { data: itemRows } = await supabase.from('trip_items').select('*').eq('trip_id', tripId);
    const items = (itemRows ?? []) as any[];

    const listingIds = [...new Set(items.map((i) => i.listing_id).filter(Boolean))] as string[];

    const lMap: Record<string, any> = {};
    if (listingIds.length) {
      const { data: ls } = await supabase
        .from('listings')
        .select('listing_id, name, listing_type, image_url, destination:destination_id(destination_name)')
        .in('listing_id', listingIds);

      (ls ?? []).forEach((l: any) => {
        lMap[l.listing_id] = l;
      });
    }

    const firstItemByListing: Record<string, any> = {};
    items.forEach((i) => {
      if (!i.listing_id) return;
      if (!firstItemByListing[i.listing_id]) firstItemByListing[i.listing_id] = i;
    });

    const built: ReviewPlace[] = listingIds.map((id) => {
      const l = lMap[id];
      const it = firstItemByListing[id];
      return {
        listing_id: id,
        name: l?.name ?? id,
        listing_type: l?.listing_type ?? null,
        image_url: l?.image_url ?? null,
        destination_name: l?.destination?.destination_name ?? null,
        planned_date: it?.planned_date ?? null,
        start_time: it?.start_time ?? null,
        sequence_no: it?.sequence_no ?? null,
      };
    });

    const scheduled = built.filter((p) => p.planned_date);
    const unscheduled = built.filter((p) => !p.planned_date);

    scheduled.sort((a, b) => {
      const d = (a.planned_date ?? '').localeCompare(b.planned_date ?? '');
      if (d !== 0) return d;
      const s = (a.sequence_no ?? 0) - (b.sequence_no ?? 0);
      if (s !== 0) return s;
      const t = (a.start_time ?? '').localeCompare(b.start_time ?? '');
      if (t !== 0) return t;
      return a.name.localeCompare(b.name);
    });

    unscheduled.sort((a, b) => a.name.localeCompare(b.name));

    const sorted = [...scheduled, ...unscheduled];
    setPlaces(sorted);

    const initialStatus: Record<string, PlaceStatus> = {};
    if (listingIds.length) {
      const { data: revs } = await supabase
        .from('reviews')
        .select('listing_id')
        .eq('user_id', uid)
        .in('listing_id', listingIds);

      (revs ?? []).forEach((r: any) => {
        initialStatus[r.listing_id] = 'reviewed';
      });
    }

    setStatus(initialStatus);

    const firstPending = sorted.find((p) => !initialStatus[p.listing_id]);
    setSelectedId(firstPending?.listing_id ?? null);

    setLoading(false);
  }

  async function recalcAverage(listingId: string) {
    const { data: all } = await supabase.from('reviews').select('rating').eq('listing_id', listingId);
    if (!all || !all.length) return;
    const avg = all.reduce((s, r: any) => s + Number(r.rating), 0) / all.length;
    await supabase.from('listings').update({ average_rating: Math.round(avg * 10) / 10 }).eq('listing_id', listingId);
  }

  function resetForm() {
    setRating(0);
    setHoverStar(0);
    setTitle('');
    setText('');
    setErr(null);
  }

  const tripStatus = trip ? getTripStatus(trip) : 'upcoming';
  const canReview = tripStatus === 'finished';

  const pendingPlaces = places.filter((p) => !status[p.listing_id]);
  const activePlace = pendingPlaces.find((p) => p.listing_id === selectedId) ?? pendingPlaces[0] ?? null;

  const reviewedCount = places.filter((p) => status[p.listing_id] === 'reviewed').length;
  const skippedCount = places.filter((p) => status[p.listing_id] === 'skipped').length;
  const handledCount = reviewedCount + skippedCount;
  const progress = places.length > 0 ? Math.round((handledCount / places.length) * 100) : 0;

  const starLabels = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Excellent'];
  const shownStars = hoverStar || rating;

  async function submitReview() {
    if (!activePlace) return;
    if (rating < 1) {
      setErr('Tap a star to rate this place.');
      return;
    }

    setErr(null);
    setBusy(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        review_id: `REV-${Date.now().toString().slice(-8)}`,
        listing_id: activePlace.listing_id,
        user_id: role.userId,
        rating,
        title: title.trim() || null,
        review_text: text.trim() || `(rated ${rating}/5 — no written review)`,
        visit_date: trip?.end_date || new Date().toISOString().slice(0, 10),
        submission_date: new Date().toISOString().slice(0, 10),
        helpful_votes_count: 0,
        photo_url: null,
      });

      if (error) throw error;

      await recalcAverage(activePlace.listing_id);

      const nextStatus = { ...status, [activePlace.listing_id]: 'reviewed' as PlaceStatus };
      setStatus(nextStatus);
      resetForm();

      const next = places.find((p) => !nextStatus[p.listing_id]);
      setSelectedId(next?.listing_id ?? null);
    } catch (e: any) {
      setErr(e?.message ?? 'Could not save your review.');
    }

    setBusy(false);
  }

  function skipPlace() {
    if (!activePlace) return;
    const nextStatus = { ...status, [activePlace.listing_id]: 'skipped' as PlaceStatus };
    setStatus(nextStatus);
    resetForm();
    const next = places.find((p) => !nextStatus[p.listing_id]);
    setSelectedId(next?.listing_id ?? null);
  }

  if (role.loading || loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center pb-16 page-enter">
        <p className="text-sm text-slate-400">Loading trip review…</p>
      </main>
    );
  }

  if (!role.authId) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Review your trip</h1>
          <p className="text-slate-500 text-sm">
            <Link href="/login" className="text-blue-600 underline">
              Sign in
            </Link>{' '}
            to review places from your trips.
          </p>
        </div>
      </main>
    );
  }

  if (notFound || !trip) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <MapIcon className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Trip not found</h1>
          <p className="text-sm text-slate-500 mb-6">This trip may have been deleted or belongs to another account.</p>
          <Link href="/my-trips" className="inline-block px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition">
            Back to my trips
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16 page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link href="/my-trips" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            ← Back to my trips
          </Link>
          <Link href={`/?trip=${trip.trip_id}`} className="text-sm font-medium text-slate-500 hover:text-slate-700">
            Open in planner
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{trip.trip_name ?? `Trip ${trip.trip_id}`}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {fmtDate(trip.start_date)} → {fmtDate(trip.end_date)}
              </p>
            </div>
            <div className="shrink-0">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  tripStatus === 'finished'
                    ? 'bg-slate-100 text-slate-700'
                    : tripStatus === 'ongoing'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {tripStatus === 'finished' ? 'Finished' : tripStatus === 'ongoing' ? 'Ongoing' : 'Upcoming'}
              </span>
            </div>
          </div>

          {places.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>
                  {handledCount} of {places.length} places handled
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {!canReview ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <StarIcon className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Reviews unlock after the trip ends</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              You can review places once the trip status is <span className="font-semibold">Finished</span>. This keeps ratings tied to
              real visits.
            </p>
            <Link
              href="/my-trips"
              className="inline-block mt-6 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
            >
              Back to my trips
            </Link>
          </div>
        ) : places.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <MapIcon className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No places to review</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              This trip does not have any saved places yet. Add places from the planner first.
            </p>
            <Link
              href={`/?trip=${trip.trip_id}`}
              className="inline-block mt-6 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
            >
              Open planner
            </Link>
          </div>
        ) : pendingPlaces.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 text-3xl">
              🎉
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">All done!</h2>
            <p className="text-sm text-slate-500 mb-6">
              You reviewed <span className="font-semibold text-slate-700">{reviewedCount}</span> place
              {reviewedCount === 1 ? '' : 's'} and skipped{' '}
              <span className="font-semibold text-slate-700">{skippedCount}</span>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/my-trips"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
              >
                Back to my trips
              </Link>
              <Link
                href={`/?trip=${trip.trip_id}`}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Open in planner
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
            {/* Itinerary sidebar */}
            <aside className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Itinerary</h2>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {places.map((p, idx) => {
                  const st = status[p.listing_id];
                  const isActive = activePlace?.listing_id === p.listing_id;
                  return (
                    <button
                      key={p.listing_id}
                      type="button"
                      disabled={Boolean(st)}
                      onClick={() => setSelectedId(p.listing_id)}
                      className={`w-full text-left rounded-xl border p-3 transition ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : st
                            ? 'border-slate-200 bg-slate-50 opacity-70 cursor-default'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                            st === 'reviewed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : st === 'skipped'
                                ? 'bg-slate-200 text-slate-600'
                                : isActive
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {st === 'reviewed' ? <CheckIcon className="w-3.5 h-3.5" /> : idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {p.planned_date ? `${fmtDate(p.planned_date)}${p.start_time ? ` · ${fmtTime(p.start_time)}` : ''}` : 'Unscheduled'}
                          </p>
                          {st && (
                            <p className={`text-[11px] font-semibold mt-1 ${st === 'reviewed' ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {st === 'reviewed' ? 'Reviewed' : 'Skipped'}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Review form */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              {activePlace ? (
                <>
                  <div className="flex items-start gap-4 mb-6">
                    {activePlace.image_url ? (
                      <img src={activePlace.image_url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0 shadow-sm" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-2xl shadow-sm">
                        {activePlace.listing_type?.charAt(0) ?? 'P'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Place {handledCount + 1} of {places.length}
                      </p>
                      <h2 className="text-xl font-bold text-slate-900 truncate">{activePlace.name}</h2>
                      <p className="text-sm text-slate-500 mt-1 truncate">
                        {activePlace.listing_type ?? 'Place'}
                        {activePlace.destination_name ? ` · ${activePlace.destination_name}` : ''}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {activePlace.planned_date
                          ? `${fmtDate(activePlace.planned_date)}${activePlace.start_time ? ` · ${fmtTime(activePlace.start_time)}` : ''}`
                          : 'Unscheduled'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={skipPlace}
                      disabled={busy}
                      className="shrink-0 w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex items-center justify-center"
                      title="Skip this place"
                      aria-label="Skip this place"
                    >
                      <CloseIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {err && <p className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm mb-4">{err}</p>}

                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Your rating</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          onMouseEnter={() => setHoverStar(n)}
                          onMouseLeave={() => setHoverStar(0)}
                          aria-label={`${n} star${n === 1 ? '' : 's'}`}
                          className={`p-1 rounded-lg transition hover:scale-110 ${n <= shownStars ? 'text-amber-400' : 'text-slate-300'}`}
                        >
                          <StarIcon className="w-9 h-9" />
                        </button>
                      ))}
                      {shownStars > 0 && <span className="ml-2 text-sm font-semibold text-slate-600">{starLabels[shownStars]}</span>}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label className="block text-sm font-semibold text-slate-700">
                        Headline <span className="font-normal text-slate-400"></span>
                      </label>
                      <span className="text-xs text-slate-400">{title.length}/60</span>
                    </div>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={60}
                      placeholder="Sum it up in a few words"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition bg-white"
                    />
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label className="block text-sm font-semibold text-slate-700">
                        Your review <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <span className="text-xs text-slate-400">{text.length}/300</span>
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={4}
                      maxLength={300}
                      placeholder="What stood out? Food, service, vibes, tips for other travelers…"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition bg-white resize-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={skipPlace}
                      disabled={busy}
                      className="flex-1 py-3.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-60"
                    >
                      Skip this one
                    </button>
                    <button
                      type="button"
                      onClick={submitReview}
                      disabled={busy || rating < 1}
                      className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition shadow-sm disabled:opacity-60 btn-press"
                    >
                      {busy ? 'Saving…' : handledCount + 1 === places.length ? 'Submit & finish' : 'Submit & next'}
                    </button>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}