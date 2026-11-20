import { db, auth } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { RawRecord, ReportDocument, UserAccount } from '../types';

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

function sanitizeDocId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || `doc_${Date.now().toString(36)}`;
}

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  const str = typeof val === 'string' ? val : val == null ? fallback : String(val);
  const trimmed = str.slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : fallback;
}

function clampOptionalNumber(val: unknown, min: number, max: number): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return Math.max(min, Math.min(max, num));
}

export function toRecordFirestoreDoc(recordId: string, recordData: RawRecord) {
  const safeId = sanitizeDocId(recordId);
  const rawYear = Number(recordData[0]);
  const safeYear = Number.isFinite(rawYear) ? Math.max(1900, Math.min(2200, Math.round(rawYear))) : 2018;
  const approvalStatus =
    recordData[9] === 'pending' || recordData[9] === 'rejected' ? recordData[9] : 'approved';

  return {
    id: safeId,
    year: safeYear,
    program: clampString(recordData[1], 150, '1st Degree (Applied)'),
    department: clampString(recordData[2], 200, 'General'),
    mode: clampString(recordData[3], 100, 'Regular'),
    campus: recordData[4] ? clampString(recordData[4], 150) : null,
    male: clampOptionalNumber(recordData[5], 0, 1000000),
    female: clampOptionalNumber(recordData[6], 0, 1000000),
    total: clampOptionalNumber(recordData[7], 0, 2000000),
    sourceCell: recordData[8] ? clampString(recordData[8], 100) : null,
    approvalStatus,
    submittedBy: recordData[10] ? clampString(recordData[10], 64) : null,
    updatedAt: Date.now(),
  };
}

function toReportFirestoreDoc(report: ReportDocument) {
  const safeId = sanitizeDocId(report.id);
  const allowedStatuses: ReportDocument['status'][] = ['Draft', 'Under Review', 'Final', 'Archived'];
  const status = allowedStatuses.includes(report.status) ? report.status : 'Draft';

  return stripUndefined({
    id: safeId,
    name: clampString(report.name, 250, 'Untitled Institutional Report'),
    institution: clampString(report.institution, 250, 'Oromia State University'),
    preparedBy: clampString(report.preparedBy, 250, 'OFFICE OF THE VICE PRESIDENT FOR ACADEMIC AFFAIRS'),
    date: clampString(report.date, 100, 'November 2026'),
    status,
    sections: Array.isArray(report.sections) ? report.sections.slice(0, 50) : [],
    customSummary:
      report.customSummary !== undefined && report.customSummary !== null
        ? clampString(report.customSummary, 20000, '')
        : null,
    customFindings: Array.isArray(report.customFindings)
      ? report.customFindings.slice(0, 100).map((f) => String(f))
      : null,
    customNotes: Array.isArray(report.customNotes)
      ? report.customNotes.slice(0, 100).map((n) => String(n))
      : null,
    updatedAt: Math.max(0, Number(report.updatedAt) || Date.now()),
    dataHash: Number.isFinite(Number(report.dataHash)) ? Number(report.dataHash) : 1,
  });
}

function toUserFirestoreDoc(user: UserAccount) {
  const safeUsername = sanitizeDocId(user.username).slice(0, 64);
  const isMainAdmin = safeUsername === 'admin';
  const role =
    user.role === 'admin' && !isMainAdmin
      ? 'all_viewer'
      : isMainAdmin
      ? 'admin'
      : user.role;

  return stripUndefined({
    username: safeUsername,
    name: clampString(user.name, 150, safeUsername),
    role,
    roleTitle: clampString(user.roleTitle, 150, 'User'),
    programLevelScope: clampString(user.programLevelScope, 500, 'ALL'),
    assignedDepartment:
      user.assignedDepartment !== undefined && user.assignedDepartment !== null
        ? clampString(user.assignedDepartment, 1000, 'ALL')
        : null,
    departmentOfferStatus: user.departmentOfferStatus ?? null,
    isActive: user.isActive ?? true,
    dataEntryCompleted: user.dataEntryCompleted ?? false,
    description: clampString(user.description, 500, ''),
    avatarColor: clampString(user.avatarColor, 30, '#0F4C3A'),
    password:
      user.password !== undefined && user.password !== null
        ? String(user.password).slice(0, 128)
        : null,
    recoveryEmail:
      isMainAdmin && user.recoveryEmail
        ? String(user.recoveryEmail).trim().toLowerCase().slice(0, 150)
        : null,
    recoveryPhone:
      isMainAdmin && user.recoveryPhone
        ? String(user.recoveryPhone).trim().slice(0, 40)
        : null,
    updatedAt: Date.now(),
  });
}

const MAX_BATCH_OPS = 400;

// Save Single Record to Firestore
export async function saveRecordToFirestore(recordId: string, recordData: RawRecord) {
  const payload = toRecordFirestoreDoc(recordId, recordData);
  const path = `records/${payload.id}`;
  try {
    await setDoc(doc(db, 'records', payload.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteRecordFromFirestore(recordId: string) {
  const safeId = sanitizeDocId(recordId);
  const path = `records/${safeId}`;
  try {
    await deleteDoc(doc(db, 'records', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Batched diff/seed sync for Records collection
export async function syncRecordsCollectionToFirestore(
  entriesToUpsert: Array<{ id: string; record: RawRecord }>,
  idsToDelete: string[] = []
) {
  const ops: Array<{ type: 'set'; id: string; data: ReturnType<typeof toRecordFirestoreDoc> } | { type: 'delete'; id: string }> = [];

  for (const entry of entriesToUpsert) {
    const payload = toRecordFirestoreDoc(entry.id, entry.record);
    ops.push({ type: 'set', id: payload.id, data: payload });
  }
  for (const delId of idsToDelete) {
    ops.push({ type: 'delete', id: sanitizeDocId(delId) });
  }

  if (ops.length === 0) return;

  try {
    for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
      const chunk = ops.slice(i, i + MAX_BATCH_OPS);
      const batch = writeBatch(db);
      for (const op of chunk) {
        const ref = doc(db, 'records', op.id);
        if (op.type === 'set') {
          batch.set(ref, op.data);
        } else {
          batch.delete(ref);
        }
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'records');
  }
}

// Reset Firestore Records collection to exactly match initialEntries
export async function resetRecordsInFirestore(
  initialEntries: Array<{ id: string; record: RawRecord }>
) {
  try {
    const snapshot = await getDocs(collection(db, 'records'));
    const targetIds = new Set(initialEntries.map((e) => sanitizeDocId(e.id)));
    const idsToDelete: string[] = [];
    snapshot.forEach((docSnap) => {
      if (!targetIds.has(docSnap.id)) {
        idsToDelete.push(docSnap.id);
      }
    });
    await syncRecordsCollectionToFirestore(initialEntries, idsToDelete);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'records');
  }
}

// Save Report to Firestore
export async function saveReportToFirestore(report: ReportDocument) {
  const payload = toReportFirestoreDoc(report);
  const path = `reports/${payload.id}`;
  try {
    await setDoc(doc(db, 'reports', payload.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedReportsToFirestore(reports: ReportDocument[]) {
  if (reports.length === 0) return;
  try {
    for (let i = 0; i < reports.length; i += MAX_BATCH_OPS) {
      const chunk = reports.slice(i, i + MAX_BATCH_OPS);
      const batch = writeBatch(db);
      for (const rep of chunk) {
        const payload = toReportFirestoreDoc(rep);
        batch.set(doc(db, 'reports', payload.id), payload);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'reports');
  }
}

export async function deleteReportFromFirestore(reportId: string) {
  const safeId = sanitizeDocId(reportId);
  const path = `reports/${safeId}`;
  try {
    await deleteDoc(doc(db, 'reports', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save User Account to Firestore
export async function saveUserToFirestore(user: UserAccount) {
  const payload = toUserFirestoreDoc(user);
  const path = `users/${payload.username}`;
  try {
    await setDoc(doc(db, 'users', payload.username), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedUsersToFirestore(users: UserAccount[]) {
  if (users.length === 0) return;
  try {
    for (let i = 0; i < users.length; i += MAX_BATCH_OPS) {
      const chunk = users.slice(i, i + MAX_BATCH_OPS);
      const batch = writeBatch(db);
      for (const user of chunk) {
        const payload = toUserFirestoreDoc(user);
        batch.set(doc(db, 'users', payload.username), payload);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users');
  }
}

export async function deleteUserFromFirestore(username: string) {
  const safeUsername = sanitizeDocId(username);
  const path = `users/${safeUsername}`;
  try {
    await deleteDoc(doc(db, 'users', safeUsername));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save immutable Login Activity Log to Firestore
export async function saveLoginLogToFirestore(entry: { username: string; timestamp: number }) {
  const ts = Math.max(0, Math.round(Number(entry.timestamp) || Date.now()));
  const logId = sanitizeDocId(`log-${ts}-${Math.random().toString(36).slice(2, 8)}`);
  const path = `loginLogs/${logId}`;
  const payload = {
    username: clampString(entry.username, 150, 'Unknown User'),
    timestamp: ts,
  };
  try {
    await setDoc(doc(db, 'loginLogs', logId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
