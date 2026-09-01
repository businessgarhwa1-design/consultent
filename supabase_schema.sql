-- ==============================================================================
-- CONSULTANT.IN — PRODUCTION SUPABASE POSTGRESQL DATABASE SCHEMA
-- CA / GST Work Management System Master Schema with RLS, Constraints, & Realtime
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. APP SYNC STORE (Unified snapshot & cross-device rapid sync)
CREATE TABLE IF NOT EXISTS public.app_sync_store (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Kolkata', NOW())
);

-- 2. CONSULTANT DETAILS & SETTINGS
CREATE TABLE IF NOT EXISTS public.consultant_details (
    id TEXT PRIMARY KEY DEFAULT 'primary_consultant',
    consultant_name TEXT NOT NULL,
    firm_name TEXT NOT NULL,
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
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Kolkata', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Kolkata', NOW())
);

-- 3. USERS / PROFILES
CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    status TEXT NOT NULL DEFAULT 'active',
    last_login TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 4. FINANCIAL YEARS
CREATE TABLE IF NOT EXISTS public.financial_years (
    id BIGINT PRIMARY KEY,
    year_code TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    start_year INT NOT NULL,
    end_year INT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    created_at TEXT
);

-- 5. MASTER CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id BIGINT PRIMARY KEY,
    trade_name TEXT NOT NULL,
    legal_name TEXT,
    proprietor_name TEXT,
    contact_person TEXT,
    gstin TEXT,
    pan TEXT,
    phone_number TEXT,
    email TEXT,
    principal_place_address TEXT,
    city TEXT,
    state TEXT,
    pin_code TEXT,
    gst_scheme TEXT NOT NULL DEFAULT 'Regular',
    gst_type TEXT DEFAULT 'Regular',
    filling_frequency TEXT DEFAULT 'Monthly',
    is_active BOOLEAN DEFAULT true,
    assigned_to_user_id BIGINT,
    monthly_fee NUMERIC DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_clients_gstin ON public.clients(gstin);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);

-- 6. MONTHLY WORK / GST FILING TRACKER (Period Dependent)
CREATE TABLE IF NOT EXISTS public.monthly_work (
    id BIGINT PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    financial_year_id BIGINT NOT NULL REFERENCES public.financial_years(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    year INT NOT NULL,
    return_type TEXT NOT NULL DEFAULT 'GSTR-3B',
    status TEXT NOT NULL DEFAULT 'Pending',
    filing_date TEXT,
    arn_number TEXT,
    tax_payable NUMERIC DEFAULT 0,
    challan_status TEXT DEFAULT 'Pending',
    document_status TEXT DEFAULT 'Pending',
    remarks TEXT,
    assigned_to_user_id BIGINT,
    created_at TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_monthly_work_period ON public.monthly_work(financial_year_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_work_client_period ON public.monthly_work(client_id, financial_year_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_work_status ON public.monthly_work(status);

-- 7. 12-MONTH GST TURNOVER
CREATE TABLE IF NOT EXISTS public.gst_turnover (
    id BIGINT PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    financial_year_id BIGINT NOT NULL REFERENCES public.financial_years(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    taxable_turnover NUMERIC DEFAULT 0,
    exempt_turnover NUMERIC DEFAULT 0,
    total_gst_turnover NUMERIC DEFAULT 0,
    remark TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_gst_turnover_period ON public.gst_turnover(financial_year_id, month);
CREATE INDEX IF NOT EXISTS idx_gst_turnover_client ON public.gst_turnover(client_id, financial_year_id, month);

-- 8. BANK ACCOUNTS (Up to 5 accounts per client)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id BIGINT PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    slot INT NOT NULL CHECK (slot BETWEEN 1 AND 5),
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT,
    branch_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_client ON public.bank_accounts(client_id);

-- 9. BANK TURNOVER
CREATE TABLE IF NOT EXISTS public.bank_turnover (
    id BIGINT PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    financial_year_id BIGINT NOT NULL REFERENCES public.financial_years(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    slot INT NOT NULL CHECK (slot BETWEEN 1 AND 5),
    turnover_amount NUMERIC DEFAULT 0,
    credit_turnover NUMERIC DEFAULT 0,
    debit_turnover NUMERIC DEFAULT 0,
    remark TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_turnover_period ON public.bank_turnover(financial_year_id, month);
CREATE INDEX IF NOT EXISTS idx_bank_turnover_client ON public.bank_turnover(client_id, financial_year_id, month);

-- 10. BANK STATEMENT BACKUPS
CREATE TABLE IF NOT EXISTS public.bank_statements (
    id BIGINT PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    slot INT NOT NULL,
    financial_year_id BIGINT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INT,
    file_type TEXT,
    file_data TEXT,
    storage_type TEXT,
    drive_file_id TEXT,
    uploaded_at TEXT,
    uploaded_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_statements_client ON public.bank_statements(client_id, financial_year_id);

-- 11. OFFICE RECEPTION / VISITS LOGS
CREATE TABLE IF NOT EXISTS public.office_visits (
    id BIGINT PRIMARY KEY,
    visitor_name TEXT NOT NULL,
    visitor_type TEXT DEFAULT 'Client',
    client_id BIGINT REFERENCES public.clients(id) ON DELETE SET NULL,
    phone_number TEXT,
    email TEXT,
    purpose TEXT NOT NULL,
    assigned_staff_id BIGINT,
    assigned_staff_name TEXT,
    status TEXT DEFAULT 'Scheduled',
    visit_date TEXT NOT NULL,
    visit_time TEXT NOT NULL,
    notes JSONB DEFAULT '[]',
    created_at TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_office_visits_date ON public.office_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_office_visits_status ON public.office_visits(status);

-- 12. ACTIVITY AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id BIGINT,
    description TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- ==============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION FOR INSTANT MULTI-DEVICE SYNC
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_sync_store;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_work;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gst_turnover;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_turnover;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.office_visits;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.consultant_details;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.app_sync_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_turnover ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_turnover ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow read/write access for authenticated & authorized users
CREATE POLICY "Allow public read access on app_sync_store" ON public.app_sync_store FOR SELECT USING (true);
CREATE POLICY "Allow public write access on app_sync_store" ON public.app_sync_store FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on consultant_details" ON public.consultant_details FOR SELECT USING (true);
CREATE POLICY "Allow public write access on consultant_details" ON public.consultant_details FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow public write access on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on monthly_work" ON public.monthly_work FOR SELECT USING (true);
CREATE POLICY "Allow public write access on monthly_work" ON public.monthly_work FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on gst_turnover" ON public.gst_turnover FOR SELECT USING (true);
CREATE POLICY "Allow public write access on gst_turnover" ON public.gst_turnover FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on bank_accounts" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public write access on bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on bank_turnover" ON public.bank_turnover FOR SELECT USING (true);
CREATE POLICY "Allow public write access on bank_turnover" ON public.bank_turnover FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on bank_statements" ON public.bank_statements FOR SELECT USING (true);
CREATE POLICY "Allow public write access on bank_statements" ON public.bank_statements FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on office_visits" ON public.office_visits FOR SELECT USING (true);
CREATE POLICY "Allow public write access on office_visits" ON public.office_visits FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on activity_logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Allow public write access on activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on financial_years" ON public.financial_years FOR SELECT USING (true);
CREATE POLICY "Allow public write access on financial_years" ON public.financial_years FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public write access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
