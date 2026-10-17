// app/src/app/signup/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import AuthShell from '@/components/AuthShell';

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition';

const SEX_OPTIONS = ['Male', 'Female', 'Other'];

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'w-5 h-5'}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sex, setSex] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const clear = () => {
      if (nameRef.current) nameRef.current.value = '';
      if (emailRef.current) emailRef.current.value = '';
      if (locationRef.current) locationRef.current.value = '';
      if (passwordRef.current) passwordRef.current.value = '';
      setName('');
      setEmail('');
      setLocation('');
      setPassword('');
      setSex('');
    };
    clear();
    const t = setTimeout(clear, 60);
    return () => clearTimeout(t);
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (!sex) {
      setError('Please select a Sex option to complete your registration profile.');
      setBusy(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setBusy(false);
      return;
    }
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
    if (err) {
      setError(
        err.message.includes('already registered')
          ? 'That email is already registered — try signing in instead.'
          : err.message
      );
      setBusy(false);
      return;
    }
    const authId = data.user?.id ?? null;
    if (!authId) {
      setError('Could not create the account. Please try again.');
      setBusy(false);
      return;
    }
    const userId = `USR-${Math.random().toString(16).slice(2, 10)}`;
    const { error: profileErr } = await supabase.from('app_users').insert({
      user_id: userId,
      name: name.trim(),
      password_hash: 'MANAGED_BY_SUPABASE_AUTH',
      email: email.trim(),
      sex,
      current_location: location.trim() || null,
      auth_user_id: authId,
    });
    if (profileErr) {
      setError(`Account created, but profile setup failed: ${profileErr.message}`);
      setBusy(false);
      return;
    }
        // Wipe browser history so the back button never returns to signup
    try {
      window.history.replaceState(null, '', '/');
    } catch {}
    router.push('/');
    router.push('/');
    router.refresh();
  }

  async function handleGoogleSignup() {
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setBusy(false);
    }
    // Browser will redirect to Google, no need to handle further here
  }


  return (
    <AuthShell
      title="Create your account"
      subtitle="Join TravelMate and start planning your next story."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4" autoComplete="off">
        {/* Decoy fields absorb browser autofill heuristics (incl. "suggest strong password") */}
        <input type="text" name="decoy-user" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
        <input type="password" name="decoy-pass" autoComplete="new-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />

        {error && <p className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</p>}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Full name
          </label>
          <input
            ref={nameRef}
            id="name"
            required
            maxLength={50}
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Dela Cruz"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email
          </label>
          <input
            ref={emailRef}
            id="email"
            type="email"
            required
            maxLength={255}
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>
        <div>
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Sex</span>
          <div className="flex gap-2">
            {SEX_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={`px-4 py-2 rounded-full text-sm border transition ${
                  sex === s
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:text-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1.5">
            Current location <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            ref={locationRef}
            id="location"
            maxLength={100}
            autoComplete="off"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Manila, Philippines"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Password
          </label>
          <input
            ref={passwordRef}
            id="password"
            type="password"
            required
            maxLength={72}
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6–72 characters"
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800 transition shadow-sm disabled:opacity-60"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400 uppercase tracking-wider">Or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={busy}
          className="mt-6 w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-sm disabled:opacity-60"
        >
          <GoogleIcon className="w-5 h-5" />
          Sign up with Google
        </button>
      </div>
    </AuthShell>
  );
}