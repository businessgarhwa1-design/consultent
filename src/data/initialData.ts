import { Client, FinancialYear, MonthlyWork, User, WorkHistory, ActivityLog, AppSettings } from '../types';

export const initialUsers: User[] = [
  {
    id: 1,
    name: 'Administrator',
    email: 'admin@consultant.in',
    mobile: '9876543210',
    username: 'admin123',
    password_hash: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: admin
    role: 'admin',
    status: 'active',
    created_at: '2026-04-01 10:00:00',
    updated_at: '2026-04-01 10:00:00',
  },
];

const generate30YearsFYs = (): FinancialYear[] => {
  const list: FinancialYear[] = [];
  let id = 1;
  for (let y = 2024; y <= 2056; y++) {
    const nextY = y + 1;
    const displayName = `${y}-${String(nextY).slice(2)}`;
    list.push({
      id: id++,
      start_year: y,
      end_year: nextY,
      display_name: displayName,
      start_date: `${y}-04-01`,
      end_date: `${nextY}-03-31`,
      is_active: true,
    });
  }
  return list;
};

export const initialFinancialYears: FinancialYear[] = generate30YearsFYs();

export const initialClients: Client[] = [];

export const initialMonthlyWork: MonthlyWork[] = [];

export const initialWorkHistory: WorkHistory[] = [];

export const initialActivityLogs: ActivityLog[] = [];

export const initialSettings: AppSettings = {
  company_name: 'Consultant.in CA & GST Practice',
  admin_email: 'admin@consultant.in',
  default_fy_id: 2, // 2025-26
  default_month: 'August',
  timezone: 'Asia/Kolkata',
  date_format: 'DD-MM-YYYY',
  consultant: {
    consultant_name: 'Chartered Accountant / Tax Consultant',
    firm_name: 'Consultant.in CA & Tax Practice',
    designation: 'Chartered Accountant & GST Practitioner',
    registration_no: '',
    gstin: '',
    pan: '',
    email: 'admin@consultant.in',
    mobile: '',
    alternate_mobile: '',
    office_address: '',
    city: '',
    state: '',
    pin_code: '',
    website: '',
    specialization: 'GST Returns, Direct & Indirect Taxes, Audits & Financial Consultation',
    notes: '',
    updated_at: '2026-09-01 00:00:00',
  },
};
