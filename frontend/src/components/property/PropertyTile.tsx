import Link from 'next/link';
import { Property } from '@/types';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800';

export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    maximumFractionDigits: 0,
  }).format(price);
}

/** Compact Stitch-styled property card used in chat results and grids. */
export default function PropertyTile({
  property,
  compact = false,
  likes,
}: {
  property: Property;
  compact?: boolean;
  likes?: number;
}) {
  return (
    <Link
      href={`/browse/${property.id}`}
      className={`group bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow ${
        compact ? 'w-64 shrink-0' : ''
      }`}
    >
      <div className={`relative shrink-0 bg-surface-container overflow-hidden ${compact ? 'h-36' : 'h-48'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={property.images?.[0] ?? FALLBACK_IMG}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {property.status !== 'active' && (
          <span className="absolute top-3 left-3 bg-secondary-container text-on-secondary-container px-2 py-1 rounded text-label-sm uppercase tracking-wider font-bold z-10">
            {property.status}
          </span>
        )}
        {likes !== undefined && likes > 0 && (
          <span className="absolute top-3 right-3 bg-surface/90 backdrop-blur-sm text-primary px-2 py-1 rounded-full text-label-sm font-bold z-10 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">favorite</span>
            {likes}
          </span>
        )}
      </div>
      <div className="p-sm flex flex-col flex-1 gap-1">
        <p className={`font-bold text-primary ${compact ? 'text-body-lg' : 'text-headline-md'}`}>
          {formatPrice(property.price)}
        </p>
        <h3 className="text-body-md font-semibold text-on-surface truncate">{property.title}</h3>
        <p className="text-label-md text-on-surface-variant truncate">
          {property.address}
        </p>
        <div className="mt-auto pt-sm flex gap-sm text-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">bed</span> {property.bedrooms}
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">bathtub</span> {property.bathrooms}
          </span>
          {property.land_size ? (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">square_foot</span> {property.land_size} m²
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
