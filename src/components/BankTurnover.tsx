import React, { useState, useMemo, useEffect } from 'react';
import {
  Client,
  FinancialYear,
  FY_MONTHS,
  User,
  ClientBankAccount,
  ClientBankTurnover,
  BankStatementBackup,
  BankAccountSlot,
  BankAccountType,
  BankAccountStatus,
} from '../types';
import { GSTStorage } from '../utils/storage';
import {
  Landmark,
  Building,
  Calendar,
  CreditCard,
  Upload,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  FileArchive,
  Save,
  Plus,
  Search,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';

interface BankTurnoverProps {
  clients: Client[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  currentUser: User;
  initialClientId?: number | null;
  onSelectFY: (fy: FinancialYear) => void;
  onRefresh?: () => void;
}

export const BankTurnover: React.FC<BankTurnoverProps> = ({
  clients,
  financialYears,
  selectedFY,
  currentUser,
  initialClientId,
  onSelectFY,
  onRefresh,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<number>(
    initialClientId || (clients.length > 0 ? clients[0].id : 0)
  );
  const [clientSearch, setClientSearch] = useState('');
  const [activeTabSlot, setActiveTabSlot] = useState<BankAccountSlot | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State loaded from GSTStorage
  const [bankAccounts, setBankAccounts] = useState<ClientBankAccount[]>([]);
  const [turnoverData, setTurnoverData] = useState<ClientBankTurnover[]>([]);
  const [statementBackups, setStatementBackups] = useState<BankStatementBackup[]>([]);

  // Local editing states for 12-month inputs: [accountId]: { [month]: number | string }
  const [monthlyInputs, setMonthlyInputs] = useState<Record<number, Record<string, string>>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ slot: number; message: string } | null>(null);
  const [editingSlotConfig, setEditingSlotConfig] = useState<BankAccountSlot | null>(null);

  // Masked account numbers visibility toggle per slot
  const [revealedAccounts, setRevealedAccounts] = useState<Record<number, boolean>>({});

  // Slot configuration form state
  const [slotForm, setSlotForm] = useState<{
    slot_number: BankAccountSlot;
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    account_type: BankAccountType;
    ifsc: string;
    status: BankAccountStatus;
  }>({
    slot_number: 1,
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    account_type: 'Current',
    ifsc: '',
    status: 'active',
  });

  // Load data whenever selected client or FY changes
  const loadData = () => {
    if (!selectedClientId) return;
    const accounts = GSTStorage.getClientBankAccounts(selectedClientId);
    const turnovers = GSTStorage.getClientBankTurnover(selectedClientId, selectedFY.id);
    const backups = GSTStorage.getClientBankStatements(selectedClientId, selectedFY.id);

    setBankAccounts(accounts);
    setTurnoverData(turnovers);
    setStatementBackups(backups);

    // Initialize monthly input state
    const inputs: Record<number, Record<string, string>> = {};
    accounts.forEach((acc) => {
      inputs[acc.id] = {};
      FY_MONTHS.forEach((m) => {
        const record = turnovers.find((t) => t.bank_account_id === acc.id && t.month === m);
        inputs[acc.id][m] = record && record.turnover_amount > 0 ? String(record.turnover_amount) : '';
      });
    });
    setMonthlyInputs(inputs);
  };

  useEffect(() => {
    loadData();
    setEditingSlotConfig(null);
    setUploadError(null);
  }, [selectedClientId, selectedFY.id]);

  useEffect(() => {
    if (initialClientId && initialClientId !== selectedClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

  // Selected client entity
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0];
  }, [clients, selectedClientId]);

  // Search filtered clients
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.firm_name.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        c.client_name.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  // Format currency in Indian numbering format
  const formatINR = (val: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Mask account number (e.g. "XXXXXXXX1234")
  const maskAccountNumber = (accNo: string, isRevealed: boolean): string => {
    if (!accNo) return 'Not Configured';
    if (isRevealed || accNo.length <= 4) return accNo;
    const last4 = accNo.slice(-4);
    return '•'.repeat(Math.max(accNo.length - 4, 4)) + ' ' + last4;
  };

  // Live calculate total for an account
  const calculateAccountTotal = (accountId: number): number => {
    const accInputs = monthlyInputs[accountId];
    if (!accInputs) return 0;
    return FY_MONTHS.reduce((sum, m) => {
      const val = parseFloat(accInputs[m]) || 0;
      return sum + val;
    }, 0);
  };

  // Live calculate Grand Total across all 5 bank accounts for this Client + FY
  const grandTotalTurnover = useMemo(() => {
    return bankAccounts.reduce((sum, acc) => {
      return sum + calculateAccountTotal(acc.id);
    }, 0);
  }, [bankAccounts, monthlyInputs]);

  // Handle monthly input change
  const handleInputChange = (accountId: number, month: string, value: string) => {
    // Only permit numbers and decimal
    if (value && !/^\d*\.?\d*$/.test(value)) return;

    setMonthlyInputs((prev) => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] || {}),
        [month]: value,
      },
    }));
  };

  // Save all turnover inputs for an account
  const handleSaveAccountTurnover = (account: ClientBankAccount) => {
    const accInputs = monthlyInputs[account.id] || {};
    const amountsToSave: Record<string, number> = {};

    FY_MONTHS.forEach((m) => {
      amountsToSave[m] = parseFloat(accInputs[m]) || 0;
    });

    GSTStorage.batchSaveClientBankTurnover(
      selectedClient.id,
      account.id,
      selectedFY.id,
      amountsToSave
    );

    setSaveStatus(`Saved turnover for Slot #${account.slot_number} (${account.bank_name})!`);
    setTimeout(() => setSaveStatus(null), 3500);
    loadData();
  };

  // Save all accounts at once
  const handleSaveAllAccounts = () => {
    bankAccounts.forEach((acc) => {
      const accInputs = monthlyInputs[acc.id] || {};
      const amountsToSave: Record<string, number> = {};
      FY_MONTHS.forEach((m) => {
        amountsToSave[m] = parseFloat(accInputs[m]) || 0;
      });
      GSTStorage.batchSaveClientBankTurnover(
        selectedClient.id,
        acc.id,
        selectedFY.id,
        amountsToSave
      );
    });

    setSaveStatus(`All ${bankAccounts.length} Bank Account(s) saved successfully for FY ${selectedFY.display_name}!`);
    setTimeout(() => setSaveStatus(null), 4000);
    loadData();
  };

  // Open slot editor
  const handleOpenSlotConfig = (slotNum: BankAccountSlot) => {
    const existing = bankAccounts.find((a) => a.slot_number === slotNum);
    if (existing) {
      setSlotForm({
        slot_number: slotNum,
        bank_name: existing.bank_name,
        account_number: existing.account_number,
        account_holder_name: existing.account_holder_name || selectedClient.firm_name,
        account_type: existing.account_type,
        ifsc: existing.ifsc,
        status: existing.status,
      });
    } else {
      setSlotForm({
        slot_number: slotNum,
        bank_name: '',
        account_number: '',
        account_holder_name: selectedClient.firm_name,
        account_type: 'Current',
        ifsc: '',
        status: 'active',
      });
    }
    setEditingSlotConfig(slotNum);
  };

  // Submit slot configuration
  const handleSubmitSlotConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotForm.bank_name.trim()) {
      alert('Please enter a valid Bank Name.');
      return;
    }

    GSTStorage.saveClientBankAccount({
      client_id: selectedClient.id,
      slot_number: slotForm.slot_number,
      bank_name: slotForm.bank_name.trim(),
      account_number: slotForm.account_number.trim(),
      account_holder_name: slotForm.account_holder_name.trim() || selectedClient.firm_name,
      account_type: slotForm.account_type,
      ifsc: slotForm.ifsc.trim().toUpperCase(),
      status: slotForm.status,
    });

    setEditingSlotConfig(null);
    setSaveStatus(`Bank Account Slot #${slotForm.slot_number} configured successfully.`);
    setTimeout(() => setSaveStatus(null), 3000);
    loadData();
  };

  // Delete slot account
  const handleDeleteSlotAccount = (accountId: number, slotNum: number) => {
    if (
      window.confirm(
        `Are you sure you want to remove Bank Account Slot #${slotNum}? All associated monthly turnover and statement backups for this slot will also be removed.`
      )
    ) {
      GSTStorage.deleteClientBankAccount(accountId);
      loadData();
    }
  };

  // Handle ZIP statement upload
  const handleZipFileUpload = (
    account: ClientBankAccount,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setUploadError(null);

    // Strictly validate .zip extension & mime type
    const isZipExtension = file.name.toLowerCase().endsWith('.zip');
    const isZipMime =
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed' ||
      file.type === 'application/x-zip' ||
      file.type === '';

    if (!isZipExtension && !isZipMime) {
      setUploadError({
        slot: account.slot_number,
        message: 'Only ZIP files are allowed.',
      });
      e.target.value = '';
      return;
    }

    // Size limit check: 50MB
    if (file.size > 50 * 1024 * 1024) {
      setUploadError({
        slot: account.slot_number,
        message: 'ZIP file size cannot exceed 50 MB.',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;

      GSTStorage.saveBankStatementBackup({
        client_id: selectedClient.id,
        bank_account_id: account.id,
        financial_year_id: selectedFY.id,
        file_name: file.name,
        file_size: file.size,
        file_data_base64: base64Data,
      });

      setSaveStatus(`Statement backup (${file.name}) uploaded for Slot #${account.slot_number}!`);
      setTimeout(() => setSaveStatus(null), 3500);
      loadData();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Download statement backup
  const handleDownloadBackup = (backup: BankStatementBackup) => {
    if (backup.file_data_base64) {
      const a = document.createElement('a');
      a.href = backup.file_data_base64;
      a.download = backup.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`Downloading authorized backup file: ${backup.file_name}`);
    }
  };

  // Delete statement backup
  const handleDeleteBackup = (backupId: number, slotNum: number) => {
    if (window.confirm(`Delete the statement backup file for Slot #${slotNum}?`)) {
      GSTStorage.deleteBankStatementBackup(backupId);
      loadData();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleRefreshTurnover = () => {
    setIsRefreshing(true);
    loadData();
    if (onRefresh) {
      onRefresh();
    }
    setSaveStatus(`Bank turnover data refreshed for FY ${selectedFY.display_name}.`);
    setTimeout(() => {
      setIsRefreshing(false);
      setSaveStatus(null);
    }, 1500);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {saveStatus && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{saveStatus}</span>
          </div>
          <button
            onClick={() => setSaveStatus(null)}
            className="text-white/80 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Client-Wise Monthly Bank Turnover</h2>
              <p className="text-xs text-slate-500">
                Manage 5 bank account slots, 12-month compliance turnover & secure ZIP backups
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Financial Year, Refresh & Bulk Save */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* FY Selector */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Financial Year:</span>
            <select
              id="bank-turnover-fy-select"
              value={selectedFY.id}
              onChange={(e) => {
                const found = financialYears.find((f) => f.id === Number(e.target.value));
                if (found) onSelectFY(found);
              }}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  FY {fy.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Dedicated Refresh Button */}
          <button
            id="bank-turnover-refresh-btn"
            onClick={handleRefreshTurnover}
            disabled={isRefreshing}
            className={`flex items-center gap-1.5 font-bold text-xs px-3.5 py-2 rounded-xl border shadow-xs transition-all cursor-pointer ${
              isRefreshing
                ? 'bg-blue-100 text-blue-900 border-blue-300'
                : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300'
            }`}
            title={`Refresh turnover, bank accounts and statements for FY ${selectedFY.display_name}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-800' : 'text-blue-600'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            id="save-all-turnover-btn"
            onClick={handleSaveAllAccounts}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All Turnover</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Client Selector on Left + 5 Bank Slots on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Client Selector & Info (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search Client */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Select Client ({clients.length})
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search firm, GSTIN, name..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Clients List */}
            <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
              {filteredClients.map((c) => {
                const isSelected = c.id === selectedClientId;
                const summary = GSTStorage.getClientBankTurnoverSummary(c.id, selectedFY.id);

                return (
                  <div
                    key={c.id}
                    id={`bank-client-item-${c.id}`}
                    onClick={() => setSelectedClientId(c.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-300 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-bold text-slate-900 text-xs truncate">{c.firm_name}</div>
                      <span className="text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.2 rounded font-bold text-slate-700 shrink-0">
                        {c.gstin.substring(0, 7)}...
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1.5 text-[11px]">
                      <span className="text-slate-500">{summary.accountCount} Bank Account(s)</span>
                      <span className="font-bold text-slate-900">
                        {summary.grandTotal > 0 ? formatINR(summary.grandTotal) : '₹0'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Client Details Card */}
          {selectedClient && (
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                    Active Client Details
                  </span>
                  <h3 className="font-bold text-sm text-white mt-0.5">{selectedClient.firm_name}</h3>
                  <div className="font-mono text-xs font-semibold text-slate-300 mt-1">
                    GSTIN: {selectedClient.gstin}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-blue-400 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-3 text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block">Contact Person</span>
                  <span className="font-semibold text-white">{selectedClient.client_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Mobile Phone</span>
                  <span className="font-semibold text-white">{selectedClient.mobile}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">GST Scheme</span>
                  <span className="font-semibold text-white capitalize">{selectedClient.gst_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">City / State</span>
                  <span className="font-semibold text-white truncate">{selectedClient.city || 'State'}</span>
                </div>
              </div>

              {/* Grand Total Summary Box */}
              <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/40 p-3.5 rounded-xl">
                <div className="text-[11px] text-blue-300 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Grand Total Bank Turnover</span>
                  <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded font-mono">
                    FY {selectedFY.display_name}
                  </span>
                </div>
                <div className="text-2xl font-black text-white mt-1">
                  {formatINR(grandTotalTurnover)}
                </div>
                <div className="text-[10px] text-blue-300 mt-1">
                  Sum of all {bankAccounts.length} configured bank account(s)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: 5 Bank Account Slots (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Quick Slot Filter Tabs */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTabSlot('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTabSlot === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All 5 Bank Slots
            </button>
            {([1, 2, 3, 4, 5] as BankAccountSlot[]).map((slotNum) => {
              const acc = bankAccounts.find((a) => a.slot_number === slotNum);
              const total = acc ? calculateAccountTotal(acc.id) : 0;
              const isActive = activeTabSlot === slotNum;

              return (
                <button
                  key={slotNum}
                  onClick={() => setActiveTabSlot(slotNum)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>Slot #{slotNum}</span>
                  {acc ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                        isActive ? 'bg-slate-800 text-blue-200' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {acc.bank_name.split(' ')[0]}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-normal">(Empty)</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Slot Edit Modal Form */}
          {editingSlotConfig !== null && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    #{editingSlotConfig}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Configure Bank Account Slot #{editingSlotConfig}
                    </h4>
                    <p className="text-xs text-slate-600">
                      Set bank details for {selectedClient.firm_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingSlotConfig(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmitSlotConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Bank of India, HDFC Bank, ICICI..."
                    value={slotForm.bank_name}
                    onChange={(e) => setSlotForm({ ...slotForm, bank_name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 30495812948"
                    value={slotForm.account_number}
                    onChange={(e) => setSlotForm({ ...slotForm, account_number: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Traders"
                    value={slotForm.account_holder_name}
                    onChange={(e) => setSlotForm({ ...slotForm, account_holder_name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Type</label>
                  <select
                    value={slotForm.account_type}
                    onChange={(e) => setSlotForm({ ...slotForm, account_type: e.target.value as BankAccountType })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Current">Current Account</option>
                    <option value="Savings">Savings Account</option>
                    <option value="OD/CC">OD / CC Limit</option>
                    <option value="Cash Credit">Cash Credit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IFSC Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={slotForm.ifsc}
                    onChange={(e) => setSlotForm({ ...slotForm, ifsc: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono uppercase focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={slotForm.status}
                    onChange={(e) => setSlotForm({ ...slotForm, status: e.target.value as BankAccountStatus })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingSlotConfig(null)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                  >
                    Save Bank Account Details
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 5 Bank Slots Display */}
          {([1, 2, 3, 4, 5] as BankAccountSlot[])
            .filter((slotNum) => activeTabSlot === 'all' || activeTabSlot === slotNum)
            .map((slotNum) => {
              const account = bankAccounts.find((a) => a.slot_number === slotNum);
              const backup = account
                ? statementBackups.find((b) => b.bank_account_id === account.id)
                : undefined;
              const accountTotal = account ? calculateAccountTotal(account.id) : 0;
              const isRevealed = !!(account && revealedAccounts[account.id]);
              const currentInputs = account ? monthlyInputs[account.id] || {} : {};

              if (!account) {
                // Empty Slot Card
                return (
                  <div
                    key={slotNum}
                    className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-slate-400 transition-colors"
                  >
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-sm">
                        #{slotNum}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm">Bank Account Slot #{slotNum}</h4>
                        <p className="text-xs text-slate-400">
                          Slot is currently empty. Configure bank details to start recording monthly turnover.
                        </p>
                      </div>
                    </div>

                    <button
                      id={`setup-slot-btn-${slotNum}`}
                      onClick={() => handleOpenSlotConfig(slotNum)}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs px-4 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Configure Bank #{slotNum}</span>
                    </button>
                  </div>
                );
              }

              // Configured Slot Card
              return (
                <div
                  key={slotNum}
                  id={`bank-account-slot-${slotNum}`}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
                >
                  {/* Account Header */}
                  <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        #{slotNum}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{account.bank_name}</h4>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                            {account.account_type}
                          </span>
                          {account.ifsc && (
                            <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                              {account.ifsc}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            A/C:{' '}
                            <strong className="text-slate-700">
                              {maskAccountNumber(account.account_number, isRevealed)}
                            </strong>
                            {account.account_number && (
                              <button
                                onClick={() =>
                                  setRevealedAccounts((prev) => ({
                                    ...prev,
                                    [account.id]: !prev[account.id],
                                  }))
                                }
                                className="text-slate-400 hover:text-slate-600 p-0.5 ml-0.5"
                                title={isRevealed ? 'Mask Number' : 'Reveal Number'}
                              >
                                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            )}
                          </span>
                          <span>•</span>
                          <span>
                            Holder: <strong className="text-slate-700">{account.account_holder_name}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Account Controls */}
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button
                        onClick={() => handleOpenSlotConfig(slotNum)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit Account Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSlotAccount(account.id, slotNum)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove Bank Account Slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 12-Month Turnover Input Grid */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        12-Month Turnover Schedule ({selectedFY.display_name})
                      </span>
                      <span className="text-xs text-slate-500">Enter turnover amount in ₹</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                      {FY_MONTHS.map((month) => {
                        const val = currentInputs[month] || '';
                        return (
                          <div
                            key={month}
                            className="bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 focus-within:border-blue-500 focus-within:bg-white transition-all"
                          >
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              {month}
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1 text-slate-400 font-semibold text-xs">
                                ₹
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={val}
                                onChange={(e) => handleInputChange(account.id, month, e.target.value)}
                                className="w-full pl-5 pr-1 py-0.5 text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-hidden text-right"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 12-Month Total Banner for this Account */}
                    <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          12-Month Total Turnover ({account.bank_name}):
                        </span>
                      </div>
                      <div className="text-lg font-black text-emerald-400">
                        {formatINR(accountTotal)}
                      </div>
                    </div>

                    {/* Statement ZIP Backup Section */}
                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <FileArchive className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-xs text-slate-800">
                              Bank Statement Backup (.ZIP Only)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Upload monthly statements compressed in a secure .zip archive for FY {selectedFY.display_name}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {backup ? (
                            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs">
                              <span className="font-medium text-indigo-900 truncate max-w-[150px]" title={backup.file_name}>
                                {backup.file_name}
                              </span>
                              <span className="text-[10px] text-indigo-600 font-mono">
                                ({formatFileSize(backup.file_size)})
                              </span>

                              <button
                                onClick={() => handleDownloadBackup(backup)}
                                className="p-1 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 rounded"
                                title="Download / View Backup"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <label
                                className="p-1 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 rounded cursor-pointer"
                                title="Replace ZIP Backup"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept=".zip,application/zip"
                                  className="hidden"
                                  onChange={(e) => handleZipFileUpload(account, e)}
                                />
                              </label>

                              <button
                                onClick={() => handleDeleteBackup(backup.id, slotNum)}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded"
                                title="Delete Backup"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload ZIP Statement</span>
                              <input
                                type="file"
                                accept=".zip,application/zip"
                                className="hidden"
                                onChange={(e) => handleZipFileUpload(account, e)}
                              />
                            </label>
                          )}

                          <button
                            onClick={() => handleSaveAccountTurnover(account)}
                            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save Slot</span>
                          </button>
                        </div>
                      </div>

                      {/* Upload Error Banner */}
                      {uploadError && uploadError.slot === slotNum && (
                        <div className="mt-2 p-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{uploadError.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Grand Total Footer Summary Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  {selectedClient.firm_name} - Grand Total Bank Turnover
                </h4>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                FY {selectedFY.display_name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              {([1, 2, 3, 4, 5] as BankAccountSlot[]).map((slotNum) => {
                const acc = bankAccounts.find((a) => a.slot_number === slotNum);
                const total = acc ? calculateAccountTotal(acc.id) : 0;

                return (
                  <div
                    key={slotNum}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center"
                  >
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">
                      Bank #{slotNum} {acc ? `(${acc.bank_name.split(' ')[0]})` : ''}
                    </span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                      {acc ? formatINR(total) : '₹0'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 text-white p-4 rounded-xl gap-2 mt-2">
              <div>
                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">
                  Client Total Annual Turnover
                </span>
                <span className="text-xs text-blue-300">
                  Calculated from all 5 bank accounts for FY {selectedFY.display_name}
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {formatINR(grandTotalTurnover)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
