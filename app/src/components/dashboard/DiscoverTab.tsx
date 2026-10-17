// app/src/components/dashboard/DiscoverTab.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  NEU,
  NEU_SM,
  INSET,
  GLASS_SM,
  GRAD,
  GRAD_TEXT,
  PILL_ACTIVE,
  FLOAT_SHADOW,
  Star,
  Chevron,
  MapIcon,
  SparkleIcon,
  SectionHeader,
  PlaceOverlay,
  EmptyBox,
  Link,
  type Rec,
  type ExploreCard,
} from '@/components/dashboard/kit';

const EXPLORE_TABS = ['All', 'Attraction', 'Hotel', 'Restaurant'] as const;
const byRating = (a: ExploreCard, b: ExploreCard) => (b.average_rating ?? -1) - (a.average_rating ?? -1);

type Props = {
  explore: ExploreCard[];
  recs: Rec[];
  hasPersonal: boolean;
  trending: { name: string; country: string; rating: number }[];
  recent: string[];
  descMap: Record<string, string>;
  subtypeMap: Record<string, { label: string; value: string }>;
  destExtra: Record<string, { count: number; top: string[] }>;
  goSearch: (q?: string) => void;
};

// Circular match-score indicator — fills the card with the ONE signal the
// recommendations table actually gives us (score), so no image is needed and
// there is no empty "hero" void to design around.
function MatchRing({ pct, uid }: { pct: number; uid: string }) {
  const safe = String(uid).replace(/[^a-zA-Z0-9]/g, '') || 'ring';
  const r = 26;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const off = c * (1 - clamped / 100);
  const gid = `ring-${safe}`;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-black text-slate-700">
        {clamped}<span className="text-[9px] align-top">%</span>
      </span>
    </div>
  );
}

function DiscoverTab({
  explore,
  recs,
  hasPersonal,
  trending,
  descMap,
  subtypeMap,
  destExtra,
}: Props) {
  const [exploreType, setExploreType] = useState<(typeof EXPLORE_TABS)[number]>('All');
  const [hover, setHover] = useState<
    | { kind: 'listing'; id: string; rect: { top: number; bottom: number; left: number; width: number } }
    | { kind: 'destination'; name: string; rect: { top: number; bottom: number; left: number; width: number } }
    | null
  >(null);
  const hoverTimer = useRef<any>(null);
  const hoverElRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function startHover(
    payload: { kind: 'listing'; id: string } | { kind: 'destination'; name: string },
    el: HTMLElement
  ) {
    clearTimeout(hoverTimer.current);
    hoverElRef.current = el;
    const r = el.getBoundingClientRect();
    const rect = { top: r.top, bottom: r.bottom, left: r.left, width: r.width };
    hoverTimer.current = setTimeout(() => setHover({ ...payload, rect } as any), 350);
  }

  function cancelHover() {
    clearTimeout(hoverTimer.current);
    hoverElRef.current = null;
    setHover(null);
  }

  const isHovering = hover !== null;
  useEffect(() => {
    if (!isHovering) return;
    const remeasure = () => {
      const el = hoverElRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setHover((prev) =>
        prev ? ({ ...prev, rect: { top: r.top, bottom: r.bottom, left: r.left, width: r.width } } as any) : prev
      );
    };
    window.addEventListener('scroll', remeasure, true);
    window.addEventListener('resize', remeasure);
    return () => {
      window.removeEventListener('scroll', remeasure, true);
      window.removeEventListener('resize', remeasure);
    };
  }, [isHovering]);

  function popoverStyle(rect: { top: number; bottom: number; left: number; width: number }) {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const center = rect.left + rect.width / 2;
    const left = Math.min(Math.max(center, 176), vw - 176);
    const above = rect.top > 280;
    return above
      ? { top: rect.top - 10, left, transform: 'translate(-50%, -100%)' }
      : { top: rect.bottom + 10, left, transform: 'translate(-50%, 0)' };
  }

  const exploreList = explore
    .filter((l) => exploreType === 'All' || l.listing_type === exploreType)
    .sort(byRating);

  const hoverListing = hover?.kind === 'listing' ? explore.find((l) => l.listing_id === hover.id) ?? null : null;
  const hoverDest = hover?.kind === 'destination' ? trending.find((t) => t.name === hover.name) ?? null : null;

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Community favorites / Top picks — uniform match-ring cards (no hero void) */}
      <section>
        <SectionHeader
          title={hasPersonal ? 'Top picks for you' : 'Community favorites'}
          helper={hasPersonal ? 'From your recommendation profile' : 'Most-recommended places across TravelMate'}
        />

        {recs.length === 0 ? (
          <div className={`${NEU} rounded-[1.75rem]`}>
            <EmptyBox
              icon={<SparkleIcon className="w-7 h-7" />}
              title="No recommendations yet"
              sub="Run a search to build your profile and get personalized picks."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recs.map((r, i) => {
              const dest = r.listing?.destination;
              const pct = Math.round(Number(r.recommendation_score) * 100);
              const uid = r.listing?.listing_id ?? `rec-${i}`;

              return (
                <Link
                  key={uid}
                  href={`/listing/${r.listing?.listing_id ?? ''}`}
                  className={`group relative overflow-hidden rounded-3xl p-5 ${NEU_SM} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[10px_10px_28px_rgba(163,170,205,0.5)]`}
                >
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 text-[10px] font-black uppercase tracking-[0.15em]">
                        <SparkleIcon className="w-3 h-3" />
                        {r.listing?.listing_type ?? 'Place'}
                      </span>
                      <p className="mt-2 font-black text-slate-800 text-lg leading-snug line-clamp-2 group-hover:text-violet-600 transition">
                        {r.listing?.name ?? '—'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 truncate flex items-center gap-1">
                        <MapIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {dest?.region_country ?? '—'}
                      </p>
                    </div>
                    <MatchRing pct={pct} uid={uid} />
                  </div>

                  <p className="mt-3 text-xs text-slate-500 leading-relaxed line-clamp-2 border-t border-white/60 pt-3">
                    {r.recommendation_reason ?? 'Community favorite'}
                  </p>

                  <PlaceOverlay
                    type={r.listing?.listing_type ?? 'Place'}
                    description={descMap[r.listing?.listing_id ?? ''] || null}
                    fact={subtypeMap[r.listing?.listing_id ?? '']}
                    footer="Click for full details"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Trending destinations */}
      <section>
        <SectionHeader title="Trending destinations" helper="Highest-rated across our listings" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {trending.map((t, i) => {
            const extra = destExtra[t.name];

            return (
              <Link
                key={t.name}
                href={`/search?q=${encodeURIComponent(t.name)}`}
                onMouseEnter={(e) => startHover({ kind: 'destination', name: t.name }, e.currentTarget)}
                onMouseLeave={cancelHover}
                className={`group relative overflow-hidden rounded-3xl p-5 ${NEU_SM} transition-all duration-300 hover:-translate-y-1 hover:shadow-[12px_12px_30px_rgba(163,170,205,0.5)]`}
              >
                <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${GRAD} opacity-70`} />

                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-black ${GRAD_TEXT}`}>#{i + 1}</span>
                  <span className="flex items-center gap-1 text-sm font-black text-amber-600">
                    <Star className="w-4 h-4" />
                    {t.rating.toFixed(1)}
                  </span>
                </div>

                <p className="text-lg font-black text-slate-800 leading-snug group-hover:text-violet-600 transition line-clamp-1">
                  {t.name}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-0.5">
                  {t.country}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-500">
                    {extra?.count ?? 0} listing{(extra?.count ?? 0) === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-black text-slate-500 group-hover:text-violet-600 transition">
                    View
                    <Chevron className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Explore places — vertical grid with capped scroll */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Explore places</h2>
            <p className="text-sm text-slate-500 mt-1">
              Discover {exploreList.length} curated destinations
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {EXPLORE_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setExploreType(t)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition active:scale-95 ${
                  exploreType === t ? PILL_ACTIVE : `${NEU_SM} text-slate-600 hover:text-violet-600`
                }`}
              >
                <span className="relative">{t === 'All' ? 'All' : `${t}s`}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 max-h-[72vh] overflow-y-auto pr-2 pb-4">
            {exploreList.map((l) => (
              <Link
                key={l.listing_id}
                href={`/listing/${l.listing_id}`}
                onMouseEnter={(e) => startHover({ kind: 'listing', id: l.listing_id }, e.currentTarget)}
                onMouseLeave={cancelHover}
                className={`group relative overflow-hidden rounded-[1.75rem] ${NEU} transition-all duration-300 hover:-translate-y-1 hover:shadow-[16px_16px_42px_rgba(163,170,205,0.55)]`}
              >
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100">
                  {l.image_url ? (
                    <img src={l.image_url} alt={l.name} className="w-full h-full object-cover img-zoom" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl font-black text-violet-300">{l.listing_type.charAt(0)}</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/25 to-transparent" />

                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 text-slate-700 shadow">
                    {l.listing_type}
                  </span>

                  {l.average_rating != null && (
                    <span className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur text-white text-xs font-black">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      {Number(l.average_rating).toFixed(1)}
                    </span>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-black text-white text-xl leading-tight line-clamp-1">{l.name}</h3>
                    <p className="text-white/80 text-xs font-bold truncate">
                      {l.destination?.destination_name}, {l.destination?.region_country}
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                    {subtypeMap[l.listing_id]
                      ? subtypeMap[l.listing_id].value
                      : (l.description ?? '').slice(0, 110) ||
                        'Discover this amazing place and create unforgettable memories'}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${GLASS_SM} text-violet-600 text-xs font-black`}>
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      {l.average_rating != null ? Number(l.average_rating).toFixed(1) : 'New'}
                    </span>

                    <span className="text-xs font-black text-slate-500 group-hover:text-violet-600 transition flex items-center gap-1">
                      View
                      <Chevron className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {exploreList.length === 0 && (
              <div className="sm:col-span-2 xl:col-span-3">
                <EmptyBox
                  icon={<MapIcon className="w-7 h-7" />}
                  title="No listings yet"
                  sub="Check back soon for amazing destinations!"
                />
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#e8ecf8] via-[#e8ecf8]/70 to-transparent" />
        </div>
      </section>

      {/* Hover popovers — portaled to <body> (escapes the transformed tab wrapper + inner scroll grid) */}
      {mounted && hover && (hoverListing || hoverDest) &&
        createPortal(
          <div className="fixed z-[90] w-80 pointer-events-none" style={popoverStyle(hover.rect)}>
            <div className={`${NEU} rounded-3xl ${FLOAT_SHADOW} p-5 flex flex-col gap-3 animate-scale-in`}>
              {hoverListing && (
                <>
                  <div className="flex items-center gap-4">
                    {hoverListing.image_url ? (
                      <img src={hoverListing.image_url} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0 shadow-md" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 shrink-0 flex items-center justify-center text-violet-400 font-black text-2xl">
                        {hoverListing.listing_type.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-800 text-base truncate">{hoverListing.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {hoverListing.destination?.destination_name}, {hoverListing.destination?.region_country}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full ${GLASS_SM} text-violet-600 text-[10px] font-black uppercase tracking-wider`}>
                      {hoverListing.listing_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-base font-black text-amber-600">
                    <Star className="w-5 h-5" />
                    {hoverListing.average_rating != null ? Number(hoverListing.average_rating).toFixed(1) : 'Not rated yet'}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                    {descMap[hoverListing.listing_id] || 'No description yet — click to see reviews and photos.'}
                  </p>

                  {subtypeMap[hoverListing.listing_id] && (
                    <p className="text-xs text-slate-600">
                      <span className="font-black uppercase tracking-wider text-slate-500">
                        {subtypeMap[hoverListing.listing_id].label}:{' '}
                      </span>
                      {subtypeMap[hoverListing.listing_id].value}
                    </p>
                  )}

                  <p className="text-xs font-black text-violet-600">Click to open full page →</p>
                </>
              )}

              {hoverDest && (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shrink-0 flex items-center justify-center text-white shadow-lg">
                      <MapIcon className="w-7 h-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-800 text-base truncate">{hoverDest.name}</p>
                      <p className="text-sm text-slate-500 truncate">{hoverDest.country}</p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full ${GLASS_SM} text-violet-600 text-[10px] font-black uppercase tracking-wider`}>
                      Destination
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-base font-black text-amber-600">
                    <Star className="w-5 h-5" />
                    {hoverDest.rating.toFixed(1)} average
                  </div>

                  <p className="text-sm text-slate-600">
                    {destExtra[hoverDest.name]?.count ?? 0} listing{(destExtra[hoverDest.name]?.count ?? 0) === 1 ? '' : 's'} on TravelMate
                  </p>

                  {destExtra[hoverDest.name]?.top?.length ? (
                    <p className="text-xs text-slate-600">
                      <span className="font-black uppercase tracking-wider text-slate-500">Popular here: </span>
                      {destExtra[hoverDest.name].top.join(', ')}
                    </p>
                  ) : null}

                  <p className="text-xs font-black text-violet-600">Click to view listings →</p>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default DiscoverTab;