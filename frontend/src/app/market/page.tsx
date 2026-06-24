'use client';

import { useState, useEffect } from 'react';
import { MarketSnapshot } from '@/types';
import { listMarketSnapshots } from '@/lib/api';

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function GrowthBadge({ value }: { value: number }) {
  const color = value >= 5 ? 'text-emerald-700 bg-emerald-50' : value >= 2 ? 'text-amber-700 bg-amber-50' : 'text-gray-600 bg-gray-100';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {value >= 0 ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

export default function MarketPage() {
  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMarketSnapshots()
      .then(setSnapshots)
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Market Insights Dashboard</h1>
        <p className="text-gray-500 mt-1">Suburb price trends, days on market, and growth rates across key areas.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-gray-100 animate-pulse h-48" />
          ))}
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-gray-500">No market data available. Run the backend seed script to populate demo data.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Suburbs Tracked', value: snapshots.length },
              {
                label: 'Avg Median Price',
                value: fmt(snapshots.reduce((a, s) => a + (s.median_price ?? 0), 0) / snapshots.length),
              },
              {
                label: 'Avg Annual Growth',
                value: `${(snapshots.reduce((a, s) => a + (s.annual_growth_pct ?? 0), 0) / snapshots.length).toFixed(1)}%`,
              },
              {
                label: 'Avg Days on Market',
                value: `${Math.round(snapshots.reduce((a, s) => a + (s.avg_days_on_market ?? 0), 0) / snapshots.length)} days`,
              },
            ].map((m) => (
              <div key={m.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{m.label}</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Suburb cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {snapshots.map((snap) => (
              <div key={snap.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{snap.suburb}</h3>
                    <p className="text-xs text-gray-400">{snap.state}</p>
                  </div>
                  <GrowthBadge value={snap.annual_growth_pct ?? 0} />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Median Price</span>
                    <span className="font-semibold text-gray-800">{snap.median_price ? fmt(snap.median_price) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Avg Days on Market</span>
                    <span className="font-semibold text-gray-800">{snap.avg_days_on_market ?? '—'} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quarterly Growth</span>
                    <span className="font-semibold text-gray-800">{snap.quarterly_growth_pct ?? 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Active Listings</span>
                    <span className="font-semibold text-gray-800">{snap.listings_count}</span>
                  </div>
                </div>

                {/* Growth bar */}
                <div className="mt-4">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min((snap.annual_growth_pct ?? 0) * 8, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Annual growth: {snap.annual_growth_pct ?? 0}%</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
