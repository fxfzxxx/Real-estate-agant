'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Chat', icon: 'forum' },
  { href: '/browse', label: 'Browse', icon: 'explore' },
  { href: '/discover', label: 'Swipe', icon: 'swipe' },
  { href: '/contact', label: 'Contact', icon: 'group' },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function TopNavBar() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex justify-between items-center w-full px-margin-desktop py-base bg-surface border-b border-outline-variant sticky top-0 z-50">
      <div className="flex items-center gap-md">
        <Link href="/" className="text-headline-md font-bold text-primary">
          NZ Realty
        </Link>
        <div className="flex gap-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-label-md px-3 py-2 transition-colors ${
                isActive(pathname, item.href)
                  ? 'text-primary font-semibold border-b-2 border-primary'
                  : 'text-on-surface-variant rounded-lg hover:bg-surface-container-high'
              }`}
            >
              {item.label === 'Chat' ? 'AI Chat' : item.label === 'Swipe' ? 'Discovery Swipe' : item.label === 'Browse' ? 'Browse Properties' : item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-sm">
        <Link
          href="/admin"
          className="text-primary text-label-md border border-primary px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors"
        >
          Admin Portal
        </Link>
      </div>
    </nav>
  );
}

export function BottomNavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-safe bg-surface border-t border-outline-variant h-16 md:hidden shadow-sm">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? 'flex flex-col items-center justify-center bg-primary-container text-white rounded-xl px-3 py-1 scale-90 duration-150 transition-all'
                : 'flex flex-col items-center justify-center text-on-surface-variant px-3 py-1 hover:text-primary transition-colors'
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className={`text-label-sm mt-1 ${active ? 'font-bold' : ''}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
