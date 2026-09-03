import React, { useState, useEffect, useMemo } from 'react';
import { Client, FinancialYear, FY_MONTHS, User, BankAccountSlot, ClientBankAccount } from '../../types';
import { GSTStorage } from '../../utils/storage';
import { Landmark, Save, CheckCircle2, ChevronDown, Plus, CreditCard } from 'lucide-react';

interface StaffMobileBankTurnoverProps {
  clients: Client[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  onSelectFY: (fy: FinancialYear) => void;
  currentUser: User;
  initialClientId?: number | null;
}

export const StaffMobileBankTurnover: React.FC<StaffMobileBankTurnoverProps> = ({
  clients,
  financialYears,
  selectedFY,
  onSelectFY,
  currentUser,
  initialClientId,
}) => {
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

  const [activeSlot, setActiveSlot] = useState<BankAccountSlot>(1);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountType, setAccountType] = useState<any>('Current');

  // 12-month turnover amounts
  const [monthlyTurnover, setMonthlyTurnover] = useState<Record<string, number | string>>(() => {
    const init: Record<string, number | string> = {};
    FY_MONTHS.forEach((m) => {
      init[m] = '';
    });
    return init;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load client bank accounts and turnover
  useEffect(() => {
    if (!selectedClientId) return;

    const accounts = GSTStorage.getClientBankAccounts(selectedClientId, selectedFY.id);
    const account = accounts.find((a) => a.slot_number === activeSlot);

    if (account) {
      setBankName(account.bank_name || '');
      setAccountNumber(account.account_number || '');
      setIfsc(account.ifsc || '');
      setAccountType(account.account_type || 'Current');

      const turnovers = GSTStorage.getClientBankTurnover(selectedClientId, selectedFY.id);
      const accTurnovers = turnovers.filter((t) => t.bank_account_id === account.id);

      const newMonthly: Record<string, number | string> = {};
      FY_MONTHS.forEach((m) => {
        const found = accTurnovers.find((t) => t.month === m);
        newMonthly[m] = found && found.turnover_amount > 0 ? found.turnover_amount : '';
      });
      setMonthlyTurnover(newMonthly);
    } else {
      setBankName('');
      setAccountNumber('');
      setIfsc('');
      setAccountType('Current');
      const empty: Record<string, number | string> = {};
      FY_MONTHS.forEach((m) => {
        empty[m] = '';
      });
      setMonthlyTurnover(empty);
    }

    setSaveSuccess(false);
  }, [selectedClientId, selectedFY.id, activeSlot]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const totalBankTurnover = useMemo(() => {
    return FY_MONTHS.reduce((sum, m) => sum + (Number(monthlyTurnover[m]) || 0), 0);
  }, [monthlyTurnover]);

  const handleSave = () => {
    if (!selectedClientId) return;
    setIsSaving(true);

    try {
      // 1. Save or update bank account
      const allAccounts = GSTStorage.getBankAccounts();
      let account = allAccounts.find(
        (a) => a.client_id === selectedClientId && a.slot_number === activeSlot
      );

      if (!account) {
        account = {
          id: Date.now(),
          client_id: selectedClientId,
          slot_number: activeSlot,
          bank_name: bankName.trim() || `Bank Account ${activeSlot}`,
          account_number: accountNumber.trim(),
          account_holder_name: selectedClient?.firm_name || '',
          account_type: accountType,
          ifsc: ifsc.trim(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        allAccounts.push(account);
      } else {
        account.bank_name = bankName.trim() || `Bank Account ${activeSlot}`;
        account.account_number = accountNumber.trim();
        account.account_type = accountType;
        account.ifsc = ifsc.trim();
        account.status = 'active';
        account.updated_at = new Date().toISOString();
      }

      GSTStorage.saveBankAccounts(allAccounts);

      // 2. Save monthly turnover
      const turnoverMap: Record<string, number> = {};
      FY_MONTHS.forEach((m) => {
        turnoverMap[m] = Number(monthlyTurnover[m]) || 0;
      });

      GSTStorage.batchSaveClientBankTurnover(
        selectedClientId,
        account.id,
        selectedFY.id,
        turnoverMap
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving bank turnover:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Top Header Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Bank Turnover</h1>
            <p className="text-[11px] text-slate-500 font-semibold">5 Bank Account Slots per Client</p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
              saveSuccess ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
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

        {/* Client Selector */}
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

        {/* 5 Bank Slots Bar */}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
            Choose Bank Slot:
          </label>
          <div className="grid grid-cols-5 gap-1">
            {([1, 2, 3, 4, 5] as BankAccountSlot[]).map((slot) => {
              const isSelected = slot === activeSlot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setActiveSlot(slot)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Bank {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bank Account Details Inputs */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Bank Name:</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. SBI, HDFC, ICICI"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Account Type:</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
                <option value="OD/CC">OD / CC</option>
                <option value="Cash Credit">Cash Credit</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">A/C Number:</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Account number"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">IFSC Code:</label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="IFSC Code"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Total Turnover Banner */}
        <div className="flex items-center justify-between bg-indigo-900 text-white p-3 rounded-xl">
          <span className="text-xs font-bold text-indigo-200">Bank {activeSlot} Annual Total:</span>
          <span className="text-sm font-black text-emerald-400">
            ₹{totalBankTurnover.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 12 Months Turnover Cards */}
      <div className="space-y-2">
        {FY_MONTHS.map((month) => {
          const val = monthlyTurnover[month] || '';

          return (
            <div
              key={month}
              className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
            >
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                {month}
              </span>
              <div className="flex items-center gap-1.5 w-44">
                <span className="text-xs font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  value={val}
                  onChange={(e) =>
                    setMonthlyTurnover((prev) => ({
                      ...prev,
                      [month]: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 text-right"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Save Button */}
      <div className="sticky bottom-20 z-30 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving to Database...' : `Save Bank ${activeSlot} Turnover`}</span>
        </button>
      </div>
    </div>
  );
};
