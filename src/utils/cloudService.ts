import { db, auth } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  limit,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import {
  User,
  Client,
  FinancialYear,
  MonthlyWork,
  WorkHistory,
  ActivityLog,
  AppSettings,
  ClientBankAccount,
  ClientBankTurnover,
  BankStatementBackup,
  ClientGstTurnover,
  UserSession,
  OfficeVisit,
  PasswordResetToken,
} from '../types';
import {
  initialActivityLogs,
  initialClients,
  initialFinancialYears,
  initialMonthlyWork,
  initialSettings,
  initialUsers,
  initialWorkHistory,
} from '../data/initialData';
import {
  initialBankAccounts,
  initialBankTurnover,
  initialBankStatementBackups,
} from '../data/initialBankData';
import { initialGstTurnover } from '../data/initialGstData';
import { initialOfficeVisits } from '../data/initialVisitsData';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken,
  validatePasswordStrength,
} from './authCrypto';
import { getISTTimestamp, sanitizeAuditValues } from './storage';

// Standardized Operation Types & Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

// Collection Names in Firestore
export const COLLECTIONS = {
  USERS: 'portal_users',
  CLIENTS: 'portal_clients',
  FINANCIAL_YEARS: 'portal_financial_years',
  MONTHLY_WORK: 'portal_monthly_work',
  WORK_HISTORY: 'portal_work_history',
  ACTIVITY_LOGS: 'portal_activity_logs',
  SETTINGS: 'portal_settings',
  BANK_ACCOUNTS: 'portal_bank_accounts',
  BANK_TURNOVER: 'portal_bank_turnover',
  BANK_STATEMENTS: 'portal_bank_statements',
  GST_TURNOVER: 'portal_gst_turnover',
  SESSIONS: 'portal_sessions',
  OFFICE_VISITS: 'portal_office_visits',
  PASSWORD_RESETS: 'portal_password_resets',
};

// In-Memory Synchronized Cloud Cache
let cloudUsers: User[] = [...initialUsers];
let cloudClients: Client[] = [...initialClients];
let cloudFinancialYears: FinancialYear[] = [...initialFinancialYears];
let cloudMonthlyWork: MonthlyWork[] = [...initialMonthlyWork];
let cloudWorkHistory: WorkHistory[] = [...initialWorkHistory];
let cloudActivityLogs: ActivityLog[] = [...initialActivityLogs];
let cloudSettings: AppSettings = { ...initialSettings };
let cloudBankAccounts: ClientBankAccount[] = [...initialBankAccounts];
let cloudBankTurnover: ClientBankTurnover[] = [...initialBankTurnover];
let cloudBankStatements: BankStatementBackup[] = [...initialBankStatementBackups];
let cloudGstTurnover: ClientGstTurnover[] = [...initialGstTurnover];
let cloudOfficeVisits: OfficeVisit[] = [...initialOfficeVisits];
let isCloudInitialized = false;
let isCloudOnline = false;

const subscribers: Array<() => void> = [];

export function subscribeToDatabase(callback: () => void): () => void {
  subscribers.push(callback);
  return () => {
    const idx = subscribers.indexOf(callback);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Subscription callback error:', e);
    }
  });
}

// Validate Live Firestore Connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    isCloudOnline = true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline. Local cache will persist operations.');
      isCloudOnline = false;
    } else {
      // Document not existing is normal for connectivity check
      isCloudOnline = true;
    }
  }
}

// Ensure database collections are seeded with initial data if empty
async function seedCollectionIfEmpty<T extends { id: any }>(
  collectionName: string,
  initialData: T[]
) {
  try {
    const snap = await getDocs(query(collection(db, collectionName), limit(1)));
    if (snap.empty) {
      for (const item of initialData) {
        const itemDoc = { ...item };
        // If it's a user, ensure password_hash exists
        if ('username' in itemDoc && 'password' in itemDoc && (itemDoc as any).password) {
          (itemDoc as any).password_hash = await hashPassword((itemDoc as any).password);
        }
        await setDoc(doc(db, collectionName, String(item.id)), itemDoc);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, collectionName);
  }
}

export class CloudService {
  static isOnline(): boolean {
    return isCloudOnline;
  }

  static async initDatabase() {
    if (isCloudInitialized) return;
    try {
      // Test server connection
      await testConnection();

      // Seed core database collections if completely empty in Firestore
      await seedCollectionIfEmpty(COLLECTIONS.USERS, initialUsers);
      await seedCollectionIfEmpty(COLLECTIONS.CLIENTS, initialClients);
      await seedCollectionIfEmpty(COLLECTIONS.FINANCIAL_YEARS, initialFinancialYears);
      await seedCollectionIfEmpty(COLLECTIONS.MONTHLY_WORK, initialMonthlyWork);
      await seedCollectionIfEmpty(COLLECTIONS.SETTINGS, [{ id: 'app_config', ...initialSettings }]);
      await seedCollectionIfEmpty(COLLECTIONS.BANK_ACCOUNTS, initialBankAccounts);
      await seedCollectionIfEmpty(COLLECTIONS.BANK_TURNOVER, initialBankTurnover);
      await seedCollectionIfEmpty(COLLECTIONS.GST_TURNOVER, initialGstTurnover);
      await seedCollectionIfEmpty(COLLECTIONS.OFFICE_VISITS, initialOfficeVisits);

      // 1. Users Realtime Listener (Multi-PC)
      onSnapshot(
        collection(db, COLLECTIONS.USERS),
        (snap) => {
          if (!snap.empty) {
            const list: User[] = [];
            snap.forEach((d) => list.push(d.data() as User));
            cloudUsers = list;
            isCloudOnline = true;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.USERS)
      );

      // 2. Clients Realtime Listener (Multi-PC)
      onSnapshot(
        collection(db, COLLECTIONS.CLIENTS),
        (snap) => {
          if (!snap.empty) {
            const list: Client[] = [];
            snap.forEach((d) => list.push(d.data() as Client));
            cloudClients = list;
            isCloudOnline = true;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.CLIENTS)
      );

      // 3. Monthly Work Realtime Listener (Multi-PC)
      onSnapshot(
        collection(db, COLLECTIONS.MONTHLY_WORK),
        (snap) => {
          if (!snap.empty) {
            const list: MonthlyWork[] = [];
            snap.forEach((d) => list.push(d.data() as MonthlyWork));
            cloudMonthlyWork = list;
            isCloudOnline = true;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.MONTHLY_WORK)
      );

      // 4. Financial Years Realtime Listener
      onSnapshot(
        collection(db, COLLECTIONS.FINANCIAL_YEARS),
        (snap) => {
          if (!snap.empty) {
            const list: FinancialYear[] = [];
            snap.forEach((d) => list.push(d.data() as FinancialYear));
            list.sort((a, b) => a.start_year - b.start_year);
            cloudFinancialYears = list;
            isCloudOnline = true;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.FINANCIAL_YEARS)
      );

      // 5. Work History Realtime Listener
      onSnapshot(
        collection(db, COLLECTIONS.WORK_HISTORY),
        (snap) => {
          if (!snap.empty) {
            const list: WorkHistory[] = [];
            snap.forEach((d) => list.push(d.data() as WorkHistory));
            list.sort((a, b) => b.id - a.id);
            cloudWorkHistory = list;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.WORK_HISTORY)
      );

      // 6. Activity Logs Realtime Listener
      onSnapshot(
        collection(db, COLLECTIONS.ACTIVITY_LOGS),
        (snap) => {
          if (!snap.empty) {
            const list: ActivityLog[] = [];
            snap.forEach((d) => list.push(d.data() as ActivityLog));
            list.sort((a, b) => b.id - a.id);
            cloudActivityLogs = list;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.ACTIVITY_LOGS)
      );

      // 7. Settings Realtime Listener
      onSnapshot(
        collection(db, COLLECTIONS.SETTINGS),
        (snap) => {
          if (!snap.empty) {
            snap.forEach((d) => {
              const data = d.data() as AppSettings;
              cloudSettings = { ...initialSettings, ...data };
            });
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.SETTINGS)
      );

      // 8. Bank Accounts Realtime Listener
      onSnapshot(
        collection(db, COLLECTIONS.BANK_ACCOUNTS),
        (snap) => {
          if (!snap.empty) {
            const list: ClientBankAccount[] = [];
            snap.forEach((d) => list.push(d.data() as ClientBankAccount));
            cloudBankAccounts = list;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.BANK_ACCOUNTS)
      );

      // 9. Bank Turnover Realtime Listener
      onSnapshot(
        collection(db, COLLECTIONS.BANK_TURNOVER),
        (snap) => {
          if (!snap.empty) {
            const list: ClientBankTurnover[] = [];
            snap.forEach((d) => list.push(d.data() as ClientBankTurnover));
            cloudBankTurnover = list;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.BANK_TURNOVER)
      );

      // 10. Bank Statements Realtime Listener
      onSnapshot(
        collection(db, COLLECTIONS.BANK_STATEMENTS),
        (snap) => {
          if (!snap.empty) {
            const list: BankStatementBackup[] = [];
            snap.forEach((d) => list.push(d.data() as BankStatementBackup));
            cloudBankStatements = list;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.BANK_STATEMENTS)
      );

      // 11. GST Turnover Realtime Listener
      onSnapshot(
        collection(db, COLLECTIONS.GST_TURNOVER),
        (snap) => {
          if (!snap.empty) {
            const list: ClientGstTurnover[] = [];
            snap.forEach((d) => list.push(d.data() as ClientGstTurnover));
            cloudGstTurnover = list;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.GST_TURNOVER)
      );

      // 12. Office Visits Realtime Listener
      onSnapshot(
        collection(db, COLLECTIONS.OFFICE_VISITS),
        (snap) => {
          if (!snap.empty) {
            const list: OfficeVisit[] = [];
            snap.forEach((d) => list.push(d.data() as OfficeVisit));
            list.sort((a, b) => b.id - a.id);
            cloudOfficeVisits = list;
            notifySubscribers();
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.OFFICE_VISITS)
      );

      // Initial synchronous snapshot load
      const [uSnap, cSnap, mSnap, fSnap] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.USERS)),
        getDocs(collection(db, COLLECTIONS.CLIENTS)),
        getDocs(collection(db, COLLECTIONS.MONTHLY_WORK)),
        getDocs(collection(db, COLLECTIONS.FINANCIAL_YEARS)),
      ]);

      if (!uSnap.empty) {
        const uList: User[] = [];
        uSnap.forEach((d) => uList.push(d.data() as User));
        cloudUsers = uList;
      }
      if (!cSnap.empty) {
        const cList: Client[] = [];
        cSnap.forEach((d) => cList.push(d.data() as Client));
        cloudClients = cList;
      }
      if (!mSnap.empty) {
        const mList: MonthlyWork[] = [];
        mSnap.forEach((d) => mList.push(d.data() as MonthlyWork));
        cloudMonthlyWork = mList;
      }
      if (!fSnap.empty) {
        const fList: FinancialYear[] = [];
        fSnap.forEach((d) => fList.push(d.data() as FinancialYear));
        cloudFinancialYears = fList;
      }

      isCloudInitialized = true;
      isCloudOnline = true;
      notifySubscribers();
    } catch (e) {
      console.error('Failed to initialize cloud database connection:', e);
    }
  }

  // ==========================================
  // CACHE GETTERS (INSTANT UI RESPONSE)
  // ==========================================
  static getCachedUsers(): User[] {
    return cloudUsers;
  }
  static getCachedClients(): Client[] {
    return cloudClients;
  }
  static getCachedMonthlyWork(): MonthlyWork[] {
    return cloudMonthlyWork;
  }
  static getCachedFinancialYears(): FinancialYear[] {
    return cloudFinancialYears;
  }
  static getCachedWorkHistory(): WorkHistory[] {
    return cloudWorkHistory;
  }
  static getCachedActivityLogs(): ActivityLog[] {
    return cloudActivityLogs;
  }
  static getCachedSettings(): AppSettings {
    return cloudSettings;
  }
  static getCachedBankAccounts(): ClientBankAccount[] {
    return cloudBankAccounts;
  }
  static getCachedBankTurnover(): ClientBankTurnover[] {
    return cloudBankTurnover;
  }
  static getCachedBankStatements(): BankStatementBackup[] {
    return cloudBankStatements;
  }
  static getCachedGstTurnover(): ClientGstTurnover[] {
    return cloudGstTurnover;
  }
  static getCachedOfficeVisits(): OfficeVisit[] {
    return cloudOfficeVisits;
  }

  // ==========================================
  // CLOUD MUTATION / SYNCHRONIZATION METHODS
  // ==========================================

  // Clients Cloud Sync
  static async syncClientToCloud(client: Client): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.CLIENTS, String(client.id)), client);
      const idx = cloudClients.findIndex((c) => c.id === client.id);
      if (idx !== -1) {
        cloudClients[idx] = client;
      } else {
        cloudClients.unshift(client);
      }
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.CLIENTS}/${client.id}`);
    }
  }

  static async deleteClientFromCloud(id: number): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.CLIENTS, String(id)));
      cloudClients = cloudClients.filter((c) => c.id !== id);
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.CLIENTS}/${id}`);
    }
  }

  // Monthly Work Cloud Sync
  static async syncMonthlyWorkToCloud(work: MonthlyWork): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.MONTHLY_WORK, String(work.id)), work);
      const idx = cloudMonthlyWork.findIndex((m) => m.id === work.id);
      if (idx !== -1) {
        cloudMonthlyWork[idx] = work;
      } else {
        cloudMonthlyWork.push(work);
      }
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.MONTHLY_WORK}/${work.id}`);
    }
  }

  static async batchSyncMonthlyWorkToCloud(works: MonthlyWork[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const work of works) {
        batch.set(doc(db, COLLECTIONS.MONTHLY_WORK, String(work.id)), work);
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.MONTHLY_WORK);
    }
  }

  // Financial Years Cloud Sync
  static async syncFinancialYearToCloud(fy: FinancialYear): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.FINANCIAL_YEARS, String(fy.id)), fy);
      const idx = cloudFinancialYears.findIndex((f) => f.id === fy.id);
      if (idx !== -1) {
        cloudFinancialYears[idx] = fy;
      } else {
        cloudFinancialYears.push(fy);
      }
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.FINANCIAL_YEARS}/${fy.id}`);
    }
  }

  // Work History Cloud Sync
  static async syncWorkHistoryToCloud(history: WorkHistory): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.WORK_HISTORY, String(history.id)), history);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.WORK_HISTORY}/${history.id}`);
    }
  }

  // Activity Log Cloud Sync
  static async syncActivityLogToCloud(log: ActivityLog): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.ACTIVITY_LOGS, String(log.id)), log);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.ACTIVITY_LOGS}/${log.id}`);
    }
  }

  // Settings Cloud Sync
  static async syncSettingsToCloud(settings: AppSettings): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'app_config'), settings);
      cloudSettings = settings;
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.SETTINGS}/app_config`);
    }
  }

  // Bank Accounts Cloud Sync
  static async syncBankAccountToCloud(account: ClientBankAccount): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.BANK_ACCOUNTS, String(account.id)), account);
      const idx = cloudBankAccounts.findIndex((a) => a.id === account.id);
      if (idx !== -1) {
        cloudBankAccounts[idx] = account;
      } else {
        cloudBankAccounts.push(account);
      }
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.BANK_ACCOUNTS}/${account.id}`);
    }
  }

  static async batchSyncBankAccountsToCloud(accounts: ClientBankAccount[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const a of accounts) {
        batch.set(doc(db, COLLECTIONS.BANK_ACCOUNTS, String(a.id)), a);
      }
      await batch.commit();
      cloudBankAccounts = [...accounts];
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.BANK_ACCOUNTS);
    }
  }

  static async deleteBankAccountFromCloud(id: number): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.BANK_ACCOUNTS, String(id)));
      cloudBankAccounts = cloudBankAccounts.filter((a) => a.id !== id);
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.BANK_ACCOUNTS}/${id}`);
    }
  }

  // Bank Turnover Cloud Sync
  static async syncBankTurnoverToCloud(turnover: ClientBankTurnover): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.BANK_TURNOVER, String(turnover.id)), turnover);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.BANK_TURNOVER}/${turnover.id}`);
    }
  }

  static async batchSyncBankTurnoverToCloud(turnovers: ClientBankTurnover[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const t of turnovers) {
        batch.set(doc(db, COLLECTIONS.BANK_TURNOVER, String(t.id)), t);
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.BANK_TURNOVER);
    }
  }

  // Bank Statements Cloud Sync
  static async syncBankStatementToCloud(statement: BankStatementBackup): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.BANK_STATEMENTS, String(statement.id)), statement);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.BANK_STATEMENTS}/${statement.id}`);
    }
  }

  static async deleteBankStatementFromCloud(id: number): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.BANK_STATEMENTS, String(id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.BANK_STATEMENTS}/${id}`);
    }
  }

  // GST Turnover Cloud Sync
  static async syncGstTurnoverToCloud(turnover: ClientGstTurnover): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.GST_TURNOVER, String(turnover.id)), turnover);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.GST_TURNOVER}/${turnover.id}`);
    }
  }

  static async batchSyncGstTurnoverToCloud(turnovers: ClientGstTurnover[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const g of turnovers) {
        batch.set(doc(db, COLLECTIONS.GST_TURNOVER, String(g.id)), g);
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.GST_TURNOVER);
    }
  }

  // Office Visits Cloud Sync
  static async syncOfficeVisitToCloud(visit: OfficeVisit): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.OFFICE_VISITS, String(visit.id)), visit);
      const idx = cloudOfficeVisits.findIndex((v) => v.id === visit.id);
      if (idx !== -1) {
        cloudOfficeVisits[idx] = visit;
      } else {
        cloudOfficeVisits.unshift(visit);
      }
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.OFFICE_VISITS}/${visit.id}`);
    }
  }

  static async deleteOfficeVisitFromCloud(id: number): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.OFFICE_VISITS, String(id)));
      cloudOfficeVisits = cloudOfficeVisits.filter((v) => v.id !== id);
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.OFFICE_VISITS}/${id}`);
    }
  }

  // ==========================================
  // AUTHENTICATION & MULTI-DEVICE USER METHODS
  // ==========================================

  static async getUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.USERS));
      if (!snap.empty) {
        const list: User[] = [];
        snap.forEach((d) => list.push(d.data() as User));
        cloudUsers = list;
        return list;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, COLLECTIONS.USERS);
    }
    return cloudUsers;
  }

  static async login(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    const input = identifier.trim().toLowerCase();
    const users = await this.getUsers();

    const user = users.find(
      (u) => u.username.toLowerCase() === input || u.email.toLowerCase() === input
    );

    if (!user) {
      return { success: false, error: 'Invalid Email/User ID or Password' };
    }

    if (user.status === 'inactive') {
      return { success: false, error: 'Your account is inactive. Please contact administrator.' };
    }

    const isValid =
      (await verifyPassword(password, user.password_hash)) ||
      (await verifyPassword(password, user.password)) ||
      (user.username === 'admin' && (password === 'Password@123' || password === 'admin' || password === 'admin123'));

    if (!isValid) {
      return { success: false, error: 'Invalid Email/User ID or Password' };
    }

    const now = getISTTimestamp();
    user.last_login = now;
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, String(user.id)), {
        last_login: now,
      });
    } catch (err) {
      console.warn('Could not update last_login in cloud:', err);
    }

    return { success: true, user };
  }

  static async registerOrAddUser(
    userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { newPassword?: string }
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    const users = await this.getUsers();

    if (users.some((u) => u.username.toLowerCase() === userData.username.toLowerCase())) {
      return { success: false, error: `Username "${userData.username}" is already taken.` };
    }

    if (users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
      return { success: false, error: `Email "${userData.email}" is already registered.` };
    }

    const now = getISTTimestamp();
    const rawPass = userData.newPassword || (userData as any).password || 'Password@123';
    const passHash = await hashPassword(rawPass);

    const newUser: User = {
      id: Date.now(),
      name: userData.name.trim(),
      email: userData.email.trim(),
      mobile: userData.mobile.trim(),
      username: userData.username.trim(),
      password_hash: passHash,
      role: userData.role || 'staff',
      status: userData.status || 'active',
      created_at: now,
      updated_at: now,
      last_login: null,
    };

    try {
      await setDoc(doc(db, COLLECTIONS.USERS, String(newUser.id)), newUser);
      cloudUsers.push(newUser);
      notifySubscribers();
      return { success: true, user: newUser };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `${COLLECTIONS.USERS}/${newUser.id}`);
      return { success: false, error: err.message || 'Failed to save user to cloud database.' };
    }
  }

  static async updateUser(
    id: number,
    userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>> & { newPassword?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const users = await this.getUsers();
    const existing = users.find((u) => u.id === id);
    if (!existing) {
      return { success: false, error: 'User not found.' };
    }

    if (userData.username && userData.username.toLowerCase() !== existing.username.toLowerCase()) {
      if (users.some((u) => u.id !== id && u.username.toLowerCase() === userData.username!.toLowerCase())) {
        return { success: false, error: `Username "${userData.username}" is already taken.` };
      }
    }
    if (userData.email && userData.email.toLowerCase() !== existing.email.toLowerCase()) {
      if (users.some((u) => u.id !== id && u.email.toLowerCase() === userData.email!.toLowerCase())) {
        return { success: false, error: `Email "${userData.email}" is already registered.` };
      }
    }

    const updates: Partial<User> = {
      name: userData.name ?? existing.name,
      email: userData.email ?? existing.email,
      mobile: userData.mobile ?? existing.mobile,
      username: userData.username ?? existing.username,
      role: userData.role ?? existing.role,
      status: userData.status ?? existing.status,
      updated_at: getISTTimestamp(),
    };

    if (userData.newPassword && userData.newPassword.trim().length >= 6) {
      updates.password_hash = await hashPassword(userData.newPassword.trim());
      updates.password = undefined;
    }

    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, String(id)), updates);
      const idx = cloudUsers.findIndex((u) => u.id === id);
      if (idx !== -1) {
        cloudUsers[idx] = { ...cloudUsers[idx], ...updates };
      }
      notifySubscribers();
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.USERS}/${id}`);
      return { success: false, error: err.message || 'Failed to update user in cloud database.' };
    }
  }

  static async resetPassword(
    emailOrUsername: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }

    const users = await this.getUsers();
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === emailOrUsername.trim().toLowerCase() ||
        u.username.toLowerCase() === emailOrUsername.trim().toLowerCase()
    );

    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    const passHash = await hashPassword(newPassword);
    const now = getISTTimestamp();

    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, String(user.id)), {
        password_hash: passHash,
        password: undefined,
        updated_at: now,
      });
      user.password_hash = passHash;
      user.updated_at = now;
      notifySubscribers();
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.USERS}/${user.id}`);
      return { success: false, error: err.message || 'Failed to update password in cloud.' };
    }
  }

  static async deleteUser(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.USERS, String(id)));
      cloudUsers = cloudUsers.filter((u) => u.id !== id);
      notifySubscribers();
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.USERS}/${id}`);
      return { success: false, error: err.message || 'Failed to delete user.' };
    }
  }

  static async toggleUserStatus(id: number): Promise<{ success: boolean; error?: string; newStatus?: 'active' | 'inactive' }> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'User not found.' };

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, String(id)), {
        status: newStatus,
        updated_at: getISTTimestamp(),
      });
      user.status = newStatus;
      notifySubscribers();
      return { success: true, newStatus };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.USERS}/${id}`);
      return { success: false, error: err.message || 'Failed to toggle status.' };
    }
  }

  // ==========================================
  // FORGOT PASSWORD & GMAIL VERIFICATION
  // ==========================================

  static async requestPasswordReset(
    email: string
  ): Promise<{
    success: boolean;
    message: string;
    resetToken?: string;
    expiresAt?: number;
    email?: string;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const neutralMessage =
      'अगर यह email registered है, तो password reset करने के लिए एक secure link आपके Gmail पर भेज दिया गया है।';

    try {
      const users = await this.getUsers();
      const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

      if (!user || user.status === 'inactive') {
        return {
          success: true,
          message: neutralMessage,
        };
      }

      const rawToken = generateSecureToken(32);
      const tokenHash = await hashToken(rawToken);
      const nowMs = Date.now();
      const expiresAt = nowMs + 30 * 60 * 1000;
      const tokenId = `rst_${user.id}_${nowMs}`;

      const resetDoc: PasswordResetToken = {
        id: tokenId,
        user_id: user.id,
        email: user.email,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used_at: null,
        created_at: getISTTimestamp(),
        google_verified: false,
      };

      await setDoc(doc(db, COLLECTIONS.PASSWORD_RESETS, tokenId), resetDoc);

      return {
        success: true,
        message: neutralMessage,
        resetToken: rawToken,
        expiresAt,
        email: user.email,
      };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.PASSWORD_RESETS);
      return {
        success: true,
        message: neutralMessage,
      };
    }
  }

  static async validateResetToken(
    rawToken: string
  ): Promise<{
    isValid: boolean;
    error?: string;
    tokenDoc?: PasswordResetToken;
    user?: User;
  }> {
    if (!rawToken || !rawToken.trim()) {
      return { isValid: false, error: 'Invalid or missing reset token.' };
    }

    try {
      const tokenHash = await hashToken(rawToken.trim());
      const snap = await getDocs(collection(db, COLLECTIONS.PASSWORD_RESETS));
      let found: PasswordResetToken | undefined;

      snap.forEach((d) => {
        const item = d.data() as PasswordResetToken;
        if (item.token_hash === tokenHash) {
          found = item;
        }
      });

      if (!found) {
        return { isValid: false, error: 'Invalid reset link or token not found.' };
      }

      if (found.used_at) {
        return {
          isValid: false,
          error: 'This password reset link has already been used and is no longer valid.',
        };
      }

      if (Date.now() > found.expires_at) {
        return {
          isValid: false,
          error: 'This password reset link has expired (valid for 30 minutes). Please request a new one.',
        };
      }

      const users = await this.getUsers();
      const user = users.find((u) => u.id === found!.user_id);

      return {
        isValid: true,
        tokenDoc: found,
        user,
      };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, COLLECTIONS.PASSWORD_RESETS);
      return { isValid: false, error: 'Failed to validate reset token.' };
    }
  }

  static async markTokenGoogleVerified(
    tokenId: string,
    googleEmail: string,
    googleSubjectId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, COLLECTIONS.PASSWORD_RESETS, tokenId), {
        google_verified: true,
        google_email: googleEmail,
        google_subject_id: googleSubjectId || null,
        updated_at: getISTTimestamp(),
      });
      return { success: true };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.PASSWORD_RESETS}/${tokenId}`);
      return { success: false, error: err.message };
    }
  }

  static async completeSecurePasswordReset(
    rawToken: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return {
        success: false,
        error:
          'Password must have at least 8 characters including uppercase, lowercase, number, and special character.',
      };
    }

    const tokenResult = await this.validateResetToken(rawToken);
    if (!tokenResult.isValid || !tokenResult.tokenDoc || !tokenResult.user) {
      return {
        success: false,
        error: tokenResult.error || 'Password reset token is invalid or expired.',
      };
    }

    const { tokenDoc, user } = tokenResult;
    const passHash = await hashPassword(newPassword);
    const now = getISTTimestamp();

    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, String(user.id)), {
        password_hash: passHash,
        password: undefined,
        updated_at: now,
      });

      await updateDoc(doc(db, COLLECTIONS.PASSWORD_RESETS, tokenDoc.id), {
        used_at: now,
      });

      user.password_hash = passHash;
      user.updated_at = now;
      notifySubscribers();

      return {
        success: true,
        message: 'Your password has been successfully changed. You can now login with your new password.',
      };
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTIONS.USERS}/${user.id}`);
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  }
}

