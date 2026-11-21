'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Users,
  Gift,
  Receipt,
  Loader2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import type { DashboardStats } from '@/lib/types';

const CHART_COLORS = [
  '#6366f1', '#f97316', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#f43f5e',
];

export default function DashboardPage() {
  const params = useParams();
  const fundId = params.fundId as string;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, [fundId]);

  async function loadDashboardData() {
    setLoading(true);

    const [donRes, expRes, pplRes, catRes] = await Promise.all([
      supabase.from('donations').select('*').eq('fund_id', fundId),
      supabase.from('expenses').select('*').eq('fund_id', fundId),
      supabase.from('people').select('*').eq('fund_id', fundId),
      supabase.from('categories').select('*').eq('fund_id', fundId),
    ]);

    const donations = donRes.data || [];
    const expenses = expRes.data || [];
    const people = pplRes.data || [];
    const categories = catRes.data || [];

    const totalDonations = donations.reduce((s, d) => s + (d.amount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    // Category-wise expenses
    const catMap = new Map<string, { name: string; amount: number; color: string }>();
    categories.forEach((c) => {
      catMap.set(c.id, { name: c.name, amount: 0, color: c.color || '#6366f1' });
    });
    expenses.forEach((e) => {
      const cat = catMap.get(e.category_id);
      if (cat) cat.amount += e.amount || 0;
    });
    const categoryExpenses = Array.from(catMap.values()).filter((c) => c.amount > 0);

    // Payment mode stats
    const modeMap = new Map<string, number>();
    donations.forEach((d) => {
      modeMap.set(d.payment_mode, (modeMap.get(d.payment_mode) || 0) + d.amount);
    });
    const paymentModeStats = Array.from(modeMap.entries()).map(([mode, amount]) => ({
      mode,
      amount,
    }));

    // Daily trends (last 30 days)
    const dailyMap = new Map<string, { donations: number; expenses: number }>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    donations.forEach((d) => {
      const date = d.date?.split('T')[0] || '';
      if (!dailyMap.has(date)) dailyMap.set(date, { donations: 0, expenses: 0 });
      dailyMap.get(date)!.donations += d.amount || 0;
    });
    expenses.forEach((e) => {
      const date = e.date?.split('T')[0] || '';
      if (!dailyMap.has(date)) dailyMap.set(date, { donations: 0, expenses: 0 });
      dailyMap.get(date)!.expenses += e.amount || 0;
    });
    const dailyTrends = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-15);

    // Top 5 donors
    const donorMap = new Map<string, number>();
    donations.forEach((d) => {
      donorMap.set(d.donor_name, (donorMap.get(d.donor_name) || 0) + d.amount);
    });
    const topDonors = Array.from(donorMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Recent activity
    const recentActivity = [
      ...donations.map((d) => ({
        id: d.id,
        type: 'donation' as const,
        description: `${d.donor_name} donated`,
        amount: d.amount,
        date: d.created_at,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: 'expense' as const,
        description: `${e.description}`,
        amount: e.amount,
        date: e.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    setStats({
      total_donations: totalDonations,
      total_expenses: totalExpenses,
      balance: totalDonations - totalExpenses,
      total_people: people.length,
      donation_count: donations.length,
      expense_count: expenses.length,
      category_expenses: categoryExpenses,
      payment_mode_stats: paymentModeStats,
      daily_trends: dailyTrends,
      top_donors: topDonors,
      recent_activity: recentActivity,
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Collection"
          value={formatCurrency(stats.total_donations)}
          subtitle={`${stats.donation_count} donations`}
          icon={TrendingUp}
          color="green"
          delay={0}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.total_expenses)}
          subtitle={`${stats.expense_count} transactions`}
          icon={TrendingDown}
          color="red"
          delay={0.1}
        />
        <StatCard
          title="Balance"
          value={formatCurrency(stats.balance)}
          subtitle={stats.balance >= 0 ? 'Surplus' : 'Deficit'}
          icon={IndianRupee}
          color="indigo"
          delay={0.2}
        />
        <StatCard
          title="People"
          value={String(stats.total_people)}
          subtitle="Total members"
          icon={Users}
          color="purple"
          delay={0.3}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category-wise Expense (Pie Chart) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Category-wise Expenses
          </h3>
          {stats.category_expenses.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.category_expenses}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={3}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name || ''} ${(((percent ?? 0) * 100)).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {stats.category_expenses.map((entry, index) => (
                    <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value) || 0)}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--foreground)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No expenses recorded yet
            </div>
          )}
        </motion.div>

        {/* Payment Mode Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Collection by Payment Mode
          </h3>
          {stats.payment_mode_stats.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.payment_mode_stats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis type="category" dataKey="mode" width={60} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value) || 0)}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--foreground)',
                  }}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No donations recorded yet
            </div>
          )}
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Daily Trends
          </h3>
          {stats.daily_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.daily_trends}>
                <defs>
                  <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value) || 0)}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--foreground)',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="donations" stroke="#10b981" fill="url(#donGrad)" strokeWidth={2} name="Donations" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No data yet
            </div>
          )}
        </motion.div>

        {/* Top Donors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Top 5 Donors
          </h3>
          {stats.top_donors.length > 0 ? (
            <div className="space-y-3">
              {stats.top_donors.map((donor, i) => {
                const maxAmount = stats.top_donors[0]?.amount || 1;
                const pct = (donor.amount / maxAmount) * 100;
                return (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {i + 1}. {donor.name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(donor.amount)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No donors yet
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Recent Activity
        </h3>
        {stats.recent_activity.length > 0 ? (
          <div className="space-y-3">
            {stats.recent_activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-secondary/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      item.type === 'donation'
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {item.type === 'donation' ? (
                      <Gift className="h-4 w-4" />
                    ) : (
                      <Receipt className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                {item.amount && (
                  <span
                    className={`text-sm font-semibold ${
                      item.type === 'donation'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {item.type === 'donation' ? '+' : '-'}
                    {formatCurrency(item.amount)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            No activity yet. Add people, donations, or expenses to get started!
          </p>
        )}
      </motion.div>
    </div>
  );
}

// ============================================================
// Stat Card Component
// ============================================================
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  delay,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof IndianRupee;
  color: string;
  delay: number;
}) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </motion.div>
  );
}
