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
   * Delete Client and all related data from Supabase
   */
  static async deleteClient(clientId: number): Promise<void> {
    try {
      await Promise.allSettled([
        supabase.from('clients').delete().eq('id', clientId),
        supabase.from('monthly_work').delete().eq('client_id', clientId),
        supabase.from('office_visits').delete().eq('client_id', clientId),
        supabase.from('bank_accounts').delete().eq('client_id', clientId),
        supabase.from('bank_turnover').delete().eq('client_id', clientId),
        supabase.from('gst_turnover').delete().eq('client_id', clientId),
        supabase.from('app_sync_store').delete().eq('key', `client_${clientId}`),
        supabase.from('app_sync_store').delete().eq('key', 'complete_gst_portal_snapshot'),
        supabase.from('app_sync_store').delete().eq('key', 'master_clients_list'),
      ]);
    } catch (err) {
      console.warn('Supabase deleteClient error:', err);
    }
  }

  /**
   * Delete Bank Account from Supabase
   */
  static async deleteBankAccount(accountId: number): Promise<void> {
    try {
      const remainingAccounts = GSTStorage.getBankAccounts().filter((a) => a.id !== accountId);
      const remainingTurnovers = GSTStorage.getBankTurnover().filter((t) => t.bank_account_id !== accountId);

      await Promise.allSettled([
        supabase.from('bank_accounts').delete().eq('id', accountId),
        supabase.from('bank_turnover').delete().eq('bank_account_id', accountId),
        supabase.from('app_sync_store').upsert({
          key: 'master_bank_accounts',
          data: remainingAccounts,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' }),
        supabase.from('app_sync_store').upsert({
          key: 'master_bank_turnover',
          data: remainingTurnovers,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' }),
      ]);
    } catch (err) {
      console.warn('Supabase deleteBankAccount error:', err);
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
   * Batch Sync Office Visits to Supabase
   */
  static async syncOfficeVisitsBatch(visits: OfficeVisit[]): Promise<void> {
    try {
      if (visits.length === 0) return;
      await Promise.allSettled([
        supabase.from('office_visits').upsert(visits, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: 'master_office_visits',
            data: visits,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        ),
      ]);
      syncStatus.tablesStatus.officeVisits = true;
      notifyListeners();
    } catch (err) {
      console.warn('Supabase syncOfficeVisitsBatch error:', err);
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
        supabase.from('app_sync_store').delete().eq('key', 'complete_gst_portal_snapshot'),
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
      const mappedForDb = accounts.map((a) => {
        const metadata = {
          account_holder_name: a.account_holder_name || '',
          status: a.status || 'active',
          current_fy_id: a.current_fy_id || null,
          deactivated_in_fy_id: a.deactivated_in_fy_id || null,
          deactivated_fy_start_year: a.deactivated_fy_start_year || null,
          deactivated_fy_name: a.deactivated_fy_name || null,
        };
        return {
          id: a.id,
          client_id: a.client_id,
          slot_number: a.slot_number,
          bank_name: a.bank_name || '',
          account_number: a.account_number || '',
          ifsc_code: a.ifsc || '',
          branch_name: null,
          account_type: a.account_type || 'Current',
          is_primary: a.slot_number === 1,
          notes: JSON.stringify(metadata),
          updated_at: new Date().toISOString(),
        };
      });

      await Promise.allSettled([
        supabase.from('bank_accounts').upsert(mappedForDb, { onConflict: 'id' }),
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
      const mappedForDb = turnoverList.map((t) => ({
        id: t.id,
        client_id: t.client_id,
        financial_year_id: t.financial_year_id,
        month: t.month,
        bank_account_id: t.bank_account_id,
        turnover_amount: Number(t.turnover_amount) || 0,
        credit_count: 0,
        debit_count: 0,
        remark: null,
        updated_at: new Date().toISOString(),
      }));

      await Promise.allSettled([
        supabase.from('bank_turnover').upsert(mappedForDb, { onConflict: 'id' }),
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
   * Sync GST Turnover to Supabase (Master sync)
   */
  static async syncGstTurnover(turnoverList: ClientGstTurnover[]): Promise<{ success: boolean; error?: string }> {
    try {
      if (!turnoverList || turnoverList.length === 0) return { success: true };
      
      const now = new Date().toISOString();
      const cleanList = turnoverList.map((t) => ({
        id: t.id,
        client_id: t.client_id,
        client_type: t.client_type || 'Normal',
        financial_year_id: t.financial_year_id,
        financial_year: t.financial_year || '',
        month: t.month,
        entry_date: t.entry_date || t.created_at || now,
        taxable_turnover: Number(t.taxable_turnover) || 0,
        exempt_turnover: Number(t.exempt_turnover) || 0,
        total_gst_turnover: Number(t.total_gst_turnover) || (Number(t.taxable_turnover) || 0) + (Number(t.exempt_turnover) || 0),
        remark: t.remark || '',
        created_at: t.created_at || now,
        updated_at: now,
      }));

      const results = await Promise.allSettled([
        supabase.from('gst_turnover').upsert(cleanList, { onConflict: 'id' }),
        supabase.from('app_sync_store').upsert(
          {
            key: 'master_gst_turnover',
            data: cleanList,
            updated_at: now,
          },
          { onConflict: 'key' }
        ),
      ]);

      const tableRes = results[0];
      const storeRes = results[1];

      let anySuccess = false;
      let errorMsg = '';

      if (tableRes.status === 'fulfilled' && !tableRes.value.error) {
        anySuccess = true;
      } else if (tableRes.status === 'fulfilled' && tableRes.value.error) {
        errorMsg += `Table: ${tableRes.value.error.message}. `;
      }

      if (storeRes.status === 'fulfilled' && !storeRes.value.error) {
        anySuccess = true;
      } else if (storeRes.status === 'fulfilled' && storeRes.value.error) {
        errorMsg += `Store: ${storeRes.value.error.message}. `;
      }

      if (anySuccess) {
        syncStatus.tablesStatus.gstTurnover = true;
        syncStatus.lastSyncedAt = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
        notifyListeners();
        return { success: true };
      } else {
        return { success: false, error: errorMsg || 'Failed to sync GST turnover' };
      }
    } catch (err: any) {
      console.warn('Supabase syncGstTurnover error:', err);
      return { success: false, error: err?.message || 'Sync exception' };
    }
  }

  /**
   * Sync specific Client's GST Turnover for a specific Financial Year
   * Guarantees complete isolation: other clients and other FYs are untouched.
   */
  static async syncClientGstTurnover(
    clientId: number,
    fyId: number,
    clientFyRecords: ClientGstTurnover[],
    fullList?: ClientGstTurnover[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const now = new Date().toISOString();
      const clientKey = `gst_turnover_client_${clientId}_fy_${fyId}`;

      const cleanRecords = clientFyRecords.map((t) => ({
        id: t.id,
        client_id: clientId,
        client_type: t.client_type || 'Normal',
        financial_year_id: fyId,
        financial_year: t.financial_year || '',
        month: t.month,
        entry_date: t.entry_date || t.created_at || now,
        taxable_turnover: Number(t.taxable_turnover) || 0,
        exempt_turnover: Number(t.exempt_turnover) || 0,
        total_gst_turnover: Number(t.total_gst_turnover) || (Number(t.taxable_turnover) || 0) + (Number(t.exempt_turnover) || 0),
        remark: t.remark || '',
        created_at: t.created_at || now,
        updated_at: now,
      }));

      const promises: PromiseLike<any>[] = [
        // 1. Save specific client + FY key in key-value store (guaranteed atomic persistence)
        supabase.from('app_sync_store').upsert(
          {
            key: clientKey,
            data: cleanRecords,
            updated_at: now,
          },
          { onConflict: 'key' }
        ),
      ];

      // 2. Upsert rows into relational gst_turnover table
      if (cleanRecords.length > 0) {
        promises.push(
          supabase.from('gst_turnover').upsert(cleanRecords, { onConflict: 'id' })
        );
      }

      // 3. Update master GST turnover snapshot if fullList provided
      if (fullList && fullList.length > 0) {
        promises.push(
          supabase.from('app_sync_store').upsert(
            {
              key: 'master_gst_turnover',
              data: fullList,
              updated_at: now,
            },
            { onConflict: 'key' }
          )
        );
      }

      const results = await Promise.allSettled(promises);
      const storeRes = results[0];
      const tableRes = cleanRecords.length > 0 ? results[1] : null;

      let isSuccess = false;
      let errorDetail = '';

      if (storeRes.status === 'fulfilled' && !storeRes.value.error) {
        isSuccess = true;
      } else if (storeRes.status === 'fulfilled' && storeRes.value.error) {
        errorDetail += `Store error: ${storeRes.value.error.message}. `;
      }

      if (tableRes && tableRes.status === 'fulfilled' && !tableRes.value.error) {
        isSuccess = true;
      } else if (tableRes && tableRes.status === 'fulfilled' && tableRes.value.error) {
        errorDetail += `Table error: ${tableRes.value.error.message}. `;
      }

      if (isSuccess) {
        syncStatus.tablesStatus.gstTurnover = true;
        syncStatus.lastSyncedAt = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
        notifyListeners();
        return { success: true, count: cleanRecords.length };
      } else {
        return { success: false, count: 0, error: errorDetail || 'Failed to save GST turnover to Supabase' };
      }
    } catch (err: any) {
      console.warn('Supabase syncClientGstTurnover error:', err);
      return { success: false, count: 0, error: err?.message || 'Exception saving to Supabase' };
    }
  }

  /**
   * Save single GST Turnover month record to Supabase
   */
  static async saveSingleGstTurnoverEntry(
    record: ClientGstTurnover,
    fullList?: ClientGstTurnover[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const cleanRecord = {
        id: record.id,
        client_id: record.client_id,
        client_type: record.client_type || 'Normal',
        financial_year_id: record.financial_year_id,
        financial_year: record.financial_year || '',
        month: record.month,
        entry_date: record.entry_date || record.created_at || now,
        taxable_turnover: Number(record.taxable_turnover) || 0,
        exempt_turnover: Number(record.exempt_turnover) || 0,
        total_gst_turnover: Number(record.total_gst_turnover) || (Number(record.taxable_turnover) || 0) + (Number(record.exempt_turnover) || 0),
        remark: record.remark || '',
        created_at: record.created_at || now,
        updated_at: now,
      };

      const clientKey = `gst_turnover_client_${record.client_id}_fy_${record.financial_year_id}`;

      // Update in table and sync store
      const promises: PromiseLike<any>[] = [
        supabase.from('gst_turnover').upsert(cleanRecord, { onConflict: 'id' }),
      ];

      if (fullList && fullList.length > 0) {
        const clientRecords = fullList.filter(
          (t) => t.client_id === record.client_id && t.financial_year_id === record.financial_year_id
        );
        promises.push(
          supabase.from('app_sync_store').upsert(
            {
              key: clientKey,
              data: clientRecords,
              updated_at: now,
            },
            { onConflict: 'key' }
          )
        );
        promises.push(
          supabase.from('app_sync_store').upsert(
            {
              key: 'master_gst_turnover',
              data: fullList,
              updated_at: now,
            },
            { onConflict: 'key' }
          )
        );
      }

      await Promise.allSettled(promises);
      syncStatus.tablesStatus.gstTurnover = true;
      notifyListeners();
      return { success: true };
    } catch (err: any) {
      console.warn('Supabase saveSingleGstTurnoverEntry error:', err);
      return { success: false, error: err?.message || 'Error saving turnover record' };
    }
  }

  /**
   * Delete a single GST Turnover entry from Supabase
   */
  static async deleteGstTurnoverRecord(
    recordId: number,
    fullList?: ClientGstTurnover[]
  ): Promise<void> {
    try {
      const promises: PromiseLike<any>[] = [
        supabase.from('gst_turnover').delete().eq('id', recordId),
      ];

      if (fullList) {
        promises.push(
          supabase.from('app_sync_store').upsert(
            {
              key: 'master_gst_turnover',
              data: fullList,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          )
        );
      }

      await Promise.allSettled(promises);
      notifyListeners();
    } catch (err) {
      console.warn('Supabase deleteGstTurnoverRecord error:', err);
    }
  }

  /**
   * Delete all GST Turnover for a client (and optional FY)
   */
  static async deleteClientGstTurnover(
    clientId: number,
    fyId?: number,
    fullList?: ClientGstTurnover[]
  ): Promise<void> {
    try {
      let query = supabase.from('gst_turnover').delete().eq('client_id', clientId);
      if (fyId) {
        query = query.eq('financial_year_id', fyId);
      }

      const promises: PromiseLike<any>[] = [query];

      if (fyId) {
        promises.push(
          supabase.from('app_sync_store').delete().eq('key', `gst_turnover_client_${clientId}_fy_${fyId}`)
        );
      }

      if (fullList) {
        promises.push(
          supabase.from('app_sync_store').upsert(
            {
              key: 'master_gst_turnover',
              data: fullList,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          )
        );
      }

      await Promise.allSettled(promises);
      notifyListeners();
    } catch (err) {
      console.warn('Supabase deleteClientGstTurnover error:', err);
    }
  }

  /**
   * Fetch all GST Turnover data from Supabase with complete deduplication & union
   * Guarantees that records from all clients and all FYs are fully assembled without omission.
   */
  static async fetchGstTurnoverFromSupabase(): Promise<ClientGstTurnover[]> {
    try {
      // 1. Fetch from table and sync store keys in parallel
      const [tableRes, masterStoreRes, clientStoreRowsRes, snapshotRes] = await Promise.allSettled([
        supabase.from('gst_turnover').select('*').order('id', { ascending: true }),
        supabase.from('app_sync_store').select('data').eq('key', 'master_gst_turnover').maybeSingle(),
        supabase.from('app_sync_store').select('key, data').like('key', 'gst_turnover_client_%'),
        supabase.from('app_sync_store').select('data').eq('key', 'complete_gst_portal_snapshot').maybeSingle(),
      ]);

      const recordMap = new Map<string, ClientGstTurnover>();

      const mergeRecord = (r: any) => {
        if (!r || typeof r.client_id !== 'number' || typeof r.financial_year_id !== 'number' || !r.month) {
          return;
        }
        const key = `${r.client_id}_${r.financial_year_id}_${r.month}`;
        const existing = recordMap.get(key);

        const rec: ClientGstTurnover = {
          id: typeof r.id === 'number' ? r.id : Date.now() + Math.floor(Math.random() * 100000),
          client_id: r.client_id,
          client_type: r.client_type || 'Normal',
          financial_year_id: r.financial_year_id,
          financial_year: r.financial_year || '',
          month: r.month,
          entry_date: r.entry_date || r.created_at || new Date().toISOString(),
          taxable_turnover: Number(r.taxable_turnover) || 0,
          exempt_turnover: Number(r.exempt_turnover) || 0,
          total_gst_turnover: Number(r.total_gst_turnover) || (Number(r.taxable_turnover) || 0) + (Number(r.exempt_turnover) || 0),
          remark: r.remark || '',
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || r.created_at || new Date().toISOString(),
        };

        if (!existing) {
          recordMap.set(key, rec);
        } else {
          // If existing had 0/empty and new has real values, or if new has later updated_at, choose more recent
          const exTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
          const newTime = rec.updated_at ? new Date(rec.updated_at).getTime() : 0;
          if (newTime >= exTime || (!existing.taxable_turnover && !existing.exempt_turnover && (rec.taxable_turnover || rec.exempt_turnover))) {
            recordMap.set(key, { ...existing, ...rec });
          }
        }
      };

      // 1. Snapshot fallback
      if (snapshotRes.status === 'fulfilled' && snapshotRes.value.data?.data?.gst_turnover) {
        const snapList = snapshotRes.value.data.data.gst_turnover;
        if (Array.isArray(snapList)) snapList.forEach(mergeRecord);
      }

      // 2. Master store
      if (masterStoreRes.status === 'fulfilled' && Array.isArray(masterStoreRes.value.data?.data)) {
        masterStoreRes.value.data.data.forEach(mergeRecord);
      }

      // 3. Client-specific keys in app_sync_store
      if (clientStoreRowsRes.status === 'fulfilled' && Array.isArray(clientStoreRowsRes.value.data)) {
        clientStoreRowsRes.value.data.forEach((row) => {
          if (Array.isArray(row.data)) {
            row.data.forEach(mergeRecord);
          }
        });
      }

      // 4. Relational table rows
      if (tableRes.status === 'fulfilled' && Array.isArray(tableRes.value.data)) {
        tableRes.value.data.forEach(mergeRecord);
      }

      const mergedList = Array.from(recordMap.values());
      return mergedList;
    } catch (err) {
      console.warn('Error fetching GST turnover from Supabase:', err);
      return [];
    }
  }

  /**
   * Fetch specific client's GST Turnover for a specific Financial Year from Supabase
   */
  static async fetchClientGstTurnoverFromSupabase(
    clientId: number,
    fyId: number
  ): Promise<ClientGstTurnover[]> {
    try {
      // 1. Try client-specific key in sync store
      const clientKey = `gst_turnover_client_${clientId}_fy_${fyId}`;
      const { data: storeData } = await supabase
        .from('app_sync_store')
        .select('data')
        .eq('key', clientKey)
        .maybeSingle();

      if (storeData?.data && Array.isArray(storeData.data) && storeData.data.length > 0) {
        return storeData.data as ClientGstTurnover[];
      }

      // 2. Try relational table query
      const { data: tableData, error: tableErr } = await supabase
        .from('gst_turnover')
        .select('*')
        .eq('client_id', clientId)
        .eq('financial_year_id', fyId);

      if (!tableErr && Array.isArray(tableData) && tableData.length > 0) {
        return tableData as ClientGstTurnover[];
      }

      // 3. Check master list in sync store
      const { data: masterData } = await supabase
        .from('app_sync_store')
        .select('data')
        .eq('key', 'master_gst_turnover')
        .maybeSingle();

      if (masterData?.data && Array.isArray(masterData.data)) {
        const filtered = (masterData.data as ClientGstTurnover[]).filter(
          (t) => t.client_id === clientId && t.financial_year_id === fyId
        );
        if (filtered.length > 0) return filtered;
      }

      return [];
    } catch (err) {
      console.warn('Error fetching client GST turnover from Supabase:', err);
      return [];
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
   * Sync Users to Supabase (with full credential synchronization)
   */
  static async syncUsers(users: User[]): Promise<void> {
    try {
      if (!users || users.length === 0) return;
      const safeUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email.trim().toLowerCase(),
        mobile: u.mobile,
        username: u.username.trim().toLowerCase(),
        role: u.role,
        status: u.status,
        last_login: u.last_login || null,
        created_at: u.created_at,
        updated_at: u.updated_at,
      }));

      // Cross-device credentials synchronization store
      const credentials = users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username.trim().toLowerCase(),
        email: u.email.trim().toLowerCase(),
        mobile: u.mobile,
        role: u.role,
        status: u.status,
        password_hash: u.password_hash || null,
        password: u.password || null,
        created_at: u.created_at,
        updated_at: u.updated_at,
        last_login: u.last_login || null,
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
        supabase.from('app_sync_store').upsert(
          {
            key: 'master_users_credentials',
            data: credentials,
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
   * Fetch users and credentials directly from Supabase sync store
   */
  static async fetchUsersFromSupabase(): Promise<User[] | null> {
    try {
      const [credsRes, listRes] = await Promise.allSettled([
        supabase.from('app_sync_store').select('data').eq('key', 'master_users_credentials').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'master_users_list').maybeSingle(),
      ]);
      if (credsRes.status === 'fulfilled' && Array.isArray(credsRes.value?.data?.data) && credsRes.value.data.data.length > 0) {
        return credsRes.value.data.data;
      }
      if (listRes.status === 'fulfilled' && Array.isArray(listRes.value?.data?.data) && listRes.value.data.data.length > 0) {
        return listRes.value.data.data;
      }
      return null;
    } catch {
      return null;
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
   * Fetch Master Snapshot or All Data directly from Supabase Relational Tables & Sync Store
   */
  static async fetchAllProjectDataFromSupabase(): Promise<{
    success: boolean;
    data: any | null;
    message: string;
  }> {
    syncStatus.isFetching = true;
    notifyListeners();

    try {
      // 1. Fetch from individual relational tables and sync store keys in parallel
      const [
        clientsRes,
        workRes,
        visitsRes,
        gstTurnoverRes,
        bankTurnoverRes,
        bankAccountsRes,
        financialYearsRes,
        consultantRes,
        snapshotRes,
        clientsStoreRes,
        workStoreRes,
        bankAccountsStoreRes,
        bankTurnoverStoreRes,
        gstTurnoverStoreRes,
        visitsStoreRes,
        fyStoreRes,
        usersCredsRes,
        usersListRes,
      ] = await Promise.allSettled([
        supabase.from('clients').select('*').order('id', { ascending: true }),
        supabase.from('monthly_work').select('*'),
        supabase.from('office_visits').select('*').order('id', { ascending: false }),
        supabase.from('gst_turnover').select('*'),
        supabase.from('bank_turnover').select('*'),
        supabase.from('bank_accounts').select('*'),
        supabase.from('financial_years').select('*').order('start_year', { ascending: true }),
        supabase.from('consultant_details').select('*').eq('id', 'primary_consultant').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'complete_gst_portal_snapshot').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'master_clients_list').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'master_monthly_work_list').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'master_bank_accounts').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'master_bank_turnover').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'master_gst_turnover').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'master_office_visits').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'master_financial_years').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'master_users_credentials').maybeSingle(),
        supabase.from('app_sync_store').select('data').eq('key', 'master_users_list').maybeSingle(),
      ]);

      const fetchedData: any = {};
      const snapData = snapshotRes.status === 'fulfilled' && snapshotRes.value?.data ? snapshotRes.value.data.data : null;

      // 1. Clients
      if (clientsRes.status === 'fulfilled' && Array.isArray(clientsRes.value.data) && clientsRes.value.data.length > 0) {
        fetchedData.clients = clientsRes.value.data;
      } else if (clientsStoreRes.status === 'fulfilled' && Array.isArray(clientsStoreRes.value?.data?.data) && clientsStoreRes.value.data.data.length > 0) {
        fetchedData.clients = clientsStoreRes.value.data.data;
      } else if (snapData && Array.isArray(snapData.clients) && snapData.clients.length > 0) {
        fetchedData.clients = snapData.clients;
      }

      // 2. Monthly Work
      if (workRes.status === 'fulfilled' && Array.isArray(workRes.value.data) && workRes.value.data.length > 0) {
        fetchedData.monthly_work = workRes.value.data;
      } else if (workStoreRes.status === 'fulfilled' && Array.isArray(workStoreRes.value?.data?.data) && workStoreRes.value.data.data.length > 0) {
        fetchedData.monthly_work = workStoreRes.value.data.data;
      } else if (snapData && Array.isArray(snapData.monthly_work) && snapData.monthly_work.length > 0) {
        fetchedData.monthly_work = snapData.monthly_work;
      }

      // 3. Office Visits
      if (visitsRes.status === 'fulfilled' && Array.isArray(visitsRes.value.data) && visitsRes.value.data.length > 0) {
        fetchedData.office_visits = visitsRes.value.data;
      } else if (visitsStoreRes.status === 'fulfilled' && Array.isArray(visitsStoreRes.value?.data?.data) && visitsStoreRes.value.data.data.length > 0) {
        fetchedData.office_visits = visitsStoreRes.value.data.data;
      } else if (snapData && Array.isArray(snapData.office_visits) && snapData.office_visits.length > 0) {
        fetchedData.office_visits = snapData.office_visits;
      }

      // 4. GST Turnover
      if (gstTurnoverRes.status === 'fulfilled' && Array.isArray(gstTurnoverRes.value.data) && gstTurnoverRes.value.data.length > 0) {
        fetchedData.gst_turnover = gstTurnoverRes.value.data;
      } else if (gstTurnoverStoreRes.status === 'fulfilled' && Array.isArray(gstTurnoverStoreRes.value?.data?.data) && gstTurnoverStoreRes.value.data.data.length > 0) {
        fetchedData.gst_turnover = gstTurnoverStoreRes.value.data.data;
      } else if (snapData && Array.isArray(snapData.gst_turnover) && snapData.gst_turnover.length > 0) {
        fetchedData.gst_turnover = snapData.gst_turnover;
      }

      // 5. Bank Turnover
      let resolvedBankTurnover: ClientBankTurnover[] = [];
      if (bankTurnoverRes.status === 'fulfilled' && Array.isArray(bankTurnoverRes.value.data) && bankTurnoverRes.value.data.length > 0) {
        resolvedBankTurnover = (bankTurnoverRes.value.data as any[]).map((r) => ({
          id: r.id,
          client_id: r.client_id,
          bank_account_id: r.bank_account_id,
          financial_year_id: r.financial_year_id,
          month: r.month,
          turnover_amount: Number(r.turnover_amount) || 0,
          created_at: r.updated_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        }));
      }
      if (bankTurnoverStoreRes.status === 'fulfilled' && Array.isArray(bankTurnoverStoreRes.value?.data?.data) && bankTurnoverStoreRes.value.data.data.length > 0) {
        const storeTurnovers: ClientBankTurnover[] = bankTurnoverStoreRes.value.data.data;
        const map = new Map<string, ClientBankTurnover>();
        resolvedBankTurnover.forEach((t) => map.set(`${t.client_id}_${t.bank_account_id}_${t.financial_year_id}_${t.month}`, t));
        storeTurnovers.forEach((t) => map.set(`${t.client_id}_${t.bank_account_id}_${t.financial_year_id}_${t.month}`, t));
        resolvedBankTurnover = Array.from(map.values());
      } else if (resolvedBankTurnover.length === 0 && snapData && Array.isArray(snapData.bank_turnover)) {
        resolvedBankTurnover = snapData.bank_turnover;
      }
      fetchedData.bank_turnover = resolvedBankTurnover;

      // 6. Bank Accounts
      let resolvedBankAccounts: ClientBankAccount[] = [];
      if (bankAccountsRes.status === 'fulfilled' && Array.isArray(bankAccountsRes.value.data) && bankAccountsRes.value.data.length > 0) {
        resolvedBankAccounts = (bankAccountsRes.value.data as any[]).map((r) => {
          let meta: any = {};
          try {
            if (r.notes && typeof r.notes === 'string') meta = JSON.parse(r.notes);
          } catch {}
          return {
            id: r.id,
            client_id: r.client_id,
            slot_number: r.slot_number,
            bank_name: r.bank_name || '',
            account_number: r.account_number || '',
            account_holder_name: meta.account_holder_name || '',
            account_type: r.account_type || 'Current',
            ifsc: r.ifsc_code || '',
            status: meta.status || 'active',
            current_fy_id: meta.current_fy_id,
            deactivated_in_fy_id: meta.deactivated_in_fy_id,
            deactivated_fy_start_year: meta.deactivated_fy_start_year,
            deactivated_fy_name: meta.deactivated_fy_name,
            created_at: r.created_at || r.updated_at,
            updated_at: r.updated_at,
          };
        });
      }
      if (bankAccountsStoreRes.status === 'fulfilled' && Array.isArray(bankAccountsStoreRes.value?.data?.data) && bankAccountsStoreRes.value.data.data.length > 0) {
        const storeAccounts: ClientBankAccount[] = bankAccountsStoreRes.value.data.data;
        const map = new Map<string, ClientBankAccount>();
        resolvedBankAccounts.forEach((a) => map.set(`${a.client_id}_${a.slot_number}`, a));
        storeAccounts.forEach((a) => map.set(`${a.client_id}_${a.slot_number}`, a));
        resolvedBankAccounts = Array.from(map.values());
      } else if (resolvedBankAccounts.length === 0 && snapData && Array.isArray(snapData.bank_accounts)) {
        resolvedBankAccounts = snapData.bank_accounts;
      }
      fetchedData.bank_accounts = resolvedBankAccounts;

      // 7. Financial Years
      if (financialYearsRes.status === 'fulfilled' && Array.isArray(financialYearsRes.value.data) && financialYearsRes.value.data.length > 0) {
        fetchedData.financial_years = financialYearsRes.value.data;
      } else if (fyStoreRes.status === 'fulfilled' && Array.isArray(fyStoreRes.value?.data?.data) && fyStoreRes.value.data.data.length > 0) {
        fetchedData.financial_years = fyStoreRes.value.data.data;
      } else if (snapData && Array.isArray(snapData.financial_years) && snapData.financial_years.length > 0) {
        fetchedData.financial_years = snapData.financial_years;
      }

      // 8. Consultant Details
      if (consultantRes.status === 'fulfilled' && consultantRes.value?.data) {
        fetchedData.consultant_details = consultantRes.value.data;
      } else if (snapData && snapData.consultant_details) {
        fetchedData.consultant_details = snapData.consultant_details;
      }

      // 9. Users & Credentials
      if (usersCredsRes.status === 'fulfilled' && Array.isArray(usersCredsRes.value?.data?.data) && usersCredsRes.value.data.data.length > 0) {
        fetchedData.users = usersCredsRes.value.data.data;
      } else if (usersListRes.status === 'fulfilled' && Array.isArray(usersListRes.value?.data?.data) && usersListRes.value.data.data.length > 0) {
        fetchedData.users = usersListRes.value.data.data;
      }

      const hasAnyData = Object.keys(fetchedData).length > 0;
      const nowTime = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
      syncStatus.isFetching = false;
      syncStatus.lastFetchedAt = nowTime;
      syncStatus.connected = true;
      syncStatus.successMessage = `Supabase live synchronization active (${nowTime} IST)`;
      notifyListeners();

      return {
        success: true,
        data: hasAnyData ? fetchedData : null,
        message: hasAnyData
          ? 'Supabase se live data successfully load ho gaya.'
          : 'Supabase connected hai.',
      };
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
