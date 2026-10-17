// app/src/app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function ensureProfileFor(authId: string, user: any) {
      const { data: profile } = await supabase
        .from('app_users')
        .select('user_id')
        .eq('auth_user_id', authId)
        .maybeSingle();
      if (profile) return; // already has a profile
      const userId = `USR-${Math.random().toString(16).slice(2, 10)}`;
      const name =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        'TravelMate User';
      await supabase.from('app_users').insert({
        user_id: userId,
        name,
        password_hash: 'MANAGED_BY_SUPABASE_AUTH',
        email: user?.email || '',
        sex: 'Other',
        current_location: null,
        auth_user_id: authId,
      });
    }

    async function handle(attempt = 0) {
      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session && attempt < 5) {
        setTimeout(() => handle(attempt + 1), 300);
        return;
      }
      if (session?.user?.id) {
        await ensureProfileFor(session.user.id, session.user);
      }
      router.replace('/');
    }

    handle();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400">Completing sign-in…</p>
    </main>
  );
}