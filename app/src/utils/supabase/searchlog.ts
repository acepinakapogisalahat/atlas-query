import type { SupabaseClient } from '@supabase/supabase-js';
export async function logSearch(
  supabase: SupabaseClient,
  userId: string | null,
  query: string,
  resultsCount: number,
  activityFilters?: string | null
) {
  if (!userId || !query.trim()) return;
  try {
    const { data: id, error: idErr } = await supabase.rpc('new_log_id');
    if (idErr) throw idErr;
    await supabase.from('search_logs').insert({
      log_id: id as string,
      user_id: userId,
      keywords: query.trim(),
      activity_filters: activityFilters?.trim() || null,
      search_count: resultsCount,
    });
  } catch {
  }
}