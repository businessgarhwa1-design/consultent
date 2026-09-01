import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  UserPlus,
  Building2,
  Clock,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Plus,
  CheckCircle2,
  LogOut,
  MessageSquare,
  History,
  Edit,
  Trash2,
  Phone,
  Tag,
  ChevronDown,
  X,
  Sparkles,
  ArrowUpDown,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  Client,
  FinancialYear,
  OfficeVisit,
  User,
  VISIT_PURPOSES,
  AppSettings,
  FY_MONTHS,
} from '../../types';
import { NewVisitModal } from './NewVisitModal';
import { MarkOutModal } from './MarkOutModal';
import { AddVisitNoteModal } from './AddVisitNoteModal';
import { EditVisitModal } from './EditVisitModal';
import { VisitHistoryModal } from './VisitHistoryModal';
import { generateOfficeVisitPDF } from './OfficeVisitPdfReport';

interface OfficeVisitsProps {
  visits: OfficeVisit[];
  clients: Client[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  onSelectFY: (fy: FinancialYear) => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  users: User[];
  currentUser: User;
  settings?: AppSettings;
  onAddVisit: (
    data: Omit<
      OfficeVisit,
      'id' | 'created_at' | 'updated_at' | 'updated_by_id' | 'updated_by_name' | 'remarks_log'
    > & { initial_note?: string }
  ) => { success: boolean; visit?: OfficeVisit; error?: string };
  onUpdateVisit: (
    id: number,
    data: Partial<Omit<OfficeVisit, 'id' | 'created_at' | 'remarks_log'>> & { new_note?: string }
  ) => { success: boolean; visit?: OfficeVisit; error?: string };
  onMarkVisitOut: (id: number, outTime: string, outRemark?: string) => void;
  onAddVisitNote: (id: number, noteText: string) => void;
  onDeleteVisit: (id: number) => void;
  onOpenAddClientWithData?: (data: Partial<Client>) => void;
  onRefreshData?: () => void;
}

type FilterTab = 'all' | 'in_office' | 'out' | 'today' | 'registered' | 'new_visitors';

function getTodayISTDate(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export const OfficeVisits: React.FC<OfficeVisitsProps> = ({
  visits,
  clients,
  financialYears,
  selectedFY,
  onSelectFY,
  selectedMonth,
  onSelectMonth,
  users,
  currentUser,
  settings,
  onAddVisit,
  onUpdateVisit,
  onMarkVisitOut,
  onAddVisitNote,
  onDeleteVisit,
  onOpenAddClientWithData,
  onRefreshData,
}) => {
  // State for tabs & filters
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('all');
  const [scopeToFYMonth, setScopeToFYMonth] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterClientType, setFilterClientType] = useState('all');
  const [filterPurpose, setFilterPurpose] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'IN' | 'OUT'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'firm' | 'status'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isNewVisitModalOpen, setIsNewVisitModalOpen] = useState(false);
  const [prefillClientForNewVisit, setPrefillClientForNewVisit] = useState<Client | null>(null);

  const [markOutTargetVisit, setMarkOutTargetVisit] = useState<OfficeVisit | null>(null);
  const [addNoteTargetVisit, setAddNoteTargetVisit] = useState<OfficeVisit | null>(null);
  const [editTargetVisit, setEditTargetVisit] = useState<OfficeVisit | null>(null);

  const [historyTargetClient, setHistoryTargetClient] = useState<Client | null>(null);
  const [historyTargetMobile, setHistoryTargetMobile] = useState<string>('');
  const [historyTargetFirmName, setHistoryTargetFirmName] = useState<string>('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const todayStr = getTodayISTDate();

  // Metrics calculations
  const todayVisits = useMemo(() => visits.filter((v) => v.visit_date === todayStr), [visits, todayStr]);
  const todayInCount = useMemo(() => todayVisits.filter((v) => v.status === 'IN').length, [todayVisits]);
  const todayOutCount = useMemo(() => todayVisits.filter((v) => v.status === 'OUT').length, [todayVisits]);
  const totalInOfficeCount = useMemo(() => visits.filter((v) => v.status === 'IN').length, [visits]);
  const totalRegisteredCount = useMemo(() => visits.filter((v) => v.visitor_type === 'registered').length, [visits]);
  const totalNewCount = useMemo(() => visits.filter((v) => v.visitor_type === 'new').length, [visits]);

  // Handle Refresh
  const handleTriggerRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshData) {
      onRefreshData();
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // FY and Month Scoping (if enabled)
      if (scopeToFYMonth) {
        if (v.financial_year_id && v.financial_year_id !== selectedFY.id) return false;
        if (v.month && v.month !== selectedMonth) return false;
      }

      // Quick Tab Filter
      if (activeFilterTab === 'in_office' && v.status !== 'IN') return false;
      if (activeFilterTab === 'out' && v.status !== 'OUT') return false;
      if (activeFilterTab === 'today' && v.visit_date !== todayStr) return false;
      if (activeFilterTab === 'registered' && v.visitor_type !== 'registered') return false;
      if (activeFilterTab === 'new_visitors' && v.visitor_type !== 'new') return false;

      // Status Filter
      if (filterStatus !== 'all' && v.status !== filterStatus) return false;

      // Date Filter
      if (filterDate && v.visit_date !== filterDate) return false;

      // Client Type Filter
      if (filterClientType !== 'all') {
        if (filterClientType === 'Normal' && v.client_type !== 'Normal') return false;
        if (filterClientType === 'Composition' && v.client_type !== 'Composition') return false;
        if (filterClientType === 'QRMP' && v.client_type !== 'QRMP') return false;
        if (filterClientType === 'Non-Registered' && v.client_type !== 'Non-Registered') return false;
      }

      // Purpose Filter
      if (filterPurpose !== 'all' && v.purpose !== filterPurpose) return false;

      // Staff Filter
      if (filterStaff !== 'all' && v.entry_by_name !== filterStaff && v.out_marked_by_name !== filterStaff) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (v.firm_name && v.firm_name.toLowerCase().includes(q)) ||
          (v.client_name && v.client_name.toLowerCase().includes(q)) ||
          (v.gst_number && v.gst_number.toLowerCase().includes(q)) ||
          (v.mobile && v.mobile.includes(q)) ||
          (v.file_number && v.file_number.toLowerCase().includes(q)) ||
          (v.purpose && v.purpose.toLowerCase().includes(q)) ||
          (v.current_remark && v.current_remark.toLowerCase().includes(q)) ||
          (v.entry_by_name && v.entry_by_name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [
    visits,
    scopeToFYMonth,
    selectedFY,
    selectedMonth,
    activeFilterTab,
    todayStr,
    filterStatus,
    filterDate,
    filterClientType,
    filterPurpose,
    filterStaff,
    searchQuery,
  ]);

  // Sort visits
  const sortedVisits = useMemo(() => {
    const list = [...filteredVisits];
    list.sort((a, b) => {
      if (sortField === 'date') {
        const cmp = (b.visit_date + ' ' + (b.in_time || '')).localeCompare(
          a.visit_date + ' ' + (a.in_time || '')
        );
        return sortAsc ? -cmp : cmp;
      }
      if (sortField === 'firm') {
        const cmp = (a.firm_name || a.client_name).localeCompare(b.firm_name || b.client_name);
        return sortAsc ? cmp : -cmp;
      }
      if (sortField === 'status') {
        const cmp = a.status.localeCompare(b.status);
        return sortAsc ? cmp : -cmp;
      }
      return b.id - a.id;
    });
    return list;
  }, [filteredVisits, sortField, sortAsc]);

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterDate('');
    setFilterClientType('all');
    setFilterPurpose('all');
    setFilterStaff('all');
    setFilterStatus('all');
    setActiveFilterTab('all');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (sortedVisits.length === 0) return;
    const headers = [
      'ID',
      'Visitor Type',
      'Client / Firm Name',
      'Visitor Name',
      'GSTIN',
      'File No',
      'Mobile',
      'Client Scheme',
      'Purpose',
      'Latest Remark',
      'Visit Date',
      'Month',
      'FY',
      'IN Time',
      'OUT Time',
      'Status',
      'Entry Staff',
      'Exit Staff',
      'Created At',
    ];

    const rows = sortedVisits.map((v) => [
      v.id,
      v.visitor_type.toUpperCase(),
      `"${(v.firm_name || '').replace(/"/g, '""')}"`,
      `"${(v.client_name || '').replace(/"/g, '""')}"`,
      v.gst_number || 'N/A',
      v.file_number || 'N/A',
      v.mobile || '',
      v.client_type || 'General',
      `"${(v.purpose || '').replace(/"/g, '""')}"`,
      `"${(v.current_remark || '').replace(/"/g, '""')}"`,
      v.visit_date,
      v.month || '',
      v.financial_year_name || '',
      v.in_time,
      v.out_time || 'Still IN',
      v.status,
      `"${(v.entry_by_name || '').replace(/"/g, '""')}"`,
      `"${(v.out_marked_by_name || '').replace(/"/g, '""')}"`,
      v.created_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `office_client_register_${selectedMonth}_${selectedFY.display_name}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const handlePrintPDF = () => {
    generateOfficeVisitPDF(
      sortedVisits,
      selectedFY,
      selectedMonth,
      settings,
      activeFilterTab !== 'all' ? `Tab: ${activeFilterTab.toUpperCase()}` : undefined
    );
  };

  // Open Client History
  const handleOpenClientHistory = (v: OfficeVisit) => {
    if (v.client_id) {
      const match = clients.find((c) => c.id === v.client_id);
      if (match) {
        setHistoryTargetClient(match);
        setHistoryTargetMobile(match.mobile);
        setHistoryTargetFirmName(match.firm_name);
        setIsHistoryModalOpen(true);
        return;
      }
    }
    setHistoryTargetClient(null);
    setHistoryTargetMobile(v.mobile);
    setHistoryTargetFirmName(v.firm_name || v.client_name);
    setIsHistoryModalOpen(true);
  };

  return (
    <div id="office-visits-container" className="space-y-5 animate-in fade-in duration-300">
      {/* Top Header & FY/Month Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Office Client Entry / Visit Register
              </h1>
              {totalInOfficeCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {totalInOfficeCount} IN OFFICE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Real-time office visitor log, running remarks timeline, client visit history & IN/OUT management
            </p>
          </div>
        </div>

        {/* Global Financial Year & Month Controls + Live Refresh Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* FY Dropdown */}
          <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              id="office-fy-select"
              value={selectedFY.id}
              onChange={(e) => {
                const fy = financialYears.find((f) => f.id === Number(e.target.value));
                if (fy) onSelectFY(fy);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  FY {fy.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Dropdown */}
          <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <select
              id="office-month-select"
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {FY_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Scope to FY/Month Toggle */}
          <button
            type="button"
            id="toggle-scope-fy-month-btn"
            onClick={() => setScopeToFYMonth(!scopeToFYMonth)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              scopeToFYMonth
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {scopeToFYMonth ? '🔍 Scoped to Month' : '🌐 All Records'}
          </button>

          {/* Refresh Portal Button */}
          <button
            type="button"
            id="refresh-office-portal-btn"
            onClick={handleTriggerRefresh}
            title="Refresh portal and sync data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Primary Add Visit Button */}
          <button
            type="button"
            id="open-new-visit-modal-btn"
            onClick={() => {
              setPrefillClientForNewVisit(null);
              setIsNewVisitModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Client Visit / Mark IN</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Today Visitors */}
        <div
          onClick={() => setActiveFilterTab('today')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Today's Visitors</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{todayVisits.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Logged on {todayStr}</div>
        </div>

        {/* Currently IN Office */}
        <div
          onClick={() => setActiveFilterTab('in_office')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            totalInOfficeCount > 0
              ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Currently IN Office
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-black text-emerald-700">{totalInOfficeCount}</div>
          <div className="text-[11px] text-emerald-800 font-bold">Active in premises</div>
        </div>

        {/* Already OUT Today */}
        <div
          onClick={() => setActiveFilterTab('out')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Already Left (OUT)</span>
            <LogOut className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{todayOutCount}</div>
          <div className="text-[11px] text-slate-500 font-medium">Completed today</div>
        </div>

        {/* Registered Clients Visited */}
        <div
          onClick={() => setActiveFilterTab('registered')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Registered Clients</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">{totalRegisteredCount}</div>
          <div className="text-[11px] text-slate-500 font-medium">GST registered files</div>
        </div>

        {/* New / Non-Registered Visitors */}
        <div
          onClick={() => setActiveFilterTab('new_visitors')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">New Visitors</span>
            <UserPlus className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{totalNewCount}</div>
          <div className="text-[11px] text-slate-500 font-medium">Walk-ins & Inquiries</div>
        </div>

        {/* Total In Period */}
        <div
          onClick={() => setActiveFilterTab('all')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Records</span>
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{visits.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Complete Register</div>
        </div>
      </div>

      {/* Main Filter & Action Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              id="filter-tab-all"
              onClick={() => setActiveFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Visits ({visits.length})
            </button>

            <button
              type="button"
              id="filter-tab-in-office"
              onClick={() => setActiveFilterTab('in_office')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilterTab === 'in_office'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Currently IN ({totalInOfficeCount})</span>
            </button>

            <button
              type="button"
              id="filter-tab-out"
              onClick={() => setActiveFilterTab('out')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilterTab === 'out'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Already OUT ({visits.filter((v) => v.status === 'OUT').length})
            </button>

            <button
              type="button"
              id="filter-tab-today"
              onClick={() => setActiveFilterTab('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilterTab === 'today'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today's ({todayVisits.length})
            </button>

            <button
              type="button"
              id="filter-tab-registered"
              onClick={() => setActiveFilterTab('registered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilterTab === 'registered'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Registered ({totalRegisteredCount})
            </button>

            <button
              type="button"
              id="filter-tab-new"
              onClick={() => setActiveFilterTab('new_visitors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilterTab === 'new_visitors'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Visitors ({totalNewCount})
            </button>
          </div>

          {/* Export & Advanced Filter Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="toggle-advanced-filters-btn"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                showAdvancedFilters
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
              />
            </button>

            <button
              type="button"
              id="export-office-csv-btn"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              id="export-office-pdf-btn"
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            id="search-visits-input"
            placeholder="Search by Firm Name, Visitor Name, GSTIN, Mobile No, File No, Purpose, Remark, or Staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Advanced Filters Expandable Drawer */}
        {showAdvancedFilters && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-3 pt-3 animate-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Specific Date</label>
              <input
                type="date"
                id="filter-date-input"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Client Scheme</label>
              <select
                id="filter-client-type-select"
                value={filterClientType}
                onChange={(e) => setFilterClientType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">All Schemes</option>
                <option value="Normal">Normal / Regular</option>
                <option value="Composition">Composition</option>
                <option value="QRMP">QRMP</option>
                <option value="Non-Registered">Non-Registered</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Purpose / Service</label>
              <select
                id="filter-purpose-select"
                value={filterPurpose}
                onChange={(e) => setFilterPurpose(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">All Purposes</option>
                {VISIT_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Handled By Staff</label>
              <select
                id="filter-staff-select"
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">All Staff Members</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                id="clear-filters-btn"
                onClick={handleClearFilters}
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-200 text-rose-600 font-bold text-xs rounded-lg border border-slate-300 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Records Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-bold text-slate-700">
            Showing <strong className="text-slate-900">{sortedVisits.length}</strong> of {visits.length} visit record(s)
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <button
              type="button"
              onClick={() => {
                if (sortField === 'date') setSortAsc(!sortAsc);
                else {
                  setSortField('date');
                  setSortAsc(false);
                }
              }}
              className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 ${
                sortField === 'date' ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Date & Time</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (sortField === 'firm') setSortAsc(!sortAsc);
                else {
                  setSortField('firm');
                  setSortAsc(true);
                }
              }}
              className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 ${
                sortField === 'firm' ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Firm / Client (A-Z)</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Client / Business & Contact Info</th>
                <th className="py-3 px-3 text-center">Scheme</th>
                <th className="py-3 px-3">Purpose & Running Remarks</th>
                <th className="py-3 px-3">Date & Timings</th>
                <th className="py-3 px-3 text-center">Live Status</th>
                <th className="py-3 px-3">Staff Details</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedVisits.length > 0 ? (
                sortedVisits.map((v, idx) => {
                  const isRegistered = v.visitor_type === 'registered';
                  const isIN = v.status === 'IN';

                  return (
                    <tr
                      key={v.id}
                      id={`office-visit-row-${v.id}`}
                      className={`hover:bg-slate-50 transition-colors ${
                        isIN ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      {/* # Number */}
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isRegistered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <UserCheck className="w-3 h-3" />
                            <span>Registered</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Building2 className="w-3 h-3" />
                            <span>New Visitor</span>
                          </span>
                        )}
                      </td>

                      {/* Client / Business & Contact */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-xs">
                          {v.firm_name || v.client_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Contact: <strong className="text-slate-700">{v.client_name}</strong>
                          {v.mobile && (
                            <span className="ml-1 text-slate-600">
                              &bull; 📞 {v.mobile}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {v.gst_number && v.gst_number !== 'N/A' && (
                            <span className="font-mono text-[10px] text-blue-700 font-semibold">
                              GST: {v.gst_number}
                            </span>
                          )}
                          {v.file_number && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              File: <strong>{v.file_number}</strong>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Scheme */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            v.client_type === 'Composition'
                              ? 'bg-amber-100 text-amber-800'
                              : v.client_type === 'QRMP'
                              ? 'bg-purple-100 text-purple-800'
                              : v.client_type === 'Normal'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {v.client_type || 'General'}
                        </span>
                      </td>

                      {/* Purpose & Remarks */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-semibold text-slate-900 text-[11px] flex items-center gap-1">
                          <Tag className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{v.purpose}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 italic">
                          "{v.current_remark || 'No remark added'}"
                        </p>

                        {/* Running remarks timeline trigger */}
                        {v.remarks_log && v.remarks_log.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setAddNoteTargetVisit(v)}
                            className="mt-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                          >
                            <History className="w-3 h-3" />
                            <span>{v.remarks_log.length} notes in timeline</span>
                          </button>
                        )}
                      </td>

                      {/* Date & Timings */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{v.visit_date}</span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
                          IN: {v.in_time}
                        </div>
                        {v.out_time ? (
                          <div className="text-[10px] text-slate-500 font-mono">
                            OUT: {v.out_time}
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 font-semibold animate-pulse">
                            Inside Office
                          </div>
                        )}
                      </td>

                      {/* Live Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isIN ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>IN OFFICE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span>OUT</span>
                          </span>
                        )}
                      </td>

                      {/* Staff */}
                      <td className="py-3 px-3 text-[11px] text-slate-600 whitespace-nowrap">
                        <div>
                          <strong>Entry:</strong> {v.entry_by_name}
                        </div>
                        {v.out_marked_by_name && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            <strong>Exit:</strong> {v.out_marked_by_name}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* If IN: One Click Mark OUT */}
                          {isIN && (
                            <button
                              type="button"
                              id={`mark-out-btn-${v.id}`}
                              onClick={() => setMarkOutTargetVisit(v)}
                              title="Mark visitor OUT of office"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Mark OUT</span>
                            </button>
                          )}

                          {/* Add Running Note */}
                          <button
                            type="button"
                            id={`add-note-btn-${v.id}`}
                            onClick={() => setAddNoteTargetVisit(v)}
                            title="Add running note / remark"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Visit History */}
                          <button
                            type="button"
                            id={`history-btn-${v.id}`}
                            onClick={() => handleOpenClientHistory(v)}
                            title="View complete visit history for this client"
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            id={`edit-visit-btn-${v.id}`}
                            onClick={() => setEditTargetVisit(v)}
                            title="Edit visit record"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* If New Visitor: Register as Client button */}
                          {!isRegistered && onOpenAddClientWithData && (
                            <button
                              type="button"
                              id={`register-client-btn-${v.id}`}
                              onClick={() =>
                                onOpenAddClientWithData({
                                  firm_name: v.firm_name,
                                  client_name: v.client_name,
                                  mobile: v.mobile,
                                  alternate_mobile: v.alternate_mobile || '',
                                  notes: `Converted from Office Visit (${v.visit_date} - ${v.purpose})`,
                                })
                              }
                              title="Convert this visitor into a registered master client"
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Visit */}
                          <button
                            type="button"
                            id={`delete-visit-btn-${v.id}`}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete visit record for "${v.firm_name || v.client_name}" on ${v.visit_date}?`
                                )
                              ) {
                                onDeleteVisit(v.id);
                              }
                            }}
                            title="Delete record"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-bold text-slate-700 text-sm">No office visit entries found</div>
                    <p className="text-slate-400 mt-1 max-w-sm mx-auto">
                      Click <strong className="text-blue-600">"+ New Client Visit / Mark IN"</strong> above to log a registered client or walk-in visitor.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <NewVisitModal
        isOpen={isNewVisitModalOpen}
        onClose={() => setIsNewVisitModalOpen(false)}
        onSave={onAddVisit}
        clients={clients}
        currentUser={currentUser}
        selectedFY={selectedFY}
        selectedMonth={selectedMonth}
        prefillClient={prefillClientForNewVisit}
        existingVisits={visits}
      />

      <MarkOutModal
        isOpen={!!markOutTargetVisit}
        onClose={() => setMarkOutTargetVisit(null)}
        visit={markOutTargetVisit}
        currentUser={currentUser}
        onConfirmOut={onMarkVisitOut}
      />

      <AddVisitNoteModal
        isOpen={!!addNoteTargetVisit}
        onClose={() => setAddNoteTargetVisit(null)}
        visit={addNoteTargetVisit}
        onAddNote={onAddVisitNote}
      />

      <EditVisitModal
        isOpen={!!editTargetVisit}
        onClose={() => setEditTargetVisit(null)}
        visit={editTargetVisit}
        onSave={onUpdateVisit}
      />

      <VisitHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        targetClient={historyTargetClient}
        targetMobile={historyTargetMobile}
        targetFirmName={historyTargetFirmName}
        allVisits={visits}
        selectedFY={selectedFY}
        selectedMonth={selectedMonth}
        settings={settings}
        onOpenNewVisitForClient={(client) => {
          setPrefillClientForNewVisit(client);
          setIsNewVisitModalOpen(true);
        }}
        onOpenAddNote={(visit) => setAddNoteTargetVisit(visit)}
      />
    </div>
  );
};
