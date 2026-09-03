import React, { useState, useEffect, useMemo } from 'react';
import {
  Client,
  FinancialYear,
  FY_MONTHS,
  ClientGstTurnover,
} from '../../types';
import { GSTStorage } from '../../utils/storage';
import {
  Calculator,
  TrendingUp,
  AlertCircle,
  Building,
  Calendar,
  Layers,
  FileText,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

interface ActiveClientGstTurnoverProps {
  client: Client;
  financialYear: FinancialYear;
  selectedMonth: string; // 'All' | 'April' | ... | 'March'
  onSelectMonth?: (month: string) => void;
}

export const ActiveClientGstTurnover: React.FC<ActiveClientGstTurnoverProps> = ({
  client,
  financialYear,
  selectedMonth,
  onSelectMonth,
}) => {
  const [gstTurnoverList, setGstTurnoverList] = useState<ClientGstTurnover[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load GST turnover records for active client and selected FY
  const loadData = () => {
    setIsLoading(true);
    try {
      const records = GSTStorage.getClientGstTurnover(client.id, financialYear.id);
      setGstTurnoverList(records);
    } catch (e) {
      console.error('Error loading GST turnover for active client:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [client.id, financialYear.id]);

  // Format currency
  const formatINR = (val: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Map of month -> { taxable, exempt, total, remark }
  const monthlyDataMap = useMemo(() => {
    const map: Record<
      string,
      { taxable: number; exempt: number; total: number; remark: string }
    > = {};

    FY_MONTHS.forEach((m) => {
      map[m] = { taxable: 0, exempt: 0, total: 0, remark: '' };
    });

    gstTurnoverList.forEach((r) => {
      if (map[r.month]) {
        const taxable = Number(r.taxable_turnover) || 0;
        const exempt = Number(r.exempt_turnover) || 0;
        map[r.month] = {
          taxable,
          exempt,
          total: taxable + exempt,
          remark: r.remark || '',
        };
      }
    });

    return map;
  }, [gstTurnoverList]);

  // Totals across all 12 months
  const totals = useMemo(() => {
    let taxable = 0;
    let exempt = 0;
    let total = 0;

    FY_MONTHS.forEach((m) => {
      taxable += monthlyDataMap[m]?.taxable || 0;
      exempt += monthlyDataMap[m]?.exempt || 0;
      total += monthlyDataMap[m]?.total || 0;
    });

    return { taxable, exempt, total };
  }, [monthlyDataMap]);

  // Selected month figures
  const selectedMonthData = useMemo(() => {
    if (selectedMonth === 'All') return totals;
    return (
      monthlyDataMap[selectedMonth] || {
        taxable: 0,
        exempt: 0,
        total: 0,
        remark: '',
      }
    );
  }, [selectedMonth, monthlyDataMap, totals]);

  const clientScheme = client.gst_type || 'Normal';
  const isQRMP = clientScheme.toLowerCase() === 'qrmp';
  const isComposition = clientScheme.toLowerCase() === 'composition';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Client & Scheme
            </span>
            <span className="text-sm font-extrabold text-slate-900 truncate block mt-0.5" title={client.firm_name}>
              {client.firm_name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {clientScheme}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {client.file_no ? `File #${client.file_no}` : client.gstin}
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {selectedMonth === 'All' ? 'Annual Taxable Turnover' : `${selectedMonth} Taxable Turnover`}
            </span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {formatINR(selectedMonthData.taxable)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Taxable sales reported for GST
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {selectedMonth === 'All' ? 'Annual Exempt Turnover' : `${selectedMonth} Exempt Turnover`}
            </span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {formatINR(selectedMonthData.exempt)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Nil rated / non-taxable turnover
            </span>
          </div>
          <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
              {selectedMonth === 'All' ? 'Grand Total GST Turnover' : `${selectedMonth} Total GST`}
            </span>
            <span className="text-xl font-black text-white block mt-0.5">
              {formatINR(selectedMonthData.total)}
            </span>
            <span className="text-[10px] text-indigo-200/80 font-medium">
              Taxable + Exempt Combined
            </span>
          </div>
          <div className="p-2.5 bg-white/10 text-white rounded-xl border border-white/15">
            <Calculator className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* QRMP Notice if applicable */}
      {isQRMP && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <strong className="font-bold">QRMP Scheme Client:</strong> This client is registered under the Quarterly Return Monthly Payment (QRMP) scheme. Monthly turnover values indicate estimated or invoice furnishing facility (IFF) data.
          </div>
        </div>
      )}

      {/* 12-Month Table */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              12-Month GST Turnover Breakdown (April – March)
            </h3>
            {selectedMonth !== 'All' && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                Filtered: {selectedMonth}
              </span>
            )}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            FY {financialYear.display_name} • GSTIN: <span className="font-mono text-slate-700">{client.gstin}</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3 whitespace-nowrap w-32">Month</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[150px]">
                  Taxable Turnover (₹)
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[150px]">
                  Exempt Turnover (₹)
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[160px] bg-slate-200/70 font-black text-slate-900">
                  Total GST Turnover (₹)
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[200px]">Remark / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FY_MONTHS.map((month) => {
                const data = monthlyDataMap[month];
                const isFiltered =
                  selectedMonth !== 'All' && selectedMonth.toLowerCase() === month.toLowerCase();

                return (
                  <tr
                    key={month}
                    className={`transition-colors ${
                      isFiltered
                        ? 'bg-amber-50/90 font-bold ring-1 ring-inset ring-amber-300'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{month}</span>
                      {isFiltered && (
                        <span className="text-[9px] uppercase px-1 py-0.2 bg-amber-200 text-amber-900 rounded font-black">
                          Selected
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                      {data.taxable > 0 ? (
                        <span className="font-semibold text-slate-900">{formatINR(data.taxable)}</span>
                      ) : (
                        <span className="text-slate-300">₹0</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                      {data.exempt > 0 ? (
                        <span className="font-semibold text-slate-900">{formatINR(data.exempt)}</span>
                      ) : (
                        <span className="text-slate-300">₹0</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-slate-900 bg-slate-50 whitespace-nowrap">
                      {data.total > 0 ? (
                        formatINR(data.total)
                      ) : (
                        <span className="text-slate-400 font-normal">₹0</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px] truncate max-w-xs">
                      {data.remark ? (
                        <span className="text-slate-800">{data.remark}</span>
                      ) : (
                        <span className="text-slate-300 italic">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-900">
                <td className="py-3 px-3 uppercase tracking-wider text-[11px]">FY Grand Total</td>
                <td className="py-3 px-3 text-right font-mono text-xs whitespace-nowrap">
                  {formatINR(totals.taxable)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs whitespace-nowrap">
                  {formatINR(totals.exempt)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm text-emerald-400 whitespace-nowrap bg-slate-950">
                  {formatINR(totals.total)}
                </td>
                <td className="py-3 px-3 text-slate-400 text-[11px] font-normal">
                  Annual GST Aggregate Turnover
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
