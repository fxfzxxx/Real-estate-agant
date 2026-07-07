import { TopNavBar, BottomNavBar } from '@/components/layout/ClientNav';

export default function ClientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <TopNavBar />
      <main className="flex-1 flex flex-col pb-20 md:pb-0">{children}</main>
      <BottomNavBar />
    </div>
  );
}
