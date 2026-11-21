'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { cn } from '@/lib/utils';
import type { Fund } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  Gift,
  Receipt,
  FileBarChart,
  Settings,
  ArrowLeft,
  Wallet,
  Share2,
  Loader2,
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'people', label: 'People', icon: Users },
  { id: 'donations', label: 'Donations', icon: Gift },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function FundLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const fundId = params?.fundId as string;
  const [fund, setFund] = useState<Fund | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const activeTab = pathname.split('/').pop() || 'dashboard';

  useEffect(() => {
    async function loadFund() {
      if (!fundId) return;
      const { data } = await supabase
        .from('funds')
        .select('*')
        .eq('id', fundId)
        .single();

      setFund(data);
      setLoading(false);
    }
    loadFund();
  }, [fundId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">Fund not found</p>
        <Link
          href="/home"
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">
                  {fund.name}
                </h1>
                <p className="text-xs text-muted-foreground capitalize">
                  {fund.event_type}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto pb-px scrollbar-none">
            {TABS.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                href={`/fund/${fundId}/${id}`}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

export default function FundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <FundLayoutContent>{children}</FundLayoutContent>
    </Suspense>
  );
}
