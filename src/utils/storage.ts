import {
  ActivityLog,
  AppSettings,
  Client,
  FinancialYear,
  MonthlyWork,
  User,
  WorkHistory,
  WorkStatus,
  ClientBankAccount,
  ClientBankTurnover,
  BankStatementBackup,
  BankAccountSlot,
  ClientGstTurnover,
  FY_MONTHS,
  FinancialReportData,
  UserSession,
  OfficeVisit,
  OfficeVisitNote,
  OfficeVisitStatus,
  VisitorType,
  PasswordResetToken,
  TabType,
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
import { validateGSTIN } from './gstValidation';
import {
  generateSecureToken,
  hashToken,
  hashPassword,
  validatePasswordStrength,
} from './authCrypto';
import { CloudService } from './cloudService';
import { SupabaseService } from './supabaseService';

export function getISTTimestamp(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const getP = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    return `${getP('year')}-${getP('month')}-${getP('day')} ${getP('hour')}:${getP('minute')}:${getP('second')}`;
  } catch {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }
}

export function sanitizeAuditValues(val: any): any {
  if (!val || typeof val !== 'object') return val;
  const sanitized = { ...val };
  const sensitiveKeys = ['password', 'password_hash', 'newPassword', 'secret', 'token', 'auth_token'];
  for (const k of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
      delete sanitized[k];
    }
  }
  return sanitized;
}

const STORAGE_KEYS = {
  USERS: 'gst_app_users_v1',
  CLIENTS: 'gst_app_clients_v1',
  FINANCIAL_YEARS: 'gst_app_fy_v1',
  MONTHLY_WORK: 'gst_app_monthly_work_v1',
  WORK_HISTORY: 'gst_app_work_history_v1',
  ACTIVITY_LOGS: 'gst_app_activity_logs_v1',
  SETTINGS: 'gst_app_settings_v1',
  CURRENT_USER_ID: 'gst_app_current_user_id',
  CURRENT_USER_DATA: 'gst_app_current_user_data_v1',
  ACTIVE_TAB: 'gst_app_active_tab_v1',
  SELECTED_FY_ID: 'gst_app_selected_fy_id',
  SELECTED_MONTH: 'gst_app_selected_month',
  BANK_ACCOUNTS: 'gst_app_bank_accounts_v1',
  BANK_TURNOVER: 'gst_app_bank_turnover_v1',
  BANK_STATEMENTS: 'gst_app_bank_statements_v1',
  GST_TURNOVER: 'gst_app_gst_turnover_v1',
  SESSIONS: 'gst_app_sessions_v1',
  CURRENT_SESSION_ID: 'gst_app_current_session_id',
  OFFICE_VISITS: 'gst_app_office_visits_v1',
  PASSWORD_RESETS: 'gst_app_password_resets_v1',
};

// Resilient In-Memory Storage Fallback for restricted / private iframe environments
const memoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // LocalStorage blocked or restricted
  }
  return memoryStore[key] ?? null;
}

function safeSetItem(key: string, value: string): void {
  memoryStore[key] = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // LocalStorage quota or permission issue, fallback kept in memoryStore
  }
}

function safeRemoveItem(key: string): void {
  delete memoryStore[key];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore
  }
}

function safeParse<T>(raw: string | null, defaultValue: T): T {
  if (!raw) return defaultValue;
  try {
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export class GSTStorage {
  // Getters
  static getUsers(): User[] {
    const raw = safeGetItem(STORAGE_KEYS.USERS);
    if (!raw) {
      this.saveUsers(initialUsers);
      return initialUsers;
    }
    return safeParse<User[]>(raw, initialUsers);
  }

  static saveUsers(users: User[]) {
    safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static getClients(): Client[] {
    const raw = safeGetItem(STORAGE_KEYS.CLIENTS);
    if (!raw) {
      this.saveClients(initialClients);
      return initialClients;
    }
    return safeParse<Client[]>(raw, initialClients);
  }

  static getClientById(id: number): Client | undefined {
    return this.getClients().find((c) => c.id === id);
  }

  static saveClients(clients: Client[]) {
    safeSetItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  }

  static getFinancialYears(): FinancialYear[] {
    const raw = safeGetItem(STORAGE_KEYS.FINANCIAL_YEARS);
    if (!raw) {
      this.saveFinancialYears(initialFinancialYears);
      return initialFinancialYears;
    }
    try {
      const parsed: FinancialYear[] = safeParse<FinancialYear[]>(raw, initialFinancialYears);
      // Ensure all 30+ future financial years exist in the list
      if (parsed.length < initialFinancialYears.length) {
        const existingNames = new Set(parsed.map((f) => f.display_name));
        let maxId = parsed.reduce((max, f) => Math.max(max, f.id), 0);
        const merged = [...parsed];
        initialFinancialYears.forEach((initFy) => {
          if (!existingNames.has(initFy.display_name)) {
            maxId++;
            merged.push({ ...initFy, id: maxId });
            existingNames.add(initFy.display_name);
          }
        });
        merged.sort((a, b) => a.start_year - b.start_year);
        this.saveFinancialYears(merged);
        return merged;
      }
      return parsed;
    } catch {
      this.saveFinancialYears(initialFinancialYears);
      return initialFinancialYears;
    }
  }

  static saveFinancialYears(fys: FinancialYear[]) {
    safeSetItem(STORAGE_KEYS.FINANCIAL_YEARS, JSON.stringify(fys));
  }

  static getMonthlyWork(): MonthlyWork[] {
    const raw = safeGetItem(STORAGE_KEYS.MONTHLY_WORK);
    if (!raw) {
      this.saveMonthlyWork(initialMonthlyWork);
      return initialMonthlyWork;
    }
    return safeParse<MonthlyWork[]>(raw, initialMonthlyWork);
  }

  static saveMonthlyWork(work: MonthlyWork[]) {
    safeSetItem(STORAGE_KEYS.MONTHLY_WORK, JSON.stringify(work));
    // Asynchronously push to cloud for instant multi-PC sync
    CloudService.batchSyncMonthlyWorkToCloud(work).catch((e) => console.warn('Cloud sync monthly work error:', e));
    if (work.length > 0) {
      SupabaseService.syncMonthlyWork(work[work.length - 1]).catch((e) => console.warn('Supabase sync monthly work error:', e));
    }
  }

  static getWorkHistory(): WorkHistory[] {
    const raw = safeGetItem(STORAGE_KEYS.WORK_HISTORY);
    if (!raw) {
      this.saveWorkHistory(initialWorkHistory);
      return initialWorkHistory;
    }
    return safeParse<WorkHistory[]>(raw, initialWorkHistory);
  }

  static saveWorkHistory(history: WorkHistory[]) {
    safeSetItem(STORAGE_KEYS.WORK_HISTORY, JSON.stringify(history));
    if (history.length > 0) {
      CloudService.syncWorkHistoryToCloud(history[0]).catch((e) => console.warn('Cloud sync history error:', e));
    }
  }

  static getActivityLogs(): ActivityLog[] {
    const raw = safeGetItem(STORAGE_KEYS.ACTIVITY_LOGS);
    if (!raw) {
      this.saveActivityLogs(initialActivityLogs);
      return initialActivityLogs;
    }
    return safeParse<ActivityLog[]>(raw, initialActivityLogs);
  }

  static saveActivityLogs(logs: ActivityLog[]) {
    safeSetItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
    if (logs.length > 0) {
      CloudService.syncActivityLogToCloud(logs[0]).catch((e) => console.warn('Cloud sync log error:', e));
    }
  }

  static getSettings(): AppSettings {
    const raw = safeGetItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      return initialSettings;
    }
    try {
      const parsed = JSON.parse(raw);
      return { ...initialSettings, ...parsed };
    } catch {
      return initialSettings;
    }
  }

  // Sessions & Online Presence
  static getSessions(): UserSession[] {
    const raw = safeGetItem(STORAGE_KEYS.SESSIONS);
    if (!raw) return [];
    return safeParse<UserSession[]>(raw, []);
  }

  static saveSessions(sessions: UserSession[]) {
    safeSetItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }

  static getCurrentSessionId(): string {
    let sid = safeGetItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      safeSetItem(STORAGE_KEYS.CURRENT_SESSION_ID, sid);
    }
    return sid;
  }

  static startSession(user: User): UserSession {
    const sessions = this.getSessions();
    const sid = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    safeSetItem(STORAGE_KEYS.CURRENT_SESSION_ID, sid);

    const now = getISTTimestamp();
    const newSession: UserSession = {
      session_id: sid,
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      ip_address: '103.21.124.55',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Chrome/128.0 (Windows NT 10.0; Win64)',
      login_time: now,
      last_activity_time: now,
      logout_time: null,
      status: 'active',
    };

    // Close any previous active session for this user
    const updated = sessions.map((s) =>
      s.user_id === user.id && s.status === 'active'
        ? { ...s, status: 'logged_out' as const, logout_time: now }
        : s
    );
    updated.unshift(newSession);
    this.saveSessions(updated.slice(0, 200));
    return newSession;
  }

  static endCurrentSession() {
    const sid = safeGetItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    const user = this.getCurrentUser();
    if (!sid && !user) return;

    const sessions = this.getSessions();
    const now = getISTTimestamp();
    const updated = sessions.map((s) => {
      if ((sid && s.session_id === sid) || (user && s.user_id === user.id && s.status === 'active')) {
        return { ...s, status: 'logged_out' as const, logout_time: now };
      }
      return s;
    });
    this.saveSessions(updated);
    safeRemoveItem(STORAGE_KEYS.CURRENT_SESSION_ID);
  }

  static touchCurrentSession() {
    const sid = safeGetItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    const user = this.getCurrentUser();
    if (!sid || !user) return;

    const sessions = this.getSessions();
    const now = getISTTimestamp();
    let found = false;
    const updated = sessions.map((s) => {
      if (s.session_id === sid && s.status === 'active') {
        found = true;
        return { ...s, last_activity_time: now };
      }
      return s;
    });

    if (!found) {
      updated.unshift({
        session_id: sid,
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
        ip_address: '103.21.124.55',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Chrome/128.0 (Windows NT 10.0; Win64)',
        login_time: now,
        last_activity_time: now,
        logout_time: null,
        status: 'active',
      });
    }

    this.saveSessions(updated.slice(0, 200));
  }

  static isUserOnline(userId: number): boolean {
    const sessions = this.getSessions();
    const active = sessions.find((s) => s.user_id === userId && s.status === 'active');
    if (!active) return false;

    // Check if last activity was within 30 minutes
    try {
      const lastAct = new Date(active.last_activity_time.replace(' ', 'T')).getTime();
      const now = new Date().getTime();
      return now - lastAct < 30 * 60 * 1000;
    } catch {
      return true;
    }
  }

  static saveSettings(settings: AppSettings) {
    let previous: AppSettings | null = null;
    const raw = safeGetItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      try {
        previous = JSON.parse(raw);
      } catch {
        previous = null;
      }
    }
    safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    CloudService.syncSettingsToCloud(settings).catch((e) => console.warn('Cloud sync settings error:', e));
    if (settings.consultant) {
      SupabaseService.saveConsultantDetails(settings.consultant, settings).catch((e) => console.warn('Supabase sync consultant error:', e));
    }
    this.logActivity('Settings Saved', 'Updated application configuration settings and synced to cloud', {
      module: 'Settings',
      oldValues: previous ? sanitizeAuditValues(previous) : null,
      newValues: sanitizeAuditValues(settings),
    });
  }

  static getCurrentUser(): User | null {
    // 1. Direct cached user object for instant recovery on page reload
    const rawUserData = safeGetItem(STORAGE_KEYS.CURRENT_USER_DATA);
    if (rawUserData) {
      try {
        const parsed = JSON.parse(rawUserData);
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
          return parsed;
        }
      } catch {
        // continue
      }
    }

    // 2. Lookup by stored user ID
    const storedId = safeGetItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (!storedId) return null;
    const users = this.getUsers();
    const found = users.find((u) => u.id === Number(storedId));
    if (found) {
      safeSetItem(STORAGE_KEYS.CURRENT_USER_DATA, JSON.stringify(found));
      return found;
    }
    return null;
  }

  static setCurrentUser(user: User | null) {
    if (user) {
      safeSetItem(STORAGE_KEYS.CURRENT_USER_ID, String(user.id));
      safeSetItem(STORAGE_KEYS.CURRENT_USER_DATA, JSON.stringify(user));
      // Ensure user is present in local users collection
      const users = this.getUsers();
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx === -1) {
        users.push(user);
        this.saveUsers(users);
      } else {
        users[idx] = { ...users[idx], ...user };
        this.saveUsers(users);
      }
    } else {
      safeRemoveItem(STORAGE_KEYS.CURRENT_USER_ID);
      safeRemoveItem(STORAGE_KEYS.CURRENT_USER_DATA);
    }
  }

  static login(identifier: string, password: string): { success: boolean; error?: string; user?: User } {
    const input = identifier.trim().toLowerCase();
    const users = this.getUsers();
    
    // Find user by username or email
    const user = users.find(
      (u) => u.username.toLowerCase() === input || u.email.toLowerCase() === input
    );

    const ip = '103.21.124.55';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Chrome/128.0 (Windows NT 10.0; Win64)';

    if (!user) {
      // Log failed attempt with masked identifier, NEVER log password
      this.logActivity('LOGIN_FAILED', `Failed login attempt for identifier "${identifier.slice(0, 3)}***" (User not found)`, {
        module: 'Auth',
        ipAddress: ip,
        userAgent,
        description: `Failed login attempt: Account not found for "${identifier.slice(0, 3)}***"`,
      });
      return { success: false, error: 'Invalid Email/User ID or Password' };
    }

    if (user.status === 'inactive') {
      this.logActivity('LOGIN_FAILED', `Failed login attempt for deactivated user "${user.username}"`, {
        module: 'Auth',
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        ipAddress: ip,
        userAgent,
        description: `Inactive user ${user.name} (${user.username}) attempted login`,
      });
      return { success: false, error: 'Your account is inactive. Please contact administrator.' };
    }

    // In demo environment, accept 'Password@123', 'admin', or the stored user's password/hash default
    const validPassword = 
      password === 'Password@123' ||
      password === 'admin' ||
      password === 'admin123' ||
      password === user.password ||
      (user.username === 'admin' && (password === 'admin' || password === 'Password@123'));

    if (!validPassword) {
      this.logActivity('LOGIN_FAILED', `Incorrect password attempt for user "${user.username}"`, {
        module: 'Auth',
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        ipAddress: ip,
        userAgent,
        description: `Invalid password supplied for user ${user.name} (${user.username})`,
      });
      return { success: false, error: 'Invalid Email/User ID or Password' };
    }

    // Update last_login
    const now = getISTTimestamp();
    user.last_login = now;
    this.saveUsers(users);
    this.setCurrentUser(user);

    // Start session
    const session = this.startSession(user);

    this.logActivity('LOGIN', `User ${user.name} (${user.role.toUpperCase()}) logged in successfully`, {
      module: 'Auth',
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      ipAddress: ip,
      userAgent,
      sessionId: session.session_id,
      description: `User ${user.name} logged into system (${user.role.toUpperCase()})`,
    });

    return { success: true, user };
  }

  static logout() {
    const user = this.getCurrentUser();
    const sid = safeGetItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    if (user) {
      this.logActivity('LOGOUT', `User ${user.name} logged out from the portal`, {
        module: 'Auth',
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        sessionId: sid || undefined,
        description: `User ${user.name} (${user.role.toUpperCase()}) initiated logout`,
      });
    }
    this.endCurrentSession();
    this.setCurrentUser(null);
  }

  static getPasswordResets(): PasswordResetToken[] {
    const raw = safeGetItem(STORAGE_KEYS.PASSWORD_RESETS);
    if (!raw) return [];
    return safeParse<PasswordResetToken[]>(raw, []);
  }

  static savePasswordResets(tokens: PasswordResetToken[]) {
    safeSetItem(STORAGE_KEYS.PASSWORD_RESETS, JSON.stringify(tokens));
  }

  static async forgotPassword(
    email: string
  ): Promise<{
    success: boolean;
    error?: string;
    resetToken?: string;
    expiresAt?: number;
    message: string;
    email?: string;
  }> {
    const neutralMessage =
      'अगर यह email registered है, तो password reset करने के लिए एक secure link आपके Gmail पर भेज दिया गया है।';
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
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
    const expiresAt = nowMs + 30 * 60 * 1000; // 30 mins
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

    const existing = this.getPasswordResets();
    existing.unshift(resetDoc);
    this.savePasswordResets(existing);

    this.logActivity('PASSWORD_RESET', `Password reset token requested for ${user.email}`, {
      module: 'Auth',
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      description: `Single-use 30-minute password reset link generated for ${user.email}`,
    });

    return {
      success: true,
      resetToken: rawToken,
      expiresAt,
      email: user.email,
      message: neutralMessage,
    };
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

    const tokenHash = await hashToken(rawToken.trim());
    const list = this.getPasswordResets();
    const found = list.find((t) => t.token_hash === tokenHash);

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

    const user = this.getUsers().find((u) => u.id === found.user_id);
    return {
      isValid: true,
      tokenDoc: found,
      user,
    };
  }

  static markTokenGoogleVerified(
    tokenId: string,
    googleEmail: string,
    googleSubjectId?: string
  ): { success: boolean; error?: string } {
    const list = this.getPasswordResets();
    const idx = list.findIndex((t) => t.id === tokenId);
    if (idx === -1) return { success: false, error: 'Token not found.' };

    list[idx].google_verified = true;
    list[idx].google_email = googleEmail;
    list[idx].google_subject_id = googleSubjectId || undefined;
    this.savePasswordResets(list);
    return { success: true };
  }

  static async resetPassword(
    rawTokenOrEmail: string,
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

    const users = this.getUsers();
    let targetUser: User | undefined;
    let targetTokenDoc: PasswordResetToken | undefined;

    // Check if passed string is a rawToken
    if (rawTokenOrEmail.length >= 20) {
      const tokenResult = await this.validateResetToken(rawTokenOrEmail);
      if (tokenResult.isValid && tokenResult.user && tokenResult.tokenDoc) {
        targetUser = tokenResult.user;
        targetTokenDoc = tokenResult.tokenDoc;
      }
    }

    // Fallback search by email/username for backward compatibility
    if (!targetUser) {
      targetUser = users.find(
        (u) =>
          u.email.toLowerCase() === rawTokenOrEmail.trim().toLowerCase() ||
          u.username.toLowerCase() === rawTokenOrEmail.trim().toLowerCase()
      );
    }

    if (!targetUser) {
      return { success: false, error: 'User account or reset token not found.' };
    }

    const userIdx = users.findIndex((u) => u.id === targetUser!.id);
    const passHash = await hashPassword(newPassword);
    const now = getISTTimestamp();

    users[userIdx].password = undefined; // Wipe plaintext password
    users[userIdx].password_hash = passHash;
    users[userIdx].updated_at = now;
    this.saveUsers(users);

    if (targetTokenDoc) {
      const tokens = this.getPasswordResets();
      const tIdx = tokens.findIndex((t) => t.id === targetTokenDoc!.id);
      if (tIdx !== -1) {
        tokens[tIdx].used_at = now;
        this.savePasswordResets(tokens);
      }
    }

    this.logActivity('PASSWORD_RESET', `Password successfully updated for user ${targetUser.username}`, {
      module: 'User Management',
      userId: targetUser.id,
      userName: targetUser.name,
      userRole: targetUser.role,
      description: `Secure password reset completed for account ${targetUser.username}`,
    });

    return {
      success: true,
      message: 'Your password has been successfully changed. You can now login with your new password.',
    };
  }

  static updateUser(
    id: number,
    userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>> & { newPassword?: string }
  ): { success: boolean; error?: string } {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      return { success: false, error: 'User not found.' };
    }

    // Check unique username/email if changed
    if (userData.username && userData.username.toLowerCase() !== users[index].username.toLowerCase()) {
      if (users.some((u) => u.id !== id && u.username.toLowerCase() === userData.username!.toLowerCase())) {
        return { success: false, error: `Username "${userData.username}" is already taken.` };
      }
    }
    if (userData.email && userData.email.toLowerCase() !== users[index].email.toLowerCase()) {
      if (users.some((u) => u.id !== id && u.email.toLowerCase() === userData.email!.toLowerCase())) {
        return { success: false, error: `Email "${userData.email}" is already registered.` };
      }
    }

    const previousUser = { ...users[index] };
    const now = getISTTimestamp();
    users[index] = {
      ...users[index],
      name: userData.name ?? users[index].name,
      email: userData.email ?? users[index].email,
      mobile: userData.mobile ?? users[index].mobile,
      username: userData.username ?? users[index].username,
      role: userData.role ?? users[index].role,
      status: userData.status ?? users[index].status,
      password: userData.newPassword ? userData.newPassword : users[index].password,
      updated_at: now,
    };

    this.saveUsers(users);

    const oldClean = sanitizeAuditValues(previousUser);
    const newClean = sanitizeAuditValues(users[index]);
    const changedFields = Object.keys(userData).filter((k) => k !== 'newPassword' && (previousUser as any)[k] !== (users[index] as any)[k]);
    if (userData.newPassword) changedFields.push('password');

    this.logActivity('EDIT', `Updated user profile of ${users[index].name} (${users[index].username})`, {
      module: 'User Management',
      recordId: id,
      oldValues: oldClean,
      newValues: newClean,
      changedFields,
      description: `Modified profile attributes for user ${users[index].name} (${users[index].username})`,
    });
    return { success: true };
  }

  static toggleUserStatus(id: number): { success: boolean; error?: string; newStatus?: 'active' | 'inactive' } {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      return { success: false, error: 'User not found.' };
    }
    const current = this.getCurrentUser();
    if (current && current.id === id) {
      return { success: false, error: 'You cannot deactivate your own active logged-in account.' };
    }
    const oldStatus = users[index].status;
    const newStatus = oldStatus === 'active' ? 'inactive' : 'active';
    users[index].status = newStatus;
    users[index].updated_at = getISTTimestamp();
    this.saveUsers(users);

    this.logActivity('STATUS_CHANGE', `Changed status of user ${users[index].username} from ${oldStatus} to ${newStatus}`, {
      module: 'User Management',
      recordId: id,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      changedFields: ['status'],
      description: `Account status for ${users[index].name} changed to ${newStatus.toUpperCase()}`,
    });
    return { success: true, newStatus };
  }

  static deleteUser(id: number): { success: boolean; error?: string } {
    const users = this.getUsers();
    const current = this.getCurrentUser();
    if (current && current.id === id) {
      return { success: false, error: 'You cannot delete your own logged-in account.' };
    }
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) {
      return { success: false, error: 'User not found.' };
    }
    const updatedUsers = users.filter((u) => u.id !== id);
    this.saveUsers(updatedUsers);

    // Unassign staff from clients
    const clients = this.getClients();
    const updatedClients = clients.map((c) =>
      c.assigned_staff_id === id ? { ...c, assigned_staff_id: null } : c
    );
    this.saveClients(updatedClients);

    this.logActivity('DELETE', `Deleted user account ${userToDelete.name} (${userToDelete.username})`, {
      module: 'User Management',
      recordId: id,
      oldValues: sanitizeAuditValues(userToDelete),
      description: `Deleted staff profile ${userToDelete.name} (${userToDelete.role}) and unassigned client links`,
    });
    return { success: true };
  }

  static getSelectedFY(): FinancialYear {
    const fys = this.getFinancialYears();
    const storedId = safeGetItem(STORAGE_KEYS.SELECTED_FY_ID);
    if (storedId) {
      const found = fys.find((f) => f.id === Number(storedId));
      if (found) return found;
    }
    return fys[1] || fys[0]; // 2026-27 by default
  }

  static setSelectedFY(fy: FinancialYear) {
    safeSetItem(STORAGE_KEYS.SELECTED_FY_ID, String(fy.id));
  }

  static getSelectedMonth(): string {
    const stored = safeGetItem(STORAGE_KEYS.SELECTED_MONTH);
    return stored || 'August';
  }

  static setSelectedMonth(month: string) {
    safeSetItem(STORAGE_KEYS.SELECTED_MONTH, month);
  }

  static getActiveTab(): TabType {
    const raw = safeGetItem(STORAGE_KEYS.ACTIVE_TAB);
    const validTabs: TabType[] = [
      'dashboard',
      'clients',
      'office-visits',
      'monthly-work',
      'gst-turnover-entry',
      'gst-turnover-matrix',
      'bank-turnover',
      'reports',
      'financial-years',
      'users',
      'activity-logs',
      'import',
      'export',
      'settings',
    ];
    if (raw && validTabs.includes(raw as TabType)) {
      return raw as TabType;
    }
    return 'dashboard';
  }

  static setActiveTab(tab: TabType) {
    safeSetItem(STORAGE_KEYS.ACTIVE_TAB, tab);
  }

  // Central Comprehensive Activity & Audit Logger
  static logActivity(
    action: string,
    description: string,
    options?: {
      module?: string;
      description?: string;
      clientId?: number | null;
      clientName?: string | null;
      firmName?: string | null;
      financialYearId?: number | null;
      financialYear?: string | null;
      recordId?: string | number | null;
      oldValues?: Record<string, any> | null;
      newValues?: Record<string, any> | null;
      changedFields?: string[] | null;
      userId?: number;
      userName?: string;
      userRole?: User['role'];
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): ActivityLog {
    const currentUser = this.getCurrentUser();
    const logs = this.getActivityLogs();
    const sid = options?.sessionId || safeGetItem(STORAGE_KEYS.CURRENT_SESSION_ID) || 'sess_default';

    // Auto-detect client info if clientId provided
    let clientName = options?.clientName || null;
    let firmName = options?.firmName || null;
    if (options?.clientId && (!clientName || !firmName)) {
      const c = this.getClientById(options.clientId);
      if (c) {
        clientName = clientName || c.client_name;
        firmName = firmName || c.firm_name;
      }
    }

    // Auto-detect FY display name if financialYearId provided
    let fyDisplay = options?.financialYear || null;
    if (options?.financialYearId && !fyDisplay) {
      const fy = this.getFinancialYears().find((f) => f.id === options.financialYearId);
      if (fy) fyDisplay = fy.display_name;
    }

    const newLog: ActivityLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      user_id: options?.userId || currentUser?.id || 1,
      user_name: options?.userName || currentUser?.name || 'System Admin',
      user_role: options?.userRole || currentUser?.role || 'admin',
      action,
      module: options?.module || 'General',
      client_id: options?.clientId || null,
      client_name: clientName,
      firm_name: firmName,
      financial_year_id: options?.financialYearId || null,
      financial_year: fyDisplay,
      record_id: options?.recordId || null,
      description: options?.description || description,
      old_values: sanitizeAuditValues(options?.oldValues) || null,
      new_values: sanitizeAuditValues(options?.newValues) || null,
      changed_fields: options?.changedFields || null,
      ip_address: options?.ipAddress || '103.21.124.55',
      user_agent: options?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Chrome/128.0 (Windows NT 10.0; Win64)'),
      session_id: sid,
      session_status: 'active',
      created_at: getISTTimestamp(),
    };

    logs.unshift(newLog);
    this.saveActivityLogs(logs.slice(0, 1000));
    this.touchCurrentSession();
    return newLog;
  }

  static addClient(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): { success: boolean; error?: string; client?: Client } {
    const clients = this.getClients();
    const gstin = clientData.gstin.trim().toUpperCase();

    // Check duplicate GSTIN
    if (clients.some((c) => c.gstin.toUpperCase() === gstin)) {
      return { success: false, error: `Client with GSTIN "${gstin}" already exists in Master Database.` };
    }

    const validation = validateGSTIN(gstin);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const now = getISTTimestamp();
    const newId = clients.length > 0 ? Math.max(...clients.map((c) => c.id)) + 1 : 101;
    const newClient: Client = {
      ...clientData,
      id: newId,
      gstin,
      created_at: now,
      updated_at: now,
    };

    clients.unshift(newClient);
    this.saveClients(clients);
    CloudService.syncClientToCloud(newClient).catch((e) => console.warn('Cloud sync client error:', e));
    SupabaseService.syncClient(newClient).catch((e) => console.warn('Supabase sync client error:', e));

    this.logActivity('CREATE', `Added new client: ${newClient.firm_name} (${newClient.gstin})`, {
      module: 'Client',
      clientId: newClient.id,
      clientName: newClient.client_name,
      firmName: newClient.firm_name,
      recordId: newClient.id,
      newValues: sanitizeAuditValues(newClient),
      description: `Created new master client ${newClient.firm_name} with GSTIN ${newClient.gstin} and GST type ${newClient.gst_type}`,
    });

    return { success: true, client: newClient };
  }

  static updateClient(id: number, clientData: Partial<Client>): { success: boolean; error?: string } {
    const clients = this.getClients();
    const index = clients.findIndex((c) => c.id === id);
    if (index === -1) return { success: false, error: 'Client not found.' };

    if (clientData.gstin) {
      const gstin = clientData.gstin.trim().toUpperCase();
      if (clients.some((c) => c.id !== id && c.gstin.toUpperCase() === gstin)) {
        return { success: false, error: `Another client with GSTIN "${gstin}" already exists.` };
      }
      clientData.gstin = gstin;
    }

    const previousClient = { ...clients[index] };
    const now = getISTTimestamp();
    clients[index] = {
      ...clients[index],
      ...clientData,
      updated_at: now,
    };

    this.saveClients(clients);
    CloudService.syncClientToCloud(clients[index]).catch((e) => console.warn('Cloud sync client error:', e));
    SupabaseService.syncClient(clients[index]).catch((e) => console.warn('Supabase sync client error:', e));

    // Compute changed fields diff
    const changedFields: string[] = [];
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    Object.keys(clientData).forEach((key) => {
      const prevVal = (previousClient as any)[key];
      const nextVal = (clients[index] as any)[key];
      if (prevVal !== nextVal) {
        changedFields.push(key);
        oldValues[key] = prevVal;
        newValues[key] = nextVal;
      }
    });

    this.logActivity('EDIT', `Updated client details for ${clients[index].firm_name} (${clients[index].gstin})`, {
      module: 'Client',
      clientId: id,
      clientName: clients[index].client_name,
      firmName: clients[index].firm_name,
      recordId: id,
      oldValues: sanitizeAuditValues(oldValues),
      newValues: sanitizeAuditValues(newValues),
      changedFields,
      description: `Updated master client ${clients[index].firm_name}. Changed: ${changedFields.join(', ') || 'attributes'}`,
    });

    return { success: true };
  }

  static deleteClient(id: number): { success: boolean; error?: string } {
    const clients = this.getClients();
    const client = clients.find((c) => c.id === id);
    if (!client) return { success: false, error: 'Client not found.' };

    const remaining = clients.filter((c) => c.id !== id);
    this.saveClients(remaining);
    CloudService.deleteClientFromCloud(id).catch((e) => console.warn('Cloud delete client error:', e));
    SupabaseService.deleteClient(id).catch((e) => console.warn('Supabase delete client error:', e));

    // Remove client from monthly work and work history
    const monthly = this.getMonthlyWork().filter((m) => m.client_id !== id);
    this.saveMonthlyWork(monthly);

    this.logActivity('DELETE', `Deleted client ${client.firm_name} (${client.gstin})`, {
      module: 'Client',
      clientId: id,
      clientName: client.client_name,
      firmName: client.firm_name,
      recordId: id,
      oldValues: sanitizeAuditValues(client),
      description: `Permanently removed client ${client.firm_name} (GSTIN: ${client.gstin}) from the system`,
    });

    return { success: true };
  }

  static updateMonthlyStatus(
    fyId: number,
    month: string,
    clientId: number,
    newStatus: WorkStatus,
    remark: string
  ): { success: boolean; updatedWork?: MonthlyWork } {
    const currentUser = this.getCurrentUser() || initialUsers[0];
    const monthlyList = this.getMonthlyWork();
    const clients = this.getClients();
    const client = clients.find((c) => c.id === clientId);
    const fys = this.getFinancialYears();
    const fy = fys.find((f) => f.id === fyId);

    const index = monthlyList.findIndex(
      (m) => m.financial_year_id === fyId && m.month === month && m.client_id === clientId
    );

    const now = getISTTimestamp();
    const previousStatus: WorkStatus = index !== -1 ? monthlyList[index].status : 'Not Started';
    const previousRemark = index !== -1 ? monthlyList[index].remark || '' : '';

    let updatedWork: MonthlyWork;

    if (index !== -1) {
      updatedWork = {
        ...monthlyList[index],
        status: newStatus,
        remark,
        updated_by: currentUser.id,
        updated_by_name: currentUser.name,
        updated_at: now,
      };
      monthlyList[index] = updatedWork;
    } else {
      updatedWork = {
        id: Date.now(),
        financial_year_id: fyId,
        month,
        client_id: clientId,
        status: newStatus,
        remark,
        updated_by: currentUser.id,
        updated_by_name: currentUser.name,
        updated_at: now,
      };
      monthlyList.push(updatedWork);
    }

    this.saveMonthlyWork(monthlyList);
    CloudService.syncMonthlyWorkToCloud(updatedWork).catch((e) => console.warn('Cloud sync monthly work error:', e));
    SupabaseService.syncMonthlyWork(updatedWork).catch((e) => console.warn('Supabase sync monthly work error:', e));

    // Audit trail logging
    if (previousStatus !== newStatus || remark !== previousRemark) {
      const historyList = this.getWorkHistory();
      const newHistory: WorkHistory = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        client_id: clientId,
        client_name: client?.client_name,
        firm_name: client?.firm_name,
        financial_year_id: fyId,
        fy_name: fy?.display_name,
        month,
        previous_status: previousStatus,
        new_status: newStatus,
        remark,
        changed_by: currentUser.id,
        changed_by_name: currentUser.name,
        changed_at: now,
      };
      historyList.unshift(newHistory);
      this.saveWorkHistory(historyList.slice(0, 1000));
    }

    this.logActivity(
      'STATUS_CHANGE',
      `Updated ${month} (${fy?.display_name || 'FY'}) status for ${client?.firm_name || 'Client #' + clientId} from "${previousStatus}" to "${newStatus}"`,
      {
        module: 'Monthly Work',
        clientId,
        clientName: client?.client_name,
        firmName: client?.firm_name,
        financialYearId: fyId,
        financialYear: fy?.display_name,
        recordId: updatedWork.id,
        oldValues: { status: previousStatus, remark: previousRemark },
        newValues: { status: newStatus, remark },
        changedFields: ['status', ...(remark !== previousRemark ? ['remark'] : [])],
        description: `Set ${month} work status to ${newStatus}${remark ? ` (Remark: ${remark})` : ''}`,
      }
    );

    return { success: true, updatedWork };
  }

  static addFinancialYear(startYear: number): { success: boolean; error?: string; fy?: FinancialYear } {
    const endYear = startYear + 1;
    const displayName = `${startYear}-${String(endYear).slice(2)}`;
    const fys = this.getFinancialYears();

    if (fys.some((f) => f.display_name === displayName)) {
      return { success: false, error: `Financial Year "${displayName}" already exists.` };
    }

    const newFy: FinancialYear = {
      id: Date.now(),
      start_year: startYear,
      end_year: endYear,
      display_name: displayName,
      start_date: `${startYear}-04-01`,
      end_date: `${endYear}-03-31`,
      is_active: true,
    };

    fys.push(newFy);
    this.saveFinancialYears(fys);

    this.logActivity('CREATE', `Created Financial Year ${displayName}`, {
      module: 'Financial Year',
      financialYear: displayName,
      recordId: newFy.id,
      newValues: sanitizeAuditValues(newFy),
      description: `Created new Financial Year ${displayName} (Period: ${newFy.start_date} to ${newFy.end_date})`,
    });

    return { success: true, fy: newFy };
  }

  static addUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): { success: boolean; error?: string } {
    const users = this.getUsers();
    if (users.some((u) => u.username.toLowerCase() === userData.username.toLowerCase())) {
      return { success: false, error: 'Username is already taken.' };
    }
    if (users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase())) {
      return { success: false, error: 'Email is already registered.' };
    }

    const now = getISTTimestamp();
    const newUser: User = {
      ...userData,
      id: Date.now(),
      created_at: now,
      updated_at: now,
    };
    users.push(newUser);
    this.saveUsers(users);

    this.logActivity('CREATE', `Created ${userData.role.toUpperCase()} user: ${userData.name} (${userData.username})`, {
      module: 'User Management',
      recordId: newUser.id,
      newValues: sanitizeAuditValues(newUser),
      description: `Created new ${userData.role} staff account for ${userData.name} (Email: ${userData.email})`,
    });

    return { success: true };
  }

  // ==========================================
  // BANK ACCOUNTS & TURNOVER
  // ==========================================
  static getBankAccounts(): ClientBankAccount[] {
    const raw = safeGetItem(STORAGE_KEYS.BANK_ACCOUNTS);
    if (!raw) {
      this.saveBankAccounts(initialBankAccounts);
      return initialBankAccounts;
    }
    return safeParse<ClientBankAccount[]>(raw, initialBankAccounts);
  }

  static saveBankAccounts(accounts: ClientBankAccount[]) {
    safeSetItem(STORAGE_KEYS.BANK_ACCOUNTS, JSON.stringify(accounts));
    CloudService.batchSyncBankAccountsToCloud(accounts).catch((e) => console.warn('Cloud sync bank accounts error:', e));
    SupabaseService.syncBankAccounts(accounts).catch((e) => console.warn('Supabase sync bank accounts error:', e));
  }

  static getClientBankAccounts(clientId: number): ClientBankAccount[] {
    const all = this.getBankAccounts();
    return all.filter((a) => a.client_id === clientId).sort((a, b) => a.slot_number - b.slot_number);
  }

  static saveClientBankAccount(accountData: {
    client_id: number;
    slot_number: BankAccountSlot;
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    account_type: ClientBankAccount['account_type'];
    ifsc: string;
    status: ClientBankAccount['status'];
  }): ClientBankAccount {
    const all = this.getBankAccounts();
    const existingIndex = all.findIndex(
      (a) => a.client_id === accountData.client_id && a.slot_number === accountData.slot_number
    );
    const now = getISTTimestamp();

    let savedAccount: ClientBankAccount;
    let isEdit = existingIndex >= 0;
    const previousAccount = isEdit ? { ...all[existingIndex] } : null;

    if (existingIndex >= 0) {
      savedAccount = {
        ...all[existingIndex],
        ...accountData,
        updated_at: now,
      };
      all[existingIndex] = savedAccount;
    } else {
      savedAccount = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        ...accountData,
        created_at: now,
        updated_at: now,
      };
      all.push(savedAccount);
    }

    this.saveBankAccounts(all);
    const client = this.getClientById(accountData.client_id);

    this.logActivity(
      isEdit ? 'EDIT' : 'CREATE',
      `${isEdit ? 'Updated' : 'Added'} Bank Slot #${accountData.slot_number} (${accountData.bank_name}) for ${client?.firm_name || 'Client #' + accountData.client_id}`,
      {
        module: 'Bank Turnover',
        clientId: accountData.client_id,
        clientName: client?.client_name,
        firmName: client?.firm_name,
        recordId: savedAccount.id,
        oldValues: previousAccount ? sanitizeAuditValues(previousAccount) : null,
        newValues: sanitizeAuditValues(savedAccount),
        description: `${isEdit ? 'Updated' : 'Configured'} Bank Account #${accountData.slot_number}: ${accountData.bank_name} (A/C: ${accountData.account_number})`,
      }
    );

    return savedAccount;
  }

  static deleteClientBankAccount(accountId: number): void {
    let all = this.getBankAccounts();
    const target = all.find((a) => a.id === accountId);
    all = all.filter((a) => a.id !== accountId);
    this.saveBankAccounts(all);

    if (target) {
      // Also clean associated turnover & backups for this account
      let turnovers = this.getBankTurnover().filter((t) => t.bank_account_id !== accountId);
      this.saveBankTurnover(turnovers);

      let backups = this.getBankStatementBackups().filter((b) => b.bank_account_id !== accountId);
      this.saveBankStatementBackups(backups);

      const client = this.getClientById(target.client_id);
      this.logActivity(
        'DELETE',
        `Removed Bank Slot #${target.slot_number} (${target.bank_name}) for ${client?.firm_name || 'Client #' + target.client_id}`,
        {
          module: 'Bank Turnover',
          clientId: target.client_id,
          clientName: client?.client_name,
          firmName: client?.firm_name,
          recordId: target.id,
          oldValues: sanitizeAuditValues(target),
          description: `Deleted Bank Account Slot #${target.slot_number} (${target.bank_name} - ${target.account_number}) and its associated records`,
        }
      );
    }
  }

  static getBankTurnover(): ClientBankTurnover[] {
    const raw = safeGetItem(STORAGE_KEYS.BANK_TURNOVER);
    if (!raw) {
      this.saveBankTurnover(initialBankTurnover);
      return initialBankTurnover;
    }
    return safeParse<ClientBankTurnover[]>(raw, initialBankTurnover);
  }

  static saveBankTurnover(turnoverList: ClientBankTurnover[]) {
    safeSetItem(STORAGE_KEYS.BANK_TURNOVER, JSON.stringify(turnoverList));
    CloudService.batchSyncBankTurnoverToCloud(turnoverList).catch((e) => console.warn('Cloud sync bank turnover error:', e));
    SupabaseService.syncBankTurnover(turnoverList).catch((e) => console.warn('Supabase sync bank turnover error:', e));
  }

  static getClientBankTurnover(clientId: number, fyId: number): ClientBankTurnover[] {
    const all = this.getBankTurnover();
    return all.filter((t) => t.client_id === clientId && t.financial_year_id === fyId);
  }

  static batchSaveClientBankTurnover(
    clientId: number,
    bankAccountId: number,
    fyId: number,
    monthlyAmounts: Record<string, number>
  ): void {
    const all = this.getBankTurnover();
    const now = getISTTimestamp();

    // Fetch old records to calculate diff
    const oldRecords = all.filter(
      (t) => t.client_id === clientId && t.bank_account_id === bankAccountId && t.financial_year_id === fyId
    );
    const oldValues: Record<string, number> = {};
    oldRecords.forEach((r) => {
      oldValues[r.month] = r.turnover_amount;
    });

    // Remove existing turnover for this client + bank_account + FY to prevent duplicates
    const filtered = all.filter(
      (t) => !(t.client_id === clientId && t.bank_account_id === bankAccountId && t.financial_year_id === fyId)
    );

    const newValues: Record<string, number> = {};
    const changedMonths: string[] = [];

    // Insert new valid rows
    Object.entries(monthlyAmounts).forEach(([month, amount]) => {
      const numAmount = Number(amount) || 0;
      newValues[month] = numAmount;
      if ((oldValues[month] ?? 0) !== numAmount) {
        changedMonths.push(month);
      }
      filtered.push({
        id: Date.now() + Math.floor(Math.random() * 100000),
        client_id: clientId,
        bank_account_id: bankAccountId,
        financial_year_id: fyId,
        month,
        turnover_amount: numAmount,
        created_at: now,
        updated_at: now,
      });
    });

    this.saveBankTurnover(filtered);

    const client = this.getClientById(clientId);
    const accounts = this.getBankAccounts();
    const bankAccount = accounts.find((a) => a.id === bankAccountId);
    const fy = this.getFinancialYears().find((f) => f.id === fyId);

    this.logActivity(
      'SAVE',
      `Saved Bank Turnover for Slot #${bankAccount?.slot_number || '1'} (${bankAccount?.bank_name || 'Bank'}) for ${client?.firm_name || 'Client #' + clientId} (${fy?.display_name || ''})`,
      {
        module: 'Bank Turnover',
        clientId,
        clientName: client?.client_name,
        firmName: client?.firm_name,
        financialYearId: fyId,
        financialYear: fy?.display_name,
        recordId: bankAccountId,
        oldValues,
        newValues,
        changedFields: changedMonths,
        description: `Updated 12-month Bank Turnover figures for ${bankAccount?.bank_name} (${changedMonths.length} months modified)`,
      }
    );
  }

  static getBankStatementBackups(): BankStatementBackup[] {
    const raw = safeGetItem(STORAGE_KEYS.BANK_STATEMENTS);
    if (!raw) {
      this.saveBankStatementBackups(initialBankStatementBackups);
      return initialBankStatementBackups;
    }
    return safeParse<BankStatementBackup[]>(raw, initialBankStatementBackups);
  }

  static saveBankStatementBackups(backups: BankStatementBackup[]) {
    safeSetItem(STORAGE_KEYS.BANK_STATEMENTS, JSON.stringify(backups));
  }

  static getClientBankStatements(clientId: number, fyId: number): BankStatementBackup[] {
    const all = this.getBankStatementBackups();
    return all.filter((b) => b.client_id === clientId && b.financial_year_id === fyId);
  }

  static saveBankStatementBackup(backupData: {
    client_id: number;
    bank_account_id: number;
    financial_year_id: number;
    file_name: string;
    file_size: number;
    file_data_base64?: string;
  }): BankStatementBackup {
    const all = this.getBankStatementBackups();
    const currentUser = this.getCurrentUser() || initialUsers[0];
    const now = getISTTimestamp();

    // Random safe stored filename
    const randomHex = Math.random().toString(36).substring(2, 10);
    const storedFileName = `stmt_${backupData.client_id}_${backupData.bank_account_id}_${backupData.financial_year_id}_${randomHex}.zip`;

    // Filter out previous backup for this slot & FY if replacing
    const existing = all.find(
      (b) =>
        b.client_id === backupData.client_id &&
        b.bank_account_id === backupData.bank_account_id &&
        b.financial_year_id === backupData.financial_year_id
    );

    const filtered = all.filter(
      (b) =>
        !(
          b.client_id === backupData.client_id &&
          b.bank_account_id === backupData.bank_account_id &&
          b.financial_year_id === backupData.financial_year_id
        )
    );

    const newBackup: BankStatementBackup = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      client_id: backupData.client_id,
      bank_account_id: backupData.bank_account_id,
      financial_year_id: backupData.financial_year_id,
      file_name: backupData.file_name,
      stored_file_name: storedFileName,
      file_size: backupData.file_size,
      file_data_base64: backupData.file_data_base64,
      uploaded_at: now,
      uploaded_by: currentUser.id,
      uploaded_by_name: currentUser.name,
    };

    filtered.push(newBackup);
    this.saveBankStatementBackups(filtered);

    const client = this.getClientById(backupData.client_id);
    const bankAccount = this.getBankAccounts().find((a) => a.id === backupData.bank_account_id);
    const fy = this.getFinancialYears().find((f) => f.id === backupData.financial_year_id);

    this.logActivity(
      'UPLOAD',
      `Uploaded ZIP Statement Backup (${backupData.file_name}, ${(backupData.file_size / 1024).toFixed(1)} KB) for ${client?.firm_name || 'Client #' + backupData.client_id}`,
      {
        module: 'Bank Statement',
        clientId: backupData.client_id,
        clientName: client?.client_name,
        firmName: client?.firm_name,
        financialYearId: backupData.financial_year_id,
        financialYear: fy?.display_name,
        recordId: newBackup.id,
        oldValues: existing ? { file_name: existing.file_name, file_size: existing.file_size } : null,
        newValues: { file_name: backupData.file_name, file_size: backupData.file_size },
        description: `Uploaded 12-month ZIP statement for Slot #${bankAccount?.slot_number || '1'} (${bankAccount?.bank_name}) - File: ${backupData.file_name}`,
      }
    );

    return newBackup;
  }

  static deleteBankStatementBackup(backupId: number): void {
    let all = this.getBankStatementBackups();
    const target = all.find((b) => b.id === backupId);
    all = all.filter((b) => b.id !== backupId);
    this.saveBankStatementBackups(all);

    if (target) {
      const client = this.getClientById(target.client_id);
      const fy = this.getFinancialYears().find((f) => f.id === target.financial_year_id);
      this.logActivity(
        'DELETE',
        `Deleted Statement Backup (${target.file_name}) for ${client?.firm_name || 'Client #' + target.client_id}`,
        {
          module: 'Bank Statement',
          clientId: target.client_id,
          clientName: client?.client_name,
          firmName: client?.firm_name,
          financialYearId: target.financial_year_id,
          financialYear: fy?.display_name,
          recordId: target.id,
          oldValues: { file_name: target.file_name, file_size: target.file_size },
          description: `Removed ZIP statement backup file ${target.file_name}`,
        }
      );
    }
  }

  static getClientBankTurnoverSummary(clientId: number, fyId: number): {
    accountCount: number;
    grandTotal: number;
    accounts: ClientBankAccount[];
    accountTotals: Record<number, number>;
  } {
    const accounts = this.getClientBankAccounts(clientId);
    const turnovers = this.getClientBankTurnover(clientId, fyId);

    const accountTotals: Record<number, number> = {};
    let grandTotal = 0;

    accounts.forEach((acc) => {
      const accTurnovers = turnovers.filter((t) => t.bank_account_id === acc.id);
      const total = accTurnovers.reduce((sum, t) => sum + (Number(t.turnover_amount) || 0), 0);
      accountTotals[acc.id] = total;
      grandTotal += total;
    });

    return {
      accountCount: accounts.length,
      grandTotal,
      accounts,
      accountTotals,
    };
  }

  // ==========================================
  // GST MONTHLY TURNOVER (TAXABLE + EXEMPT)
  // ==========================================
  static getGstTurnover(): ClientGstTurnover[] {
    const raw = safeGetItem(STORAGE_KEYS.GST_TURNOVER);
    if (!raw) {
      this.saveGstTurnover(initialGstTurnover);
      return initialGstTurnover;
    }
    return safeParse<ClientGstTurnover[]>(raw, initialGstTurnover);
  }

  static saveGstTurnover(turnoverList: ClientGstTurnover[]) {
    safeSetItem(STORAGE_KEYS.GST_TURNOVER, JSON.stringify(turnoverList));
    CloudService.batchSyncGstTurnoverToCloud(turnoverList).catch((e) => console.warn('Cloud sync GST turnover error:', e));
    SupabaseService.syncGstTurnover(turnoverList).catch((e) => console.warn('Supabase sync GST turnover error:', e));
  }

  static getClientGstTurnover(clientId: number, fyId: number): ClientGstTurnover[] {
    const all = this.getGstTurnover();
    return all.filter((g) => g.client_id === clientId && g.financial_year_id === fyId);
  }

  static batchSaveClientGstTurnover(
    clientId: number,
    fyId: number,
    monthlyData: Record<string, { taxable: number; exempt: number; remark?: string }>
  ): void {
    const all = this.getGstTurnover();
    const now = getISTTimestamp();

    // Fetch existing records to compute diff
    const oldRecords = all.filter(
      (g) => g.client_id === clientId && g.financial_year_id === fyId
    );
    const oldValues: Record<string, any> = {};
    oldRecords.forEach((r) => {
      oldValues[`${r.month}_taxable`] = r.taxable_turnover;
      oldValues[`${r.month}_exempt`] = r.exempt_turnover;
      oldValues[`${r.month}_total`] = r.total_gst_turnover;
      oldValues[`${r.month}_remark`] = r.remark || '';
    });

    // Remove existing turnover for this client + FY
    const filtered = all.filter(
      (g) => !(g.client_id === clientId && g.financial_year_id === fyId)
    );

    const newValues: Record<string, any> = {};
    const changedMonths: string[] = [];

    Object.entries(monthlyData).forEach(([month, data]) => {
      const taxable = Number(data.taxable) || 0;
      const exempt = Number(data.exempt) || 0;
      const total = taxable + exempt;
      const remark = data.remark?.trim() || '';

      newValues[`${month}_taxable`] = taxable;
      newValues[`${month}_exempt`] = exempt;
      newValues[`${month}_total`] = total;
      newValues[`${month}_remark`] = remark;

      if (
        (oldValues[`${month}_taxable`] ?? 0) !== taxable ||
        (oldValues[`${month}_exempt`] ?? 0) !== exempt ||
        (oldValues[`${month}_remark`] ?? '') !== remark
      ) {
        changedMonths.push(month);
      }

      filtered.push({
        id: Date.now() + Math.floor(Math.random() * 100000),
        client_id: clientId,
        financial_year_id: fyId,
        month,
        taxable_turnover: taxable,
        exempt_turnover: exempt,
        total_gst_turnover: total,
        remark: remark || '',
        created_at: now,
        updated_at: now,
      });
    });

    this.saveGstTurnover(filtered);
    const client = this.getClientById(clientId);
    const fy = this.getFinancialYears().find((f) => f.id === fyId);

    this.logActivity(
      'SAVE',
      `Saved GST Turnover figures for ${client?.firm_name || 'Client #' + clientId} (${fy?.display_name || ''})`,
      {
        module: 'GST Turnover',
        clientId,
        clientName: client?.client_name,
        firmName: client?.firm_name,
        financialYearId: fyId,
        financialYear: fy?.display_name,
        oldValues,
        newValues,
        changedFields: changedMonths,
        description: `Saved 12-month GST turnover (Taxable + Exempt + Remarks) for ${client?.firm_name} (${changedMonths.length} months modified)`,
      }
    );
  }

  static saveClientMonthGstTurnover(
    clientId: number,
    fyId: number,
    month: string,
    taxable: number,
    exempt: number,
    remark?: string
  ): ClientGstTurnover {
    const all = this.getGstTurnover();
    const now = getISTTimestamp();
    const taxableNum = Number(taxable) || 0;
    const exemptNum = Number(exempt) || 0;
    const total = taxableNum + exemptNum;
    const remarkStr = remark?.trim() || '';

    const existingIndex = all.findIndex(
      (g) => g.client_id === clientId && g.financial_year_id === fyId && g.month === month
    );

    let result: ClientGstTurnover;
    if (existingIndex >= 0) {
      result = {
        ...all[existingIndex],
        taxable_turnover: taxableNum,
        exempt_turnover: exemptNum,
        total_gst_turnover: total,
        remark: remarkStr || '',
        updated_at: now,
      };
      all[existingIndex] = result;
    } else {
      result = {
        id: Date.now() + Math.floor(Math.random() * 10000),
        client_id: clientId,
        financial_year_id: fyId,
        month,
        taxable_turnover: taxableNum,
        exempt_turnover: exemptNum,
        total_gst_turnover: total,
        remark: remarkStr || '',
        created_at: now,
        updated_at: now,
      };
      all.push(result);
    }

    this.saveGstTurnover(all);

    const client = this.getClientById(clientId);
    const fy = this.getFinancialYears().find((f) => f.id === fyId);

    this.logActivity(
      'SAVE',
      `Saved ${month} GST Turnover for ${client?.firm_name || 'Client #' + clientId} (Taxable: ₹${taxableNum.toLocaleString('en-IN')}, Exempt: ₹${exemptNum.toLocaleString('en-IN')})`,
      {
        module: 'GST Turnover',
        clientId,
        clientName: client?.client_name,
        firmName: client?.firm_name,
        financialYearId: fyId,
        financialYear: fy?.display_name,
        description: `Manual turnover entry: ${month} (Taxable: ₹${taxableNum}, Exempt: ₹${exemptNum}, Total: ₹${total})`,
      }
    );

    return result;
  }

  // ==========================================
  // REPORT COMPILER HELPER (REAL-TIME AGGREGATION)
  // ==========================================
  static getFinancialReportData(clientId: number, fyId: number): FinancialReportData | null {
    const client = this.getClientById(clientId);
    if (!client) return null;

    const fys = this.getFinancialYears();
    const financialYear = fys.find((f) => f.id === fyId) || fys[0];

    // 1. GST Turnover (Taxable + Exempt + Total)
    const gstRecords = this.getClientGstTurnover(clientId, fyId);
    let totalTaxable = 0;
    let totalExempt = 0;
    let totalGst = 0;

    const gstRows = FY_MONTHS.map((m) => {
      const rec = gstRecords.find((r) => r.month === m);
      const taxable = rec ? Number(rec.taxable_turnover) || 0 : 0;
      const exempt = rec ? Number(rec.exempt_turnover) || 0 : 0;
      const total = taxable + exempt;

      totalTaxable += taxable;
      totalExempt += exempt;
      totalGst += total;

      return {
        month: m,
        taxable,
        exempt,
        total,
      };
    });

    // 2. Bank Accounts (Up to 5 slots)
    const bankAccountsList = this.getClientBankAccounts(clientId);
    const bankTurnovers = this.getClientBankTurnover(clientId, fyId);

    const slotNumbers: BankAccountSlot[] = [1, 2, 3, 4, 5];
    let totalBankTurnover = 0;

    const bankAccounts = slotNumbers.map((slotNum) => {
      const acc = bankAccountsList.find((a) => a.slot_number === slotNum) || null;
      const monthlyTurnover: Record<string, number> = {};
      let accTotal = 0;

      FY_MONTHS.forEach((m) => {
        if (acc) {
          const rec = bankTurnovers.find(
            (t) => t.bank_account_id === acc.id && t.month === m
          );
          const amt = rec ? Number(rec.turnover_amount) || 0 : 0;
          monthlyTurnover[m] = amt;
          accTotal += amt;
        } else {
          monthlyTurnover[m] = 0;
        }
      });

      if (acc) {
        totalBankTurnover += accTotal;
      }

      return {
        slotNumber: slotNum,
        account: acc,
        monthlyTurnover,
        total: accTotal,
      };
    });

    return {
      client,
      financialYear,
      gstRows,
      gstTotals: {
        taxable: totalTaxable,
        exempt: totalExempt,
        total: totalGst,
      },
      bankAccounts,
      totalBankTurnover,
    };
  }

  // ==========================================
  // OFFICE CLIENT ENTRY / VISIT REGISTER
  // ==========================================

  static getOfficeVisits(): OfficeVisit[] {
    const raw = safeGetItem(STORAGE_KEYS.OFFICE_VISITS);
    if (!raw) {
      this.saveOfficeVisits(initialOfficeVisits);
      return initialOfficeVisits;
    }
    return safeParse<OfficeVisit[]>(raw, initialOfficeVisits);
  }

  static saveOfficeVisits(visits: OfficeVisit[]) {
    safeSetItem(STORAGE_KEYS.OFFICE_VISITS, JSON.stringify(visits));
  }

  static getOfficeVisitById(id: number): OfficeVisit | undefined {
    return this.getOfficeVisits().find((v) => v.id === id);
  }

  static getVisitsByClientId(clientId: number): OfficeVisit[] {
    return this.getOfficeVisits().filter((v) => v.client_id === clientId);
  }

  static getVisitsByMobile(mobile: string): OfficeVisit[] {
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!cleanMobile) return [];
    return this.getOfficeVisits().filter(
      (v) => v.mobile.replace(/\D/g, '') === cleanMobile
    );
  }

  static addOfficeVisit(
    data: Omit<OfficeVisit, 'id' | 'created_at' | 'updated_at' | 'updated_by_id' | 'updated_by_name' | 'remarks_log'> & {
      initial_note?: string;
    }
  ): { success: boolean; visit?: OfficeVisit; error?: string } {
    const visits = this.getOfficeVisits();
    const now = getISTTimestamp();
    const currentUser = this.getCurrentUser();

    const newId = Date.now();
    const entryByName = currentUser?.name || data.entry_by_name || 'Staff User';
    const entryById = currentUser?.id || data.entry_by_id || 1;

    const initialLog: OfficeVisitNote[] = [
      {
        id: `note-${newId}-init`,
        note: data.initial_note?.trim() || data.current_remark?.trim() || `Marked IN for ${data.purpose}`,
        action_type: 'entry_in',
        staff_id: entryById,
        staff_name: entryByName,
        timestamp: now,
      },
    ];

    const newVisit: OfficeVisit = {
      ...data,
      id: newId,
      status: 'IN',
      entry_by_id: entryById,
      entry_by_name: entryByName,
      out_marked_by_id: null,
      out_marked_by_name: null,
      out_time: null,
      current_remark: data.current_remark?.trim() || (data.initial_note?.trim() ?? ''),
      remarks_log: initialLog,
      created_at: now,
      updated_at: now,
      updated_by_id: entryById,
      updated_by_name: entryByName,
    };

    visits.unshift(newVisit);
    this.saveOfficeVisits(visits);
    CloudService.syncOfficeVisitToCloud(newVisit).catch((e) => console.warn('Cloud sync visit error:', e));
    SupabaseService.syncOfficeVisit(newVisit).catch((e) => console.warn('Supabase sync visit error:', e));

    // Audit log
    this.logActivity(
      'CREATE_OFFICE_VISIT',
      `Visitor marked IN: ${newVisit.firm_name || newVisit.client_name} (${newVisit.visitor_type.toUpperCase()}) for "${newVisit.purpose}" at ${newVisit.in_time}`,
      {
        module: 'Office Client Entry',
        clientId: newVisit.client_id || undefined,
        clientName: newVisit.client_name || undefined,
        firmName: newVisit.firm_name || undefined,
        recordId: newVisit.id,
        newValues: sanitizeAuditValues(newVisit),
      }
    );

    return { success: true, visit: newVisit };
  }

  static updateOfficeVisit(
    id: number,
    data: Partial<Omit<OfficeVisit, 'id' | 'created_at' | 'remarks_log'>> & {
      new_note?: string;
    }
  ): { success: boolean; visit?: OfficeVisit; error?: string } {
    const visits = this.getOfficeVisits();
    const idx = visits.findIndex((v) => v.id === id);
    if (idx === -1) {
      return { success: false, error: 'Visit record not found' };
    }

    const existing = visits[idx];
    const now = getISTTimestamp();
    const currentUser = this.getCurrentUser();
    const staffName = currentUser?.name || 'Staff User';
    const staffId = currentUser?.id || 1;

    const updatedNotes = [...existing.remarks_log];

    if (data.new_note && data.new_note.trim()) {
      updatedNotes.push({
        id: `note-${id}-${Date.now()}`,
        note: data.new_note.trim(),
        action_type: 'note_added',
        staff_id: staffId,
        staff_name: staffName,
        timestamp: now,
      });
    }

    const updatedVisit: OfficeVisit = {
      ...existing,
      ...data,
      current_remark: data.current_remark ?? (data.new_note ? data.new_note.trim() : existing.current_remark),
      remarks_log: updatedNotes,
      updated_at: now,
      updated_by_id: staffId,
      updated_by_name: staffName,
    };

    visits[idx] = updatedVisit;
    this.saveOfficeVisits(visits);
    CloudService.syncOfficeVisitToCloud(updatedVisit).catch((e) => console.warn('Cloud sync visit error:', e));
    SupabaseService.syncOfficeVisit(updatedVisit).catch((e) => console.warn('Supabase sync visit error:', e));

    // Audit log
    this.logActivity(
      'UPDATE_OFFICE_VISIT',
      `Updated office visit record for ${updatedVisit.firm_name || updatedVisit.client_name}`,
      {
        module: 'Office Client Entry',
        clientId: updatedVisit.client_id || undefined,
        clientName: updatedVisit.client_name || undefined,
        firmName: updatedVisit.firm_name || undefined,
        recordId: id,
        oldValues: sanitizeAuditValues(existing),
        newValues: sanitizeAuditValues(updatedVisit),
      }
    );

    return { success: true, visit: updatedVisit };
  }

  static markVisitOut(
    id: number,
    outTime: string,
    outRemark?: string
  ): { success: boolean; visit?: OfficeVisit; error?: string } {
    const visits = this.getOfficeVisits();
    const idx = visits.findIndex((v) => v.id === id);
    if (idx === -1) {
      return { success: false, error: 'Visit record not found' };
    }

    const existing = visits[idx];
    const now = getISTTimestamp();
    const currentUser = this.getCurrentUser();
    const staffName = currentUser?.name || 'Staff User';
    const staffId = currentUser?.id || 1;

    const updatedNotes = [...existing.remarks_log];
    const exitNote = outRemark?.trim()
      ? `Client marked OUT at ${outTime}. Note: ${outRemark.trim()}`
      : `Client marked OUT from office at ${outTime}.`;

    updatedNotes.push({
      id: `note-${id}-out-${Date.now()}`,
      note: exitNote,
      action_type: 'marked_out',
      staff_id: staffId,
      staff_name: staffName,
      timestamp: now,
    });

    const updatedVisit: OfficeVisit = {
      ...existing,
      status: 'OUT',
      out_time: outTime,
      out_marked_by_id: staffId,
      out_marked_by_name: staffName,
      current_remark: outRemark?.trim() || existing.current_remark,
      remarks_log: updatedNotes,
      updated_at: now,
      updated_by_id: staffId,
      updated_by_name: staffName,
    };

    visits[idx] = updatedVisit;
    this.saveOfficeVisits(visits);
    CloudService.syncOfficeVisitToCloud(updatedVisit).catch((e) => console.warn('Cloud sync visit out error:', e));

    // Audit log
    this.logActivity(
      'MARK_OUT_OFFICE_VISIT',
      `Visitor marked OUT: ${updatedVisit.firm_name || updatedVisit.client_name} at ${outTime} by ${staffName}`,
      {
        module: 'Office Client Entry',
        clientId: updatedVisit.client_id || undefined,
        clientName: updatedVisit.client_name || undefined,
        firmName: updatedVisit.firm_name || undefined,
        recordId: id,
        oldValues: sanitizeAuditValues(existing),
        newValues: sanitizeAuditValues(updatedVisit),
      }
    );

    return { success: true, visit: updatedVisit };
  }

  static addVisitNote(
    id: number,
    noteText: string
  ): { success: boolean; visit?: OfficeVisit; error?: string } {
    if (!noteText.trim()) return { success: false, error: 'Note cannot be empty' };
    return this.updateOfficeVisit(id, { new_note: noteText.trim() });
  }

  static deleteOfficeVisit(id: number): { success: boolean; error?: string } {
    const visits = this.getOfficeVisits();
    const existing = visits.find((v) => v.id === id);
    if (!existing) return { success: false, error: 'Visit record not found' };

    const filtered = visits.filter((v) => v.id !== id);
    this.saveOfficeVisits(filtered);
    CloudService.deleteOfficeVisitFromCloud(id).catch((e) => console.warn('Cloud delete visit error:', e));

    // Audit log
    this.logActivity(
      'DELETE_OFFICE_VISIT',
      `Deleted visit record for ${existing.firm_name || existing.client_name}`,
      {
        module: 'Office Client Entry',
        clientId: existing.client_id || undefined,
        clientName: existing.client_name || undefined,
        firmName: existing.firm_name || undefined,
        recordId: id,
        oldValues: sanitizeAuditValues(existing),
      }
    );

    return { success: true };
  }

  static resetToDefaultSeed() {
    safeRemoveItem(STORAGE_KEYS.USERS);
    safeRemoveItem(STORAGE_KEYS.CLIENTS);
    safeRemoveItem(STORAGE_KEYS.FINANCIAL_YEARS);
    safeRemoveItem(STORAGE_KEYS.MONTHLY_WORK);
    safeRemoveItem(STORAGE_KEYS.WORK_HISTORY);
    safeRemoveItem(STORAGE_KEYS.ACTIVITY_LOGS);
    safeRemoveItem(STORAGE_KEYS.SETTINGS);
    safeRemoveItem(STORAGE_KEYS.CURRENT_USER_ID);
    safeRemoveItem(STORAGE_KEYS.SELECTED_FY_ID);
    safeRemoveItem(STORAGE_KEYS.SELECTED_MONTH);
    safeRemoveItem(STORAGE_KEYS.BANK_ACCOUNTS);
    safeRemoveItem(STORAGE_KEYS.BANK_TURNOVER);
    safeRemoveItem(STORAGE_KEYS.BANK_STATEMENTS);
    safeRemoveItem(STORAGE_KEYS.GST_TURNOVER);
    safeRemoveItem(STORAGE_KEYS.OFFICE_VISITS);
    safeRemoveItem(STORAGE_KEYS.PASSWORD_RESETS);
  }
}
