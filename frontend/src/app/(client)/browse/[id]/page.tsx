'use client';

import { useState, useEffect } from 'react';
import { Property, MarketSnapshot } from '@/types';
import { getProperty, submitEnquiry, getComparableListings, getSuburbSnapshot } from '@/lib/api';
import ChatWidget from '@/components/chat/ChatWidget';
import PropertyCard from '@/components/property/PropertyCard';

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(n);
}

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  // Next 14 passes route params as a plain object (Promise-based params are Next 15+)
  const propertyId = Number(params.id);

  const [property, setProperty] = useState<Property | null>(null);
  const [comparables, setComparables] = useState<Property[]>([]);
  const [marketData, setMarketData] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'market'>('details');

  const [enquiry, setEnquiry] = useState({ name: '', email: '', phone: '', message: '' });
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquiryDone, setEnquiryDone] = useState(false);

  // Stable session id per page view
  const [sessionId] = useState(() => `session-${propertyId}-${Date.now()}`);

  useEffect(() => {
    async function load() {
      try {
        const [prop, comps] = await Promise.all([
          getProperty(propertyId),
          getComparableListings(propertyId),
        ]);
        setProperty(prop);
        setComparables(comps);
        try {
          const market = await getSuburbSnapshot(prop.suburb);
          setMarketData(market);
        } catch {
          // market data optional
        }
      } catch {
        // property not found
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyId]);

  async function handleEnquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!property) return;
    setEnquiryLoading(true);
    try {
      await submitEnquiry(propertyId, enquiry);
      setEnquiryDone(true);
    } catch {
      // ignore
    } finally {
      setEnquiryLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-80 rounded-2xl bg-gray-200" />
        <div className="h-8 w-1/2 rounded bg-gray-200" />
        <div className="h-4 w-1/3 rounded bg-gray-200" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">😕</p>
        <p className="text-xl font-semibold text-gray-700">Property not found</p>
        <a href="/browse" className="mt-4 inline-block text-emerald-600 hover:underline text-sm">
          ← Back to browse
        </a>
      </div>
    );
  }

  const mainImg = property.images?.[0] ?? 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-2">
        <a href="/browse" className="hover:text-emerald-600">Browse</a>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-xs">{property.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image gallery */}
          <div className="rounded-2xl overflow-hidden bg-gray-100 h-80 sm:h-96">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mainImg} alt={property.title} className="w-full h-full object-cover" />
          </div>
          {property.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {property.images.slice(1).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img}
                  alt=""
                  className="h-20 w-32 object-cover rounded-xl flex-shrink-0"
                />
              ))}
            </div>
          )}

          {/* Title & price */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-emerald-700">{fmt(property.price)}</p>
                <h1 className="text-xl font-bold text-gray-900 mt-1">{property.title}</h1>
                <p className="text-gray-500 text-sm mt-0.5">{property.address}</p>
              </div>
              <span className="flex-shrink-0 bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
                {property.property_type ?? 'property'}
              </span>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex gap-6 text-sm text-gray-600 bg-gray-50 rounded-xl p-4">
            {[
              { icon: '🛏', label: `${property.bedrooms} Bedrooms` },
              { icon: '🛁', label: `${property.bathrooms} Bathrooms` },
              { icon: '🚗', label: `${property.car_spaces} Car spaces` },
              ...(property.land_size ? [{ icon: '📐', label: `${property.land_size} m²` }] : []),
              { icon: '📅', label: `${property.days_on_market}d on market` },
            ].map((s) => (
              <span key={s.label} className="flex items-center gap-1.5">
                {s.icon} {s.label}
              </span>
            ))}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-100 flex gap-1">
            {(['details', 'chat', 'market'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-emerald-500 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'chat' ? '💬 AI Chat' : tab === 'market' ? '📊 Market' : '🏡 Details'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {property.description && (
                <p className="text-gray-600 leading-relaxed">{property.description}</p>
              )}
              {property.features.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.features.map((f) => (
                      <span key={f} className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {property.agent && (
                <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                  {property.agent.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={property.agent.avatar_url} alt={property.agent.name} className="w-12 h-12 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">{property.agent.name}</p>
                    <p className="text-sm text-gray-500">{property.agent.agency}</p>
                    {property.agent.phone && (
                      <a href={`tel:${property.agent.phone}`} className="text-sm text-emerald-600 hover:underline">{property.agent.phone}</a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <ChatWidget propertyId={propertyId} sessionId={sessionId} />
          )}

          {activeTab === 'market' && (
            <div className="space-y-4">
              {marketData ? (
                <>
                  <h3 className="font-semibold text-gray-800">{marketData.suburb} Market Snapshot</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Median Price', value: fmt(marketData.median_price ?? 0) },
                      { label: 'Avg Days on Market', value: `${marketData.avg_days_on_market ?? 0} days` },
                      { label: 'Quarterly Growth', value: `${marketData.quarterly_growth_pct ?? 0}%` },
                      { label: 'Annual Growth', value: `${marketData.annual_growth_pct ?? 0}%` },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">{m.label}</p>
                        <p className="text-lg font-bold text-gray-800 mt-1">{m.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-sm">No market data available for this suburb.</p>
              )}

              {comparables.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mt-6 mb-4">Comparable Listings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {comparables.map((c) => <PropertyCard key={c.id} property={c} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enquiry form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4">Enquire About This Property</h3>
            {enquiryDone ? (
              <div className="text-center py-6">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-semibold text-gray-700">Enquiry sent!</p>
                <p className="text-sm text-gray-400 mt-1">The agent will be in touch shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleEnquiry} className="space-y-3">
                {[
                  { label: 'Name', field: 'name', type: 'text', placeholder: 'Jane Smith', required: true },
                  { label: 'Email', field: 'email', type: 'email', placeholder: 'jane@email.com', required: true },
                  { label: 'Phone', field: 'phone', type: 'tel', placeholder: '0400 000 000', required: false },
                ].map((f) => (
                  <div key={f.field}>
                    <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      required={f.required}
                      placeholder={f.placeholder}
                      value={(enquiry as Record<string, string>)[f.field]}
                      onChange={(e) => setEnquiry((prev) => ({ ...prev, [f.field]: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Message</label>
                  <textarea
                    rows={3}
                    placeholder="I'm interested in arranging an inspection…"
                    value={enquiry.message}
                    onChange={(e) => setEnquiry((prev) => ({ ...prev, message: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={enquiryLoading}
                  className="w-full bg-emerald-600 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {enquiryLoading ? 'Sending…' : 'Send Enquiry'}
                </button>
              </form>
            )}
          </div>

          {/* AI chat nudge */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
            <p className="text-2xl mb-2">💬</p>
            <p className="font-semibold text-emerald-800 text-sm">Have questions?</p>
            <p className="text-xs text-emerald-600 mt-1 mb-3">
              Ask our AI assistant anything about this property — instantly, 24/7.
            </p>
            <button
              onClick={() => setActiveTab('chat')}
              className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Open AI Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
