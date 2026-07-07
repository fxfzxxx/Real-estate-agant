'use client';

import { useState, useEffect } from 'react';
import { PropertyPopularity } from '@/types';
import { getPropertyPopularity } from '@/lib/api';

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminPropertiesPage() {
  const [rows, setRows] = useState<PropertyPopularity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPropertyPopularity()
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxScore = Math.max(1, ...rows.map((r) => r.popularity_score));

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Property Popularity</h1>
        <p className="text-gray-500 text-sm mt-1">
          How each listing performs across swipes, enquiries and AI chat.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Property</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">👍 Likes</th>
                <th className="text-center px-4 py-3">👎 Passes</th>
                <th className="text-center px-4 py-3">Enquiries</th>
                <th className="text-center px-4 py-3">Chats</th>
                <th className="text-left px-4 py-3">Popularity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.property.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{r.property.title}</p>
                    <p className="text-xs text-gray-400">
                      {r.property.suburb} · {fmt(r.property.price)} · {r.property.days_on_market}d on market
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                        r.property.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {r.property.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-700">{r.likes}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{r.dislikes}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-700">{r.enquiries}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{r.chat_messages}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(0, (r.popularity_score / maxScore) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-600">{r.popularity_score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="p-10 text-center text-sm text-gray-400">No properties yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
