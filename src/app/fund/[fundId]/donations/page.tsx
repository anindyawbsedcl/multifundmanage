'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { generateDonationId, generatePersonId, generateReceiptNo } from '@/lib/id-generator';
import { motion, AnimatePresence } from 'framer-motion';
import type { Donation, Person } from '@/lib/types';
import {
  Plus, Search, Edit3, Trash2, X, Loader2, Gift,
  Save, Calendar, IndianRupee, User, CreditCard,
  FileText, MessageSquare,
} from 'lucide-react';

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank', 'Cheque', 'Other'] as const;

export default function DonationsPage() {
  const params = useParams();
  const fundId = params.fundId as string;
  const [donations, setDonations] = useState<Donation[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [donorName, setDonorName] = useState('');
  const [designation, setDesignation] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');

  // Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [fundId]);

  async function loadData() {
    setLoading(true);
    const [donRes, pplRes] = await Promise.all([
      supabase.from('donations').select('*').eq('fund_id', fundId).order('created_at', { ascending: false }),
      supabase.from('people').select('*').eq('fund_id', fundId),
    ]);
    setDonations(donRes.data || []);
    setPeople(pplRes.data || []);
    setLoading(false);
  }

  function resetForm() {
    setDate(new Date().toISOString().split('T')[0]);
    setDonorName('');
    setDesignation('');
    setAmount('');
    setPaymentMode('Cash');
    setReferenceNo('');
    setRemarks('');
    setEditingId(null);
    setShowForm(false);
    setShowSuggestions(false);
  }

  function editDonation(d: Donation) {
    setDate(d.date?.split('T')[0] || '');
    setDonorName(d.donor_name);
    setDesignation(d.designation || '');
    setAmount(String(d.amount));
    setPaymentMode(d.payment_mode);
    setReferenceNo(d.reference_no || '');
    setRemarks(d.remarks || '');
    setEditingId(d.id);
    setShowForm(true);
  }

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!donorName.trim() || donorName.length < 1) return [];
    const q = donorName.toLowerCase();
    return people
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [donorName, people]);

  function selectPerson(person: Person) {
    setDonorName(person.name);
    setDesignation(person.designation || '');
    setShowSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check if donor exists in people, if not create them
    let personId: string | null = null;
    const existing = people.find(
      (p) => p.name.toLowerCase() === donorName.trim().toLowerCase()
    );

    if (!existing) {
      // Auto-create person
      const newPersonId = generatePersonId();
      const { data: newPerson } = await supabase
        .from('people')
        .insert({
          person_id: newPersonId,
          fund_id: fundId,
          name: donorName.trim(),
          designation: designation.trim(),
          expected_donation: 0,
          status: 'active',
          phone: '',
        })
        .select('id')
        .single();
      personId = newPerson?.id || null;
    } else {
      personId = existing.id;
    }

    const payload = {
      fund_id: fundId,
      person_id: personId,
      donor_name: donorName.trim(),
      designation: designation.trim(),
      date,
      amount: parseFloat(amount) || 0,
      payment_mode: paymentMode,
      reference_no: referenceNo.trim(),
      remarks: remarks.trim(),
    };

    if (editingId) {
      await supabase.from('donations').update(payload).eq('id', editingId);
    } else {
      await supabase.from('donations').insert({
        ...payload,
        transaction_id: generateDonationId(),
        receipt_no: generateReceiptNo(),
      });
    }

    resetForm();
    loadData();
  }

  async function deleteDonation(id: string) {
    if (!confirm('Delete this donation?')) return;
    await supabase.from('donations').delete().eq('id', id);
    loadData();
  }

  const filteredDonations = useMemo(() => {
    if (!searchQuery.trim()) return donations;
    const q = searchQuery.toLowerCase();
    return donations.filter(
      (d) =>
        d.donor_name.toLowerCase().includes(q) ||
        d.transaction_id.toLowerCase().includes(q) ||
        d.payment_mode.toLowerCase().includes(q) ||
        d.remarks?.toLowerCase().includes(q)
    );
  }, [donations, searchQuery]);

  const totalAmount = filteredDonations.reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Donation Register</h2>
          <p className="text-sm text-muted-foreground">
            {donations.length} donations · Total: {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search donations..."
              className="w-56 rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25"
          >
            <Plus className="h-4 w-4" />
            Add Donation
          </button>
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">
                  {editingId ? 'Edit Donation' : 'Add New Donation'}
                </h3>
                <button type="button" onClick={resetForm} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Date */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Donor Name with Autocomplete */}
                <div className="relative">
                  <label className="mb-1 block text-sm font-medium text-foreground">Donor Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={donorName}
                      onChange={(e) => { setDonorName(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Start typing name..."
                      required
                      className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card shadow-lg">
                      {suggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => selectPerson(p)}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/50 first:rounded-t-xl last:rounded-b-xl"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.designation || 'No designation'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Select existing person or enter a new name
                  </p>
                </div>

                {/* Designation */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Auto-filled"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Amount *</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="₹0"
                      required
                      min="1"
                      className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Reference No */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Reference No.</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="UPI Ref / Cheque No."
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-foreground">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional remarks..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm resize-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button type="submit" className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4" />
                  {editingId ? 'Update Donation' : 'Save Donation'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Gift className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            {searchQuery ? 'No results found' : 'No donations yet'}
          </h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transaction ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Donor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Designation</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remarks</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDonations.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{d.transaction_id}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d.date ? formatDate(d.date) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{d.donor_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d.designation || '—'}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(d.amount)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{d.payment_mode}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{d.remarks || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => editDonation(d)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => deleteDonation(d.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/30">
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-foreground">Total</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(totalAmount)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
