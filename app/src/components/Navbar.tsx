'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRole } from '@/utils/supabase/role';
import { useSuperuser } from '@/utils/supabase/useSuperuser';
import NotificationBell from '@/components/NotificationBell';

function MapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-5 h-5'}>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}>
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}>
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}>
      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-4 h-4'}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-6 h-6'}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? 'w-6 h-6'}>
      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const role = useRole();
  const supabase = createClient();
  const [userName, setUserName] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Superuser detection (parallel to useRole — doesn't mutate shared hook)
const { isSuperadmin } = useSuperuser();
const isOwnerOnly = role.isOwner && !role.isAdmin; // business owner, NOT platform admin
const isManager = isOwnerOnly || role.isAdmin; // kept for backward compat in non-superuser branches
const homePath = isSuperadmin ? '/admin' : isManager ? '/business' : '/';
const homeLabel = isSuperadmin ? 'Superuser Console' : isManager ? 'Business Hub' : 'Discover';

  // Scroll effect for dynamic glassmorphism
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data: session } = await supabase.auth.getSession();
      const authId = session.session?.user?.id ?? null;
      if (!authId) {
        if (mounted) setUserName(null);
        return;
      }
      const { data: profile } = await supabase
        .from('app_users')
        .select('name')
        .eq('auth_user_id', authId)
        .maybeSingle();
      if (mounted) setUserName(profile?.name ?? null);
    }

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const authId = session?.user?.id ?? null;
      if (!authId) {
        setUserName(null);
        return;
      }
      setTimeout(async () => {
        const { data: profile } = await supabase
          .from('app_users')
          .select('name')
          .eq('auth_user_id', authId)
          .maybeSingle();
        if (mounted) setUserName(profile?.name ?? null);
      }, 0);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navCls = (path: string) => {
    const isActive = pathname === path;
    return isActive
      ? 'text-blue-600 bg-white font-semibold px-4 py-1.5 rounded-full text-sm transition-all shadow-sm ring-1 ring-slate-900/5'
      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium px-4 py-1.5 rounded-full text-sm transition-all';
  };

  const mobileNavCls = (path: string) => {
    const isActive = pathname === path;
    return isActive
      ? 'flex items-center gap-3 text-blue-600 bg-blue-50/80 font-semibold px-3 py-2.5 rounded-xl text-base transition-all ring-1 ring-blue-100'
      : 'flex items-center gap-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium px-3 py-2.5 rounded-xl text-base transition-all';
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    try {
      window.history.replaceState(null, '', '/');
      window.history.replaceState(null, '', '/login');
    } catch {}
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-lg shadow-slate-200/40' 
        : 'bg-white/60 backdrop-blur-md border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:shadow-lg group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105 group-active:scale-95">
              <MapIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Travel<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Mate</span>
            </span>
          </Link>

          {/* Desktop Navigation links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/40 p-1 rounded-full border border-slate-200/50">
  <Link href={homePath} prefetch className={navCls(homePath)}>
    {homeLabel}
  </Link>
  {/* Search + My trips hidden for superusers (they have /admin for management) */}
  {!isSuperadmin && (
    <Link href="/search" prefetch className={navCls('/search')}>
      Search
    </Link>
  )}
  {!isSuperadmin && role.authId && !isManager && (
    <Link href="/my-trips" prefetch className={navCls('/my-trips')}>
      My trips
    </Link>
  )}
  {role.isOwner && !isSuperadmin && (
  <Link href="/owner" prefetch className={navCls('/owner')}>
    My listings
  </Link>
)}
</div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {role.authId && <NotificationBell />}
            {role.loading ? (
              <div className="w-24 h-9 bg-slate-100 rounded-full animate-pulse" />
            ) : role.authId ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border transition-all duration-200 ${
                    showUserMenu 
                      ? 'bg-white border-blue-200 shadow-md shadow-blue-100/50 ring-2 ring-blue-50' 
                      : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:shadow-md shadow-sm'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
                    {userName ? userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline text-sm font-semibold text-slate-700 max-w-[100px] truncate">
                    {userName || 'User'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                <div 
                  className={`absolute right-0 mt-3 w-64 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 py-2 z-50 origin-top-right transition-all duration-200 ease-out ${
                    showUserMenu 
                      ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900 truncate">{userName || 'User'}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {role.isAdmin ? 'Administrator' : role.isOwner ? 'Business owner' : 'Traveler'}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1 transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <UserIcon />
                      </div>
                      Profile & preferences
                    </Link>
                    {role.isOwner && (
                      <Link
                        href="/owner"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1 transition-all duration-200 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <BuildingIcon />
                        </div>
                        Manage listings
                      </Link>
                    )}
                  </div>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:translate-x-1 transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors">
                        <LogoutIcon />
                      </div>
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all duration-200">
                  Sign in
                </Link>
                <Link href="/signup" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-full shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200">
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 active:scale-95"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        mobileMenuOpen ? 'max-h-[600px] opacity-100 border-t border-slate-200/60 bg-white/95 backdrop-blur-xl' : 'max-h-0 opacity-0 border-t border-transparent'
      }`}>
        <div className="px-4 py-4 space-y-1">
          <Link href={homePath} className={mobileNavCls(homePath)}>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <MapIcon className="w-4 h-4" />
            </div>
            {isSuperadmin ? 'Superuser Console' : isManager ? 'Business hub' : 'Discover'}
          </Link>
          {!isSuperadmin && (
            <Link href="/search" className={mobileNavCls('/search')}>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              Search
            </Link>
          )}
          {!isSuperadmin && role.authId && !isManager && (
            <Link href="/my-trips" className={mobileNavCls('/my-trips')}>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              My trips
            </Link>
          )}
          {role.isOwner && !isSuperadmin && (
            <Link href="/owner" className={mobileNavCls('/owner')}>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <BuildingIcon className="w-4 h-4" />
              </div>
              My listings
            </Link>
          )}
          
          {!role.authId && (
            <div className="pt-4 flex flex-col gap-2 border-t border-slate-100 mt-4">
              <Link href="/login" className="flex items-center justify-center px-4 py-3 text-base font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200">
                Sign in
              </Link>
              <Link href="/signup" className="flex items-center justify-center px-4 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}