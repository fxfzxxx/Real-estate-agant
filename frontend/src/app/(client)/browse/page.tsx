'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Property } from '@/types';
import { listProperties } from '@/lib/api';
import PropertyTile, { formatPrice } from '@/components/property/PropertyTile';

const PROPERTY_TYPES = ['house', 'apartment', 'townhouse', 'villa', 'land', 'unit'];
const PRICE_BANDS = [
  { label: 'Price: Any', min: undefined, max: undefined },
  { label: '$500k – $1M', min: 500_000, max: 1_000_000 },
  { label: '$1M – $2M', min: 1_000_000, max: 2_000_000 },
  { label: '$2M+', min: 2_000_000, max: undefined },
];

export default function BrowsePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [suburb, setSuburb] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [priceBand, setPriceBand] = useState(0);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const band = PRICE_BANDS[priceBand];
      const data = await listProperties({
        suburb: suburb || undefined,
        property_type: propertyType || undefined,
        price_min: band.min,
        price_max: band.max,
        limit: 50,
      });
      setProperties(data);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [suburb, propertyType, priceBand]);

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [featured, ...rest] = properties;

  return (
    <div className="flex-1 flex flex-col w-full max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-md gap-md">
      {/* Header & Filters */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-sm">
        <div>
          <h1 className="text-headline-lg-mobile md:text-headline-xl text-primary mb-xs">
            Discover Properties
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Curated listings across New Zealand.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchProperties();
          }}
          className="flex flex-wrap gap-sm"
        >
          <input
            type="text"
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            placeholder="Suburb or region"
            className="bg-surface border border-outline-variant rounded-lg px-4 py-2 text-label-md text-on-surface focus:border-primary focus:ring-0 w-40"
          />
          <select
            value={priceBand}
            onChange={(e) => setPriceBand(Number(e.target.value))}
            className="bg-surface border border-outline-variant rounded-lg px-4 py-2 text-label-md text-on-surface focus:border-primary focus:ring-0"
          >
            {PRICE_BANDS.map((band, i) => (
              <option key={band.label} value={i}>{band.label}</option>
            ))}
          </select>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="bg-surface border border-outline-variant rounded-lg px-4 py-2 text-label-md text-on-surface focus:border-primary focus:ring-0"
          >
            <option value="">Property Type</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-primary text-on-primary px-6 py-2 rounded-lg text-label-md hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </form>
      </header>

      {/* Swap-mode banner */}
      <Link
        href="/discover"
        className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-xl px-md py-sm hover:bg-surface-container-high transition-colors"
      >
        <span className="text-label-md text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">swipe</span>
          Not sure what you want? Try Discovery Swipe — like or pass and we learn your taste.
        </span>
        <span className="material-symbols-outlined text-primary">arrow_forward</span>
      </Link>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-md">
          <div className="col-span-1 md:col-span-8 h-[400px] rounded-xl bg-surface-container animate-pulse" />
          <div className="col-span-1 md:col-span-4 h-[400px] rounded-xl bg-surface-container animate-pulse" />
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-xl">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-sm">home_work</span>
          <p className="text-body-lg font-semibold text-on-surface">No properties found</p>
          <p className="text-label-md text-on-surface-variant mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-md">
          {/* Featured property */}
          {featured && (
            <Link
              href={`/browse/${featured.id}`}
              className="col-span-1 md:col-span-8 relative rounded-xl overflow-hidden group border border-surface-variant shadow-sm hover:shadow-md transition-shadow min-h-[400px]"
            >
              <div className="absolute inset-0 bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src={featured.images?.[0] ?? 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200'}
                  alt={featured.title}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4 flex gap-2 z-10">
                <span className="bg-primary text-on-primary px-3 py-1 rounded-full text-label-sm uppercase tracking-wider">
                  Featured
                </span>
              </div>
              <div className="absolute bottom-0 left-0 w-full p-md text-white flex flex-col gap-sm">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-headline-lg mb-xs text-white">{featured.title}</h2>
                    <p className="text-body-md text-white/80 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      {featured.address}
                    </p>
                  </div>
                  <p className="text-headline-md font-bold text-white">{formatPrice(featured.price)}</p>
                </div>
                <div className="flex gap-md text-label-md text-white/80 border-t border-white/20 pt-sm mt-sm">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined">bed</span> {featured.bedrooms} Beds
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined">bathtub</span> {featured.bathrooms} Baths
                  </span>
                  {featured.land_size ? (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined">square_foot</span> {featured.land_size} m²
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          )}
          {/* Standard cards */}
          {rest.map((p) => (
            <div key={p.id} className="col-span-1 md:col-span-4 flex">
              <div className="flex-1 flex flex-col">
                <PropertyTile property={p} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
