'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DealStage } from '@/types';
import { getDeals } from '@/lib/api';

const STAGE_META: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'border-sky-300' },
  contacted: { label: 'Contacted', color: 'border-amber-300' },
  viewing: { label: 'Viewing', color: 'border-violet-300' },
  offer: { label: 'Offer', color: 'border-orange-400' },
  closed: { label: 'Closed', color: 'border-emerald-400' },
};

const TEMP_DOT: Record<string, string> = {
  hot: 'bg-red-500',
  warm: 'bg-amber-400',
  cold: 'bg-sky-400',
};

export default function DealsPage() {
  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeals()
      .then(setStages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals in Progress</h1>
          <p className="text-gray-500 text-sm mt-1">
            Every lead by pipeline stage — click through to manage in the Leads view.
          </p>
        </div>
        <Link href="/admin/leads" className="text-sm font-semibold text-primary hover:underline">
          Manage leads →
        </Link>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {stages.map((stage) => {
            const meta = STAGE_META[stage.stage] ?? { label: stage.stage, color: 'border-gray-200' };
            return (
              <div key={stage.stage} className={`bg-white rounded-2xl border-t-4 ${meta.color} border border-gray-100 shadow-sm`}>
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-700">{meta.label}</p>
                  <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {stage.leads.length}
                  </span>
                </div>
                <div className="p-3 space-y-2 min-h-[80px]">
                  {stage.leads.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-4">Empty</p>
                  ) : (
                    stage.leads.map((lead) => (
                      <Link
                        key={lead.id}
                        href="/admin/leads"
                        className="block bg-gray-50 hover:bg-gray-100 rounded-xl p-3 transition-colors"
                      >
                        <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${TEMP_DOT[lead.temperature]}`} />
                          {lead.buyer?.name ?? `Buyer #${lead.buyer_id}`}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Score {lead.score} · {lead.source?.replace('_', ' ') ?? 'unknown source'}
                        </p>
                        {lead.next_action && (
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">→ {lead.next_action}</p>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
