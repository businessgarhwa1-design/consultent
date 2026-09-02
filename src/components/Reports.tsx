import React, { useState, useMemo } from 'react';
import {
  Client,
  FinancialYear,
  FY_MONTHS,
  MonthlyWork,
  User,
  ReportType,
  FinancialReportData,
} from '../types';
import { GSTStorage } from '../utils/storage';
import {
  generateClientReportPDF,
  generateAllClientsReportPDF,
  formatINRNumber,
  sanitizeFileName,
} from '../utils/pdfGenerator';
import {
  FileSpreadsheet,
  Printer,
  FileDown,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Landmark,
  FileText,
  Building2,
  ChevronRight,
  ShieldCheck,
  Eye,
  Download,
  Server,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Calculator,
  RefreshCw,
} from 'lucide-react';

interface ReportsProps {
  clients: Client[];
  monthlyWork: MonthlyWork[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  selectedMonth: string;
  users: User[];
  currentUser?: User;
  onExportCSV: () => void;
  onSelectFY?: (fy: FinancialYear) => void;
}

export const Reports: React.FC<ReportsProps> = ({
  clients,
  monthlyWork,
  financialYears,
  selectedFY,
  selectedMonth,
  users,
  currentUser,
  onExportCSV,
  onSelectFY,
}) => {
  // Navigation / Filter States
  const [reportFYId, setReportFYId] = useState<number>(selectedFY.id);
  const [selectedClientId, setSelectedClientId] = useState<string>('all'); // 'all' or numeric client id
  const [reportType, setReportType] = useState<ReportType>('combined');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'compliance_analytics' | 'hostinger_guide'>('preview');

  const activeClients = useMemo(() => clients.filter((c) => c.status === 'active'), [clients]);
  const currentFY = useMemo(
    () => financialYears.find((f) => f.id === reportFYId) || selectedFY,
    [financialYears, reportFYId, selectedFY]
  );

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return activeClients;
    const q = clientSearch.toLowerCase();
    return activeClients.filter(
      (c) =>
        c.firm_name.toLowerCase().includes(q) ||
        c.client_name.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q)
    );
  }, [activeClients, clientSearch]);

  // Selected single client object
  const singleClient = useMemo(() => {
    if (selectedClientId === 'all') return null;
    return clients.find((c) => c.id === Number(selectedClientId)) || null;
  }, [clients, selectedClientId]);

  // Compiled Report Data for single client
  const singleClientReport = useMemo<FinancialReportData | null>(() => {
    if (!singleClient) return null;
    return GSTStorage.getFinancialReportData(singleClient.id, currentFY.id);
  }, [singleClient, currentFY.id]);

  // Compiled Report Data for all clients
  const allClientsReports = useMemo<FinancialReportData[]>(() => {
    return activeClients
      .map((c) => GSTStorage.getFinancialReportData(c.id, currentFY.id))
      .filter((r): r is FinancialReportData => r !== null);
  }, [activeClients, currentFY.id]);

  // Portfolio Totals across all clients for chosen FY
  const portfolioSummary = useMemo(() => {
    let totalTaxable = 0;
    let totalExempt = 0;
    let totalGst = 0;
    let totalBank = 0;

    allClientsReports.forEach((r) => {
      totalTaxable += r.gstTotals.taxable;
      totalExempt += r.gstTotals.exempt;
      totalGst += r.gstTotals.total;
      totalBank += r.totalBankTurnover;
    });

    return {
      totalClients: allClientsReports.length,
      totalTaxable,
      totalExempt,
      totalGst,
      totalBank,
    };
  }, [allClientsReports]);

  // Handle Generate PDF Action
  const handleGeneratePDF = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
      try {
        const settings = GSTStorage.getSettings();
        const companyName = settings?.company_name || 'TaxPro GST Consultancy & Services';

        if (selectedClientId === 'all') {
          generateAllClientsReportPDF(allClientsReports, currentFY, reportType, companyName);
        } else if (singleClientReport) {
          generateClientReportPDF(singleClientReport, reportType, companyName);
        }
      } catch (err) {
        console.error('PDF Generation Error:', err);
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 200);
  };

  // Staff Workload stats for analytics tab
  const staffUsers = users.filter((u) => u.role === 'staff' && u.status === 'active');
  const currentMonthWork = monthlyWork.filter(
    (m) => m.financial_year_id === currentFY.id && m.month === selectedMonth
  );
  const workMap = new Map<number, MonthlyWork>();
  currentMonthWork.forEach((w) => workMap.set(w.client_id, w));

  const staffStats = staffUsers.map((staff) => {
    const assigned = activeClients.filter((c) => c.assigned_staff_id === staff.id);
    let completed = 0;
    let pending = 0;
    let notStarted = 0;

    assigned.forEach((c) => {
      const rec = workMap.get(c.id);
      const st = rec ? rec.status : 'Not Started';
      if (st === 'Completed') completed++;
      else if (st === 'Not Started') notStarted++;
      else pending++;
    });

    const pct = assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0;

    return {
      staff,
      total: assigned.length,
      completed,
      pending,
      notStarted,
      pct,
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Quick Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Financial Reports & Turnover Center</h2>
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
                  FY {currentFY.display_name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate professional PDF compliance reports for GST Monthly Turnover & 5 Bank Accounts.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'preview'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Turnover Reports & PDF
            </button>
            <button
              onClick={() => setActiveTab('compliance_analytics')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'compliance_analytics'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Filing Analytics
            </button>
            <button
              onClick={() => setActiveTab('hostinger_guide')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'hostinger_guide'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hostinger PHP & Dompdf
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Turnover Report Section */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Financial Year Selector (30 Years Support) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Financial Year (30+ Years Available)
                </label>
                <div className="relative">
                  <select
                    value={reportFYId}
                    onChange={(e) => {
                      const newId = Number(e.target.value);
                      setReportFYId(newId);
                      const fyObj = financialYears.find((f) => f.id === newId);
                      if (fyObj && onSelectFY) onSelectFY(fyObj);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden appearance-none cursor-pointer"
                  >
                    {[...financialYears]
                      .sort((a, b) => (GSTStorage.getFYSortOrder() === 'desc' ? b.start_year - a.start_year : a.start_year - b.start_year))
                      .map((fy) => (
                        <option key={fy.id} value={fy.id}>
                          FY {fy.display_name} {fy.id === selectedFY.id ? '(Active)' : ''}
                        </option>
                      ))}
                  </select>
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Client Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Select Client
                </label>
                <div className="relative">
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden appearance-none cursor-pointer"
                  >
                    <option value="all">📁 All Clients ({activeClients.length} Total)</option>
                    {activeClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firm_name} ({c.gstin || 'No GSTIN'})
                      </option>
                    ))}
                  </select>
                  <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Report Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  3. Report Type
                </label>
                <div className="relative">
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden appearance-none cursor-pointer"
                  >
                    <option value="combined">✨ Combined Bank + GST Report (Main)</option>
                    <option value="gst">📊 GST Turnover Report (Taxable + Exempt)</option>
                    <option value="bank">🏛️ Bank Turnover Report (5 Accounts)</option>
                    {selectedClientId === 'all' && (
                      <option value="all_clients">📑 All Clients Consolidated Report</option>
                    )}
                  </select>
                  <Layers className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPdf}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Generate & Download PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => window.print()}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                  title="Print Report"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  onClick={onExportCSV}
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                  title="Export CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. Report Live Preview Panel */}
          {selectedClientId === 'all' ? (
            /* ALL CLIENTS CONSOLIDATED VIEW */
            <div className="space-y-6">
              {/* Portfolio Master Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Total Active Clients
                  </div>
                  <div className="text-2xl font-black text-slate-900">{portfolioSummary.totalClients}</div>
                  <div className="text-[11px] text-blue-600 font-semibold mt-1">FY {currentFY.display_name}</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Total GST Turnover (Taxable + Exempt)
                  </div>
                  <div className="text-xl font-black text-blue-700">
                    {formatINRNumber(portfolioSummary.totalGst)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Taxable: {formatINRNumber(portfolioSummary.totalTaxable)}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Total Bank Turnover (All Slots)
                  </div>
                  <div className="text-xl font-black text-emerald-700">
                    {formatINRNumber(portfolioSummary.totalBank)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Across 5 Bank Accounts</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Export Filename
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800 break-all">
                    All_Clients_FY_{currentFY.display_name}_Turnover_Report.pdf
                  </div>
                  <button
                    onClick={handleGeneratePDF}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold mt-1 inline-flex items-center gap-1"
                  >
                    <span>Download Complete PDF</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Client List Master Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Consolidated Client Financial Overview (FY {currentFY.display_name})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Click any client row to inspect their individual 12-month GST & Bank turnover matrix.
                    </p>
                  </div>
                  <div className="w-64">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Client / Business</th>
                        <th className="px-4 py-3">GSTIN</th>
                        <th className="px-4 py-3 text-right">Taxable Turnover</th>
                        <th className="px-4 py-3 text-right">Exempt Turnover</th>
                        <th className="px-4 py-3 text-right">Total GST Turnover</th>
                        <th className="px-4 py-3 text-right">Total Bank Turnover</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClients.map((c, index) => {
                        const rep = GSTStorage.getFinancialReportData(c.id, currentFY.id);
                        const gstTotal = rep?.gstTotals.total || 0;
                        const bankTotal = rep?.totalBankTurnover || 0;

                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                            onClick={() => setSelectedClientId(String(c.id))}
                          >
                            <td className="px-4 py-3 font-mono text-slate-400">{index + 1}</td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{c.firm_name}</div>
                              <div className="text-[11px] text-slate-500">{c.client_name}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">{c.gstin || '-'}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-700">
                              {formatINRNumber(rep?.gstTotals.taxable || 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-700">
                              {formatINRNumber(rep?.gstTotals.exempt || 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-blue-700">
                              {formatINRNumber(gstTotal)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-700">
                              {formatINRNumber(bankTotal)}
                            </td>
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setSelectedClientId(String(c.id))}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-slate-700 font-semibold text-[11px] transition-colors"
                              >
                                View Report
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 uppercase tracking-wider text-slate-600">
                          Grand Total (FY {currentFY.display_name})
                        </td>
                        <td className="px-4 py-3 text-right text-slate-900">
                          {formatINRNumber(portfolioSummary.totalTaxable)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-900">
                          {formatINRNumber(portfolioSummary.totalExempt)}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-700 font-black">
                          {formatINRNumber(portfolioSummary.totalGst)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-black">
                          {formatINRNumber(portfolioSummary.totalBank)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* INDIVIDUAL CLIENT REPORT DETAILED VIEW */
            singleClientReport && (
              <div className="space-y-6">
                {/* Print/Preview Container */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                  {/* Top PDF Style Header */}
                  <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-blue-600">
                        TAXPRO GST CONSULTANCY & SERVICES
                      </div>
                      <h1 className="text-xl font-extrabold text-slate-900 mt-1">
                        CLIENT FINANCIAL TURNOVER COMPLIANCE REPORT
                      </h1>
                      <div className="text-xs text-slate-500 mt-1">
                        Consolidated GST monthly filings and 5 Bank accounts turnover statement.
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
                        Ready for Print / PDF Export
                      </span>
                      <div className="text-[11px] text-slate-500 mt-1">
                        File: {sanitizeFileName(singleClientReport.client.firm_name)}_FY_{currentFY.display_name}_Turnover_Report.pdf
                      </div>
                    </div>
                  </div>

                  {/* Client Info Grid */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Client / Firm Name</span>
                      <strong className="text-slate-900 text-sm block mt-0.5">
                        {singleClientReport.client.firm_name}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Proprietor / Contact</span>
                      <strong className="text-slate-900 block mt-0.5">
                        {singleClientReport.client.client_name || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">GSTIN Number</span>
                      <strong className="text-blue-700 font-mono block mt-0.5">
                        {singleClientReport.client.gstin || 'Not Registered'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Financial Year</span>
                      <strong className="text-slate-900 block mt-0.5">
                        FY {singleClientReport.financialYear.display_name}
                      </strong>
                    </div>
                  </div>

                  {/* 1. GST Monthly Turnover Table */}
                  {(reportType === 'combined' || reportType === 'gst') && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span>1. GST Monthly Turnover (Taxable & Exempt)</span>
                        </h3>
                        <span className="text-xs text-slate-500">
                          Total GST = Taxable Turnover + Exempt Turnover
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900 text-white text-[11px] font-bold uppercase">
                            <tr>
                              <th className="px-4 py-2.5">Month</th>
                              <th className="px-4 py-2.5 text-right">Taxable Turnover</th>
                              <th className="px-4 py-2.5 text-right">Exempt Turnover</th>
                              <th className="px-4 py-2.5 text-right">Total GST Turnover</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {singleClientReport.gstRows.map((row) => (
                              <tr key={row.month} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5 font-bold text-slate-800">{row.month}</td>
                                <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                                  {formatINRNumber(row.taxable)}
                                </td>
                                <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                                  {formatINRNumber(row.exempt)}
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-blue-700">
                                  {formatINRNumber(row.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-blue-50/80 border-t-2 border-blue-200 font-bold text-xs">
                            <tr>
                              <td className="px-4 py-3 text-blue-950 uppercase tracking-wider font-extrabold">
                                TOTAL GST TURNOVER
                              </td>
                              <td className="px-4 py-3 text-right text-slate-900">
                                {formatINRNumber(singleClientReport.gstTotals.taxable)}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-900">
                                {formatINRNumber(singleClientReport.gstTotals.exempt)}
                              </td>
                              <td className="px-4 py-3 text-right text-blue-700 text-sm font-black">
                                {formatINRNumber(singleClientReport.gstTotals.total)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 2. Bank Turnover Table (5 Bank Accounts) */}
                  {(reportType === 'combined' || reportType === 'bank') && (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-emerald-600" />
                          <span>2. Bank Turnover (Up to 5 Bank Accounts)</span>
                        </h3>
                        <span className="text-xs text-slate-500">
                          Total Bank Turnover = Sum of all 5 bank accounts
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900 text-white text-[11px] font-bold">
                            <tr>
                              <th className="px-3 py-2.5">Month</th>
                              {singleClientReport.bankAccounts.map((slot) => (
                                <th key={slot.slotNumber} className="px-3 py-2.5 text-right font-normal">
                                  <div className="font-bold text-white">
                                    Slot {slot.slotNumber}: {slot.account?.bank_name || 'Not Configured'}
                                  </div>
                                  <div className="text-[10px] text-slate-300">
                                    {slot.account
                                      ? `A/c ..${slot.account.account_number.slice(-4)}`
                                      : 'Available'}
                                  </div>
                                </th>
                              ))}
                              <th className="px-3 py-2.5 text-right font-bold text-emerald-300">
                                Monthly Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {FY_MONTHS.map((m) => {
                              let monthSum = 0;
                              return (
                                <tr key={m} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 font-bold text-slate-800">{m}</td>
                                  {singleClientReport.bankAccounts.map((slot) => {
                                    const amt = slot.monthlyTurnover[m] || 0;
                                    if (slot.account) monthSum += amt;
                                    return (
                                      <td key={slot.slotNumber} className="px-3 py-2 text-right text-slate-700">
                                        {slot.account ? formatINRNumber(amt) : '-'}
                                      </td>
                                    );
                                  })}
                                  <td className="px-3 py-2 text-right font-bold text-emerald-700">
                                    {formatINRNumber(monthSum)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-emerald-50/80 border-t-2 border-emerald-200 font-bold text-xs">
                            <tr>
                              <td className="px-3 py-3 text-emerald-950 uppercase tracking-wider font-extrabold">
                                ACCOUNT TOTALS
                              </td>
                              {singleClientReport.bankAccounts.map((slot) => (
                                <td key={slot.slotNumber} className="px-3 py-3 text-right text-slate-900">
                                  {slot.account ? formatINRNumber(slot.total) : '-'}
                                </td>
                              ))}
                              <td className="px-3 py-3 text-right text-emerald-700 text-sm font-black">
                                {formatINRNumber(singleClientReport.totalBankTurnover)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3. Final Financial Summary Cards */}
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-indigo-600" />
                      <span>3. Final Financial Turnover Summary</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* GST Summary Box */}
                      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2 text-xs">
                        <div className="font-bold text-blue-900 text-sm mb-2">GST Turnover Summary</div>
                        <div className="flex justify-between text-slate-600">
                          <span>Total Taxable Turnover:</span>
                          <strong className="text-slate-900">
                            {formatINRNumber(singleClientReport.gstTotals.taxable)}
                          </strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Total Exempt Turnover:</span>
                          <strong className="text-slate-900">
                            {formatINRNumber(singleClientReport.gstTotals.exempt)}
                          </strong>
                        </div>
                        <div className="pt-2 border-t border-blue-200 flex justify-between text-sm font-bold">
                          <span className="text-blue-950">Total GST Turnover:</span>
                          <span className="text-blue-700 font-black">
                            {formatINRNumber(singleClientReport.gstTotals.total)}
                          </span>
                        </div>
                      </div>

                      {/* Bank Summary Box */}
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2 text-xs">
                        <div className="font-bold text-emerald-900 text-sm mb-2">Bank Turnover Summary (5 Accounts)</div>
                        {singleClientReport.bankAccounts.map((slot) => (
                          <div key={slot.slotNumber} className="flex justify-between text-slate-600">
                            <span>
                              Bank Account {slot.slotNumber}{' '}
                              {slot.account ? `(${slot.account.bank_name})` : '(Not Configured)'}:
                            </span>
                            <strong className="text-slate-900">
                              {slot.account ? formatINRNumber(slot.total) : '₹ 0.00'}
                            </strong>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-emerald-200 flex justify-between text-sm font-bold">
                          <span className="text-emerald-950">Total Bank Turnover:</span>
                          <span className="text-emerald-700 font-black">
                            {formatINRNumber(singleClientReport.totalBankTurnover)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PDF Download Button Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedClientId('all')}
                      className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1"
                    >
                      ← Back to All Clients
                    </button>

                    <button
                      onClick={handleGeneratePDF}
                      disabled={isGeneratingPdf}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition-colors flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {singleClientReport.client.firm_name} PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* 3. Filing Analytics Tab */}
      {activeTab === 'compliance_analytics' && (
        <div className="space-y-6">
          {/* Staff Performance Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Staff Workload & Performance ({selectedMonth})</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3 text-center">Total Clients</th>
                    <th className="px-4 py-3 text-center">Completed</th>
                    <th className="px-4 py-3 text-center">Pending / In-Progress</th>
                    <th className="px-4 py-3 text-center">Not Started</th>
                    <th className="px-4 py-3" style={{ width: '30%' }}>
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffStats.map((st) => (
                    <tr key={st.staff.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{st.staff.name}</div>
                        <div className="text-[11px] text-slate-500">{st.staff.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">{st.total}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">{st.completed}</td>
                      <td className="px-4 py-3 text-center font-bold text-amber-600">{st.pending}</td>
                      <td className="px-4 py-3 text-center text-slate-400">{st.notStarted}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${st.pct}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-slate-800 text-[11px] w-10 text-right">
                            {st.pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Hostinger PHP & Dompdf Deployment Guide */}
      {activeTab === 'hostinger_guide' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Hostinger Shared Hosting + PHP Dompdf PDF Generator Guide
              </h3>
              <p className="text-xs text-slate-500">
                Complete instructions and production PHP scripts to generate reports on Hostinger.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs">1. Directory Structure on Hostinger (`public_html`)</h4>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto font-mono text-[11px]">
{`public_html/
├── reports/
│   ├── client-report.php       # Generates single client PDF via Dompdf
│   ├── all-clients-report.php  # Generates consolidated multi-client PDF
│   └── dompdf/                 # Dompdf library files (or via vendor/autoload.php)
├── uploads/
│   └── statements/             # Bank Statement ZIP backups (chmod 755)
└── config/
    └── db.php                  # Existing MySQL database connection`}
              </pre>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs">2. Installing Dompdf on Hostinger</h4>
              <p>
                <strong>Method A (With SSH / Composer):</strong> Run `composer require dompdf/dompdf` in your project root.
              </p>
              <p>
                <strong>Method B (Without Composer):</strong> Download Dompdf zip from GitHub, extract the `dompdf` folder into your `reports/dompdf` directory and require `autoload.inc.php`.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs">3. `reports/client-report.php` Server-Side Script</h4>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto font-mono text-[11px]">
{`<?php
session_start();
require_once '../config/db.php';
require_once '../vendor/autoload.php';

use Dompdf\\Dompdf;
use Dompdf\\Options;

// 1. Authentication & Permission Check
if (!isset($_SESSION['user_id'])) {
    header("Location: ../login.php");
    exit();
}

$client_id = intval($_GET['client_id'] ?? 0);
$fy = htmlspecialchars($_GET['fy'] ?? '2026-27');

// 2. Fetch Client & Check Permissions
$stmt = $pdo->prepare("SELECT * FROM clients WHERE id = ?");
$stmt->execute([$client_id]);
$client = $stmt->fetch();

if (!$client) {
    http_response_code(404);
    die("Client not found.");
}

// 3. Render HTML Table for Dompdf
ob_start();
?>
<html>
<head>
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px; }
    th { background-color: #1e3a8a; color: white; }
    .text-right { text-align: right; }
  </style>
</head>
<body>
  <h2>TaxPro GST Consultancy - Client Financial Report</h2>
  <p><strong>Client:</strong> <?= htmlspecialchars($client['firm_name']) ?> | <strong>GSTIN:</strong> <?= htmlspecialchars($client['gstin']) ?> | <strong>FY:</strong> <?= $fy ?></p>
  <!-- GST & Bank Tables rendered here -->
</body>
</html>
<?php
$html = ob_get_clean();

$options = new Options();
$options->set('isRemoteEnabled', true);
$dompdf = new Dompdf($options);
$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();
$dompdf->stream("{$client['firm_name']}_FY_{$fy}_Turnover_Report.pdf", ["Attachment" => true]);
?>`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
