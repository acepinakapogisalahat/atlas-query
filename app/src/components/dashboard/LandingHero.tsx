// app/src/components/dashboard/LandingHero.tsx
'use client';
import { useState, useEffect } from 'react';
import {
  NEU_SM, GLASS, GLASS_SM, GRAD, GRAD_TEXT, FLOAT_SHADOW, SHEEN,
  Star, SparkleIcon, CompassIcon, RouteIcon, BoltIcon, MapIcon, GlassWellIcon, Link,
  type ExploreCard,
} from '@/components/dashboard/kit';

// Freshness canary (lh-4).
if (typeof window !== 'undefined') console.log('[LandingHero] build=lh-4');

type Tab = 'plan' | 'discover' | 'tools';
type Props = {
  tier: 'guest' | 'new' | 'returning' | 'veteran';
  greeting: string;
  firstName: string | null;
  activeTripName: string | null;
  activeDayIndex: number;
  activeTotal: number | null;
  topPicks: ExploreCard[];
  trendingChips: { name: string; country: string; rating: number }[];
  catalogStats: { places: number; destinations: number; regions: number };
  onOpenTab: (t: Tab) => void;
  searchSlot: React.ReactNode;
};

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 60 + delay); return () => clearTimeout(t); }, [delay]);
  return <div className={`transition-all duration-700 ease-out ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>{children}</div>;
}

function PickCard({ l }: { l: ExploreCard }) {
  return (
    <Link href={`/listing/${l.listing_id}`} className="group block overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-22px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 transition-transform duration-300 hover:-translate-y-1.5">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100">
        {l.image_url ? (<img src={l.image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />) : (<div className="flex h-full items-center justify-center text-4xl font-black text-violet-300">{l.listing_type.charAt(0)}</div>)}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
        {l.average_rating != null && (<span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-sm"><Star className="w-3 h-3 text-amber-400" />{Number(l.average_rating).toFixed(1)}</span>)}
      </div>
      <div className="px-4 py-3"><p className="truncate text-sm font-black text-slate-800">{l.name}</p><p className="truncate text-[11px] font-semibold text-slate-500">{l.destination?.destination_name ?? l.listing_type}</p></div>
    </Link>
  );
}

export default function LandingHero(p: Props) {
  const { tier, greeting, firstName, activeTripName, activeDayIndex, activeTotal, topPicks, trendingChips, catalogStats, onOpenTab, searchSlot } = p;
  const authed = tier !== 'guest';
  const isNew = tier === 'new';
  const chips = trendingChips ?? [];
  const picks = topPicks ?? [];
  const stats = catalogStats ?? { places: 0, destinations: 0, regions: 0 };
  const name = firstName ? <span className={GRAD_TEXT}>, {firstName}</span> : null;

  return (
    <div className="relative">
      <style>{`
        @keyframes tmBlob { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(28px,-44px) scale(1.08); } 66% { transform: translate(-22px,20px) scale(0.94); } }
        .tm-blob { animation: tmBlob 9s ease-in-out infinite; }
        .tm-blob-2 { animation: tmBlob 11s ease-in-out infinite; animation-delay: 2s; }
        .tm-blob-3 { animation: tmBlob 13s ease-in-out infinite; animation-delay: 4s; }
        @keyframes tmRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .tm-rise { animation: tmRise .55s cubic-bezier(.22,.9,.32,1) both; }
      `}</style>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="tm-blob absolute -top-32 -left-32 h-[26rem] w-[26rem] rounded-full bg-violet-300/30 blur-3xl" />
          <div className="tm-blob-2 absolute top-24 -right-32 h-[26rem] w-[26rem] rounded-full bg-sky-300/25 blur-3xl" />
          <div className="tm-blob-3 absolute -bottom-32 left-1/3 h-[26rem] w-[26rem] rounded-full bg-fuchsia-300/20 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 md:pt-24 md:pb-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <FadeIn delay={0}>
                <span className={`inline-flex items-center gap-2 rounded-full ${GLASS_SM} px-4 py-2 text-sm font-black text-violet-600`}>
                  <SparkleIcon className="h-4 w-4" />
                  {tier === 'veteran' ? 'Welcome back, traveler' : tier === 'returning' ? 'Ready for your next adventure?' : isNew ? 'Your journey starts here' : 'Travel planning, minus the spreadsheet'}
                </span>
              </FadeIn>
              <FadeIn delay={90}>
                <h1 className="mt-6 text-5xl sm:text-6xl md:text-7xl font-black leading-[1.02] tracking-tight text-slate-800">
                  {authed ? <>{greeting}{name}</> : <>Plan the trip,<br className="hidden sm:block" /> not the <span className={GRAD_TEXT}>tabs</span>.</>}
                </h1>
              </FadeIn>
              <FadeIn delay={180}>
                <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-lg md:text-xl leading-relaxed text-slate-500">
                  {tier === 'veteran' ? 'Your cockpit is ready — jump into the live trip, or chart something new.' :
                   tier === 'returning' ? 'Pick up where you left off, or start something new — your places and plans are one tap away.' :
                   'TravelMate turns the places you love into a day-by-day plan — stops, times, and the best-rated spots nearby.'}
                </p>
              </FadeIn>
              <FadeIn delay={260}><div id="tm-search" className="mt-8 max-w-3xl mx-auto lg:mx-0 scroll-mt-40">{searchSlot}</div></FadeIn>
              <FadeIn delay={340}>
                {/* THE three launch buttons: planner / ongoing trips / explore */}
                <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <button type="button" onClick={() => onOpenTab('plan')} className={`rounded-2xl bg-gradient-to-r ${GRAD} px-7 py-3.5 text-base font-black text-white ${FLOAT_SHADOW} ${SHEEN} transition hover:brightness-105 active:scale-95`}>
                    <span className="relative flex items-center gap-2"><RouteIcon className="h-5 w-5" />Trip planner</span>
                  </button>
                  <Link href="/trip" className={`rounded-2xl ${NEU_SM} px-7 py-3.5 text-base font-black text-slate-600 transition hover:text-violet-600 active:scale-95`}>
                    <span className="relative flex items-center gap-2">
                      {activeTripName && (<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />)}
                      {activeTripName ? `Ongoing trip · Day ${activeDayIndex}${activeTotal ? `/${activeTotal}` : ''}` : 'Ongoing trips'}
                    </span>
                  </Link>
                  <button type="button" onClick={() => onOpenTab('discover')} className={`rounded-2xl ${NEU_SM} px-7 py-3.5 text-base font-black text-slate-600 transition hover:text-violet-600 active:scale-95`}>
                    <span className="flex items-center gap-2"><CompassIcon className="h-5 w-5" />Explore</span>
                  </button>
                  {!authed && (<Link href="/login" className="text-sm font-black text-violet-600 hover:text-violet-700">Sign in →</Link>)}
                </div>
              </FadeIn>
            </div>
            <FadeIn delay={200} className="hidden lg:block">
              <div className="relative h-[24rem]">
                {(picks.length ? picks.slice(0, 3) : []).map((l, i) => (
                  <div key={l.listing_id} className="absolute w-[15.5rem] tm-rise" style={{ left: `${i * 5.8}rem`, top: `${i * 2.4}rem`, zIndex: i, transform: `rotate(${(i - 1) * 3.4}deg)`, animationDelay: `${250 + i * 110}ms` }}>
                    <PickCard l={l} />
                  </div>
                ))}
                {!picks.length && (<div className="h-full rounded-[2rem] bg-white/50 ring-1 ring-white/60 flex items-center justify-center text-slate-400 font-black">Your top picks appear here</div>)}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* REAL STATS */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <FadeIn delay={80}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{ v: stats.places.toLocaleString(), l: 'curated places' }, { v: stats.destinations.toLocaleString(), l: 'destinations' }, { v: stats.regions.toLocaleString(), l: 'featured regions' }, { v: 'Free', l: 'to start planning' }].map((s) => (
              <div key={s.l} className={`rounded-2xl ${NEU_SM} px-4 py-5 text-center`}>
                <p className={`text-2xl md:text-3xl font-black ${GRAD_TEXT} tabular-nums`}>{s.v}</p>
                <p className="mt-1 text-[10px] md:text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{s.l}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* FEATURES */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <FadeIn><h2 className="text-center text-4xl md:text-5xl font-black tracking-tight text-slate-800">Everything you need to <span className={GRAD_TEXT}>plan the perfect trip</span></h2></FadeIn>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { i: <RouteIcon className="h-6 w-6" />, g: 'from-indigo-500 to-violet-500', t: 'Smart itinerary', d: 'Auto-plan assigns mornings, afternoons and evenings across your dates, keeping same-area places together.', a: () => onOpenTab('plan') },
            { i: <CompassIcon className="h-6 w-6" />, g: 'from-violet-500 to-fuchsia-500', t: 'Discover places', d: 'Browse top-rated attractions, stays and eats — scoped to the stops you actually picked.', a: () => onOpenTab('discover') },
            { i: <BoltIcon className="h-6 w-6" />, g: 'from-amber-500 to-orange-500', t: 'Travel tools', d: 'Weather outlook, pacing and review nudges for the trips you have booked.', a: () => onOpenTab('tools') },
            { i: <MapIcon className="h-6 w-6" />, g: 'from-sky-500 to-indigo-500', t: 'Multi-stop trips', d: 'Plan across cities and countries; days auto-allocate by how much each stop holds.', a: () => onOpenTab('plan') },
            { i: <Star className="h-6 w-6" />, g: 'from-rose-500 to-orange-500', t: 'Reviews & ratings', d: 'Rate what you visited, track your history, and see why anything was flagged.', a: () => onOpenTab('tools') },
            { i: <SparkleIcon className="h-6 w-6" />, g: 'from-fuchsia-500 to-violet-500', t: 'Personal picks', d: 'Recommendations tuned to your travel style, budget and past searches.', a: () => onOpenTab('discover') },
          ].map((f, idx) => (
            <FadeIn key={f.t} delay={idx * 70}>
              <button type="button" onClick={f.a} className={`group w-full text-left flex items-start gap-4 rounded-3xl ${NEU_SM} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[12px_12px_30px_rgba(163,170,205,0.5)]`}>
                <GlassWellIcon gradient={f.g}>{f.i}</GlassWellIcon>
                <div className="min-w-0"><p className="text-lg font-black text-slate-800 group-hover:text-violet-600 transition">{f.t}</p><p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.d}</p></div>
              </button>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <div className="rounded-[2rem] bg-white shadow-[0_24px_60px_-22px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 p-7">
              <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-slate-400"><BoltIcon className="h-4 w-4 text-violet-500" /> Your planner, filled in</p>
              <div className="space-y-2.5">
                {(picks.length >= 3 ? picks.slice(0, 3).map((l, i) => ({ s: ['Morning', 'Afternoon', 'Evening'][i], n: l.name })) : [{ s: 'Morning', n: 'Old-town walk & cafés' }, { s: 'Afternoon', n: 'Museum or beach hop' }, { s: 'Evening', n: 'Street-food crawl' }]).map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-2xl ${NEU_SM} px-4 py-3`}>
                    <span className={`shrink-0 rounded-full bg-gradient-to-r ${GRAD} px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white`}>{r.s}</span>
                    <span className="truncate text-sm font-bold text-slate-700">{r.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={120}>
            <h3 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800">Skip the blank doc. Start from a place you love.</h3>
            <ol className="mt-7 space-y-5">
              {['Add your dates and one destination stop — a province, city, or country.', 'Add places you like; we suggest the best-rated ones nearby.', 'Hit Auto-plan: days, times and same-area grouping, done for you.', 'Tweak by dragging cards around — or move them by day on the go.'].map((s, i) => (
                <li key={i} className="flex items-start gap-3.5">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${GRAD} text-sm font-black text-white`}>{i + 1}</span>
                  <span className="text-base md:text-lg leading-relaxed text-slate-600">{s}</span>
                </li>
              ))}
            </ol>
          </FadeIn>
        </div>
      </section>

      {/* TRENDING (real data) */}
      {chips.length > 0 && (
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <FadeIn><h2 className="text-center text-4xl md:text-5xl font-black tracking-tight text-slate-800">Trending right now</h2>
          <p className="mt-3 text-center text-lg text-slate-500">Where the community is heading next</p></FadeIn>
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-5">
            {chips.slice(0, 4).map((c, i) => (
              <FadeIn key={c.name} delay={i * 80}>
                <Link href={`/search?q=${encodeURIComponent(c.name)}`} className="group block overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.4)] ring-1 ring-slate-900/10 transition-transform duration-300 hover:-translate-y-1.5">
                  <div className={`aspect-[4/3] bg-gradient-to-br ${['from-violet-400 to-indigo-500', 'from-sky-400 to-indigo-500', 'from-fuchsia-400 to-violet-500', 'from-amber-400 to-rose-500'][i % 4]} p-5 flex flex-col justify-between`}>
                    <span className="self-start rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">#{i + 1}</span>
                    <div><p className="text-2xl font-black text-white leading-tight">{c.name}</p><p className="text-xs font-bold text-white/80 uppercase tracking-wider mt-1">{c.country}</p></div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="flex items-center gap-1 text-sm font-black text-amber-600"><Star className="w-4 h-4" />{c.rating.toFixed(1)}</span>
                    <span className="text-xs font-black text-slate-400 group-hover:text-violet-600 transition">Explore →</span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </section>
      )}

      {/* FOR BUSINESS OWNERS */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <FadeIn>
          <div className={`relative overflow-hidden rounded-[2.5rem] ${GLASS} p-8 md:p-12 ${FLOAT_SHADOW}`}>
            <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className={`inline-flex items-center gap-2 rounded-full ${GLASS_SM} px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700`}><SparkleIcon className="h-3.5 w-3.5" /> For business owners</span>
                <h2 className="mt-4 text-3xl md:text-4xl font-black tracking-tight text-slate-800 leading-tight">Own a business? <span className={GRAD_TEXT}>Put your places on the map.</span></h2>
                <p className="mt-3 text-base md:text-lg leading-relaxed text-slate-500 max-w-md">Apply as a business owner — once approved you can publish and manage your places. Free to apply, reviewed in 2–3 days, then live in Discover where travelers build their day.</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link href="/apply" className={`rounded-2xl bg-gradient-to-r ${GRAD} px-6 py-3 text-sm font-black text-white ${FLOAT_SHADOW} ${SHEEN} transition hover:brightness-105 active:scale-95`}><span className="relative flex items-center gap-2"><RouteIcon className="h-4 w-4" />Start an application</span></Link>
                  <Link href="/apply" className={`rounded-2xl ${NEU_SM} px-6 py-3 text-sm font-black text-slate-600 transition hover:text-violet-600 active:scale-95`}>How it works →</Link>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { ic: <MapIcon className="h-5 w-5" />, g: 'from-emerald-500 to-teal-500', t: 'Free to apply', d: 'No cost, no commission to get listed.' },
                  { ic: <Star className="h-5 w-5" />, g: 'from-amber-500 to-orange-500', t: 'Verified reviews', d: 'Real travelers rate your place after visiting.' },
                  { ic: <BoltIcon className="h-5 w-5" />, g: 'from-violet-500 to-fuchsia-500', t: 'In the plan flow', d: 'Approved spots appear as auto-plan suggestions.' },
                ].map((c) => (
                  <div key={c.t} className={`rounded-2xl ${NEU_SM} p-4`}>
                    <GlassWellIcon gradient={c.g}>{c.ic}</GlassWellIcon>
                    <p className="mt-3 font-black text-slate-800 text-sm leading-tight">{c.t}</p>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500 leading-snug">{c.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* STATEMENT + FINAL CTA */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-28">
        <FadeIn>
          <div className="text-center mb-14">
            <SparkleIcon className="mx-auto h-8 w-8 text-violet-300 mb-4" />
            <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tight text-slate-800">From <span className="text-slate-400">"someday"</span> to <span className={GRAD_TEXT}>"here's the plan"</span> in minutes.</h2>
          </div>
        </FadeIn>
        <FadeIn delay={120}>
          <div className={`relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${GRAD} p-10 md:p-16 text-center text-white ${FLOAT_SHADOW} ${SHEEN}`}>
            <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-white/5" />
            <div className="relative">
              <h3 className="text-3xl md:text-5xl font-black tracking-tight">{authed ? 'Your next trip is one click away.' : 'Bring your next trip to life.'}</h3>
              <p className="mx-auto mt-4 max-w-xl text-base md:text-lg text-white/85">{authed ? (activeTripName ? ` "${activeTripName}" is live — open your cockpit and keep the momentum.` : 'Open the planner, drop your dates, and let TravelMate do the logistics.') : 'Create a free account, save places, and get a day-by-day plan in minutes.'}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {authed && activeTripName ? (
                  <Link href="/trip" className="rounded-2xl bg-white px-8 py-4 text-base font-black text-violet-700 shadow-lg transition hover:bg-violet-50 active:scale-[0.97]"><span className="relative flex items-center gap-2"><RouteIcon className="h-5 w-5" />Open trip cockpit</span></Link>
                ) : authed ? (
                  <button type="button" onClick={() => onOpenTab('plan')} className="rounded-2xl bg-white px-8 py-4 text-base font-black text-violet-700 shadow-lg transition hover:bg-violet-50 active:scale-[0.97]"><span className="relative flex items-center gap-2"><RouteIcon className="h-5 w-5" />Open the planner</span></button>
                ) : (
                  <Link href="/signup" className="rounded-2xl bg-white px-8 py-4 text-base font-black text-violet-700 shadow-lg transition hover:bg-violet-50 active:scale-[0.97]"><span className="relative">Start for free</span></Link>
                )}
                <button type="button" onClick={() => onOpenTab('discover')} className="rounded-2xl border border-white/40 bg-white/10 px-8 py-4 text-base font-black text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.97]">Browse destinations</button>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}