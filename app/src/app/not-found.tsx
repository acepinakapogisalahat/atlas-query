// app/src/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <p className="text-6xl font-semibold tracking-tight text-slate-900">404</p>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">This place isn't on the map</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Back to Discover
          </Link>
          <Link
            href="/search"
            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:border-slate-400 transition"
          >
            Search places
          </Link>
        </div>
      </div>
    </main>
  );
}