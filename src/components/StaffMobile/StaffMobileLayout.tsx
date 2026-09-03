import React, { useState } from 'react';
import {
  Client,
  FinancialYear,
  MonthlyWork,
  OfficeVisit,
  User,
  WorkStatus,
  AppSettings,
  FY_MONTHS,
} from '../../types';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  ClipboardList,
  MoreHorizontal,
  LogOut,
  RefreshCw,
  Building2,
  Calculator,
  Landmark,
  FileSpreadsheet,
  X,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StaffMobileDashboard } from './StaffMobileDashboard';
import { StaffMobileClients } from './StaffMobileClients';
import { StaffMobileMonthlyWork } from './StaffMobileMonthlyWork';
import { StaffMobileVisits } from './StaffMobileVisits';
import { StaffMobileGstTurnover } from './StaffMobileGstTurnover';
import { StaffMobileBankTurnover } from './StaffMobileBankTurnover';
import { StaffMobileReports } from './StaffMobileReports';
import { ClientFormModal } from '../ClientFormModal';
import { ClientProfileModal } from '../ClientProfileModal';

export type StaffMobileTab =
  | 'dashboard'
  | 'clients'
  | 'monthly-work'
  | 'office-visits'
  | 'gst-turnover-entry'
  | 'bank-turnover'
  | 'reports';

interface StaffMobileLayoutProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchUser?: (user: User) => void;
  users: User[];
  clients: Client[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  onSelectFY: (fy: FinancialYear) => void;
  fySortOrder: 'asc' | 'desc' | 'ASC' | 'DESC';
  onToggleFYSortOrder: () => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  monthlyWork: MonthlyWork[];
  officeVisits: OfficeVisit[];
  settings: AppSettings;
  onUpdateStatus: (fyId: number, month: string, clientId: number, status: WorkStatus, remark: string) => void;
  onRefreshPortal: () => void;
  isRefreshingPortal: boolean;
  onSaveClient: (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    success: boolean;
    error?: string;
  };
  onDeleteClient: (client: Client) => void;
  onAddOfficeVisit: (visitData: Omit<OfficeVisit, 'id' | 'created_at' | 'updated_at' | 'remarks_log'>) => {
    success: boolean;
    error?: string;
  };
  onUpdateOfficeVisit: (visitId: number, updates: Partial<OfficeVisit>) => {
    success: boolean;
    error?: string;
  };
  onMarkOfficeVisitOut: (visitId: number, outTime: string, finalRemark?: string) => {
    success: boolean;
    error?: string;
  };
  onAddOfficeVisitNote: (visitId: number, note: string) => {
    success: boolean;
    error?: string;
  };
  onDeleteOfficeVisit: (visitId: number) => {
    success: boolean;
    error?: string;
  };
  onExportMonthlyCSV: () => void;
  onExportClientsCSV: () => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StaffMobileLayout: React.FC<StaffMobileLayoutProps> = ({
  currentUser,
  onLogout,
  onSwitchUser,
  users,
  clients,
  financialYears,
  selectedFY,
  onSelectFY,
  fySortOrder,
  onToggleFYSortOrder,
  selectedMonth,
  onSelectMonth,
  monthlyWork,
  officeVisits,
  settings,
  onUpdateStatus,
  onRefreshPortal,
  isRefreshingPortal,
  onSaveClient,
  onDeleteClient,
  onAddOfficeVisit,
  onUpdateOfficeVisit,
  onMarkOfficeVisitOut,
  onAddOfficeVisitNote,
  onDeleteOfficeVisit,
  onExportMonthlyCSV,
  onExportClientsCSV,
  toast,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<StaffMobileTab>('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFYModal, setShowFYModal] = useState(false);

  // Client Modals
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [selectedTurnoverClientId, setSelectedTurnoverClientId] = useState<number | null>(null);
  const [selectedBankClientId, setSelectedBankClientId] = useState<number | null>(null);

  // Filter shortcuts
  const [monthlyWorkStatusFilter, setMonthlyWorkStatusFilter] = useState<string>('all');
  const [monthlyWorkSchemeFilter, setMonthlyWorkSchemeFilter] = useState<string>('all');

  const inVisitsCount = officeVisits.filter((v) => v.status === 'IN').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 left-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-blue-900 text-white border-blue-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span className="truncate">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white px-3.5 py-2.5 shadow-md flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-xs text-white leading-tight truncate">
              {settings.company_name || 'CA GST Portal'}
            </div>
            <div className="text-[10px] text-blue-300 font-bold flex items-center gap-1 mt-0.5">
              <span>{currentUser.name}</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-extrabold uppercase border border-blue-400/20">
                Staff
              </span>
            </div>
          </div>
        </div>

        {/* Quick FY & Month Selector Pill + Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowFYModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            <Calendar className="w-3 h-3 text-blue-400" />
            <span className="text-[11px] font-extrabold">{selectedMonth.substring(0, 3)} '{selectedFY.display_name.slice(-2)}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={onRefreshPortal}
            disabled={isRefreshingPortal}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Refresh Data from Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPortal ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-xl border border-rose-800/60 active:scale-95 transition-all cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 p-3.5 max-w-lg w-full mx-auto overflow-y-auto">
        {activeTab === 'dashboard' && (
          <StaffMobileDashboard
            currentUser={currentUser}
            clients={clients}
            monthlyWork={monthlyWork}
            selectedFY={selectedFY}
            selectedMonth={selectedMonth}
            officeVisits={officeVisits}
            onSelectMonth={onSelectMonth}
            onNavigateTab={(tab, filterStatus, filterScheme) => {
              if (filterStatus) setMonthlyWorkStatusFilter(filterStatus);
              if (filterScheme) setMonthlyWorkSchemeFilter(filterScheme);
              setActiveTab(tab);
            }}
            onUpdateStatus={onUpdateStatus}
            onRefreshPortal={onRefreshPortal}
            isRefreshingPortal={isRefreshingPortal}
          />
        )}

        {activeTab === 'clients' && (
          <StaffMobileClients
            clients={clients}
            users={users}
            currentUser={currentUser}
            selectedFY={selectedFY}
            selectedMonth={selectedMonth}
            monthlyWork={monthlyWork}
            onOpenAddClient={() => {
              setEditingClient(null);
              setIsAddClientModalOpen(true);
            }}
            onOpenEditClient={(c) => {
              setEditingClient(c);
              setIsAddClientModalOpen(true);
            }}
            onOpenViewClient={(c) => setViewingClient(c)}
            onNavigateToMonthlyWork={(gstin) => {
              setActiveTab('monthly-work');
            }}
            onNavigateToGstTurnover={(clientId) => {
              setSelectedTurnoverClientId(clientId);
              setActiveTab('gst-turnover-entry');
            }}
            onNavigateToBankTurnover={(clientId) => {
              setSelectedBankClientId(clientId);
              setActiveTab('bank-turnover');
            }}
          />
        )}

        {activeTab === 'monthly-work' && (
          <StaffMobileMonthlyWork
            clients={clients}
            monthlyWork={monthlyWork}
            financialYears={financialYears}
            selectedFY={selectedFY}
            onSelectFY={onSelectFY}
            selectedMonth={selectedMonth}
            onSelectMonth={onSelectMonth}
            users={users}
            currentUser={currentUser}
            onUpdateStatus={onUpdateStatus}
            onExportCSV={onExportMonthlyCSV}
          />
        )}

        {activeTab === 'office-visits' && (
          <StaffMobileVisits
            visits={officeVisits}
            clients={clients}
            financialYears={financialYears}
            selectedFY={selectedFY}
            selectedMonth={selectedMonth}
            users={users}
            currentUser={currentUser}
            settings={settings}
            onAddVisit={onAddOfficeVisit}
            onMarkVisitOut={onMarkOfficeVisitOut}
            onAddVisitNote={onAddOfficeVisitNote}
          />
        )}

        {activeTab === 'gst-turnover-entry' && (
          <StaffMobileGstTurnover
            clients={clients}
            financialYears={financialYears}
            selectedFY={selectedFY}
            onSelectFY={onSelectFY}
            currentUser={currentUser}
            initialClientId={selectedTurnoverClientId}
            onRefreshPortal={onRefreshPortal}
          />
        )}

        {activeTab === 'bank-turnover' && (
          <StaffMobileBankTurnover
            clients={clients}
            financialYears={financialYears}
            selectedFY={selectedFY}
            onSelectFY={onSelectFY}
            currentUser={currentUser}
            initialClientId={selectedBankClientId}
          />
        )}

        {activeTab === 'reports' && (
          <StaffMobileReports
            clients={clients}
            monthlyWork={monthlyWork}
            financialYears={financialYears}
            selectedFY={selectedFY}
            onSelectFY={onSelectFY}
            selectedMonth={selectedMonth}
            onSelectMonth={onSelectMonth}
            users={users}
            currentUser={currentUser}
            officeVisits={officeVisits}
            settings={settings}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-1">
          {/* Dashboard */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span className="text-[10px]">Dashboard</span>
          </button>

          {/* Master Clients */}
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'clients'
                ? 'text-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <Users className={`w-5 h-5 mb-0.5 ${activeTab === 'clients' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span className="text-[10px]">Clients</span>
          </button>

          {/* Monthly GST Work */}
          <button
            type="button"
            onClick={() => setActiveTab('monthly-work')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'monthly-work'
                ? 'text-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <CalendarCheck2 className={`w-5 h-5 mb-0.5 ${activeTab === 'monthly-work' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span className="text-[10px]">GST Work</span>
          </button>

          {/* Office Visits */}
          <button
            type="button"
            onClick={() => setActiveTab('office-visits')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'office-visits'
                ? 'text-indigo-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <ClipboardList className={`w-5 h-5 mb-0.5 ${activeTab === 'office-visits' ? 'text-indigo-600' : 'text-slate-500'}`} />
            <span className="text-[10px]">Visits</span>
            {inVisitsCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* More Menu */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
              showMoreMenu ||
              activeTab === 'gst-turnover-entry' ||
              activeTab === 'bank-turnover' ||
              activeTab === 'reports'
                ? 'text-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>

      {/* "More" Bottom Sheet Drawer */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-xs text-slate-900 leading-tight">
                    {currentUser.name} (Staff)
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold">{currentUser.email || currentUser.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions List */}
            <div className="space-y-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('gst-turnover-entry');
                  setShowMoreMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  activeTab === 'gst-turnover-entry'
                    ? 'bg-blue-600 text-white font-extrabold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <Calculator className="w-5 h-5 text-emerald-500" />
                <div className="text-left">
                  <div>12-Month GST Turnover Matrix</div>
                  <div className={`text-[10px] font-normal ${activeTab === 'gst-turnover-entry' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Enter monthly taxable & exempt sales
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('bank-turnover');
                  setShowMoreMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  activeTab === 'bank-turnover'
                    ? 'bg-blue-600 text-white font-extrabold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <Landmark className="w-5 h-5 text-violet-500" />
                <div className="text-left">
                  <div>Bank Turnover Management</div>
                  <div className={`text-[10px] font-normal ${activeTab === 'bank-turnover' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Track 5 bank accounts per client
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('reports');
                  setShowMoreMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white font-extrabold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <div>Reports & PDF Downloads</div>
                  <div className={`text-[10px] font-normal ${activeTab === 'reports' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Download Monthly, Client & Turnover PDFs
                  </div>
                </div>
              </button>
            </div>

            {/* Logout button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onLogout();
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out from Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FY & Month Selection Modal */}
      {showFYModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowFYModal(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-black text-xs text-slate-900">Select Working Period</h3>
              <button
                type="button"
                onClick={() => setShowFYModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Financial Year (FY):
              </label>
              <select
                value={selectedFY.id}
                onChange={(e) => {
                  const fy = financialYears.find((f) => f.id === Number(e.target.value));
                  if (fy) onSelectFY(fy);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                {financialYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>
                    FY {fy.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                GST Working Month:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {FY_MONTHS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onSelectMonth(m);
                      setShowFYModal(false);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      m === selectedMonth
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFYModal(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Global Modals (Shared with Existing Handlers) */}
      <ClientFormModal
        isOpen={isAddClientModalOpen}
        onClose={() => {
          setIsAddClientModalOpen(false);
          setEditingClient(null);
        }}
        onSave={onSaveClient}
        editClient={editingClient}
        users={users}
      />

      <ClientProfileModal
        isOpen={!!viewingClient}
        onClose={() => setViewingClient(null)}
        client={viewingClient}
        financialYears={financialYears}
        selectedFY={selectedFY}
        monthlyWork={monthlyWork}
        workHistory={[]}
        users={users}
        onOpenEdit={(client) => {
          setViewingClient(null);
          setEditingClient(client);
          setIsAddClientModalOpen(true);
        }}
        onNavigateToMonthlyWork={(gstin) => {
          setViewingClient(null);
          setActiveTab('monthly-work');
        }}
        onNavigateToBankTurnover={(clientId) => {
          setViewingClient(null);
          setSelectedBankClientId(clientId);
          setActiveTab('bank-turnover');
        }}
        onNavigateToGstTurnover={(clientId) => {
          setViewingClient(null);
          setSelectedTurnoverClientId(clientId);
          setActiveTab('gst-turnover-entry');
        }}
      />
    </div>
  );
};
