import React, { useState, useMemo } from 'react';
import { Client, FinancialYear, MonthlyWork, User, WorkStatus, FY_MONTHS } from '../../types';
import {
  Search,
  CheckCircle2,
  Clock,
  Filter,
  Calendar,
  Phone,
  FileDown,
  FileSpreadsheet,
  X,
  Edit3,
  Check,
} from 'lucide-react';
import {
  generateMonthlyWorkReportPDF,
  MonthlyWorkExportItem,
  MonthlyWorkFilterInfo,
} from '../../utils/pdfGenerator';

interface StaffMobileMonthlyWorkProps {
  clients: Client[];
  monthlyWork: MonthlyWork[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  onSelectFY: (fy: FinancialYear) => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  users: User[];
  currentUser: User;
  onUpdateStatus: (fyId: number, month: string, clientId: number, status: WorkStatus, remark: string) => void;
  onExportCSV?: () => void;
}

export const StaffMobileMonthlyWork: React.FC<StaffMobileMonthlyWorkProps> = ({
  clients,
  monthlyWork,
  financialYears,
  selectedFY,
  onSelectFY,
  selectedMonth,
  onSelectMonth,
  users,
  currentUser,
  onUpdateStatus,
  onExportCSV,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterScheme, setFilterScheme] = useState<string>('all');
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [tempStatus, setTempStatus] = useState<WorkStatus>('Completed');
  const [tempRemark, setTempRemark] = useState('');

  // Assigned active clients
  const myClients = clients.filter(
    (c) => c.assigned_staff_id === currentUser.id && c.status === 'active'
  );
  const displayClients = myClients.length > 0 ? myClients : clients.filter((c) => c.status === 'active');
  const displayClientIds = new Set(displayClients.map((c) => c.id));

  // Current month's work
  const currentWork = monthlyWork.filter(
    (w) => w.financial_year_id === selectedFY.id && w.month === selectedMonth && displayClientIds.has(w.client_id)
  );

  const workMap = new Map<number, MonthlyWork>();
  currentWork.forEach((w) => workMap.set(w.client_id, w));

  // Metrics
  const completedCount = currentWork.filter((w) => w.status === 'Completed').length;
  const pendingCount = displayClients.length - completedCount;
  const completionRate = displayClients.length > 0 ? Math.round((completedCount / displayClients.length) * 100) : 0;

  // Filtered list
  const filteredClients = useMemo(() => {
    let list = [...displayClients];

    // Scheme filter
    if (filterScheme !== 'all') {
      list = list.filter((c) => (c.gst_type || '').toLowerCase() === filterScheme.toLowerCase());
    }

    // Status filter
    if (filterStatus !== 'all') {
      list = list.filter((c) => {
        const work = workMap.get(c.id);
        const status = work ? work.status : 'Pending';
        if (filterStatus === 'Completed') return status === 'Completed';
        if (filterStatus === 'Pending') return status !== 'Completed';
        return status === filterStatus;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.firm_name.toLowerCase().includes(q) ||
          c.gstin.toLowerCase().includes(q) ||
          c.client_name.toLowerCase().includes(q) ||
          (c.file_no && c.file_no.toLowerCase().includes(q))
      );
    }

    return list;
  }, [displayClients, filterScheme, filterStatus, searchQuery, workMap]);

  const handleSaveStatus = (clientId: number) => {
    onUpdateStatus(selectedFY.id, selectedMonth, clientId, tempStatus, tempRemark);
    setEditingClientId(null);
  };

  const handleDownloadPDF = () => {
    const items: MonthlyWorkExportItem[] = filteredClients.map((client) => {
      const work = workMap.get(client.id);
      const staff = users.find((u) => u.id === client.assigned_staff_id);
      return {
        client,
        status: work?.status || 'Not Started',
        remark: work?.remark || '',
        staffName: staff?.name || 'Unassigned',
        updatedAt: work?.updated_at,
      };
    });

    const filterInfo: MonthlyWorkFilterInfo = {
      statusFilter: filterStatus,
      schemeFilter: filterScheme,
      staffFilter: 'all',
      searchTerm: searchQuery,
    };

    generateMonthlyWorkReportPDF(selectedMonth, selectedFY, items, filterInfo);
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Top Header Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Monthly GST Work</h1>
            <p className="text-[11px] text-slate-500 font-semibold">
              Period: <span className="font-bold text-blue-700">{selectedMonth} (FY {selectedFY.display_name})</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 shadow-2xs transition-all cursor-pointer"
              title="Download PDF Report"
            >
              <FileDown className="w-4 h-4" />
            </button>
            {onExportCSV && (
              <button
                type="button"
                onClick={onExportCSV}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 shadow-2xs transition-all cursor-pointer"
                title="Export CSV"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filing Progress Summary */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
            <span>Filing Status:</span>
            <span className="text-emerald-700 font-extrabold">{completedCount} Completed / {pendingCount} Pending ({completionRate}%)</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Month Selector Carousel */}
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

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Firm, GSTIN, File No..."
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-8 py-2 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({displayClients.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('Pending')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
              filterStatus === 'Pending'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('Completed')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
              filterStatus === 'Completed'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('Bill Pending')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
              filterStatus === 'Bill Pending'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Bill Pending
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('Documents Pending')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
              filterStatus === 'Documents Pending'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            Docs Pending
          </button>
        </div>
      </div>

      {/* Client GST Work Cards */}
      {filteredClients.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="text-xs font-bold text-slate-800">No GST Work Records Found</div>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredClients.map((client) => {
            const work = workMap.get(client.id);
            const status: WorkStatus = work?.status || 'Pending';
            const remark = work?.remark || '';
            const isEditing = editingClientId === client.id;
            const isCompleted = status === 'Completed';

            return (
              <div
                key={client.id}
                className={`bg-white p-3.5 rounded-2xl border transition-all shadow-2xs ${
                  isCompleted ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                {/* Firm & File Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-slate-900 leading-tight">
                      {client.firm_name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {client.gstin}
                    </div>
                  </div>

                  {client.file_no && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      File: {client.file_no}
                    </span>
                  )}
                </div>

                {/* Scheme & Status Badges */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        (client.gst_type || '').toLowerCase() === 'composition'
                          ? 'bg-amber-100 text-amber-800'
                          : (client.gst_type || '').toLowerCase() === 'qrmp'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {client.gst_type || 'Normal'}
                    </span>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  {client.mobile && (
                    <a
                      href={`tel:${client.mobile}`}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>Call</span>
                    </a>
                  )}
                </div>

                {/* Remark snippet (if present and not editing) */}
                {remark && !isEditing && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200 mt-2">
                    <span className="font-bold text-slate-700">Note: </span>
                    <span>{remark}</span>
                  </div>
                )}

                {/* Status Update Trigger / Expand */}
                {!isEditing ? (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[10px] text-slate-400 font-medium">
                      {work?.updated_at
                        ? `Updated on ${new Date(work.updated_at).toLocaleDateString('en-IN')}`
                        : 'Status pending update'}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingClientId(client.id);
                        setTempStatus(status);
                        setTempRemark(remark);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Change Status</span>
                    </button>
                  </div>
                ) : (
                  /* Inline Status Form */
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 bg-slate-50 p-3 rounded-xl">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        GST Return Status:
                      </label>
                      <select
                        value={tempStatus}
                        onChange={(e) => setTempStatus(e.target.value as WorkStatus)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
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
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Remark:
                      </label>
                      <input
                        type="text"
                        value={tempRemark}
                        onChange={(e) => setTempRemark(e.target.value)}
                        placeholder="Add filing remark, challan details, etc."
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSaveStatus(client.id)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingClientId(null)}
                        className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
