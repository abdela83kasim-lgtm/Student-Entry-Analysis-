import { db, auth } from '../firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import { RawRecord, ReportDocument, UserAccount } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Save Record to Firestore
export async function saveRecordToFirestore(recordId: string, recordData: RawRecord) {
  const path = `records/${recordId}`;
  try {
    await setDoc(doc(db, 'records', recordId), {
      id: recordId,
      year: recordData[0],
      program: recordData[1],
      department: recordData[2],
      mode: recordData[3],
      campus: recordData[4],
      male: recordData[5],
      female: recordData[6],
      total: recordData[7],
      sourceCell: recordData[8],
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteRecordFromFirestore(recordId: string) {
  const path = `records/${recordId}`;
  try {
    await deleteDoc(doc(db, 'records', recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save Report to Firestore
export async function saveReportToFirestore(report: ReportDocument) {
  const path = `reports/${report.id}`;
  try {
    await setDoc(doc(db, 'reports', report.id), {
      ...report,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteReportFromFirestore(reportId: string) {
  const path = `reports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save User Account to Firestore
export async function saveUserToFirestore(user: UserAccount) {
  const path = `users/${user.username}`;
  try {
    await setDoc(doc(db, 'users', user.username), {
      ...user,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserFromFirestore(username: string) {
  const path = `users/${username}`;
  try {
    await deleteDoc(doc(db, 'users', username));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
