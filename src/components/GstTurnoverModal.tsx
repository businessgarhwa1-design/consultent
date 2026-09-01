import React, { useState, useEffect, useMemo } from 'react';
import { Client, FinancialYear, FY_MONTHS, ClientGstTurnover, MonthlyWork as MonthlyWorkType } from '../types';
import { GSTStorage } from '../utils/storage';
import {
  X,
  Calculator,
  Save,
  CheckCircle2,
  Calendar,
  Building,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Download,
  Info,
  Layers,
  Percent,
  Search,
} from 'lucide-react';

interface GstTurnoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  initialClientId?: number | null;
  selectedFY: FinancialYear;
  financialYears: FinancialYear[];
  onSelectFY?: (fy: FinancialYear) => void;
  monthlyWork?: MonthlyWorkType[];
  onSaved?: () => void;
}

export const GstTurnoverModal: React.FC<GstTurnoverModalProps> = ({
  isOpen,
  onClose,
  clients,
  initialClientId,
  selectedFY,
  financialYears,
  onSelectFY,
  monthlyWork = [],
  onSaved,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<number>(
    initialClientId || (clients.length > 0 ? clients[0].id : 0)
  );
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [activeFYId, setActiveFYId] = useState<number>(selectedFY.id);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // 12-month inputs: { [month]: { taxable: string; exempt: string; remark: string } }
  const [monthlyInputs, setMonthlyInputs] = useState<
    Record<string, { taxable: string; exempt: string; remark: string }>
  >({});

  // Active client object
  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0];
  }, [clients, selectedClientId]);

  // Active FY object
  const activeFY = useMemo(() => {
    return financialYears.find((f) => f.id === activeFYId) || selectedFY;
  }, [financialYears, activeFYId, selectedFY]);

  // Filtered clients for quick switcher
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        (c.file_no && c.file_no.toLowerCase().includes(q)) ||
        c.firm_name.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        c.client_name.toLowerCase().includes(q) ||
        c.mobile.includes(q)
    );
  }, [clients, clientSearchQuery]);

  // Load turnover records when client or FY changes
  useEffect(() => {
    if (!isOpen || !selectedClientId) return;

    const turnovers = GSTStorage.getClientGstTurnover(selectedClientId, activeFYId);
    const inputs: Record<string, { taxable: string; exempt: string; remark: string }> = {};

    FY_MONTHS.forEach((month) => {
      const record = turnovers.find((t) => t.month === month);
      inputs[month] = {
        taxable: record && record.taxable_turnover > 0 ? String(record.taxable_turnover) : '',
        exempt: record && record.exempt_turnover > 0 ? String(record.exempt_turnover) : '',
        remark: record?.remark || '',
      };
    });

    setMonthlyInputs(inputs);
    setSaveStatus(null);
  }, [isOpen, selectedClientId, activeFYId]);

  // When initialClientId changes while open
  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

  // Format currency helper
  const formatINR = (val: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Input change handler
  const handleInputChange = (month: string, field: 'taxable' | 'exempt' | 'remark', value: string) => {
    if (field !== 'remark' && value && !/^\d*\.?\d*$/.test(value)) return;

    setMonthlyInputs((prev) => ({
      ...prev,
      [month]: {
        taxable: prev[month]?.taxable || '',
        exempt: prev[month]?.exempt || '',
        remark: prev[month]?.remark || '',
        [field]: value,
      },
    }));
  };

  // Calculations
  const getMonthTotal = (month: string) => {
    const data = monthlyInputs[month] || { taxable: '', exempt: '', remark: '' };
    const taxable = parseFloat(data.taxable) || 0;
    const exempt = parseFloat(data.exempt) || 0;
    return taxable + exempt;
  };

  const annualTaxableTotal = useMemo(() => {
    return FY_MONTHS.reduce((sum, m) => {
      return sum + (parseFloat(monthlyInputs[m]?.taxable) || 0);
    }, 0);
  }, [monthlyInputs]);

  const annualExemptTotal = useMemo(() => {
    return FY_MONTHS.reduce((sum, m) => {
      return sum + (parseFloat(monthlyInputs[m]?.exempt) || 0);
    }, 0);
  }, [monthlyInputs]);

  const annualGrandTotal = annualTaxableTotal + annualExemptTotal;
  const monthlyAverage = annualGrandTotal > 0 ? annualGrandTotal / 12 : 0;

  // Quarterly Breakdowns
  const quarters = [
    { label: 'Q1 (Apr - Jun)', months: ['April', 'May', 'June'] },
    { label: 'Q2 (Jul - Sep)', months: ['July', 'August', 'September'] },
    { label: 'Q3 (Oct - Dec)', months: ['October', 'November', 'December'] },
    { label: 'Q4 (Jan - Mar)', months: ['January', 'February', 'March'] },
  ];

  const getQuarterTotals = (months: string[]) => {
    const taxable = months.reduce((sum, m) => sum + (parseFloat(monthlyInputs[m]?.taxable) || 0), 0);
    const exempt = months.reduce((sum, m) => sum + (parseFloat(monthlyInputs[m]?.exempt) || 0), 0);
    return { taxable, exempt, total: taxable + exempt };
  };

  // Save handler
  const handleSave = () => {
    if (!activeClient) return;

    const dataToSave: Record<string, { taxable: number; exempt: number; remark?: string }> = {};
    FY_MONTHS.forEach((m) => {
      dataToSave[m] = {
        taxable: parseFloat(monthlyInputs[m]?.taxable) || 0,
        exempt: parseFloat(monthlyInputs[m]?.exempt) || 0,
        remark: monthlyInputs[m]?.remark?.trim() || '',
      };
    });

    GSTStorage.batchSaveClientGstTurnover(activeClient.id, activeFYId, dataToSave);

    setSaveStatus(`12-Month GST Turnover saved successfully for ${activeClient.firm_name}!`);
    if (onSaved) {
      onSaved();
    }
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Next / Previous client navigation for fast serial entry
  const clientIndex = clients.findIndex((c) => c.id === selectedClientId);
  const handlePrevClient = () => {
    if (clientIndex > 0) {
      setSelectedClientId(clients[clientIndex - 1].id);
    }
  };
  const handleNextClient = () => {
    if (clientIndex < clients.length - 1) {
      setSelectedClientId(clients[clientIndex + 1].id);
    }
  };

  // Quick action: Clear all inputs
  const handleClearAll = () => {
    if (window.confirm('Clear all 12-month turnover fields for this client?')) {
      const cleared: Record<string, { taxable: string; exempt: string; remark: string }> = {};
      FY_MONTHS.forEach((m) => {
        cleared[m] = { taxable: '', exempt: '', remark: '' };
      });
      setMonthlyInputs(cleared);
    }
  };

  // Quick action: Copy first month values to all months
  const handleCopyFirstMonth = () => {
    const firstTaxable = monthlyInputs['April']?.taxable || '';
    const firstExempt = monthlyInputs['April']?.exempt || '';
    const firstRemark = monthlyInputs['April']?.remark || '';
    if (!firstTaxable && !firstExempt && !firstRemark) {
      alert('Please enter April Taxable, Exempt or Remark first.');
      return;
    }
    const updated: Record<string, { taxable: string; exempt: string; remark: string }> = {};
    FY_MONTHS.forEach((m) => {
      updated[m] = { taxable: firstTaxable, exempt: firstExempt, remark: firstRemark };
    });
    setMonthlyInputs(updated);
  };

  // Export 12-Month Data to CSV
  const handleExportCSV = () => {
    if (!activeClient) return;
    const headers = 'Month,Taxable Sales (INR),Exempt Sales (INR),Total Sales (INR),Remark\n';
    const rows = FY_MONTHS.map((m) => {
      const tax = parseFloat(monthlyInputs[m]?.taxable) || 0;
      const ex = parseFloat(monthlyInputs[m]?.exempt) || 0;
      const rem = (monthlyInputs[m]?.remark || '').replace(/"/g, '""');
      return `${m},${tax},${ex},${tax + ex},"${rem}"`;
    }).join('\n');

    const summary = `\nAnnual Taxable Total,${annualTaxableTotal}\nAnnual Exempt Total,${annualExemptTotal}\nAnnual Grand Total,${annualGrandTotal}\n`;
    const csvContent = headers + rows + summary;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Turnover_${activeClient.firm_name.replace(/[^a-zA-Z0-9]/g, '_')}_FY_${activeFY.display_name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !activeClient) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div
        id="gst-turnover-modal-container"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-[#FAF6F0] p-4 border-b border-[#E8DCC4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#78350F] flex items-center justify-center text-[#FDFBF7] shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  12-Month GST Turnover Entry
                </h3>
                <span className="bg-[#E8DCC4] text-[#78350F] font-bold text-xs px-2 py-0.5 rounded-full border border-[#D4C3A3]">
                  FY {activeFY.display_name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manual entry of Monthly Taxable Sales & Exempt Sales with automatic annual calculations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Client Switcher arrows */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevClient}
                disabled={clientIndex <= 0}
                className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Client"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-semibold text-slate-600 px-2">
                {clientIndex + 1} / {clients.length}
              </span>
              <button
                type="button"
                onClick={handleNextClient}
                disabled={clientIndex >= clients.length - 1}
                className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next Client"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Client & FY Toolbar */}
        <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            {/* Client Dropdown */}
            <div className="flex-1 max-w-sm relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                Select Client
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78350F]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.file_no ? `[File #${c.file_no}] ` : ''}
                    {c.firm_name} ({c.gstin})
                  </option>
                ))}
              </select>
            </div>

            {/* Financial Year Selector */}
            <div className="w-36">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                Financial Year
              </label>
              <select
                value={activeFYId}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setActiveFYId(newId);
                  if (onSelectFY) {
                    const target = financialYears.find((f) => f.id === newId);
                    if (target) onSelectFY(target);
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#78350F] focus:outline-none focus:ring-2 focus:ring-[#78350F]"
              >
                {financialYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>
                    FY {fy.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Client Details Pill */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            {activeClient.file_no && (
              <span className="font-mono text-xs font-bold text-[#78350F] bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#E8DCC4]">
                📁 File #{activeClient.file_no}
              </span>
            )}
            <span className="font-bold text-slate-800">{activeClient.firm_name}</span>
            <span className="font-mono text-slate-500 text-[11px]">GSTIN: {activeClient.gstin}</span>
            <span className="capitalize px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
              {activeClient.gst_type}
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Notification banner on save */}
          {saveStatus && (
            <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{saveStatus}</span>
              </div>
              <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded text-emerald-100 font-mono">
                Saved to Local + Cloud
              </span>
            </div>
          )}

          {/* Grand Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FAF6F0] p-3 rounded-xl border border-[#E8DCC4]">
              <span className="text-[10px] font-bold text-[#78350F] uppercase tracking-wider block">
                Annual Taxable Sales
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 font-mono">
                {formatINR(annualTaxableTotal)}
              </div>
              <span className="text-[10px] text-slate-500">Total Taxable Sales</span>
            </div>

            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Annual Exempt Sales
              </span>
              <div className="text-base sm:text-lg font-black text-amber-900 mt-0.5 font-mono">
                {formatINR(annualExemptTotal)}
              </div>
              <span className="text-[10px] text-amber-700">Total Exempt Sales</span>
            </div>

            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
                Grand Total Turnover
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 font-mono">
                {formatINR(annualGrandTotal)}
              </div>
              <span className="text-[10px] text-slate-400">12-Month Total Turnover</span>
            </div>

            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                Average Monthly Sales
              </span>
              <div className="text-base sm:text-lg font-black text-blue-900 mt-0.5 font-mono">
                {formatINR(monthlyAverage)}
              </div>
              <span className="text-[10px] text-blue-600">Average Monthly Sales</span>
            </div>
          </div>

          {/* Quick Helper Tools */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Quick Tools:
              </span>

              <button
                type="button"
                onClick={handleCopyFirstMonth}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold text-[11px] cursor-pointer"
                title="Fill all months with April amount & remark"
              >
                Copy April to All Months
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold text-[11px] cursor-pointer"
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* 12-Month Table Grid */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6F0] border-b border-[#E8DCC4] text-[11px] font-bold text-[#78350F] uppercase">
                <tr>
                  <th className="px-4 py-2.5 w-32">Month</th>
                  <th className="px-4 py-2.5">Taxable Sales (₹)</th>
                  <th className="px-4 py-2.5">Exempt Sales (₹)</th>
                  <th className="px-4 py-2.5 text-right w-36">Total Sales (₹)</th>
                  <th className="px-3 py-2.5 min-w-[180px]">Monthly Remark (Apr - Mar)</th>
                  <th className="px-3 py-2.5 text-center w-28">GST Filing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FY_MONTHS.map((month, idx) => {
                  const mData = monthlyInputs[month] || { taxable: '', exempt: '', remark: '' };
                  const mTotal = getMonthTotal(month);
                  const isQuarterEnd = (idx + 1) % 3 === 0;
                  const quarterNum = Math.floor(idx / 3) + 1;
                  const currentQuarterMonths = quarters[quarterNum - 1].months;
                  const qTotals = getQuarterTotals(currentQuarterMonths);

                  // GST filing status for this month
                  const workRec = monthlyWork.find(
                    (w) =>
                      w.client_id === activeClient.id &&
                      w.financial_year_id === activeFYId &&
                      w.month === month
                  );
                  const workStatus = workRec ? workRec.status : 'Not Started';

                  return (
                    <React.Fragment key={month}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>{month}</span>
                        </td>

                        {/* Taxable Sales Input */}
                        <td className="px-4 py-1.5">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                              ₹
                            </span>
                            <input
                              type="text"
                              placeholder="0"
                              value={mData.taxable}
                              onChange={(e) => handleInputChange(month, 'taxable', e.target.value)}
                              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#78350F] focus:ring-1 focus:ring-[#78350F] rounded-lg pl-6 pr-3 py-1.5 text-xs font-mono font-bold text-slate-900 text-right focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* Exempt Sales Input */}
                        <td className="px-4 py-1.5">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                              ₹
                            </span>
                            <input
                              type="text"
                              placeholder="0"
                              value={mData.exempt}
                              onChange={(e) => handleInputChange(month, 'exempt', e.target.value)}
                              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-lg pl-6 pr-3 py-1.5 text-xs font-mono font-bold text-amber-900 text-right focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* Total Sales (Auto-computed) */}
                        <td className="px-4 py-2 text-right">
                          <span className="font-mono font-bold text-slate-900 text-xs px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 inline-block min-w-[110px]">
                            {formatINR(mTotal)}
                          </span>
                        </td>

                        {/* Monthly Remark Input */}
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            placeholder="Enter remark..."
                            value={mData.remark || ''}
                            onChange={(e) => handleInputChange(month, 'remark', e.target.value)}
                            className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#78350F] focus:ring-1 focus:ring-[#78350F] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
                          />
                        </td>

                        {/* GST Work Status */}
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              workStatus === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : workStatus === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {workStatus}
                          </span>
                        </td>
                      </tr>

                      {/* Quarterly Subtotal Row */}
                      {isQuarterEnd && (
                        <tr className="bg-[#FCF9F5] border-y border-[#E8DCC4] font-bold text-[11px] text-[#78350F]">
                          <td className="px-4 py-2 uppercase tracking-wider text-[#78350F]">
                            📊 Q{quarterNum} Subtotal
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            {formatINR(qTotals.taxable)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-amber-900">
                            {formatINR(qTotals.exempt)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-slate-900">
                            {formatINR(qTotals.total)}
                          </td>
                          <td colSpan={2} className="px-3 py-2 text-center text-[10px] text-slate-500">
                            Quarter {quarterNum} Subtotal
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {/* Annual Grand Total Footer */}
              <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-800">
                <tr>
                  <td className="px-4 py-3 uppercase tracking-wider text-blue-300">
                    Grand Annual Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white text-sm">
                    {formatINR(annualTaxableTotal)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-300 text-sm">
                    {formatINR(annualExemptTotal)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400 text-sm">
                    {formatINR(annualGrandTotal)}
                  </td>
                  <td colSpan={2} className="px-3 py-3 text-center text-[10px] text-slate-400">
                    12 Months Total
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Turnover automatically syncs with Client Profiles, Financial Reports & GST Audits.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#78350F] hover:bg-[#92400E] text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save 12-Month GST Turnover</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
