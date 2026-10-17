// app/src/components/NotifGlyph.tsx
'use client';

export function NotifGlyph({ type, className }: { type: string; className?: string }) {
  const c = className ?? 'w-5 h-5';
  if (type.startsWith('review_')) return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={c}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>);
  if (type.startsWith('listing_')) return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={c}><path d="M4 10v10h16V10" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 6l1.5-3h15L21 6c0 1.7-1.3 3-3 3s-3-1.3-3-3c0 1.7-1.3 3-3 3S9 7.7 9 6c0 1.7-1.3 3-3 3S3 7.7 3 6z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 20v-6h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>);
  if (type.startsWith('application_')) return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={c}><path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" strokeLinecap="round" strokeLinejoin="round" /></svg>);
  if (type === 'account_banned') return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c}><circle cx="12" cy="12" r="9" /><line x1="5.6" y1="5.6" x2="18.4" y2="18.4" strokeLinecap="round" /></svg>);
  if (type === 'account_suspended') return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>);
  if (type.startsWith('account_')) return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={c}><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>);
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={c}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" /></svg>);
}