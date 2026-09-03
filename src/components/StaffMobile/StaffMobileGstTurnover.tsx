import React, { useState, useEffect, useMemo } from 'react';
import { Client, FinancialYear, FY_MONTHS, User } from '../../types';
import { GSTStorage } from '../../utils/storage';
import { Calculator, Save, FileDown, CheckCircle2, ChevronDown, Building, RefreshCw } from 'lucide-react';
import { generateAllClientsGstTurnoverPDF, buildAllClientsGstTurnoverExportData } from '../../utils/pdfGenerator';

interface StaffMobileGstTurnoverProps {
  clients: Client[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  onSelectFY: (fy: FinancialYear) => void;
  currentUser: User;
  initialClientId?: number | null;
  onRefreshPortal?: () => void;
}

export const StaffMobileGstTurnover: React.FC<StaffMobileGstTurnoverProps> = ({
  clients,
  financialYears,
  selectedFY,
  onSelectFY,
  currentUser,
  initialClientId,
  onRefreshPortal,
}) => {
  // Assigned clients or all active clients
  const myClients = clients.filter(
    (c) => c.assigned_staff_id === currentUser.id && c.status === 'active'
  );
  const availableClients = myClients.length > 0 ? myClients : clients.filter((c) => c.status === 'active');

  const [selectedClientId, setSelectedClientId] = useState<number>(() => {
    if (initialClientId && availableClients.some((c) => c.id === initialClientId)) {
      return initialClientId;
    }
    return availableClients[0]?.id || 0;
  });

  // Monthly values state
  const [monthlyData, setMonthlyData] = useState<
    Record<string, { taxable: number | string; exempt: number | string; remark: string }>
  >(() => {
    const init: Record<string, { taxable: number | string; exempt: number | string; remark: string }> = {};
    FY_MONTHS.forEach((m) => {
      init[m] = { taxable: '', exempt: '', remark: '' };
    });
    return init;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load client turnover on client or FY change
  useEffect(() => {
    if (!selectedClientId) return;
    const records = GSTStorage.getClientGstTurnover(selectedClientId, selectedFY.id);
    const newMonthly: Record<string, { taxable: number | string; exempt: number | string; remark: string }> = {};

    FY_MONTHS.forEach((m) => {
      const rec = records.find((r) => r.month === m);
      newMonthly[m] = {
        taxable: rec && rec.taxable_turnover > 0 ? rec.taxable_turnover : '',
        exempt: rec && rec.exempt_turnover > 0 ? rec.exempt_turnover : '',
        remark: rec?.remark || '',
      };
    });

    setMonthlyData(newMonthly);
    setSaveSuccess(false);
  }, [selectedClientId, selectedFY.id]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleValueChange = (month: string, field: 'taxable' | 'exempt' | 'remark', value: string) => {
    setMonthlyData((prev) => ({
      ...prev,
      [month]: {
        ...prev[month],
        [field]: value,
      },
    }));
    setSaveSuccess(false);
  };

  // Calculations
  const totals = useMemo(() => {
    let totalTaxable = 0;
    let totalExempt = 0;

    FY_MONTHS.forEach((m) => {
      const t = Number(monthlyData[m]?.taxable) || 0;
      const e = Number(monthlyData[m]?.exempt) || 0;
      totalTaxable += t;
      totalExempt += e;
    });

    return {
      taxable: totalTaxable,
      exempt: totalExempt,
      grandTotal: totalTaxable + totalExempt,
    };
  }, [monthlyData]);

  const handleSave = async () => {
    if (!selectedClientId) return;
    setIsSaving(true);

    const monthlyMap: Record<string, { taxable: number; exempt: number; remark?: string }> = {};
    FY_MONTHS.forEach((m) => {
      monthlyMap[m] = {
        taxable: Number(monthlyData[m]?.taxable) || 0,
        exempt: Number(monthlyData[m]?.exempt) || 0,
        remark: monthlyData[m]?.remark || '',
      };
    });

    try {
      await GSTStorage.asyncBatchSaveClientGstTurnover(
        selectedClientId,
        selectedFY.id,
        monthlyMap
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving GST turnover:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    const exportData = buildAllClientsGstTurnoverExportData(
      clients,
      GSTStorage.getGstTurnover(),
      selectedFY
    );
    generateAllClientsGstTurnoverPDF(exportData, selectedFY);
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Top Header Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">GST Turnover Entry</h1>
            <p className="text-[11px] text-slate-500 font-semibold">12-Month Schedule (Apr - Mar)</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 shadow-2xs transition-all cursor-pointer"
              title="Download Full Turnover PDF"
            >
              <FileDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Client Picker Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Client:</label>
          <div className="relative">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
            >
              {availableClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firm_name} ({c.gstin})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Selected Client Details */}
        {selectedClient && (
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">{selectedClient.firm_name}</div>
              <div className="text-slate-500 font-mono text-[11px]">{selectedClient.gstin}</div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
              {selectedClient.gst_type || 'Normal'}
            </span>
          </div>
        )}

        {/* Summary Metric Strip */}
        <div className="grid grid-cols-3 gap-2 bg-gradient-to-br from-slate-900 to-blue-950 text-white p-3 rounded-xl shadow-xs">
          <div>
            <div className="text-[10px] text-slate-300 font-semibold uppercase">Taxable</div>
            <div className="text-xs font-black truncate">₹{totals.taxable.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-300 font-semibold uppercase">Exempt</div>
            <div className="text-xs font-black truncate">₹{totals.exempt.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-300 font-semibold uppercase">Grand Total</div>
            <div className="text-xs font-black text-emerald-400 truncate">
              ₹{totals.grandTotal.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* 12 Months Turnover Cards */}
      <div className="space-y-2">
        {FY_MONTHS.map((month) => {
          const mData = monthlyData[month] || { taxable: '', exempt: '', remark: '' };
          const monthTotal = (Number(mData.taxable) || 0) + (Number(mData.exempt) || 0);

          return (
            <div
              key={month}
              className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2"
            >
              {/* Month Header & Total */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="font-black text-xs text-blue-900 uppercase tracking-wide">
                  {month}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Total: ₹{monthTotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Taxable & Exempt Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Taxable Turnover (₹):
                  </label>
                  <input
                    type="number"
                    value={mData.taxable}
                    onChange={(e) => handleValueChange(month, 'taxable', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Exempt Turnover (₹):
                  </label>
                  <input
                    type="number"
                    value={mData.exempt}
                    onChange={(e) => handleValueChange(month, 'exempt', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Remark */}
              <div>
                <input
                  type="text"
                  value={mData.remark}
                  onChange={(e) => handleValueChange(month, 'remark', e.target.value)}
                  placeholder="Monthly turnover remark (optional)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Save Button at bottom */}
      <div className="sticky bottom-20 z-30 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving to Database...' : 'Save GST Turnover Changes'}</span>
        </button>
      </div>
    </div>
  );
};
