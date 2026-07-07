'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Property } from '@/types';
import { getRecommendations, getLikedProperties, recordSwipe } from '@/lib/api';
import { getSessionId } from '@/lib/session';
import PropertyTile, { formatPrice } from '@/components/property/PropertyTile';

const SWIPE_THRESHOLD = 100; // px of horizontal drag that counts as a decision

export default function DiscoverPage() {
  const [deck, setDeck] = useState<Property[]>([]);
  const [liked, setLiked] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const sessionId = useRef('');

  // Drag state for the top card
  const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false });
  const dragStart = useRef({ x: 0, y: 0 });
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null);

  const loadDeck = useCallback(async () => {
    setLoading(true);
    try {
      const [cards, likedProps] = await Promise.all([
        getRecommendations(sessionId.current, 10),
        getLikedProperties(sessionId.current),
      ]);
      setDeck(cards);
      setLiked(likedProps);
      setExhausted(cards.length === 0);
    } catch {
      setDeck([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    sessionId.current = getSessionId();
    loadDeck();
  }, [loadDeck]);

  const topCard = deck[0];

  async function decide(likedIt: boolean) {
    if (!topCard || leaving) return;
    setLeaving(likedIt ? 'right' : 'left');
    recordSwipe({
      property_id: topCard.id,
      session_id: sessionId.current,
      liked: likedIt,
    }).catch(() => {});

    // Let the exit animation play before advancing the deck
    setTimeout(() => {
      setDeck((prev) => {
        const next = prev.slice(1);
        if (next.length === 0) setExhausted(true);
        return next;
      });
      if (likedIt) setLiked((prev) => [...prev, topCard]);
      setLeaving(null);
      setDrag({ x: 0, y: 0, dragging: false });
    }, 250);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (leaving) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, dragging: true });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.dragging || leaving) return;
    setDrag({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
      dragging: true,
    });
  }

  function onPointerUp() {
    if (!drag.dragging || leaving) return;
    if (drag.x > SWIPE_THRESHOLD) {
      decide(true);
    } else if (drag.x < -SWIPE_THRESHOLD) {
      decide(false);
    } else {
      setDrag({ x: 0, y: 0, dragging: false });
    }
  }

  const rotation = drag.x / 20;
  const exitX = leaving === 'right' ? 500 : leaving === 'left' ? -500 : drag.x;

  return (
    <div className="flex-1 flex flex-col w-full max-w-[1100px] mx-auto px-margin-mobile md:px-margin-desktop py-md gap-md">
      <header className="flex items-end justify-between gap-md">
        <div>
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-primary mb-xs">Discovery Swipe</h1>
          <p className="text-body-md text-on-surface-variant">
            Swipe right to like, left to pass — I&apos;ll learn what you love.
          </p>
        </div>
        <Link
          href="/browse"
          className="shrink-0 text-label-md text-primary border border-primary rounded-full px-4 py-2 hover:bg-surface-container-high transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">explore</span>
          <span className="hidden sm:inline">Browse mode</span>
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md items-start">
        {/* Card stack */}
        <div className="lg:col-span-2 flex flex-col items-center gap-md">
          <div className="relative w-full max-w-md h-[480px] select-none">
            {loading ? (
              <div className="absolute inset-0 rounded-xl bg-surface-container animate-pulse" />
            ) : exhausted && deck.length === 0 ? (
              <div className="absolute inset-0 rounded-xl border border-outline-variant bg-surface-container-low flex flex-col items-center justify-center gap-sm p-md text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant">done_all</span>
                <p className="text-body-lg font-semibold text-on-surface">You&apos;ve seen everything!</p>
                <p className="text-label-md text-on-surface-variant">
                  Check back soon for new listings, or browse the full catalogue.
                </p>
                <Link
                  href="/browse"
                  className="mt-sm bg-primary text-on-primary px-6 py-2 rounded-full text-label-md hover:opacity-90 transition-opacity"
                >
                  Browse all properties
                </Link>
              </div>
            ) : (
              deck.slice(0, 3).map((prop, i) => {
                const isTop = i === 0;
                return (
                  <div
                    key={prop.id}
                    className="absolute inset-0 rounded-xl overflow-hidden border border-outline-variant bg-surface shadow-md touch-none"
                    style={{
                      zIndex: 10 - i,
                      transform: isTop
                        ? `translate(${exitX}px, ${drag.y / 4}px) rotate(${rotation}deg)`
                        : `translateY(${i * 10}px) scale(${1 - i * 0.04})`,
                      transition: drag.dragging && isTop ? 'none' : 'transform 0.25s ease',
                      opacity: leaving && isTop ? 0 : 1,
                      cursor: isTop ? 'grab' : 'default',
                    }}
                    onPointerDown={isTop ? onPointerDown : undefined}
                    onPointerMove={isTop ? onPointerMove : undefined}
                    onPointerUp={isTop ? onPointerUp : undefined}
                    onPointerCancel={isTop ? onPointerUp : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prop.images?.[0] ?? 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'}
                      alt={prop.title}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    {/* Like / pass stamps while dragging */}
                    {isTop && drag.x > 40 && (
                      <span className="absolute top-6 left-6 border-4 border-green-400 text-green-400 font-bold text-2xl px-3 py-1 rounded-lg rotate-[-12deg]">
                        LIKE
                      </span>
                    )}
                    {isTop && drag.x < -40 && (
                      <span className="absolute top-6 right-6 border-4 border-red-400 text-red-400 font-bold text-2xl px-3 py-1 rounded-lg rotate-[12deg]">
                        PASS
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 w-full p-md text-white pointer-events-none">
                      <p className="text-headline-md font-bold">{formatPrice(prop.price)}</p>
                      <h2 className="text-body-lg font-semibold">{prop.title}</h2>
                      <p className="text-label-md text-white/80 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {prop.address}
                      </p>
                      <div className="flex gap-md text-label-md text-white/80 mt-sm">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">bed</span> {prop.bedrooms}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">bathtub</span> {prop.bathrooms}
                        </span>
                        <span className="capitalize">{prop.property_type}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop / accessibility buttons */}
          {topCard && !exhausted && (
            <div className="flex items-center gap-lg">
              <button
                onClick={() => decide(false)}
                className="w-16 h-16 rounded-full bg-surface border-2 border-error text-error flex items-center justify-center shadow-sm hover:bg-error-container transition-colors"
                aria-label="Pass"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
              <Link
                href={`/browse/${topCard.id}`}
                className="w-12 h-12 rounded-full bg-surface border border-outline-variant text-on-surface-variant flex items-center justify-center shadow-sm hover:bg-surface-container-high transition-colors"
                aria-label="View details"
              >
                <span className="material-symbols-outlined">info</span>
              </Link>
              <button
                onClick={() => decide(true)}
                className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
                aria-label="Like"
              >
                <span className="material-symbols-outlined text-3xl">favorite</span>
              </button>
            </div>
          )}
        </div>

        {/* Liked shortlist */}
        <aside className="space-y-sm">
          <h2 className="text-label-md uppercase tracking-wide text-on-surface-variant">
            Your shortlist ({liked.length})
          </h2>
          {liked.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md text-center text-label-md text-on-surface-variant">
              Properties you like will appear here. Leave your details in the{' '}
              <Link href="/" className="text-primary underline">chat</Link> or{' '}
              <Link href="/contact" className="text-primary underline">contact page</Link>{' '}
              and our agent will follow up on your favourites.
            </div>
          ) : (
            <div className="space-y-sm max-h-[560px] overflow-y-auto pr-1">
              {liked.map((p) => (
                <PropertyTile key={p.id} property={p} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
