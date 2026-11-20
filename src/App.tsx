/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  RawRecord,
  RecordItem,
  ReportDocument,
  DepartmentSummary,
  ActiveView,
  UserAccount,
  PROGRAM_LEVEL_USERS,
  getRecordApprovalStatus,
  matchesAssignedDepartment,
  parseAssignedDepartments,
  matchesProgramLevelScope,
  parseProgramLevelScopes,
  emailsMatch,
  phonesMatch
} from './types';
import { INITIAL_RECORDS, INITIAL_REPORT, DEFAULT_PREPARED_BY, normalizePreparedByOffice } from './data/initialData';
import { computeAnalytics, YEARS, getDefaultSourceCell, resolveDynamicReportTitle, formatNum, formatPct } from './data/analytics';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ReportPaper } from './components/ReportPaper';
import { DepartmentView } from './components/DepartmentView';
import { DataLedgerView } from './components/DataLedgerView';
import { PrintPreview } from './components/PrintPreview';
import { RecordModal } from './components/RecordModal';
import { DepartmentModal } from './components/DepartmentModal';
import { NewReportModal } from './components/NewReportModal';
import { AdminLogin } from './components/AdminLogin';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { LoginHistoryModal } from './components/LoginHistoryModal';
import { UserManagementModal } from './components/UserManagementModal';
import { DocumentationModal } from './components/DocumentationModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { GoogleChatModal } from './components/GoogleChatModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Menu, Edit3, Printer, Save, RefreshCw, Building2, Check, X } from 'lucide-react';
import { exportReportToPDF, ensureImagesLoadedForPrint } from './utils/exportPdf';
import {
  saveReportToFirestore,
  seedReportsToFirestore,
  deleteReportFromFirestore,
  saveUserToFirestore,
  seedUsersToFirestore,
  deleteUserFromFirestore,
  syncRecordsCollectionToFirestore,
  resetRecordsInFirestore,
  saveLoginLogToFirestore,
  handleFirestoreError,
  OperationType,
} from './services/firestoreSync';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY_REPORTS = 'osu-report-studio-v2';
const STORAGE_KEY_DATA = 'osu-data-v2';
const STORAGE_KEY_ADMIN_PWD = 'osu-admin-pwd-v1';
const STORAGE_KEY_ADMIN_AUTH = 'osu-admin-auth-v1';
const STORAGE_KEY_SEEDED_VIEWER = 'osu-seeded-student-viewer-v1';
const DEFAULT_ADMIN_PASSWORD = '1';

function getBaseRecordDocId(r: RawRecord): string {
  return `rec-${r[0]}-${r[1]}-${r[2]}-${r[3]}-${r[4]}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 118);
}

function getRecordDocIds(list: RawRecord[]): string[] {
  const counts = new Map<string, number>();
  return list.map((r) => {
    const base = getBaseRecordDocId(r);
    const idx = counts.get(base) || 0;
    counts.set(base, idx + 1);
    return idx === 0 ? base : `${base}__${idx}`;
  });
}

function serializeRawRecord(r: RawRecord): string {
  return JSON.stringify([
    r[0],
    r[1],
    r[2],
    r[3],
    r[4] ?? null,
    r[5] ?? null,
    r[6] ?? null,
    r[7] ?? null,
    r[8] ?? null,
    r[9] || 'approved',
    r[10] ?? null,
  ]);
}

function sortRecordsDeterministically(list: RawRecord[]): RawRecord[] {
  return [...list].sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    const p = (a[1] || '').localeCompare(b[1] || '');
    if (p !== 0) return p;
    const d = (a[2] || '').localeCompare(b[2] || '');
    if (d !== 0) return d;
    const m = (a[3] || '').localeCompare(b[3] || '');
    if (m !== 0) return m;
    return (a[4] || '').localeCompare(b[4] || '');
  });
}

function enforceSingleAdminUsers(list: UserAccount[]): UserAccount[] {
  const normalized = list.map((u) => {
    if (u.role === 'admin' && u.username !== 'admin') {
      return {
        ...u,
        role: 'all_viewer' as const,
        roleTitle: 'All Student List Viewer (Non-Admin)',
        departmentOfferStatus: u.departmentOfferStatus || 'offered',
      };
    }
    return u;
  });

  if (!normalized.some((u) => u.username === 'admin')) {
    const defaultAdmin = PROGRAM_LEVEL_USERS.find((u) => u.username === 'admin');
    if (defaultAdmin) normalized.unshift(defaultAdmin);
  }

  try {
    const alreadySeeded = localStorage.getItem(STORAGE_KEY_SEEDED_VIEWER) === 'true';
    if (!alreadySeeded && !normalized.some((u) => u.username === 'student_viewer')) {
      const defaultViewer = PROGRAM_LEVEL_USERS.find((u) => u.username === 'student_viewer');
      if (defaultViewer) normalized.push(defaultViewer);
      localStorage.setItem(STORAGE_KEY_SEEDED_VIEWER, 'true');
    }
  } catch {}

  return normalized;
}

export default function App() {
  // --- Admin Authentication State ---
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ADMIN_PWD) || DEFAULT_ADMIN_PASSWORD;
    } catch {
      return DEFAULT_ADMIN_PASSWORD;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true' ||
             localStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true';
    } catch {
      return false;
    }
  });

  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [userManagementModalOpen, setUserManagementModalOpen] = useState(false);

  // Persistent Users List (Only 1 admin account: @admin)
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const stored = localStorage.getItem('osu-user-accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return enforceSingleAdminUsers(parsed);
        }
      }
    } catch {}
    return enforceSingleAdminUsers(PROGRAM_LEVEL_USERS);
  });

  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount>(() => {
    try {
      const stored = localStorage.getItem('osu-current-user-account');
      if (stored) {
        const parsed = JSON.parse(stored) as UserAccount;
        if (parsed.role === 'admin' && parsed.username !== 'admin') {
          return {
            ...parsed,
            role: 'all_viewer',
            roleTitle: 'All Student List Viewer (Non-Admin)',
          };
        }
        return parsed;
      }
    } catch {}
    return PROGRAM_LEVEL_USERS[0];
  });
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ADMIN_AUTH) || PROGRAM_LEVEL_USERS[0].name;
    } catch {
      return PROGRAM_LEVEL_USERS[0].name;
    }
  });
  const [loginHistory, setLoginHistory] = useState<{ username: string; timestamp: number }[]>(() => {
    try {
      const stored = localStorage.getItem('osu-login-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // --- Persistent State ---
  const [records, setRecords] = useState<RawRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DATA);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load records from storage, using initial data', e);
    }
    return INITIAL_RECORDS;
  });

  const [reports, setReports] = useState<ReportDocument[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REPORTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((rep: ReportDocument) => ({
            ...rep,
            preparedBy: normalizePreparedByOffice(rep.preparedBy),
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load reports from storage, using initial report', e);
    }
    return [INITIAL_REPORT];
  });

  const [activeReportId, setActiveReportId] = useState<string>(() => {
    return reports[0]?.id || INITIAL_REPORT.id;
  });

  // --- Active UI View State ---
  const [activeView, setActiveView] = useState<ActiveView>('report');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // --- Modals State ---
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RawRecord | null>(null);
  const [editingRecordIndex, setEditingRecordIndex] = useState<number | null>(null);

  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentSummary | null>(null);

  const [newReportModalOpen, setNewReportModalOpen] = useState(false);
  const [loginHistoryModalOpen, setLoginHistoryModalOpen] = useState(false);
  const [documentationModalOpen, setDocumentationModalOpen] = useState(false);
  const [googleSheetsModalOpen, setGoogleSheetsModalOpen] = useState(false);
  const [googleChatModalOpen, setGoogleChatModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Show Toast
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // User Management Handlers (Admin exclusive, Single Admin Policy enforced)
  const handleAddUser = (account: UserAccount) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can add new user accounts.', 'error');
      return;
    }
    const sanitizedAccount: UserAccount =
      account.role === 'admin' || account.username === 'admin'
        ? {
            ...account,
            role: 'all_viewer',
            roleTitle: 'All Student List Viewer (Non-Admin)',
            programLevelScope: account.programLevelScope || 'ALL',
            assignedDepartment: account.assignedDepartment || 'ALL',
          }
        : account;

    const updated = [...users, sanitizedAccount];
    setUsers(updated);
    try {
      localStorage.setItem('osu-user-accounts', JSON.stringify(updated));
    } catch {}
    saveUserToFirestore(sanitizedAccount).catch(() => {
      addToast('Failed to sync new user account to database.', 'error');
    });
    addToast(
      `Created user account for "${sanitizedAccount.name}" (${sanitizedAccount.roleTitle}).`,
      'success'
    );
  };

  const handleUpdateUser = (account: UserAccount) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can edit user accounts.', 'error');
      return;
    }
    const sanitizedAccount: UserAccount =
      account.username === 'admin'
        ? {
            ...account,
            role: 'admin',
            programLevelScope: 'ALL',
            assignedDepartment: 'ALL',
          }
        : account.role === 'admin'
        ? {
            ...account,
            role: 'all_viewer',
            roleTitle: 'All Student List Viewer (Non-Admin)',
          }
        : account;

    const updated = users.map((u) => (u.username === sanitizedAccount.username ? sanitizedAccount : u));
    setUsers(updated);
    try {
      localStorage.setItem('osu-user-accounts', JSON.stringify(updated));
    } catch {}
    saveUserToFirestore(sanitizedAccount).catch(() => {
      addToast('Failed to sync user update to database.', 'error');
    });
    if (currentUserAccount.username === sanitizedAccount.username) {
      setCurrentUserAccount(sanitizedAccount);
      setCurrentUser(sanitizedAccount.name);
    }
    addToast(`Updated user account "${sanitizedAccount.name}".`, 'success');
  };

  // Internal helper so department coordinators / viewers can update their own offer/completion status
  const updateOwnCoordinatorStatus = (account: UserAccount) => {
    const updated = users.map((u) => (u.username === account.username ? account : u));
    setUsers(updated);
    try {
      localStorage.setItem('osu-user-accounts', JSON.stringify(updated));
      localStorage.setItem('osu-current-user-account', JSON.stringify(account));
    } catch {}
    saveUserToFirestore(account).catch(() => {
      addToast('Failed to sync coordinator status to database.', 'error');
    });
    if (currentUserAccount.username === account.username) {
      setCurrentUserAccount(account);
    }
  };

  const handleDeleteUser = (username: string) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can delete user accounts.', 'error');
      return;
    }
    if (username === 'admin') {
      addToast('Cannot delete the sole System Administrator account (@admin).', 'error');
      return;
    }
    if (username === currentUserAccount.username) {
      addToast('Cannot delete the currently active logged-in user account. Switch to another account first.', 'error');
      return;
    }
    const targetUser = users.find((u) => u.username === username);
    if (!targetUser) {
      addToast(`User account "${username}" not found.`, 'error');
      return;
    }
    if (targetUser.role === 'admin') {
      addToast('Cannot delete the sole System Administrator account.', 'error');
      return;
    }
    const updated = users.filter((u) => u.username !== username);
    setUsers(updated);
    try {
      localStorage.setItem('osu-user-accounts', JSON.stringify(updated));
    } catch {}
    deleteUserFromFirestore(username).catch(() => {
      addToast('Failed to delete user from database.', 'error');
    });
    addToast(`Deleted user account "${targetUser.name}" (@${username}).`, 'info');
  };

  // Admin Auth Handlers
  const handleLogin = (enteredPassword: string, remember: boolean, userAccount?: UserAccount): boolean => {
    const input = enteredPassword.trim();
    const selected = userAccount || users[0] || PROGRAM_LEVEL_USERS[0];
    const userPass = selected.password || '1';

    // Strict authentication check: regular users must use their assigned password; admin can use userPass or adminPassword
    const isAuthenticatedValid =
      selected.role === 'admin'
        ? input === userPass || input === adminPassword
        : input === userPass;

    if (isAuthenticatedValid) {
      setIsAuthenticated(true);
      setCurrentUser(selected.name);
      setCurrentUserAccount(selected);
      const newHistoryEntry = { username: `${selected.name} (${selected.roleTitle})`, timestamp: Date.now() };
      const nextHistory = [newHistoryEntry, ...loginHistory];
      setLoginHistory(nextHistory);
      if (remember) {
        localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, selected.name);
        localStorage.setItem('osu-current-user-account', JSON.stringify(selected));
      } else {
        sessionStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
      }
      localStorage.setItem('osu-login-history', JSON.stringify(nextHistory));
      saveLoginLogToFirestore(newHistoryEntry).catch(() => {});
      addToast(`Signed in as ${selected.name} (${selected.roleTitle}).`, 'success');
      return true;
    }
    return false;
  };

  const handleSwitchUser = (user: UserAccount) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can switch user accounts.', 'error');
      return;
    }
    setCurrentUser(user.name);
    setCurrentUserAccount(user);
    localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, user.name);
    localStorage.setItem('osu-current-user-account', JSON.stringify(user));
    const newHistoryEntry = { username: `Switched: ${user.name} (${user.roleTitle})`, timestamp: Date.now() };
    const nextHistory = [newHistoryEntry, ...loginHistory];
    setLoginHistory(nextHistory);
    localStorage.setItem('osu-login-history', JSON.stringify(nextHistory));
    saveLoginLogToFirestore(newHistoryEntry).catch(() => {});
    addToast(`Switched active user to ${user.name} (${user.roleTitle}).`, 'info');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    setIsEditing(false);
    addToast('Session locked.', 'info');
  };

  const handleChangePassword = (newPwd: string, currentPwd?: string) => {
    const trimmedNew = newPwd.trim();
    if (!currentUserAccount) {
      addToast('No active user session found.', 'error');
      return;
    }

    const expectedCurrent = currentUserAccount.password || (currentUserAccount.role === 'admin' ? adminPassword : '1');
    if (currentPwd !== undefined) {
      const enteredOld = currentPwd.trim();
      const validOld =
        enteredOld === expectedCurrent ||
        (currentUserAccount.role === 'admin' && enteredOld === adminPassword);
      if (!validOld) {
        addToast('Current password is incorrect.', 'error');
        return;
      }
    }

    try {
      if (currentUserAccount.role === 'admin') {
        setAdminPassword(trimmedNew);
        localStorage.setItem(STORAGE_KEY_ADMIN_PWD, trimmedNew);
      }

      const updatedUser: UserAccount = { ...currentUserAccount, password: trimmedNew };
      currentUserAccountRef.current = updatedUser;
      setCurrentUserAccount(updatedUser);
      localStorage.setItem('osu-current-user-account', JSON.stringify(updatedUser));

      const updatedUsers = users.map((u) => (u.username === updatedUser.username ? updatedUser : u));
      setUsers(updatedUsers);
      localStorage.setItem('osu-user-accounts', JSON.stringify(updatedUsers));
      saveUserToFirestore(updatedUser).catch(() => {
        addToast('Failed to sync personal password change to database.', 'error');
      });

      addToast(
        `Personal password for "${updatedUser.name}" (@${updatedUser.username}) updated and synced across devices.`,
        'success'
      );
    } catch (e) {
      console.error('Failed to save password change:', e);
      addToast('Failed to update password. Please try again.', 'error');
    }
  };

  // Admin-Only: Save connected recovery email and/or phone number
  const handleSaveAdminRecovery = (recoveryEmail: string, recoveryPhone: string) => {
    if (currentUserAccount.role !== 'admin' || currentUserAccount.username !== 'admin') {
      addToast('Permission restricted: Only System Administrator (@admin) can configure recovery contacts.', 'error');
      return;
    }

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    const cleanPhone = recoveryPhone.trim();
    if (!cleanEmail && !cleanPhone) {
      addToast('Please provide at least an Admin recovery email address or phone number.', 'error');
      return;
    }

    const updatedAdmin: UserAccount = {
      ...currentUserAccount,
      recoveryEmail: cleanEmail || undefined,
      recoveryPhone: cleanPhone || undefined
    };

    currentUserAccountRef.current = updatedAdmin;
    setCurrentUserAccount(updatedAdmin);
    try {
      localStorage.setItem('osu-current-user-account', JSON.stringify(updatedAdmin));
    } catch {}

    const updatedUsers = users.map((u) => (u.username === 'admin' ? updatedAdmin : u));
    setUsers(updatedUsers);
    try {
      localStorage.setItem('osu-user-accounts', JSON.stringify(updatedUsers));
    } catch {}

    saveUserToFirestore(updatedAdmin).catch(() => {
      addToast('Failed to sync Admin recovery contacts to database.', 'error');
    });

    const connectedParts = [
      cleanEmail ? `email (${cleanEmail})` : null,
      cleanPhone ? `phone (${cleanPhone})` : null
    ].filter(Boolean);
    addToast(
      `Admin recovery ${connectedParts.join(' and ')} connected and synced.`,
      'success'
    );
  };

  // Admin-Only: Log verification code issuance without storing the one-time code itself
  const handleLogAdminRecoveryCodeRequest = (channel: 'email' | 'phone') => {
    const channelLabel = channel === 'email' ? 'Email' : 'Phone Number';
    const requestLog = {
      username: `Admin Recovery Code Issued: @admin (via ${channelLabel})`,
      timestamp: Date.now()
    };
    const nextHistory = [requestLog, ...loginHistory];
    setLoginHistory(nextHistory);
    try {
      localStorage.setItem('osu-login-history', JSON.stringify(nextHistory));
    } catch {}
    saveLoginLogToFirestore(requestLog).catch(() => {});
  };

  // Admin-Only: Recover lost password by verifying connected email or phone number + 6-digit code
  const handleRecoverAdminPassword = (
    channel: 'email' | 'phone',
    contactValue: string,
    newPassword: string
  ): { ok: boolean; error?: string } => {
    const adminAcc = users.find((u) => u.username === 'admin' && u.role === 'admin');
    if (!adminAcc) {
      return { ok: false, error: 'System Administrator (@admin) account not found.' };
    }

    if (channel === 'email') {
      if (!adminAcc.recoveryEmail) {
        return {
          ok: false,
          error: 'Recovery email has not been configured on @admin yet.'
        };
      }
      if (!emailsMatch(adminAcc.recoveryEmail, contactValue)) {
        return {
          ok: false,
          error: 'The email address does not match the connected @admin recovery email.'
        };
      }
    } else {
      if (!adminAcc.recoveryPhone) {
        return {
          ok: false,
          error: 'Recovery phone number has not been configured on @admin yet.'
        };
      }
      if (!phonesMatch(adminAcc.recoveryPhone, contactValue)) {
        return {
          ok: false,
          error: 'The phone number does not match the connected @admin recovery phone number.'
        };
      }
    }

    const trimmedNew = newPassword.trim();
    if (trimmedNew.length < 4 || trimmedNew.length > 128) {
      return { ok: false, error: 'New password must be between 4 and 128 characters.' };
    }

    setAdminPassword(trimmedNew);
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN_PWD, trimmedNew);
    } catch {}

    const updatedAdmin: UserAccount = { ...adminAcc, password: trimmedNew };
    const updatedUsers = users.map((u) => (u.username === 'admin' ? updatedAdmin : u));
    setUsers(updatedUsers);
    try {
      localStorage.setItem('osu-user-accounts', JSON.stringify(updatedUsers));
    } catch {}

    saveUserToFirestore(updatedAdmin).catch(() => {
      addToast('Failed to sync recovered Admin password to database.', 'error');
    });

    const channelLabel = channel === 'email' ? 'Email Code' : 'Phone Code';
    const recoveryLog = {
      username: `Password Recovered: @admin (via ${channelLabel})`,
      timestamp: Date.now()
    };
    const nextHistory = [recoveryLog, ...loginHistory];
    setLoginHistory(nextHistory);
    try {
      localStorage.setItem('osu-login-history', JSON.stringify(nextHistory));
    } catch {}
    saveLoginLogToFirestore(recoveryLog).catch(() => {});

    addToast('Admin password recovered and synced across devices.', 'success');
    return { ok: true };
  };

  // Strict Data Isolation: Compute scoped records based on program level(s) and assigned department(s)
  // Note: 'all_viewer' can view the entire student list across all departments/years without admin rights
  const scopedRecords = useMemo(() => {
    const assignedDepts = parseAssignedDepartments(currentUserAccount.assignedDepartment);
    const scopedPrograms = parseProgramLevelScopes(currentUserAccount.programLevelScope);
    if (
      currentUserAccount.role === 'admin' ||
      currentUserAccount.role === 'registrar' ||
      currentUserAccount.role === 'all_viewer' ||
      (scopedPrograms.length === 0 && assignedDepts.length === 0)
    ) {
      return records;
    }
    return records.filter((r) => {
      const matchProgram = matchesProgramLevelScope(r[1], currentUserAccount.programLevelScope);
      const matchDept = matchesAssignedDepartment(r[2], currentUserAccount.assignedDepartment);
      return matchProgram && matchDept;
    });
  }, [records, currentUserAccount]);

  // Official analytics & summaries only include Administrator-approved records
  const approvedScopedRecords = useMemo(
    () => scopedRecords.filter((r) => getRecordApprovalStatus(r) === 'approved'),
    [scopedRecords]
  );

  const pendingApprovalCount = useMemo(
    () => records.filter((r) => getRecordApprovalStatus(r) === 'pending').length,
    [records]
  );

  // Formatted Record Items for Google Sheets Export & Sync
  const formattedRecordItems: RecordItem[] = useMemo(() => {
    return scopedRecords.map((r, idx) => ({
      id: `REC-${r[0]}-${idx + 1}`,
      year: r[0],
      program: r[1],
      department: r[2],
      mode: r[3],
      campus: r[4],
      male: r[5],
      female: r[6],
      total: r[7],
      sourceCell: r[8],
      approvalStatus: getRecordApprovalStatus(r),
      submittedBy: r[10] ?? null,
    }));
  }, [scopedRecords]);

  // Import Records from Google Sheets
  const handleImportFromGoogleSheets = (imported: Partial<RecordItem>[]) => {
    const isAdminUser = currentUserAccount.role === 'admin';
    const newRawRecords: RawRecord[] = imported.map((r) => [
      r.year || 2018,
      r.program || '1st Degree (Applied)',
      r.department || 'General',
      r.mode || 'Regular',
      r.campus || 'Batu Main Campus',
      r.male ?? 0,
      r.female ?? 0,
      r.total ?? ((r.male ?? 0) + (r.female ?? 0)),
      r.sourceCell || 'G-Sheets Import',
      isAdminUser ? 'approved' : 'pending',
      currentUserAccount.username,
    ]);

    const combined = [...records, ...newRawRecords];
    saveRecordsToStorage(combined);
    setIsDirty(true);
    addToast(
      isAdminUser
        ? `Imported & approved ${newRawRecords.length} record(s) from Google Sheets.`
        : `Submitted ${newRawRecords.length} record(s) from Google Sheets for Administrator approval.`,
      isAdminUser ? 'success' : 'info'
    );
  };

  // Handlers for Department Offering Acceptance & Completion
  const handleAcceptDepartmentOffer = () => {
    const updatedUser: UserAccount = {
      ...currentUserAccount,
      departmentOfferStatus: 'accepted'
    };
    updateOwnCoordinatorStatus(updatedUser);
    const assignedList = parseAssignedDepartments(currentUserAccount.assignedDepartment);
    const scopeLabel =
      currentUserAccount.role === 'all_viewer' || assignedList.length === 0
        ? 'All Students List Viewer (Non-Admin)'
        : assignedList.length > 1
        ? `Departments (${assignedList.join(', ')})`
        : `Department of ${assignedList[0]}`;
    addToast(
      `Accepted assignment for ${scopeLabel}. You can view student records and submit new entries for Admin approval.`,
      'success'
    );
  };

  const handleDeclineDepartmentOffer = () => {
    const updatedUser: UserAccount = {
      ...currentUserAccount,
      departmentOfferStatus: 'declined'
    };
    updateOwnCoordinatorStatus(updatedUser);
    addToast(`Department assignment offer declined.`, 'info');
  };

  const handleMarkDataEntryComplete = () => {
    const updatedUser: UserAccount = {
      ...currentUserAccount,
      dataEntryCompleted: true
    };
    updateOwnCoordinatorStatus(updatedUser);
    const assignedList = parseAssignedDepartments(currentUserAccount.assignedDepartment);
    const deptLabel =
      assignedList.length > 1
        ? `Departments (${assignedList.join(', ')})`
        : `Department of ${assignedList[0] || currentUserAccount.programLevelScope}`;
    addToast(
      `All student data entry for ${deptLabel} marked as complete! Administrator has been notified.`,
      'success'
    );
  };

  // Compute analytics exclusively from approved scoped records
  const analytics = useMemo(() => computeAnalytics(approvedScopedRecords), [approvedScopedRecords]);

  // Unified One-Header Student Numbers Summary
  const headerAnalyticsSummary = useMemo(
    () => ({
      totalStudents: analytics.totalAllYears,
      totalMale: analytics.totalMaleAllYears,
      totalFemale: analytics.totalFemaleAllYears,
      overallFemaleShare: analytics.overallFemaleShare,
      years: analytics.years,
      totalRecords: approvedScopedRecords.length,
      departmentCount: analytics.departments.length,
      yearTotals: analytics.years.map((yr, idx) => ({
        year: yr,
        total: analytics.totalByYear[idx] || 0
      }))
    }),
    [analytics, approvedScopedRecords.length]
  );

  // Active Report
  const activeReport = useMemo(() => {
    return reports.find((r) => r.id === activeReportId) || reports[0] || INITIAL_REPORT;
  }, [reports, activeReportId]);

  // Active Report with dynamic academic year span and normalized office name
  const resolvedActiveReport = useMemo<ReportDocument>(
    () => ({
      ...activeReport,
      name: resolveDynamicReportTitle(activeReport.name, analytics.years),
      preparedBy: normalizePreparedByOffice(activeReport.preparedBy)
    }),
    [activeReport, analytics.years]
  );

  // Persist records to state, local cache, and Firestore via batched diff sync
  const saveRecordsToStorage = useCallback((newRecords: RawRecord[], prevRecordsSnapshot?: RawRecord[]) => {
    const baseline = prevRecordsSnapshot ?? records;
    const prevIds = getRecordDocIds(baseline);
    const prevSerializedById = new Map<string, string>();
    baseline.forEach((r, idx) => {
      prevSerializedById.set(prevIds[idx], serializeRawRecord(r));
    });

    const nextIds = getRecordDocIds(newRecords);
    const nextIdSet = new Set(nextIds);
    const entriesToUpsert: Array<{ id: string; record: RawRecord }> = [];
    newRecords.forEach((r, idx) => {
      const id = nextIds[idx];
      if (!prevSerializedById.has(id) || prevSerializedById.get(id) !== serializeRawRecord(r)) {
        entriesToUpsert.push({ id, record: r });
      }
    });
    const idsToDelete = prevIds.filter((id) => !nextIdSet.has(id));

    setRecords(newRecords);
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(newRecords));
    } catch (e) {
      console.error('Storage quota exceeded for data records', e);
    }

    if (entriesToUpsert.length > 0 || idsToDelete.length > 0) {
      syncRecordsCollectionToFirestore(entriesToUpsert, idsToDelete).catch(() => {
        addToast('Database sync warning: Could not save record changes to Firestore.', 'error');
      });
    }
  }, [records, addToast]);

  // Persist reports
  const saveReportsToStorage = useCallback((newReports: ReportDocument[]) => {
    setReports(newReports);
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(newReports));
    } catch (e) {
      console.error('Storage quota exceeded for reports', e);
    }
    seedReportsToFirestore(newReports).catch(() => {
      addToast('Database sync warning: Could not save report changes to Firestore.', 'error');
    });
  }, [addToast]);

  const reportSaveTimerRef = useRef<number | null>(null);
  const pendingReportRef = useRef<ReportDocument | null>(null);

  const flushPendingReportSave = useCallback(() => {
    if (reportSaveTimerRef.current !== null) {
      window.clearTimeout(reportSaveTimerRef.current);
      reportSaveTimerRef.current = null;
    }
    if (pendingReportRef.current) {
      const toSave = pendingReportRef.current;
      pendingReportRef.current = null;
      saveReportToFirestore(toSave).catch(() => {
        addToast('Database sync warning: Failed to persist report edits.', 'error');
      });
    }
  }, [addToast]);

  // Update current report (Admin only) with debounced Firestore persistence
  const handleUpdateReport = useCallback((updates: Partial<ReportDocument>) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can edit reports.', 'error');
      return;
    }
    setReports((prev) => {
      const next = prev.map((r) =>
        r.id === activeReportId ? { ...r, ...updates, updatedAt: Date.now() } : r
      );
      try {
        localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(next));
      } catch {}
      const updatedDoc = next.find((r) => r.id === activeReportId);
      if (updatedDoc) {
        pendingReportRef.current = updatedDoc;
        if (reportSaveTimerRef.current !== null) {
          window.clearTimeout(reportSaveTimerRef.current);
        }
        reportSaveTimerRef.current = window.setTimeout(() => {
          flushPendingReportSave();
        }, 500);
      }
      return next;
    });
    setIsDirty(true);
  }, [activeReportId, currentUserAccount.role, addToast, flushPendingReportSave]);

  // Save changes explicitly
  const handleSaveChanges = () => {
    if (currentUserAccount.role !== 'admin') {
      saveRecordsToStorage(records, []);
      setIsDirty(false);
      addToast('Student records saved to database. Note: Report edits are restricted to Administrator.', 'info');
      return;
    }
    flushPendingReportSave();
    const updated = reports.map((r) =>
      r.id === activeReportId ? { ...r, updatedAt: Date.now() } : r
    );
    saveReportsToStorage(updated);
    setIsDirty(false);
    addToast('Report changes saved to database.', 'success');
  };

  // Save as copy / duplicate
  const handleDuplicateReport = (targetReport: ReportDocument) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can duplicate reports.', 'error');
      return;
    }
    const newId = 'rep-' + Date.now().toString(36);
    const duplicated: ReportDocument = {
      ...targetReport,
      id: newId,
      name: `${resolveDynamicReportTitle(targetReport.name, analytics.years)} (Copy)`,
      status: 'Draft',
      updatedAt: Date.now()
    };
    const updated = [duplicated, ...reports];
    setReports(updated);
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updated));
    } catch {}
    saveReportToFirestore(duplicated).catch(() => {
      addToast('Database sync warning: Failed to save duplicated report.', 'error');
    });
    setActiveReportId(newId);
    addToast(`Created duplicate report "${duplicated.name}".`, 'info');
  };

  // Delete report
  const handleDeleteReport = (id: string) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can delete reports.', 'error');
      return;
    }
    const reportToDelete = reports.find((r) => r.id === id);
    if (!reportToDelete) return;

    deleteReportFromFirestore(id).catch(() => {
      addToast('Database sync warning: Failed to delete report from Firestore.', 'error');
    });
    const remaining = reports.filter((r) => r.id !== id);
    if (remaining.length === 0) {
      saveReportsToStorage([INITIAL_REPORT]);
      setActiveReportId(INITIAL_REPORT.id);
    } else {
      setReports(remaining);
      try {
        localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(remaining));
      } catch {}
      if (activeReportId === id) {
        setActiveReportId(remaining[0].id);
      }
    }
    addToast(`Deleted report "${reportToDelete.name}".`, 'info');
  };

  // Create new report
  const handleCreateNewReport = (reportConfig: Partial<ReportDocument>) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can create new reports.', 'error');
      return;
    }
    const newId = 'rep-' + Date.now().toString(36);
    const newDoc: ReportDocument = {
      id: newId,
      name: reportConfig.name || 'Untitled Institutional Report',
      institution: reportConfig.institution || 'Oromia State University',
      preparedBy: normalizePreparedByOffice(reportConfig.preparedBy || DEFAULT_PREPARED_BY),
      date: reportConfig.date || 'November 2026',
      status: reportConfig.status || 'Draft',
      sections: reportConfig.sections || INITIAL_REPORT.sections,
      customSummary: reportConfig.customSummary || '',
      customFindings: reportConfig.customFindings || [
        'Finding 1: Strategic institutional expansion observations...',
        'Finding 2: Faculty capacity and student retention indicators...'
      ],
      customNotes: reportConfig.customNotes || [
        'Data source: Academic Registrar archives and validated ledger.'
      ],
      updatedAt: Date.now(),
      dataHash: 1
    };

    const updated = [newDoc, ...reports];
    setReports(updated);
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updated));
    } catch {}
    saveReportToFirestore(newDoc).catch(() => {
      addToast('Database sync warning: Failed to save new report.', 'error');
    });
    setActiveReportId(newId);
    setActiveView('report');
    setIsEditing(true);
    addToast(`New report "${newDoc.name}" ready for editing.`, 'success');
  };

  // Toggle Section
  const handleToggleSection = (sectionId: string) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can modify report sections.', 'error');
      return;
    }
    const updatedSections = activeReport.sections.map((s) =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    );
    handleUpdateReport({ sections: updatedSections });
  };

  // Rebuild report from current records
  const handleRebuildReport = () => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can rebuild reports.', 'error');
      return;
    }
    // Regenerate report summaries & findings based on latest computeAnalytics
    handleUpdateReport({
      dataHash: Date.now(),
      updatedAt: Date.now()
    });
    addToast('Report statistics synchronized with latest Data Ledger entries.', 'success');
  };

  // Findings & Notes handlers (Admin only)
  const handleAddFinding = () => {
    if (currentUserAccount.role !== 'admin') return;
    const current = activeReport.customFindings || [];
    handleUpdateReport({
      customFindings: [...current, 'New analytical finding or institutional observation...']
    });
  };

  const handleDeleteFinding = (idx: number) => {
    if (currentUserAccount.role !== 'admin') return;
    const current = [...(activeReport.customFindings || [])];
    current.splice(idx, 1);
    handleUpdateReport({ customFindings: current });
  };

  const handleAddNote = () => {
    if (currentUserAccount.role !== 'admin') return;
    const current = activeReport.customNotes || [];
    handleUpdateReport({
      customNotes: [...current, 'New methodology or data provenance note...']
    });
  };

  const handleDeleteNote = (idx: number) => {
    if (currentUserAccount.role !== 'admin') return;
    const current = [...(activeReport.customNotes || [])];
    current.splice(idx, 1);
    handleUpdateReport({ customNotes: current });
  };

  // Record CRUD & Approval Workflow
  const handleSaveRecord = (rec: RawRecord, idx: number | null, andAddAnother = false) => {
    // Permission policy: Non-admin users can submit new data (saved as Pending Approval); only Admin can edit existing records
    if (editingRecord && currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Non-admin users can only submit new records. Editing existing records is restricted to Administrator.', 'error');
      return;
    }

    const isAdminUser = currentUserAccount.role === 'admin';
    const updated = [...records];
    const safeRec: RawRecord = [...rec];
    if (!safeRec[8] || !safeRec[8].trim()) {
      safeRec[8] = getDefaultSourceCell(safeRec[0], safeRec[3], safeRec[4]);
    }

    if (editingRecord) {
      safeRec[9] = rec[9] || getRecordApprovalStatus(editingRecord);
      safeRec[10] = rec[10] ?? editingRecord[10] ?? currentUserAccount.username;
      const matchIdx = updated.findIndex(
        (r) =>
          r === editingRecord ||
          (r[0] === editingRecord[0] &&
            r[1] === editingRecord[1] &&
            r[2] === editingRecord[2] &&
            r[3] === editingRecord[3] &&
            r[4] === editingRecord[4] &&
            r[5] === editingRecord[5] &&
            r[6] === editingRecord[6])
      );
      if (matchIdx >= 0) {
        updated[matchIdx] = safeRec;
      } else if (idx !== null && idx >= 0 && idx < updated.length) {
        updated[idx] = safeRec;
      } else {
        updated.push(safeRec);
      }
    } else {
      safeRec[9] = isAdminUser ? 'approved' : 'pending';
      safeRec[10] = currentUserAccount.username;
      updated.push(safeRec);
    }

    saveRecordsToStorage(updated);
    setIsDirty(true);
    if (editingRecord) {
      addToast(`Record for "${safeRec[2]}" (${safeRec[0]}) updated successfully.`, 'success');
    } else if (isAdminUser) {
      addToast(
        andAddAnother
          ? `Added & approved record for "${safeRec[2]}" (${safeRec[0]}). Ready for next record.`
          : `Record for "${safeRec[2]}" (${safeRec[0]}) saved & approved.`,
        'success'
      );
    } else {
      addToast(
        andAddAnother
          ? `Submitted "${safeRec[2]}" (${safeRec[0]}) for Administrator approval. Ready for next entry.`
          : `Submitted "${safeRec[2]}" (${safeRec[0]}) for Administrator approval.`,
        'info'
      );
    }
  };

  const handleApproveRecord = (targetRecord: RawRecord) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can approve submitted data entries.', 'error');
      return;
    }
    const matchIdx = records.findIndex((r) => r === targetRecord);
    const resolvedIdx =
      matchIdx >= 0
        ? matchIdx
        : records.findIndex(
            (r) =>
              r[0] === targetRecord[0] &&
              r[1] === targetRecord[1] &&
              r[2] === targetRecord[2] &&
              r[3] === targetRecord[3] &&
              r[4] === targetRecord[4] &&
              r[5] === targetRecord[5] &&
              r[6] === targetRecord[6] &&
              getRecordApprovalStatus(r) === getRecordApprovalStatus(targetRecord)
          );
    if (resolvedIdx < 0) return;

    const updated = [...records];
    const approvedRec: RawRecord = [...updated[resolvedIdx]];
    approvedRec[9] = 'approved';
    updated[resolvedIdx] = approvedRec;
    saveRecordsToStorage(updated);
    setIsDirty(true);
    addToast(`Approved student data entry for "${approvedRec[2]}" (${approvedRec[0]}).`, 'success');
  };

  const handleRejectRecord = (targetRecord: RawRecord) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can reject submitted data entries.', 'error');
      return;
    }
    const matchIdx = records.findIndex((r) => r === targetRecord);
    const resolvedIdx =
      matchIdx >= 0
        ? matchIdx
        : records.findIndex(
            (r) =>
              r[0] === targetRecord[0] &&
              r[1] === targetRecord[1] &&
              r[2] === targetRecord[2] &&
              r[3] === targetRecord[3] &&
              r[4] === targetRecord[4] &&
              r[5] === targetRecord[5] &&
              r[6] === targetRecord[6] &&
              getRecordApprovalStatus(r) === getRecordApprovalStatus(targetRecord)
          );
    if (resolvedIdx < 0) return;

    const updated = [...records];
    const rejectedRec: RawRecord = [...updated[resolvedIdx]];
    rejectedRec[9] = 'rejected';
    updated[resolvedIdx] = rejectedRec;
    saveRecordsToStorage(updated);
    setIsDirty(true);
    addToast(`Rejected pending entry for "${rejectedRec[2]}" (${rejectedRec[0]}).`, 'info');
  };

  const handleApproveAllPending = () => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can approve pending entries.', 'error');
      return;
    }
    const pendingTotal = records.filter((r) => getRecordApprovalStatus(r) === 'pending').length;
    if (pendingTotal === 0) return;
    const updated = records.map((r) => {
      if (getRecordApprovalStatus(r) === 'pending') {
        const next: RawRecord = [...r];
        next[9] = 'approved';
        return next;
      }
      return r;
    });
    saveRecordsToStorage(updated);
    setIsDirty(true);
    addToast(`Approved all ${pendingTotal} pending student data entry submission(s).`, 'success');
  };

  const handleDeleteRecord = (targetRecord: RawRecord, _idx?: number) => {
    // Permission policy: Non-admin users cannot delete records
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Non-admin users cannot delete records. Deletion is restricted to Administrator.', 'error');
      return;
    }

    let matchIdx = records.findIndex((r) => r === targetRecord);
    if (matchIdx < 0) {
      matchIdx = records.findIndex(
        (r) =>
          r[0] === targetRecord[0] &&
          r[1] === targetRecord[1] &&
          r[2] === targetRecord[2] &&
          r[3] === targetRecord[3] &&
          r[4] === targetRecord[4] &&
          r[5] === targetRecord[5] &&
          r[6] === targetRecord[6]
      );
    }
    if (matchIdx < 0) return;

    const updated = records.filter((_, i) => i !== matchIdx);
    saveRecordsToStorage(updated, records);
    setIsDirty(true);
    addToast('Data record removed.', 'info');
  };

  // Department CRUD & cascading sync (Admin only)
  const handleSaveDepartment = (
    deptName: string,
    programLevel: string,
    yearsValues: number[],
    oldDept?: { name: string; program: string },
    customYearsList?: number[]
  ) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can add or edit departments.', 'error');
      return;
    }

    let updatedRecords = [...records];

    // If renaming or level change
    if (oldDept && (oldDept.name !== deptName || oldDept.program !== programLevel)) {
      updatedRecords = updatedRecords.map((r) => {
        if (r[2] === oldDept.name && r[1] === oldDept.program) {
          return [r[0], programLevel, deptName, r[3], r[4], r[5], r[6], r[7], r[8]];
        }
        return r;
      });
    }

    // Adjust each year's records for this dept
    const targetYears =
      customYearsList && customYearsList.length > 0
        ? customYearsList
        : analytics.years && analytics.years.length > 0
        ? analytics.years
        : YEARS;
    targetYears.forEach((yr, i) => {
      const want = yearsValues[i] ?? 0;
      const matchRecs = updatedRecords.filter(
        (r) => r[2] === deptName && r[1] === programLevel && r[0] === yr
      );
      const cur = matchRecs.reduce((acc, r) => acc + (r[5] || 0) + (r[6] || 0), 0);

      if (want === cur) return;

      // Find overall department female share
      const allDeptRecs = updatedRecords.filter(
        (r) => r[2] === deptName && r[1] === programLevel
      );
      const tm = allDeptRecs.reduce((acc, r) => acc + (r[5] || 0), 0);
      const tf = allDeptRecs.reduce((acc, r) => acc + (r[6] || 0), 0);
      const share = tm + tf > 0 ? tf / (tm + tf) : 0.3;

      let delta = want - cur;

      if (matchRecs.length === 0) {
        if (want > 0) {
          const femaleEst = Math.round(want * share);
          const maleEst = want - femaleEst;
          updatedRecords.push([
            yr,
            programLevel,
            deptName,
            'Regular',
            null,
            maleEst,
            femaleEst,
            want,
            getDefaultSourceCell(yr, 'Regular', null)
          ]);
        }
        return;
      }

      // Distribute delta across existing records
      matchRecs.forEach((r) => {
        if (delta === 0) return;
        const totalNow = (r[5] || 0) + (r[6] || 0);
        const newTotal = Math.max(0, totalNow + delta);
        delta -= newTotal - totalNow;
        const curFemaleShare = totalNow > 0 ? (r[6] || 0) / totalNow : share;
        const newFemale = Math.round(newTotal * curFemaleShare);
        const newMale = newTotal - newFemale;
        r[5] = newMale;
        r[6] = newFemale;
        r[7] = newTotal;
      });
    });

    saveRecordsToStorage(updatedRecords);
    setIsDirty(true);
    addToast(`Department "${deptName}" saved across all academic years.`, 'success');
  };

  const handleDeleteDepartment = (dept: DepartmentSummary) => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can delete departments.', 'error');
      return;
    }
    const updated = records.filter(
      (r) => !(r[2] === dept.department && r[1] === dept.program)
    );
    saveRecordsToStorage(updated, records);
    setIsDirty(true);
    addToast(`Department "${dept.department}" and all associated records removed from database.`, 'info');
  };

  const handleResetData = () => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can reset data baseline.', 'error');
      return;
    }
    setRecords(INITIAL_RECORDS);
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(INITIAL_RECORDS));
    } catch {}
    const initialIds = getRecordDocIds(INITIAL_RECORDS);
    const initialEntries = INITIAL_RECORDS.map((r, idx) => ({ id: initialIds[idx], record: r }));
    resetRecordsInFirestore(initialEntries).catch(() => {
      addToast('Database sync warning: Failed to reset Firestore baseline records.', 'error');
    });
    setIsDirty(true);
    addToast('Restored original institutional archival records in database.', 'info');
  };

  // Print Report Handler
  const handlePrint = async () => {
    // If in editing mode, finish editing first so outlines are not displayed
    if (isEditing) {
      setIsEditing(false);
    }
    // Ensure ReportPaper (with official OSU logo) is mounted before invoking System Print / PDF
    if (activeView !== 'report' && activeView !== 'preview') {
      setActiveView('preview');
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    const paperEl = document.getElementById('osu-report-paper');
    if (paperEl) {
      await ensureImagesLoadedForPrint(paperEl);
    }
    try {
      if (typeof window !== 'undefined' && window.print) {
        window.print();
      }
    } catch (e) {
      console.warn('window.print failed or blocked by iframe:', e);
    }
    const success = await exportReportToPDF('osu-report-paper', `${resolvedActiveReport.name || 'OSU_Active_Student_Report'}.pdf`);
    if (success) {
      addToast('Report PDF downloaded successfully with official logo.', 'success');
    }
  };

  // Direct PDF Download Handler (with embedded OSU logo)
  const handleDownloadPDF = async () => {
    if (isEditing) {
      setIsEditing(false);
    }
    if (activeView !== 'report' && activeView !== 'preview') {
      setActiveView('preview');
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    addToast('Generating PDF document with official OSU logo...', 'info');
    const paperEl = document.getElementById('osu-report-paper');
    if (paperEl) {
      await ensureImagesLoadedForPrint(paperEl);
    }
    const success = await exportReportToPDF(
      'osu-report-paper',
      `${resolvedActiveReport.name || 'OSU_Active_Student_Report'}.pdf`
    );
    if (success) {
      addToast('Report PDF downloaded successfully with official logo.', 'success');
    } else {
      addToast('Failed to generate PDF report. Please try again.', 'error');
    }
  };

  // Export DOCX with embedded OSU logo
  const handleExportDOCX = async () => {
    if (isEditing) {
      setIsEditing(false);
    }
    addToast('Generating Word (.docx) document with official OSU logo...', 'info');
    const { exportReportToDOCX } = await import('./utils/exportDocx');
    const success = await exportReportToDOCX(
      resolvedActiveReport,
      analytics,
      `${resolvedActiveReport.name || 'OSU_Active_Student_Report'}.docx`
    );
    if (success) {
      addToast('Word (.docx) report generated and downloaded with official logo.', 'success');
    } else {
      addToast('Failed to generate Word (.docx) report.', 'error');
    }
  };

  // Export HTML
  const handleExportHTML = () => {
    const logoUrl = `${window.location.origin}/assets/aistudio/Forest_Green_Radiant_Shield_Emblem_7f18a355.png`;
    const docHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${resolvedActiveReport.name} - ${resolvedActiveReport.institution}</title>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@600;700&display=swap" rel="stylesheet">
<style>
body { font-family: 'Public Sans', sans-serif; background: #fff; color: #17262B; margin: 0; padding: 24px; line-height: 1.6; }
h1, h2, h3 { font-family: 'Source Serif 4', Georgia, serif; color: #0F4C3A; }
table { border-collapse: collapse; width: 100%; font-size: 13px; margin: 16px 0; }
th { background: #1F7A5C; color: #fff; padding: 8px 10px; text-align: left; }
td { padding: 8px 10px; border-bottom: 1px solid #D5E2DC; }
.n { text-align: right; font-variant-numeric: tabular-nums; }
.kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 20px 0; }
.kpi-card { border-left: 3px solid #E0A526; padding: 10px 14px; background: #F7FAF8; }
.kpi-val { font-size: 24px; font-weight: bold; font-family: 'Source Serif 4', serif; color: #0F4C3A; }
@media print { body { padding: 0; } }
</style>
</head>
<body>
<div style="background:#0F4C3A; color:#fff; padding: 32px 40px; border-bottom: 5px solid #E0A526; display:flex; align-items:center; gap:20px;">
  <img src="${logoUrl}" alt="Oromia State University Logo" style="width:64px; height:64px; object-fit:contain; background:rgba(255,255,255,0.1); padding:6px; border-radius:10px;" />
  <div>
    <p style="margin:0 0 6px; color:#A9D3C2; font-size: 13px; text-transform: uppercase;">${resolvedActiveReport.institution}</p>
    <h1 style="margin:0 0 10px; color:#fff; font-size: 32px;">${resolvedActiveReport.name}</h1>
    <p style="margin:0; color:#CFE6DC; font-size: 13px;">Prepared by: ${resolvedActiveReport.preparedBy} · Date: ${resolvedActiveReport.date}</p>
  </div>
</div>
<div style="padding: 24px 40px;">
  <h2>Executive Summary</h2>
  <p>${
    resolvedActiveReport.customSummary && !resolvedActiveReport.customSummary.includes('enrolled 3,864 new entrants')
      ? resolvedActiveReport.customSummary
      : `Oromia State University enrolled ${formatNum(analytics.totalAllYears)} new entrants across ${analytics.departments.length} academic departments between ${analytics.years[0] ?? 2014} and ${analytics.latestYear}. Annual intake stands at ${formatNum(analytics.totalByYear[analytics.totalByYear.length - 1])} entrants in ${analytics.latestYear}. Overall female student representation is ${formatPct(analytics.overallFemaleShare)} across all study modes and academic levels.`
  }</p>
  <h2>Key Findings</h2>
  <ol>
    ${(resolvedActiveReport.customFindings || []).map((f) => `<li>${f}</li>`).join('')}
  </ol>
  <footer style="margin-top: 40px; padding-top: 14px; border-top: 1px solid #D5E2DC; font-size: 12px; color: #5B6B70; text-align: center;">
    © Oromia State University | Copyright by Abdela Kasim
  </footer>
</div>
</body>
</html>`;

    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${resolvedActiveReport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Exported report document as standalone HTML file.', 'success');
  };

  // Export JSON
  const handleExportJSON = () => {
    const backupData = {
      timestamp: Date.now(),
      reports,
      records
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Oromia_State_University_Student_Report_Backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Downloaded complete JSON backup of all reports and records.', 'success');
  };

  // Dark mode class sync
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Keyboard shortcut for Cmd/Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveChanges();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveChanges]);

  // Centralized cross-browser & cross-device session synchronization & password invalidation
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'osu-user-accounts') {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              const normalized = enforceSingleAdminUsers(parsed);
              setUsers(normalized);
              if (currentUserAccount) {
                const fresh = normalized.find((u: UserAccount) => u.username === currentUserAccount.username);
                if (fresh) {
                  if (fresh.password !== currentUserAccount.password || fresh.isActive === false) {
                    setIsAuthenticated(false);
                    localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
                    sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
                    addToast('Security notice: Password or account status updated centrally. Please sign in again.', 'info');
                  }
                }
              }
            }
          }
        } catch {}
      }
      if (e.key === STORAGE_KEY_ADMIN_PWD) {
        if (e.newValue && e.newValue !== adminPassword) {
          setAdminPassword(e.newValue);
          setIsAuthenticated(false);
          localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
          sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
          addToast('Security notice: Admin password updated centrally. Please sign in with the new password.', 'info');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUserAccount, adminPassword, users, addToast]);

  const currentUserAccountRef = useRef(currentUserAccount);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const activeReportIdRef = useRef(activeReportId);
  const recordsSeededRef = useRef(false);
  const reportsSeededRef = useRef(false);
  const usersSeededRef = useRef(false);
  const [, setFatalFirestoreError] = useState<never>();

  const raiseFirestoreError = useCallback((err: unknown, op: OperationType, path: string) => {
    try {
      handleFirestoreError(err, op, path);
    } catch (formattedError) {
      setFatalFirestoreError(() => {
        throw formattedError;
      });
    }
  }, []);

  useEffect(() => {
    currentUserAccountRef.current = currentUserAccount;
  }, [currentUserAccount]);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);
  useEffect(() => {
    activeReportIdRef.current = activeReportId;
  }, [activeReportId]);

  // Real-time Firestore synchronization for records, reports, users, and loginLogs across all devices
  useEffect(() => {
    const unsubRecords = onSnapshot(collection(db, 'records'), (snapshot) => {
      if (!snapshot.empty) {
        recordsSeededRef.current = true;
        const cloudRecords: RawRecord[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && d.year !== undefined) {
            cloudRecords.push([
              d.year,
              d.program,
              d.department,
              d.mode,
              d.campus || null,
              d.male ?? null,
              d.female ?? null,
              d.total ?? null,
              d.sourceCell || null,
              d.approvalStatus === 'pending' || d.approvalStatus === 'rejected' ? d.approvalStatus : 'approved',
              d.submittedBy || null,
            ]);
          }
        });
        if (cloudRecords.length > 0) {
          const sorted = sortRecordsDeterministically(cloudRecords);
          setRecords(sorted);
          try {
            localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(sorted));
          } catch {}
        }
      } else if (!recordsSeededRef.current) {
        recordsSeededRef.current = true;
        const initialIds = getRecordDocIds(INITIAL_RECORDS);
        const initialEntries = INITIAL_RECORDS.map((r, idx) => ({ id: initialIds[idx], record: r }));
        syncRecordsCollectionToFirestore(initialEntries, []).catch(() => {});
      }
    }, (err) => {
      raiseFirestoreError(err, OperationType.LIST, 'records');
    });

    const unsubReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      if (!snapshot.empty) {
        reportsSeededRef.current = true;
        const cloudReports: ReportDocument[] = [];
        const migratedReports: ReportDocument[] = [];
        snapshot.forEach((docSnap) => {
          const r = docSnap.data() as ReportDocument;
          if (r && r.id) {
            const normalizedOffice = normalizePreparedByOffice(r.preparedBy);
            if (normalizedOffice !== (r.preparedBy || '').trim()) {
              const updatedRep: ReportDocument = { ...r, preparedBy: normalizedOffice };
              cloudReports.push(updatedRep);
              migratedReports.push(updatedRep);
            } else {
              cloudReports.push(r);
            }
          }
        });
        if (migratedReports.length > 0) {
          seedReportsToFirestore(migratedReports).catch(() => {});
        }
        if (cloudReports.length > 0) {
          cloudReports.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          const hasPendingActiveEdit = reportSaveTimerRef.current !== null && pendingReportRef.current !== null;
          const mergedReports = hasPendingActiveEdit
            ? cloudReports.map((cr) =>
                pendingReportRef.current && cr.id === pendingReportRef.current.id
                  ? pendingReportRef.current
                  : cr
              )
            : cloudReports;

          setReports(mergedReports);
          if (!mergedReports.some((r) => r.id === activeReportIdRef.current)) {
            setActiveReportId(mergedReports[0].id);
          }
          try {
            localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(mergedReports));
          } catch {}
        }
      } else if (!reportsSeededRef.current) {
        reportsSeededRef.current = true;
        seedReportsToFirestore([INITIAL_REPORT]).catch(() => {});
      }
    }, (err) => {
      raiseFirestoreError(err, OperationType.LIST, 'reports');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      if (!snapshot.empty) {
        usersSeededRef.current = true;
        const cloudUsers: UserAccount[] = [];
        snapshot.forEach((docSnap) => {
          const u = docSnap.data() as UserAccount;
          if (u && u.username) {
            cloudUsers.push(u);
          }
        });
        if (cloudUsers.length > 0) {
          const normalizedUsers = enforceSingleAdminUsers(cloudUsers);
          // Sync newly migrated student_viewer to Firestore if added by enforceSingleAdminUsers
          const seededViewer = normalizedUsers.find(
            (u) => u.username === 'student_viewer' && !cloudUsers.some((cu) => cu.username === 'student_viewer')
          );
          if (seededViewer) {
            saveUserToFirestore(seededViewer).catch(() => {});
          }

          // Sync adminPassword from Firestore admin user document
          const cloudAdmin = normalizedUsers.find((u) => u.username === 'admin');
          if (cloudAdmin?.password) {
            setAdminPassword(cloudAdmin.password);
            try {
              localStorage.setItem(STORAGE_KEY_ADMIN_PWD, cloudAdmin.password);
            } catch {}
          }

          setUsers(normalizedUsers);
          try {
            localStorage.setItem('osu-user-accounts', JSON.stringify(normalizedUsers));
          } catch {}

          // Check if active user password or status changed on another device
          const activeAccount = currentUserAccountRef.current;
          if (isAuthenticatedRef.current && activeAccount) {
            const freshUser = normalizedUsers.find((u) => u.username === activeAccount.username);
            if (freshUser) {
              if ((freshUser.password || '1') !== (activeAccount.password || '1')) {
                setIsAuthenticated(false);
                localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
                sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
                addToast('Security notice: Your password was updated on another device. Please sign in with your new password.', 'info');
              } else if (freshUser.isActive === false) {
                setIsAuthenticated(false);
                localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
                sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
                addToast('Security notice: Your account was deactivated by Administrator.', 'error');
              } else if (
                freshUser.departmentOfferStatus !== activeAccount.departmentOfferStatus ||
                freshUser.assignedDepartment !== activeAccount.assignedDepartment ||
                freshUser.dataEntryCompleted !== activeAccount.dataEntryCompleted ||
                freshUser.roleTitle !== activeAccount.roleTitle ||
                freshUser.recoveryEmail !== activeAccount.recoveryEmail ||
                freshUser.recoveryPhone !== activeAccount.recoveryPhone
              ) {
                setCurrentUserAccount(freshUser);
                setCurrentUser(freshUser.name);
                try {
                  localStorage.setItem('osu-current-user-account', JSON.stringify(freshUser));
                } catch {}
              }
            }
          }
        }
      } else if (!usersSeededRef.current) {
        usersSeededRef.current = true;
        seedUsersToFirestore(PROGRAM_LEVEL_USERS).catch(() => {});
      }
    }, (err) => {
      raiseFirestoreError(err, OperationType.LIST, 'users');
    });

    const unsubLoginLogs = onSnapshot(collection(db, 'loginLogs'), (snapshot) => {
      const cloudLogs: { username: string; timestamp: number }[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && typeof d.username === 'string' && typeof d.timestamp === 'number') {
          cloudLogs.push({ username: d.username, timestamp: d.timestamp });
        }
      });
      if (cloudLogs.length > 0) {
        cloudLogs.sort((a, b) => b.timestamp - a.timestamp);
        setLoginHistory(cloudLogs);
        try {
          localStorage.setItem('osu-login-history', JSON.stringify(cloudLogs));
        } catch {}
      }
    }, (err) => {
      raiseFirestoreError(err, OperationType.LIST, 'loginLogs');
    });

    return () => {
      unsubRecords();
      unsubReports();
      unsubUsers();
      unsubLoginLogs();
      if (reportSaveTimerRef.current !== null) {
        window.clearTimeout(reportSaveTimerRef.current);
      }
    };
  }, [addToast, raiseFirestoreError]);

  // If not authenticated, display Admin Password login screen
  if (!isAuthenticated) {
    return (
      <>
        <AdminLogin
          onLogin={handleLogin}
          onRecoverAdminPassword={handleRecoverAdminPassword}
          onLogRecoveryCodeRequest={handleLogAdminRecoveryCodeRequest}
          users={users}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-[#EAEFEA] dark:bg-[#0D1513] text-[#162521] dark:text-[#E7EFEC] transition-colors flex flex-col`}>
      {/* Top Bar Header */}
      <Header
        currentUser={currentUser}
        currentUserAccount={currentUserAccount}
        activeView={activeView}
        onViewChange={(v) => {
          setActiveView(v);
          if (v !== 'report') setIsEditing(false);
        }}
        onPrint={handlePrint}
        onDownloadPDF={handleDownloadPDF}
        onExportDOCX={handleExportDOCX}
        onSave={handleSaveChanges}
        onNewReport={() => {
          if (currentUserAccount.role !== 'admin') {
            addToast('Permission restricted: Only Administrator can create new reports.', 'error');
            return;
          }
          setNewReportModalOpen(true);
        }}
        onAddDataRecord={() => {
          setEditingRecord(null);
          setEditingRecordIndex(null);
          setRecordModalOpen(true);
        }}
        isDirty={isDirty}
        isEditing={isEditing}
        onToggleEdit={() => {
          if (currentUserAccount.role !== 'admin') return;
          if (isEditing) {
            flushPendingReportSave();
          }
          setIsEditing(!isEditing);
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onLogout={handleLogout}
        onOpenChangePassword={() => setChangePasswordModalOpen(true)}
        onOpenLoginHistory={() => {
          if (currentUserAccount.role !== 'admin') {
            addToast('Permission restricted: Only Administrator can view login history.', 'error');
            return;
          }
          setLoginHistoryModalOpen(true);
        }}
        onOpenUserManagement={() => {
          if (currentUserAccount.role !== 'admin') {
            addToast('Permission restricted: Only Administrator can view, add, edit, or switch users.', 'error');
            return;
          }
          setUserManagementModalOpen(true);
        }}
        onOpenDocumentation={() => setDocumentationModalOpen(true)}
        onOpenGoogleSheets={() => setGoogleSheetsModalOpen(true)}
        onOpenGoogleChat={() => setGoogleChatModalOpen(true)}
        onExportJSON={handleExportJSON}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => {
          setSidebarOpen((prev) => !prev);
          setMobileSidebarOpen((prev) => !prev);
        }}
        analyticsSummary={headerAnalyticsSummary}
        pendingApprovalCount={pendingApprovalCount}
        onOpenPendingApprovals={() => setActiveView('data')}
      />

      {/* Department Assignment Offer Prompt Banner */}
      {currentUserAccount.departmentOfferStatus === 'offered' &&
        (parseAssignedDepartments(currentUserAccount.assignedDepartment).length > 0 ||
          currentUserAccount.role === 'all_viewer') && (() => {
          const offeredDepts = parseAssignedDepartments(currentUserAccount.assignedDepartment);
          const isAllViewer = currentUserAccount.role === 'all_viewer' || offeredDepts.length === 0;
          const deptSummaryText =
            offeredDepts.length > 1
              ? `Departments (${offeredDepts.length}): ${offeredDepts.join(', ')}`
              : `Department of ${offeredDepts[0]}`;
          return (
          <div className="bg-[#FFF4D9] dark:bg-[#2A2312] border-b-2 border-[#E0A526] px-4 py-3 text-xs sm:text-sm text-[#543803] dark:text-[#F3D78E] shadow-sm no-print animate-in fade-in">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-[#E0A526]/20 rounded-lg text-[#E0A526]">
                  <Building2 className="w-5 h-5 shrink-0" />
                </span>
                <div>
                  <p className="font-bold text-[#3B2602] dark:text-[#FCE8B3]">
                    {isAllViewer
                      ? 'Department Assignment Offer: All Students List Viewer (Non-Admin)'
                      : `Department Assignment Offer: ${deptSummaryText}`}
                  </p>
                  <p className="text-xs text-[#70500A] dark:text-[#E0C98E]">
                    {isAllViewer ? (
                      <>
                        The sole System Administrator has offered you access to{' '}
                        <strong>view the complete student list across all departments and years</strong> (Non-Admin).
                        Any new student records you submit will be sent to the Administrator for approval.
                      </>
                    ) : (
                      <>
                        The University Administrator has offered you the role of Department Coordinator for{' '}
                        <strong>{offeredDepts.join(', ')}</strong> ({currentUserAccount.programLevelScope}).
                        Accepting allows you to view and submit new student records for Administrator approval.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcceptDepartmentOffer}
                  className="px-3.5 py-1.5 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#A9D3C2]" />
                  <span>Accept Offer & Begin</span>
                </button>
                <button
                  onClick={handleDeclineDepartmentOffer}
                  className="px-3 py-1.5 bg-white/80 dark:bg-black/40 hover:bg-white text-[#70500A] dark:text-[#E0C98E] font-medium rounded-lg text-xs border border-[#E0A526]/40 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          </div>
          );
        })()}

      {/* Main Workspace */}
      <div className="flex-1 flex w-full">
        {/* Left Sidebar */}
        <Sidebar
          reports={reports}
          activeReportId={activeReportId}
          analyticsYears={analytics.years}
          currentUserAccount={currentUserAccount}
          onSelectReport={(id) => {
            setActiveReportId(id);
            setActiveView('report');
            setIsEditing(false);
          }}
          onNewReport={() => {
            if (currentUserAccount.role !== 'admin') return;
            setNewReportModalOpen(true);
          }}
          onDuplicateReport={handleDuplicateReport}
          onDeleteReport={handleDeleteReport}
          onToggleSection={handleToggleSection}
          onRebuildReport={handleRebuildReport}
          onExportJSON={handleExportJSON}
          onExportHTML={handleExportHTML}
          onExportDOCX={handleExportDOCX}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => {
            setMobileSidebarOpen(false);
            setSidebarOpen(false);
          }}
          isOpen={sidebarOpen}
        />

        {/* Content Body */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Mobile Sidebar Trigger & Status Bar */}
          <div className="flex items-center justify-between gap-3 mb-5 lg:hidden no-print">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="px-3 py-1.5 bg-[#0F4C3A] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Menu className="w-4 h-4" />
              <span>Report Outline & Switcher</span>
            </button>
            {isDirty && (
              <span className="text-xs font-semibold text-[#B7791F]">
                Unsaved modifications
              </span>
            )}
          </div>

          {/* Edit Mode Notice Banner */}
          {activeView === 'report' && isEditing && (
            <div className="mb-6 p-4 bg-[#FFF8E5] border border-[#E0A526] text-[#634505] rounded-xl flex items-center justify-between gap-4 text-xs sm:text-sm no-print animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#E0A526] shrink-0" />
                <span>
                  <strong>Report Editing Active:</strong> You can edit the report title, author, summary paragraphs, notes, and findings directly on the paper. Click "Save" or press Ctrl+S to store changes.
                </span>
              </div>
              <button
                onClick={() => {
                  flushPendingReportSave();
                  setIsEditing(false);
                }}
                className="px-3 py-1 bg-[#0F4C3A] text-white rounded-md text-xs font-semibold hover:bg-[#1A5C49] shrink-0 cursor-pointer"
              >
                Done Editing
              </button>
            </div>
          )}

          {/* View Routing */}
          {activeView === 'report' && (
            <ReportPaper
              report={resolvedActiveReport}
              analytics={analytics}
              currentUserAccount={currentUserAccount}
              isEditing={isEditing}
              onUpdateReport={handleUpdateReport}
              onAddFinding={handleAddFinding}
              onDeleteFinding={handleDeleteFinding}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onOpenDataLedger={() => setActiveView('departments')}
            />
          )}

          {activeView === 'departments' && (
            <DepartmentView
              analytics={analytics}
              currentUserAccount={currentUserAccount}
              onEditDept={(dept) => {
                if (currentUserAccount.role !== 'admin') {
                  addToast('Permission restricted: Only Administrator can edit departments.', 'error');
                  return;
                }
                setEditingDepartment(dept);
                setDepartmentModalOpen(true);
              }}
              onAddDept={() => {
                if (currentUserAccount.role !== 'admin') {
                  addToast('Permission restricted: Only Administrator can add departments.', 'error');
                  return;
                }
                setEditingDepartment(null);
                setDepartmentModalOpen(true);
              }}
              onSaveDepartment={handleSaveDepartment}
              onOpenRecordModal={() => {
                setEditingRecord(null);
                setEditingRecordIndex(null);
                setRecordModalOpen(true);
              }}
              onDeleteDept={handleDeleteDepartment}
              onResetData={handleResetData}
            />
          )}

          {activeView === 'data' && (
            <DataLedgerView
              records={scopedRecords}
              currentUserAccount={currentUserAccount}
              onAddRecord={() => {
                setEditingRecord(null);
                setEditingRecordIndex(null);
                setRecordModalOpen(true);
              }}
              onSaveNewRecord={(newRec) => handleSaveRecord(newRec, null)}
              onEditRecord={(rec, idx) => {
                if (currentUserAccount.role !== 'admin') {
                  addToast('Permission restricted: Only Administrator can edit existing records.', 'error');
                  return;
                }
                setEditingRecord(rec);
                setEditingRecordIndex(idx);
                setRecordModalOpen(true);
              }}
              onDeleteRecord={handleDeleteRecord}
              onApproveRecord={handleApproveRecord}
              onRejectRecord={handleRejectRecord}
              onApproveAllPending={handleApproveAllPending}
              onResetData={handleResetData}
              onMarkDataEntryComplete={handleMarkDataEntryComplete}
            />
          )}

          {activeView === 'preview' && (
            <PrintPreview
              report={resolvedActiveReport}
              analytics={analytics}
              onBackToReport={() => setActiveView('report')}
              onPrint={handlePrint}
            />
          )}
        </main>
      </div>

      {/* Dialog Modals */}
      <RecordModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        record={editingRecord}
        index={editingRecordIndex}
        onSave={handleSaveRecord}
        defaultProgramLevel={currentUserAccount.programLevelScope !== 'ALL' ? currentUserAccount.programLevelScope : undefined}
        programLevelScope={currentUserAccount.programLevelScope}
        assignedDepartment={currentUserAccount.assignedDepartment}
        existingDepartments={analytics.departments.map((d) => d.department)}
        availableYears={analytics.years}
        isAdmin={currentUserAccount.role === 'admin'}
      />

      <DepartmentModal
        isOpen={departmentModalOpen && currentUserAccount.role === 'admin'}
        onClose={() => setDepartmentModalOpen(false)}
        department={editingDepartment}
        activeYears={analytics.years}
        onSave={handleSaveDepartment}
      />

      <NewReportModal
        isOpen={newReportModalOpen && currentUserAccount.role === 'admin'}
        onClose={() => setNewReportModalOpen(false)}
        onCreate={handleCreateNewReport}
      />

      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        userAccount={currentUserAccount}
        currentPasswordHash={
          currentUserAccount.role === 'admin'
            ? currentUserAccount.password || adminPassword
            : currentUserAccount.password || '1'
        }
        onChangePassword={handleChangePassword}
        onSaveAdminRecovery={
          currentUserAccount.role === 'admin' && currentUserAccount.username === 'admin'
            ? handleSaveAdminRecovery
            : undefined
        }
      />

      <LoginHistoryModal
        isOpen={loginHistoryModalOpen && currentUserAccount.role === 'admin'}
        onClose={() => setLoginHistoryModalOpen(false)}
        history={loginHistory}
      />

      <UserManagementModal
        isOpen={userManagementModalOpen && currentUserAccount.role === 'admin'}
        onClose={() => setUserManagementModalOpen(false)}
        currentUserAccount={currentUserAccount}
        users={users}
        existingDepartments={Array.from(
          new Set([
            ...analytics.departments.map((d) => d.department),
            ...records.map((r) => r[2]).filter(Boolean)
          ])
        )}
        records={records}
        onSwitchUser={handleSwitchUser}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
        onUpdateUser={handleUpdateUser}
      />

      <DocumentationModal
        isOpen={documentationModalOpen}
        onClose={() => setDocumentationModalOpen(false)}
        years={analytics.years}
      />

      <GoogleSheetsModal
        isOpen={googleSheetsModalOpen}
        onClose={() => setGoogleSheetsModalOpen(false)}
        records={formattedRecordItems}
        years={analytics.years}
        currentUserAccount={currentUserAccount}
        onImportRecords={handleImportFromGoogleSheets}
      />

      <GoogleChatModal
        isOpen={googleChatModalOpen}
        onClose={() => setGoogleChatModalOpen(false)}
        report={resolvedActiveReport}
        totalStudents={analytics.totalAllYears}
        departmentCount={analytics.departments.length}
        femalePercentage={analytics.overallFemaleShare}
        currentUserAccount={currentUserAccount}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
