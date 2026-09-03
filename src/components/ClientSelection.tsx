import React, { useState, useMemo, useEffect } from 'react';
import {
  Client,
  User,
  TabType,
  FinancialYear,
  FY_MONTHS,
  OfficeVisit,
} from '../types';
import { GSTStorage } from '../utils/storage';
import {
  UserCheck,
  Search,
  Building,
  Landmark,
  Calculator,
  CalendarCheck2,
  FileSpreadsheet,
  ShieldCheck,
  XCircle,
  Phone,
  MapPin,
  CheckCircle2,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  FileText,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ActiveClientBankTurnover } from './ClientSelection/ActiveClientBankTurnover';
import { ActiveClientGstTurnover } from './ClientSelection/ActiveClientGstTurnover';
import { ActiveClientOfficeVisits } from './ClientSelection/ActiveClientOfficeVisits';
import { ActiveClientReports } from './ClientSelection/ActiveClientReports';

interface ClientSelectionProps {
  clients: Client[];
  users: User[];
  currentUser: User;
  activeClient: Client | null;
  financialYears?: FinancialYear[];
  selectedFY?: FinancialYear;
  selectedMonth?: string;
  officeVisits?: OfficeVisit[];
  onSelectActiveClient: (client: Client | null) => void;
  onNavigateTab?: (tab: TabType, targetClientId?: number) => void;
  onOpenEditClient?: (client: Client) => void;
  onOpenViewClient?: (client: Client) => void;
}

export type ActiveReportTab = 'bank' | 'gst' | 'office' | 'reports';

export const ClientSelection: React.FC<ClientSelectionProps> = ({
  clients,
  users,
  currentUser,
  activeClient,
  financialYears: propFYs,
  selectedFY: propSelectedFY,
  selectedMonth: propSelectedMonth,
  officeVisits,
  onSelectActiveClient,
  onNavigateTab,
  onOpenEditClient,
  onOpenViewClient,
}) => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [schemeFilter, setSchemeFilter] = useState<'all' | 'Normal' | 'Composition' | 'QRMP'>('all');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Active Report Tab (within Client Selection Workspace)
  const [activeReportTab, setActiveReportTab] = useState<ActiveReportTab>('bank');

  // Financial Years list & Selected FY
  const availableFYs = useMemo(() => {
    if (propFYs && propFYs.length > 0) return propFYs;
    return GSTStorage.getFinancialYears();
  }, [propFYs]);

  const [currentFY, setCurrentFY] = useState<FinancialYear>(() => {
    if (propSelectedFY) return propSelectedFY;
    const defaultFY = GSTStorage.getSelectedFY();
    return defaultFY || availableFYs[0];
  });

  useEffect(() => {
    if (propSelectedFY) {
      setCurrentFY(propSelectedFY);
    }
  }, [propSelectedFY]);

  // Selected Month ('All' | 'April' ... 'March')
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    return propSelectedMonth || 'All';
  });

  useEffect(() => {
    if (propSelectedMonth) {
      setCurrentMonth(propSelectedMonth);
    }
  }, [propSelectedMonth]);

  // Auto-select first client if none is active
  useEffect(() => {
    if (!activeClient && clients.length > 0) {
      onSelectActiveClient(clients[0]);
    }
  }, [activeClient, clients, onSelectActiveClient]);

  // Staff lookup map
  const userMap = useMemo(() => {
    const map = new Map<number, string>();
    users.forEach((u) => map.set(u.id, u.name));
    return map;
  }, [users]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    let list = clients;

    // Scheme filter
    if (schemeFilter !== 'all') {
      list = list.filter((c) => {
        const norm = (c.gst_type || 'normal').toLowerCase();
        if (schemeFilter === 'Normal') return norm === 'normal' || norm === 'regular';
        if (schemeFilter === 'Composition') return norm === 'composition';
        if (schemeFilter === 'QRMP') return norm === 'qrmp';
        return true;
      });
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.firm_name.toLowerCase().includes(q) ||
          (c.client_name && c.client_name.toLowerCase().includes(q)) ||
          c.gstin.toLowerCase().includes(q) ||
          (c.file_no && c.file_no.toLowerCase().includes(q)) ||
          (c.mobile && c.mobile.includes(q))
      );
    }

    return list;
  }, [clients, schemeFilter, searchTerm]);

  // Index of active client in filtered list
  const currentClientIndex = useMemo(() => {
    if (!activeClient) return -1;
    return filteredClients.findIndex((c) => c.id === activeClient.id);
  }, [filteredClients, activeClient]);

  // Steppers: Next / Previous Client
  const handlePrevClient = () => {
    if (filteredClients.length === 0) return;
    const newIdx = currentClientIndex > 0 ? currentClientIndex - 1 : filteredClients.length - 1;
    onSelectActiveClient(filteredClients[newIdx]);
  };

  const handleNextClient = () => {
    if (filteredClients.length === 0) return;
    const newIdx = currentClientIndex < filteredClients.length - 1 ? currentClientIndex + 1 : 0;
    onSelectActiveClient(filteredClients[newIdx]);
  };

  // Scheme counts
  const schemeCounts = useMemo(() => {
    const counts = { all: clients.length, Normal: 0, Composition: 0, QRMP: 0 };
    clients.forEach((c) => {
      const norm = (c.gst_type || 'normal').toLowerCase();
      if (norm === 'composition') counts.Composition++;
      else if (norm === 'qrmp') counts.QRMP++;
      else counts.Normal++;
    });
    return counts;
  }, [clients]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* STEP 1 — ACTIVE CLIENT SELECTION (Top Main Section)                        */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Title Bar & Quick Client Dropdown */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                ACTIVE CLIENT SELECTION
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Search or select an Active Client. All reports and turnover modules below will strictly isolate and display this client's data.
              </p>
            </div>
          </div>

          {/* Direct Quick Select Dropdown + Steppers */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevClient}
                disabled={filteredClients.length <= 1}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 disabled:opacity-30 cursor-pointer transition-all"
                title="Previous Client"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                id="active-client-quick-select"
                value={activeClient ? activeClient.id : ''}
                onChange={(e) => {
                  const found = clients.find((c) => c.id === Number(e.target.value));
                  if (found) onSelectActiveClient(found);
                }}
                className="bg-transparent text-xs font-black text-slate-800 py-1 px-2 focus:outline-none cursor-pointer max-w-[240px] truncate"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.file_no ? `[#${c.file_no}] ` : ''}{c.firm_name} - {c.gstin}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNextClient}
                disabled={filteredClients.length <= 1}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 disabled:opacity-30 cursor-pointer transition-all"
                title="Next Client"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {activeClient && (
              <button
                type="button"
                onClick={() => onSelectActiveClient(null)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-all cursor-pointer"
                title="Clear Active Client"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Scheme Filter Pills */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Search by Client Name / File Number */}
          <div className="md:col-span-8 relative">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="active-client-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                placeholder="Search by Client Name, File Number, GSTIN, Mobile..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Instant Search Results Dropdown */}
            {isSearchDropdownOpen && searchTerm.trim().length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
                <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Matching Clients ({filteredClients.length})</span>
                  <button
                    type="button"
                    onClick={() => setIsSearchDropdownOpen(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    Close ✕
                  </button>
                </div>
                {filteredClients.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No clients match "{searchTerm}"
                  </div>
                ) : (
                  filteredClients.map((c) => {
                    const isSelected = activeClient?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        id={`search-result-client-${c.id}`}
                        onClick={() => {
                          onSelectActiveClient(c);
                          setIsSearchDropdownOpen(false);
                          setSearchTerm('');
                        }}
                        className={`p-3 hover:bg-blue-50/80 cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected ? 'bg-blue-50/90 font-bold' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {c.file_no && (
                              <span className="text-[10px] font-mono font-black bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                                File #{c.file_no}
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {c.firm_name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono">{c.gstin}</span>
                            <span>•</span>
                            <span>{c.client_name || 'No contact'}</span>
                            {c.mobile && (
                              <>
                                <span>•</span>
                                <span>{c.mobile}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right ml-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-700">
                            {c.gst_type || 'Normal'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Scheme Filter Pills */}
          <div className="md:col-span-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(['all', 'Normal', 'Composition', 'QRMP'] as const).map((scheme) => (
              <button
                key={scheme}
                type="button"
                onClick={() => setSchemeFilter(scheme)}
                className={`text-xs px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  schemeFilter === scheme
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {scheme === 'all' ? `All (${schemeCounts.all})` : `${scheme} (${schemeCounts[scheme]})`}
              </button>
            ))}
          </div>
        </div>

        {/* ACTIVE CLIENT CARD */}
        {activeClient ? (
          <div
            id="active-client-card"
            className="p-4.5 rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 text-white border border-blue-800/80 shadow-md space-y-3.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    ACTIVE CLIENT
                  </span>
                  {activeClient.file_no && (
                    <span className="text-xs font-mono font-black bg-blue-500/30 text-blue-200 border border-blue-400/40 px-2 py-0.5 rounded-md">
                      File No: {activeClient.file_no}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: #{activeClient.id}
                  </span>
                </div>

                <h2 className="text-lg font-black text-white mt-1.5 truncate" title={activeClient.firm_name}>
                  {activeClient.firm_name}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/90 mt-1 font-mono">
                  <span>GSTIN: <strong>{activeClient.gstin}</strong></span>
                  <span>•</span>
                  <span>Scheme: <strong className="uppercase">{activeClient.gst_type || 'Normal'}</strong></span>
                </div>
              </div>

              {/* Action Buttons for Active Client */}
              <div className="flex items-center gap-2 shrink-0">
                {onOpenEditClient && (
                  <button
                    type="button"
                    onClick={() => onOpenEditClient(activeClient)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                  >
                    Edit Client
                  </button>
                )}
                {onOpenViewClient && (
                  <button
                    type="button"
                    onClick={() => onOpenViewClient(activeClient)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                  >
                    View Profile
                  </button>
                )}
              </div>
            </div>

            {/* Quick Details Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-blue-800/60 pt-3 text-slate-300">
              <div>
                <span className="text-[10px] text-slate-400 block">Contact Person</span>
                <span className="font-semibold text-white truncate block">{activeClient.client_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Mobile Phone</span>
                <span className="font-semibold text-white">{activeClient.mobile || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Assigned Staff</span>
                <span className="font-semibold text-white truncate block">
                  {activeClient.assigned_staff_id
                    ? userMap.get(activeClient.assigned_staff_id) || `Staff #${activeClient.assigned_staff_id}`
                    : 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">City / State</span>
                <span className="font-semibold text-white truncate block">{activeClient.city || 'Jharkhand'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">No Active Client Selected</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Please search or choose a client from above to load their Bank Turnover, GST Turnover, Office Client Entry, and Reports.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 2 — ACTIVE CLIENT REPORT TABS & FILTER BAR                           */}
      {/* ========================================================================= */}
      {activeClient && (
        <div className="space-y-4">
          {/* Tabs + FY/Month Filters Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            {/* 4 Navigation Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {/* Tab 1: Bank Turnover */}
              <button
                type="button"
                id="client-selection-tab-bank-turnover"
                onClick={() => setActiveReportTab('bank')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeReportTab === 'bank'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Landmark className="w-4 h-4" />
                <span>Bank Turnover</span>
              </button>

              {/* Tab 2: GST Turnover */}
              <button
                type="button"
                id="client-selection-tab-gst-turnover"
                onClick={() => setActiveReportTab('gst')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeReportTab === 'gst'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>GST Turnover</span>
              </button>

              {/* Tab 3: Office Client Entry */}
              <button
                type="button"
                id="client-selection-tab-office-visits"
                onClick={() => setActiveReportTab('office')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeReportTab === 'office'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Office Client Entry</span>
              </button>

              {/* Tab 4: Reports */}
              <button
                type="button"
                id="client-selection-tab-reports"
                onClick={() => setActiveReportTab('reports')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  activeReportTab === 'reports'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Reports</span>
              </button>
            </div>

            {/* Filter Section: FY Selection + Month Selection */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* FY Selection */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">FY:</span>
                <select
                  id="workspace-fy-select"
                  value={currentFY.id}
                  onChange={(e) => {
                    const found = availableFYs.find((f) => f.id === Number(e.target.value));
                    if (found) setCurrentFY(found);
                  }}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                >
                  {availableFYs.map((fy) => (
                    <option key={fy.id} value={fy.id}>
                      FY {fy.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selection */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month:</span>
                <select
                  id="workspace-month-select"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Months (Apr–Mar)</option>
                  {FY_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* TAB CONTENT WORKSPACE (Strictly isolated to activeClient.id)            */}
          {/* ======================================================================= */}
          <div className="transition-all">
            {/* 1. Bank Turnover Workspace */}
            {activeReportTab === 'bank' && (
              <ActiveClientBankTurnover
                client={activeClient}
                financialYear={currentFY}
                selectedMonth={currentMonth}
                onSelectMonth={setCurrentMonth}
              />
            )}

            {/* 2. GST Turnover Workspace */}
            {activeReportTab === 'gst' && (
              <ActiveClientGstTurnover
                client={activeClient}
                financialYear={currentFY}
                selectedMonth={currentMonth}
                onSelectMonth={setCurrentMonth}
              />
            )}

            {/* 3. Office Client Entry Workspace */}
            {activeReportTab === 'office' && (
              <ActiveClientOfficeVisits
                client={activeClient}
                financialYear={currentFY}
                selectedMonth={currentMonth}
                officeVisits={officeVisits}
                onSelectMonth={setCurrentMonth}
              />
            )}

            {/* 4. Reports Workspace */}
            {activeReportTab === 'reports' && (
              <ActiveClientReports
                client={activeClient}
                financialYear={currentFY}
                selectedMonth={currentMonth}
                onSelectMonth={setCurrentMonth}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
