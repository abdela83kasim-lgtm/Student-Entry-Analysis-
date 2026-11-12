/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RawRecord, ReportDocument, DepartmentSummary, ActiveView, UserAccount, PROGRAM_LEVEL_USERS } from './types';
import { INITIAL_RECORDS, INITIAL_REPORT } from './data/initialData';
import { computeAnalytics, YEARS, getDefaultSourceCell } from './data/analytics';
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
import { ToastContainer, ToastMessage } from './components/Toast';
import { Menu, Edit3, CheckCircle2, Printer, Save, RefreshCw, Building2, Check, X } from 'lucide-react';
import { exportReportToPDF } from './utils/exportPdf';
import { saveRecordToFirestore, deleteRecordFromFirestore, saveReportToFirestore, deleteReportFromFirestore, saveUserToFirestore, deleteUserFromFirestore } from './services/firestoreSync';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY_REPORTS = 'osu-report-studio-v2';
const STORAGE_KEY_DATA = 'osu-data-v2';
const STORAGE_KEY_ADMIN_PWD = 'osu-admin-pwd-v1';
const STORAGE_KEY_ADMIN_AUTH = 'osu-admin-auth-v1';
const DEFAULT_ADMIN_PASSWORD = '1';

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

  // Persistent Users List (Admins can create/edit/delete users across all program levels)
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const stored = localStorage.getItem('osu-user-accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return PROGRAM_LEVEL_USERS;
  });

  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount>(() => {
    try {
      const stored = localStorage.getItem('osu-current-user-account');
      if (stored) {
        return JSON.parse(stored);
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

  // User Management Handlers (Admin exclusive)
  const handleAddUser = (account: UserAccount) => {
    const updated = [...users, account];
    setUsers(updated);
    try {
      localStorage.setItem('osu-user-accounts', JSON.stringify(updated));
    } catch {}
    saveUserToFirestore(account);
    addToast(`Created user account for "${account.name}" (${account.programLevelScope}).`, 'success');
  };

  const handleUpdateUser = (account: UserAccount) => {
    const updated = users.map((u) => (u.username === account.username ? account : u));
    setUsers(updated);
    try {
      localStorage.setItem('osu-user-accounts', JSON.stringify(updated));
    } catch {}
    saveUserToFirestore(account);
    if (currentUserAccount.username === account.username) {
      setCurrentUserAccount(account);
      setCurrentUser(account.name);
    }
    addToast(`Updated user account "${account.name}".`, 'success');
  };

  const handleDeleteUser = (username: string) => {
    if (username === currentUserAccount.username) {
      addToast('Cannot delete the currently active logged-in user account. Switch to another account first.', 'error');
      return;
    }
    const targetUser = users.find((u) => u.username === username);
    if (!targetUser) {
      addToast(`User account "${username}" not found.`, 'error');
      return;
    }
    // Prevent deleting the last remaining admin account so system always has an administrator
    if (targetUser.role === 'admin') {
      const remainingAdmins = users.filter((u) => u.role === 'admin' && u.username !== username);
      if (remainingAdmins.length === 0) {
        addToast('Cannot delete the last remaining Administrator account. Please create another admin first.', 'error');
        return;
      }
    }
    const updated = users.filter((u) => u.username !== username);
    setUsers(updated);
    try {
      localStorage.setItem('osu-user-accounts', JSON.stringify(updated));
    } catch {}
    deleteUserFromFirestore(username);
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
      setLoginHistory((prev) => [...prev, newHistoryEntry]);
      if (remember) {
        localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, selected.name);
        localStorage.setItem('osu-current-user-account', JSON.stringify(selected));
      } else {
        sessionStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
      }
      localStorage.setItem('osu-login-history', JSON.stringify([...loginHistory, newHistoryEntry]));
      addToast(`Signed in as ${selected.name} (${selected.roleTitle}).`, 'success');
      return true;
    }
    return false;
  };

  const handleSwitchUser = (user: UserAccount) => {
    setCurrentUser(user.name);
    setCurrentUserAccount(user);
    localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, user.name);
    localStorage.setItem('osu-current-user-account', JSON.stringify(user));
    const newHistoryEntry = { username: `Switched: ${user.name} (${user.roleTitle})`, timestamp: Date.now() };
    setLoginHistory((prev) => [...prev, newHistoryEntry]);
    localStorage.setItem('osu-login-history', JSON.stringify([...loginHistory, newHistoryEntry]));
    addToast(`Switched active user to ${user.name} (${user.roleTitle}).`, 'info');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    setIsEditing(false);
    addToast('Session locked.', 'info');
  };

  const handleChangePassword = (newPwd: string) => {
    try {
      setAdminPassword(newPwd);
      localStorage.setItem(STORAGE_KEY_ADMIN_PWD, newPwd);

      if (currentUserAccount) {
        const updatedUser = { ...currentUserAccount, password: newPwd };
        setCurrentUserAccount(updatedUser);
        localStorage.setItem('osu-current-user-account', JSON.stringify(updatedUser));
        const updatedUsers = users.map((u) => (u.username === updatedUser.username ? updatedUser : u));
        setUsers(updatedUsers);
        localStorage.setItem('osu-user-accounts', JSON.stringify(updatedUsers));
        saveUserToFirestore(updatedUser);
      }
      addToast('Password updated successfully across all devices. New password is now active globally.', 'success');
    } catch (e) {
      console.error('Failed to save password change:', e);
      addToast('Failed to update password. Please try again.', 'error');
    }
  };

  // Strict Data Isolation: Compute scoped records based on program level and assigned department
  const scopedRecords = useMemo(() => {
    if (
      currentUserAccount.role === 'admin' ||
      currentUserAccount.role === 'registrar' ||
      (currentUserAccount.programLevelScope === 'ALL' &&
        (!currentUserAccount.assignedDepartment || currentUserAccount.assignedDepartment === 'ALL'))
    ) {
      return records;
    }
    return records.filter((r) => {
      const matchProgram =
        currentUserAccount.programLevelScope === 'ALL' ||
        r[1] === currentUserAccount.programLevelScope;
      const matchDept =
        !currentUserAccount.assignedDepartment ||
        currentUserAccount.assignedDepartment === 'ALL' ||
        r[2].toLowerCase() === currentUserAccount.assignedDepartment.toLowerCase();
      return matchProgram && matchDept;
    });
  }, [records, currentUserAccount]);

  // Handlers for Department Offering Acceptance & Completion
  const handleAcceptDepartmentOffer = () => {
    const updatedUser: UserAccount = {
      ...currentUserAccount,
      departmentOfferStatus: 'accepted'
    };
    handleUpdateUser(updatedUser);
    addToast(
      `Accepted assignment for Department of ${currentUserAccount.assignedDepartment}. You can now add and edit student records.`,
      'success'
    );
  };

  const handleDeclineDepartmentOffer = () => {
    const updatedUser: UserAccount = {
      ...currentUserAccount,
      departmentOfferStatus: 'declined'
    };
    handleUpdateUser(updatedUser);
    addToast(`Department assignment offer declined.`, 'info');
  };

  const handleMarkDataEntryComplete = () => {
    const updatedUser: UserAccount = {
      ...currentUserAccount,
      dataEntryCompleted: true
    };
    handleUpdateUser(updatedUser);
    addToast(
      `All student data entry for Department of ${currentUserAccount.assignedDepartment} marked as complete! Administrator has been notified.`,
      'success'
    );
  };

  // Compute analytics from scoped records
  const analytics = useMemo(() => computeAnalytics(scopedRecords), [scopedRecords]);

  // Active Report
  const activeReport = useMemo(() => {
    return reports.find((r) => r.id === activeReportId) || reports[0] || INITIAL_REPORT;
  }, [reports, activeReportId]);

  // Persist records
  const saveRecordsToStorage = (newRecords: RawRecord[]) => {
    setRecords(newRecords);
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(newRecords));
      newRecords.forEach((r) => {
        const recordId = `rec-${r[0]}-${r[1]}-${r[2]}-${r[3]}-${r[4]}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        saveRecordToFirestore(recordId, r);
      });
    } catch (e) {
      console.error('Storage quota exceeded for data records', e);
    }
  };

  // Persist reports
  const saveReportsToStorage = (newReports: ReportDocument[]) => {
    setReports(newReports);
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(newReports));
      newReports.forEach((rep) => {
        saveReportToFirestore(rep);
      });
    } catch (e) {
      console.error('Storage quota exceeded for reports', e);
    }
  };

  // Update current report
  const handleUpdateReport = useCallback((updates: Partial<ReportDocument>) => {
    setReports((prev) =>
      prev.map((r) => (r.id === activeReportId ? { ...r, ...updates, updatedAt: Date.now() } : r))
    );
    setIsDirty(true);
  }, [activeReportId]);

  // Save changes explicitly
  const handleSaveChanges = () => {
    const updated = reports.map((r) =>
      r.id === activeReportId ? { ...r, updatedAt: Date.now() } : r
    );
    saveReportsToStorage(updated);
    setIsDirty(false);
    addToast('Report changes successfully saved.', 'success');
  };

  // Save as copy / duplicate
  const handleDuplicateReport = (targetReport: ReportDocument) => {
    const newId = 'rep-' + Date.now().toString(36);
    const duplicated: ReportDocument = {
      ...targetReport,
      id: newId,
      name: `${targetReport.name} (Copy)`,
      status: 'Draft',
      updatedAt: Date.now()
    };
    const updated = [duplicated, ...reports];
    saveReportsToStorage(updated);
    setActiveReportId(newId);
    addToast(`Created duplicate report "${duplicated.name}".`, 'info');
  };

  // Delete report
  const handleDeleteReport = (id: string) => {
    const reportToDelete = reports.find((r) => r.id === id);
    if (!reportToDelete) return;

    deleteReportFromFirestore(id);
    const remaining = reports.filter((r) => r.id !== id);
    if (remaining.length === 0) {
      saveReportsToStorage([INITIAL_REPORT]);
      setActiveReportId(INITIAL_REPORT.id);
    } else {
      saveReportsToStorage(remaining);
      if (activeReportId === id) {
        setActiveReportId(remaining[0].id);
      }
    }
    addToast(`Deleted report "${reportToDelete.name}".`, 'info');
  };

  // Create new report
  const handleCreateNewReport = (reportConfig: Partial<ReportDocument>) => {
    const newId = 'rep-' + Date.now().toString(36);
    const newDoc: ReportDocument = {
      id: newId,
      name: reportConfig.name || 'Untitled Institutional Report',
      institution: reportConfig.institution || 'Oromia State University',
      preparedBy: reportConfig.preparedBy || 'Office of Institutional Research & Planning',
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
    saveReportsToStorage(updated);
    setActiveReportId(newId);
    setActiveView('report');
    setIsEditing(true);
    addToast(`New report "${newDoc.name}" ready for editing.`, 'success');
  };

  // Toggle Section
  const handleToggleSection = (sectionId: string) => {
    const updatedSections = activeReport.sections.map((s) =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    );
    handleUpdateReport({ sections: updatedSections });
  };

  // Rebuild report from current records
  const handleRebuildReport = () => {
    // Regenerate report summaries & findings based on latest computeAnalytics
    handleUpdateReport({
      dataHash: Date.now(),
      updatedAt: Date.now()
    });
    addToast('Report statistics synchronized with latest Data Ledger entries.', 'success');
  };

  // Findings & Notes handlers
  const handleAddFinding = () => {
    const current = activeReport.customFindings || [];
    handleUpdateReport({
      customFindings: [...current, 'New analytical finding or institutional observation...']
    });
  };

  const handleDeleteFinding = (idx: number) => {
    const current = [...(activeReport.customFindings || [])];
    current.splice(idx, 1);
    handleUpdateReport({ customFindings: current });
  };

  const handleAddNote = () => {
    const current = activeReport.customNotes || [];
    handleUpdateReport({
      customNotes: [...current, 'New methodology or data provenance note...']
    });
  };

  const handleDeleteNote = (idx: number) => {
    const current = [...(activeReport.customNotes || [])];
    current.splice(idx, 1);
    handleUpdateReport({ customNotes: current });
  };

  // Record CRUD
  const handleSaveRecord = (rec: RawRecord, idx: number | null, andAddAnother = false) => {
    // Permission policy: All users can add new data, but only Administrator can edit existing records
    if (editingRecord && currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Users can only add new records. Editing existing records is restricted to Administrator.', 'error');
      return;
    }

    const updated = [...records];
    const safeRec: RawRecord = [...rec];
    if (!safeRec[8] || !safeRec[8].trim()) {
      safeRec[8] = getDefaultSourceCell(safeRec[0], safeRec[3], safeRec[4]);
    }

    if (editingRecord) {
      const matchIdx = updated.findIndex(
        (r) =>
          r === editingRecord ||
          (r[0] === editingRecord[0] &&
            r[1] === editingRecord[1] &&
            r[2] === editingRecord[2] &&
            r[3] === editingRecord[3] &&
            r[4] === editingRecord[4])
      );
      if (matchIdx >= 0) {
        updated[matchIdx] = safeRec;
      } else if (idx !== null && idx >= 0 && idx < updated.length) {
        updated[idx] = safeRec;
      } else {
        updated.push(safeRec);
      }
    } else {
      updated.push(safeRec);
    }

    saveRecordsToStorage(updated);
    setIsDirty(true);
    addToast(
      andAddAnother
        ? `Added record for "${safeRec[2]}" (${safeRec[0]}). Ready for next record.`
        : `Record for "${safeRec[2]}" (${safeRec[0]}) saved successfully.`,
      'success'
    );
  };

  const handleDeleteRecord = (targetRecord: RawRecord, idx?: number) => {
    // Permission policy: Users cannot delete records
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Users can only add new records. Deletion is restricted to Administrator.', 'error');
      return;
    }

    const recordId = `rec-${targetRecord[0]}-${targetRecord[1]}-${targetRecord[2]}-${targetRecord[3]}-${targetRecord[4]}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    deleteRecordFromFirestore(recordId);

    const updated = records.filter(
      (r) =>
        r !== targetRecord &&
        !(
          r[0] === targetRecord[0] &&
          r[1] === targetRecord[1] &&
          r[2] === targetRecord[2] &&
          r[3] === targetRecord[3] &&
          r[4] === targetRecord[4] &&
          r[5] === targetRecord[5] &&
          r[6] === targetRecord[6]
        )
    );
    saveRecordsToStorage(updated);
    setIsDirty(true);
    addToast('Data record removed.', 'info');
  };

  // Department CRUD & cascading sync
  const handleSaveDepartment = (
    deptName: string,
    programLevel: string,
    yearsValues: number[],
    oldDept?: { name: string; program: string }
  ) => {
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
    const targetYears = analytics.years && analytics.years.length > 0 ? analytics.years : YEARS;
    targetYears.forEach((yr, i) => {
      const want = yearsValues[i];
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
    saveRecordsToStorage(updated);
    setIsDirty(true);
    addToast(`Department "${dept.department}" and all associated records removed.`, 'info');
  };

  const handleResetData = () => {
    if (currentUserAccount.role !== 'admin') {
      addToast('Permission restricted: Only Administrator can reset data baseline.', 'error');
      return;
    }
    saveRecordsToStorage(INITIAL_RECORDS);
    setIsDirty(true);
    addToast('Restored original institutional archival records from Excel.', 'info');
  };

  // Print Report Handler
  const handlePrint = async () => {
    // If in editing mode, finish editing first so outlines are not displayed
    if (isEditing) {
      setIsEditing(false);
    }
    try {
      if (typeof window !== 'undefined' && window.print) {
        window.print();
      }
    } catch (e) {
      console.warn('window.print failed or blocked by iframe:', e);
    }
    const success = await exportReportToPDF('osu-report-paper', `${activeReport.name || 'OSU_Active_Student_Report'}.pdf`);
    if (success) {
      addToast('Report PDF downloaded successfully.', 'success');
    }
  };

  // Export HTML
  const handleExportHTML = () => {
    const docHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${activeReport.name} - ${activeReport.institution}</title>
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
<div style="background:#0F4C3A; color:#fff; padding: 32px 40px; border-bottom: 5px solid #E0A526;">
  <p style="margin:0 0 6px; color:#A9D3C2; font-size: 13px; text-transform: uppercase;">${activeReport.institution}</p>
  <h1 style="margin:0 0 10px; color:#fff; font-size: 32px;">${activeReport.name}</h1>
  <p style="margin:0; color:#CFE6DC; font-size: 13px;">Prepared by: ${activeReport.preparedBy} · Date: ${activeReport.date}</p>
</div>
<div style="padding: 24px 40px;">
  <h2>Executive Summary</h2>
  <p>${activeReport.customSummary || 'Official university report'}</p>
  <h2>Key Findings</h2>
  <ol>
    ${(activeReport.customFindings || []).map((f) => `<li>${f}</li>`).join('')}
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
    link.setAttribute('download', `${activeReport.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`);
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
    link.setAttribute('download', `OSU_Report_Studio_Backup_${Date.now()}.json`);
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
              setUsers(parsed);
              if (currentUserAccount) {
                const fresh = parsed.find((u: UserAccount) => u.username === currentUserAccount.username);
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

  // Real-time Firestore synchronization for records and reports across all users and devices
  useEffect(() => {
    try {
      const unsubRecords = onSnapshot(collection(db, 'records'), (snapshot) => {
        if (!snapshot.empty) {
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
                d.sourceCell || null
              ]);
            }
          });
          if (cloudRecords.length > 0) {
            setRecords(cloudRecords);
            localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(cloudRecords));
          }
        }
      }, (err) => {
        console.warn('Firestore records real-time sync error:', err);
      });

      const unsubReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
        if (!snapshot.empty) {
          const cloudReports: ReportDocument[] = [];
          snapshot.forEach((docSnap) => {
            const r = docSnap.data() as ReportDocument;
            if (r && r.id) {
              cloudReports.push(r);
            }
          });
          if (cloudReports.length > 0) {
            setReports(cloudReports);
            localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(cloudReports));
          }
        }
      }, (err) => {
        console.warn('Firestore reports real-time sync error:', err);
      });

      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!snapshot.empty) {
          const cloudUsers: UserAccount[] = [];
          snapshot.forEach((docSnap) => {
            const u = docSnap.data() as UserAccount;
            if (u && u.username) {
              cloudUsers.push(u);
            }
          });
          if (cloudUsers.length > 0) {
            setUsers(cloudUsers);
            localStorage.setItem('osu-user-accounts', JSON.stringify(cloudUsers));

            // Check if active user password or status changed on another device
            if (currentUserAccount) {
              const freshUser = cloudUsers.find((u) => u.username === currentUserAccount.username);
              if (freshUser) {
                if (freshUser.password && freshUser.password !== currentUserAccount.password) {
                  setIsAuthenticated(false);
                  localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
                  sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
                  addToast('Security notice: Your password was updated on another device. Please sign in with your new password.', 'info');
                } else if (freshUser.isActive === false) {
                  setIsAuthenticated(false);
                  localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
                  sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
                  addToast('Security notice: Your account was deactivated by Administrator.', 'error');
                }
              }
            }
          }
        } else {
          // If cloud users collection is empty, seed default accounts to cloud
          PROGRAM_LEVEL_USERS.forEach((u) => saveUserToFirestore(u));
        }
      }, (err) => {
        console.warn('Firestore users real-time sync error:', err);
      });

      return () => {
        unsubRecords();
        unsubReports();
        unsubUsers();
      };
    } catch (e) {
      console.warn('Firestore realtime listeners init error:', e);
    }
  }, []);

  // If not authenticated, display Admin Password login screen
  if (!isAuthenticated) {
    return (
      <>
        <AdminLogin onLogin={handleLogin} users={users} />
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
        onSave={handleSaveChanges}
        onNewReport={() => setNewReportModalOpen(true)}
        onAddDataRecord={() => {
          setEditingRecord(null);
          setEditingRecordIndex(null);
          setRecordModalOpen(true);
        }}
        isDirty={isDirty}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onLogout={handleLogout}
        onOpenChangePassword={() => setChangePasswordModalOpen(true)}
        onOpenLoginHistory={() => setLoginHistoryModalOpen(true)}
        onOpenUserManagement={() => setUserManagementModalOpen(true)}
        onOpenDocumentation={() => setDocumentationModalOpen(true)}
        onExportJSON={handleExportJSON}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => {
          setSidebarOpen((prev) => !prev);
          setMobileSidebarOpen((prev) => !prev);
        }}
      />

      {/* Department Assignment Offer Prompt Banner */}
      {currentUserAccount.assignedDepartment &&
        currentUserAccount.assignedDepartment !== 'ALL' &&
        currentUserAccount.departmentOfferStatus === 'offered' && (
          <div className="bg-[#FFF4D9] dark:bg-[#2A2312] border-b-2 border-[#E0A526] px-4 py-3 text-xs sm:text-sm text-[#543803] dark:text-[#F3D78E] shadow-sm no-print animate-in fade-in">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-[#E0A526]/20 rounded-lg text-[#E0A526]">
                  <Building2 className="w-5 h-5 shrink-0" />
                </span>
                <div>
                  <p className="font-bold text-[#3B2602] dark:text-[#FCE8B3]">
                    Department Assignment Offer: Department of {currentUserAccount.assignedDepartment}
                  </p>
                  <p className="text-xs text-[#70500A] dark:text-[#E0C98E]">
                    The University Administrator has offered you the role of Department Coordinator for{' '}
                    <strong>{currentUserAccount.assignedDepartment}</strong> ({currentUserAccount.programLevelScope}).
                    Accepting will allow you to add and edit student records strictly for this department.
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
        )}

      {/* Student Data Entry Completed Status Banner */}
      {currentUserAccount.dataEntryCompleted && (
        <div className="bg-[#EBF7F2] dark:bg-[#11271F] border-b border-[#2FA378]/40 px-4 py-2.5 text-xs sm:text-sm text-[#0F4C3A] dark:text-[#A9D3C2] shadow-xs no-print">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2FA378] shrink-0" />
              <span>
                <strong>Student Admissions Data Entry Complete:</strong> All student records for{' '}
                <strong>{currentUserAccount.assignedDepartment || currentUserAccount.programLevelScope}</strong> have been
                submitted. The Administrator can now review and deactivate this account once finalized.
              </span>
            </div>
            {currentUserAccount.role === 'admin' && (
              <button
                onClick={() => setUserManagementModalOpen(true)}
                className="px-2.5 py-1 bg-[#0F4C3A] text-white text-xs font-semibold rounded hover:bg-[#1A5C49] cursor-pointer"
              >
                Manage Users
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex w-full">
        {/* Left Sidebar */}
        <Sidebar
          reports={reports}
          activeReportId={activeReportId}
          onSelectReport={(id) => {
            setActiveReportId(id);
            setActiveView('report');
            setIsEditing(false);
          }}
          onNewReport={() => setNewReportModalOpen(true)}
          onDuplicateReport={handleDuplicateReport}
          onDeleteReport={handleDeleteReport}
          onToggleSection={handleToggleSection}
          onRebuildReport={handleRebuildReport}
          onExportJSON={handleExportJSON}
          onExportHTML={handleExportHTML}
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
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-[#0F4C3A] text-white rounded-md text-xs font-semibold hover:bg-[#1A5C49] shrink-0 cursor-pointer"
              >
                Done Editing
              </button>
            </div>
          )}

          {/* View Routing */}
          {activeView === 'report' && (
            <ReportPaper
              report={activeReport}
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
                setEditingDepartment(dept);
                setDepartmentModalOpen(true);
              }}
              onAddDept={() => {
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
                setEditingRecord(rec);
                setEditingRecordIndex(idx);
                setRecordModalOpen(true);
              }}
              onDeleteRecord={handleDeleteRecord}
              onResetData={handleResetData}
              onMarkDataEntryComplete={handleMarkDataEntryComplete}
            />
          )}

          {activeView === 'preview' && (
            <PrintPreview
              report={activeReport}
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
        assignedDepartment={currentUserAccount.assignedDepartment}
        existingDepartments={analytics.departments.map((d) => d.department)}
      />

      <DepartmentModal
        isOpen={departmentModalOpen}
        onClose={() => setDepartmentModalOpen(false)}
        department={editingDepartment}
        activeYears={analytics.years}
        onSave={handleSaveDepartment}
      />

      <NewReportModal
        isOpen={newReportModalOpen}
        onClose={() => setNewReportModalOpen(false)}
        onCreate={handleCreateNewReport}
      />

      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        currentPasswordHash={adminPassword}
        onChangePassword={handleChangePassword}
      />

      <LoginHistoryModal
        isOpen={loginHistoryModalOpen}
        onClose={() => setLoginHistoryModalOpen(false)}
        history={loginHistory}
      />

      <UserManagementModal
        isOpen={userManagementModalOpen}
        onClose={() => setUserManagementModalOpen(false)}
        currentUserAccount={currentUserAccount}
        users={users}
        existingDepartments={analytics.departments.map((d) => d.department)}
        records={records}
        onSwitchUser={handleSwitchUser}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
        onUpdateUser={handleUpdateUser}
      />

      <DocumentationModal
        isOpen={documentationModalOpen}
        onClose={() => setDocumentationModalOpen(false)}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
