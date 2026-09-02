export type UserRole = 'admin' | 'staff' | 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  username: string;
  password?: string;
  password_hash?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  google_subject_id?: string | null;
  email_verified?: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
}

export interface PasswordResetToken {
  id: string;
  user_id: number;
  email: string;
  token_hash: string; // SHA-256 digest of secret token
  expires_at: number; // Unix timestamp ms
  used_at: string | null;
  created_at: string;
  google_verified: boolean;
  google_email?: string;
  google_subject_id?: string;
  ip_hint?: string;
}

export type GSTType = 'Normal' | 'Composition' | 'QRMP' | 'regular' | 'composition' | 'qrmp';
export type ClientCategory = 'Normal' | 'Composition' | 'QRMP';
export type ClientStatus = 'active' | 'inactive';

export interface Client {
  id: number;
  file_no?: string;
  gstin: string;
  firm_name: string;
  client_name: string;
  mobile: string;
  alternate_mobile?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  gst_type: GSTType;
  assigned_staff_id: number | null;
  registration_date: string;
  status: ClientStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialYear {
  id: number;
  start_year: number;
  end_year: number;
  display_name: string; // e.g. "2026-27"
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export type WorkStatus =
  | 'Not Started'
  | 'Pending'
  | 'Completed'
  | 'Nil Filed'
  | 'Data Received'
  | 'RCM Pay'
  | 'Challan Generated'
  | 'Bill Pending'
  | 'Tax Payment Pending'
  | 'Documents Pending'
  | 'Client Response Pending'
  | 'GSTR-1 Filed'
  | 'Other';

export interface MonthlyWork {
  id: number;
  financial_year_id: number;
  month: string; // "April", "May", ... "March"
  client_id: number;
  status: WorkStatus;
  remark: string;
  updated_by: number;
  updated_by_name?: string;
  updated_at: string;
}

export interface WorkHistory {
  id: number;
  client_id: number;
  client_name?: string;
  firm_name?: string;
  financial_year_id: number;
  fy_name?: string;
  month: string;
  previous_status: WorkStatus;
  new_status: WorkStatus;
  remark: string;
  changed_by: number;
  changed_by_name?: string;
  changed_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  user_role: UserRole;
  action: string;
  module?: string;
  client_id?: number | null;
  client_name?: string | null;
  firm_name?: string | null;
  financial_year_id?: number | null;
  financial_year?: string | null;
  record_id?: string | number | null;
  description: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  changed_fields?: string[] | null;
  ip_address: string;
  user_agent?: string;
  session_id?: string;
  session_status?: 'active' | 'logged_out' | 'expired';
  created_at: string; // YYYY-MM-DD HH:mm:ss
}

export interface UserSession {
  session_id: string;
  user_id: number;
  user_name: string;
  user_role: UserRole;
  ip_address: string;
  user_agent: string;
  login_time: string;
  last_activity_time: string;
  logout_time?: string | null;
  status: 'active' | 'logged_out' | 'expired';
}

export interface ConsultantDetails {
  consultant_name: string;
  firm_name: string;
  designation: string; // e.g. "Chartered Accountant", "GST Practitioner", "Tax Consultant"
  registration_no: string; // e.g. Membership / Enrollment No
  gstin?: string;
  pan?: string;
  email: string;
  mobile: string;
  alternate_mobile?: string;
  office_address: string;
  city: string;
  state: string;
  pin_code: string;
  website?: string;
  specialization?: string;
  notes?: string;
  updated_at?: string;
}

export interface AppSettings {
  company_name: string;
  company_logo?: string;
  admin_email: string;
  default_fy_id: number;
  default_month: string;
  timezone: string;
  date_format: string;
  consultant?: ConsultantDetails;
}

export const FY_MONTHS = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
] as const;

export const WORK_STATUSES: WorkStatus[] = [
  'Not Started',
  'Pending',
  'Completed',
  'Nil Filed',
  'Data Received',
  'RCM Pay',
  'Challan Generated',
  'Bill Pending',
  'Tax Payment Pending',
  'Documents Pending',
  'Client Response Pending',
  'GSTR-1 Filed',
  'Other',
];

export const STATUS_COLORS: Record<WorkStatus, { bg: string; text: string; border: string; badge: string }> = {
  'Not Started': {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-700 border border-gray-300',
  },
  'Pending': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border border-amber-300',
  },
  'Completed': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  },
  'Nil Filed': {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    badge: 'bg-teal-100 text-teal-800 border border-teal-300',
  },
  'Data Received': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border border-blue-300',
  },
  'RCM Pay': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
  },
  'Challan Generated': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-800 border border-purple-300',
  },
  'Bill Pending': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800 border border-orange-300',
  },
  'Tax Payment Pending': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-800 border border-rose-300',
  },
  'Documents Pending': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border border-amber-300',
  },
  'Client Response Pending': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    badge: 'bg-cyan-100 text-cyan-800 border border-cyan-300',
  },
  'GSTR-1 Filed': {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-800 border border-sky-300',
  },
  'Other': {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-800 border border-slate-300',
  },
};

// ==========================================
// BANK TURNOVER MANAGEMENT TYPES (NEW FEATURE)
// ==========================================
export type BankAccountSlot = 1 | 2 | 3 | 4 | 5;
export type BankAccountType = 'Current' | 'Savings' | 'OD/CC' | 'Cash Credit' | 'Other';
export type BankAccountStatus = 'active' | 'inactive';

export interface ClientBankAccount {
  id: number;
  client_id: number;
  slot_number: BankAccountSlot;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  account_type: BankAccountType;
  ifsc: string;
  status: BankAccountStatus;
  deactivated_in_fy_id?: number | null;
  deactivated_fy_start_year?: number | null;
  deactivated_fy_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientBankTurnover {
  id: number;
  client_id: number;
  bank_account_id: number;
  financial_year_id: number;
  month: string; // e.g. "April", "May", ... "March"
  turnover_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BankStatementBackup {
  id: number;
  client_id: number;
  bank_account_id: number;
  financial_year_id: number;
  file_name: string;
  stored_file_name: string;
  file_path?: string;
  file_size: number;
  file_data_base64?: string;
  uploaded_at: string;
  uploaded_by: number;
  uploaded_by_name?: string;
}

export interface BankAccountTurnoverSummary {
  bankAccount: ClientBankAccount;
  monthlyTurnover: Record<string, number>;
  annualTotal: number;
  backupStatement?: BankStatementBackup;
}

// ==========================================
// GST MONTHLY TURNOVER TYPES (TAXABLE + EXEMPT)
// ==========================================
export interface ClientGstTurnover {
  id: number;
  client_id: number;
  financial_year_id: number;
  month: string; // "April", "May", ... "March"
  taxable_turnover: number;
  exempt_turnover: number;
  total_gst_turnover: number; // taxable_turnover + exempt_turnover
  remark?: string; // Monthly Remark (April to March)
  created_at: string;
  updated_at: string;
}

export type ReportType =
  | 'combined' // Client Financial Report (Combined Bank + GST)
  | 'gst' // GST Turnover Report Only
  | 'bank' // Bank Turnover Report Only
  | 'all_clients'; // All Clients Combined Financial Report

export interface FinancialReportData {
  client: Client;
  financialYear: FinancialYear;
  gstRows: {
    month: string;
    taxable: number;
    exempt: number;
    total: number;
    remark?: string;
  }[];
  gstTotals: {
    taxable: number;
    exempt: number;
    total: number;
  };
  bankAccounts: {
    slotNumber: BankAccountSlot;
    account: ClientBankAccount | null;
    monthlyTurnover: Record<string, number>;
    total: number;
  }[];
  totalBankTurnover: number;
}

// ==========================================
// OFFICE CLIENT ENTRY / VISIT REGISTER TYPES
// ==========================================
export type OfficeVisitStatus = 'IN' | 'OUT';
export type VisitorType = 'registered' | 'new';

export interface OfficeVisitNote {
  id: string;
  note: string;
  action_type: 'entry_in' | 'note_added' | 'marked_out' | 'details_updated';
  staff_id: number;
  staff_name: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
}

export interface OfficeVisit {
  id: number;
  visitor_type: VisitorType;
  client_id: number | null; // null if new visitor
  client_name: string;      // Contact / Visitor Person Name
  firm_name: string;        // Firm / Business Name
  gst_number: string;       // GSTIN or 'N/A'
  file_number: string;      // Physical File / Folder / Ledger No.
  mobile: string;           // Primary Mobile
  alternate_mobile?: string;
  client_type: string;      // 'Normal' | 'Composition' | 'QRMP' | 'Non-Registered' | 'Other'
  purpose: string;          // Main reason / service for visit
  current_remark: string;   // Latest active remark / running note
  visit_date: string;       // YYYY-MM-DD (e.g. 2026-08-30)
  financial_year_id: number;// FY Id
  financial_year_name?: string; // e.g. "2026-27"
  month: string;            // e.g. "August"
  in_time: string;          // e.g. "10:30 AM"
  out_time: string | null;  // e.g. "11:45 AM" or null if still in office
  status: OfficeVisitStatus;// 'IN' | 'OUT'
  entry_by_id: number;
  entry_by_name: string;
  out_marked_by_id: number | null;
  out_marked_by_name: string | null;
  remarks_log: OfficeVisitNote[];
  created_at: string;
  updated_at: string;
  updated_by_id: number;
  updated_by_name: string;
}

export const VISIT_PURPOSES = [
  'GST Return Filing / Discussion',
  'New GST Registration',
  'GST Notice / Assessment / Hearing',
  'Income Tax Return (ITR)',
  'Bank / Turnover Statement Discussion',
  'Document Submission / Collection',
  'Tax & Bill Payment / Challan',
  'Accounting & Bookkeeping Work',
  'Annual Audit & Balance Sheet',
  'General Consultation / Meeting',
  'Other Office Service',
] as const;

export type TabType =
  | 'dashboard'
  | 'clients'
  | 'office-visits'
  | 'monthly-work'
  | 'gst-turnover-entry'
  | 'gst-turnover-matrix'
  | 'bank-turnover'
  | 'reports'
  | 'financial-years'
  | 'users'
  | 'activity-logs'
  | 'import'
  | 'export'
  | 'settings';



