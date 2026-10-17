// app/src/components/Footer.tsx
'use client';

import Link from 'next/link';
import { useRole } from '@/utils/supabase/role';

const headCls = 'text-xs font-semibold uppercase tracking-wider text-slate-500';
const itemCls = 'text-sm text-slate-400 hover:text-white transition';

export default function Footer() {
  const role = useRole();

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-white tracking-tight">TravelMate</span>
          </Link>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            Ratings, reviews, and owner-published listings, everything you need to plan the next trip with confidence.
          </p>
        </div>

        <div>
          <h3 className={headCls}>Explore</h3>
          <ul className="mt-4 space-y-2.5">
            <li><Link href="/" className={itemCls}>Discover</Link></li>
            <li><Link href="/search" className={itemCls}>Search</Link></li>
            <li><Link href="/apply" className={itemCls}>List your place</Link></li>
          </ul>
        </div>

        <div>
          <h3 className={headCls}>Publish</h3>
          <ul className="mt-4 space-y-2.5">
            <li><Link href="/apply" className={itemCls}>Become a publisher</Link></li>
            <li><Link href="/owner" className={itemCls}>Owner dashboard</Link></li>
            {role.isAdmin && (
              <li><Link href="/admin/applications" className={itemCls}>Applications queue</Link></li>
            )}
          </ul>
        </div>

        <div>
          <h3 className={headCls}>Account</h3>
          <ul className="mt-4 space-y-2.5">
            {role.authId ? (
              <>
                <li><Link href="/profile" className={itemCls}>Your profile</Link></li>
                <li><Link href="/owner" className={itemCls}>My listings</Link></li>
              </>
            ) : (
              <>
                <li><Link href="/login" className={itemCls}>Sign in</Link></li>
                <li><Link href="/signup" className={itemCls}>Create account</Link></li>
              </>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 TravelMate · Atlas Query Co.</p>
          <p>Plan less. Experience more.</p>
        </div>
      </div>
    </footer>
  );
}