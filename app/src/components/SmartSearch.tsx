// app/src/components/SmartSearch.tsx
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type Hit = {
  listing_id: string;
  name: string;
  listing_type: string;
  destination_name: string;
  region_country: string;
  average_rating: number | null;
  budget_tier: string | null;
  activity_tag: string | null;
};

const TYPES = ['Attraction', 'Hotel', 'Restaurant'];
const BUDGETS = ['Budget', 'Mid-range', 'Luxury'];
const ACTIVITIES = ['Culture & Food', 'Adventure', 'Relaxation', 'Nightlife'];

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-4 h-4'} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 4h18M7 9h10M10 14h4" strokeLinecap="round" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-3.5 h-3.5'} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

export default function SmartSearch({
  placeholder = 'Search places, cities, countries…',
  initialValue = '',
}: {
  placeholder?: string;
  initialValue?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState(initialValue);
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{ type: string | null; budget: string | null; activity: string | null }>({
    type: null,
    budget: null,
    activity: null,
  });
  const boxRef = useRef<HTMLDivElement>(null);     // the inline bar (click-outside anchor)
  const portalRef = useRef<HTMLDivElement>(null);  // the floated panels (also click-inside)
  const debounceRef = useRef<any>(null);
  const typedRef = useRef(false);

  // ── portal positioning (escapes every ancestor stacking context) ──
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  useEffect(() => setMounted(true), []);
  function measure() {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: r.left, width: r.width });
  }
  useLayoutEffect(() => {
    if (open || showFilters) measure();
  }, [open, showFilters]);
  useEffect(() => {
    if (!open && !showFilters) return;
    const h = () => measure();
    window.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    return () => {
      window.removeEventListener('scroll', h, true);
      window.removeEventListener('resize', h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, showFilters]);

  const activeCount = [filters.type, filters.budget, filters.activity].filter(Boolean).length;

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      const inBar = boxRef.current?.contains(t);
      const inPortal = portalRef.current?.contains(t);
      if (!inBar && !inPortal) {
        setOpen(false);
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const kw = query.trim();
    if (kw.length < 2) {
      setHits([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('search_listings', { keyword: kw });
      if (error) console.error('search_listings error:', error);
      setHits((data ?? []) as Hit[]);
      setLoading(false);
      if (typedRef.current) setOpen(true);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filtered = hits.filter(
    (h) =>
      (!filters.type || h.listing_type === filters.type) &&
      (!filters.budget || h.budget_tier === filters.budget) &&
      (!filters.activity || h.activity_tag === filters.activity)
  );

  const kwLower = query.trim().toLowerCase();
  const destMap = new Map<string, { name: string; region: string }>();
  for (const h of filtered) {
    const key = (h.destination_name ?? '').toLowerCase();
    if (key && key.includes(kwLower) && !destMap.has(key)) destMap.set(key, { name: h.destination_name, region: h.region_country });
    if (destMap.size >= 3) break;
  }
  const destinations = [...destMap.values()];
  const places = filtered.slice(0, 6);

  function go(q?: string) {
    const params = new URLSearchParams();
    const finalQ = (q ?? query).trim();
    if (finalQ) params.set('q', finalQ);
    if (filters.type) params.set('type', filters.type);
    if (filters.budget) params.set('budget', filters.budget);
    if (filters.activity) params.set('activity', filters.activity);
    setOpen(false);
    setShowFilters(false);
    router.push(`/search?${params.toString()}`);
  }

  const chipOn = 'px-3 py-1.5 rounded-full text-xs font-medium border bg-blue-600 text-white border-blue-600';
  const chipOff = 'px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:text-slate-800 transition';

  const showSuggestions = open && query.trim().length >= 2;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Search bar — inline, measured for the portal */}
      <div
        ref={boxRef}
        className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white pl-4 pr-2 py-2 shadow-sm focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 transition"
      >
        <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            typedRef.current = true;
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go();
          }}
          maxLength={100}
          placeholder={placeholder}
          className="flex-1 min-w-0 py-2 text-base text-slate-900 placeholder-slate-400 outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition shrink-0 ${
            showFilters || activeCount > 0 ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FilterIcon className="w-4 h-4" />
          {activeCount > 0 ? `Filters · ${activeCount}` : 'Filters'}
        </button>
        <button
          type="button"
          onClick={() => go()}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition shrink-0"
        >
          Search
        </button>
      </div>
      {query.length > 0 && (
        <p className={`text-right text-xs mt-1.5 pr-1 ${query.length > 90 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
          {query.length}/100
        </p>
      )}

      {/* Active filter chips (inline) */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {filters.type && (
            <button type="button" onClick={() => setFilters({ ...filters, type: null })} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition">
              {filters.type} <XIcon />
            </button>
          )}
          {filters.budget && (
            <button type="button" onClick={() => setFilters({ ...filters, budget: null })} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition">
              {filters.budget} <XIcon />
            </button>
          )}
          {filters.activity && (
            <button type="button" onClick={() => setFilters({ ...filters, activity: null })} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition">
              {filters.activity} <XIcon />
            </button>
          )}
          <button type="button" onClick={() => setFilters({ type: null, budget: null, activity: null })} className="text-xs font-medium text-slate-500 hover:text-slate-700 transition">
            Clear all
          </button>
        </div>
      )}

      {/* ── Floated panels: portaled to <body> so NO ancestor (sticky tab bar, backdrop-blur cards, z-10 sections) can trap them ── */}
      {mounted && pos && (showFilters || showSuggestions) &&
        createPortal(
          <div
            ref={portalRef}
            className="fixed z-[200] flex flex-col gap-2"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {/* Filter panel */}
            {showFilters && (
              <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-lg p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Type</p>
                    <div className="flex flex-wrap gap-2">
                      {TYPES.map((t) => (
                        <button key={t} type="button" onClick={() => setFilters({ ...filters, type: filters.type === t ? null : t })} className={filters.type === t ? chipOn : chipOff}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Budget</p>
                    <div className="flex flex-wrap gap-2">
                      {BUDGETS.map((b) => (
                        <button key={b} type="button" onClick={() => setFilters({ ...filters, budget: filters.budget === b ? null : b })} className={filters.budget === b ? chipOn : chipOff}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Activity</p>
                    <div className="flex flex-wrap gap-2">
                      {ACTIVITIES.map((a) => (
                        <button key={a} type="button" onClick={() => setFilters({ ...filters, activity: filters.activity === a ? null : a })} className={filters.activity === a ? chipOn : chipOff}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setFilters({ type: null, budget: null, activity: null })} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:border-slate-400 transition">
                    Reset
                  </button>
                  <button type="button" onClick={() => go()} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                    Apply & search
                  </button>
                </div>
              </div>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && (
              <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                {loading && <p className="px-5 py-6 text-center text-sm text-slate-400">Searching…</p>}
                {!loading && filtered.length === 0 && (
                  <p className="px-5 py-6 text-center text-sm text-slate-500">
                    No matches for "{query}"{activeCount > 0 ? ' with these filters' : ''} — press Enter to search everything.
                  </p>
                )}
                {!loading && filtered.length > 0 && (
                  <div className="max-h-96 overflow-y-auto">
                    {destinations.length > 0 && (
                      <>
                        <p className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Destinations</p>
                        {destinations.map((d) => (
                          <button key={d.name} type="button" onClick={() => go(d.name)} className="w-full px-5 py-3 text-left hover:bg-blue-50/60 transition flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                <path d="M12 21s-7-5.1-7-11a7 7 0 1114 0c0 5.9-7 11-7 11z" strokeLinecap="round" />
                                <circle cx="12" cy="10" r="2.5" />
                              </svg>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-slate-900 text-sm truncate">{d.name}</span>
                              <span className="block text-xs text-slate-400 truncate">{d.region}</span>
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                    {places.length > 0 && (
                      <>
                        <p className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Places</p>
                        {places.map((p) => (
                          <button
                            key={p.listing_id}
                            type="button"
                            onClick={() => {
                              setOpen(false);
                              router.push(`/listing/${p.listing_id}`);
                            }}
                            className="w-full px-5 py-3 text-left hover:bg-blue-50/60 transition flex items-center gap-3"
                          >
                            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 text-xs font-semibold">
                              {p.listing_type.charAt(0)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-slate-900 text-sm truncate">{p.name}</span>
                              <span className="block text-xs text-slate-400 truncate">
                                {p.listing_type} · {p.destination_name}
                                {p.budget_tier ? ` · ${p.budget_tier}` : ''}
                              </span>
                            </span>
                            {p.average_rating != null && (
                              <span className="shrink-0 text-sm font-semibold text-amber-600">★ {Number(p.average_rating).toFixed(1)}</span>
                            )}
                          </button>
                        ))}
                      </>
                    )}
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                      <button type="button" onClick={() => go()} className="w-full px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                        See all results for "{query.trim()}"
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}