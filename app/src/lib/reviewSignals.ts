// app/src/lib/reviewSignals.ts
// Pure, dependency-free content-integrity heuristics for the admin Reviews console.
// No network, no React. Deterministic. Tune BAD_WORDS / thresholds here.
// Closes the mission-doc "Review Fraud & Data Anomalies" QA gap.

export type SignalKind = 'danger' | 'warn';
export type SignalLevel = 'clean' | 'warn' | 'danger';
export type ReviewReason = { label: string; kind: SignalKind };
export type ReviewSignal = { level: SignalLevel; reasons: ReviewReason[] };

// Minimal shape analyzeReview reads (the admin row object structurally satisfies this).
export type AnalyzableReview = {
  user_id: string | null;
  listing_id: string;
  owner_user_id?: string | null;
  rating: number;
  title: string | null;
  review_text: string | null;
  visit_date: string | null;
  submission_date: string | null;
};

export function normText(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Editable inappropriate-language list (kept short & generic for the demo).
export const BAD_WORDS: string[] = [
  'damn', 'hell', 'ass', 'asshole', 'bitch', 'bastard', 'crap', 'dick', 'piss', 'shit',
  'fuck', 'fucking', 'cunt', 'slut', 'whore', 'retard', 'dumbass', 'jackass', 'moron',
];

export type SignalContext = {
  textCount: Record<string, number>;
  burstUsers: Set<string>;
};

export function buildContext(
  rows: { user_id: string | null; review_text: string | null; submission_date: string | null }[],
): SignalContext {
  const textCount: Record<string, number> = {};
  const byUser: Record<string, number[]> = {};
  for (const r of rows) {
    const t = normText(r.review_text);
    if (t) textCount[t] = (textCount[t] ?? 0) + 1;
    if (r.user_id) {
      const ts = r.submission_date ? new Date(r.submission_date).getTime() : NaN;
      if (!isNaN(ts)) (byUser[r.user_id] ??= []).push(ts);
    }
  }
  const burstUsers = new Set<string>();
  const DAY = 24 * 3600 * 1000;
  for (const uid in byUser) {
    const ts = byUser[uid].sort((a, b) => a - b);
    for (let i = 0; i + 2 < ts.length; i++) if (ts[i + 2] - ts[i] <= DAY) { burstUsers.add(uid); break; }
  }
  return { textCount, burstUsers };
}

export function analyzeReview(r: AnalyzableReview, ctx: SignalContext): ReviewSignal {
  const reasons: ReviewReason[] = [];
  const push = (label: string, kind: SignalKind) => reasons.push({ label, kind });
  const hay = `${r.title ?? ''} ${r.review_text ?? ''}`;
  const low = hay.toLowerCase();

  // ── danger tier: clearly unsuitable / fraudulent ──
  if (BAD_WORDS.some((w) => new RegExp(`\\b${w}s?\\b`).test(low))) push('Inappropriate language', 'danger');
  if (/(https?:\/\/|www\.|\.(com|net|org|io|co|xyz)\b)/i.test(hay)) push('External link / URL', 'danger');
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(hay) || /(?:\+?\d[\d\s().-]{7,}\d)/.test(hay)) push('Contact info leaked', 'danger');
  if (r.owner_user_id && r.user_id && r.owner_user_id === r.user_id) push('Owner self-review', 'danger');
  const v = r.visit_date ? new Date(r.visit_date).getTime() : NaN;
  const s = r.submission_date ? new Date(r.submission_date).getTime() : NaN;
  if (!isNaN(v) && !isNaN(s) && s < v) push('Submitted before visit', 'danger');

  // ── warn tier: suspicious / low quality ──
  if (!isNaN(v) && v > Date.now()) push('Future visit date', 'warn');
  const letters = (r.review_text ?? '').replace(/[^A-Za-z]/g, '');
  if (letters.length > 8) {
    const up = letters.split('').filter((c) => c === c.toUpperCase()).length;
    if (up / letters.length > 0.6) push('Excessive capitalisation', 'warn');
  }
  const words = normText(r.review_text).split(' ').filter((w) => w.length >= 4);
  const freq: Record<string, number> = {};
  let rep = false;
  for (const w of words) { freq[w] = (freq[w] ?? 0) + 1; if (freq[w] >= 4) rep = true; }
  if (rep) push('Repetitive / spam-like', 'warn');
  if (normText(`${r.title ?? ''} ${r.review_text ?? ''}`).length < 10) push('Low-effort content', 'warn');
  if (r.review_text && (ctx.textCount[normText(r.review_text)] ?? 0) > 1) push('Duplicate text', 'warn');
  if (r.user_id && ctx.burstUsers.has(r.user_id)) push('Unusual posting burst', 'warn');

  const hasDanger = reasons.some((x) => x.kind === 'danger');
  const hasWarn = reasons.some((x) => x.kind === 'warn');
  const level: SignalLevel = hasDanger ? 'danger' : hasWarn ? 'warn' : 'clean';
  return { level, reasons };
}