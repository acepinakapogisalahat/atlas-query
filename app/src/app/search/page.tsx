// app/src/app/search/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { logSearch } from '@/utils/supabase/searchlog';
import SmartSearch from '@/components/SmartSearch';

type ListingRow = {
  listing_id: string;
  name: string;
  listing_type: string;
  description: string | null;
  image_url: string | null;
  average_rating: number | null;
  destination_name: string;
  region_country: string;
  budget_tier: string | null;
  activity_tag: string | null;
};

const TABS = ['All', 'Attractions', 'Hotels', 'Restaurants'];

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className ?? 'w-4 h-4'}>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" />
    </svg>
  );
}

function MapPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className ?? 'w-4 h-4'}>
      <path d="M12 21s-7-5.1-7-11a7 7 0 1114 0c0 5.9-7 11-7 11z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-6 h-6'}>
      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CardImage({ listing }: { listing: ListingRow }) {
  const [failed, setFailed] = useState(false);
  const usable = !!listing.image_url && !failed;
  return usable ? (
    <img
      src={listing.image_url!}
      alt={listing.name}
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
    />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-200 to-slate-300">
      <span className="text-4xl font-black text-slate-400">{listing.listing_type.charAt(0)}</span>
    </div>
  );
}

function SearchContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const [tab, setTab] = useState('All');
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function run() {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const authId = session.session?.user?.id ?? null;
      let uid: string | null = null;
      if (authId) {
        const { data: profile } = await supabase
          .from('app_users')
          .select('user_id')
          .eq('auth_user_id', authId)
          .maybeSingle();
        uid = profile?.user_id ?? null;
      }
      const { data, error } = await supabase.rpc('search_listings', { keyword: q });
      if (error) console.error('search_listings error:', error);
      const results = !error && Array.isArray(data) ? (data as ListingRow[]) : [];
      setRows(results);
      setLoading(false);
      if (q) logSearch(supabase, uid, q, results.length, null);
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const typeParam = searchParams.get('type');
  const budgetParam = searchParams.get('budget');
  const activityParam = searchParams.get('activity');

  useEffect(() => {
    if (typeParam === 'Attraction') setTab('Attractions');
    else if (typeParam === 'Hotel') setTab('Hotels');
    else if (typeParam === 'Restaurant') setTab('Restaurants');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeParam]);

  const visible = rows
    .filter((r) => tab === 'All' || r.listing_type === tab.replace(/s$/, ''))
    .filter((r) => !budgetParam || r.budget_tier === budgetParam)
    .filter((r) => !activityParam || r.activity_tag === activityParam);

  return (
    <main className="min-h-screen bg-[#e6ebf2] relative pb-16 page-enter">
      {/* Ambient Gradient Orbs (fixed prevents clipping by parent overflow-hidden) */}
      <div className="fixed top-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-400/40 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-[30%] right-[-10%] w-[700px] h-[700px] bg-blue-400/40 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-pink-400/30 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-3 drop-shadow-sm">
            {q ? `Results for "${q}"` : 'Discover destinations'}
          </h1>
          <p className="text-lg text-slate-600 font-semibold">
            {loading ? 'Searching the globe...' : `${visible.length} premium place${visible.length === 1 ? '' : 's'} found`}
          </p>
        </div>

        {/* Glassmorphic Control Panel — LIFTED above the results grid (relative z-30 + isolate)
            so the SmartSearch suggestions AND the Filters popover always paint on top. */}
        <div className="relative z-30 isolate bg-white/30 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-6 md:p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] mb-12 space-y-8">

          {/* Neomorphic search socket — hugs the SmartSearch pill exactly (w-fit),
              centered, carved inset + glass ring so it belongs to the panel */}
          <div className="mr-auto w-fit max-w-full rounded-2xl bg-[#e3e8f4] p-2 ring-1 ring-white/70 shadow-[inset_6px_6px_12px_#c8d0e0,inset_-6px_-6px_12px_#ffffff]">
            <SmartSearch initialValue={q} placeholder='Search Here!' />
          </div>

          {/* Neomorphic Tabs */}
          <div className="flex flex-wrap gap-4">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-8 py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all duration-300 ${
                  tab === t
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50 scale-105 ring-2 ring-white/50'
                    : 'bg-[#e6ebf2] text-slate-600 shadow-[6px_6px_12px_#c8d0e0,-6px_-6px_12px_#ffffff] hover:text-blue-600 active:shadow-[inset_4px_4px_8px_#c8d0e0,inset_-4px_-4px_8px_#ffffff]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Active Filters */}
          {(budgetParam || activityParam) && (
            <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-white/40">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Filters</span>
              {budgetParam && (
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/40">
                  {budgetParam}
                </span>
              )}
              {activityParam && (
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-bold shadow-md shadow-orange-500/40">
                  {activityParam}
                </span>
              )}
              <Link
                href={`/search?q=${encodeURIComponent(q)}`}
                className="text-xs font-bold text-red-500 hover:text-red-600 transition underline underline-offset-4"
              >
                Clear all
              </Link>
            </div>
          )}
        </div>

        {/* Results region — HELD BELOW the control panel (relative z-0). Whatever renders here
            (skeletons / cards / empty) can never cover the search dropdown or filters popover. */}
        <div className="relative z-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white/30 backdrop-blur-xl border border-white/40 rounded-[2rem] overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] animate-pulse"
                >
                  <div className="h-64 bg-slate-300/40" />
                  <div className="p-6 space-y-4">
                    <div className="h-5 bg-slate-300/50 rounded-full w-3/4" />
                    <div className="h-3 bg-slate-300/40 rounded-full w-full" />
                    <div className="h-3 bg-slate-300/40 rounded-full w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visible.map((listing) => (
                <Link
                  key={listing.listing_id}
                  href={`/listing/${listing.listing_id}`}
                  className="group relative bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2rem] overflow-hidden transition-all duration-500 hover:bg-white/60 hover:shadow-[0_20px_50px_-12px_rgba(147,51,234,0.4)] hover:-translate-y-3 block"
                >
                  {/* Image Section */}
                  <div className="h-64 relative overflow-hidden">
                    <CardImage listing={listing} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                        {listing.listing_type}
                      </span>
                    </div>

                    {listing.average_rating != null && (
                      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-yellow-500/90 backdrop-blur-md border border-yellow-400 text-white text-xs font-black shadow-lg shadow-yellow-500/40 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5" />
                        {Number(listing.average_rating).toFixed(1)}
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-2xl font-black text-white leading-tight mb-1 drop-shadow-lg line-clamp-1 group-hover:text-blue-200 transition-colors">
                        {listing.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-white/90 text-sm font-semibold drop-shadow-md">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">
                          {listing.destination_name}, {listing.region_country}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 min-h-[40px]">
                      {listing.description || 'Discover this amazing place and create unforgettable memories on your next trip.'}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                      <div className="flex items-center gap-2 flex-wrap">
                        {listing.budget_tier && (
                          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-wider border border-blue-500/20 backdrop-blur-sm">
                            {listing.budget_tier}
                          </span>
                        )}
                        {listing.activity_tag && (
                          <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 text-[10px] font-black uppercase tracking-wider border border-purple-500/20 backdrop-blur-sm">
                            {listing.activity_tag}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-sm font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:gap-2 transition-all">
                        Explore
                        <svg className="w-4 h-4 text-blue-600 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-16 text-center shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/40">
                <SearchIcon className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-black bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent mb-3">
                {q ? `No listings found for "${q}"` : 'Start your journey'}
              </h3>
              <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
                {q
                  ? "We couldn't find any places matching your search. Try adjusting your filters or searching for a different destination."
                  : 'Search for a country, city, or specific landmark to discover amazing places around the world.'}
              </p>
              <Link
                href="/"
                className="inline-flex px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-500/40 hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Back to Discover
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#e6ebf2] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        </main>
      }
    >
      <SearchContent />
    </Suspense>
  );
}