import React, { useState, useEffect, useMemo } from 'react';
import {
  Client,
  FinancialYear,
  FY_MONTHS,
  BankAccountSlot,
  ClientBankAccount,
  ClientBankTurnover,
} from '../../types';
import { GSTStorage } from '../../utils/storage';
import {
  Landmark,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Building,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface ActiveClientBankTurnoverProps {
  client: Client;
  financialYear: FinancialYear;
  selectedMonth: string; // 'All' | 'April' | ... | 'March'
  onSelectMonth?: (month: string) => void;
}

export const ActiveClientBankTurnover: React.FC<ActiveClientBankTurnoverProps> = ({
  client,
  financialYear,
  selectedMonth,
  onSelectMonth,
}) => {
  const [bankAccounts, setBankAccounts] = useState<ClientBankAccount[]>([]);
  const [turnoverList, setTurnoverList] = useState<ClientBankTurnover[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load Bank Accounts & Turnover for Active Client + Selected FY
  const loadData = () => {
    setIsLoading(true);
    try {
      const accounts = GSTStorage.getClientBankAccounts(client.id, financialYear.id);
      const turnovers = GSTStorage.getClientBankTurnover(client.id, financialYear.id);
      setBankAccounts(accounts);
      setTurnoverList(turnovers);
    } catch (e) {
      console.error('Error loading bank turnover for active client:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [client.id, financialYear.id]);

  // Format currency in Indian numbering format
  const formatINR = (val: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Map of bank turnover: [bank_account_id][month] -> number
  const turnoverMap = useMemo(() => {
    const map: Record<number, Record<string, number>> = {};
    bankAccounts.forEach((acc) => {
      map[acc.id] = {};
      FY_MONTHS.forEach((m) => {
        map[acc.id][m] = 0;
      });
    });

    turnoverList.forEach((t) => {
      if (map[t.bank_account_id]) {
        map[t.bank_account_id][t.month] = Number(t.turnover_amount) || 0;
      }
    });

    return map;
  }, [bankAccounts, turnoverList]);

  // Per bank totals
  const bankTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    bankAccounts.forEach((acc) => {
      let sum = 0;
      FY_MONTHS.forEach((m) => {
        sum += turnoverMap[acc.id]?.[m] || 0;
      });
      totals[acc.id] = sum;
    });
    return totals;
  }, [bankAccounts, turnoverMap]);

  // Monthly totals across all banks
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    FY_MONTHS.forEach((m) => {
      let sum = 0;
      bankAccounts.forEach((acc) => {
        sum += turnoverMap[acc.id]?.[m] || 0;
      });
      totals[m] = sum;
    });
    return totals;
  }, [bankAccounts, turnoverMap]);

  // Grand Total for the FY across all banks
  const grandTotal = useMemo(() => {
    return Object.values(monthlyTotals).reduce((sum: number, val: number) => sum + (val || 0), 0);
  }, [monthlyTotals]);

  // Filtered month total (if specific month is selected)
  const selectedMonthTotal = useMemo(() => {
    if (selectedMonth === 'All') return grandTotal;
    return monthlyTotals[selectedMonth] || 0;
  }, [selectedMonth, monthlyTotals, grandTotal]);

  const activeSlots = [1, 2, 3, 4, 5] as const;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Client
            </span>
            <span className="text-sm font-extrabold text-slate-900 truncate block mt-0.5" title={client.firm_name}>
              {client.firm_name}
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-semibold">
              {client.file_no ? `File #${client.file_no}` : client.gstin}
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Configured Banks
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900">{bankAccounts.length}</span>
              <span className="text-xs text-slate-400 font-semibold">/ 5 Slots Max</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" />
              <span>FY {financialYear.display_name}</span>
            </span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {selectedMonth === 'All' ? 'Annual Bank Turnover' : `${selectedMonth} Bank Turnover`}
            </span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {formatINR(selectedMonthTotal)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {selectedMonth === 'All' ? '12 Months (Apr–Mar)' : `Selected Month in FY ${financialYear.display_name}`}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
              FY Grand Total (All Banks)
            </span>
            <span className="text-xl font-black text-white block mt-0.5">
              {formatINR(grandTotal)}
            </span>
            <span className="text-[10px] text-indigo-200/80 font-medium">
              Sum of all {bankAccounts.length} active banks
            </span>
          </div>
          <div className="p-2.5 bg-white/10 text-white rounded-xl border border-white/15">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Saved Bank Accounts Info Cards (Up to 5 Slots) */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Saved Bank Accounts ({bankAccounts.length} of 5 Configured)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Active Client: <strong className="text-slate-800">{client.firm_name}</strong>
          </span>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-700">No Bank Accounts Configured</div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
              No bank account slots have been filled yet for {client.firm_name} in FY {financialYear.display_name}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bankAccounts.map((acc) => {
              const total = bankTotals[acc.id] || 0;
              return (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black font-mono px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                          Slot #{acc.slot_number}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          {acc.account_type || 'Current'}
                        </span>
                      </div>
                      <div className="text-xs font-black text-slate-900 mt-1 truncate" title={acc.bank_name}>
                        {acc.bank_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                        A/C: {acc.account_number}
                      </div>
                      {acc.ifsc && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          IFSC: {acc.ifsc}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">FY Total</span>
                      <span className="text-xs font-black text-indigo-700 block mt-0.5">
                        {formatINR(total)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Bank Turnover Matrix Table (April to March) */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Monthly Bank Turnover Table (April – March)
            </h3>
            {selectedMonth !== 'All' && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                Filtered: {selectedMonth}
              </span>
            )}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            FY {financialYear.display_name} • Active Client ID: {client.id}
          </div>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400">
            No bank accounts available to display monthly turnover table.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 whitespace-nowrap w-32">Month</th>
                  {bankAccounts.map((acc) => (
                    <th key={acc.id} className="py-2.5 px-3 text-right whitespace-nowrap min-w-[140px]">
                      <div className="text-slate-900 font-bold truncate max-w-[150px]" title={acc.bank_name}>
                        {acc.bank_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono font-normal">
                        Slot #{acc.slot_number} • {acc.account_number.slice(-4) ? `...${acc.account_number.slice(-4)}` : ''}
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right whitespace-nowrap bg-slate-200/70 font-black text-slate-900 w-36">
                    Combined Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FY_MONTHS.map((month) => {
                  const isFiltered = selectedMonth !== 'All' && selectedMonth.toLowerCase() === month.toLowerCase();
                  const rowCombined = monthlyTotals[month] || 0;

                  // If user selected a specific month, we can either highlight it or only show it
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
                      {bankAccounts.map((acc) => {
                        const amount = turnoverMap[acc.id]?.[month] || 0;
                        return (
                          <td key={acc.id} className="py-2 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                            {amount > 0 ? (
                              <span className="font-semibold text-slate-900">{formatINR(amount)}</span>
                            ) : (
                              <span className="text-slate-300">₹0</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-900 bg-slate-50 whitespace-nowrap">
                        {rowCombined > 0 ? formatINR(rowCombined) : <span className="text-slate-400 font-normal">₹0</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-900">
                  <td className="py-3 px-3 uppercase tracking-wider text-[11px]">FY Grand Total</td>
                  {bankAccounts.map((acc) => {
                    const total = bankTotals[acc.id] || 0;
                    return (
                      <td key={acc.id} className="py-3 px-3 text-right font-mono text-xs whitespace-nowrap">
                        {formatINR(total)}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-400 whitespace-nowrap bg-slate-950">
                    {formatINR(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
