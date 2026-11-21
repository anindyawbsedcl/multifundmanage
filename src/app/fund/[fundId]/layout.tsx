'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { PwaInstallButton } from '@/components/shared/pwa-install';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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
  Menu,
  X,
  Loader2,
  ChevronRight,
  Home,
  Share2,
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview, charts & stats' },
  { id: 'people', label: 'People', icon: Users, desc: 'Members & pledge tracking' },
  { id: 'donations', label: 'Donations', icon: Gift, desc: 'Contributions & collections' },
  { id: 'expenses', label: 'Expenses', icon: Receipt, desc: 'Purchases & outflows' },
  { id: 'reports', label: 'Reports', icon: FileBarChart, desc: 'Professional PDF & statements' },
  { id: 'settings', label: 'Settings', icon: Settings, desc: 'Categories, backups & share link' },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Close menu on tab change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
      <header className="sticky top-0 z-50 border-b border-border bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link
              href="/home"
              className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title="Back to All Funds"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
                  {fund.name}
                </h1>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {fund.event_type} Event
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Hamburger Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-secondary active:scale-95 shadow-sm"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-primary" />
              ) : (
                <Menu className="h-5 w-5 text-primary" />
              )}
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs (Hidden on small screens in favor of clean Hamburger) */}
        <div className="hidden lg:block border-t border-border/50">
          <div className="mx-auto max-w-7xl px-6">
            <nav className="flex gap-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <Link
                  key={id}
                  href={`/fund/${fundId}/${id}`}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === id
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Hamburger Slide-Over Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xs border-l border-border bg-card p-5 shadow-2xl flex flex-col justify-between"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground line-clamp-1">{fund.name}</h2>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Fund Navigation</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Tabs Links */}
                <div className="space-y-1">
                  {TABS.map(({ id, label, icon: Icon, desc }) => {
                    const isActive = activeTab === id;
                    return (
                      <Link
                        key={id}
                        href={`/fund/${fundId}/${id}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center justify-between rounded-xl p-3 transition-all',
                          isActive
                            ? 'bg-primary/10 text-primary font-bold shadow-sm'
                            : 'text-foreground hover:bg-secondary/70'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'rounded-lg p-2',
                              isActive
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-secondary text-muted-foreground'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-[10px] text-muted-foreground">{desc}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="border-t border-border pt-4 mt-4 space-y-3">
                {/* PWA Install Button */}
                <PwaInstallButton />

                {/* Back to All Funds */}
                <Link
                  href="/home"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/50 p-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>Switch / Back to All Funds</span>
                </Link>

                {/* Theme Toggle in Drawer */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-muted-foreground">Theme Mode</span>
                  <ThemeToggle />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Page Content */}
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6">{children}</main>
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
