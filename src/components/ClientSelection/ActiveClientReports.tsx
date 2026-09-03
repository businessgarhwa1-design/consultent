import React, { useState, useMemo } from 'react';
import {
  Client,
  FinancialYear,
  FY_MONTHS,
  ReportType,
  FinancialReportData,
} from '../../types';
import { GSTStorage } from '../../utils/storage';
import { generateClientReportPDF } from '../../utils/pdfGenerator';
import {
  FileText,
  Printer,
  Download,
  FileSpreadsheet,
  Building,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Landmark,
  Calculator,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ActiveClientReportsProps {
  client: Client;
  financialYear: FinancialYear;
  selectedMonth: string; // 'All' | 'April' | ... | 'March'
  onSelectMonth?: (month: string) => void;
}

export const ActiveClientReports: React.FC<ActiveClientReportsProps> = ({
  client,
  financialYear,
  selectedMonth,
  onSelectMonth,
}) => {
  const [reportType, setReportType] = useState<ReportType>('combined');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Compile Financial Report Data for Active Client & Selected FY
  const reportData = useMemo(() => {
    return GSTStorage.getFinancialReportData(client.id, financialYear.id);
  }, [client.id, financialYear.id]);

  // Format currency
  const formatINR = (val: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Handle PDF Download
  const handleDownloadPDF = () => {
    if (!reportData) return;
    setIsGeneratingPdf(true);
    try {
      const settings = GSTStorage.getSettings();
      const companyName = settings?.company_name || 'TaxPro GST Consultancy';
      generateClientReportPDF(reportData, reportType, companyName);
    } catch (e) {
      console.error('Error generating PDF:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Export CSV for this client
  const handleExportCSV = () => {
    if (!reportData) return;
    let csv = `Client Report,${client.firm_name}\n`;
    csv += `File Number,${client.file_no || 'N/A'}\n`;
    csv += `GSTIN,${client.gstin}\n`;
    csv += `Financial Year,${financialYear.display_name}\n\n`;

    csv += `GST Turnover (April to March)\n`;
    csv += `Month,Taxable Turnover,Exempt Turnover,Total GST Turnover\n`;
    reportData.gstRows.forEach((r) => {
      csv += `"${r.month}",${r.taxable},${r.exempt},${r.total}\n`;
    });
    csv += `Total,${reportData.gstTotals.taxable},${reportData.gstTotals.exempt},${reportData.gstTotals.total}\n\n`;

    csv += `Bank Turnover\n`;
    const bankHeaders = reportData.bankAccounts
      .filter((b) => b.account)
      .map((b) => `"${b.account?.bank_name} (Slot #${b.slotNumber})"`);
    csv += `Month,${bankHeaders.join(',')},Total Bank Turnover\n`;

    FY_MONTHS.forEach((m) => {
      const amounts = reportData.bankAccounts
        .filter((b) => b.account)
        .map((b) => b.monthlyTurnover[m] || 0);
      const rowSum = amounts.reduce((a, c) => a + c, 0);
      csv += `"${m}",${amounts.join(',')},${rowSum}\n`;
    });
    csv += `Grand Total,,,${reportData.totalBankTurnover}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute(
      'href',
      url
    );
    link.setAttribute(
      'download',
      `${client.firm_name.replace(/[^a-zA-Z0-9]/g, '_')}_Report_FY_${financialYear.display_name}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!reportData) {
    return (
      <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <div className="text-xs font-bold text-slate-700">No Report Data Available</div>
        <p className="text-[11px] text-slate-500 mt-1">
          Unable to compile report for {client.firm_name} in FY {financialYear.display_name}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Control Bar: Report Type Pills + Actions */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Report Type Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setReportType('combined')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              reportType === 'combined'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Combined Statement
          </button>
          <button
            type="button"
            onClick={() => setReportType('gst')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              reportType === 'gst'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GST Turnover Only
          </button>
          <button
            type="button"
            onClick={() => setReportType('bank')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              reportType === 'bank'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bank Turnover Only
          </button>
        </div>

        {/* Action Buttons: PDF, Print, CSV */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Download PDF Report for Active Client"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
            title="Export CSV Data"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Live In-Page Report Document Preview */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
              Tax Consultant Financial Statement
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-0.5">{client.firm_name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
              <span>GSTIN: <strong className="font-mono text-slate-800">{client.gstin}</strong></span>
              <span>•</span>
              <span>File No: <strong className="text-slate-800">{client.file_no || 'N/A'}</strong></span>
              <span>•</span>
              <span>Scheme: <strong className="text-slate-800 uppercase">{client.gst_type || 'Normal'}</strong></span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Assessment Year / FY
            </span>
            <span className="text-base font-black text-slate-900 block mt-0.5">
              FY {financialYear.display_name}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Generated in Active Client Workspace
            </span>
          </div>
        </div>

        {/* Turnover Summary KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
            <span className="text-[10px] font-bold uppercase text-blue-600 block">Total GST Turnover</span>
            <span className="text-lg font-black text-blue-950 block mt-0.5">
              {formatINR(reportData.gstTotals.total)}
            </span>
            <span className="text-[10px] text-blue-600 mt-0.5 block">
              Taxable: {formatINR(reportData.gstTotals.taxable)} • Exempt: {formatINR(reportData.gstTotals.exempt)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase text-emerald-600 block">Total Bank Turnover</span>
            <span className="text-lg font-black text-emerald-950 block mt-0.5">
              {formatINR(reportData.totalBankTurnover)}
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">
              Across {reportData.bankAccounts.filter((b) => b.account).length} registered bank accounts
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
            <span className="text-[10px] font-bold uppercase text-purple-600 block">Variance (Bank - GST)</span>
            <span className="text-lg font-black text-purple-950 block mt-0.5">
              {formatINR(reportData.totalBankTurnover - reportData.gstTotals.total)}
            </span>
            <span className="text-[10px] text-purple-600 mt-0.5 block">
              Audit & reconciliation indicator
            </span>
          </div>
        </div>

        {/* GST Turnover Table (If combined or gst) */}
        {(reportType === 'combined' || reportType === 'gst') && (
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              <span>GST Turnover Statement (April – March)</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2 px-3">Month</th>
                    <th className="py-2 px-3 text-right">Taxable Turnover</th>
                    <th className="py-2 px-3 text-right">Exempt Turnover</th>
                    <th className="py-2 px-3 text-right bg-slate-200/70 font-black text-slate-900">Total GST Turnover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.gstRows.map((r) => (
                    <tr key={r.month} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 font-semibold text-slate-800">{r.month}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-slate-700">{formatINR(r.taxable)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-slate-700">{formatINR(r.exempt)}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50">
                        {formatINR(r.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="py-2 px-3 uppercase text-[10px]">Total</td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(reportData.gstTotals.taxable)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(reportData.gstTotals.exempt)}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-400 bg-slate-950 font-black">
                      {formatINR(reportData.gstTotals.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Bank Turnover Table (If combined or bank) */}
        {(reportType === 'combined' || reportType === 'bank') && (
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bank Turnover Statement (April – March)</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2 px-3">Month</th>
                    {reportData.bankAccounts
                      .filter((b) => b.account)
                      .map((b) => (
                        <th key={b.slotNumber} className="py-2 px-3 text-right">
                          <div>{b.account?.bank_name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">Slot #{b.slotNumber}</div>
                        </th>
                      ))}
                    <th className="py-2 px-3 text-right bg-slate-200/70 font-black text-slate-900">Total Bank Turnover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {FY_MONTHS.map((m) => {
                    const rowAmounts = reportData.bankAccounts
                      .filter((b) => b.account)
                      .map((b) => b.monthlyTurnover[m] || 0);
                    const rowSum = rowAmounts.reduce((a, c) => a + c, 0);

                    return (
                      <tr key={m} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-semibold text-slate-800">{m}</td>
                        {reportData.bankAccounts
                          .filter((b) => b.account)
                          .map((b) => (
                            <td key={b.slotNumber} className="py-1.5 px-3 text-right font-mono text-slate-700">
                              {formatINR(b.monthlyTurnover[m] || 0)}
                            </td>
                          ))}
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50">
                          {formatINR(rowSum)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="py-2 px-3 uppercase text-[10px]">Total</td>
                    {reportData.bankAccounts
                      .filter((b) => b.account)
                      .map((b) => (
                        <td key={b.slotNumber} className="py-2 px-3 text-right font-mono">
                          {formatINR(b.total)}
                        </td>
                      ))}
                    <td className="py-2 px-3 text-right font-mono text-emerald-400 bg-slate-950 font-black">
                      {formatINR(reportData.totalBankTurnover)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
