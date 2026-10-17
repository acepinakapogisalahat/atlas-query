// app/src/app/admin/applications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useRole } from '@/utils/supabase/role';

type AppRow = {
  application_id: string;
  user_id: string;
  company_name: string;
  business_type: string;
  contact_email: string;
  pitch: string | null;
  status: string;
  submitted_at: string;
  reviewed_by: string | null;
};

export default function ApplicationsPage() {
  const supabase = createClient();
  const role = useRole();
  const [rows, setRows] = useState<AppRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!role.loading && role.isAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.loading, role.isAdmin]);

  async function refresh() {
    const { data } = await supabase
      .from('business_applications').select('*').order('submitted_at', { ascending: false });
    setRows((data ?? []) as AppRow[]);
  }

  async function decide(app: AppRow, approve: boolean) {
    setErr(null); setMsg(null); setBusyId(app.application_id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (approve) {
        const { data: profile } = await supabase
          .from('app_users').select('user_id, auth_user_id').eq('user_id', app.user_id).maybeSingle();
        if (!profile?.auth_user_id) throw new Error('Applicant has no auth link (app_users.auth_user_id missing).');
        const { data: ownerId, error: idErr } = await supabase.rpc('new_owner_id');
        if (idErr) throw idErr;
        const { error: ownErr } = await supabase.from('business_owners').insert({
          owner_id: ownerId as string,
          user_id: app.user_id,
          auth_user_id: profile.auth_user_id,
          company_name: app.company_name,
          business_type: app.business_type,
          approved_at: today,
          approved_by: role.adminId,
        });
        if (ownErr) throw ownErr;
      }
      const { error } = await supabase
        .from('business_applications')
        .update({ status: approve ? 'approved' : 'rejected', reviewed_by: role.adminId, reviewed_at: today })
        .eq('application_id', app.application_id);
      if (error) throw error;
      setMsg(approve
        ? `${app.application_id} approved — ${app.company_name} can now publish at /owner.`
        : `${app.application_id} rejected.`);
      await refresh();
    } catch (e2: any) {
      setErr(e2?.message ?? 'Decision failed.');
    } finally {
      setBusyId(null);
    }
  }

  if (role.loading) return <main className="p-8 text-center">Checking role…</main>;
  if (!role.isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md text-center">
          <p className="text-4xl mb-3">🛑</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access denied</h1>
          <p className="text-gray-600 text-sm">Only Super Administrators can review applications.</p>
        </div>
      </main>
    );
  }

  const pending = rows.filter((r) => r.status === 'pending');
  const decided = rows.filter((r) => r.status !== 'pending');

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Owner Applications</h1>
            <p className="text-sm text-gray-500">Process 5a – review queue · signed in as {role.adminId}</p>
          </div>
          <Link href="/admin" className="text-sm text-blue-600 underline">Back to Listing Manager</Link>
        </div>

        {msg && <p className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 text-sm mb-4">{msg}</p>}
        {err && <p className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm mb-4">{err}</p>}

        <section className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pending ({pending.length})</h2>
          {pending.length === 0 && <p className="text-sm text-gray-500">No pending applications.</p>}
          <div className="space-y-4">
            {pending.map((app) => (
              <div key={app.application_id} className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {app.company_name} <span className="text-xs font-normal text-gray-400">({app.application_id})</span>
                  </p>
                  <p className="text-sm text-gray-600">{app.business_type} · {app.contact_email} · submitted {app.submitted_at}</p>
                  {app.pitch && <p className="text-sm text-gray-500 italic mt-1">"{app.pitch}"</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => decide(app, true)} disabled={busyId === app.application_id}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                    Approve
                  </button>
                  <button onClick={() => decide(app, false)} disabled={busyId === app.application_id}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Decided ({decided.length})</h2>
          {decided.length === 0 && <p className="text-sm text-gray-500">Nothing decided yet.</p>}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reviewed by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {decided.map((app) => (
                <tr key={app.application_id}>
                  <td className="px-3 py-2 font-mono text-xs">{app.application_id}</td>
                  <td className="px-3 py-2">{app.company_name}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${app.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{app.reviewed_by ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}