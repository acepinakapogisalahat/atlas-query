// app/src/components/business/BusinessOnboarding.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { GLASS, GRAD, GRAD_TEXT, FLOAT_SHADOW, BTN_PRIMARY, BTN_GHOST, SparkleIcon, RouteIcon, MapIcon, Star, CloseIcon, Link } from '@/components/dashboard/kit';
import { useApplicationStatus, detectTransitions, type AppRow } from '@/lib/useApplicationStatus';

// Drop <BusinessOnboarding/> anywhere in the authed tree (e.g. page.tsx). Returns null until a
// pending->approved/rejected transition is observed on this device, so it never nags.
export default function BusinessOnboarding() {
  const st = useApplicationStatus();
  const [queue, setQueue] = useState<AppRow[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (st.loading || checked.current || !st.rows.length) return;
    checked.current = true;
    const fired = detectTransitions(st.rows);
    if (fired.length) setQueue(fired);
  }, [st.loading, st.rows]);

  if (!queue.length || dismissed) return null;
  const row = queue[0];
  const isOwner = row.kind === 'business' && row.status === 'approved';
  const isLivePlace = row.kind === 'place' && row.status === 'approved';
  const rejected = row.status === 'rejected';

  const title = rejected ? 'Update on your application'
    : isOwner ? 'You’re now a business owner'
    : isLivePlace ? 'Your place is live' : 'Your application was approved';
  const sub = rejected
    ? `“${row.company_name}” wasn’t approved this time. You can revise and resubmit — we kept your notes.`
    : isOwner
    ? `Welcome aboard — “${row.company_name}” is approved. Your owner tools and listings are unlocking across the app.`
    : isLivePlace
    ? `“${row.company_name}” is now published in Discover, where travelers plan day by day.`
    : `“${row.company_name}” is approved.`;
  const Icon = rejected ? MapIcon : isOwner ? RouteIcon : Star;
  const grad = rejected ? 'from-slate-400 to-slate-500' : isOwner ? 'from-emerald-500 to-teal-500' : `from-indigo-500 to-violet-500`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fade-in" onClick={() => setQueue((q) => q.slice(1))}>
      <div className={`${GLASS} rounded-[2rem] p-8 md:p-10 max-w-md w-full text-center ${FLOAT_SHADOW}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Close" className="absolute top-4 right-4 w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex items-center justify-center"><CloseIcon className="w-5 h-5" /></button>
        <div className={`mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-lg`}><Icon className="w-8 h-8" /></div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-800">{rejected ? title : <>{title.split(' ').slice(0, -1).join(' ')} <span className={GRAD_TEXT}>{title.split(' ').slice(-1)}</span></>}</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">{sub}</p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          {rejected ? (
            <Link href="/apply" className={`${BTN_PRIMARY} px-6 py-3 text-sm`}><span className="relative flex items-center gap-2"><SparkleIcon className="w-4 h-4" />Revise & resubmit</span></Link>
          ) : (
            <>
              <Link href="/apply" className={`${BTN_PRIMARY} px-6 py-3 text-sm`}><span className="relative flex items-center gap-2"><MapIcon className="w-4 h-4" />View my applications</span></Link>
              {isOwner && (<Link href="/apply" className={`${BTN_GHOST} px-6 py-3 text-sm`}>Owner tools →</Link>)}
            </>
          )}
          <button type="button" onClick={() => setQueue((q) => q.slice(1))} className={`${BTN_GHOST} px-6 py-3 text-sm`}>{queue.length > 1 ? 'Next' : 'Got it'}</button>
        </div>
      </div>
    </div>
  );
}

// Exported so the nav/profile can show an owner chip once you hand me that file (1-line drop).
export function BusinessOwnerBadge() {
  const st = useApplicationStatus();
  if (st.loading || !st.isBusinessOwner) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
      <RouteIcon className="w-3 h-3" /> Business owner
    </span>
  );
}