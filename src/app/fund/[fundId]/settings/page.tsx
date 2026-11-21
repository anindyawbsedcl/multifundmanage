'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import {
  Settings, Share2, Copy, Check, Trash2, Plus,
  Save, AlertTriangle, Download, Loader2, Link2, Shield
} from 'lucide-react';
import type { Fund, Category } from '@/lib/types';

export default function FundSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const fundId = params.fundId as string;
  const [fund, setFund] = useState<Fund | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fund Edit Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Category Management
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');

  // Share Link
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingShare, setGeneratingShare] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, [fundId]);

  async function loadSettings() {
    setLoading(true);
    const [fRes, cRes, sRes] = await Promise.all([
      supabase.from('funds').select('*').eq('id', fundId).single(),
      supabase.from('categories').select('*').eq('fund_id', fundId),
      supabase.from('share_links').select('*').eq('fund_id', fundId).limit(1),
    ]);

    if (fRes.data) {
      setFund(fRes.data);
      setName(fRes.data.name);
      setDescription(fRes.data.description || '');
      setStartDate(fRes.data.start_date || '');
      setEndDate(fRes.data.end_date || '');
    }

    setCategories(cRes.data || []);
    if (sRes.data && sRes.data.length > 0) {
      setShareToken(sRes.data[0].token);
    }
    setLoading(false);
  }

  async function handleUpdateFund(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('funds').update({
      name: name.trim(),
      description: description.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      updated_at: new Date().toISOString(),
    }).eq('id', fundId);

    setSaving(false);
    alert('Fund details updated successfully!');
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const { data, error } = await supabase.from('categories').insert({
      fund_id: fundId,
      name: newCatName.trim(),
      color: newCatColor,
      icon: '🏷️',
      is_default: false,
    }).select().single();

    if (data) {
      setCategories([...categories, data]);
      setNewCatName('');
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Delete this category?')) return;
    await supabase.from('categories').delete().eq('id', id);
    setCategories(categories.filter((c) => c.id !== id));
  }

  async function handleGenerateShareLink() {
    setGeneratingShare(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { error } = await supabase.from('share_links').insert({
      fund_id: fundId,
      token,
      role: 'viewer',
      created_by: user.user.id,
    });

    if (!error) {
      setShareToken(token);
    }
    setGeneratingShare(false);
  }

  async function handleRevokeShareLink() {
    if (!confirm('Revoke this share link? Viewers with this link will immediately lose access.')) return;
    await supabase.from('share_links').delete().eq('fund_id', fundId);
    setShareToken(null);
  }

  const shareUrl = typeof window !== 'undefined' && shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : '';

  function copyShareUrl() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Export JSON backup
  async function exportData() {
    const [dRes, eRes, pRes] = await Promise.all([
      supabase.from('donations').select('*').eq('fund_id', fundId),
      supabase.from('expenses').select('*').eq('fund_id', fundId),
      supabase.from('people').select('*').eq('fund_id', fundId),
    ]);

    const backupData = {
      fund,
      categories,
      people: pRes.data || [],
      donations: dRes.data || [],
      expenses: eRes.data || [],
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fund?.name || 'fund'}_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* 1. Share & Viewer Access (User Requested: admin have all access, viewer can only view on share url) */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Viewer Share Link</h3>
            <p className="text-xs text-muted-foreground">
              Share a secure read-only dashboard link with public/members without sharing your admin password.
            </p>
          </div>
        </div>

        {shareToken ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 p-3">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-sm text-foreground focus:outline-none font-mono"
              />
              <button
                onClick={copyShareUrl}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Shield className="h-3.5 w-3.5" /> Viewers can only inspect collections, expenses & reports (no editing)
              </span>
              <button
                onClick={handleRevokeShareLink}
                className="text-red-500 hover:underline"
              >
                Revoke Link
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              No active share link. Generate one to let members monitor financial transparency in real time.
            </p>
            <button
              onClick={handleGenerateShareLink}
              disabled={generatingShare}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {generatingShare ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Generate Public Viewer Link
            </button>
          </div>
        )}
      </section>

      {/* 2. Fund General Information */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
          <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Fund Details</h3>
            <p className="text-xs text-muted-foreground">Update event titles, dates and remarks.</p>
          </div>
        </div>

        <form onSubmit={handleUpdateFund} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Fund / Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </section>

      {/* 3. Manage Expense Categories */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-4">Expense Categories</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color || '#6366f1' }}></span>
              {c.name}
              {!c.is_default && (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c.id)}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>

        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New Category Name..."
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 flex-1"
          />
          <input
            type="color"
            value={newCatColor}
            onChange={(e) => setNewCatColor(e.target.value)}
            className="h-10 w-12 cursor-pointer rounded-xl border border-border bg-background p-1"
            title="Pick color"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary/80"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>
      </section>

      {/* 4. Backup & Export */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-2">Export & Backup</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Download a complete offline JSON snapshot of this fund including all donors, transactions, and categories.
        </p>
        <button
          onClick={exportData}
          className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Fund Data (JSON)
        </button>
      </section>
    </div>
  );
}
