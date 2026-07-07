import type { Metadata } from 'next';
import AdminNav from '@/components/layout/AdminNav';

export const metadata: Metadata = {
  title: 'NZ Realty CRM – Agent Portal',
  description: 'AI-powered agent dashboard: recommended actions, leads, deals and property analytics.',
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-900">
      <AdminNav />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
