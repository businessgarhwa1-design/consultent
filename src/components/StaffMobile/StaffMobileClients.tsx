import React, { useState, useMemo } from 'react';
import { Client, User, FinancialYear, MonthlyWork } from '../../types';
import {
  Search,
  Plus,
  Phone,
  Copy,
  Check,
  Building,
  User as UserIcon,
  CalendarCheck2,
  Calculator,
  Landmark,
  Eye,
  Edit2,
  Filter,
  X,
} from 'lucide-react';

interface StaffMobileClientsProps {
  clients: Client[];
  users: User[];
  currentUser: User;
  selectedFY: FinancialYear;
  selectedMonth: string;
  monthlyWork: MonthlyWork[];
  onOpenAddClient: () => void;
  onOpenEditClient: (client: Client) => void;
  onOpenViewClient: (client: Client) => void;
  onNavigateToMonthlyWork: (gstin?: string) => void;
  onNavigateToGstTurnover: (clientId: number) => void;
  onNavigateToBankTurnover: (clientId: number) => void;
}

export const StaffMobileClients: React.FC<StaffMobileClientsProps> = ({
  clients,
  users,
  currentUser,
  selectedFY,
  selectedMonth,
  monthlyWork,
  onOpenAddClient,
  onOpenEditClient,
  onOpenViewClient,
  onNavigateToMonthlyWork,
  onNavigateToGstTurnover,
  onNavigateToBankTurnover,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState<'my' | 'all'>('my');
  const [filterScheme, setFilterScheme] = useState<'all' | 'Normal' | 'Composition' | 'QRMP'>('all');
  const [copiedGstin, setCopiedGstin] = useState<string | null>(null);

  // Copy GSTIN helper
  const handleCopyGstin = (gstin: string) => {
    navigator.clipboard.writeText(gstin);
    setCopiedGstin(gstin);
    setTimeout(() => setCopiedGstin(null), 1800);
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Filter scope
    if (filterScope === 'my') {
      const my = result.filter((c) => c.assigned_staff_id === currentUser.id);
      if (my.length > 0) {
        result = my;
      }
    }

    // Filter scheme
    if (filterScheme !== 'all') {
      result = result.filter((c) => {
        const type = (c.gst_type || '').toLowerCase();
        return type === filterScheme.toLowerCase();
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.firm_name.toLowerCase().includes(q) ||
          c.client_name.toLowerCase().includes(q) ||
          c.gstin.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          (c.file_no && c.file_no.toLowerCase().includes(q))
      );
    }

    return result;
  }, [clients, filterScope, filterScheme, searchQuery, currentUser.id]);

  return (
    <div className="space-y-3 pb-24">
      {/* Header with Search and Add Client */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Master Clients</h1>
            <p className="text-[11px] text-slate-500 font-semibold">
              Showing {filteredClients.length} of {clients.length} clients
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddClient}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Client</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Firm, GSTIN, Name, Mobile..."
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

        {/* Scope Toggle: My Clients vs All */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold w-full">
            <button
              type="button"
              onClick={() => setFilterScope('my')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                filterScope === 'my'
                  ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Clients
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('all')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                filterScope === 'all'
                  ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Clients ({clients.length})
            </button>
          </div>
        </div>

        {/* Scheme Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setFilterScheme('all')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
              filterScheme === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Schemes
          </button>
          <button
            type="button"
            onClick={() => setFilterScheme('Normal')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
              filterScheme === 'Normal'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Regular (Normal)
          </button>
          <button
            type="button"
            onClick={() => setFilterScheme('Composition')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
              filterScheme === 'Composition'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Composition
          </button>
          <button
            type="button"
            onClick={() => setFilterScheme('QRMP')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
              filterScheme === 'QRMP'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            QRMP
          </button>
        </div>
      </div>

      {/* Clients Card List */}
      {filteredClients.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <Building className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="text-xs font-bold text-slate-800">No Clients Found</div>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Try adjusting your search query or scheme filters, or add a new client.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredClients.map((client) => {
            const assignedStaff = users.find((u) => u.id === client.assigned_staff_id);
            const isAssignedToMe = client.assigned_staff_id === currentUser.id;

            return (
              <div
                key={client.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 hover:border-blue-200 transition-all"
              >
                {/* Top: Firm Name & File No */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-slate-900 leading-tight">
                        {client.firm_name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">
                      {client.client_name}
                    </div>
                  </div>

                  {client.file_no && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0 border border-slate-200">
                      File: {client.file_no}
                    </span>
                  )}
                </div>

                {/* GSTIN & Copy Button */}
                <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-mono font-bold text-slate-800 tracking-wide">
                    {client.gstin}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyGstin(client.gstin)}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {copiedGstin === client.gstin ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Badges & Phone */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        (client.gst_type || '').toLowerCase() === 'composition'
                          ? 'bg-amber-100 text-amber-800'
                          : (client.gst_type || '').toLowerCase() === 'qrmp'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {client.gst_type || 'Normal'}
                    </span>

                    {assignedStaff && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAssignedToMe
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isAssignedToMe ? 'My Client' : assignedStaff.name}
                      </span>
                    )}
                  </div>

                  {client.mobile && (
                    <a
                      href={`tel:${client.mobile}`}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 shadow-2xs shrink-0"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{client.mobile}</span>
                    </a>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onOpenViewClient(client)}
                    className="flex items-center justify-center gap-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all"
                  >
                    <Eye className="w-3 h-3 text-slate-600" />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenEditClient(client)}
                    className="flex items-center justify-center gap-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all"
                  >
                    <Edit2 className="w-3 h-3 text-slate-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateToMonthlyWork(client.gstin)}
                    className="flex items-center justify-center gap-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold transition-all"
                  >
                    <CalendarCheck2 className="w-3 h-3 text-blue-600" />
                    <span>GST</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateToGstTurnover(client.id)}
                    className="flex items-center justify-center gap-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all"
                  >
                    <Calculator className="w-3 h-3 text-emerald-600" />
                    <span>Turnover</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
