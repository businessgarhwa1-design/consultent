import React, { useState, useMemo, useEffect } from 'react';
import {
  Client,
  FinancialYear,
  FY_MONTHS,
  MonthlyWork as MonthlyWorkType,
  User,
  WorkStatus,
  ClientGstTurnover,
} from '../types';
import { GSTStorage } from '../utils/storage';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Save,
  Calendar,
  Sparkles,
  UserCheck,
  Check,
  FileSpreadsheet,
  FileDown,
  FileText,
  Download,
  Info,
  CheckSquare,
  Square,
  MinusSquare,
  RotateCcw,
  RefreshCw,
  Calculator,
  TrendingUp,
  Table,
  Eye,
  Plus,
  Coins,
  ArrowRight,
} from 'lucide-react';
import {
  generateMonthlyWorkReportPDF,
  generateMonthlyWorkReportCSV,
  MonthlyWorkExportItem,
  MonthlyWorkFilterInfo,
} from '../utils/pdfGenerator';
import { GstTurnoverModal } from './GstTurnoverModal';

interface MonthlyWorkProps {
  clients: Client[];
  monthlyWork: MonthlyWorkType[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  onSelectFY: (fy: FinancialYear) => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  users: User[];
  currentUser: User;
  onUpdateStatus: (
    fyId: number,
    month: string,
    clientId: number,
    status: WorkStatus,
    remark: string
  ) => void;
  initialSearchQuery?: string;
  initialStatusFilter?: string;
  initialSchemeFilter?: string;
  initialViewMode?: 'monthly' | 'annual-matrix';
  onExportCSV?: () => void;
  onRefresh?: () => void;
}

const STATUS_OPTIONS: WorkStatus[] = [
  'Not Started',
  'Pending',
  'Completed',
  'Nil Filed',
  'Data Received',
  'RCM Pay',
  'Challan Generated',
  'Bill Pending',
  'Tax Payment Pending',
  'Documents Pending',
  'Client Response Pending',
  'GSTR-1 Filed',
  'Other',
];

const REMARK_PRESETS = [
  'Bill not received from client.',
  'Tax payment pending by client.',
  'Bank statement / documents pending.',
  'Client response pending.',
  'Challan generated, awaiting OTP.',
  'Data received, preparing GSTR-3B.',
  'GSTR-1 & 3B filed successfully.',
  'Nil return filed.',
  'Client delayed sending invoices.',
];

const normalizeCat = (val?: string): 'Normal' | 'Composition' | 'QRMP' => {
  if (!val) return 'Normal';
  const lower = val.trim().toLowerCase();
  if (lower === 'composition') return 'Composition';
  if (lower === 'qrmp') return 'QRMP';
  return 'Normal';
};

export const MonthlyWork: React.FC<MonthlyWorkProps> = ({
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
  initialSearchQuery = '',
  initialStatusFilter = 'all',
  initialSchemeFilter = 'all',
  initialViewMode = 'monthly',
  onExportCSV,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [staffFilter, setStaffFilter] = useState('all');
  const [schemeFilter, setSchemeFilter] = useState(initialSchemeFilter || 'all');
  const [workViewMode, setWorkViewMode] = useState<'monthly' | 'annual-matrix'>(initialViewMode);

  // Sync initial view mode when switching from sidebar submenu
  useEffect(() => {
    if (initialViewMode) {
      setWorkViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // Draft local edits for instant responsive typing without lagging global store
  const [draftStatuses, setDraftStatuses] = useState<Record<number, WorkStatus>>({});
  const [draftRemarks, setDraftRemarks] = useState<Record<number, string>>({});
  const [draftTaxable, setDraftTaxable] = useState<Record<number, string>>({});
  const [draftExempt, setDraftExempt] = useState<Record<number, string>>({});
  const [savedRowIds, setSavedRowIds] = useState<Record<number, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 12-Month GST Turnover Modal State
  const [isTurnoverModalOpen, setIsTurnoverModalOpen] = useState(false);
  const [selectedTurnoverClientId, setSelectedTurnoverClientId] = useState<number | null>(null);

  // GST Turnover records from store
  const [gstTurnoverList, setGstTurnoverList] = useState<ClientGstTurnover[]>([]);

  // Load GST turnover records
  const loadGstTurnover = () => {
    const list = GSTStorage.getGstTurnover();
    setGstTurnoverList(list);

    // Initialize draft taxable & exempt for current month
    const taxDrafts: Record<number, string> = {};
    const exDrafts: Record<number, string> = {};

    list
      .filter((t) => t.financial_year_id === selectedFY.id && t.month === selectedMonth)
      .forEach((rec) => {
        taxDrafts[rec.client_id] = rec.taxable_turnover > 0 ? String(rec.taxable_turnover) : '';
        exDrafts[rec.client_id] = rec.exempt_turnover > 0 ? String(rec.exempt_turnover) : '';
      });

    setDraftTaxable(taxDrafts);
    setDraftExempt(exDrafts);
  };

  useEffect(() => {
    loadGstTurnover();
  }, [selectedFY.id, selectedMonth]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    setDraftStatuses({});
    setDraftRemarks({});
    loadGstTurnover();
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Selection state for granular exports
  const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(new Set());
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Active clients
  const activeClients = useMemo(() => clients.filter((c) => c.status === 'active'), [clients]);

  // Work mapping for selected FY and month
  const workMap = useMemo(() => {
    const map = new Map<number, MonthlyWorkType>();
    monthlyWork
      .filter((m) => m.financial_year_id === selectedFY.id && m.month === selectedMonth)
      .forEach((r) => map.set(r.client_id, r));
    return map;
  }, [monthlyWork, selectedFY.id, selectedMonth]);

  // Map for GST turnover for selected FY & month
  const turnoverMonthMap = useMemo(() => {
    const map = new Map<number, ClientGstTurnover>();
    gstTurnoverList
      .filter((t) => t.financial_year_id === selectedFY.id && t.month === selectedMonth)
      .forEach((rec) => map.set(rec.client_id, rec));
    return map;
  }, [gstTurnoverList, selectedFY.id, selectedMonth]);

  // Status breakdown calculations
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: activeClients.length,
      'All Pending': 0,
      Completed: 0,
      'Nil Filed': 0,
      'Not Started': 0,
    };

    STATUS_OPTIONS.forEach((opt) => {
      counts[opt] = 0;
    });

    activeClients.forEach((c) => {
      const rec = workMap.get(c.id);
      const st: WorkStatus = draftStatuses[c.id] || (rec ? rec.status : 'Not Started');
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts[st] = 1;
      }

      if (st !== 'Completed' && st !== 'Nil Filed' && st !== 'Not Started') {
        counts['All Pending']++;
      }
    });

    return counts;
  }, [activeClients, workMap, draftStatuses]);

  // Monthly summary calculations for Taxable and Exempt
  const monthlyTurnoverSummary = useMemo(() => {
    let totalTaxable = 0;
    let totalExempt = 0;
    let clientsWithTurnover = 0;

    activeClients.forEach((c) => {
      const taxStr = draftTaxable[c.id];
      const exStr = draftExempt[c.id];
      const rec = turnoverMonthMap.get(c.id);

      const tax = taxStr !== undefined ? parseFloat(taxStr) || 0 : rec?.taxable_turnover || 0;
      const ex = exStr !== undefined ? parseFloat(exStr) || 0 : rec?.exempt_turnover || 0;

      if (tax > 0 || ex > 0) {
        clientsWithTurnover++;
      }
      totalTaxable += tax;
      totalExempt += ex;
    });

    return {
      totalTaxable,
      totalExempt,
      grandTotal: totalTaxable + totalExempt,
      clientsWithTurnover,
    };
  }, [activeClients, draftTaxable, draftExempt, turnoverMonthMap]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return activeClients.filter((client) => {
      // Search across File No, GSTIN, Firm Name, Client Name, Mobile 1, Mobile 2
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesFileNo = client.file_no ? client.file_no.toLowerCase().includes(q) : false;
        const matchesGSTIN = client.gstin.toLowerCase().includes(q);
        const matchesFirm = client.firm_name.toLowerCase().includes(q);
        const matchesClient = client.client_name ? client.client_name.toLowerCase().includes(q) : false;
        const matchesMobile1 = client.mobile ? client.mobile.includes(q) : false;
        const matchesMobile2 = client.alternate_mobile ? client.alternate_mobile.includes(q) : false;
        if (!matchesFileNo && !matchesGSTIN && !matchesFirm && !matchesClient && !matchesMobile1 && !matchesMobile2) return false;
      }

      // Scheme / Category
      if (schemeFilter !== 'all') {
        const cat = normalizeCat(client.gst_type);
        if (cat !== schemeFilter) {
          return false;
        }
      }

      // Staff
      if (staffFilter !== 'all') {
        if (staffFilter === 'unassigned') {
          if (client.assigned_staff_id) return false;
        } else if (client.assigned_staff_id !== Number(staffFilter)) {
          return false;
        }
      }

      // Status Filter
      const rec = workMap.get(client.id);
      const curStatus: WorkStatus = draftStatuses[client.id] || (rec ? rec.status : 'Not Started');

      if (statusFilter !== 'all') {
        if (statusFilter === 'Pending' || statusFilter === 'All Pending') {
          if (curStatus === 'Completed' || curStatus === 'Nil Filed' || curStatus === 'Not Started') return false;
        } else if (statusFilter === 'Completed') {
          if (curStatus !== 'Completed' && curStatus !== 'Nil Filed') return false;
        } else if (curStatus !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [activeClients, searchTerm, schemeFilter, staffFilter, statusFilter, workMap, draftStatuses]);

  // Selection toggle handlers
  const handleToggleSelect = (clientId: number) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const isAllFilteredSelected =
    filteredClients.length > 0 && filteredClients.every((c) => selectedClientIds.has(c.id));
  const isSomeFilteredSelected =
    filteredClients.some((c) => selectedClientIds.has(c.id)) && !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    if (filteredClients.length === 0) return;
    if (isAllFilteredSelected) {
      setSelectedClientIds((prev) => {
        const next = new Set(prev);
        filteredClients.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedClientIds((prev) => {
        const next = new Set(prev);
        filteredClients.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedClientIds(new Set());
  };

  // Build filtered / selected data payload for exports
  const getExportData = () => {
    const isCustomSelection = selectedClientIds.size > 0;
    const targetClients = isCustomSelection
      ? filteredClients.filter((c) => selectedClientIds.has(c.id))
      : filteredClients;

    const exportItems: MonthlyWorkExportItem[] = targetClients.map((client) => {
      const rec = workMap.get(client.id);
      const status: WorkStatus = draftStatuses[client.id] || (rec ? rec.status : 'Not Started');
      const remark =
        draftRemarks[client.id] !== undefined
          ? draftRemarks[client.id]
          : rec?.remark || '';
      const staff = users.find((u) => u.id === client.assigned_staff_id);
      return {
        client,
        status,
        remark,
        staffName: staff ? staff.name : 'Unassigned',
        updatedAt: rec?.updated_at,
      };
    });

    const staffObj = users.find((u) => u.id === Number(staffFilter));
    const filterInfo: MonthlyWorkFilterInfo = {
      statusFilter,
      schemeFilter,
      staffFilter,
      staffFilterName:
        staffFilter === 'all'
          ? 'All Staff'
          : staffFilter === 'unassigned'
          ? 'Unassigned Staff'
          : staffObj?.name || staffFilter,
      searchTerm,
      isSelectedOnly: isCustomSelection,
    };

    return { exportItems, filterInfo, isCustomSelection };
  };

  const handleExportFilteredCSV = () => {
    setIsExportingCsv(true);
    try {
      const { exportItems, filterInfo } = getExportData();
      if (exportItems.length === 0) {
        alert('No clients match your current filters or selection to export.');
        return;
      }
      generateMonthlyWorkReportCSV(selectedMonth, selectedFY, exportItems, filterInfo);
    } catch (err) {
      console.error('Error generating CSV:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportFilteredPDF = () => {
    setIsExportingPdf(true);
    try {
      const { exportItems, filterInfo } = getExportData();
      if (exportItems.length === 0) {
        alert('No clients match your current filters or selection to export.');
        return;
      }
      generateMonthlyWorkReportPDF(selectedMonth, selectedFY, exportItems, filterInfo);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleStatusChange = (clientId: number, newStatus: WorkStatus) => {
    setDraftStatuses((prev) => ({ ...prev, [clientId]: newStatus }));
    const currentRemark = draftRemarks[clientId] !== undefined
      ? draftRemarks[clientId]
      : (workMap.get(clientId)?.remark || '');

    // Auto-save status
    onUpdateStatus(selectedFY.id, selectedMonth, clientId, newStatus, currentRemark);

    // Also persist turnover if typed
    saveClientTurnover(clientId);

    setSavedRowIds((prev) => ({ ...prev, [clientId]: true }));
    setTimeout(() => {
      setSavedRowIds((prev) => ({ ...prev, [clientId]: false }));
    }, 2000);
  };

  const handleRemarkChange = (clientId: number, text: string) => {
    setDraftRemarks((prev) => ({ ...prev, [clientId]: text }));
  };

  const handleTaxableChange = (clientId: number, value: string) => {
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    setDraftTaxable((prev) => ({ ...prev, [clientId]: value }));
  };

  const handleExemptChange = (clientId: number, value: string) => {
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    setDraftExempt((prev) => ({ ...prev, [clientId]: value }));
  };

  const saveClientTurnover = (clientId: number) => {
    const taxStr = draftTaxable[clientId];
    const exStr = draftExempt[clientId];
    const rec = turnoverMonthMap.get(clientId);

    const taxableNum = taxStr !== undefined ? parseFloat(taxStr) || 0 : rec?.taxable_turnover || 0;
    const exemptNum = exStr !== undefined ? parseFloat(exStr) || 0 : rec?.exempt_turnover || 0;

    if (taxStr !== undefined || exStr !== undefined || rec) {
      GSTStorage.saveClientMonthGstTurnover(
        clientId,
        selectedFY.id,
        selectedMonth,
        taxableNum,
        exemptNum
      );
      loadGstTurnover();
    }
  };

  const handleSaveRow = (clientId: number) => {
    const rec = workMap.get(clientId);
    const status = draftStatuses[clientId] || (rec ? rec.status : 'Not Started');
    const remark = draftRemarks[clientId] !== undefined ? draftRemarks[clientId] : (rec?.remark || '');

    // 1. Save work status and remark
    onUpdateStatus(selectedFY.id, selectedMonth, clientId, status, remark);

    // 2. Save Taxable and Exempt turnover figures
    saveClientTurnover(clientId);

    setSavedRowIds((prev) => ({ ...prev, [clientId]: true }));
    setTimeout(() => {
      setSavedRowIds((prev) => ({ ...prev, [clientId]: false }));
    }, 2000);
  };

  const handleOpenTurnoverModal = (clientId: number) => {
    setSelectedTurnoverClientId(clientId);
    setIsTurnoverModalOpen(true);
  };

  const formatINR = (val: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getStaffName = (staffId?: number) => {
    if (!staffId) return 'Unassigned';
    const s = users.find((u) => u.id === staffId);
    return s ? s.name : 'Unknown';
  };

  const exportCount = selectedClientIds.size > 0 ? selectedClientIds.size : filteredClients.length;

  return (
    <div className="space-y-4">
      {/* 12-Month GST Turnover Modal */}
      {isTurnoverModalOpen && (
        <GstTurnoverModal
          isOpen={isTurnoverModalOpen}
          onClose={() => setIsTurnoverModalOpen(false)}
          clients={activeClients}
          initialClientId={selectedTurnoverClientId}
          selectedFY={selectedFY}
          financialYears={financialYears}
          onSelectFY={onSelectFY}
          monthlyWork={monthlyWork}
          onSaved={() => {
            loadGstTurnover();
          }}
        />
      )}

      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Monthly GST Work & Filing Tracker
            </h2>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
              {selectedMonth} ({selectedFY.display_name})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track monthly GST filing status, client remarks, and compliance notes.
          </p>
        </div>

        {/* Month & FY Switcher, Refresh, and Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
            <span className="font-bold text-blue-900 mr-1">FY:</span>
            <select
              id="monthly-work-fy-select"
              value={selectedFY.id}
              onChange={(e) => {
                const found = financialYears.find((f) => f.id === Number(e.target.value));
                if (found) onSelectFY(found);
              }}
              className="bg-transparent font-bold text-blue-700 focus:outline-none cursor-pointer text-xs"
            >
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-600 mr-1.5" />
            <span className="font-bold text-slate-700 mr-1">Month:</span>
            <select
              id="monthly-work-month-select"
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
            >
              {FY_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            id="monthly-work-refresh-btn"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className={`flex items-center gap-1.5 font-bold text-xs px-3 py-1.5 rounded-xl border shadow-xs transition-all cursor-pointer ${
              isRefreshing
                ? 'bg-blue-100 text-blue-900 border-blue-300'
                : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300'
            }`}
            title={`Refresh and reload all GST work records for FY ${selectedFY.display_name} (${selectedMonth})`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-800' : 'text-blue-600'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {/* Export Filtered CSV */}
          <button
            id="monthly-work-export-csv-btn"
            onClick={handleExportFilteredCSV}
            disabled={isExportingCsv || filteredClients.length === 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Export CSV matching current filter or custom selection"
          >
            {isExportingCsv ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV ({exportCount})</span>
              </>
            )}
          </button>

          {/* Export Filtered PDF */}
          <button
            id="monthly-work-export-pdf-btn"
            onClick={handleExportFilteredPDF}
            disabled={isExportingPdf || filteredClients.length === 0}
            className="flex items-center gap-1.5 bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Export official PDF compliance report"
          >
            {isExportingPdf ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                <span>PDF ({exportCount})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search by File No, GSTIN, Firm Name, Mobile */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="monthly-work-search-input"
              type="text"
              placeholder="Search by File No (📁), GSTIN, Firm, Contact, Mobile 1, Mobile 2..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#78350F] focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Scheme / Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Scheme:</span>
            <select
              id="monthly-work-scheme-filter"
              value={schemeFilter}
              onChange={(e) => setSchemeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#78350F] cursor-pointer"
            >
              <option value="all">All Schemes</option>
              <option value="Normal">Normal (Regular)</option>
              <option value="Composition">Composition</option>
              <option value="QRMP">QRMP</option>
            </select>
          </div>

          {/* Full GST Status Dropdown Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0">GST Status:</span>
            <select
              id="monthly-work-status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#78350F] cursor-pointer min-w-[230px]"
            >
              <option value="all">All GST Statuses ({statusCounts.all})</option>
              <option value="All Pending">⚡ All Pending Action ({statusCounts['All Pending']})</option>
              <option value="Completed">✓ Completed ({statusCounts.Completed})</option>
              <option value="Nil Filed">✓ Nil Filed ({statusCounts['Nil Filed'] || 0})</option>
              <option value="Data Received">📥 Data Received ({statusCounts['Data Received'] || 0})</option>
              <option value="RCM Pay">💳 RCM PAY ({statusCounts['RCM Pay'] || 0})</option>
              <option value="Challan Generated">🧾 Challan Generated ({statusCounts['Challan Generated'] || 0})</option>
              <option value="Bill Pending">📄 Bill Pending ({statusCounts['Bill Pending'] || 0})</option>
              <option value="Tax Payment Pending">💰 Tax Payment Pending ({statusCounts['Tax Payment Pending'] || 0})</option>
              <option value="Documents Pending">📂 Documents Pending ({statusCounts['Documents Pending'] || 0})</option>
              <option value="Client Response Pending">📞 Client Response Pending ({statusCounts['Client Response Pending'] || 0})</option>
              <option value="GSTR-1 Filed">📋 GSTR-1 Filed ({statusCounts['GSTR-1 Filed'] || 0})</option>
              <option value="Not Started">⏸️ Not Started ({statusCounts['Not Started'] || 0})</option>
              <option value="Other">Other ({statusCounts['Other'] || 0})</option>
            </select>
          </div>

          {/* Staff Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Staff:</span>
            <select
              id="monthly-work-staff-filter"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#78350F] cursor-pointer"
            >
              <option value="all">All Staff</option>
              <option value="unassigned">Unassigned Only</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase mr-1 shrink-0">
            Quick Filter:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#78350F] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Completed')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'Completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Completed ({statusCounts.Completed})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Nil Filed')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'Nil Filed'
                ? 'bg-teal-600 text-white'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
            }`}
          >
            Nil Filed ({statusCounts['Nil Filed'] || 0})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Pending')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'Pending' || statusFilter === 'All Pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            All Pending ({statusCounts['All Pending']})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Data Received')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'Data Received'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Data Received ({statusCounts['Data Received'] || 0})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Bill Pending')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'Bill Pending'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
          >
            Bill Pending ({statusCounts['Bill Pending']})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Tax Payment Pending')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'Tax Payment Pending'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Tax Pending ({statusCounts['Tax Payment Pending']})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('GSTR-1 Filed')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'GSTR-1 Filed'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            }`}
          >
            GSTR-1 Filed ({statusCounts['GSTR-1 Filed'] || 0})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Not Started')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'Not Started'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Not Started ({statusCounts['Not Started']})
          </button>
        </div>
      </div>

      {/* Selected Items Floating Action Bar */}
      {selectedClientIds.size > 0 && (
        <div className="bg-[#FAF6F0] border border-[#E8DCC4] p-3 rounded-2xl flex items-center justify-between animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#78350F] text-white text-xs font-bold flex items-center justify-center">
              {selectedClientIds.size}
            </span>
            <span className="text-xs font-bold text-[#78350F]">
              Selected Client(s) for Bulk Action / Export
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearSelection}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={handleExportFilteredCSV}
              disabled={isExportingCsv}
              className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV ({selectedClientIds.size})</span>
            </button>
            <button
              onClick={handleExportFilteredPDF}
              disabled={isExportingPdf}
              className="text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#172554] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF ({selectedClientIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* MONTHLY WORK TABLE */}
      <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#FAF6F0] border-b border-[#E8DCC4] text-[11px] font-bold text-[#78350F] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    title={isAllFilteredSelected ? 'Deselect All Filtered' : 'Select All Filtered'}
                    className="text-slate-600 hover:text-slate-900 transition-colors p-1 cursor-pointer"
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#78350F]" />
                    ) : isSomeFilteredSelected ? (
                      <MinusSquare className="w-4 h-4 text-[#78350F]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-3 w-64">Client / Contact Info</th>
                <th className="px-3 py-3 w-32">Category / Staff</th>
                <th className="px-3 py-3 min-w-[250px] w-64">GST Status</th>
                <th className="px-3 py-3 min-w-[320px]">Client Remark / Filing Note</th>
                <th className="px-3 py-3 text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No client work items match your current filter.</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const record = workMap.get(client.id);
                  const currentStatus: WorkStatus =
                    draftStatuses[client.id] || (record ? record.status : 'Not Started');
                  const currentRemark =
                    draftRemarks[client.id] !== undefined
                      ? draftRemarks[client.id]
                      : (record?.remark || '');
                  const isSaved = savedRowIds[client.id];
                  const isRowSelected = selectedClientIds.has(client.id);
                  const category = normalizeCat(client.gst_type);

                  // Status background styling for selector
                  const statusBgMap: Record<WorkStatus, string> = {
                    Completed: 'bg-emerald-50 text-emerald-800 border-emerald-300',
                    'Nil Filed': 'bg-teal-50 text-teal-800 border-teal-300',
                    'Data Received': 'bg-blue-50 text-blue-800 border-blue-300',
                    'RCM Pay': 'bg-indigo-50 text-indigo-800 border-indigo-300',
                    'Challan Generated': 'bg-purple-50 text-purple-800 border-purple-300',
                    'Bill Pending': 'bg-orange-50 text-orange-800 border-orange-300',
                    'Tax Payment Pending': 'bg-rose-50 text-rose-800 border-rose-300',
                    'Documents Pending': 'bg-amber-50 text-amber-800 border-amber-300',
                    'Client Response Pending': 'bg-cyan-50 text-cyan-800 border-cyan-300',
                    'GSTR-1 Filed': 'bg-sky-50 text-sky-800 border-sky-300',
                    'Not Started': 'bg-slate-50 text-slate-700 border-slate-300',
                    Pending: 'bg-amber-50 text-amber-800 border-amber-300',
                    Other: 'bg-slate-50 text-slate-700 border-slate-300',
                  };

                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-[#FAF6F0]/40 transition-colors ${
                        isRowSelected ? 'bg-[#FAF6F0]/70' : isSaved ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => handleToggleSelect(client.id)}
                          className="w-4 h-4 rounded text-[#78350F] focus:ring-[#78350F] border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Client / Firm Name & Permanent Mobile 1 and Mobile 2 */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {client.file_no && (
                            <span className="font-mono text-[10px] font-bold text-[#78350F] bg-[#FAF6F0] px-1.5 py-0.5 rounded border border-[#E8DCC4]" title={`File No: ${client.file_no}`}>
                              📁 {client.file_no}
                            </span>
                          )}
                          <div className="font-bold text-slate-900 leading-tight text-xs">
                            {client.firm_name}
                          </div>
                        </div>
                        {/* Permanently displayed Mobile 1 & Mobile 2 directly underneath */}
                        <div className="text-[11px] font-mono mt-1 space-y-0.5">
                          <div className="text-slate-800 font-medium">
                            📱 Mobile 1: <span className="font-bold text-slate-900">{client.mobile || '—'}</span>
                          </div>
                          <div className="text-slate-600">
                            📱 Mobile 2: <span className="font-medium text-slate-700">{client.alternate_mobile ? client.alternate_mobile : '—'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {client.gstin}
                          </span>
                          {client.client_name && (
                            <span className="text-[11px] text-slate-500 truncate max-w-[130px]">
                              {client.client_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category & Staff */}
                      <td className="px-3 py-3">
                        <div>
                          {category === 'Composition' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-purple-100 text-purple-900 border border-purple-200">
                              Composition
                            </span>
                          ) : category === 'QRMP' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-teal-100 text-teal-900 border border-teal-200">
                              QRMP
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-[#FAF6F0] text-[#78350F] border border-[#E8DCC4]">
                              Normal
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1.5 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{getStaffName(client.assigned_staff_id)}</span>
                        </div>
                      </td>

                      {/* Compliance GST Status Selector */}
                      <td className="px-3 py-3 min-w-[250px] w-64">
                        <select
                          id={`work-status-select-${client.id}`}
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(client.id, e.target.value as WorkStatus)}
                          className={`w-full font-bold text-xs rounded-xl px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-[#78350F] cursor-pointer shadow-2xs ${
                            statusBgMap[currentStatus] || 'bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} className="bg-white text-slate-800 font-medium py-1">
                              {opt}
                            </option>
                          ))}
                        </select>

                        {record?.updated_at && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            Updated {record.updated_at.split(' ')[0]} by {record.updated_by_name || 'Staff'}
                          </div>
                        )}
                      </td>

                      {/* Large, Long Client Remark / Filing Note Entry Box */}
                      <td className="px-3 py-3 min-w-[320px]">
                        <div className="space-y-1.5">
                          <textarea
                            id={`work-remark-input-${client.id}`}
                            rows={2}
                            placeholder="Type client remark / filing note..."
                            value={currentRemark}
                            onChange={(e) => handleRemarkChange(client.id, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#78350F] focus:bg-white resize-y min-h-[52px] leading-relaxed transition-all shadow-2xs"
                          />
                          {/* Quick English Remark Presets */}
                          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                            <span className="text-[10px] text-slate-400 font-bold shrink-0">Quick:</span>
                            {REMARK_PRESETS.slice(0, 4).map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  const updatedRemark = currentRemark
                                    ? `${currentRemark} | ${preset}`
                                    : preset;
                                  handleRemarkChange(client.id, updatedRemark);
                                }}
                                className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 rounded border border-slate-200 hover:border-amber-300 truncate max-w-[140px] shrink-0 cursor-pointer font-medium"
                                title={preset}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Action: Save Button */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          id={`work-save-row-btn-${client.id}`}
                          onClick={() => handleSaveRow(client.id)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSaved
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-[#FAF6F0] text-[#78350F] hover:bg-[#78350F] hover:text-white border border-[#E8DCC4]'
                          }`}
                          title="Save Status & Remark"
                        >
                          {isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
