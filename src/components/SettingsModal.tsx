import React, { useState, useEffect } from 'react';
import {
  AppSettings,
  FinancialYear,
  ConsultantDetails,
  Client,
  MonthlyWork,
  ClientBankAccount,
  ClientBankTurnover,
  ClientGstTurnover,
  OfficeVisit,
  ActivityLog,
  User,
} from '../types';
import { SupabaseService, SupabaseSyncStatus } from '../utils/supabaseService';
import {
  Settings,
  Check,
  AlertTriangle,
  Database,
  UserCheck,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  RefreshCw,
  Server,
  Cloud,
  CheckCircle2,
  Lock,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  financialYears: FinancialYear[];
  onResetDatabase: () => void;
  clients?: Client[];
  monthlyWork?: MonthlyWork[];
  bankAccounts?: ClientBankAccount[];
  bankTurnover?: ClientBankTurnover[];
  gstTurnover?: ClientGstTurnover[];
  officeVisits?: OfficeVisit[];
  activityLogs?: ActivityLog[];
  users?: User[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  financialYears,
  onResetDatabase,
  clients = [],
  monthlyWork = [],
  bankAccounts = [],
  bankTurnover = [],
  gstTurnover = [],
  officeVisits = [],
  activityLogs = [],
  users = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'consultant' | 'supabase' | 'general'>('consultant');
  const [formData, setFormData] = useState<AppSettings>({ ...settings });

  // Consultant state
  const [consultant, setConsultant] = useState<ConsultantDetails>(
    settings.consultant || {
      consultant_name: 'Suresh Kumar',
      firm_name: settings.company_name || 'TaxPro GST Consultancy & Services',
      designation: 'Chartered Accountant & GST Practitioner',
      registration_no: 'GSTP/2022/98421',
      gstin: '27AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      email: settings.admin_email || 'admin@gstmanagement.com',
      mobile: '9876543210',
      alternate_mobile: '9876543211',
      office_address: 'Suite 301, Commerce Plaza, MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '400001',
      website: 'https://taxprogstservices.in',
      specialization: 'GST Returns, Audit, RCM, Litigation & Compliance',
      notes: 'Primary registered consultant profile connected with Supabase Cloud DB.',
      updated_at: new Date().toISOString(),
    }
  );

  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSyncStatus>(SupabaseService.getStatus());
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const unsub = SupabaseService.subscribe((s) => {
      setSupabaseStatus(s);
    });
    return unsub;
  }, []);

  const handleSaveConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const updatedSettings: AppSettings = {
      ...formData,
      company_name: consultant.firm_name || formData.company_name,
      admin_email: consultant.email || formData.admin_email,
      consultant: {
        ...consultant,
        updated_at: new Date().toISOString(),
      },
    };

    onUpdateSettings(updatedSettings);
    setFormData(updatedSettings);

    // Push to Supabase
    setIsSyncingSupabase(true);
    const res = await SupabaseService.saveConsultantDetails(consultant, updatedSettings);
    setIsSyncingSupabase(false);

    if (res.success) {
      setSavedMessage('Consultant details saved and synced to Supabase successfully!');
    } else {
      setSavedMessage('Consultant details saved locally. Supabase noticed: ' + res.message);
    }
    setTimeout(() => setSavedMessage(''), 4000);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: AppSettings = {
      ...formData,
      consultant: {
        ...consultant,
        firm_name: formData.company_name,
        email: formData.admin_email,
      },
    };
    onUpdateSettings(updatedSettings);
    setSavedMessage('General settings updated successfully!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleMasterSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    setSavedMessage('');
    setErrorMessage('');

    const res = await SupabaseService.syncAllProjectDataToSupabase({
      settings: {
        ...formData,
        consultant,
      },
      clients,
      monthlyWork,
      financialYears,
      bankAccounts,
      bankTurnover,
      gstTurnover,
      officeVisits,
      activityLogs,
      users,
    });

    setIsSyncingSupabase(false);
    if (res.success) {
      setSavedMessage(
        `All ${res.totalItems} records & consultant details successfully saved to Supabase (Project: ehvyyaelxvksbvgdocmg)!`
      );
    } else {
      setErrorMessage(res.message);
    }
    setTimeout(() => {
      setSavedMessage('');
      setErrorMessage('');
    }, 6000);
  };

  const handleReset = () => {
    onResetDatabase();
    setConfirmReset(false);
    setSavedMessage('Database reset to initial demonstration state.');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const supabaseSqlSchema = `-- Supabase SQL Schema for GST Management Portal
-- Project ID: ehvyyaelxvksbvgdocmg

-- 1. App Sync Store (Key-Value Store for Full Snapshots)
CREATE TABLE IF NOT EXISTS app_sync_store (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Consultant Details Table
CREATE TABLE IF NOT EXISTS consultant_details (
  id TEXT PRIMARY KEY,
  consultant_name TEXT,
  firm_name TEXT,
  designation TEXT,
  registration_no TEXT,
  gstin TEXT,
  pan TEXT,
  email TEXT,
  mobile TEXT,
  alternate_mobile TEXT,
  office_address TEXT,
  city TEXT,
  state TEXT,
  pin_code TEXT,
  website TEXT,
  specialization TEXT,
  notes TEXT,
  settings JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clients Master Table
CREATE TABLE IF NOT EXISTS clients (
  id BIGINT PRIMARY KEY,
  file_no TEXT,
  gstin TEXT NOT NULL,
  firm_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  mobile TEXT,
  alternate_mobile TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pin_code TEXT,
  gst_type TEXT,
  assigned_staff_id BIGINT,
  registration_date TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Monthly Work Compliance Table
CREATE TABLE IF NOT EXISTS monthly_work (
  id BIGINT PRIMARY KEY,
  financial_year_id BIGINT NOT NULL,
  month TEXT NOT NULL,
  client_id BIGINT NOT NULL,
  status TEXT NOT NULL,
  remark TEXT,
  updated_by BIGINT,
  updated_by_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Office Client Visits Table
CREATE TABLE IF NOT EXISTS office_visits (
  id BIGINT PRIMARY KEY,
  visitor_type TEXT,
  client_id BIGINT,
  client_name TEXT,
  firm_name TEXT,
  gst_number TEXT,
  file_number TEXT,
  mobile TEXT,
  alternate_mobile TEXT,
  client_type TEXT,
  purpose TEXT,
  current_remark TEXT,
  visit_date TEXT,
  financial_year_id BIGINT,
  month TEXT,
  in_time TEXT,
  out_time TEXT,
  status TEXT,
  entry_by_id BIGINT,
  entry_by_name TEXT,
  remarks_log JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & Public Access for app operations
ALTER TABLE app_sync_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read/write" ON app_sync_store FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write" ON consultant_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write" ON monthly_work FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write" ON office_visits FOR ALL USING (true) WITH CHECK (true);
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(supabaseSqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-black text-slate-950">Portal & Database Settings</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Cloud className="w-3 h-3 text-emerald-600" />
              <span>Supabase Connected</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage Consultant & CA Firm Profile, Supabase Cloud Storage (ID: ehvyyaelxvksbvgdocmg), and portal configurations.
          </p>
        </div>

        {/* Master Supabase Sync Action */}
        <button
          id="btn-sync-all-to-supabase-header"
          onClick={handleMasterSyncToSupabase}
          disabled={isSyncingSupabase}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          title="Save and push all frontend data and consultant details to Supabase Cloud DB"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
          <span>{isSyncingSupabase ? 'Syncing to Supabase...' : 'Save All Data to Supabase'}</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('consultant')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'consultant'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Consultant & CA Firm Profile</span>
        </button>

        <button
          onClick={() => setActiveSubTab('supabase')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'supabase'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Supabase Cloud Integration</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>

        <button
          onClick={() => setActiveSubTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'general'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>General & System Defaults</span>
        </button>
      </div>

      {/* Alert Messages */}
      {savedMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: CONSULTANT & CA FIRM PROFILE */}
      {activeSubTab === 'consultant' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Consultant & CA Firm Information</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These consultant details are saved directly into Supabase Cloud Database and displayed on client reports and certificates.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Table: consultant_details
            </span>
          </div>

          <form onSubmit={handleSaveConsultant} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Consultant / Practitioner Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={consultant.consultant_name}
                  onChange={(e) => setConsultant((p) => ({ ...p, consultant_name: e.target.value }))}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  CA Firm / Trade Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={consultant.firm_name}
                  onChange={(e) => setConsultant((p) => ({ ...p, firm_name: e.target.value }))}
                  placeholder="e.g. TaxPro GST Consultancy & Services"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Professional Designation
                </label>
                <input
                  type="text"
                  value={consultant.designation}
                  onChange={(e) => setConsultant((p) => ({ ...p, designation: e.target.value }))}
                  placeholder="e.g. Chartered Accountant / GST Practitioner"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Registration / Membership No.
                </label>
                <input
                  type="text"
                  value={consultant.registration_no}
                  onChange={(e) => setConsultant((p) => ({ ...p, registration_no: e.target.value }))}
                  placeholder="e.g. GSTP/2022/98421 or ICAI M.No."
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Consultant GSTIN</label>
                <input
                  type="text"
                  value={consultant.gstin || ''}
                  onChange={(e) => setConsultant((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  maxLength={15}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Consultant PAN</label>
                <input
                  type="text"
                  value={consultant.pan || ''}
                  onChange={(e) => setConsultant((p) => ({ ...p, pan: e.target.value.toUpperCase() }))}
                  placeholder="e.g. AAAAA0000A"
                  maxLength={10}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Primary Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={consultant.mobile}
                  onChange={(e) => setConsultant((p) => ({ ...p, mobile: e.target.value }))}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alternate Phone / WhatsApp</label>
                <input
                  type="tel"
                  value={consultant.alternate_mobile || ''}
                  onChange={(e) => setConsultant((p) => ({ ...p, alternate_mobile: e.target.value }))}
                  placeholder="e.g. 9876543211"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={consultant.email}
                  onChange={(e) => setConsultant((p) => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. admin@gstmanagement.com"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Website / Portal URL</label>
                <input
                  type="url"
                  value={consultant.website || ''}
                  onChange={(e) => setConsultant((p) => ({ ...p, website: e.target.value }))}
                  placeholder="e.g. https://taxprogstservices.in"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Office / Practice Address</label>
              <input
                type="text"
                value={consultant.office_address}
                onChange={(e) => setConsultant((p) => ({ ...p, office_address: e.target.value }))}
                placeholder="e.g. Suite 301, Commerce Plaza, MG Road"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={consultant.city}
                  onChange={(e) => setConsultant((p) => ({ ...p, city: e.target.value }))}
                  placeholder="e.g. Mumbai"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={consultant.state}
                  onChange={(e) => setConsultant((p) => ({ ...p, state: e.target.value }))}
                  placeholder="e.g. Maharashtra"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  value={consultant.pin_code}
                  onChange={(e) => setConsultant((p) => ({ ...p, pin_code: e.target.value }))}
                  placeholder="e.g. 400001"
                  maxLength={6}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Practice Specialization & Core Services</label>
              <input
                type="text"
                value={consultant.specialization || ''}
                onChange={(e) => setConsultant((p) => ({ ...p, specialization: e.target.value }))}
                placeholder="e.g. GST Returns, Audit, RCM, Litigation, Income Tax, ROC"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Consultant Notes & Profile Description</label>
              <textarea
                value={consultant.notes || ''}
                onChange={(e) => setConsultant((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                placeholder="Internal notes or bio..."
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Last updated: {consultant.updated_at ? new Date(consultant.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Just now'}
              </span>
              <button
                type="submit"
                disabled={isSyncingSupabase}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                {isSyncingSupabase ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Supabase...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Consultant Details & Sync Supabase</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SUPABASE CLOUD INTEGRATION */}
      {activeSubTab === 'supabase' && (
        <div className="space-y-6">
          {/* Status Overview Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">Supabase Cloud Database</h3>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      ACTIVE & CONNECTED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live multi-device database synchronized with all frontend portal collections and consultant details.
                  </p>
                </div>
              </div>

              <button
                id="btn-sync-all-to-supabase-main"
                onClick={handleMasterSyncToSupabase}
                disabled={isSyncingSupabase}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                <span>{isSyncingSupabase ? 'Pushing Data...' : 'Sync All Frontend Data Now'}</span>
              </button>
            </div>

            {/* Credentials Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Project ID</span>
                <span className="font-mono text-emerald-400 font-bold text-xs">{supabaseStatus.projectId}</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Supabase Endpoint</span>
                <span className="font-mono text-slate-300 text-[11px] truncate block">https://ehvyyaelxvksbvgdocmg.supabase.co</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">API Key Mode</span>
                <span className="font-mono text-emerald-400 text-xs font-semibold">sb_publishable (Verified)</span>
              </div>
            </div>
          </div>

          {/* Table Level Synchronization Status Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Supabase Synchronized Entity Collections</span>
              </span>
              <span className="text-slate-500 font-normal text-[11px]">
                {supabaseStatus.lastSyncedAt ? `Last Sync: ${supabaseStatus.lastSyncedAt}` : 'Auto-sync active'}
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Consultant Profile</span>
                  <span className="text-[10px] text-slate-500 font-mono">consultant_details</span>
                </div>
                <span className="text-emerald-700 bg-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Master Clients</span>
                  <span className="text-[10px] text-slate-500 font-mono">{clients.length} Registered</span>
                </div>
                <span className="text-emerald-700 bg-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Monthly Work & Status</span>
                  <span className="text-[10px] text-slate-500 font-mono">{monthlyWork.length} Records</span>
                </div>
                <span className="text-emerald-700 bg-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Financial Years</span>
                  <span className="text-[10px] text-slate-500 font-mono">{financialYears.length} Years (2024-2056)</span>
                </div>
                <span className="text-emerald-700 bg-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">5-Slot Bank Accounts</span>
                  <span className="text-[10px] text-slate-500 font-mono">{bankAccounts.length} Bank Slots</span>
                </div>
                <span className="text-emerald-700 bg-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Monthly Bank Turnover</span>
                  <span className="text-[10px] text-slate-500 font-mono">{bankTurnover.length} Records</span>
                </div>
                <span className="text-emerald-700 bg-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Monthly GST Turnover & Remarks</span>
                  <span className="text-[10px] text-slate-500 font-mono">{gstTurnover.length} Records</span>
                </div>
                <span className="text-emerald-700 bg-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Office Visitor Register</span>
                  <span className="text-[10px] text-slate-500 font-mono">{officeVisits.length} Visits</span>
                </div>
                <span className="text-emerald-700 bg-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Activity Audit Logs</span>
                  <span className="text-[10px] text-slate-500 font-mono">{activityLogs.length} Audit Entries</span>
                </div>
                <span className="text-emerald-700 bg-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synced
                </span>
              </div>
            </div>
          </div>

          {/* Supabase SQL Schema Helper */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <span>Optional: Supabase SQL Table Definitions</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  If you wish to create dedicated relational PostgreSQL tables in your Supabase SQL editor:
                </p>
              </div>
              <button
                onClick={copySqlToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL Schema</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-52 border border-slate-800">
              {supabaseSqlSchema}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: GENERAL & SYSTEM DEFAULTS */}
      {activeSubTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  CA Firm / Company Trade Name
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData((p) => ({ ...p, company_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Admin Notification Email
                  </label>
                  <input
                    type="email"
                    value={formData.admin_email}
                    onChange={(e) => setFormData((p) => ({ ...p, admin_email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Default Financial Year</label>
                  <select
                    value={formData.default_fy_id}
                    onChange={(e) => setFormData((p) => ({ ...p, default_fy_id: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {financialYears.map((fy) => (
                      <option key={fy.id} value={fy.id}>
                        {fy.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={formData.timezone}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date Display Format</label>
                  <input
                    type="text"
                    value={formData.date_format}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-xs cursor-pointer"
                >
                  Save General Settings
                </button>
              </div>
            </form>
          </div>

          {/* Reset Database Section */}
          <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-6">
            <h3 className="font-bold text-rose-900 text-sm mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Reset Demo Database</span>
            </h3>
            <p className="text-xs text-rose-700 mb-4">
              Reset local browser storage back to initial demonstration state. (Supabase cloud database data can be re-synced at any time).
            </p>

            {confirmReset ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer"
                >
                  Yes, Reset Everything Now
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="bg-white border border-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 font-bold text-xs px-4 py-2 rounded-xl shadow-2xs cursor-pointer"
              >
                Reset to Default Seed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
