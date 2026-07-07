'use client';

import { useState, useEffect } from 'react';
import { AdminSummary, CommunicationItem } from '@/types';
import { getAdminSummary } from '@/lib/api';

const KIND_META: Record<string, { icon: string; label: string; color: string }> = {
  enquiry: { icon: 'contact_mail', label: 'Property enquiry', color: 'bg-emerald-50 text-emerald-700' },
  contact_message: { icon: 'chat', label: 'Contact message', color: 'bg-sky-50 text-sky-700' },
  chat_session: { icon: 'forum', label: 'AI chat', color: 'bg-amber-50 text-amber-700' },
};

export default function InboxPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminSummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const items: CommunicationItem[] = (summary?.recent_communications ?? []).filter(
    (c) => !filter || c.kind === filter
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Communications Inbox</h1>
        <p className="text-gray-500 text-sm mt-1">
          Everything clients left on the site — enquiries, contact messages and chat activity.
        </p>
      </header>

      {/* Channel summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summary &&
          [
            { label: 'Property enquiries', value: summary.enquiries_count, icon: 'contact_mail' },
            { label: 'Contact messages', value: summary.contact_messages_count, icon: 'chat' },
            { label: 'AI chat sessions', value: summary.chat_sessions_count, icon: 'forum' },
            { label: 'Swipe reactions', value: summary.likes_count + summary.dislikes_count, icon: 'swipe' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <span className="material-symbols-outlined text-primary/60">{s.icon}</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '', label: 'All' },
          { value: 'enquiry', label: 'Enquiries' },
          { value: 'contact_message', label: 'Messages' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
              filter === f.value
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
          <p className="text-sm">No communications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c, i) => {
            const meta = KIND_META[c.kind] ?? KIND_META.contact_message;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">
                      {c.name ?? 'Anonymous'}
                      <span className="text-xs font-normal text-gray-400 ml-2">{meta.label}</span>
                      {c.property_title && (
                        <span className="text-xs font-normal text-gray-400 ml-1">· {c.property_title}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[c.email, c.phone].filter(Boolean).join(' · ')}
                  </p>
                  {c.summary && <p className="text-sm text-gray-600 mt-1.5">{c.summary}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
