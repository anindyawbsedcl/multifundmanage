'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateExpenseId } from '@/lib/id-generator';
import { motion, AnimatePresence } from 'framer-motion';
import type { Expense, Category, PaymentMode } from '@/lib/types';
import {
  Plus, Search, Edit3, Trash2, X, Loader2, Receipt,
  Save, IndianRupee, Calendar, CreditCard, Tag, User, FileText
} from 'lucide-react';

const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank', 'Cheque', 'Other'];

export default function ExpensesPage() {
  const params = useParams();
  const fundId = params.fundId as string;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [approvedBy, setApprovedBy] = useState('');
  const [remarks, setRemarks] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [fundId]);

  async function loadData() {
    setLoading(true);
    const [expRes, catRes] = await Promise.all([
      supabase.from('expenses').select('*').eq('fund_id', fundId).order('date', { ascending: false }),
      supabase.from('categories').select('*').eq('fund_id', fundId).order('name', { ascending: true }),
    ]);

    setExpenses(expRes.data || []);
    setCategories(catRes.data || []);
    if (catRes.data && catRes.data.length > 0 && !categoryId) {
      setCategoryId(catRes.data[0].id);
    }
    setLoading(false);
  }

  function resetForm() {
    setDate(new Date().toISOString().split('T')[0]);
    if (categories.length > 0) setCategoryId(categories[0].id);
    setCustomCategory('');
    setDescription('');
    setAmount('');
    setPaidTo('');
    setPaymentMode('Cash');
    setApprovedBy('');
    setRemarks('');
    setEditingId(null);
    setShowForm(false);
  }

  function editExpense(exp: Expense) {
    setDate(exp.date ? exp.date.split('T')[0] : '');
    setCategoryId(exp.category_id || '');
    setDescription(exp.description);
    setAmount(String(exp.amount));
    setPaidTo(exp.paid_to || '');
    setPaymentMode(exp.payment_mode || 'Cash');
    setApprovedBy(exp.approved_by || '');
    setRemarks(exp.remarks || '');
    setEditingId(exp.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let finalCatId = categoryId;
    let finalCatName = '';

    const selectedCat = categories.find((c) => c.id === categoryId);
    if (selectedCat) {
      finalCatName = selectedCat.name;
    } else if (customCategory.trim()) {
      // Create new custom category
      const { data: newCat } = await supabase
        .from('categories')
        .insert({
          fund_id: fundId,
          name: customCategory.trim(),
          color: '#6366f1',
          icon: '🏷️',
        })
        .select()
        .single();
      if (newCat) {
        finalCatId = newCat.id;
        finalCatName = newCat.name;
        setCategories([...categories, newCat]);
      }
    }

    const payload = {
      fund_id: fundId,
      category_id: finalCatId || null,
      category_name: finalCatName || 'General',
      date,
      description: description.trim(),
      amount: parseFloat(amount) || 0,
      paid_to: paidTo.trim(),
      payment_mode: paymentMode,
      approved_by: approvedBy.trim(),
      remarks: remarks.trim(),
    };

    if (editingId) {
      await supabase.from('expenses').update(payload).eq('id', editingId);
    } else {
      await supabase.from('expenses').insert({
        ...payload,
        expense_id: generateExpenseId(),
      });
    }

    resetForm();
    loadData();
  }

  async function deleteExpense(id: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    loadData();
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        !searchQuery.trim() ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.expense_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.paid_to && e.paid_to.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.remarks && e.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        categoryFilter === 'all' || e.category_id === categoryFilter || e.category_name === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  const totalAmount = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Expense Register</h2>
          <p className="text-sm text-muted-foreground">
            {expenses.length} records · Total: {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-56 rounded-xl border border-border bg-card py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Add / Edit Expense Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">
                  {editingId ? 'Edit Expense Record' : 'Record New Expense'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Date */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Category *</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon || '📦'} {c.name}
                        </option>
                      ))}
                      <option value="new">+ Add Custom Category...</option>
                    </select>
                  </div>
                </div>

                {categoryId === 'new' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">New Category Name *</label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Tent / Lighting"
                      required
                      className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Amount (₹) *</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="any"
                      min="1"
                      required
                      className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Paid To / Vendor */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Paid To (Vendor / Person)</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={paidTo}
                      onChange={(e) => setPaidTo(e.target.value)}
                      placeholder="e.g. Galaxy Biryani / Sayan"
                      className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Payment Mode</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                      className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {PAYMENT_MODES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Approved By */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Approved By</label>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    placeholder="Committee Member Name"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-foreground">Description *</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. 50 Plates Mutton Biryani for lunch"
                    required
                    className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-foreground">Remarks (Optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Additional notes or bill number..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm resize-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md"
                >
                  <Save className="h-4 w-4" />
                  {editingId ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expenses List / Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            {searchQuery || categoryFilter !== 'all' ? 'No matching expenses found' : 'No expenses recorded yet'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Click &quot;Add Expense&quot; above to log event costs.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Expense ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Paid To</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{exp.expense_id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{exp.date ? formatDate(exp.date) : '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                        {exp.category_name || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{exp.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{exp.paid_to || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {exp.payment_mode || 'Cash'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{exp.remarks || '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => editExpense(exp)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/30 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-foreground">Total Filtered Expenses</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
