import { Property } from '@/types';

interface Props {
  property: Property;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(price);
}

export default function PropertyCard({ property }: Props) {
  const imgSrc = property.images?.[0] ?? 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800';

  return (
    <a
      href={`/browse/${property.id}`}
      className="group block rounded-2xl overflow-hidden bg-white shadow hover:shadow-lg transition-shadow border border-gray-100"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded-full capitalize text-gray-700">
          {property.property_type ?? 'property'}
        </span>
        {property.status !== 'active' && (
          <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full uppercase">
            {property.status}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-lg font-bold text-emerald-700">{formatPrice(property.price)}</p>
        <h3 className="font-semibold text-gray-900 mt-0.5 line-clamp-1">{property.title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{property.suburb}, {property.state} {property.postcode}</p>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10" />
            </svg>
            {property.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3M16 7V3M3 11h18M5 19h14a2 2 0 002-2v-7H3v7a2 2 0 002 2z" />
            </svg>
            {property.bathrooms} bath
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 17h-2" />
            </svg>
            {property.car_spaces} car
          </span>
          {property.land_size && (
            <span className="ml-auto text-xs text-gray-400">{property.land_size} m²</span>
          )}
        </div>

        {/* DOM pill */}
        <p className="mt-3 text-xs text-gray-400">{property.days_on_market}d on market</p>
      </div>
    </a>
  );
}
