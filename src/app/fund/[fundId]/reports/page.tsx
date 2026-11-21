'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  FileText, Download, Image as ImageIcon, Printer,
  Loader2, CheckCircle2, Calendar, Filter, Users, Gift, Receipt, PieChart
} from 'lucide-react';
import type { Fund, Donation, Expense, Person, Category } from '@/lib/types';

type ReportType =
  | 'full_summary'
  | 'donations'
  | 'expenses'
  | 'category_expenses'
  | 'people_directory'
  | 'balance_sheet';

export default function ReportsPage() {
  const params = useParams();
  const fundId = params.fundId as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [fund, setFund] = useState<Fund | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [selectedReport, setSelectedReport] = useState<ReportType>('full_summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadAllData();
  }, [fundId]);

  async function loadAllData() {
    setLoading(true);
    const [fRes, dRes, eRes, pRes, cRes] = await Promise.all([
      supabase.from('funds').select('*').eq('id', fundId).single(),
      supabase.from('donations').select('*').eq('fund_id', fundId).order('date', { ascending: true }),
      supabase.from('expenses').select('*').eq('fund_id', fundId).order('date', { ascending: true }),
      supabase.from('people').select('*').eq('fund_id', fundId).order('name', { ascending: true }),
      supabase.from('categories').select('*').eq('fund_id', fundId),
    ]);

    setFund(fRes.data);
    setDonations(dRes.data || []);
    setExpenses(eRes.data || []);
    setPeople(pRes.data || []);
    setCategories(cRes.data || []);
    setLoading(false);
  }

  // Filtered by date range if provided
  const filteredDonations = donations.filter((d) => {
    if (startDate && d.date < startDate) return false;
    if (endDate && d.date > endDate) return false;
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return true;
  });

  const totalDonations = filteredDonations.reduce((s, d) => s + (d.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netBalance = totalDonations - totalExpenses;

  // Category breakdown
  const categorySummary = categories.map((cat) => {
    const sum = filteredExpenses
      .filter((e) => e.category_id === cat.id || e.category_name === cat.name)
      .reduce((s, e) => s + (e.amount || 0), 0);
    return { name: cat.name, amount: sum };
  }).filter((c) => c.amount > 0);

  // Download PDF
  async function downloadPDF() {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${fund?.name || 'Fund'}_${selectedReport}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  }

  // Download Image (PNG)
  async function downloadImage() {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `${fund?.name || 'Fund'}_${selectedReport}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Image export error:', err);
      alert('Failed to export image');
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration & Action Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Report Type Selector */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Report Format
            </label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportType)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20"
            >
              <option value="full_summary">📊 Full Fund Summary & Balance Sheet</option>
              <option value="donations">🎁 Donation Register</option>
              <option value="expenses">🧾 Expense Register</option>
              <option value="category_expenses">🏷️ Category-wise Expenses</option>
              <option value="people_directory">👥 People & Pledges Directory</option>
              <option value="balance_sheet">📑 Income vs Expense Balance Sheet</option>
            </select>
          </div>

          {/* Date Range Filters */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="mt-5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              Clear Dates
            </button>
          )}
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={downloadPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export PDF
          </button>
          <button
            onClick={downloadImage}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary shadow-sm"
          >
            <ImageIcon className="h-4 w-4 text-primary" />
            Save Image
          </button>
          <button
            onClick={handlePrint}
            className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Print"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Printable / Rendered Report Preview Sheet */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-white p-4 shadow-lg text-slate-800">
        <div
          ref={printRef}
          className="mx-auto min-w-[700px] max-w-4xl bg-white p-8 font-sans text-slate-800"
          style={{ minHeight: '842px' }}
        >
          {/* Header Letterhead */}
          <div className="border-b-2 border-indigo-600 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                  Official Statement & Report
                </span>
                <h1 className="text-2xl font-black text-slate-900">{fund?.name || 'Event Fund'}</h1>
                <p className="text-xs text-slate-500 capitalize">
                  Event Category: {fund?.event_type || 'Event'} · Fund ID: {fund?.fund_id}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-md bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {selectedReport.replace('_', ' ').toUpperCase()}
                </span>
                <p className="mt-1 text-xs text-slate-400">
                  Generated: {formatDate(new Date())}
                </p>
                {startDate || endDate ? (
                  <p className="text-xs text-slate-500">
                    Period: {startDate || 'Start'} to {endDate || 'Present'}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="my-6 grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Total Collections</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalDonations)}</p>
              <p className="text-xs text-slate-400">{filteredDonations.length} Contributions</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Total Expenses</p>
              <p className="text-xl font-bold text-rose-600">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-slate-400">{filteredExpenses.length} Outflows</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Closing Balance</p>
              <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {formatCurrency(netBalance)}
              </p>
              <p className="text-xs text-slate-400">{netBalance >= 0 ? 'Net Surplus' : 'Net Deficit'}</p>
            </div>
          </div>

          {/* Report Body Switcher */}
          {selectedReport === 'full_summary' && (
            <div className="space-y-6">
              {/* Category Breakdown */}
              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                  Category Expense Breakdown
                </h3>
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-slate-600">
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-right">% of Expense</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {categorySummary.map((cat, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-medium text-slate-800">{cat.name}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">{formatCurrency(cat.amount)}</td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Top Donors */}
              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                  Top Contributions
                </h3>
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-slate-600">
                      <th className="py-2 px-3">Donor Name</th>
                      <th className="py-2 px-3">Designation</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDonations.slice(0, 10).map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 px-3 font-medium text-slate-800">{d.donor_name}</td>
                        <td className="py-2 px-3 text-slate-500">{d.designation || '—'}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatCurrency(d.amount)}</td>
                        <td className="py-2 px-3 text-slate-500">{d.payment_mode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedReport === 'donations' && (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                Detailed Donation Register
              </h3>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-slate-600">
                    <th className="py-2 px-2">TXN ID</th>
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Donor</th>
                    <th className="py-2 px-2">Designation</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                    <th className="py-2 px-2">Mode</th>
                    <th className="py-2 px-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDonations.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 px-2 font-mono text-[10px] text-slate-400">{d.transaction_id}</td>
                      <td className="py-2 px-2 text-slate-600">{d.date ? formatDate(d.date) : ''}</td>
                      <td className="py-2 px-2 font-medium text-slate-900">{d.donor_name}</td>
                      <td className="py-2 px-2 text-slate-500">{d.designation || '—'}</td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-600">{formatCurrency(d.amount)}</td>
                      <td className="py-2 px-2 text-slate-500">{d.payment_mode}</td>
                      <td className="py-2 px-2 text-slate-400 truncate max-w-[120px]">{d.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'expenses' && (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                Detailed Expense Register
              </h3>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-slate-600">
                    <th className="py-2 px-2">EXP ID</th>
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Category</th>
                    <th className="py-2 px-2">Description</th>
                    <th className="py-2 px-2">Paid To</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                    <th className="py-2 px-2">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 px-2 font-mono text-[10px] text-slate-400">{e.expense_id}</td>
                      <td className="py-2 px-2 text-slate-600">{e.date ? formatDate(e.date) : ''}</td>
                      <td className="py-2 px-2 font-medium text-slate-700">{e.category_name || 'General'}</td>
                      <td className="py-2 px-2 text-slate-800">{e.description}</td>
                      <td className="py-2 px-2 text-slate-500">{e.paid_to || '—'}</td>
                      <td className="py-2 px-2 text-right font-bold text-rose-600">{formatCurrency(e.amount)}</td>
                      <td className="py-2 px-2 text-slate-500">{e.payment_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'people_directory' && (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                Registered Members & Expected Donations
              </h3>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-slate-600">
                    <th className="py-2 px-3">Person ID</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Designation</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-3 text-right">Expected Pledge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {people.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-400">{p.person_id}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{p.name}</td>
                      <td className="py-2 px-3 text-slate-500">{p.designation || '—'}</td>
                      <td className="py-2 px-3 text-slate-500">{p.phone || '—'}</td>
                      <td className="py-2 px-3 text-right font-semibold text-indigo-600">{formatCurrency(p.expected_donation || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Sign-off Section */}
          <div className="mt-12 border-t border-slate-200 pt-6">
            <div className="flex items-end justify-between text-xs text-slate-500">
              <div>
                <p className="font-semibold text-slate-700">MultiFundManage Platform</p>
                <p>Cloud Synchronized & Cryptographically Verified ID Tracking</p>
              </div>
              <div className="text-right">
                <div className="mb-4 inline-block w-36 border-b border-slate-400"></div>
                <p className="font-medium text-slate-700">Authorized Signatory / Secretary</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
