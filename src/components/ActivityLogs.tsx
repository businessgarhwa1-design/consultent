import React, { useState, useMemo, useEffect } from 'react';
import { ActivityLog, Client, FinancialYear, User, UserSession } from '../types';
import { GSTStorage } from '../utils/storage';
import {
  History,
  Search,
  Filter,
  Download,
  Printer,
  ShieldCheck,
  UserCheck,
  Calendar,
  Layers,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  PlusCircle,
  Edit3,
  Trash2,
  FileSpreadsheet,
  Upload,
  Globe,
  Monitor,
  Key,
  Building2,
  X,
  FileText,
  Activity,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ActivityLogsProps {
  logs: ActivityLog[];
  users?: User[];
  clients?: Client[];
  financialYears?: FinancialYear[];
  currentUser?: User | null;
  initialClientId?: number | null;
}

export const ActivityLogs: React.FC<ActivityLogsProps> = ({
  logs,
  users = [],
  clients = [],
  financialYears = [],
  currentUser,
  initialClientId,
}) => {
  // View mode: 'audit-trail' or 'live-sessions'
  const [viewMode, setViewMode] = useState<'audit-trail' | 'live-sessions'>('audit-trail');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId ? String(initialClientId) : 'all'
  );

  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(String(initialClientId));
    }
  }, [initialClientId]);
  const [selectedFYId, setSelectedFYId] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal State for Inspection
  const [inspectingLog, setInspectingLog] = useState<ActivityLog | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Sessions from storage
  const sessions: UserSession[] = GSTStorage.getSessions();

  // Dynamic filter options
  const allModules = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.module) set.add(l.module);
    });
    return Array.from(set).sort();
  }, [logs]);

  const allActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Date Filtering Helper
  const isWithinDateRange = (createdAt: string) => {
    if (datePreset === 'all') return true;

    // createdAt is formatted as "YYYY-MM-DD HH:mm:ss"
    const logDateStr = createdAt.split(' ')[0];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (datePreset === 'today') {
      return logDateStr === todayStr;
    }

    if (datePreset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      return logDateStr === yesterdayStr;
    }

    if (datePreset === '7days') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      return logDateStr >= sevenDaysAgoStr && logDateStr <= todayStr;
    }

    if (datePreset === '30days') {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      return logDateStr >= thirtyDaysAgoStr && logDateStr <= todayStr;
    }

    if (datePreset === 'custom') {
      if (customStartDate && logDateStr < customStartDate) return false;
      if (customEndDate && logDateStr > customEndDate) return false;
      return true;
    }

    return true;
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Free Text Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchDesc = log.description?.toLowerCase().includes(q) ?? false;
        const matchUser = log.user_name?.toLowerCase().includes(q) ?? false;
        const matchAction = log.action?.toLowerCase().includes(q) ?? false;
        const matchModule = log.module?.toLowerCase().includes(q) ?? false;
        const matchClient = log.client_name?.toLowerCase().includes(q) ?? false;
        const matchFirm = log.firm_name?.toLowerCase().includes(q) ?? false;
        const matchIP = log.ip_address?.toLowerCase().includes(q) ?? false;
        const matchSess = log.session_id?.toLowerCase().includes(q) ?? false;

        if (
          !matchDesc &&
          !matchUser &&
          !matchAction &&
          !matchModule &&
          !matchClient &&
          !matchFirm &&
          !matchIP &&
          !matchSess
        ) {
          return false;
        }
      }

      // Staff Filter
      if (selectedStaffId !== 'all' && String(log.user_id) !== selectedStaffId) {
        return false;
      }

      // Module Filter
      if (selectedModule !== 'all' && log.module !== selectedModule) {
        return false;
      }

      // Action Filter
      if (selectedAction !== 'all' && log.action !== selectedAction) {
        return false;
      }

      // Client Filter
      if (selectedClientId !== 'all' && String(log.client_id) !== selectedClientId) {
        return false;
      }

      // Financial Year Filter
      if (selectedFYId !== 'all' && String(log.financial_year_id) !== selectedFYId) {
        return false;
      }

      // Date Range Filter
      if (!isWithinDateRange(log.created_at)) {
        return false;
      }

      return true;
    });
  }, [
    logs,
    searchTerm,
    selectedStaffId,
    selectedModule,
    selectedAction,
    selectedClientId,
    selectedFYId,
    datePreset,
    customStartDate,
    customEndDate,
  ]);

  // Pagination Math
  const totalRecords = filteredLogs.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStaffId('all');
    setSelectedModule('all');
    setSelectedAction('all');
    setSelectedClientId('all');
    setSelectedFYId('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrentPage(1);
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter((l) => l.created_at.startsWith(todayStr));
    const onlineStaffCount = users.filter((u) => GSTStorage.isUserOnline(u.id)).length;
    const criticalActionsCount = logs.filter(
      (l) =>
        l.action === 'DELETE' ||
        l.action === 'PASSWORD_RESET' ||
        l.action === 'STATUS_CHANGE' ||
        l.action === 'LOGIN_FAILED'
    ).length;

    return {
      totalLogs: logs.length,
      todayLogsCount: todayLogs.length,
      onlineStaffCount,
      criticalActionsCount,
    };
  }, [logs, users]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'Log ID',
      'Timestamp (IST)',
      'Staff Name',
      'Role',
      'Action',
      'Module',
      'Client Firm',
      'Client Contact',
      'Financial Year',
      'Description',
      'Changed Fields',
      'IP Address',
      'Session ID',
      'User Agent',
    ];

    const rows = filteredLogs.map((log) => [
      log.id,
      `"${log.created_at}"`,
      `"${log.user_name || ''}"`,
      `"${log.user_role || ''}"`,
      `"${log.action || ''}"`,
      `"${log.module || ''}"`,
      `"${(log.firm_name || '').replace(/"/g, '""')}"`,
      `"${(log.client_name || '').replace(/"/g, '""')}"`,
      `"${log.financial_year || ''}"`,
      `"${(log.description || '').replace(/"/g, '""')}"`,
      `"${(log.changed_fields || []).join('; ')}"`,
      `"${log.ip_address || ''}"`,
      `"${log.session_id || ''}"`,
      `"${(log.user_agent || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `audit_log_export_${new Date().toISOString().split('T')[0]}_${filteredLogs.length}_records.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for color-coding Action badges
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN_FAILED')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (act.includes('LOGIN')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (act.includes('LOGOUT')) {
      return 'bg-slate-100 text-slate-700 border-slate-200';
    }
    if (act.includes('DELETE')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (act.includes('CREATE')) {
      return 'bg-teal-100 text-teal-800 border-teal-200';
    }
    if (act.includes('EDIT') || act.includes('UPDATE')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (act.includes('SAVE')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
    if (act.includes('STATUS')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (act.includes('UPLOAD') || act.includes('BACKUP')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (act.includes('PASSWORD')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getActionIcon = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN_FAILED')) return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
    if (act.includes('LOGIN')) return <LogIn className="w-3.5 h-3.5 text-emerald-600" />;
    if (act.includes('LOGOUT')) return <LogOut className="w-3.5 h-3.5 text-slate-600" />;
    if (act.includes('DELETE')) return <Trash2 className="w-3.5 h-3.5 text-red-600" />;
    if (act.includes('CREATE')) return <PlusCircle className="w-3.5 h-3.5 text-teal-600" />;
    if (act.includes('EDIT')) return <Edit3 className="w-3.5 h-3.5 text-blue-600" />;
    if (act.includes('SAVE')) return <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />;
    if (act.includes('STATUS')) return <Activity className="w-3.5 h-3.5 text-amber-600" />;
    if (act.includes('UPLOAD')) return <Upload className="w-3.5 h-3.5 text-purple-600" />;
    if (act.includes('PASSWORD')) return <Key className="w-3.5 h-3.5 text-orange-600" />;
    return <FileText className="w-3.5 h-3.5 text-slate-600" />;
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Staff Activity & Audit Control System</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    24/7 Immutable Audit
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete tamper-proof logging tracking logins, client CRUD, monthly GST workflow changes, bank turnover edits, and uploads.
                </p>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('audit-trail')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'audit-trail'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Audit Trail ({filteredLogs.length})
              </button>
              <button
                onClick={() => setViewMode('live-sessions')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'live-sessions'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Staff & Sessions ({stats.onlineStaffCount} Online)</span>
              </button>
            </div>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate PDF Report</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Audit Records</span>
              <History className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.totalLogs}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Retained in safe storage</div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Actions Logged Today</span>
              <Calendar className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-xl font-black text-teal-700 mt-1">{stats.todayLogsCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">IST Timezone recorded</div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Online Staff Members</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700 mt-1 flex items-center gap-1.5">
              <span>{stats.onlineStaffCount}</span>
              <span className="text-xs font-medium text-emerald-600">/ {users.length} Active</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Active web sessions</div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Sensitive Actions</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-700 mt-1">{stats.criticalActionsCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Status/Delete/Password operations</div>
          </div>
        </div>
      </div>

      {viewMode === 'live-sessions' ? (
        /* LIVE STAFF SESSIONS PANEL */
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Active Staff & Session Registry</span>
              </h3>
              <p className="text-xs text-slate-500">
                Live monitoring of all registered staff accounts, current login presence, and recent session metadata.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => {
              const isOnline = GSTStorage.isUserOnline(u.id);
              const userSessions = sessions.filter((s) => s.user_id === u.id);
              const activeSession = userSessions.find((s) => s.status === 'active');
              const lastLog = logs.find((l) => l.user_id === u.id);

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isOnline
                      ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            u.role === 'admin'
                              ? 'bg-purple-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{u.name}</span>
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOnline
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Last Login:</span>
                      </span>
                      <span className="font-semibold text-slate-800 font-mono text-[10px]">
                        {u.last_login || 'Never'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-slate-400" />
                        <span>Recent Action:</span>
                      </span>
                      <span className="font-semibold text-slate-800 text-[10px] truncate max-w-[140px]">
                        {lastLog ? lastLog.action : 'None recorded'}
                      </span>
                    </div>

                    {activeSession && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>IP Address:</span>
                        </span>
                        <span className="font-mono text-slate-700 text-[10px]">
                          {activeSession.ip_address}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2">
                    <button
                      onClick={() => {
                        setSelectedStaffId(String(u.id));
                        setViewMode('audit-trail');
                      }}
                      className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      View Staff Activity Logs →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* AUDIT TRAIL TABLE & COMPREHENSIVE FILTER BAR */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {/* Search Bar */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search description, staff, client, IP, session..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Staff Filter */}
              <div>
                <select
                  value={selectedStaffId}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Staff Members</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.name} ({u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Module Filter */}
              <div>
                <select
                  value={selectedModule}
                  onChange={(e) => {
                    setSelectedModule(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Modules</option>
                  {allModules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Filter */}
              <div>
                <select
                  value={selectedAction}
                  onChange={(e) => {
                    setSelectedAction(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Actions</option>
                  {allActions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Presets */}
              <div>
                <select
                  value={datePreset}
                  onChange={(e) => {
                    setDatePreset(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">Date: All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>
            </div>

            {/* Sub-row: Client Filter, FY Filter & Custom Date Inputs */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Client filter */}
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="all">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.firm_name} ({c.gstin})
                    </option>
                  ))}
                </select>

                {/* Financial Year filter */}
                <select
                  value={selectedFYId}
                  onChange={(e) => {
                    setSelectedFYId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value="all">All FYs</option>
                  {financialYears.map((fy) => (
                    <option key={fy.id} value={String(fy.id)}>
                      FY {fy.display_name}
                    </option>
                  ))}
                </select>

                {/* Custom Date Range pickers */}
                {datePreset === 'custom' && (
                  <div className="flex items-center gap-1.5 bg-blue-50/60 p-1 rounded-lg border border-blue-200">
                    <span className="text-[11px] text-blue-800 font-bold">From:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-[11px]"
                    />
                    <span className="text-[11px] text-blue-800 font-bold">To:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-[11px]"
                    />
                  </div>
                )}
              </div>

              {/* Reset Filters & Row Count */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong>{filteredLogs.length}</strong> of {logs.length} logs
                </span>
                {(searchTerm ||
                  selectedStaffId !== 'all' ||
                  selectedModule !== 'all' ||
                  selectedAction !== 'all' ||
                  selectedClientId !== 'all' ||
                  selectedFYId !== 'all' ||
                  datePreset !== 'all') && (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-3">Timestamp (IST)</th>
                    <th className="px-3.5 py-3">Staff / User</th>
                    <th className="px-3.5 py-3">Action & Module</th>
                    <th className="px-3.5 py-3">Target / Client</th>
                    <th className="px-3.5 py-3">Description</th>
                    <th className="px-3.5 py-3 text-center">Data Diff</th>
                    <th className="px-3.5 py-3 text-right">Session / IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <div className="space-y-2">
                          <History className="w-8 h-8 mx-auto text-slate-300" />
                          <div className="font-semibold text-slate-600">No activity logs found</div>
                          <p className="text-xs text-slate-400">
                            Try adjusting or clearing your search filters to view logs.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const hasDiff =
                        (log.old_values && Object.keys(log.old_values).length > 0) ||
                        (log.new_values && Object.keys(log.new_values).length > 0) ||
                        (log.changed_fields && log.changed_fields.length > 0);

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Timestamp */}
                          <td className="px-3.5 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{log.created_at.split(' ')[0]}</div>
                            <div className="text-slate-400 text-[10px]">{log.created_at.split(' ')[1] || ''}</div>
                          </td>

                          {/* Staff / User */}
                          <td className="px-3.5 py-3">
                            <div className="font-bold text-slate-900 text-xs">{log.user_name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1 py-0.2 rounded ${
                                  log.user_role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {log.user_role}
                              </span>
                              <span className="text-[10px] text-slate-400">ID #{log.user_id}</span>
                            </div>
                          </td>

                          {/* Action & Module */}
                          <td className="px-3.5 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadge(
                                  log.action
                                )}`}
                              >
                                {getActionIcon(log.action)}
                                <span>{log.action}</span>
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {log.module || 'General'}
                              </span>
                            </div>
                          </td>

                          {/* Target / Client */}
                          <td className="px-3.5 py-3 max-w-[200px]">
                            {log.firm_name ? (
                              <div>
                                <div className="font-bold text-slate-800 truncate" title={log.firm_name}>
                                  {log.firm_name}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {log.client_name} {log.financial_year ? `• FY ${log.financial_year}` : ''}
                                </div>
                              </div>
                            ) : log.financial_year ? (
                              <span className="font-semibold text-slate-700 text-xs">
                                FY {log.financial_year}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">System Core</span>
                            )}
                          </td>

                          {/* Description */}
                          <td className="px-3.5 py-3 text-slate-700 leading-relaxed max-w-sm">
                            <p className="text-xs text-slate-800">{log.description}</p>
                            {log.changed_fields && log.changed_fields.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap mt-1">
                                <span className="text-[10px] text-slate-400 font-semibold">Modified:</span>
                                {log.changed_fields.map((f) => (
                                  <span
                                    key={f}
                                    className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-mono"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Data Diff */}
                          <td className="px-3.5 py-3 text-center whitespace-nowrap">
                            {hasDiff ? (
                              <button
                                onClick={() => setInspectingLog(log)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                                title="Inspect Old vs New Values"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect Diff</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>

                          {/* Session & IP */}
                          <td className="px-3.5 py-3 text-right font-mono text-[11px] whitespace-nowrap">
                            <div className="text-slate-700 font-semibold">{log.ip_address}</div>
                            {log.session_id && (
                              <div
                                className="text-[9px] text-slate-400 truncate max-w-[120px] ml-auto"
                                title={log.session_id}
                              >
                                {log.session_id.substring(0, 14)}...
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-slate-400 ml-2">
                  Showing {(currentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="px-3 py-1 font-bold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT DIFF MODAL */}
      {inspectingLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Audit Detail & Payload Diff</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Log #{inspectingLog.id} • {inspectingLog.created_at}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Metadata Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Staff Member</span>
                  <div className="font-bold text-slate-800">{inspectingLog.user_name}</div>
                  <span className="text-[10px] text-blue-600 font-semibold">{inspectingLog.user_role}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Action / Module</span>
                  <div className="font-bold text-slate-800">{inspectingLog.action}</div>
                  <span className="text-[10px] text-slate-500">{inspectingLog.module}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Client Target</span>
                  <div className="font-bold text-slate-800 truncate">
                    {inspectingLog.firm_name || 'System / None'}
                  </div>
                  <span className="text-[10px] text-slate-500">{inspectingLog.client_name || ''}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">IP Address</span>
                  <div className="font-mono text-slate-700 font-semibold">{inspectingLog.ip_address}</div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Session ID</span>
                  <div className="font-mono text-slate-700 text-[10px] break-all">{inspectingLog.session_id}</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Event Description</span>
                <p className="mt-1 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-medium">
                  {inspectingLog.description}
                </p>
              </div>

              {/* Side-by-side Diff View */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Before & After Data Payload</span>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Passwords & tokens safely masked</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Old Values */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-rose-700 uppercase">
                      Previous / Old State:
                    </span>
                    <pre className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl text-[11px] font-mono text-slate-800 overflow-x-auto max-h-48">
                      {inspectingLog.old_values && Object.keys(inspectingLog.old_values).length > 0
                        ? JSON.stringify(inspectingLog.old_values, null, 2)
                        : 'None (New Record Creation)'}
                    </pre>
                  </div>

                  {/* New Values */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">
                      New / Updated State:
                    </span>
                    <pre className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-[11px] font-mono text-slate-800 overflow-x-auto max-h-48">
                      {inspectingLog.new_values && Object.keys(inspectingLog.new_values).length > 0
                        ? JSON.stringify(inspectingLog.new_values, null, 2)
                        : 'None (Record Deleted)'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setInspectingLog(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT / PDF GENERATION MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Printable Staff Activity Audit Report</h3>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 print-area text-xs">
              {/* Report Header */}
              <div className="border-b pb-4 text-center space-y-1">
                <h1 className="text-base font-black text-slate-900 tracking-wide uppercase">
                  STAFF ACTIVITY & AUDIT LOG REPORT
                </h1>
                <p className="text-xs text-slate-600 font-semibold">
                  GST Management & Compliance Suite • Internal Audit
                </p>
                <div className="text-[11px] text-slate-400 pt-1">
                  Generated On: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST) • Total
                  Logs: {filteredLogs.length}
                </div>
              </div>

              {/* Filter Parameters Summary */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg text-[11px] text-slate-600">
                <div>
                  <strong>Staff Filter:</strong>{' '}
                  {selectedStaffId === 'all'
                    ? 'All Staff'
                    : users.find((u) => String(u.id) === selectedStaffId)?.name}
                </div>
                <div>
                  <strong>Module:</strong> {selectedModule === 'all' ? 'All Modules' : selectedModule}
                </div>
                <div>
                  <strong>Action:</strong> {selectedAction === 'all' ? 'All Actions' : selectedAction}
                </div>
                <div>
                  <strong>Client:</strong>{' '}
                  {selectedClientId === 'all'
                    ? 'All Clients'
                    : clients.find((c) => String(c.id) === selectedClientId)?.firm_name}
                </div>
                <div>
                  <strong>Date Range:</strong> {datePreset.toUpperCase()}
                </div>
                <div>
                  <strong>FY:</strong>{' '}
                  {selectedFYId === 'all'
                    ? 'All FYs'
                    : financialYears.find((f) => String(f.id) === selectedFYId)?.display_name}
                </div>
              </div>

              {/* Printable Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 border-b font-bold text-slate-700">
                    <tr>
                      <th className="p-2">Timestamp (IST)</th>
                      <th className="p-2">Staff / Role</th>
                      <th className="p-2">Action</th>
                      <th className="p-2">Module</th>
                      <th className="p-2">Target Firm</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.slice(0, 100).map((log) => (
                      <tr key={log.id}>
                        <td className="p-2 font-mono text-[10px] whitespace-nowrap">{log.created_at}</td>
                        <td className="p-2 font-semibold">
                          {log.user_name} ({log.user_role})
                        </td>
                        <td className="p-2 font-bold">{log.action}</td>
                        <td className="p-2 text-slate-500">{log.module}</td>
                        <td className="p-2 font-medium">{log.firm_name || '—'}</td>
                        <td className="p-2 text-slate-800">{log.description}</td>
                        <td className="p-2 text-right font-mono text-[10px]">{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredLogs.length > 100 && (
                <div className="text-center text-slate-400 text-[11px] italic">
                  (Showing first 100 matching records for print format. Use CSV export for complete dataset.)
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
