// app/src/components/AuthShell.tsx
import Link from 'next/link';

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-400 shrink-0">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const POINTS = [
  'Hand-rated places from real travelers',
  'Picks matched to your travel style',
  'Local owners publish their own listings',
];

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 grid lg:grid-cols-2">
      {/* Brand panel */}
      <section className="hidden lg:flex flex-col justify-between bg-slate-900 text-white p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2 w-fit">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">TravelMate</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold tracking-tight leading-tight">
            Plan less.
            <br />
            Experience more.
          </h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            TravelMate brings ratings, reviews, and owner-published listings together, so your next trip starts with
            confidence.
          </p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-slate-200">
                <Check />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© 2026 TravelMate · Atlas Query Co.</p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8 w-fit">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">TravelMate</span>
          </Link>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-slate-500">{subtitle}</p>

          <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">{children}</div>

          {footer && <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>}
        </div>
      </section>
    </main>
  );
}