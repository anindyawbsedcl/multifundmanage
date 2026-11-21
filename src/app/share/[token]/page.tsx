'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import {
  Wallet, TrendingUp, TrendingDown, IndianRupee, Users,
  Gift, Receipt, Shield, Loader2, Calendar
} from 'lucide-react';
import type { Fund, Donation, Expense, Person } from '@/lib/types';

function ShareFundViewerContent() {
  const params = useParams();
  const token = params?.token as string;

  const [fund, setFund] = useState<Fund | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'donations' | 'expenses'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (!token) return;
    loadSharedFund();
  }, [token]);

  async function loadSharedFund() {
    setLoading(true);
    // 1. Validate share token
    const { data: shareLink, error: sErr } = await supabase
      .from('share_links')
      .select('*')
      .eq('token', token)
      .single();

    if (sErr || !shareLink) {
      setError('This share link is invalid or has been revoked.');
      setLoading(false);
      return;
    }

    const fundId = shareLink.fund_id;

    // 2. Load Fund, Donations, Expenses
    const [fRes, dRes, eRes] = await Promise.all([
      supabase.from('funds').select('*').eq('id', fundId).single(),
      supabase.from('donations').select('*').eq('fund_id', fundId).order('date', { ascending: false }),
      supabase.from('expenses').select('*').eq('fund_id', fundId).order('date', { ascending: false }),
    ]);

    setFund(fRes.data);
    setDonations(dRes.data || []);
    setExpenses(eRes.data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !fund) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <Shield className="h-12 w-12 text-destructive mb-3" />
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error || 'Fund not found.'}</p>
      </div>
    );
  }

  const totalDonations = donations.reduce((s, d) => s + (d.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalDonations - totalExpenses;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground">{fund.name}</h1>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Viewer Mode
                </span>
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {fund.event_type} {fund.start_date ? `· ${formatDate(fund.start_date)}` : ''}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Read-only Nav Tabs */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="flex gap-2">
            {[
              { id: 'overview' as const, label: 'Overview' },
              { id: 'donations' as const, label: `Donations (${donations.length})` },
              { id: 'expenses' as const, label: `Expenses (${expenses.length})` },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`border-b-2 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase font-semibold">
              <span>Total Collections</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalDonations)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{donations.length} total entries</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase font-semibold">
              <span>Total Outflow</span>
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalExpenses)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{expenses.length} payments recorded</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase font-semibold">
              <span>Net In Hand</span>
              <IndianRupee className="h-4 w-4 text-indigo-500" />
            </div>
            <p className={`mt-2 text-2xl font-bold ${balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
              {formatCurrency(balance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{balance >= 0 ? 'Positive Surplus' : 'Deficit'}</p>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {fund.description && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">About this Event</h3>
                <p className="text-sm text-muted-foreground">{fund.description}</p>
              </div>
            )}

            {/* Recent Contributions */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-bold text-foreground mb-4">Latest Contributions</h3>
              <div className="divide-y divide-border">
                {donations.slice(0, 5).map((d) => (
                  <div key={d.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.donor_name}</p>
                      <p className="text-xs text-muted-foreground">{d.date ? formatDate(d.date) : ''} · {d.payment_mode}</p>
                    </div>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'donations' && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Donor Name</th>
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {donations.map((d) => (
                    <tr key={d.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 text-muted-foreground">{d.date ? formatDate(d.date) : '—'}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{d.donor_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.designation || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(d.amount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{d.payment_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Paid To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 text-muted-foreground">{e.date ? formatDate(e.date) : '—'}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{e.category_name || 'General'}</td>
                      <td className="px-4 py-3 text-foreground">{e.description}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.paid_to || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ShareFundViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ShareFundViewerContent />
    </Suspense>
  );
}
