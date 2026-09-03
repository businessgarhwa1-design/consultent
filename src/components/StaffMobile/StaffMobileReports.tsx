import React, { useState } from 'react';
import { Client, FinancialYear, MonthlyWork, User, OfficeVisit, FY_MONTHS, AppSettings, FinancialReportData } from '../../types';
import { GSTStorage } from '../../utils/storage';
import {
  FileSpreadsheet,
  FileDown,
  CalendarCheck2,
  Users,
  Calculator,
  ClipboardList,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import {
  generateMonthlyWorkReportPDF,
  generateMonthlyWorkReportCSV,
  generateAllClientsReportPDF,
  generateAllClientsGstTurnoverPDF,
  MonthlyWorkExportItem,
  MonthlyWorkFilterInfo,
  buildAllClientsGstTurnoverExportData,
} from '../../utils/pdfGenerator';
import { generateOfficeVisitPDF } from '../OfficeVisits/OfficeVisitPdfReport';

interface StaffMobileReportsProps {
  clients: Client[];
  monthlyWork: MonthlyWork[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  onSelectFY: (fy: FinancialYear) => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  users: User[];
  currentUser: User;
  officeVisits?: OfficeVisit[];
  settings?: AppSettings;
}

export const StaffMobileReports: React.FC<StaffMobileReportsProps> = ({
  clients,
  monthlyWork,
  financialYears,
  selectedFY,
  onSelectFY,
  selectedMonth,
  onSelectMonth,
  users,
  currentUser,
  officeVisits = [],
  settings,
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = (key: string, fn: () => void) => {
    setDownloading(key);
    setTimeout(() => {
      try {
        fn();
      } catch (err) {
        console.error('PDF error:', err);
      } finally {
        setDownloading(null);
      }
    }, 150);
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Top Header Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Reports & PDF Downloads</h1>
            <p className="text-[11px] text-slate-500 font-semibold">
              Active FY: <span className="font-bold text-blue-700">{selectedFY.display_name}</span> | Month: <span className="font-bold text-blue-700">{selectedMonth}</span>
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Report 1: Monthly GST Work Report */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">Monthly GST Filing Report</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete status of all client GST returns (Filed vs Pending) with remarks for {selectedMonth}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() =>
              handleDownload('monthly_pdf', () => {
                const items: MonthlyWorkExportItem[] = clients.map((client) => {
                  const work = monthlyWork.find(
                    (m) =>
                      m.client_id === client.id &&
                      m.financial_year_id === selectedFY.id &&
                      m.month === selectedMonth
                  );
                  const staff = users.find((u) => u.id === client.assigned_staff_id);
                  return {
                    client,
                    status: work?.status || 'Not Started',
                    remark: work?.remark || '',
                    staffName: staff?.name || 'Unassigned',
                    updatedAt: work?.updated_at,
                  };
                });

                const filterInfo: MonthlyWorkFilterInfo = {
                  statusFilter: 'all',
                  schemeFilter: 'all',
                  staffFilter: 'all',
                };

                generateMonthlyWorkReportPDF(selectedMonth, selectedFY, items, filterInfo);
              })
            }
            disabled={downloading === 'monthly_pdf'}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>{downloading === 'monthly_pdf' ? 'Generating...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleDownload('monthly_csv', () => {
                const items: MonthlyWorkExportItem[] = clients.map((client) => {
                  const work = monthlyWork.find(
                    (m) =>
                      m.client_id === client.id &&
                      m.financial_year_id === selectedFY.id &&
                      m.month === selectedMonth
                  );
                  const staff = users.find((u) => u.id === client.assigned_staff_id);
                  return {
                    client,
                    status: work?.status || 'Not Started',
                    remark: work?.remark || '',
                    staffName: staff?.name || 'Unassigned',
                    updatedAt: work?.updated_at,
                  };
                });

                const filterInfo: MonthlyWorkFilterInfo = {
                  statusFilter: 'all',
                  schemeFilter: 'all',
                  staffFilter: 'all',
                };

                generateMonthlyWorkReportCSV(selectedMonth, selectedFY, items, filterInfo);
              })
            }
            disabled={downloading === 'monthly_csv'}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{downloading === 'monthly_csv' ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Report 2: Master Clients Directory */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">Master Clients Directory (PDF)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Full client directory report with Firm names, GSTIN, Contact persons, Mobile numbers, and Schemes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            handleDownload('clients_pdf', () => {
              const allReports = clients
                .map((c) => GSTStorage.getFinancialReportData(c.id, selectedFY.id))
                .filter((r): r is FinancialReportData => r !== null);
              generateAllClientsReportPDF(
                allReports,
                selectedFY,
                'combined',
                settings?.company_name || 'TaxPro GST Consultancy & Services'
              );
            })
          }
          disabled={downloading === 'clients_pdf'}
          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          <span>{downloading === 'clients_pdf' ? 'Generating...' : 'Download Clients Directory PDF'}</span>
        </button>
      </div>

      {/* Report 3: 12-Month GST Turnover Report */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">12-Month GST Turnover Matrix (PDF)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Annual taxable and exempt turnover breakdown across all 12 months for FY {selectedFY.display_name}.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            handleDownload('turnover_pdf', () => {
              const turnoverData = buildAllClientsGstTurnoverExportData(
                clients,
                GSTStorage.getGstTurnover(),
                selectedFY
              );
              generateAllClientsGstTurnoverPDF(turnoverData, selectedFY);
            })
          }
          disabled={downloading === 'turnover_pdf'}
          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          <span>{downloading === 'turnover_pdf' ? 'Generating...' : 'Download GST Turnover PDF'}</span>
        </button>
      </div>

      {/* Report 4: Office Visitor Register */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">Office Visitor Register (PDF)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete log of all client visits, check-in/out times, and consultation notes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            handleDownload('visits_pdf', () =>
              generateOfficeVisitPDF(officeVisits, selectedFY, selectedMonth, settings)
            )
          }
          disabled={downloading === 'visits_pdf'}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          <span>{downloading === 'visits_pdf' ? 'Generating...' : 'Download Visitor Register PDF'}</span>
        </button>
      </div>
    </div>
  );
};
