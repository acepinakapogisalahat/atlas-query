// app/src/components/dashboard/ToolsTab.tsx
'use client';
import {
  NEU, NEU_SM, INSET, GLASS, GLASS_SM, GRAD, GRAD_TEXT, GLOSS, FLOAT_SHADOW,
  Star, Chevron, MapIcon, SparkleIcon, SunIcon, BoltIcon, RouteIcon, CompassIcon, GlassWellIcon, SectionHeader, Link,
  type ForecastDay, type TripData, type ReviewMap,
} from '@/components/dashboard/kit';
import { getTripStatus } from '@/components/dashboard/kit';

type Props = {
  forecast: ForecastDay[]; forecastLocation: string | null;
  trips: TripData[]; tripReviewMap: ReviewMap; userId: string | null;
  onGoPlan: () => void;
};

export default function ToolsTab({ forecast, forecastLocation, trips, tripReviewMap, userId, onGoPlan }: Props) {
  const temps = forecast.map((f) => f.temp);
  const minT = Math.min(...temps), maxT = Math.max(...temps);
  const span = maxT - minT || 1;
  const countries = new Set(trips.flatMap((t) => t.items.map((i) => i.destination_name).filter(Boolean))).size;
  const reviewsShared = Object.values(tripReviewMap).reduce((s, v) => s + v.reviewed, 0);
  const activeTrip = trips.find((t) => getTripStatus(t) === 'ongoing') ?? null;

  const actions = [
    { href: '/my-trips', label: 'My trips & bookings', icon: <RouteIcon className="w-5 h-5" />, grad: 'from-indigo-500 to-violet-500' },
    { href: '/search', label: 'Search destinations', icon: <CompassIcon className="w-5 h-5" />, grad: 'from-sky-500 to-indigo-500' },
    { href: '/owner', label: 'Manage my listings', icon: <MapIcon className="w-5 h-5" />, grad: 'from-emerald-500 to-teal-500' },
    { href: '/apply', label: 'List your place', icon: <BoltIcon className="w-5 h-5" />, grad: 'from-amber-400 to-orange-500' },
    { href: '/profile', label: 'Profile & preferences', icon: <SparkleIcon className="w-5 h-5" />, grad: 'from-fuchsia-500 to-purple-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Resume planning CTA (only when a trip is live) */}
      {activeTrip && (
        <button type="button" onClick={onGoPlan} className={`w-full text-left group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${GRAD} p-6 text-white ${FLOAT_SHADOW} ${'' + ''}`}>
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-transparent" />
          <div className="relative flex items-center gap-4">
            <GlassWellIcon gradient="from-white/30 to-white/10"><RouteIcon className="w-6 h-6" /></GlassWellIcon>
            <div className="min-w-0 flex-1"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Trip in progress</p><p className="text-xl font-black truncate">{activeTrip.trip_name ?? 'Your trip'}</p><p className="text-sm text-white/80 font-semibold">Tap to open the planner →</p></div>
            <Chevron className="w-6 h-6 shrink-0 transition group-hover:translate-x-1" />
          </div>
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forecast widget */}
        <div className={`${GLASS} rounded-[1.75rem] p-6 lg:col-span-2`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3"><GlassWellIcon gradient="from-sky-400 to-indigo-500"><SunIcon className="w-5 h-5" /></GlassWellIcon><div><h3 className="font-black text-slate-800">5-day forecast</h3><p className="text-xs text-slate-500 font-semibold">{forecastLocation ? `Live · ${forecastLocation}` : 'Sample data'}</p></div></div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${GLASS_SM} ${forecastLocation ? 'text-emerald-600' : 'text-slate-400'}`}>{forecastLocation ? 'Open-Meteo' : 'Demo'}</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {forecast.map((o, i) => { const h = 30 + Math.round(((o.temp - minT) / span) * 70); return (
              <div key={`${o.day}-${i}`} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-black text-slate-700">{o.temp}°</span>
                <div className={`${INSET} w-full rounded-xl overflow-hidden flex items-end h-24`}><div className={`w-full rounded-xl bg-gradient-to-t ${GRAD} ${GLOSS} transition-all duration-700`} style={{ height: `${h}%` }} /></div>
                <span className="text-[11px] font-bold text-slate-400">{o.day}</span>
              </div>
            ); })}
          </div>
          <p className="mt-4 text-xs text-slate-500">{forecastLocation ? 'Live telemetry via Open-Meteo (Mission 1, Challenge 3).' : 'Set your current location in Profile for live weather.'}</p>
        </div>

        {/* Trip stats */}
        <div className={`${NEU} rounded-[1.75rem] p-6 flex flex-col`}>
          <h3 className="font-black text-slate-800 mb-1">Your travel stats</h3>
          <div className="mt-2 h-1.5 w-16 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-[0_0_14px_rgba(139,92,246,0.65)]" />
          <div className="grid grid-cols-1 gap-3 mt-5 flex-1">
            {[{ l: 'Trips planned', v: trips.length, g: 'from-indigo-500 to-violet-500' }, { l: 'Destinations touched', v: countries, g: 'from-sky-500 to-indigo-500' }, { l: 'Reviews shared', v: reviewsShared, g: 'from-emerald-500 to-teal-500' }].map((s) => (
              <div key={s.l} className={`${INSET} rounded-2xl p-4 flex items-center gap-3`}>
                <GlassWellIcon gradient={s.g}><Star className="w-4 h-4" /></GlassWellIcon>
                <div><p className={`text-2xl font-black leading-none ${GRAD_TEXT}`}>{s.v}</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.l}</p></div>
              </div>
            ))}
          </div>
          {!userId && <p className="text-xs text-slate-400 mt-3 font-semibold">Sign in to track your journeys.</p>}
        </div>
      </div>

      {/* Quick actions — big tappable shortcuts */}
      <div className={`${GLASS} rounded-[1.75rem] p-6`}>
        <SectionHeader title="Quick actions" helper="Jump straight to a workspace" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className={`group ${NEU_SM} rounded-2xl p-4 flex flex-col items-start gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[12px_12px_30px_rgba(163,170,205,0.5)] active:scale-[0.98]`}>
              <GlassWellIcon gradient={a.grad}>{a.icon}</GlassWellIcon>
              <span className="text-sm font-black text-slate-700 group-hover:text-violet-600 transition leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}