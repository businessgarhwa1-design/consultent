import React, { useState, useMemo } from 'react';
import { Client, User, TabType } from '../types';
import {
  UserCheck,
  Search,
  Building,
  Landmark,
  Calculator,
  CalendarCheck2,
  FileSpreadsheet,
  ClipboardList,
  ShieldCheck,
  Eye,
  Edit2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Filter,
  Users,
} from 'lucide-react';

interface ClientSelectionProps {
  clients: Client[];
  users: User[];
  currentUser: User;
  activeClient: Client | null;
  onSelectActiveClient: (client: Client | null) => void;
  onNavigateTab: (tab: TabType, targetClientId?: number) => void;
  onOpenEditClient: (client: Client) => void;
  onOpenViewClient: (client: Client) => void;
}

export const ClientSelection: React.FC<ClientSelectionProps> = ({
  clients,
  users,
  currentUser,
  activeClient,
  onSelectActiveClient,
  onNavigateTab,
  onOpenEditClient,
  onOpenViewClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [schemeFilter, setSchemeFilter] = useState<'all' | 'Normal' | 'Composition' | 'QRMP'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Staff lookup map
  const userMap = useMemo(() => {
    const map = new Map<number, string>();
    users.forEach((u) => map.set(u.id, u.name));
    return map;
  }, [users]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesFirm = c.firm_name.toLowerCase().includes(q);
        const matchesName = c.client_name ? c.client_name.toLowerCase().includes(q) : false;
        const matchesGSTIN = c.gstin.toLowerCase().includes(q);
        const matchesFile = c.file_no ? c.file_no.toLowerCase().includes(q) : false;
        const matchesMobile = c.mobile ? c.mobile.includes(q) : false;
        if (!matchesFirm && !matchesName && !matchesGSTIN && !matchesFile && !matchesMobile) {
          return false;
        }
      }

      // Scheme
      if (schemeFilter !== 'all') {
        const norm = (c.gst_type || 'normal').toLowerCase();
        if (schemeFilter === 'Normal' && norm !== 'normal' && norm !== 'regular') return false;
        if (schemeFilter === 'Composition' && norm !== 'composition') return false;
        if (schemeFilter === 'QRMP' && norm !== 'qrmp') return false;
      }

      // Status
      if (statusFilter !== 'all') {
        if (c.status !== statusFilter) return false;
      }

      return true;
    });
  }, [clients, searchTerm, schemeFilter, statusFilter]);

  const handleSetActive = (client: Client) => {
    onSelectActiveClient(client);
  };

  const handleClearActive = () => {
    onSelectActiveClient(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Client Selection / Active Client</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Select an Active Client to isolate and automatically load all related Bank Turnover, GST Turnover, Monthly Work, Reports, and History.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-500 font-medium">
          <Users className="w-4 h-4 text-slate-400" />
          <span>Total Master Clients: <strong>{clients.length}</strong></span>
        </div>
      </div>

      {/* ACTIVE CLIENT SHOWCASE CARD */}
      <div
        id="active-client-indicator-panel"
        className={`rounded-2xl border transition-all p-5 shadow-xs ${
          activeClient
            ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-emerald-300'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        {activeClient ? (
          <div className="space-y-4">
            {/* Status & Title Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-200/80">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide bg-emerald-600 text-white shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping" />
                  Active Client Selected
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Client ID: <span className="font-mono text-slate-800">{activeClient.id}</span>
                </span>
              </div>
              <button
                type="button"
                id="btn-clear-active-client"
                onClick={handleClearActive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-all cursor-pointer"
                title="Deselect this client"
              >
                <XCircle className="w-3.5 h-3.5 text-slate-400 hover:text-red-600" />
                <span>Deselect Active Client</span>
              </button>
            </div>

            {/* Client Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Firm Name</div>
                <div className="text-base font-extrabold text-slate-900 mt-1 flex items-center gap-1.5 truncate">
                  <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate" title={activeClient.firm_name}>{activeClient.firm_name}</span>
                </div>
                {activeClient.file_no && (
                  <div className="text-xs font-semibold text-slate-600 mt-1">
                    📁 File No: <span className="font-mono text-slate-900">{activeClient.file_no}</span>
                  </div>
                )}
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">GSTIN & Scheme</div>
                <div className="text-sm font-mono font-bold text-blue-700 mt-1 tracking-wider truncate">
                  {activeClient.gstin}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 uppercase">
                    {activeClient.gst_type || 'Normal'}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      activeClient.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {activeClient.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Person</div>
                <div className="text-sm font-bold text-slate-800 mt-1 truncate">
                  {activeClient.client_name || 'N/A'}
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{activeClient.mobile || 'No mobile'}</span>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Staff</div>
                <div className="text-sm font-bold text-slate-800 mt-1">
                  {activeClient.assigned_staff_id
                    ? userMap.get(activeClient.assigned_staff_id) || `Staff #${activeClient.assigned_staff_id}`
                    : 'Unassigned'}
                </div>
                {activeClient.city && (
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{activeClient.city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 1-CLICK ACTION HUB FOR ACTIVE CLIENT */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Open Related Work in Active Client Context:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {/* Bank Turnover */}
                <button
                  type="button"
                  id="btn-goto-bank-turnover"
                  onClick={() => onNavigateTab('bank-turnover', activeClient.id)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-xs transition-all text-slate-800 cursor-pointer group"
                >
                  <Landmark className="w-5 h-5 text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Bank Turnover</span>
                  <span className="text-[10px] text-slate-500 font-medium">5 Banks • 12 Mo</span>
                </button>

                {/* GST Turnover */}
                <button
                  type="button"
                  id="btn-goto-gst-turnover"
                  onClick={() => onNavigateTab('gst-turnover-entry', activeClient.id)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 hover:shadow-xs transition-all text-slate-800 cursor-pointer group"
                >
                  <Calculator className="w-5 h-5 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">GST Turnover</span>
                  <span className="text-[10px] text-slate-500 font-medium">12-Month Table</span>
                </button>

                {/* Monthly Work */}
                <button
                  type="button"
                  id="btn-goto-monthly-work"
                  onClick={() => onNavigateTab('monthly-work', activeClient.id)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-xs transition-all text-slate-800 cursor-pointer group"
                >
                  <CalendarCheck2 className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Monthly GST</span>
                  <span className="text-[10px] text-slate-500 font-medium">Filing & Status</span>
                </button>

                {/* Reports */}
                <button
                  type="button"
                  id="btn-goto-reports"
                  onClick={() => onNavigateTab('reports', activeClient.id)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-xs transition-all text-slate-800 cursor-pointer group"
                >
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Reports & PDF</span>
                  <span className="text-[10px] text-slate-500 font-medium">Summary & Export</span>
                </button>

                {/* Client Profile / Entry */}
                <button
                  type="button"
                  id="btn-view-client-profile"
                  onClick={() => onOpenViewClient(activeClient)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 hover:shadow-xs transition-all text-slate-800 cursor-pointer group"
                >
                  <Eye className="w-5 h-5 text-slate-700 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Client Profile</span>
                  <span className="text-[10px] text-slate-500 font-medium">View Info</span>
                </button>

                {/* Edit Client Entry */}
                <button
                  type="button"
                  id="btn-edit-client-info"
                  onClick={() => onOpenEditClient(activeClient)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 hover:shadow-xs transition-all text-slate-800 cursor-pointer group"
                >
                  <Edit2 className="w-5 h-5 text-slate-700 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900">Edit Client</span>
                  <span className="text-[10px] text-slate-500 font-medium">Modify Details</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 mb-3">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">No Active Client Selected</h3>
            <p className="text-xs text-slate-600 max-w-md mt-1">
              Choose a client from the list below by clicking <strong>&quot;Set as Active Client&quot;</strong>. Once selected, all Bank Turnover, GST Turnover, Monthly Work, and Reports will isolate to that client.
            </p>
          </div>
        )}
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="client-selection-search-input"
              type="text"
              placeholder="Search by Firm Name, GSTIN, Contact Person, File No, Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
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

          {/* Scheme Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Scheme:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              {(['all', 'Normal', 'QRMP', 'Composition'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSchemeFilter(s)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    schemeFilter === s
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Status:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              {(['all', 'active', 'inactive'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' ? 'All' : st === 'active' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong>{filteredClients.length}</strong> of <strong>{clients.length}</strong> clients
          </span>
          {activeClient && (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Active: <strong>{activeClient.firm_name}</strong>
            </span>
          )}
        </div>
      </div>

      {/* CLIENTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">File # & Firm Name</th>
                <th className="py-3 px-4">GSTIN & Scheme</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Assigned Staff</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Active Selection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No clients found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isActive = activeClient?.id === client.id;
                  return (
                    <tr
                      key={client.id}
                      id={`client-row-${client.id}`}
                      className={`transition-colors ${
                        isActive
                          ? 'bg-emerald-50/70 hover:bg-emerald-50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Firm Name & File No */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-900 text-sm">{client.firm_name}</div>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {client.file_no ? (
                            <span className="font-mono font-medium text-slate-700">📁 {client.file_no}</span>
                          ) : (
                            <span className="text-slate-400">No File No</span>
                          )}
                          <span className="mx-1.5 text-slate-300">•</span>
                          <span>ID: {client.id}</span>
                        </div>
                      </td>

                      {/* GSTIN & Scheme */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-blue-800 tracking-wide">{client.gstin}</div>
                        <div className="mt-0.5">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                            {client.gst_type || 'Normal'}
                          </span>
                        </div>
                      </td>

                      {/* Contact & Phone */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{client.client_name || 'N/A'}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{client.mobile || '—'}</span>
                        </div>
                      </td>

                      {/* Assigned Staff */}
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium text-slate-700">
                          {client.assigned_staff_id
                            ? userMap.get(client.assigned_staff_id) || `Staff #${client.assigned_staff_id}`
                            : 'Unassigned'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            client.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {client.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Selection Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isActive ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Current Active</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              id={`btn-select-active-${client.id}`}
                              onClick={() => handleSetActive(client)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Set as Active Client</span>
                            </button>
                          )}

                          {/* Fast link to Turnover or Profile */}
                          <button
                            type="button"
                            title="Open Profile"
                            onClick={() => onOpenViewClient(client)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
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
