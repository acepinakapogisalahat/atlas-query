// app/src/components/dashboard/LandingHero.tsx
'use client';
import {
  NEU, NEU_SM, GLASS, GLASS_SM, GRAD, GRAD_TEXT, FLOAT_SHADOW, SHEEN, GLOSS,
  Star, SparkleIcon, CompassIcon, RouteIcon, BoltIcon, MapIcon, GlassWellIcon, Link, Chevron,
  type ExploreCard,
} from '@/components/dashboard/kit';

/* ── Tunable segmentation thresholds (the only place to change the tier logic) ── */
const VETERAN_TRIP_COUNT = 3;     // anyone with this many trips is a veteran, regardless of age
const VETERAN_AGE_DAYS = 180;     // ~6 months; a "year on the site" comfortably clears this
// A user is `veteran` if trips >= VETERAN_TRIP_COUNT, OR (account older than VETERAN_AGE_DAYS AND trips >= 1).

type Tier = 'guest' | 'new' | 'returning' | 'veteran';
type Props = {
  tier: Tier;
  greeting: string;
  firstName: string | null;
  activeTripName: string | null;
  activeDayIndex: number;
  activeTotal: number | null;
  topPicks: ExploreCard[];
  trendingChips: { name: string; country: string; rating: number }[];
  onStartPlan: () => void;
  onExplore: () => void;
  searchSlot: React.ReactNode;
};

// Flat elevated white surface for the photo/preview cards (mirrors PlanTab's MODAL_SURF philosophy).
const SURF = 'bg-white shadow-[0_24px_60px_-22px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10';

function scrollToId(id: string) {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Real listing photo used in the tilted preview stack ── */
function PickCard({ l, tilt }: { l: ExploreCard; tilt: string }) {
  return (
    <Link
      href={`/listing/${l.listing_id}`}
      className={`group block overflow-hidden rounded-3xl ${SURF} transition-transform duration-300 hover:-translate-y-1.5 ${tilt}`}
    >
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100">
        {l.image_url ? (
          <img src={l.image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl font-black text-violet-300">{l.listing_type.charAt(0)}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
        {l.average_rating != null && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-sm">
            <Star className="w-3 h-3 text-amber-400" />{Number(l.average_rating).toFixed(1)}
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="truncate text-sm font-black text-slate-800">{l.name}</p>
        <p className="truncate text-[11px] font-semibold text-slate-500">{l.destination?.destination_name ?? l.listing_type}</p>
      </div>
    </Link>
  );
}

/* ── Tilted stack of real top picks (desktop) / grid (mobile) ── */
function PreviewStack({ picks }: { picks: ExploreCard[] }) {
  const shown = picks.slice(0, 3);
  if (shown.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {['A', 'H', 'R', 'S'].map((c, i) => (
          <div key={i} className={`h-32 rounded-3xl ${SURF} flex items-center justify-center`}>
            <span className="text-3xl font-black text-violet-200">{c}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <>
      {/* desktop: overlapping tilted cards like the reference's screenshot stack */}
      <div className="relative hidden h-[22rem] lg:block">
        {shown.map((l, i) => (
          <div
            key={l.listing_id}
            className="absolute w-[15rem] animate-fade-in-up"
            style={{
              left: `${i * 5.5}rem`,
              top: `${i * 2.2}rem`,
              zIndex: i,
              transform: `rotate(${(i - 1) * 3.2}deg)`,
              animationDelay: `${120 + i * 90}ms`,
            }}
          >
            <PickCard l={l} tilt="" />
          </div>
        ))}
      </div>
      {/* mobile: clean 2-up grid of the same real photos */}
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {shown.map((l) => (<PickCard key={l.listing_id} l={l} tilt="" />))}
      </div>
    </>
  );
}

function FeatureCard({ icon, title, desc, onClick, href }: { icon: React.ReactNode; title: string; desc: string; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      <GlassWellIcon gradient="from-indigo-500 to-violet-500">{icon}</GlassWellIcon>
      <div className="min-w-0">
        <p className="text-base font-black text-slate-800">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
      </div>
      <Chevron className="ml-auto h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
    </>
  );
  const cls = `group flex items-start gap-4 rounded-3xl ${NEU_SM} p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[10px_10px_26px_rgba(163,170,205,0.5)]`;
  return href ? (
    <Link href={href} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{inner}</button>
  );
}

function FeatureGrid({ onStartPlan, onExplore }: { onStartPlan: () => void; onExplore: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FeatureCard icon={<RouteIcon className="h-5 w-5" />} title="Trip planner" desc="Drop in your dates and stops; we lay out mornings, afternoons and evenings for you." onClick={onStartPlan} />
      <FeatureCard icon={<CompassIcon className="h-5 w-5" />} title="Discover places" desc="Browse top-rated attractions, stays and eats, scoped to where you're actually going." onClick={onExplore} />
      <FeatureCard icon={<SparkleIcon className="h-5 w-5" />} title="Smart search" desc="Type a country, province or town and jump straight to everything there." onClick={() => scrollToId('tm-search')} />
      <FeatureCard icon={<Star className="h-5 w-5" />} title="Rate & review" desc="Back from a trip? Tell the next traveler how it really went." href="/my-trips" />
    </div>
  );
}

function TrustRow({ chips }: { chips: { name: string; country: string }[] }) {
  if (!chips.length) return null;
  return (
    <div className="text-center">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Travelers are planning trips to</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        {chips.map((c) => (
          <Link key={c.name} href={`/search?q=${encodeURIComponent(c.name)}`} className={`rounded-full ${NEU_SM} px-4 py-2 text-sm font-bold text-slate-600 transition hover:text-violet-600 active:scale-95`}>
            {c.name}<span className="ml-1 text-[11px] font-semibold text-slate-400">{c.country}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Statement() {
  return (
    <div className="relative py-4 text-center">
      <SparkleIcon className="pointer-events-none absolute left-2 top-2 h-7 w-7 text-violet-300 sm:left-10" />
      <SparkleIcon className="pointer-events-none absolute right-2 top-6 h-5 w-5 text-fuchsia-300 sm:right-12" />
      <h2 className="mx-auto max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-800 sm:text-5xl">
        From <span className="text-slate-400">“someday”</span> to <span className={GRAD_TEXT}>“here’s the plan”</span> in minutes.
      </h2>
    </div>
  );
}

function HowItWorks({ picks }: { picks: ExploreCard[] }) {
  const rows = picks.length >= 3
    ? picks.slice(0, 3).map((l, i) => ({ slot: ['Morning', 'Afternoon', 'Evening'][i], name: l.name }))
    : [{ slot: 'Morning', name: 'Old-town walk & cafés' }, { slot: 'Afternoon', name: 'Museum or beach hop' }, { slot: 'Evening', name: 'Street-food crawl' }];
  const steps = [
    'Add your dates and one destination stop — a province, city, or country.',
    'Add places you like; we suggest the best-rated ones nearby.',
    'Hit Auto-plan: days, times and same-area grouping, done for you.',
    'Tweak by dragging cards around, then go.',
  ];
  return (
    <div id="how-it-works" className="grid scroll-mt-40 grid-cols-1 items-center gap-8 lg:grid-cols-2">
      <div className={`rounded-[2rem] ${SURF} p-6`}>
        <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-slate-400"><BoltIcon className="h-4 w-4 text-violet-500" /> Your planner, filled in</div>
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-2xl ${NEU_SM} px-4 py-3`}>
              <span className={`shrink-0 rounded-full bg-gradient-to-r ${GRAD} px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white`}>{r.slot}</span>
              <span className="truncate text-sm font-bold text-slate-700">{r.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">Skip the blank doc. Start from a place you love.</h3>
        <ol className="mt-6 space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${GRAD} text-sm font-black text-white ${GLOSS}`}>{i + 1}</span>
              <span className="text-base leading-relaxed text-slate-600">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function LandingHero({ tier, greeting, firstName, activeTripName, activeDayIndex, activeTotal, topPicks, trendingChips, onStartPlan, onExplore, searchSlot }: Props) {
  const isAuthed = tier !== 'guest';
  const nameNode = firstName ? <span className={GRAD_TEXT}>, {firstName}</span> : null;

  /* ── VETERAN: slim header so the planner is effectively at the top ── */
  if (tier === 'veteran') {
    return (
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6 lg:px-8">
          <div className={`${NEU} rounded-[2rem] p-6 md:p-8 animate-fade-in-up`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">{greeting}{nameNode}</h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {activeTripName ? <>Your trip <span className="text-violet-600">{activeTripName}</span> is live — Day {activeDayIndex}{activeTotal ? ` of ${activeTotal}` : ''}.</> : 'Ready when you are — jump into the planner below.'}
                </p>
              </div>
              {activeTripName && (
                <button type="button" onClick={onStartPlan} className={`shrink-0 ${GLASS_SM} rounded-2xl px-5 py-3 text-sm font-black text-violet-700 transition hover:bg-white/70 active:scale-95`}>
                  Resume trip →
                </button>
              )}
            </div>
            <div id="tm-search" className="mt-5 scroll-mt-40"><div className="mx-auto max-w-3xl">{searchSlot}</div></div>
          </div>
        </div>
      </section>
    );
  }

  /* ── RETURNING: compact welcome — greeting + search + quick start + how-it-works, no sales pitch ── */
  if (tier === 'returning') {
    return (
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">
          <div className={`${NEU} rounded-[2.25rem] p-8 text-center md:p-10 animate-fade-in-up`}>
            <span className={`inline-flex items-center gap-2 rounded-full ${GLASS_SM} px-4 py-2 text-sm font-black text-violet-600`}><SparkleIcon className="h-4 w-4" /> Welcome back</span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-800 md:text-5xl">{greeting}{nameNode}</h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-500 md:text-lg">Pick up where you left off, or start something new — your places and plans are right below.</p>
            <div id="tm-search" className="mx-auto mt-7 max-w-3xl scroll-mt-40">{searchSlot}</div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={onStartPlan} className={`rounded-2xl bg-gradient-to-r ${GRAD} px-6 py-3 text-sm font-black text-white ${FLOAT_SHADOW} transition hover:brightness-105 active:scale-95`}><span className="relative flex items-center gap-2"><RouteIcon className="h-4 w-4" /> Open planner</span></button>
              <button type="button" onClick={onExplore} className={`rounded-2xl ${NEU_SM} px-6 py-3 text-sm font-black text-slate-600 transition hover:text-violet-600 active:scale-95`}>Discover places</button>
            </div>
          </div>
          <div className="mt-10"><HowItWorks picks={topPicks} /></div>
        </div>
      </section>
    );
  }

  /* ── GUEST / NEW: full Gamma-style welcome hero ── */
  const primaryLabel = isAuthed ? 'Create your first trip' : 'Start for free';
  const primaryAction = isAuthed ? onStartPlan : undefined;
  const primaryHref = isAuthed ? undefined : '/signup';

  return (
    <section className="relative overflow-hidden">
      {/* soft brand blobs (echo the reference's airy gradient, in our palette) */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-10 sm:px-6 lg:px-8">
        {/* split hero */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="text-center lg:text-left animate-fade-in-up">
            <span className={`inline-flex items-center gap-2 rounded-full ${GLASS_SM} px-4 py-2 text-sm font-black text-violet-600`}><SparkleIcon className="h-4 w-4" /> {isAuthed ? 'Your journey starts here' : 'Travel planning, minus the spreadsheet'}</span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-slate-800 md:text-6xl">
              Plan the trip,<br className="hidden sm:block" /> not the <span className={GRAD_TEXT}>tabs</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-500 lg:mx-0">
              TravelMate turns the places you love into a day-by-day plan — stops, times, and the best-rated spots nearby, sorted so you can focus on the trip, not the logistics.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              {primaryHref ? (
                <Link href={primaryHref} className={`rounded-2xl bg-gradient-to-r ${GRAD} px-7 py-3.5 text-base font-black text-white ${FLOAT_SHADOW} ${SHEEN} transition hover:brightness-105 active:scale-95`}><span className="relative">{primaryLabel}</span></Link>
              ) : (
                <button type="button" onClick={primaryAction} className={`rounded-2xl bg-gradient-to-r ${GRAD} px-7 py-3.5 text-base font-black text-white ${FLOAT_SHADOW} ${SHEEN} transition hover:brightness-105 active:scale-95`}><span className="relative flex items-center gap-2"><RouteIcon className="h-5 w-5" />{primaryLabel}</span></button>
              )}
              <button type="button" onClick={() => scrollToId('how-it-works')} className={`rounded-2xl ${NEU_SM} px-7 py-3.5 text-base font-black text-slate-600 transition hover:text-violet-600 active:scale-95`}>See how it works</button>
            </div>
            {!isAuthed && (
              <p className="mt-4 text-sm font-semibold text-slate-400">Already have an account? <Link href="/login" className="text-violet-600 hover:text-violet-700">Sign in</Link></p>
            )}
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <PreviewStack picks={topPicks} />
          </div>
        </div>

        {/* search sits prominently under the hero for every tier that sees this block */}
        <div id="tm-search" className="mx-auto mt-12 max-w-3xl scroll-mt-40">{searchSlot}</div>

        {/* 2x2 feature grid (wired to real actions) */}
        <div className="mt-14"><FeatureGrid onStartPlan={onStartPlan} onExplore={onExplore} /></div>

        {/* social proof from real catalog data */}
        <div className="mt-14"><TrustRow chips={trendingChips} /></div>

        {/* big statement */}
        <div className="mt-16"><Statement /></div>

        {/* how it works */}
        <div className="mt-14"><HowItWorks picks={topPicks} /></div>
      </div>
    </section>
  );
}