'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AgentAction, ActionSummary, AdminSummary } from '@/types';
import {
  getAdminSummary,
  getActionsSummary,
  generateActions,
  listActions,
  updateAction,
} from '@/lib/api';

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  follow_up: { label: 'Follow up', icon: 'call', color: 'bg-red-50 text-red-700 border-red-200' },
  chase_deal: { label: 'Chase deal', icon: 'handshake', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  advertise: { label: 'Advertise', icon: 'campaign', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  outreach: { label: 'Outreach', icon: 'outgoing_mail', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const STATUS_TABS = ['pending', 'deferred', 'done', 'dismissed'] as const;

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [actionSummary, setActionSummary] = useState<ActionSummary | null>(null);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('pending');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const refresh = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const [s, as, acts] = await Promise.all([
        getAdminSummary(),
        getActionsSummary(),
        listActions(status),
      ]);
      setSummary(s);
      setActionSummary(as);
      setActions(acts);
    } catch {
      // backend unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(tab);
  }, [tab, refresh]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await generateActions();
      await refresh(tab);
    } finally {
      setGenerating(false);
    }
  }

  async function setStatus(action: AgentAction, status: string) {
    const updated = await updateAction(action.id, status);
    setActions((prev) => prev.filter((a) => a.id !== action.id));
    setActionSummary((prev) => {
      if (!prev) return prev;
      const next = { ...prev } as Record<string, number>;
      next[action.status] = Math.max(0, next[action.status] - 1);
      next[updated.status] += 1;
      return next as unknown as ActionSummary;
    });
  }

  const stats = summary
    ? [
        { label: 'Hot leads', value: summary.hot_leads_count, icon: 'local_fire_department', href: '/admin/leads' },
        { label: 'Enquiries', value: summary.enquiries_count, icon: 'contact_mail', href: '/admin/inbox' },
        { label: 'Messages', value: summary.contact_messages_count, icon: 'chat', href: '/admin/inbox' },
        { label: 'Chat sessions', value: summary.chat_sessions_count, icon: 'forum', href: '/admin/inbox' },
        { label: 'Likes', value: summary.likes_count, icon: 'favorite', href: '/admin/properties' },
      ]
    : [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Recommended actions generated from client-site activity — you decide what happens.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          {generating ? 'Analysing…' : 'Generate recommendations'}
        </button>
      </header>

      {/* Activity stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <span className="material-symbols-outlined text-primary/60">{s.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Actions list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setTab(s)}
                className={`text-xs font-semibold px-4 py-2 rounded-full capitalize transition-colors ${
                  tab === s ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {s} {actionSummary ? `(${actionSummary[s]})` : ''}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : actions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2">task_alt</span>
              <p className="text-sm">
                No {tab} actions.{' '}
                {tab === 'pending' && 'Hit "Generate recommendations" to analyse recent activity.'}
              </p>
            </div>
          ) : (
            actions.map((action) => {
              const meta = CATEGORY_META[action.category] ?? CATEGORY_META.follow_up;
              return (
                <div
                  key={action.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[11px] font-bold uppercase tracking-wide border px-2 py-0.5 rounded-full flex items-center gap-1 ${meta.color}`}>
                        <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                        {meta.label}
                      </span>
                      {action.priority === 'high' && (
                        <span className="text-[11px] font-bold uppercase tracking-wide bg-red-600 text-white px-2 py-0.5 rounded-full">
                          High priority
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">{action.title}</p>
                    {action.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{action.description}</p>
                    )}
                  </div>
                  {(tab === 'pending' || tab === 'deferred') && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setStatus(action, 'done')}
                        className="text-xs font-semibold bg-primary text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                      >
                        Do ✓
                      </button>
                      {tab === 'pending' && (
                        <button
                          onClick={() => setStatus(action, 'deferred')}
                          className="text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl hover:bg-amber-100 transition-colors"
                        >
                          Defer
                        </button>
                      )}
                      <button
                        onClick={() => setStatus(action, 'dismissed')}
                        className="text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                  {(tab === 'done' || tab === 'dismissed') && (
                    <button
                      onClick={() => setStatus(action, 'pending')}
                      className="text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action summary + recent comms */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Action summary</h2>
            {actionSummary && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'To do', value: actionSummary.pending, color: 'text-primary' },
                  { label: 'Done', value: actionSummary.done, color: 'text-emerald-600' },
                  { label: 'Deferred', value: actionSummary.deferred, color: 'text-amber-600' },
                  { label: 'Skipped', value: actionSummary.dismissed, color: 'text-gray-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700">Latest from clients</h2>
              <Link href="/admin/inbox" className="text-xs text-primary font-semibold hover:underline">
                Open inbox →
              </Link>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {summary?.recent_communications.slice(0, 6).map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-semibold text-gray-700">
                    {c.name ?? 'Anonymous'}{' '}
                    <span className="font-normal text-gray-400 capitalize">
                      · {c.kind.replace('_', ' ')}
                    </span>
                  </p>
                  {c.summary && <p className="text-xs text-gray-500 truncate">{c.summary}</p>}
                </div>
              ))}
              {summary?.recent_communications.length === 0 && (
                <p className="text-xs text-gray-400">No client activity yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
