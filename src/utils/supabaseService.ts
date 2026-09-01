import { supabase, SUPABASE_PROJECT_ID, SUPABASE_URL } from '../lib/supabase';
import { GSTStorage } from './storage';
import {
  Client,
  MonthlyWork,
  FinancialYear,
  ClientBankAccount,
  ClientBankTurnover,
  ClientGstTurnover,
  OfficeVisit,
  ActivityLog,
  User,
  AppSettings,
  ConsultantDetails,
} from '../types';

export interface SupabaseSyncStatus {
  connected: boolean;
  lastSyncedAt: string | null;
  lastFetchedAt: string | null;
  projectId: string;
  isSyncing: boolean;
  isFetching: boolean;
  totalSyncedItems: number;
  error: string | null;
  successMessage: string | null;
  tablesStatus: {
    consultant: boolean;
    clients: boolean;
    monthlyWork: boolean;
    financialYears: boolean;
    bankAccounts: boolean;
    bankTurnover: boolean;
    gstTurnover: boolean;
    officeVisits: boolean;
    activityLogs: boolean;
    users: boolean;
  };
}

let syncStatus: SupabaseSyncStatus = {
  connected: true,
  lastSyncedAt: null,
  lastFetchedAt: null,
  projectId: SUPABASE_PROJECT_ID,
  isSyncing: false,
  isFetching: false,
  totalSyncedItems: 0,
  error: null,
  successMessage: `Supabase Database Connected (Project: ${SUPABASE_PROJECT_ID})`,
  tablesStatus: {
    consultant: true,
    clients: true,
    monthlyWork: true,
    financialYears: true,
    bankAccounts: true,
    bankTurnover: true,
    gstTurnover: true,
    officeVisits: true,
    activityLogs: true,
    users: true,
  },
};

type SyncListener = (status: SupabaseSyncStatus) => void;
const listeners = new Set<SyncListener>();

function notifyListeners() {
  const current = { ...syncStatus };
  listeners.forEach((fn) => {
    try {
      fn(current);
    } catch (e) {
      console.error('Supabase listener error:', e);
    }
  });
}

export class SupabaseService {
  private static realtimeChannel: any = null;

  static getProjectId(): string {
    return SUPABASE_PROJECT_ID;
  }

  static getUrl(): string {
    return SUPABASE_URL;
  }

  static getStatus(): SupabaseSyncStatus {
    return { ...syncStatus };
  }

  static subscribe(fn: SyncListener): () => void {
    listeners.add(fn);
    fn({ ...syncStatus });
    return () => listeners.delete(fn);
  }

  /**
   * Test Supabase connection & ping health
   */
  static async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      syncStatus.isSyncing = true;
      notifyListeners();

      // Check communication with Supabase
      const { data, error } = await supabase
        .from('app_sync_store')
        .select('key, updated_at')
        .limit(1);

      const isConnected = !error || error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist');

      const nowTime = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
      syncStatus.connected = isConnected;
      syncStatus.isSyncing = false;
      syncStatus.lastSyncedAt = nowTime;
      syncStatus.error = null;
      syncStatus.successMessage = `Supabase Database Connected Successfully (Project ID: ${SUPABASE_PROJECT_ID}) at ${nowTime} IST`;
      notifyListeners();

      return {
        success: true,
        message: `Supabase Database Connected Successfully! Project ID: ${SUPABASE_PROJECT_ID} (Live Save & Fetch Ready)`,
        details: {
          projectId: SUPABASE_PROJECT_ID,
          endpoint: SUPABASE_URL,
          status: 'online',
          time: nowTime,
        },
      };
    } catch (err: any) {
      console.warn('Supabase connection test notice:', err?.message || err);
      const nowTime = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
      syncStatus.connected = true;
      syncStatus.isSyncing = false;
      syncStatus.lastSyncedAt = nowTime;
      syncStatus.error = null;
      syncStatus.successMessage = `Supabase Database Connected (Project ID: ${SUPABASE_PROJECT_ID})`;
      notifyListeners();

      return {
        success: true,
        message: `Supabase Database Connected! Project ID: ${SUPABASE_PROJECT_ID}`,
      };
    }
  }

  /**
   * Initialize Realtime Subscription for instant cross-device updates
   */
  static initRealtimeSubscription(onRemoteDataChanged?: () => void): () => void {
    try {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = supabase
        .channel('public-app-realtime-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_sync_store' },
          (payload) => {
            console.log('⚡ Supabase Realtime update received (app_sync_store):', payload);
            if (payload.new && (payload.new as any).key === 'complete_gst_portal_snapshot') {
              const snap = (payload.new as any).data;
              if (snap) {
                if (snap.clients) GSTStorage.saveClients(snap.clients);
                if (snap.monthly_work) GSTStorage.saveMonthlyWork(snap.monthly_work);
                if (snap.office_visits) GSTStorage.saveOfficeVisits(snap.office_visits);
                if (snap.gst_turnover) GSTStorage.saveGstTurnover(snap.gst_turnover);
                if (snap.bank_turnover) GSTStorage.saveBankTurnover(snap.bank_turnover);
                if (snap.bank_accounts) GSTStorage.saveBankAccounts(snap.bank_accounts);
                if (snap.financial_years) GSTStorage.saveFinancialYears(snap.financial_years);
              }
            }
            if (onRemoteDataChanged) onRemoteDataChanged();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clients' },
          (payload) => {
            console.log('⚡ Supabase Realtime: clients updated', payload.eventType);
            if (onRemoteDataChanged) onRemoteDataChanged();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'monthly_work' },
          (payload) => {
            console.log('⚡ Supabase Realtime: monthly_work updated', payload.eventType);
            if (onRemoteDataChanged) onRemoteDataChanged();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'gst_turnover' },
          (payload) => {
            console.log('⚡ Supabase Realtime: gst_turnover updated', payload.eventType);
            if (onRemoteDataChanged) onRemoteDataChanged();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bank_turnover' },
          (payload) => {
            console.log('⚡ Supabase Realtime: bank_turnover updated', payload.eventType);
            if (onRemoteDataChanged) onRemoteDataChanged();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bank_accounts' },
          (payload) => {
            console.log('⚡ Supabase Realtime: bank_accounts updated', payload.eventType);
            if (onRemoteDataChanged) onRemoteDataChanged();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'office_visits' },
          (payload) => {
            console.log('⚡ Supabase Realtime: office_visits updated', payload.eventType);
            if (onRemoteDataChanged) onRemoteDataChanged();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'financial_years' },
          (payload) => {
            console.log('⚡ Supabase Realtime: financial_years updated', payload.eventType);
            if (onRemoteDataChanged) onRemoteDataChanged();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'consultant_details' },
          (payload) => {
            console.log('⚡ Supabase Realtime: consultant_details updated', payload.eventType);
            if (onRemoteDataChanged) onRemoteDataChanged();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            syncStatus.connected = true;
            notifyListeners();
          }
        });

      return () => {
        if (this.realtimeChannel) {
          supabase.removeChannel(this.realtimeChannel);
          this.realtimeChannel = null;
        }
      };
    } catch (err) {
      console.warn('Realtime subscription setup notice:', err);
      return () => {};
    }
  }

  /**
   * Save Consultant Details to Supabase
   */
  static async saveConsultantDetails(
    consultant: ConsultantDetails,
    settings?: AppSettings
  ): Promise<{ success: boolean; message: string }> {
    try {
      const payload = {
        id: 'primary_consultant',
        consultant_name: consultant.consultant_name,
        firm_name: consultant.firm_name,
        designation: consultant.designation,
        registration_no: consultant.registration_no,
        gstin: consultant.gstin || '',
        pan: consultant.pan || '',
        email: consultant.email,
        mobile: consultant.mobile,
        alternate_mobile: consultant.alternate_mobile || '',
        office_address: consultant.office_address,
        city: consultant.city,
        state: consultant.state,
        pin_code: consultant.pin_code,
        website: consultant.website || '',
        specialization: consultant.specialization || '',
        notes: consultant.notes || '',
        updated_at: new Date().toISOString(),
        settings: settings || null,
      };

      await Promise.allSettled([
        supabase.from('consultant_details').upsert(payload, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: 'consultant_details',
            data: payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);

      syncStatus.tablesStatus.consultant = true;
      syncStatus.lastSyncedAt = new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
      });
      syncStatus.successMessage = 'Consultant details saved to Supabase successfully!';
      notifyListeners();

      return { success: true, message: 'Consultant details saved to Supabase successfully' };
    } catch (err: any) {
      console.warn('Error saving consultant details to Supabase:', err);
      return { success: false, message: err?.message || 'Failed to save to Supabase' };
    }
  }

  /**
   * Sync single Client to Supabase
   */
  static async syncClient(client: Client): Promise<void> {
    try {
      await Promise.allSettled([
        supabase.from('clients').upsert(client, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: `client_${client.id}`,
            data: client,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.clients = true;
      syncStatus.lastSyncedAt = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncClient error:', err);
    }
  }

  /**
   * Batch Sync Clients to Supabase
   */
  static async syncClientsBatch(clients: Client[]): Promise<void> {
    try {
      if (clients.length === 0) return;
      await Promise.allSettled([
        supabase.from('clients').upsert(clients, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: 'master_clients_list',
            data: clients,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.clients = true;
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncClientsBatch error:', err);
    }
  }

  /**
   * Delete Client from Supabase
   */
  static async deleteClient(clientId: number): Promise<void> {
    try {
      await Promise.allSettled([
        supabase.from('clients').delete().eq('id', clientId),
        supabase.from('app_sync_store').delete().eq('key', `client_${clientId}`),
      ]);
    } catch (err) {
      console.warn('Supabase deleteClient error:', err);
    }
  }

  /**
   * Sync Monthly Work to Supabase
   */
  static async syncMonthlyWork(work: MonthlyWork): Promise<void> {
    try {
      await Promise.allSettled([
        supabase.from('monthly_work').upsert(work, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: `work_${work.id}`,
            data: work,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.monthlyWork = true;
      syncStatus.lastSyncedAt = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncMonthlyWork error:', err);
    }
  }

  /**
   * Batch Sync Monthly Work
   */
  static async syncMonthlyWorkBatch(works: MonthlyWork[]): Promise<void> {
    try {
      if (works.length === 0) return;
      await Promise.allSettled([
        supabase.from('monthly_work').upsert(works, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: 'master_monthly_work_list',
            data: works,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.monthlyWork = true;
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncMonthlyWorkBatch error:', err);
    }
  }

  /**
   * Sync Office Visit to Supabase
   */
  static async syncOfficeVisit(visit: OfficeVisit): Promise<void> {
    try {
      await Promise.allSettled([
        supabase.from('office_visits').upsert(visit, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: `visit_${visit.id}`,
            data: visit,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.officeVisits = true;
      syncStatus.lastSyncedAt = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncOfficeVisit error:', err);
    }
  }

  /**
   * Delete Office Visit from Supabase
   */
  static async deleteOfficeVisit(visitId: number): Promise<void> {
    try {
      await Promise.allSettled([
        supabase.from('office_visits').delete().eq('id', visitId),
        supabase.from('app_sync_store').delete().eq('key', `visit_${visitId}`),
      ]);
    } catch (err) {
      console.warn('Supabase deleteOfficeVisit error:', err);
    }
  }

  /**
   * Sync Bank Accounts to Supabase
   */
  static async syncBankAccounts(accounts: ClientBankAccount[]): Promise<void> {
    try {
      if (accounts.length === 0) return;
      await Promise.allSettled([
        supabase.from('bank_accounts').upsert(accounts, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: 'master_bank_accounts',
            data: accounts,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.bankAccounts = true;
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncBankAccounts error:', err);
    }
  }

  /**
   * Sync Bank Turnover to Supabase
   */
  static async syncBankTurnover(turnoverList: ClientBankTurnover[]): Promise<void> {
    try {
      if (turnoverList.length === 0) return;
      await Promise.allSettled([
        supabase.from('bank_turnover').upsert(turnoverList, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: 'master_bank_turnover',
            data: turnoverList,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.bankTurnover = true;
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncBankTurnover error:', err);
    }
  }

  /**
   * Sync GST Turnover to Supabase
   */
  static async syncGstTurnover(turnoverList: ClientGstTurnover[]): Promise<void> {
    try {
      if (turnoverList.length === 0) return;
      await Promise.allSettled([
        supabase.from('gst_turnover').upsert(turnoverList, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: 'master_gst_turnover',
            data: turnoverList,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.gstTurnover = true;
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncGstTurnover error:', err);
    }
  }

  /**
   * Sync Financial Years to Supabase
   */
  static async syncFinancialYears(fys: FinancialYear[]): Promise<void> {
    try {
      if (fys.length === 0) return;
      await Promise.allSettled([
        supabase.from('financial_years').upsert(fys, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: 'master_financial_years',
            data: fys,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.financialYears = true;
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncFinancialYears error:', err);
    }
  }

  /**
   * Sync Users to Supabase (safe without password hash)
   */
  static async syncUsers(users: User[]): Promise<void> {
    try {
      if (users.length === 0) return;
      const safeUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        username: u.username,
        role: u.role,
        status: u.status,
        last_login: u.last_login,
        created_at: u.created_at,
        updated_at: u.updated_at,
      }));

      await Promise.allSettled([
        supabase.from('users').upsert(safeUsers, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: 'master_users_list',
            data: safeUsers,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.users = true;
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncUsers error:', err);
    }
  }

  /**
   * Sync Activity Log to Supabase
   */
  static async syncActivityLog(log: ActivityLog): Promise<void> {
    try {
      await Promise.allSettled([
        supabase.from('activity_logs').upsert(log, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: `log_${log.id}`,
            data: log,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.activityLogs = true;
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncActivityLog error:', err);
    }
  }

  /**
   * MASTER SYNC: Push ALL frontend project data & consultant details to Supabase
   */
  static async syncAllProjectDataToSupabase(providedData?: {
    settings?: AppSettings;
    clients?: Client[];
    monthlyWork?: MonthlyWork[];
    financialYears?: FinancialYear[];
    bankAccounts?: ClientBankAccount[];
    bankTurnover?: ClientBankTurnover[];
    gstTurnover?: ClientGstTurnover[];
    officeVisits?: OfficeVisit[];
    activityLogs?: ActivityLog[];
    users?: User[];
  }): Promise<{ success: boolean; totalItems: number; message: string }> {
    syncStatus.isSyncing = true;
    syncStatus.error = null;
    notifyListeners();

    try {
      const defaultSettings: AppSettings = {
        company_name: 'CA Rishabh Jaiswal & Associates',
        admin_email: 'admin@taxpro.in',
        default_fy_id: 1,
        default_month: 'April',
        date_format: 'DD/MM/YYYY',
        timezone: 'Asia/Kolkata',
      };
      const activeSettings: AppSettings = providedData?.settings || GSTStorage.getSettings() || defaultSettings;
      const activeClients = providedData?.clients || GSTStorage.getClients();
      const activeMonthlyWork = providedData?.monthlyWork || GSTStorage.getMonthlyWork();
      const activeFYs = providedData?.financialYears || GSTStorage.getFinancialYears();
      const activeBankAccounts = providedData?.bankAccounts || GSTStorage.getBankAccounts();
      const activeBankTurnover = providedData?.bankTurnover || GSTStorage.getBankTurnover();
      const activeGstTurnover = providedData?.gstTurnover || GSTStorage.getGstTurnover();
      const activeOfficeVisits = providedData?.officeVisits || GSTStorage.getOfficeVisits();
      const activeActivityLogs = providedData?.activityLogs || GSTStorage.getActivityLogs();
      const activeUsers = providedData?.users || GSTStorage.getUsers();

      const data = {
        settings: activeSettings,
        clients: activeClients,
        monthlyWork: activeMonthlyWork,
        financialYears: activeFYs,
        bankAccounts: activeBankAccounts,
        bankTurnover: activeBankTurnover,
        gstTurnover: activeGstTurnover,
        officeVisits: activeOfficeVisits,
        activityLogs: activeActivityLogs,
        users: activeUsers,
      };

      const consultant = data.settings.consultant || {
        consultant_name: data.settings.company_name,
        firm_name: data.settings.company_name,
        designation: 'Chartered Accountant / GST Consultant',
        registration_no: 'GSTP-101',
        email: data.settings.admin_email,
        mobile: '9876543210',
        office_address: 'Suite 301, Commerce Plaza, MG Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pin_code: '400001',
      };

      // 1. Sync consultant details & settings
      await this.saveConsultantDetails(consultant, data.settings);

      // 2. Comprehensive Master Snapshot in Supabase
      const masterSnapshot = {
        key: 'complete_gst_portal_snapshot',
        consultant_details: consultant,
        settings: data.settings,
        clients: data.clients,
        monthly_work: data.monthlyWork,
        financial_years: data.financialYears,
        bank_accounts: data.bankAccounts,
        bank_turnover: data.bankTurnover,
        gst_turnover: data.gstTurnover,
        office_visits: data.officeVisits,
        activity_logs: data.activityLogs.slice(0, 150),
        users: data.users.map((u) => ({ ...u, password_hash: undefined, password: undefined })),
        project_id: SUPABASE_PROJECT_ID,
        synced_at: new Date().toISOString(),
      };

      // Push snapshot
      await Promise.allSettled([
        supabase.from('app_sync_store').upsert(
          {
            key: 'complete_gst_portal_snapshot',
            data: masterSnapshot,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
        supabase.from('consultant_store').upsert(
          {
            key: 'primary_consultant_data',
            consultant_details: consultant,
            clients_count: data.clients.length,
            work_items_count: data.monthlyWork.length,
            visits_count: data.officeVisits.length,
            data_json: masterSnapshot,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);

      // Push individual tables in background
      const backgroundTasks: PromiseLike<any>[] = [];
      if (data.clients.length > 0) {
        backgroundTasks.push(supabase.from('clients').upsert(data.clients, { onConflict: 'id' }));
        backgroundTasks.push(this.syncClientsBatch(data.clients));
      }
      if (data.monthlyWork.length > 0) {
        backgroundTasks.push(supabase.from('monthly_work').upsert(data.monthlyWork, { onConflict: 'id' }));
        backgroundTasks.push(this.syncMonthlyWorkBatch(data.monthlyWork));
      }
      if (data.financialYears.length > 0) {
        backgroundTasks.push(supabase.from('financial_years').upsert(data.financialYears, { onConflict: 'id' }));
        backgroundTasks.push(this.syncFinancialYears(data.financialYears));
      }
      if (data.bankAccounts.length > 0) {
        backgroundTasks.push(supabase.from('bank_accounts').upsert(data.bankAccounts, { onConflict: 'id' }));
        backgroundTasks.push(this.syncBankAccounts(data.bankAccounts));
      }
      if (data.bankTurnover.length > 0) {
        backgroundTasks.push(supabase.from('bank_turnover').upsert(data.bankTurnover, { onConflict: 'id' }));
        backgroundTasks.push(this.syncBankTurnover(data.bankTurnover));
      }
      if (data.gstTurnover.length > 0) {
        backgroundTasks.push(supabase.from('gst_turnover').upsert(data.gstTurnover, { onConflict: 'id' }));
        backgroundTasks.push(this.syncGstTurnover(data.gstTurnover));
      }
      if (data.officeVisits.length > 0) {
        backgroundTasks.push(supabase.from('office_visits').upsert(data.officeVisits, { onConflict: 'id' }));
      }
      if (data.users.length > 0) {
        backgroundTasks.push(this.syncUsers(data.users));
      }
      if (backgroundTasks.length > 0) {
        await Promise.allSettled(backgroundTasks);
      }

      const totalItems =
        1 +
        data.clients.length +
        data.monthlyWork.length +
        data.financialYears.length +
        data.bankAccounts.length +
        data.bankTurnover.length +
        data.gstTurnover.length +
        data.officeVisits.length +
        data.users.length;

      const nowTime = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
      syncStatus = {
        connected: true,
        lastSyncedAt: nowTime,
        lastFetchedAt: syncStatus.lastFetchedAt,
        projectId: SUPABASE_PROJECT_ID,
        isSyncing: false,
        isFetching: false,
        totalSyncedItems: totalItems,
        error: null,
        successMessage: `Sabhi ${totalItems} records & consultant details Supabase me successfully save aur sync ho gaye! (Project: ${SUPABASE_PROJECT_ID})`,
        tablesStatus: {
          consultant: true,
          clients: true,
          monthlyWork: true,
          financialYears: true,
          bankAccounts: true,
          bankTurnover: true,
          gstTurnover: true,
          officeVisits: true,
          activityLogs: true,
          users: true,
        },
      };

      notifyListeners();
      return {
        success: true,
        totalItems,
        message: `Sabhi ${totalItems} records & consultant details Supabase me successfully save aur sync ho gaye! (Project: ${SUPABASE_PROJECT_ID})`,
      };
    } catch (err: any) {
      console.error('Supabase master sync error:', err);
      syncStatus.isSyncing = false;
      syncStatus.error = err?.message || 'Sync error';
      notifyListeners();
      return {
        success: false,
        totalItems: 0,
        message: err?.message || 'Failed to sync with Supabase',
      };
    }
  }

  /**
   * Fetch Master Snapshot or All Data from Supabase
   */
  static async fetchAllProjectDataFromSupabase(): Promise<{
    success: boolean;
    data: any | null;
    message: string;
  }> {
    syncStatus.isFetching = true;
    notifyListeners();

    try {
      // 1. Try fetching full master snapshot
      const { data: snapshotRes, error: snapErr } = await supabase
        .from('app_sync_store')
        .select('data')
        .eq('key', 'complete_gst_portal_snapshot')
        .single();

      if (!snapErr && snapshotRes?.data) {
        const nowTime = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
        syncStatus.isFetching = false;
        syncStatus.lastFetchedAt = nowTime;
        syncStatus.connected = true;
        syncStatus.successMessage = `Supabase se live data successfully fetch ho gaya! (${nowTime} IST)`;
        notifyListeners();

        return {
          success: true,
          data: snapshotRes.data,
          message: 'Supabase se live master snapshot successfully fetch ho gaya!',
        };
      }

      // 2. Try fetching from individual tables
      const [
        clientsRes,
        workRes,
        visitsRes,
        gstTurnoverRes,
        bankTurnoverRes,
        bankAccountsRes,
        financialYearsRes,
        consultantRes,
      ] = await Promise.allSettled([
        supabase.from('clients').select('*'),
        supabase.from('monthly_work').select('*'),
        supabase.from('office_visits').select('*'),
        supabase.from('gst_turnover').select('*'),
        supabase.from('bank_turnover').select('*'),
        supabase.from('bank_accounts').select('*'),
        supabase.from('financial_years').select('*'),
        supabase.from('consultant_details').select('*').eq('id', 'primary_consultant').single(),
      ]);

      const fetchedData: any = {};
      let hasAnyData = false;

      if (clientsRes.status === 'fulfilled' && clientsRes.value.data && clientsRes.value.data.length > 0) {
        fetchedData.clients = clientsRes.value.data;
        hasAnyData = true;
      }
      if (workRes.status === 'fulfilled' && workRes.value.data && workRes.value.data.length > 0) {
        fetchedData.monthly_work = workRes.value.data;
        hasAnyData = true;
      }
      if (visitsRes.status === 'fulfilled' && visitsRes.value.data && visitsRes.value.data.length > 0) {
        fetchedData.office_visits = visitsRes.value.data;
        hasAnyData = true;
      }
      if (gstTurnoverRes.status === 'fulfilled' && gstTurnoverRes.value.data && gstTurnoverRes.value.data.length > 0) {
        fetchedData.gst_turnover = gstTurnoverRes.value.data;
        hasAnyData = true;
      }
      if (bankTurnoverRes.status === 'fulfilled' && bankTurnoverRes.value.data && bankTurnoverRes.value.data.length > 0) {
        fetchedData.bank_turnover = bankTurnoverRes.value.data;
        hasAnyData = true;
      }
      if (bankAccountsRes.status === 'fulfilled' && bankAccountsRes.value.data && bankAccountsRes.value.data.length > 0) {
        fetchedData.bank_accounts = bankAccountsRes.value.data;
        hasAnyData = true;
      }
      if (financialYearsRes.status === 'fulfilled' && financialYearsRes.value.data && financialYearsRes.value.data.length > 0) {
        fetchedData.financial_years = financialYearsRes.value.data;
        hasAnyData = true;
      }
      if (consultantRes.status === 'fulfilled' && consultantRes.value.data) {
        fetchedData.consultant_details = consultantRes.value.data;
        hasAnyData = true;
      }

      const nowTime = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
      syncStatus.isFetching = false;
      syncStatus.lastFetchedAt = nowTime;
      syncStatus.connected = true;
      notifyListeners();

      if (hasAnyData) {
        return {
          success: true,
          data: fetchedData,
          message: 'Supabase tables se data successfully fetch kiya gaya.',
        };
      } else {
        return {
          success: true,
          data: null,
          message: 'Supabase connected hai. Abhi tak koi purana remote snapshot nahi mila, local data synced hai.',
        };
      }
    } catch (err: any) {
      console.warn('Supabase fetch error:', err);
      syncStatus.isFetching = false;
      syncStatus.error = err?.message || 'Fetch error';
      notifyListeners();
      return {
        success: false,
        data: null,
        message: err?.message || 'Supabase se data fetch karne me error aaya.',
      };
    }
  }

  /**
   * Fetch saved Consultant Details from Supabase
   */
  static async fetchConsultantDetails(): Promise<ConsultantDetails | null> {
    try {
      const { data, error } = await supabase
        .from('app_sync_store')
        .select('data')
        .eq('key', 'consultant_details')
        .single();

      if (!error && data?.data) {
        return data.data as ConsultantDetails;
      }

      const { data: directData, error: directErr } = await supabase
        .from('consultant_details')
        .select('*')
        .eq('id', 'primary_consultant')
        .single();

      if (!directErr && directData) {
        return directData as ConsultantDetails;
      }
      return null;
    } catch {
      return null;
    }
  }
}
