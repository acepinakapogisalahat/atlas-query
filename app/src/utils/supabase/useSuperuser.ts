// app/src/utils/supabase/useSuperuser.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export type SuperuserProfile = {
  admin_id: string;
  full_name: string | null;
  email: string | null;
  role_level: 'superuser' | 'moderator';
  last_login_at: string | null;
};

export function useSuperuser() {
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [profile, setProfile] = useState<SuperuserProfile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess?.session?.user?.id ?? null;
        if (!uid) { if (alive) { setIsSuperadmin(false); setProfile(null); setLoading(false); } return; }

        const { data, error } = await supabase
          .from('administrators')
          .select('admin_id, full_name, email, role_level, last_login_at')
          .eq('auth_user_id', uid)
          .maybeSingle();

        if (alive) {
          if (error || !data) { setIsSuperadmin(false); setProfile(null); }
          else { setIsSuperadmin(true); setProfile(data as SuperuserProfile); }
          setLoading(false);
        }

        // touch last_login once, fire-and-forget (definer-free: superuser bypass policy allows it)
        if (data && !error) {
          supabase.from('administrators').update({ last_login_at: new Date().toISOString() })
            .eq('admin_id', (data as SuperuserProfile).admin_id).then(() => {});
        }
      } catch {
        if (alive) { setIsSuperadmin(false); setProfile(null); setLoading(false); }
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // re-evaluate on login/logout/account switch
      setLoading(true);
      (async () => {
        try {
          const { data: sess } = await supabase.auth.getSession();
          const uid = sess?.session?.user?.id ?? null;
          if (!uid) { if (alive) { setIsSuperadmin(false); setProfile(null); setLoading(false); } return; }
          const { data } = await supabase.from('administrators')
            .select('admin_id, full_name, email, role_level, last_login_at')
            .eq('auth_user_id', uid).maybeSingle();
          if (alive) { setIsSuperadmin(!!data); setProfile((data as SuperuserProfile) ?? null); setLoading(false); }
        } catch { if (alive) { setIsSuperadmin(false); setLoading(false); } }
      })();
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  return { loading, isSuperadmin, profile };
}