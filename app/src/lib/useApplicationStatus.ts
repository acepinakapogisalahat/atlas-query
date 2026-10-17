// app/src/lib/useApplicationStatus.ts
'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export type AppKind = 'place' | 'business';
export type NormStatus = 'pending' | 'approved' | 'rejected';
export type AppRow = {
  application_id: string; company_name: string; business_type: string;
  kind: AppKind; status: NormStatus; raw_status: string;
  submitted_at: string | null; reviewed_at: string | null; pitch: string | null;
};
export type AppStatus = {
  loading: boolean; rows: AppRow[];
  pending: AppRow[]; approved: AppRow[]; rejected: AppRow[];
  isBusinessOwner: boolean; hasLivePlace: boolean;
  latestApproved: AppRow | null; latestRejected: AppRow | null;
};

const APPROVED = /^(approv|accept|live|publish|verified|granted|active)/i;
const REJECTED = /^(reject|declin|deni|deny|refus|closed)/i;
export function normStatus(s: string | null | undefined): NormStatus {
  if (APPROVED.test((s ?? '').trim())) return 'approved';
  if (REJECTED.test((s ?? '').trim())) return 'rejected';
  return 'pending';
}
const EMPTY: AppStatus = { loading: true, rows: [], pending: [], approved: [], rejected: [], isBusinessOwner: false, hasLivePlace: false, latestApproved: null, latestRejected: null };

export function useApplicationStatus(): AppStatus {
  const supabase = createClient();
  const [st, setSt] = useState<AppStatus>(EMPTY);

  const load = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id ?? null;
      if (!uid) { setSt({ ...EMPTY, loading: false }); return; }
      const { data: profile } = await supabase.from('app_users').select('user_id').eq('auth_user_id', uid).maybeSingle();
      const userId = (profile as any)?.user_id ?? null;
      if (!userId) { setSt({ ...EMPTY, loading: false }); return; }

      const [appsRes, ownersRes] = await Promise.all([
        supabase.from('business_applications').select('application_id, company_name, business_type, application_kind, status, submitted_at, reviewed_at, pitch').eq('user_id', userId).order('submitted_at', { ascending: false }),
        supabase.from('business_owners').select('owner_id').eq('auth_user_id', uid).maybeSingle(), // owners_read_own_row keys on auth_user_id
      ]);

      const rows: AppRow[] = ((appsRes.data ?? []) as any[]).map((r) => ({
        application_id: r.application_id, company_name: r.company_name ?? '', business_type: r.business_type ?? '',
        kind: (r.application_kind === 'place' ? 'place' : 'business') as AppKind,
        status: normStatus(r.status), raw_status: r.status ?? 'pending',
        submitted_at: r.submitted_at ?? null, reviewed_at: r.reviewed_at ?? null, pitch: r.pitch ?? null,
      }));
      const approved = rows.filter((r) => r.status === 'approved');
      const ownerByApp = approved.some((r) => r.kind === 'business');
      setSt({
        loading: false, rows,
        pending: rows.filter((r) => r.status === 'pending'),
        approved, rejected: rows.filter((r) => r.status === 'rejected'),
        isBusinessOwner: !!ownersRes.data || ownerByApp, // readable owner row OR approved business application
        hasLivePlace: approved.some((r) => r.kind === 'place'),
        latestApproved: approved[0] ?? null, latestRejected: rows.find((r) => r.status === 'rejected') ?? null,
      });
    } catch { setSt({ ...EMPTY, loading: false }); }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);
  return st;
}

// transition detection for the login popup: baseline on first run (no spam for historical approvals),
// then fire only on observed pending -> approved/rejected changes, and record them so they fire once.
const SEEN_KEY = 'tm-app-status-seen';
export function detectTransitions(rows: AppRow[]): AppRow[] {
  if (typeof window === 'undefined' || !rows.length) return [];
  let seen: Record<string, string> | null = null;
  try { seen = JSON.parse(window.localStorage.getItem(SEEN_KEY) || 'null'); } catch { seen = null; }
  const snap: Record<string, string> = {};
  for (const r of rows) snap[r.application_id] = r.status;
  if (!seen) { try { window.localStorage.setItem(SEEN_KEY, JSON.stringify(snap)); } catch {} return []; } // baseline, no popup
  const fired = rows.filter((r) => (seen![r.application_id] ?? 'pending') === 'pending' && r.status !== 'pending');
  try { window.localStorage.setItem(SEEN_KEY, JSON.stringify(snap)); } catch {}
  return fired;
}