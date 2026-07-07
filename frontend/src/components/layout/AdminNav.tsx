'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'space_dashboard' },
  { href: '/admin/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/admin/properties', label: 'Properties', icon: 'apartment' },
  { href: '/admin/deals', label: 'Deals', icon: 'handshake' },
  { href: '/admin/leads', label: 'Leads', icon: 'group' },
  { href: '/admin/market', label: 'Market', icon: 'monitoring' },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-primary text-white min-h-screen sticky top-0 max-h-screen">
        <div className="px-5 py-6 border-b border-white/10">
          <p className="text-xl font-bold">NZ Realty CRM</p>
          <p className="text-xs text-white/60 mt-1">Agent portal</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-6">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">storefront</span>
            View client site
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <nav className="md:hidden sticky top-0 z-50 bg-primary text-white">
        <div className="flex items-center justify-between px-4 h-14">
          <p className="font-bold">NZ Realty CRM</p>
          <Link href="/" className="text-xs text-white/70 underline">
            Client site
          </Link>
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  active ? 'bg-white text-primary' : 'text-white/70'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
