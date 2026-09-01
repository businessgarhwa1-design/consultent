import React, { useState, useEffect } from 'react';
import {
  Client,
  FinancialYear,
  FY_MONTHS,
  MonthlyWork,
  User,
  WorkHistory,
  WorkStatus,
  ClientBankAccount,
  ClientBankTurnover,
  BankStatementBackup,
  BankAccountSlot,
  BankAccountType,
  BankAccountStatus,
} from '../types';
import { GSTStorage } from '../utils/storage';
import {
  X,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  UserCheck,
  Clock,
  History,
  FileSpreadsheet,
  ArrowRight,
  Edit2,
  CalendarCheck,
  Landmark,
  FileArchive,
  Download,
  Upload,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Calculator,
} from 'lucide-react';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  monthlyWork: MonthlyWork[];
  workHistory: WorkHistory[];
  users: User[];
  onOpenEdit: (client: Client) => void;
  onNavigateToMonthlyWork: (gstin: string) => void;
  onNavigateToBankTurnover?: (clientId: number) => void;
  onNavigateToGstTurnover?: (clientId: number) => void;
}

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({
  isOpen,
  onClose,
  client,
  financialYears,
  selectedFY,
  monthlyWork,
  workHistory,
  users,
  onOpenEdit,
  onNavigateToMonthlyWork,
  onNavigateToBankTurnover,
  onNavigateToGstTurnover,
}) => {
  const [activeTab, setActiveTab] = useState<'gst' | 'bank-turnover' | 'audit'>('gst');
  const [activeFYId, setActiveFYId] = useState<number>(selectedFY.id);

  // Bank turnover states
  const [bankAccounts, setBankAccounts] = useState<ClientBankAccount[]>([]);
  const [turnoverData, setTurnoverData] = useState<ClientBankTurnover[]>([]);
  const [statementBackups, setStatementBackups] = useState<BankStatementBackup[]>([]);
  const [monthlyInputs, setMonthlyInputs] = useState<Record<number, Record<string, string>>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ slot: number; message: string } | null>(null);
  const [editingSlotConfig, setEditingSlotConfig] = useState<BankAccountSlot | null>(null);
  const [revealedAccounts, setRevealedAccounts] = useState<Record<number, boolean>>({});

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

  const loadBankData = () => {
    if (!client) return;
    const accounts = GSTStorage.getClientBankAccounts(client.id);
    const turnovers = GSTStorage.getClientBankTurnover(client.id, activeFYId);
    const backups = GSTStorage.getClientBankStatements(client.id, activeFYId);

    setBankAccounts(accounts);
    setTurnoverData(turnovers);
    setStatementBackups(backups);

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
    if (client) {
      loadBankData();
      setEditingSlotConfig(null);
      setUploadError(null);
    }
  }, [client?.id, activeFYId]);

  if (!isOpen || !client) return null;

  const activeFY = financialYears.find((f) => f.id === activeFYId) || selectedFY;

  // Monthly work for this client in the chosen FY
  const clientFYWork = monthlyWork.filter(
    (m) => m.client_id === client.id && m.financial_year_id === activeFY.id
  );
  const workMap = new Map<string, MonthlyWork>();
  clientFYWork.forEach((w) => workMap.set(w.month, w));

  // Client status history
  const clientHistory = workHistory.filter((h) => h.client_id === client.id);

  const staffName = client.assigned_staff_id
    ? users.find((u) => u.id === client.assigned_staff_id)?.name || 'Unassigned'
    : 'Unassigned';

  const formatINR = (val: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const calculateAccountTotal = (accountId: number): number => {
    const accInputs = monthlyInputs[accountId];
    if (!accInputs) return 0;
    return FY_MONTHS.reduce((sum, m) => {
      const val = parseFloat(accInputs[m]) || 0;
      return sum + val;
    }, 0);
  };

  const grandTotalTurnover = bankAccounts.reduce((sum, acc) => {
    return sum + calculateAccountTotal(acc.id);
  }, 0);

  const handleInputChange = (accountId: number, month: string, value: string) => {
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    setMonthlyInputs((prev) => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] || {}),
        [month]: value,
      },
    }));
  };

  const handleSaveAccountTurnover = (account: ClientBankAccount) => {
    const accInputs = monthlyInputs[account.id] || {};
    const amountsToSave: Record<string, number> = {};
    FY_MONTHS.forEach((m) => {
      amountsToSave[m] = parseFloat(accInputs[m]) || 0;
    });

    GSTStorage.batchSaveClientBankTurnover(client.id, account.id, activeFY.id, amountsToSave);
    setSaveStatus(`Saved turnover for Slot #${account.slot_number} (${account.bank_name})!`);
    setTimeout(() => setSaveStatus(null), 3000);
    loadBankData();
  };

  const handleOpenSlotConfig = (slotNum: BankAccountSlot) => {
    const existing = bankAccounts.find((a) => a.slot_number === slotNum);
    if (existing) {
      setSlotForm({
        slot_number: slotNum,
        bank_name: existing.bank_name,
        account_number: existing.account_number,
        account_holder_name: existing.account_holder_name || client.firm_name,
        account_type: existing.account_type,
        ifsc: existing.ifsc,
        status: existing.status,
      });
    } else {
      setSlotForm({
        slot_number: slotNum,
        bank_name: '',
        account_number: '',
        account_holder_name: client.firm_name,
        account_type: 'Current',
        ifsc: '',
        status: 'active',
      });
    }
    setEditingSlotConfig(slotNum);
  };

  const handleSubmitSlotConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotForm.bank_name.trim()) return;

    GSTStorage.saveClientBankAccount({
      client_id: client.id,
      slot_number: slotForm.slot_number,
      bank_name: slotForm.bank_name.trim(),
      account_number: slotForm.account_number.trim(),
      account_holder_name: slotForm.account_holder_name.trim() || client.firm_name,
      account_type: slotForm.account_type,
      ifsc: slotForm.ifsc.trim().toUpperCase(),
      status: slotForm.status,
    });

    setEditingSlotConfig(null);
    setSaveStatus(`Bank Slot #${slotForm.slot_number} configured!`);
    setTimeout(() => setSaveStatus(null), 3000);
    loadBankData();
  };

  const handleDeleteSlotAccount = (accountId: number, slotNum: number) => {
    if (window.confirm(`Remove Bank Account Slot #${slotNum}?`)) {
      GSTStorage.deleteClientBankAccount(accountId);
      loadBankData();
    }
  };

  const handleZipFileUpload = (
    account: ClientBankAccount,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const isZip = file.name.toLowerCase().endsWith('.zip');

    if (!isZip) {
      setUploadError({
        slot: account.slot_number,
        message: 'Only ZIP files are allowed.',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      GSTStorage.saveBankStatementBackup({
        client_id: client.id,
        bank_account_id: account.id,
        financial_year_id: activeFY.id,
        file_name: file.name,
        file_size: file.size,
        file_data_base64: reader.result as string,
      });

      setSaveStatus(`Statement backup uploaded for Slot #${account.slot_number}!`);
      setTimeout(() => setSaveStatus(null), 3000);
      loadBankData();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadBackup = (backup: BankStatementBackup) => {
    if (backup.file_data_base64) {
      const a = document.createElement('a');
      a.href = backup.file_data_base64;
      a.download = backup.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDeleteBackup = (backupId: number) => {
    if (window.confirm('Delete statement backup file?')) {
      GSTStorage.deleteBankStatementBackup(backupId);
      loadBankData();
    }
  };

  const getStatusBadge = (status: WorkStatus) => {
    const styleMap: Record<WorkStatus, string> = {
      Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Nil Filed': 'bg-teal-100 text-teal-800 border-teal-200',
      'Data Received': 'bg-blue-100 text-blue-800 border-blue-200',
      'RCM Pay': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Challan Generated': 'bg-violet-100 text-violet-800 border-violet-200',
      'Not Started': 'bg-slate-100 text-slate-700 border-slate-200',
      Pending: 'bg-amber-100 text-amber-800 border-amber-200',
      'Bill Pending': 'bg-orange-100 text-orange-800 border-orange-200',
      'Tax Payment Pending': 'bg-rose-100 text-rose-800 border-rose-200',
      'Documents Pending': 'bg-purple-100 text-purple-800 border-purple-200',
      'Client Response Pending': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'GSTR-1 Filed': 'bg-sky-100 text-sky-800 border-sky-200',
      Other: 'bg-slate-100 text-slate-700 border-slate-200',
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
          styleMap[status] || 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[94vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {client.file_no && (
                  <span className="font-mono text-xs font-bold text-[#78350F] bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#E8DCC4]" title="File No">
                    📁 {client.file_no}
                  </span>
                )}
                <h3 className="font-bold text-slate-900 text-base">{client.firm_name}</h3>
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {client.gstin}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    client.gst_type === 'regular'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {client.gst_type}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {client.file_no ? <><span className="text-[#78350F] font-bold">File #{client.file_no}</span> • </> : null}
                Contact: <strong className="text-slate-700">{client.client_name}</strong> • Phone:{' '}
                <strong className="text-slate-700">{client.mobile}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToGstTurnover && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToGstTurnover(client.id);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#78350F] bg-[#FAF6F0] hover:bg-[#E8DCC4] border border-[#E8DCC4] transition-colors flex items-center gap-1 cursor-pointer"
                title="Open 12-Month GST Turnover Entry"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>GST Turnover</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onOpenEdit(client);
              }}
              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Edit Client"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('gst')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'gst'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>GST Compliance (12 Months)</span>
            </button>

            <button
              id="modal-tab-bank-turnover"
              onClick={() => setActiveTab('bank-turnover')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'bank-turnover'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>Bank Turnover (5 Accounts)</span>
              {bankAccounts.length > 0 && (
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full">
                  {bankAccounts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Status Audit Trail</span>
            </button>
          </div>

          {/* FY Switcher */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 my-1">
            <span className="text-slate-500 text-[11px] font-medium">FY:</span>
            <select
              value={activeFYId}
              onChange={(e) => setActiveFYId(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
            >
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Notification Banner */}
          {saveStatus && (
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{saveStatus}</span>
            </div>
          )}

          {/* Master Details Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 text-[11px] block">Contact & Email</span>
              <div className="font-semibold text-slate-800 mt-0.5">{client.mobile}</div>
              <div className="text-slate-500 text-[11px]">{client.email || 'No email provided'}</div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Assigned Staff & Status</span>
              <div className="font-semibold text-slate-800 mt-0.5">{staffName}</div>
              <div className="text-slate-500 text-[11px] capitalize">Status: {client.status}</div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block">Location & Address</span>
              <div className="font-semibold text-slate-800 mt-0.5 truncate">
                {client.city ? `${client.city}, ${client.state || ''}` : client.state || '-'}
              </div>
              <div className="text-slate-500 text-[11px] truncate">
                {client.address || 'No street address'}
              </div>
            </div>
          </div>

          {/* TAB 1: GST 12-Month Compliance Matrix */}
          {activeTab === 'gst' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    12-Month GST Work Matrix ({activeFY.display_name})
                  </h4>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-3.5 py-2.5">Month</th>
                      <th className="px-3.5 py-2.5">Work Status</th>
                      <th className="px-3.5 py-2.5">Remark / Note</th>
                      <th className="px-3.5 py-2.5 text-right">Updated By / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {FY_MONTHS.map((m) => {
                      const record = workMap.get(m);
                      const status: WorkStatus = record ? record.status : 'Not Started';

                      return (
                        <tr key={m} className="hover:bg-slate-50/60">
                          <td className="px-3.5 py-2 font-bold text-slate-800">{m}</td>
                          <td className="px-3.5 py-2">{getStatusBadge(status)}</td>
                          <td className="px-3.5 py-2 text-slate-600">
                            {record?.remark || <span className="text-slate-400">-</span>}
                          </td>
                          <td className="px-3.5 py-2 text-right text-slate-400 text-[11px]">
                            {record?.updated_at ? (
                              <span>
                                {record.updated_at.split(' ')[0]} by{' '}
                                <strong className="text-slate-600">
                                  {record.updated_by_name || 'Staff'}
                                </strong>
                              </span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Bank Turnover (5 Accounts & Statements) */}
          {activeTab === 'bank-turnover' && (
            <div className="space-y-4">
              {/* Grand Total Bar */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-300 font-bold uppercase tracking-wider block">
                    Grand Total Bank Turnover ({activeFY.display_name})
                  </span>
                  <span className="text-xs text-slate-400">
                    Sum of all 5 bank account slots for {client.firm_name}
                  </span>
                </div>
                <div className="text-xl font-black text-emerald-400">
                  {formatINR(grandTotalTurnover)}
                </div>
              </div>

              {/* Slot Config Form if active */}
              {editingSlotConfig !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <h5 className="font-bold text-slate-900 text-xs">
                    Configure Bank Account Slot #{editingSlotConfig}
                  </h5>
                  <form onSubmit={handleSubmitSlotConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-0.5">Bank Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. State Bank of India"
                        value={slotForm.bank_name}
                        onChange={(e) => setSlotForm({ ...slotForm, bank_name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-0.5">Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 30495812948"
                        value={slotForm.account_number}
                        onChange={(e) => setSlotForm({ ...slotForm, account_number: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-0.5">Account Holder</label>
                      <input
                        type="text"
                        value={slotForm.account_holder_name}
                        onChange={(e) => setSlotForm({ ...slotForm, account_holder_name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-0.5">Account Type</label>
                      <select
                        value={slotForm.account_type}
                        onChange={(e) => setSlotForm({ ...slotForm, account_type: e.target.value as BankAccountType })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <option value="Current">Current Account</option>
                        <option value="Savings">Savings Account</option>
                        <option value="OD/CC">OD / CC Limit</option>
                        <option value="Cash Credit">Cash Credit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-0.5">IFSC Code</label>
                      <input
                        type="text"
                        value={slotForm.ifsc}
                        onChange={(e) => setSlotForm({ ...slotForm, ifsc: e.target.value.toUpperCase() })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase"
                      />
                    </div>
                    <div className="flex items-end justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingSlotConfig(null)}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                      >
                        Save Slot
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 5 Bank Slots */}
              <div className="space-y-4">
                {([1, 2, 3, 4, 5] as BankAccountSlot[]).map((slotNum) => {
                  const account = bankAccounts.find((a) => a.slot_number === slotNum);
                  const backup = account
                    ? statementBackups.find((b) => b.bank_account_id === account.id)
                    : undefined;
                  const accountTotal = account ? calculateAccountTotal(account.id) : 0;
                  const currentInputs = account ? monthlyInputs[account.id] || {} : {};

                  if (!account) {
                    return (
                      <div
                        key={slotNum}
                        className="p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-slate-200 font-bold flex items-center justify-center text-slate-600 text-xs">
                            #{slotNum}
                          </span>
                          <span className="font-semibold text-slate-600">Bank Account Slot #{slotNum} (Empty)</span>
                        </div>
                        <button
                          onClick={() => handleOpenSlotConfig(slotNum)}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Setup Slot #{slotNum}</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slotNum}
                      className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden"
                    >
                      {/* Slot Header */}
                      <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                            #{slotNum}
                          </span>
                          <span className="font-bold text-slate-900">{account.bank_name}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold uppercase">
                            {account.account_type}
                          </span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            {account.account_number ? `A/C: ${account.account_number}` : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenSlotConfig(slotNum)}
                            className="p-1 text-slate-500 hover:text-blue-600"
                            title="Edit Details"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteSlotAccount(account.id, slotNum)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* 12 Months Turnover Grid */}
                      <div className="p-3 space-y-2.5">
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {FY_MONTHS.map((month) => (
                            <div key={month} className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 block">{month}</span>
                              <input
                                type="text"
                                placeholder="0"
                                value={currentInputs[month] || ''}
                                onChange={(e) => handleInputChange(account.id, month, e.target.value)}
                                className="w-full text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-hidden text-right"
                              />
                            </div>
                          ))}
                        </div>

                        {/* 12 Month Total & ZIP Statement */}
                        <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-100 p-2.5 rounded-lg gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">12 Month Total:</span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {formatINR(accountTotal)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {backup ? (
                              <div className="flex items-center gap-1 text-indigo-800 text-[11px] font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                <FileArchive className="w-3 h-3 text-indigo-600" />
                                <span className="truncate max-w-[120px]">{backup.file_name}</span>
                                <button
                                  onClick={() => handleDownloadBackup(backup)}
                                  className="p-0.5 text-indigo-700 hover:text-indigo-900"
                                  title="Download"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBackup(backup.id)}
                                  className="p-0.5 text-rose-600 hover:text-rose-800"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-1 bg-white hover:bg-indigo-50 text-slate-700 text-[11px] font-bold px-2 py-1 rounded border border-slate-300 cursor-pointer">
                                <Upload className="w-3 h-3" />
                                <span>ZIP Statement</span>
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
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-1 rounded shadow-2xs"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>

                        {uploadError && uploadError.slot === slotNum && (
                          <div className="text-rose-600 text-[11px] font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{uploadError.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Activity & Audit History */}
          {activeTab === 'audit' && (
            <div className="space-y-5">
              {/* Comprehensive Staff Activity Logs for this Client */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-slate-900 text-sm">Client Activity & Modification Logs</h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    24/7 Immutable Audit Trail
                  </span>
                </div>

                {(() => {
                  const clientLogs = GSTStorage.getActivityLogs().filter(
                    (l) => l.client_id === client.id || (l.firm_name && l.firm_name === client.firm_name)
                  );

                  if (clientLogs.length === 0) {
                    return (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs italic">
                        No client-specific staff activity logged yet.
                      </div>
                    );
                  }

                  return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {clientLogs.map((log) => (
                          <div key={log.id} className="p-3 bg-white hover:bg-slate-50/80 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded text-[10px]">
                                  {log.action}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {log.module}
                                </span>
                                <span className="font-bold text-slate-800 text-xs">{log.user_name}</span>
                                <span className="text-[10px] text-slate-400 uppercase">({log.user_role})</span>
                              </div>
                              <p className="text-slate-700 text-xs">{log.description}</p>
                              {log.changed_fields && log.changed_fields.length > 0 && (
                                <div className="text-[10px] text-amber-800 font-mono">
                                  Modified: {log.changed_fields.join(', ')}
                                </div>
                              )}
                            </div>

                            <div className="text-right whitespace-nowrap text-[10px] text-slate-400 font-mono">
                              <div>{log.created_at}</div>
                              <div>IP: {log.ip_address}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Status Audit Trail */}
              <div className="space-y-2 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-slate-600" />
                  <h4 className="font-bold text-slate-900 text-sm">Monthly GST Status History</h4>
                </div>

                {clientHistory.length === 0 ? (
                  <p className="text-slate-400 italic text-xs">No status change history recorded yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {clientHistory.slice(0, 15).map((h) => (
                      <div
                        key={h.id}
                        className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800">
                            {h.fy_name} - {h.month}:
                          </span>{' '}
                          <span className="text-slate-500">{h.previous_status}</span>
                          <span className="mx-1 text-slate-400">→</span>
                          <span className="font-bold text-slate-900">{h.new_status}</span>
                          {h.remark && <span className="text-slate-600 ml-2">"{h.remark}"</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {h.changed_at} by {h.changed_by_name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              if (onNavigateToBankTurnover) {
                onNavigateToBankTurnover(client.id);
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Open in Full Bank Turnover Module</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

