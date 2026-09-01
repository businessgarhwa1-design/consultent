import React, { useState, useEffect } from 'react';
import {
  ActivityLog,
  AppSettings,
  Client,
  FinancialYear,
  MonthlyWork as MonthlyWorkType,
  OfficeVisit,
  User,
  WorkHistory,
  WorkStatus,
} from './types';
import { GSTStorage } from './utils/storage';
import { CloudService, subscribeToDatabase } from './utils/cloudService';
import { SupabaseService } from './utils/supabaseService';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClientsList } from './components/ClientsList';
import { MonthlyWork } from './components/MonthlyWork';
import { FinancialYears } from './components/FinancialYears';
import { StaffManagement } from './components/StaffManagement';
import { UserManagement } from './components/UserManagement';
import { UserDashboard } from './components/UserDashboard';
import { LoginPage } from './components/LoginPage';
import { Reports } from './components/Reports';
import { ActivityLogs } from './components/ActivityLogs';
import { SettingsModal } from './components/SettingsModal';
import { ClientFormModal } from './components/ClientFormModal';
import { ClientProfileModal } from './components/ClientProfileModal';
import { CsvImportModal } from './components/CsvImportModal';
import { BankTurnover } from './components/BankTurnover';
import { GstTurnoverEntry } from './components/GstTurnoverEntry';
import { OfficeVisits } from './components/OfficeVisits/OfficeVisits';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function App() {
  // Global State - Direct synchronous initialization from local storage for instant reload recovery
  const [users, setUsers] = useState<User[]>(() => GSTStorage.getUsers());
  const [currentUser, setCurrentUser] = useState<User | null>(() => GSTStorage.getCurrentUser());
  const [clients, setClients] = useState<Client[]>(() => GSTStorage.getClients());
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>(() => GSTStorage.getFinancialYears());
  const [selectedFY, setSelectedFY] = useState<FinancialYear | null>(() => GSTStorage.getSelectedFY());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => GSTStorage.getSelectedMonth());
  const [monthlyWork, setMonthlyWork] = useState<MonthlyWorkType[]>(() => GSTStorage.getMonthlyWork());
  const [workHistory, setWorkHistory] = useState<WorkHistory[]>(() => GSTStorage.getWorkHistory());
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => GSTStorage.getActivityLogs());
  const [settings, setSettings] = useState<AppSettings | null>(() => GSTStorage.getSettings());
  const [officeVisits, setOfficeVisits] = useState<OfficeVisit[]>(() => GSTStorage.getOfficeVisits());

  // UI State with persisted active tab
  const [activeTab, setActiveTabState] = useState<TabType>(() => GSTStorage.getActiveTab());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    GSTStorage.setActiveTab(tab);
  };

  // Modals
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Routing query filter to monthly work
  const [monthlyWorkSearch, setMonthlyWorkSearch] = useState('');
  const [monthlyWorkStatusFilter, setMonthlyWorkStatusFilter] = useState('all');
  const [monthlyWorkSchemeFilter, setMonthlyWorkSchemeFilter] = useState('all');
  const [selectedBankClientId, setSelectedBankClientId] = useState<number | null>(null);
  const [selectedTurnoverClientId, setSelectedTurnoverClientId] = useState<number | null>(null);
  const [isRefreshingPortal, setIsRefreshingPortal] = useState(false);

  // Toasts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Initial Load from local persistence + Cloud Firestore Sync
  useEffect(() => {
    const loadedUsers = GSTStorage.getUsers();
    const loadedClients = GSTStorage.getClients();
    const loadedFYs = GSTStorage.getFinancialYears();
    const loadedMonthlyWork = GSTStorage.getMonthlyWork();
    const loadedHistory = GSTStorage.getWorkHistory();
    const loadedLogs = GSTStorage.getActivityLogs();
    const loadedSettings = GSTStorage.getSettings();
    const loadedCurUser = GSTStorage.getCurrentUser();
    const loadedFY = GSTStorage.getSelectedFY();
    const loadedMonth = GSTStorage.getSelectedMonth();
    const loadedVisits = GSTStorage.getOfficeVisits();

    setUsers(loadedUsers);
    setClients(loadedClients);
    setFinancialYears(loadedFYs);
    setSelectedFY(loadedFY);
    setSelectedMonth(loadedMonth);
    setMonthlyWork(loadedMonthlyWork);
    setWorkHistory(loadedHistory);
    setActivityLogs(loadedLogs);
    setSettings(loadedSettings);
    if (loadedCurUser) {
      setCurrentUser(loadedCurUser);
    }
    setOfficeVisits(loadedVisits);

    // Initialize Cloud Connection & Sync with Supabase
    CloudService.initDatabase();
    SupabaseService.testConnection().then(() => {
      SupabaseService.fetchAllProjectDataFromSupabase().then((res) => {
        if (res.success && res.data) {
          if (res.data.clients && Array.isArray(res.data.clients) && res.data.clients.length > 0) {
            GSTStorage.saveClients(res.data.clients);
            setClients(res.data.clients);
          }
          if (res.data.monthly_work && Array.isArray(res.data.monthly_work) && res.data.monthly_work.length > 0) {
            GSTStorage.saveMonthlyWork(res.data.monthly_work);
            setMonthlyWork(res.data.monthly_work);
          }
          if (res.data.office_visits && Array.isArray(res.data.office_visits) && res.data.office_visits.length > 0) {
            GSTStorage.saveOfficeVisits(res.data.office_visits);
            setOfficeVisits(res.data.office_visits);
          }
        }
      }).catch((e) => console.warn('Supabase initial fetch notice:', e));
    }).catch(() => {});

    // Subscribe to Supabase Realtime changes
    const unsubSupabase = SupabaseService.initRealtimeSubscription(() => {
      const freshVisits = GSTStorage.getOfficeVisits();
      const freshClients = GSTStorage.getClients();
      const freshWork = GSTStorage.getMonthlyWork();
      setOfficeVisits(freshVisits);
      setClients(freshClients);
      setMonthlyWork(freshWork);
    });

    // Subscribe to cross-device sync
    const unsubscribe = subscribeToDatabase(() => {
      const cloudU = CloudService.getCachedUsers();
      if (cloudU && cloudU.length > 0) {
        setUsers(cloudU);
      }
      const cloudC = CloudService.getCachedClients();
      if (cloudC && cloudC.length > 0) {
        setClients(cloudC);
      }
      const cloudFY = CloudService.getCachedFinancialYears();
      if (cloudFY && cloudFY.length > 0) {
        setFinancialYears(cloudFY);
      }
      const cloudMW = CloudService.getCachedMonthlyWork();
      if (cloudMW && cloudMW.length > 0) {
        setMonthlyWork(cloudMW);
      }
      const cloudHist = CloudService.getCachedWorkHistory();
      if (cloudHist && cloudHist.length > 0) {
        setWorkHistory(cloudHist);
      }
      const cloudLogs = CloudService.getCachedActivityLogs();
      if (cloudLogs && cloudLogs.length > 0) {
        setActivityLogs(cloudLogs);
      }
      const cloudVisits = CloudService.getCachedOfficeVisits();
      if (cloudVisits && cloudVisits.length > 0) {
        setOfficeVisits(cloudVisits);
      }
      const cloudSettings = CloudService.getCachedSettings();
      if (cloudSettings) {
        setSettings(cloudSettings);
      }
    });

    return () => {
      unsubscribe();
      unsubSupabase();
    };
  }, []);

  // Handlers for Login & Session
  const handleLoginSuccess = (user: User) => {
    GSTStorage.setCurrentUser(user);
    GSTStorage.startSession(user);
    setCurrentUser(user);
    setActiveTab('dashboard');
    showToast(`Welcome back, ${user.name}! (${user.role.toUpperCase()})`, 'success');
  };

  const handleLogout = () => {
    GSTStorage.logout();
    setCurrentUser(null);
    setActiveTab('dashboard');
    showToast('You have been logged out securely.', 'info');
  };

  // Check login guard: If not logged in, render the secure Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (!selectedFY || !settings) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-sm font-semibold text-slate-300">
            Initializing GST Portal Database Engine...
          </div>
        </div>
      </div>
    );
  }

  // Handlers
  const handleSelectFY = (fy: FinancialYear) => {
    setSelectedFY(fy);
    GSTStorage.setSelectedFY(fy);
    showToast(`Switched to Financial Year ${fy.display_name}`, 'info');
  };

  const handleSelectMonth = (month: string) => {
    setSelectedMonth(month);
    GSTStorage.setSelectedMonth(month);
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    GSTStorage.setCurrentUser(user);
    showToast(`Switched active session to ${user.name} (${user.role.toUpperCase()})`, 'info');
  };

  const handleSaveClient = (
    clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>
  ): { success: boolean; error?: string } => {
    if (editingClient) {
      const res = GSTStorage.updateClient(editingClient.id, clientData);
      if (res.success) {
        setClients(GSTStorage.getClients());
        setActivityLogs(GSTStorage.getActivityLogs());
        showToast(`Client "${clientData.firm_name}" updated successfully!`);
      }
      return res;
    } else {
      const res = GSTStorage.addClient(clientData);
      if (res.success && res.client) {
        setClients(GSTStorage.getClients());
        setActivityLogs(GSTStorage.getActivityLogs());
        showToast(`Client "${clientData.firm_name}" registered with GSTIN ${clientData.gstin}!`);
      }
      return res;
    }
  };

  const handleDeleteClient = (client: Client) => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete "${client.firm_name}" (${client.gstin}) and all related monthly records?`
      )
    ) {
      const res = GSTStorage.deleteClient(client.id);
      if (res.success) {
        setClients(GSTStorage.getClients());
        setMonthlyWork(GSTStorage.getMonthlyWork());
        setActivityLogs(GSTStorage.getActivityLogs());
        showToast(`Client "${client.firm_name}" deleted.`);
      }
    }
  };

  const handleUpdateStatus = (
    fyId: number,
    month: string,
    clientId: number,
    status: WorkStatus,
    remark: string
  ) => {
    const res = GSTStorage.updateMonthlyStatus(fyId, month, clientId, status, remark);
    if (res.success) {
      setMonthlyWork(GSTStorage.getMonthlyWork());
      setWorkHistory(GSTStorage.getWorkHistory());
      setActivityLogs(GSTStorage.getActivityLogs());
    }
  };

  const handleAddFinancialYear = (startYear: number) => {
    const res = GSTStorage.addFinancialYear(startYear);
    if (res.success && res.fy) {
      setFinancialYears(GSTStorage.getFinancialYears());
      setActivityLogs(GSTStorage.getActivityLogs());
      showToast(`Financial Year ${res.fy.display_name} created!`);
    }
    return res;
  };

  const handleAddUser = async (
    userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { confirmPassword?: string }
  ) => {
    const cloudRes = await CloudService.registerOrAddUser(userData);
    if (!cloudRes.success) {
      return cloudRes;
    }
    const res = GSTStorage.addUser(userData);
    const updatedUsers = await CloudService.getUsers();
    setUsers(updatedUsers);
    setActivityLogs(GSTStorage.getActivityLogs());
    showToast(`User account for ${userData.name} created!`);
    return { success: true };
  };

  const handleUpdateUser = async (
    id: number,
    userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>> & { newPassword?: string }
  ) => {
    const cloudRes = await CloudService.updateUser(id, userData);
    if (!cloudRes.success) {
      return cloudRes;
    }
    const res = GSTStorage.updateUser(id, userData);
    const updatedUsers = await CloudService.getUsers();
    setUsers(updatedUsers);
    setActivityLogs(GSTStorage.getActivityLogs());
    showToast('User details updated successfully!');
    return { success: true };
  };

  const handleToggleUserStatus = async (id: number) => {
    await CloudService.toggleUserStatus(id);
    const res = GSTStorage.toggleUserStatus(id);
    if (res.success) {
      const updatedUsers = await CloudService.getUsers();
      setUsers(updatedUsers);
      setActivityLogs(GSTStorage.getActivityLogs());
      showToast(`User status updated to ${res.newStatus?.toUpperCase()}`);
    }
    return res;
  };

  const handleDeleteUser = async (id: number) => {
    await CloudService.deleteUser(id);
    const res = GSTStorage.deleteUser(id);
    if (res.success) {
      const updatedUsers = await CloudService.getUsers();
      setUsers(updatedUsers);
      setClients(GSTStorage.getClients());
      setActivityLogs(GSTStorage.getActivityLogs());
      showToast('User deleted successfully.');
    }
    return res;
  };

  const handleResetUserPassword = async (id: number, newPass: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return { success: false, error: 'User not found' };
    await CloudService.resetPassword(target.username, newPass);
    const res = await GSTStorage.resetPassword(target.username, newPass);
    if (res.success) {
      const updatedUsers = await CloudService.getUsers();
      setUsers(updatedUsers);
      setActivityLogs(GSTStorage.getActivityLogs());
      showToast(`Password reset for ${target.name}`);
    }
    return res;
  };

  const handleImportConfirmed = (
    newClients: Omit<Client, 'id' | 'created_at' | 'updated_at'>[]
  ) => {
    let imported = 0;
    for (const c of newClients) {
      const res = GSTStorage.addClient(c);
      if (res.success) imported++;
    }
    setClients(GSTStorage.getClients());
    setActivityLogs(GSTStorage.getActivityLogs());
    showToast(`Successfully imported ${imported} clients from CSV!`);
  };

  const handleExportClientsCSV = () => {
    const header = [
      'Client ID',
      'File No',
      'GSTIN',
      'Firm Name',
      'Client Name',
      'Mobile',
      'Alternate Mobile',
      'Email',
      'Address',
      'City',
      'State',
      'PIN',
      'GST Scheme',
      'Status',
    ];
    const rows = clients.map((c) => [
      c.id,
      `"${c.file_no || ''}"`,
      `"${c.gstin}"`,
      `"${c.firm_name.replace(/"/g, '""')}"`,
      `"${c.client_name.replace(/"/g, '""')}"`,
      `"${c.mobile}"`,
      `"${c.alternate_mobile || ''}"`,
      `"${c.email || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.city || ''}"`,
      `"${c.state || ''}"`,
      `"${c.pin_code || ''}"`,
      c.gst_type,
      c.status,
    ]);

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gst_master_clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported Master Clients CSV', 'info');
  };

  const handleExportMonthlyCSV = () => {
    const workMap = new Map<number, MonthlyWorkType>();
    monthlyWork
      .filter((m) => m.financial_year_id === selectedFY.id && m.month === selectedMonth)
      .forEach((r) => workMap.set(r.client_id, r));

    const header = [
      'File No',
      'GSTIN',
      'Firm Name',
      'Client Name',
      'Mobile',
      'Alternate Mobile',
      'Scheme',
      'Staff',
      'Status',
      'Remark',
      'Last Updated',
    ];
    const rows = clients
      .filter((c) => c.status === 'active')
      .map((c) => {
        const rec = workMap.get(c.id);
        const staff = users.find((u) => u.id === c.assigned_staff_id);
        return [
          `"${c.file_no || ''}"`,
          `"${c.gstin}"`,
          `"${c.firm_name.replace(/"/g, '""')}"`,
          `"${c.client_name.replace(/"/g, '""')}"`,
          `"${c.mobile}"`,
          `"${c.alternate_mobile || ''}"`,
          c.gst_type,
          `"${staff ? staff.name : 'Unassigned'}"`,
          rec ? rec.status : 'Not Started',
          `"${(rec?.remark || '').replace(/"/g, '""')}"`,
          rec?.updated_at || '',
        ];
      });

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `gst_work_${selectedMonth}_${selectedFY.display_name}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${selectedMonth} Monthly Work CSV`, 'info');
  };

  const handleResetDatabase = () => {
    GSTStorage.resetToDefaultSeed();
    setUsers(GSTStorage.getUsers());
    setClients(GSTStorage.getClients());
    setFinancialYears(GSTStorage.getFinancialYears());
    setSelectedFY(GSTStorage.getSelectedFY());
    setSelectedMonth(GSTStorage.getSelectedMonth());
    setMonthlyWork(GSTStorage.getMonthlyWork());
    setWorkHistory(GSTStorage.getWorkHistory());
    setActivityLogs(GSTStorage.getActivityLogs());
    setSettings(GSTStorage.getSettings());
    setCurrentUser(GSTStorage.getCurrentUser());
    setOfficeVisits(GSTStorage.getOfficeVisits());
    showToast('Database successfully restored to clean seed data.');
  };

  // Office Visits Handlers
  const handleAddOfficeVisit = (
    data: Omit<
      OfficeVisit,
      'id' | 'created_at' | 'updated_at' | 'updated_by_id' | 'updated_by_name' | 'remarks_log'
    > & { initial_note?: string }
  ) => {
    const res = GSTStorage.addOfficeVisit(data);
    if (res.success && res.visit) {
      setOfficeVisits(GSTStorage.getOfficeVisits());
      setActivityLogs(GSTStorage.getActivityLogs());
      showToast(`Visitor "${res.visit.firm_name || res.visit.client_name}" marked IN successfully!`);
    }
    return res;
  };

  const handleUpdateOfficeVisit = (
    id: number,
    data: Partial<Omit<OfficeVisit, 'id' | 'created_at' | 'remarks_log'>> & { new_note?: string }
  ) => {
    const res = GSTStorage.updateOfficeVisit(id, data);
    if (res.success && res.visit) {
      setOfficeVisits(GSTStorage.getOfficeVisits());
      setActivityLogs(GSTStorage.getActivityLogs());
      showToast('Visit record updated successfully!');
    }
    return res;
  };

  const handleMarkOfficeVisitOut = (id: number, outTime: string, outRemark?: string) => {
    const res = GSTStorage.markVisitOut(id, outTime, outRemark);
    if (res.success && res.visit) {
      setOfficeVisits(GSTStorage.getOfficeVisits());
      setActivityLogs(GSTStorage.getActivityLogs());
      showToast(`Visitor "${res.visit.firm_name || res.visit.client_name}" marked OUT at ${outTime}.`);
    }
  };

  const handleAddOfficeVisitNote = (id: number, noteText: string) => {
    const res = GSTStorage.addVisitNote(id, noteText);
    if (res.success) {
      setOfficeVisits(GSTStorage.getOfficeVisits());
      showToast('Running note added to visit timeline.');
    }
  };

  const handleDeleteOfficeVisit = (id: number) => {
    const res = GSTStorage.deleteOfficeVisit(id);
    if (res.success) {
      setOfficeVisits(GSTStorage.getOfficeVisits());
      setActivityLogs(GSTStorage.getActivityLogs());
      showToast('Visit record deleted.');
    }
  };

  const handleRefreshPortal = async () => {
    setIsRefreshingPortal(true);
    try {
      // Check & pull any remote changes from Supabase if available
      try {
        const remoteRes = await SupabaseService.fetchAllProjectDataFromSupabase();
        if (remoteRes.success && remoteRes.data) {
          if (remoteRes.data.clients && Array.isArray(remoteRes.data.clients) && remoteRes.data.clients.length > 0) {
            GSTStorage.saveClients(remoteRes.data.clients);
          }
          if (remoteRes.data.monthly_work && Array.isArray(remoteRes.data.monthly_work) && remoteRes.data.monthly_work.length > 0) {
            GSTStorage.saveMonthlyWork(remoteRes.data.monthly_work);
          }
          if (remoteRes.data.office_visits && Array.isArray(remoteRes.data.office_visits) && remoteRes.data.office_visits.length > 0) {
            GSTStorage.saveOfficeVisits(remoteRes.data.office_visits);
          }
        }
      } catch (cloudErr) {
        console.warn('Supabase fetch during refresh notice:', cloudErr);
      }

      const freshVisits = GSTStorage.getOfficeVisits();
      const freshClients = GSTStorage.getClients();
      const freshWork = GSTStorage.getMonthlyWork();
      const freshUsers = GSTStorage.getUsers();
      const freshFY = GSTStorage.getFinancialYears();
      const freshLogs = GSTStorage.getActivityLogs();
      const freshSettings = GSTStorage.getSettings();

      setOfficeVisits(freshVisits);
      setClients(freshClients);
      setMonthlyWork(freshWork);
      setUsers(freshUsers);
      setFinancialYears(freshFY);
      setActivityLogs(freshLogs);
      if (freshSettings) setSettings(freshSettings);

      showToast(`Portal data & Supabase Cloud synced for FY ${selectedFY.display_name} (${selectedMonth})`, 'info');
    } catch (err) {
      console.error('Refresh error:', err);
      showToast('Portal refreshed!', 'info');
    } finally {
      setTimeout(() => {
        setIsRefreshingPortal(false);
      }, 700);
    }
  };

  // Pending count for sidebar badge
  const pendingCount = clients
    .filter((c) => c.status === 'active')
    .filter((c) => {
      const rec = monthlyWork.find(
        (m) =>
          m.financial_year_id === selectedFY.id &&
          m.month === selectedMonth &&
          m.client_id === c.id
      );
      const st = rec ? rec.status : 'Not Started';
      return st !== 'Completed';
    }).length;

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
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-blue-900 text-white border-blue-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        users={users}
        financialYears={financialYears}
        selectedFY={selectedFY}
        onSelectFY={handleSelectFY}
        selectedMonth={selectedMonth}
        onSelectMonth={handleSelectMonth}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        companyName={settings.company_name}
        onRefreshPortal={handleRefreshPortal}
        isRefreshing={isRefreshingPortal}
      />

      {/* App Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'import') {
              setIsImportModalOpen(true);
            } else if (tab === 'export') {
              handleExportClientsCSV();
            } else {
              setActiveTab(tab);
            }
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          clientCount={clients.length}
          pendingCount={pendingCount}
          inVisitsCount={inVisitsCount}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-full">
          {/* Dashboard Tab: Admin vs Staff */}
          {activeTab === 'dashboard' && (
            currentUser.role === 'admin' ? (
              <Dashboard
                clients={clients}
                monthlyWork={monthlyWork}
                financialYears={financialYears}
                selectedFY={selectedFY}
                selectedMonth={selectedMonth}
                users={users}
                activityLogs={activityLogs}
                officeVisits={officeVisits}
                onNavigateTab={(tab, filterStatus, filterScheme) => {
                  if (filterStatus) {
                    setMonthlyWorkStatusFilter(filterStatus);
                  } else {
                    setMonthlyWorkStatusFilter('all');
                  }
                  if (filterScheme) {
                    setMonthlyWorkSchemeFilter(filterScheme);
                  } else {
                    setMonthlyWorkSchemeFilter('all');
                  }
                  setMonthlyWorkSearch('');
                  setActiveTab(tab);
                }}
                onOpenAddClient={() => {
                  setEditingClient(null);
                  setIsAddClientModalOpen(true);
                }}
                onOpenImportModal={() => setIsImportModalOpen(true)}
                onRefresh={handleRefreshPortal}
              />
            ) : (
              <UserDashboard
                currentUser={currentUser}
                clients={clients}
                monthlyWork={monthlyWork}
                selectedFY={selectedFY}
                selectedMonth={selectedMonth}
                officeVisits={officeVisits}
                onSelectMonth={handleSelectMonth}
                onNavigateToMonthlyWork={(filter) => {
                  if (filter) setMonthlyWorkStatusFilter(filter);
                  setActiveTab('monthly-work');
                }}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onUpdateStatus={handleUpdateStatus}
                onRefresh={handleRefreshPortal}
              />
            )
          )}

          {activeTab === 'clients' && (
            <ClientsList
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
              onOpenEditClient={(client) => {
                setEditingClient(client);
                setIsAddClientModalOpen(true);
              }}
              onOpenViewClient={(client) => setViewingClient(client)}
              onDeleteClient={handleDeleteClient}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onExportCSV={handleExportClientsCSV}
              onNavigateToMonthlyWork={(gstin) => {
                setMonthlyWorkSearch(gstin || '');
                setMonthlyWorkStatusFilter('all');
                setActiveTab('monthly-work');
              }}
              onNavigateToBankTurnover={(clientId) => {
                setSelectedBankClientId(clientId);
                setActiveTab('bank-turnover');
              }}
              onNavigateToGstTurnover={(clientId) => {
                setSelectedTurnoverClientId(clientId);
                setActiveTab('gst-turnover-entry');
              }}
            />
          )}

          {activeTab === 'office-visits' && (
            <OfficeVisits
              visits={officeVisits}
              clients={clients}
              financialYears={financialYears}
              selectedFY={selectedFY}
              onSelectFY={handleSelectFY}
              selectedMonth={selectedMonth}
              onSelectMonth={handleSelectMonth}
              users={users}
              currentUser={currentUser}
              settings={settings}
              onAddVisit={handleAddOfficeVisit}
              onUpdateVisit={handleUpdateOfficeVisit}
              onMarkVisitOut={handleMarkOfficeVisitOut}
              onAddVisitNote={handleAddOfficeVisitNote}
              onDeleteVisit={handleDeleteOfficeVisit}
              onOpenAddClientWithData={(prefillData) => {
                setEditingClient(null);
                setIsAddClientModalOpen(true);
              }}
              onRefreshData={handleRefreshPortal}
            />
          )}

          {activeTab === 'monthly-work' && (
            <MonthlyWork
              clients={clients}
              monthlyWork={monthlyWork}
              financialYears={financialYears}
              selectedFY={selectedFY}
              onSelectFY={handleSelectFY}
              selectedMonth={selectedMonth}
              onSelectMonth={handleSelectMonth}
              users={users}
              currentUser={currentUser}
              onUpdateStatus={handleUpdateStatus}
              initialSearchQuery={monthlyWorkSearch}
              initialStatusFilter={monthlyWorkStatusFilter}
              initialSchemeFilter={monthlyWorkSchemeFilter}
              onExportCSV={handleExportMonthlyCSV}
              onRefresh={handleRefreshPortal}
            />
          )}

          {(activeTab === 'gst-turnover-entry' || activeTab === 'gst-turnover-matrix') && (
            <GstTurnoverEntry
              clients={clients}
              financialYears={financialYears}
              selectedFY={selectedFY}
              currentUser={currentUser}
              users={users}
              initialClientId={selectedTurnoverClientId}
              onSelectFY={handleSelectFY}
              onRefresh={handleRefreshPortal}
            />
          )}

          {activeTab === 'bank-turnover' && (
            <BankTurnover
              clients={clients}
              financialYears={financialYears}
              selectedFY={selectedFY}
              currentUser={currentUser}
              initialClientId={selectedBankClientId}
              onSelectFY={handleSelectFY}
              onRefresh={handleRefreshPortal}
            />
          )}

          {activeTab === 'reports' && (
            <Reports
              clients={clients}
              monthlyWork={monthlyWork}
              financialYears={financialYears}
              selectedFY={selectedFY}
              selectedMonth={selectedMonth}
              users={users}
              currentUser={currentUser}
              onExportCSV={handleExportMonthlyCSV}
              onSelectFY={handleSelectFY}
            />
          )}

          {/* Admin Protected Tab: Financial Years */}
          {activeTab === 'financial-years' && (
            currentUser.role === 'admin' ? (
              <FinancialYears
                financialYears={financialYears}
                selectedFY={selectedFY}
                onSelectFY={handleSelectFY}
                onAddFY={handleAddFinancialYear}
                monthlyWork={monthlyWork}
              />
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">403 - Access Denied</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Only administrators have permissions to modify financial year configurations.
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to My Dashboard</span>
                </button>
              </div>
            )
          )}

          {/* Admin Protected Tab: User & Staff Management */}
          {activeTab === 'users' && (
            currentUser.role === 'admin' ? (
              <UserManagement
                users={users}
                clients={clients}
                currentUser={currentUser}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onToggleStatus={handleToggleUserStatus}
                onDeleteUser={handleDeleteUser}
                onResetPassword={handleResetUserPassword}
              />
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">403 - Forbidden Access</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  User and staff account administration requires Administrator authorization.
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to My Dashboard</span>
                </button>
              </div>
            )
          )}

          {activeTab === 'activity-logs' && (
            <ActivityLogs
              logs={activityLogs}
              users={users}
              clients={clients}
              financialYears={financialYears}
              currentUser={currentUser}
            />
          )}

          {/* Admin Protected Tab: Settings */}
          {activeTab === 'settings' && (
            currentUser.role === 'admin' ? (
              <SettingsModal
                settings={settings}
                onUpdateSettings={(newSet) => {
                  GSTStorage.saveSettings(newSet);
                  setSettings(newSet);
                  showToast('Settings saved and synchronized with Supabase!');
                }}
                financialYears={financialYears}
                onResetDatabase={handleResetDatabase}
                clients={clients}
                monthlyWork={monthlyWork}
                bankAccounts={GSTStorage.getBankAccounts()}
                bankTurnover={GSTStorage.getBankTurnover()}
                gstTurnover={GSTStorage.getGstTurnover()}
                officeVisits={officeVisits}
                activityLogs={activityLogs}
                users={users}
              />
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">403 - Forbidden</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  System settings and database restore tools are restricted to administrators.
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to My Dashboard</span>
                </button>
              </div>
            )
          )}
        </main>
      </div>

      {/* Global Modals */}
      <ClientFormModal
        isOpen={isAddClientModalOpen}
        onClose={() => {
          setIsAddClientModalOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
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
        workHistory={workHistory}
        users={users}
        onOpenEdit={(client) => {
          setViewingClient(null);
          setEditingClient(client);
          setIsAddClientModalOpen(true);
        }}
        onNavigateToMonthlyWork={(gstin) => {
          setViewingClient(null);
          setMonthlyWorkSearch(gstin);
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

      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingClients={clients}
        onImportConfirmed={handleImportConfirmed}
      />
    </div>
  );
}
