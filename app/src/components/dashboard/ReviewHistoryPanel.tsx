// app/src/components/dashboard/ReviewHistoryPanel.tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  NEU_SM, GLASS_SM, GRAD, GRAD_TEXT,
  Star, MapIcon, SparkleIcon, TrashIcon, Chevron, ChevronDown, EmptyBox, Link, fmtDate,
} from '@/components/dashboard/kit';

// Freshness canary (rh-4).
if (typeof window !== 'undefined') console.log('[ReviewHistory] build=rh-4');

type ReviewRow = {
  review_id?: string; listing_id?: string; user_id?: string;
  rating?: number | string | null; title?: string | null; review_text?: string | null;
  visit_date?: string | null; submission_date?: string | null;
  helpful_votes_count?: number | null; photo_url?: string | null;
  flagged?: boolean | string | null; flagged_reason?: string | null; is_flagged?: boolean | string | null; flagged_at?: string | null;
  status?: string | null; removed?: boolean | string | null; is_removed?: boolean | null; deleted_at?: string | null;
  reason?: string | null; moderation_note?: string | null; admin_note?: string | null;
};
type ListingInfo = {
  name?: string | null; listing_type?: string | null; image_url?: string | null;
  destination?: { destination_name?: string | null; region_country?: string | null } | null;
};

const truthy = (v: unknown) => v === true || v === 'true' || (typeof v === 'string' && v.trim().length > 0 && v !== 'false');
const INITIAL_SHOW = 5; // cap the visible list so the band never runs to the page bottom

function moderate(r: ReviewRow) {
  const removed = r.status === 'removed' || r.status === 'rejected' || r.status === 'deleted' || truthy(r.removed) || truthy(r.is_removed) || r.deleted_at != null;
  const flagged = r.status === 'flagged' || truthy(r.flagged) || truthy(r.is_flagged) || r.flagged_at != null;
  const reason = r.flagged_reason ?? r.reason ?? r.moderation_note ?? r.admin_note ?? null;
  return { removed, flagged, actioned: removed || flagged, reason: (reason ?? '').trim() || null };
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (<Star key={i} className={`w-3.5 h-3.5 ${i <= n ? 'text-amber-400' : 'text-slate-300'}`} />))}
    </span>
  );
}

export default function ReviewHistoryPanel({ userId }: { userId: string | null }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [listMap, setListMap] = useState<Record<string, ListingInfo>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'attention'>('all');
  const [expandedText, setExpandedText] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyDelete, setBusyDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data, error } = await supabase.from('reviews').select('*').eq('user_id', userId)
          .order('submission_date', { ascending: false }).order('review_id', { ascending: false });
        if (error) throw error;
        if (!alive) return;
        const rs = (data as ReviewRow[]) ?? [];
        setRows(rs);
        const ids = [...new Set(rs.map((r) => r.listing_id).filter((x): x is string => !!x))];
        if (ids.length) {
          try {
            const { data: ls } = await supabase.from('listings')
              .select('listing_id, name, listing_type, image_url, destination:destination_id(destination_name, region_country)')
              .in('listing_id', ids);
            if (alive && ls) {
              const m: Record<string, ListingInfo> = {};
              (ls as any[]).forEach((l) => { m[l.listing_id] = { name: l.name, listing_type: l.listing_type, image_url: l.image_url, destination: l.destination ?? null }; });
              setListMap(m);
            }
          } catch { /* enrichment best-effort */ }
        }
      } catch (e: any) { if (alive) setErr(e?.message ?? 'Could not load your reviews.'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [userId, supabase]);

  const withMod = useMemo(() => rows.map((r) => ({ r, m: moderate(r) })), [rows]);
  const attentionCount = withMod.filter((x) => x.m.actioned).length;
  const shown = filter === 'attention' ? withMod.filter((x) => x.m.actioned) : withMod;
  const visible = showAll ? shown : shown.slice(0, INITIAL_SHOW);
  const hasMore = shown.length > INITIAL_SHOW;
  const stats = useMemo(() => {
    const ratings = rows.map((r) => Number(r.rating)).filter((x) => !isNaN(x) && x > 0);
    return { n: rows.length, avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null, helpful: rows.reduce((s, r) => s + (Number(r.helpful_votes_count) || 0), 0) };
  }, [rows]);

  function toggleText(key: string) {
    setExpandedText((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }
  async function deleteReview(r: ReviewRow, key: string) {
    if (!r.review_id) return;
    setBusyDelete(key);
    try {
      const { error } = await supabase.from('reviews').delete().eq('review_id', r.review_id);
      if (error) throw error;
      if (r.listing_id) {
        const { data: all } = await supabase.from('reviews').select('rating').eq('listing_id', r.listing_id);
        if (all && all.length) {
          const avg = (all as any[]).reduce((s, x) => s + Number(x.rating), 0) / all.length;
          await supabase.from('listings').update({ average_rating: Math.round(avg * 10) / 10 }).eq('listing_id', r.listing_id);
        }
      }
      setRows((prev) => prev.filter((x) => x.review_id !== r.review_id));
    } catch (e: any) { setErr(e?.message ?? 'Could not delete the review.'); }
    setBusyDelete(null); setConfirmDelete(null);
  }

  if (!userId) return <EmptyBox icon={<MapIcon className="w-6 h-6" />} title="Sign in to see your reviews" sub="Your rating history and any moderation notes live here." />;

  return (
    <div className="space-y-4">
      {/* Controls: filter + mini stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`${GLASS_SM} rounded-xl p-1 flex gap-1`}>
          {(['all', 'attention'] as const).map((f) => (
            <button key={f} type="button" onClick={() => { setFilter(f); setShowAll(false); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black tracking-wide transition active:scale-95 ${filter === f ? `bg-gradient-to-r ${GRAD} text-white shadow-sm` : 'text-slate-500 hover:text-violet-600'}`}>
              {f === 'all' ? `All (${rows.length})` : `Needs attention (${attentionCount})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className={`${NEU_SM} rounded-xl px-3 py-1.5 flex items-center gap-1.5`}><Stars n={Math.round(stats.avg ?? 0)} /><span className="text-xs font-black text-slate-700">{stats.avg != null ? stats.avg.toFixed(1) : '—'}</span><span className="text-[10px] font-bold text-slate-400">avg</span></div>
          <div className={`${NEU_SM} rounded-xl px-3 py-1.5 text-xs`}><span className="font-black text-slate-700">{stats.helpful}</span> <span className="font-bold text-slate-400">helpful</span></div>
        </div>
      </div>

      {err && <p className={`text-sm font-semibold text-rose-700 ${GLASS_SM} border-rose-200/70 rounded-xl px-3 py-2`}>Couldn’t load reviews: {err}</p>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`h-32 rounded-2xl ${NEU_SM} animate-pulse`} />)}</div>
      ) : shown.length === 0 ? (
        <div className="space-y-3">
          <EmptyBox icon={<SparkleIcon className="w-6 h-6" />}
            title={filter === 'attention' ? 'Nothing flagged' : 'No reviews yet'}
            sub={filter === 'attention' ? 'None of your reviews were flagged or removed — nice work.' : 'Finish a trip and rate the places you visited.'} />
          <Link href="/my-trips" className={`flex items-center justify-between rounded-2xl ${NEU_SM} px-4 py-3 text-sm font-black text-slate-600 hover:text-violet-600 transition`}>Rate a finished trip <Chevron className="w-4 h-4" /></Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {visible.map(({ r, m }, i) => {
              const key = r.review_id ?? `${r.listing_id}-${i}`;
              const li = r.listing_id ? listMap[r.listing_id] : undefined;
              const placeName = li?.name ?? (r.listing_id ? 'Place unavailable' : 'a place');
              const dest = [li?.destination?.destination_name, li?.destination?.region_country].filter(Boolean).join(' · ');
              const typeLine = dest || li?.listing_type || 'Place';
              const ratingNum = Number(r.rating ?? 0);
              const helpful = Number(r.helpful_votes_count) || 0;
              const body = r.review_text ?? '';
              const isLong = body.length > 120 || (r.title?.length ?? 0) > 40;
              const isOpen = expandedText.has(key);
              return (
                <article
                  key={key}
                  onClick={() => r.listing_id && router.push(`/listing/${r.listing_id}`)}
                  className={`group flex flex-col rounded-2xl ${NEU_SM} p-4 transition hover:-translate-y-0.5 hover:shadow-[10px_10px_26px_rgba(163,170,205,0.5)] ${r.listing_id ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex items-start gap-3">
                    {li?.image_url || r.photo_url ? (
                      <img src={(li?.image_url || r.photo_url) as string} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-md" />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 shrink-0 flex items-center justify-center text-violet-400 font-black`}>{(placeName.charAt(0) || 'P').toUpperCase()}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-slate-800 text-sm truncate group-hover:text-violet-600 transition">{placeName}</p>
                        {m.actioned && (<span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${m.removed ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{m.removed ? 'Removed' : 'Flagged'}</span>)}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">{typeLine}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Stars n={ratingNum} />
                        <span className="text-[10px] font-semibold text-slate-400">{fmtDate(r.submission_date ?? r.visit_date ?? null)}</span>
                        {helpful > 0 && <span className="text-[10px] font-bold text-emerald-600">· {helpful} helpful</span>}
                      </div>
                    </div>
                  </div>

                  {(r.title || body) && (
                    <p className={`mt-3 text-xs text-slate-600 leading-relaxed ${isOpen ? '' : 'line-clamp-2'}`}>
                      {r.title ? <span className="font-bold text-slate-700">{r.title} — </span> : null}{body}
                    </p>
                  )}
                  {isLong && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleText(key); }} className="mt-1 self-start text-[10px] font-black text-violet-600 hover:text-violet-700 transition">{isOpen ? 'Show less' : 'Show more'}</button>
                  )}

                  {m.actioned && (
                    <div className={`mt-3 rounded-xl border-l-4 px-3 py-2 ${m.removed ? 'border-rose-400 bg-rose-50/70' : 'border-amber-400 bg-amber-50/70'}`}>
                      <p className={`text-[9px] font-black uppercase tracking-[0.12em] ${m.removed ? 'text-rose-600' : 'text-amber-700'}`}>{m.removed ? 'Why removed' : 'Why flagged'}</p>
                      <p className={`mt-0.5 text-xs font-semibold ${m.removed ? 'text-rose-800' : 'text-amber-800'}`}>{m.reason ?? (m.removed ? 'No longer meets our guidelines. You can repost from the place page.' : 'Under moderator review; stays visible unless removed.')}</p>
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-white/60">
                    {r.listing_id ? (
                      <span className="text-[11px] font-black text-slate-400 group-hover:text-violet-600 transition flex items-center gap-1">Open place <Chevron className="w-3.5 h-3.5" /></span>
                    ) : <span />}
                    {r.review_id && (
                      <button type="button" aria-label="Delete review" title="Delete this review"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(confirmDelete === key ? null : key); }}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 transition flex items-center justify-center">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {confirmDelete === key && (
                    <div className={`mt-2 rounded-xl ${GLASS_SM} border-rose-200/70 px-3 py-2 flex items-center justify-between gap-2`} onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs font-bold text-rose-700">Delete this review?</span>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setConfirmDelete(null)} className="px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
                        <button type="button" disabled={busyDelete === key} onClick={() => deleteReview(r, key)} className="px-2.5 py-1 rounded-lg text-[10px] font-black text-white bg-gradient-to-r from-rose-500 to-red-500 shadow-sm disabled:opacity-60 transition">{busyDelete === key ? '…' : 'Delete'}</button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Cap control + CTA */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {hasMore ? (
              <button type="button" onClick={() => setShowAll((v) => !v)} className={`${BTN_GHOST_LIKE} inline-flex items-center gap-1.5 px-4 py-2.5 text-sm`}>
                {showAll ? <>Show less <ChevronDown className="w-4 h-4 rotate-180" /></> : <>View all {shown.length} reviews <ChevronDown className="w-4 h-4" /></>}
              </button>
            ) : <span className="text-xs font-semibold text-slate-400">{shown.length} review{shown.length === 1 ? '' : 's'}</span>}
            <Link href="/my-trips" className="inline-flex items-center gap-1.5 text-sm font-black text-violet-600 hover:text-violet-700 transition">Rate a finished trip <Chevron className="w-4 h-4" /></Link>
          </div>
        </>
      )}
    </div>
  );
}

// Local ghost-button style (avoids depending on kit's BTN_GHOST shape here).
const BTN_GHOST_LIKE = 'rounded-2xl bg-white/55 backdrop-blur-md border border-white/70 text-slate-600 font-bold hover:text-violet-600 hover:bg-white/80 active:scale-[0.97] transition shadow-[0_4px_16px_rgba(110,120,190,0.18)]';