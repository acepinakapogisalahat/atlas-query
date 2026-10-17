// app/src/utils/supabase/role.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export type ApplicationInfo = { application_id: string; status: string; submitted_at: string } | null;

export function useRole() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [authId, setAuthId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationInfo>(null);

  async function load() {
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user?.id ?? null;
    setAuthId(uid);
    if (!uid) {
      setUserId(null); setIsAdmin(false); setIsOwner(false);
      setAdminId(null); setOwnerId(null); setApplication(null);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from('app_users').select('user_id').eq('auth_user_id', uid).maybeSingle();
    const myUserId = profile?.user_id ?? null;
    setUserId(myUserId);

    const [admin, owner, app] = await Promise.all([
      supabase.from('administrators').select('admin_id').eq('auth_user_id', uid).maybeSingle(),
      supabase.from('business_owners').select('owner_id').eq('auth_user_id', uid).maybeSingle(),
      myUserId
        ? supabase.from('business_applications')
            .select('application_id, status, submitted_at')
            .eq('user_id', myUserId)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
        setAdminId(admin.data?.admin_id ?? null);
    setIsAdmin(!!admin.data);
    setOwnerId(owner.data?.owner_id ?? null);
    setIsOwner(!!owner.data);
    setApplication((app.data as ApplicationInfo) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, authId, userId, isAdmin, isOwner, adminId, ownerId, application, refresh: load };
}