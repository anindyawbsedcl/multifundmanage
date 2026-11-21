'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import {
  FileText,
  Download,
  Image as ImageIcon,
  Printer,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Filter,
  Users,
  Gift,
  Receipt,
  PieChart,
  Share2,
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
  const [exportType, setExportType] = useState<string | null>(null);

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
      supabase
        .from('donations')
        .select('*')
        .eq('fund_id', fundId)
        .order('date', { ascending: true }),
      supabase
        .from('expenses')
        .select('*')
        .eq('fund_id', fundId)
        .order('date', { ascending: true }),
      supabase
        .from('people')
        .select('*')
        .eq('fund_id', fundId)
        .order('name', { ascending: true }),
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
  const categorySummary = categories
    .map((cat) => {
      const sum = filteredExpenses
        .filter((e) => e.category_id === cat.id || e.category_name === cat.name)
        .reduce((s, e) => s + (e.amount || 0), 0);
      return { name: cat.name, amount: sum };
    })
    .filter((c) => c.amount > 0);

  // Download PDF (Vector-based via jsPDF & jspdf-autotable - no html2canvas crash)
  async function downloadPDF() {
    setExporting(true);
    setExportType('pdf');
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Top banner
      doc.setFillColor(79, 70, 229); // #4f46e5 Indigo 600
      doc.rect(0, 0, pageWidth, 45, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('MultiFundManage — Official Statement', 36, 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(224, 231, 255);
      doc.text('v1.2 · Financial Ledger', pageWidth - 36, 28, { align: 'right' });

      // Title & Fund Details
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(fund?.name || 'Event Fund', 36, 75);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      const eventDetails = `Event: ${(fund?.event_type || 'Event').toUpperCase()}  |  Fund ID: ${fund?.fund_id || 'N/A'}`;
      doc.text(eventDetails, 36, 92);

      const reportNameStr = selectedReport.replace(/_/g, ' ').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(`REPORT: ${reportNameStr}`, pageWidth - 36, 75, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const datePeriod =
        startDate || endDate
          ? `Period: ${startDate || 'Start'} to ${endDate || 'Now'}`
          : `Generated: ${new Date().toLocaleDateString()}`;
      doc.text(datePeriod, pageWidth - 36, 92, { align: 'right' });

      // Financial Metrics Summary Box
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(36, 108, pageWidth - 72, 54, 6, 6, 'FD');

      const colWidth = (pageWidth - 72) / 3;

      // Col 1: Total Collections
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL COLLECTIONS', 48, 126);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.text(formatCurrency(totalDonations), 48, 146);

      // Col 2: Total Expenses
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL EXPENSES', 48 + colWidth, 126);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(225, 29, 72); // rose-600
      doc.text(formatCurrency(totalExpenses), 48 + colWidth, 146);

      // Col 3: Net Balance
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('CLOSING BALANCE', 48 + colWidth * 2, 126);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
        netBalance >= 0 ? 79 : 225,
        netBalance >= 0 ? 70 : 29,
        netBalance >= 0 ? 229 : 72
      );
      doc.text(formatCurrency(netBalance), 48 + colWidth * 2, 146);

      const startY = 180;

      // Report Tables
      if (selectedReport === 'full_summary' || selectedReport === 'balance_sheet') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text('Category-wise Expense Breakdown', 36, startY);

        autoTable(doc, {
          startY: startY + 8,
          margin: { left: 36, right: 36 },
          head: [['Category', 'Amount', '% of Total Outflow']],
          body: categorySummary.map((c) => [
            c.name,
            formatCurrency(c.amount),
            `${totalExpenses > 0 ? ((c.amount / totalExpenses) * 100).toFixed(1) : 0}%`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
          },
        });

        const nextY = (doc as any).lastAutoTable.finalY + 24;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text('Recent Donations / Contributions', 36, nextY);

        autoTable(doc, {
          startY: nextY + 8,
          margin: { left: 36, right: 36 },
          head: [['Donor Name', 'Designation', 'Amount', 'Payment Mode', 'Date']],
          body: filteredDonations.slice(0, 20).map((d) => [
            d.donor_name,
            d.designation || '—',
            formatCurrency(d.amount),
            d.payment_mode,
            d.date ? formatDate(d.date) : '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            2: { halign: 'right' },
          },
        });
      } else if (selectedReport === 'donations') {
        autoTable(doc, {
          startY: startY,
          margin: { left: 36, right: 36 },
          head: [['TXN ID', 'Date', 'Donor Name', 'Designation', 'Amount', 'Mode', 'Remarks']],
          body: filteredDonations.map((d) => [
            d.transaction_id,
            d.date ? formatDate(d.date) : '',
            d.donor_name,
            d.designation || '—',
            formatCurrency(d.amount),
            d.payment_mode,
            d.remarks || '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            4: { halign: 'right' },
          },
        });
      } else if (selectedReport === 'expenses') {
        autoTable(doc, {
          startY: startY,
          margin: { left: 36, right: 36 },
          head: [['EXP ID', 'Date', 'Category', 'Description', 'Paid To / Vendor', 'Amount', 'Mode']],
          body: filteredExpenses.map((e) => [
            e.expense_id,
            e.date ? formatDate(e.date) : '',
            e.category_name || 'General',
            e.description,
            e.paid_to || '—',
            formatCurrency(e.amount),
            e.payment_mode,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            5: { halign: 'right' },
          },
        });
      } else if (selectedReport === 'category_expenses') {
        autoTable(doc, {
          startY: startY,
          margin: { left: 36, right: 36 },
          head: [['Category Name', 'Total Amount Spent', '% of Outflow']],
          body: categorySummary.map((c) => [
            c.name,
            formatCurrency(c.amount),
            `${totalExpenses > 0 ? ((c.amount / totalExpenses) * 100).toFixed(1) : 0}%`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
          },
        });
      } else if (selectedReport === 'people_directory') {
        autoTable(doc, {
          startY: startY,
          margin: { left: 36, right: 36 },
          head: [['Person ID', 'Name', 'Designation', 'Phone', 'Expected Pledge']],
          body: people.map((p) => [
            p.person_id,
            p.name,
            p.designation || '—',
            p.phone || '—',
            formatCurrency(p.expected_donation || 0),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            4: { halign: 'right' },
          },
        });
      }

      // Add page numbers and footer
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
          `Page ${i} of ${totalPages}  ·  Generated via MultiFundManage Platform v1.2  ·  Made with ❤️ by A N I N D Y A`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 16,
          { align: 'center' }
        );
      }

      const fileName = `${(fund?.name || 'Fund').replace(/\s+/g, '_')}_${selectedReport}_v1.2.pdf`;
      doc.save(fileName);
    } catch (err: any) {
      console.error('PDF error:', err);
      alert('Error generating PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setExporting(false);
      setExportType(null);
    }
  }

  // Download Excel (.xlsx) via SheetJS
  function downloadExcel() {
    setExporting(true);
    setExportType('excel');
    try {
      const wb = XLSX.utils.book_new();

      // 1. Summary Sheet
      const summaryData = [
        ['MultiFundManage - Financial Report v1.2'],
        ['Fund Name', fund?.name || ''],
        ['Event Type', fund?.event_type || ''],
        ['Fund ID', fund?.fund_id || ''],
        ['Generated Date', new Date().toLocaleDateString()],
        ['Period', startDate || endDate ? `${startDate || 'Start'} to ${endDate || 'Now'}` : 'Full Duration'],
        [],
        ['FINANCIAL OVERVIEW'],
        ['Total Collections (INR)', totalDonations],
        ['Total Expenses (INR)', totalExpenses],
        ['Net Balance (INR)', netBalance],
        ['Status', netBalance >= 0 ? 'Surplus' : 'Deficit'],
        [],
        ['CATEGORY EXPENSE BREAKDOWN'],
        ['Category', 'Amount (INR)', '% of Expenses'],
        ...categorySummary.map((c) => [
          c.name,
          c.amount,
          totalExpenses > 0 ? Number(((c.amount / totalExpenses) * 100).toFixed(1)) : 0,
        ]),
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // 2. Donations Sheet
      const donationsData = [
        ['Transaction ID', 'Date', 'Donor Name', 'Designation', 'Amount (INR)', 'Payment Mode', 'Remarks'],
        ...filteredDonations.map((d) => [
          d.transaction_id,
          d.date || '',
          d.donor_name,
          d.designation || '',
          d.amount,
          d.payment_mode,
          d.remarks || '',
        ]),
      ];
      const wsDonations = XLSX.utils.aoa_to_sheet(donationsData);
      XLSX.utils.book_append_sheet(wb, wsDonations, 'Donations');

      // 3. Expenses Sheet
      const expensesData = [
        ['Expense ID', 'Date', 'Category', 'Description', 'Paid To / Vendor', 'Amount (INR)', 'Payment Mode'],
        ...filteredExpenses.map((e) => [
          e.expense_id,
          e.date || '',
          e.category_name || 'General',
          e.description,
          e.paid_to || '',
          e.amount,
          e.payment_mode,
        ]),
      ];
      const wsExpenses = XLSX.utils.aoa_to_sheet(expensesData);
      XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

      // 4. People Directory Sheet
      const peopleData = [
        ['Person ID', 'Name', 'Designation', 'Phone', 'Expected Pledge (INR)'],
        ...people.map((p) => [
          p.person_id,
          p.name,
          p.designation || '',
          p.phone || '',
          p.expected_donation || 0,
        ]),
      ];
      const wsPeople = XLSX.utils.aoa_to_sheet(peopleData);
      XLSX.utils.book_append_sheet(wb, wsPeople, 'Members');

      const fileName = `${(fund?.name || 'Fund').replace(/\s+/g, '_')}_Financial_Statement_v1.2.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err: any) {
      console.error('Excel export error:', err);
      alert('Error exporting Excel: ' + (err?.message || 'Unknown error'));
    } finally {
      setExporting(false);
      setExportType(null);
    }
  }

  // Download Image (PNG) via html-to-image (bypasses html2canvas oklch crash)
  async function downloadImage() {
    if (!printRef.current) return;
    setExporting(true);
    setExportType('image');
    try {
      const dataUrl = await toPng(printRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });

      const fileName = `${(fund?.name || 'Fund').replace(/\s+/g, '_')}_${selectedReport}_v1.2.png`;

      // Check if navigator.share with files is supported (mobile native share)
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${fund?.name} Report`,
            text: `Financial report for ${fund?.name}`,
          });
          setExporting(false);
          setExportType(null);
          return;
        }
      } catch (shareErr) {
        // Fall back to link download
      }

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Image export error:', err);
      alert('Error exporting image: ' + (err?.message || 'Unknown error'));
    } finally {
      setExporting(false);
      setExportType(null);
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
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="mt-5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              Clear Dates
            </button>
          )}
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export PDF Button */}
          <button
            onClick={downloadPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-60"
          >
            {exporting && exportType === 'pdf' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Export PDF</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={downloadExcel}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-60"
          >
            {exporting && exportType === 'excel' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            <span>Export Excel</span>
          </button>

          {/* Save Image Button */}
          <button
            onClick={downloadImage}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-secondary shadow-sm disabled:opacity-60"
          >
            {exporting && exportType === 'image' ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <ImageIcon className="h-4 w-4 text-primary" />
            )}
            <span>Save Image</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Print Statement"
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
              <p
                className={`text-xl font-bold ${
                  netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(netBalance)}
              </p>
              <p className="text-xs text-slate-400">
                {netBalance >= 0 ? 'Net Surplus' : 'Net Deficit'}
              </p>
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
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                          {formatCurrency(cat.amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {totalExpenses > 0
                            ? ((cat.amount / totalExpenses) * 100).toFixed(1)
                            : 0}
                          %
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
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">
                          {formatCurrency(d.amount)}
                        </td>
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
                      <td className="py-2 px-2 font-mono text-[10px] text-slate-400">
                        {d.transaction_id}
                      </td>
                      <td className="py-2 px-2 text-slate-600">
                        {d.date ? formatDate(d.date) : ''}
                      </td>
                      <td className="py-2 px-2 font-medium text-slate-900">{d.donor_name}</td>
                      <td className="py-2 px-2 text-slate-500">{d.designation || '—'}</td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-600">
                        {formatCurrency(d.amount)}
                      </td>
                      <td className="py-2 px-2 text-slate-500">{d.payment_mode}</td>
                      <td className="py-2 px-2 text-slate-400 truncate max-w-[120px]">
                        {d.remarks || '—'}
                      </td>
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
                      <td className="py-2 px-2 font-mono text-[10px] text-slate-400">
                        {e.expense_id}
                      </td>
                      <td className="py-2 px-2 text-slate-600">
                        {e.date ? formatDate(e.date) : ''}
                      </td>
                      <td className="py-2 px-2 font-medium text-slate-700">
                        {e.category_name || 'General'}
                      </td>
                      <td className="py-2 px-2 text-slate-800">{e.description}</td>
                      <td className="py-2 px-2 text-slate-500">{e.paid_to || '—'}</td>
                      <td className="py-2 px-2 text-right font-bold text-rose-600">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="py-2 px-2 text-slate-500">{e.payment_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedReport === 'category_expenses' && (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                Category Expense Register
              </h3>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-slate-600">
                    <th className="py-2 px-3">Category Name</th>
                    <th className="py-2 px-3 text-right">Total Spent</th>
                    <th className="py-2 px-3 text-right">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {categorySummary.map((c, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-medium text-slate-800">{c.name}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(c.amount)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500">
                        {totalExpenses > 0
                          ? ((c.amount / totalExpenses) * 100).toFixed(1)
                          : 0}
                        %
                      </td>
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
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-400">
                        {p.person_id}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">{p.name}</td>
                      <td className="py-2 px-3 text-slate-500">{p.designation || '—'}</td>
                      <td className="py-2 px-3 text-slate-500">{p.phone || '—'}</td>
                      <td className="py-2 px-3 text-right font-semibold text-indigo-600">
                        {formatCurrency(p.expected_donation || 0)}
                      </td>
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
                <p className="font-semibold text-slate-700">MultiFundManage Platform v1.2</p>
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
