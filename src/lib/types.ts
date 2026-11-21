// ============================================================
// MultiFundManage — Type Definitions
// ============================================================

export type EventType = 'puja' | 'picnic' | 'wedding' | 'trip' | 'meeting' | 'custom';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank' | 'Cheque' | 'Other';
export type UserRole = 'admin' | 'editor' | 'viewer';
export type FundStatus = 'active' | 'archived' | 'trashed';

// ---- User ----
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  last_login: string;
}

// ---- Fund ----
export interface Fund {
  id: string;
  fund_id: string;
  owner_id: string;
  name: string;
  event_type: EventType;
  description: string;
  icon: string;
  color: string;
  start_date: string;
  end_date: string | null;
  status: FundStatus;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FundWithStats extends Fund {
  total_donations: number;
  total_expenses: number;
  total_people: number;
  donation_count: number;
  balance: number;
}

// ---- Person ----
export interface Person {
  id: string;
  person_id: string;
  fund_id: string;
  name: string;
  phone: string;
  designation: string;
  expected_donation: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface PersonWithDonations extends Person {
  total_donated: number;
  donation_count: number;
}

// ---- Donation ----
export interface Donation {
  id: string;
  transaction_id: string;
  fund_id: string;
  person_id: string;
  donor_name: string;
  designation: string;
  date: string;
  amount: number;
  payment_mode: PaymentMode;
  reference_no: string;
  receipt_no: string;
  remarks: string;
  created_at: string;
}

// ---- Expense ----
export interface Expense {
  id: string;
  expense_id: string;
  fund_id: string;
  category_id: string;
  category_name?: string;
  date: string;
  description: string;
  amount: number;
  paid_to: string;
  payment_mode: PaymentMode;
  bill_url: string;
  approved_by: string;
  remarks: string;
  created_at: string;
}

// ---- Category ----
export interface Category {
  id: string;
  fund_id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  total_donations: number;
  total_expenses: number;
  balance: number;
  total_people: number;
  donation_count: number;
  expense_count: number;
  category_expenses: { name: string; amount: number; color: string }[];
  payment_mode_stats: { mode: string; amount: number }[];
  daily_trends: { date: string; donations: number; expenses: number }[];
  top_donors: { name: string; amount: number }[];
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'donation' | 'expense' | 'person';
  description: string;
  amount?: number;
  date: string;
}

// ---- Share Link ----
export interface ShareLink {
  id: string;
  fund_id: string;
  token: string;
  role: 'viewer';
  expires_at: string | null;
  created_at: string;
  created_by: string;
}
