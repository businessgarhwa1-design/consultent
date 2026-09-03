import React, { useState } from 'react';
import { Client, FinancialYear, MonthlyWork, OfficeVisit, User, WorkStatus, FY_MONTHS } from '../../types';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Phone,
  CalendarCheck2,
  Calendar,
  RefreshCw,
  LogOut,
  ChevronRight,
  Calculator,
  Landmark,
  FileSpreadsheet,
  ClipboardList,
  Sparkles,
} from 'lucide-react';

interface StaffMobileDashboardProps {
  currentUser: User;
  clients: Client[];
  monthlyWork: MonthlyWork[];
  selectedFY: FinancialYear;
  selectedMonth: string;
  officeVisits?: OfficeVisit[];
  onSelectMonth: (month: string) => void;
  onNavigateTab: (tab: any, filterStatus?: string, filterScheme?: string) => void;
  onUpdateStatus: (fyId: number, month: string, clientId: number, status: WorkStatus, remark: string) => void;
  onRefreshPortal?: () => void;
  isRefreshingPortal?: boolean;
}

export const StaffMobileDashboard: React.FC<StaffMobileDashboardProps> = ({
  currentUser,
  clients,
  monthlyWork,
  selectedFY,
  selectedMonth,
  officeVisits = [],
  onSelectMonth,
  onNavigateTab,
  onUpdateStatus,
  onRefreshPortal,
  isRefreshingPortal = false,
}) => {
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [tempStatus, setTempStatus] = useState<WorkStatus>('Completed');
  const [tempRemark, setTempRemark] = useState('');

  // Assigned active clients
  const myClients = clients.filter(
    (c) => c.assigned_staff_id === currentUser.id && c.status === 'active'
  );
  const displayClients = myClients.length > 0 ? myClients : clients.filter((c) => c.status === 'active');
  const displayClientIds = new Set(displayClients.map((c) => c.id));

  // Current month work items
  const currentMonthWork = monthlyWork.filter(
    (w) => w.financial_year_id === selectedFY.id && w.month === selectedMonth && displayClientIds.has(w.client_id)
  );

  const workMap = new Map<number, MonthlyWork>();
  currentMonthWork.forEach((w) => workMap.set(w.client_id, w));

  const completedCount = currentMonthWork.filter((w) => w.status === 'Completed').length;
  const pendingCount = displayClients.length - completedCount;
  const completionRate = displayClients.length > 0 ? Math.round((completedCount / displayClients.length) * 100) : 0;

  // Active visitors currently in office
  const inOfficeVisits = officeVisits.filter((v) => v.status === 'IN');

  // Pending clients for quick follow-up
  const pendingClients = displayClients.filter((c) => {
    const work = workMap.get(c.id);
    return !work || work.status !== 'Completed';
  });

  const handleQuickStatusSave = (clientId: number) => {
    onUpdateStatus(selectedFY.id, selectedMonth, clientId, tempStatus, tempRemark);
    setEditingClientId(null);
    setTempRemark('');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-md border border-blue-800/40">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-blue-200 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Staff Workspace</span>
            </div>
            <h1 className="text-lg font-black text-white tracking-tight">
              Hello, {currentUser.name}
            </h1>
            <p className="text-xs text-blue-200/90 mt-0.5">
              GST Work Period: <span className="font-bold text-white">{selectedMonth} (FY {selectedFY.display_name})</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onRefreshPortal}
            disabled={isRefreshingPortal}
            className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all border border-white/10"
            title="Refresh from Cloud"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingPortal ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-blue-200">{selectedMonth} Filing Progress</span>
            <span className="font-bold text-white">{completedCount} / {displayClients.length} Filed ({completionRate}%)</span>
          </div>
          <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Month Switcher Chips */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Switch Working Month:
          </span>
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            FY {selectedFY.display_name}
          </span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {FY_MONTHS.map((m) => {
            const isSelected = m === selectedMonth;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onSelectMonth(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {m.substring(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Key Metric Cards (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Assigned */}
        <div
          onClick={() => onNavigateTab('clients')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs active:bg-slate-50 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-slate-900">{displayClients.length}</div>
          <div className="text-xs font-semibold text-slate-600">Active Clients</div>
          <div className="text-[10px] text-blue-600 font-bold mt-1 flex items-center gap-0.5">
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Completed */}
        <div
          onClick={() => onNavigateTab('monthly-work', 'Completed')}
          className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs active:bg-emerald-50 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-emerald-700">{completedCount}</div>
          <div className="text-xs font-semibold text-slate-600">Returns Filed</div>
          <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-0.5">
            <span>View Filed</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Pending */}
        <div
          onClick={() => onNavigateTab('monthly-work', 'Pending')}
          className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs active:bg-amber-50 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-amber-700">{pendingCount}</div>
          <div className="text-xs font-semibold text-slate-600">Pending Filing</div>
          <div className="text-[10px] text-amber-700 font-bold mt-1 flex items-center gap-0.5">
            <span>Action Required</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Office Visitors IN */}
        <div
          onClick={() => onNavigateTab('office-visits')}
          className="bg-white p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/30 shadow-2xs active:bg-indigo-50 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-indigo-700">{inOfficeVisits.length}</div>
          <div className="text-xs font-semibold text-slate-600">Visitors IN Office</div>
          <div className="text-[10px] text-indigo-700 font-bold mt-1 flex items-center gap-0.5">
            <span>Visitor Register</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Quick Access Tools */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Quick Operations
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('monthly-work')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100 text-blue-900 border border-blue-100 active:scale-95 transition-all text-center cursor-pointer"
          >
            <CalendarCheck2 className="w-5 h-5 text-blue-600 mb-1" />
            <span className="text-[11px] font-bold leading-tight">GST Work</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('office-visits')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 border border-indigo-100 active:scale-95 transition-all text-center cursor-pointer"
          >
            <ClipboardList className="w-5 h-5 text-indigo-600 mb-1" />
            <span className="text-[11px] font-bold leading-tight">Office Visits</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('gst-turnover-entry')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-100 active:scale-95 transition-all text-center cursor-pointer"
          >
            <Calculator className="w-5 h-5 text-emerald-600 mb-1" />
            <span className="text-[11px] font-bold leading-tight">GST Turnover</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('bank-turnover')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-violet-50/70 hover:bg-violet-100 text-violet-900 border border-violet-100 active:scale-95 transition-all text-center cursor-pointer"
          >
            <Landmark className="w-5 h-5 text-violet-600 mb-1" />
            <span className="text-[11px] font-bold leading-tight">Bank Turnover</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('reports')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-teal-50/70 hover:bg-teal-100 text-teal-900 border border-teal-100 active:scale-95 transition-all text-center cursor-pointer"
          >
            <FileSpreadsheet className="w-5 h-5 text-teal-600 mb-1" />
            <span className="text-[11px] font-bold leading-tight">Reports PDF</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('clients')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 active:scale-95 transition-all text-center cursor-pointer"
          >
            <Users className="w-5 h-5 text-slate-700 mb-1" />
            <span className="text-[11px] font-bold leading-tight">All Clients</span>
          </button>
        </div>
      </div>

      {/* Priority Action: Pending Follow-Ups for this Month */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pending Follow-Ups ({pendingClients.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Update filing status or tap to call client
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('monthly-work')}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
          >
            <span>Full List</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingClients.length === 0 ? (
          <div className="p-6 text-center bg-emerald-50 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
            <div className="text-xs font-bold text-emerald-900">All Returns Filed!</div>
            <div className="text-[11px] text-emerald-700">Great job! All assigned clients for {selectedMonth} are completed.</div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingClients.slice(0, 6).map((c) => {
              const work = workMap.get(c.id);
              const isEditing = editingClientId === c.id;
              const currentStatus = work?.status || 'Pending';

              return (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {c.firm_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {c.gstin}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {currentStatus}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {c.gst_type}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {c.mobile && (
                        <a
                          href={`tel:${c.mobile}`}
                          className="p-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-all"
                          title="Call Client"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingClientId(null);
                          } else {
                            setEditingClientId(c.id);
                            setTempStatus(work?.status || 'Completed');
                            setTempRemark(work?.remark || '');
                          }
                        }}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                      >
                        {isEditing ? 'Cancel' : 'Update'}
                      </button>
                    </div>
                  </div>

                  {/* Inline Status & Remark Editor */}
                  {isEditing && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Select Status:
                        </label>
                        <select
                          value={tempStatus}
                          onChange={(e) => setTempStatus(e.target.value as WorkStatus)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Completed">Completed (Filed)</option>
                          <option value="Pending">Pending</option>
                          <option value="Bill Pending">Bill Pending</option>
                          <option value="Tax Payment Pending">Tax Payment Pending</option>
                          <option value="Documents Pending">Documents Pending</option>
                          <option value="Client Response Pending">Client Response Pending</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Remark / Note:
                        </label>
                        <input
                          type="text"
                          value={tempRemark}
                          onChange={(e) => setTempRemark(e.target.value)}
                          placeholder="e.g. Challan shared, OTP awaited..."
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuickStatusSave(c.id)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Status</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
