import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Link from "next/link";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "PropAI – AI-Driven Real Estate Platform",
  description:
    "Discover your perfect home with conversational AI, get instant answers about any listing, and let intelligent tools guide your property journey.",
};

const navLinks = [
  { href: "/listings", label: "Listings" },
  { href: "/guidance", label: "AI Guide" },
  { href: "/market", label: "Market Insights" },
  { href: "/financial", label: "Financial Planning" },
  { href: "/crm", label: "Agent CRM" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased bg-gray-50 min-h-screen`}>
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 font-bold text-emerald-700 text-lg">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10" />
              </svg>
              PropAI
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-gray-600 hover:text-emerald-700 font-medium transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Page content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="mt-20 border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">© 2025 PropAI. AI-driven real estate discovery & CRM platform.</p>
            <div className="flex gap-6">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="text-sm text-gray-400 hover:text-emerald-600 transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
