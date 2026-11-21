'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { generateFundId } from '@/lib/id-generator';
import { motion, AnimatePresence } from 'framer-motion';
import type { FundWithStats, EventType } from '@/lib/types';
import {
  Plus,
  Trash2,
  Search,
  LogOut,
  Wallet,
  Calendar,
  Users,
  IndianRupee,
  BarChart3,
  Archive,
  RotateCcw,
  X,
  Settings,
  PartyPopper,
  Tent,
  Heart,
  Map,
  Handshake,
  Star,
  Loader2,
  LayoutGrid,
  List,
} from 'lucide-react';
import Link from 'next/link';

const EVENT_ICONS: Record<EventType, typeof PartyPopper> = {
  puja: PartyPopper,
  picnic: Tent,
  wedding: Heart,
  trip: Map,
  meeting: Handshake,
  custom: Star,
};

const EVENT_COLORS: Record<EventType, string> = {
  puja: 'from-orange-500 to-red-500',
  picnic: 'from-green-500 to-emerald-500',
  wedding: 'from-pink-500 to-rose-500',
  trip: 'from-blue-500 to-cyan-500',
  meeting: 'from-purple-500 to-violet-500',
  custom: 'from-indigo-500 to-blue-500',
};

type ViewMode = 'active' | 'trash';

export default function HomePage() {
  const [funds, setFunds] = useState<FundWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [layoutView, setLayoutView] = useState<'grid' | 'list'>('grid');
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadUser();
    loadFunds();
  }, [viewMode]);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setUser({ email: user.email || '', id: user.id });
  }

  async function loadFunds() {
    setLoading(true);
    const { data: fundsData, error } = await supabase
      .from('funds')
      .select('*')
      .eq('is_deleted', viewMode === 'trash')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading funds:', error);
      setLoading(false);
      return;
    }

    // For each fund, get stats
    const enriched: FundWithStats[] = await Promise.all(
      (fundsData || []).map(async (fund) => {
        const [donRes, expRes, pplRes] = await Promise.all([
          supabase
            .from('donations')
            .select('amount')
            .eq('fund_id', fund.id),
          supabase
            .from('expenses')
            .select('amount')
            .eq('fund_id', fund.id),
          supabase
            .from('people')
            .select('id')
            .eq('fund_id', fund.id),
        ]);

        const totalDonations = (donRes.data || []).reduce(
          (sum, d) => sum + (d.amount || 0),
          0
        );
        const totalExpenses = (expRes.data || []).reduce(
          (sum, e) => sum + (e.amount || 0),
          0
        );

        return {
          ...fund,
          total_donations: totalDonations,
          total_expenses: totalExpenses,
          total_people: pplRes.data?.length || 0,
          donation_count: donRes.data?.length || 0,
          balance: totalDonations - totalExpenses,
        } as FundWithStats;
      })
    );

    setFunds(enriched);
    setLoading(false);
  }

  async function deleteFund(fundId: string) {
    if (!confirm('Move this fund to trash? You can recover it within 30 days.'))
      return;

    await supabase
      .from('funds')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        status: 'trashed',
      })
      .eq('id', fundId);

    loadFunds();
  }

  async function restoreFund(fundId: string) {
    await supabase
      .from('funds')
      .update({
        is_deleted: false,
        deleted_at: null,
        status: 'active',
      })
      .eq('id', fundId);

    loadFunds();
  }

  async function permanentDelete(fundId: string) {
    if (
      !confirm(
        'PERMANENTLY delete this fund and ALL its data? This cannot be undone!'
      )
    )
      return;

    // Delete all related data
    await Promise.all([
      supabase.from('donations').delete().eq('fund_id', fundId),
      supabase.from('expenses').delete().eq('fund_id', fundId),
      supabase.from('people').delete().eq('fund_id', fundId),
      supabase.from('categories').delete().eq('fund_id', fundId),
    ]);
    await supabase.from('funds').delete().eq('id', fundId);
    loadFunds();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const filteredFunds = useMemo(() => {
    if (!searchQuery.trim()) return funds;
    const q = searchQuery.toLowerCase();
    return funds.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.event_type.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q)
    );
  }, [funds, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                MultiFundManage
              </h1>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/settings"
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-900/20"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl bg-secondary p-1">
              <button
                onClick={() => setViewMode('active')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  viewMode === 'active'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Wallet className="h-4 w-4" />
                Active Funds
              </button>
              <button
                onClick={() => setViewMode('trash')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  viewMode === 'trash'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Trash2 className="h-4 w-4" />
                Trash
              </button>
            </div>

            {/* Layout Toggle */}
            <div className="flex rounded-lg bg-secondary p-1">
              <button
                onClick={() => setLayoutView('grid')}
                className={cn(
                  'rounded-md p-1.5 transition-all',
                  layoutView === 'grid'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setLayoutView('list')}
                className={cn(
                  'rounded-md p-1.5 transition-all',
                  layoutView === 'list'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search funds..."
                className="w-64 rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Create New */}
            {viewMode === 'active' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
              >
                <Plus className="h-4 w-4" />
                New Fund
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredFunds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-2xl bg-secondary p-6">
              {viewMode === 'trash' ? (
                <Trash2 className="h-12 w-12 text-muted-foreground" />
              ) : (
                <Wallet className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {viewMode === 'trash'
                ? 'Trash is empty'
                : searchQuery
                ? 'No funds found'
                : 'No funds yet'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {viewMode === 'trash'
                ? 'Deleted funds will appear here for 30 days.'
                : searchQuery
                ? 'Try a different search term.'
                : 'Create your first fund to get started!'}
            </p>
            {viewMode === 'active' && !searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Create Your First Fund
              </button>
            )}
          </div>
        )}

        {/* Fund Cards Grid */}
        {!loading && filteredFunds.length > 0 && (
          <div
            className={cn(
              layoutView === 'grid'
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col gap-3'
            )}
          >
            <AnimatePresence mode="popLayout">
              {filteredFunds.map((fund, index) => {
                const Icon = EVENT_ICONS[fund.event_type] || Star;
                const color = EVENT_COLORS[fund.event_type] || EVENT_COLORS.custom;

                return (
                  <motion.div
                    key={fund.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/5',
                      layoutView === 'list' && 'flex items-center'
                    )}
                  >
                    {/* Color Strip */}
                    <div
                      className={cn(
                        `bg-gradient-to-r ${color}`,
                        layoutView === 'grid' ? 'h-1.5' : 'h-full w-1.5'
                      )}
                    />

                    <div className={cn('flex-1 p-5', layoutView === 'list' && 'flex items-center justify-between')}>
                      <div className={cn(layoutView === 'list' && 'flex items-center gap-4')}>
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                `flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground line-clamp-1">
                                {fund.name}
                              </h3>
                              <p className="text-xs text-muted-foreground capitalize">
                                {fund.event_type}
                                {fund.start_date &&
                                  ` · ${formatDate(fund.start_date)}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div
                          className={cn(
                            'grid gap-3',
                            layoutView === 'grid'
                              ? 'mt-4 grid-cols-2'
                              : 'grid-cols-4'
                          )}
                        >
                          <div className="rounded-lg bg-green-50 p-2.5 dark:bg-green-900/20">
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Collected
                            </p>
                            <p className="text-sm font-bold text-green-700 dark:text-green-300">
                              {formatCurrency(fund.total_donations)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-red-50 p-2.5 dark:bg-red-900/20">
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Spent
                            </p>
                            <p className="text-sm font-bold text-red-700 dark:text-red-300">
                              {formatCurrency(fund.total_expenses)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-indigo-50 p-2.5 dark:bg-indigo-900/20">
                            <p className="text-xs text-indigo-600 dark:text-indigo-400">
                              Balance
                            </p>
                            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                              {formatCurrency(fund.balance)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-purple-50 p-2.5 dark:bg-purple-900/20">
                            <p className="text-xs text-purple-600 dark:text-purple-400">
                              People
                            </p>
                            <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                              {fund.total_people}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        className={cn(
                          'flex items-center gap-2',
                          layoutView === 'grid'
                            ? 'mt-4 border-t border-border pt-4'
                            : 'ml-4'
                        )}
                      >
                        {viewMode === 'active' ? (
                          <>
                            <Link
                              href={`/fund/${fund.id}/dashboard`}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                              <BarChart3 className="h-4 w-4" />
                              Open
                            </Link>
                            <button
                              onClick={() => deleteFund(fund.id)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-900/20"
                              title="Move to trash"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => restoreFund(fund.id)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/90"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restore
                            </button>
                            <button
                              onClick={() => permanentDelete(fund.id)}
                              className="rounded-lg bg-destructive p-2 text-white transition-colors hover:bg-destructive/90"
                              title="Delete permanently"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Trash timer */}
                      {viewMode === 'trash' && fund.deleted_at && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Deleted {formatDate(fund.deleted_at)} ·{' '}
                          {Math.max(
                            0,
                            30 -
                              Math.floor(
                                (Date.now() -
                                  new Date(fund.deleted_at).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )
                          )}{' '}
                          days left to recover
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Create Fund Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateFundModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              loadFunds();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Create Fund Modal
// ============================================================
function CreateFundModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState<EventType>('puja');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const eventTypes: { value: EventType; label: string; icon: typeof PartyPopper }[] = [
    { value: 'puja', label: 'Puja', icon: PartyPopper },
    { value: 'picnic', label: 'Picnic', icon: Tent },
    { value: 'wedding', label: 'Wedding', icon: Heart },
    { value: 'trip', label: 'Trip', icon: Map },
    { value: 'meeting', label: 'Meeting', icon: Handshake },
    { value: 'custom', label: 'Custom', icon: Star },
  ];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const fundId = generateFundId();

    const { error } = await supabase.from('funds').insert({
      fund_id: fundId,
      owner_id: user.id,
      name,
      event_type: eventType,
      description,
      icon: eventType,
      color: EVENT_COLORS[eventType],
      start_date: startDate || null,
      end_date: endDate || null,
      status: 'active',
      is_deleted: false,
    });

    if (error) {
      console.error('Error creating fund:', error);
      alert('Failed to create fund: ' + error.message);
      setLoading(false);
      return;
    }

    // Create default categories for the fund
    const { data: newFund } = await supabase
      .from('funds')
      .select('id')
      .eq('fund_id', fundId)
      .single();

    if (newFund) {
      const defaultCategories = [
        { name: 'Food', icon: '🍽️', color: '#f97316', is_default: true },
        { name: 'Transport', icon: '🚗', color: '#3b82f6', is_default: true },
        { name: 'Decoration', icon: '🎨', color: '#8b5cf6', is_default: true },
        { name: 'Puja Items', icon: '🪔', color: '#ef4444', is_default: true },
        { name: 'Venue', icon: '🏢', color: '#06b6d4', is_default: true },
        { name: 'Sound & Light', icon: '🔊', color: '#eab308', is_default: true },
        { name: 'Printing', icon: '🖨️', color: '#84cc16', is_default: true },
        { name: 'Miscellaneous', icon: '📦', color: '#64748b', is_default: true },
      ];

      await supabase.from('categories').insert(
        defaultCategories.map((c) => ({
          ...c,
          fund_id: newFund.id,
        }))
      );
    }

    onCreated();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            Create New Fund
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          {/* Fund Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Fund Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Durga Puja 2026"
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Event Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map(({ value, label, icon: EIcon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEventType(value)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all',
                    eventType === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  <EIcon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this fund..."
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Fund
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
