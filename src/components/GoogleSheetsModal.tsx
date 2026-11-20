import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, ExternalLink, Download, Upload, RefreshCw, Check, AlertTriangle, Database, Layers, ShieldCheck } from 'lucide-react';
import { RecordItem, UserAccount } from '../types';
import { formatYearSpan } from '../data/analytics';
import {
  googleSignIn,
  googleSignOut,
  initGoogleAuthListener,
  getCachedGoogleAccessToken,
  createGoogleSpreadsheet,
  syncRecordsToExistingSheet,
  listDriveSpreadsheets,
  getSpreadsheetMetadata,
  importRecordsFromGoogleSheet,
  DriveSpreadsheetFile
} from '../services/googleSheetsService';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: RecordItem[];
  years?: number[];
  currentUserAccount?: UserAccount;
  onImportRecords: (newRecords: Partial<RecordItem>[]) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  records,
  years,
  currentUserAccount,
  onImportRecords
}) => {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(getCachedGoogleAccessToken());
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Tabs inside modal: 'export' | 'import' | 'existing'
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'existing'>('export');

  const defaultSpreadsheetTitle = `OSU Active Student Admissions ${formatYearSpan(years, '-')}`;
  // Sheet creation / sync state
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>(defaultSpreadsheetTitle);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  useEffect(() => {
    setSpreadsheetTitle((prev) =>
      /^OSU Active Student Admissions\s+(?:\d{4}-\d{4}|\d{4})$/i.test(prev.trim())
        ? defaultSpreadsheetTitle
        : prev
    );
  }, [defaultSpreadsheetTitle]);

  // Drive sheets list
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState<boolean>(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [syncMode, setSyncMode] = useState<'overwrite' | 'append'>('overwrite');

  // Confirmation modal state for destructive / mutating sheet updates
  const [pendingConfirm, setPendingConfirm] = useState<{
    type: 'overwrite_sheet' | 'import_records';
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);

  // Preview of imported rows
  const [importedPreview, setImportedPreview] = useState<Partial<RecordItem>[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initGoogleAuthListener(
      (user, tok) => {
        setGoogleUser(user);
        setToken(tok);
      },
      () => {
        setGoogleUser(null);
        setToken(null);
      }
    );

    if (token) {
      fetchDriveFiles(token);
    }

    return () => unsubscribe();
  }, [isOpen, token]);

  const fetchDriveFiles = async (tok: string) => {
    setLoadingDrive(true);
    try {
      const files = await listDriveSpreadsheets(tok);
      setDriveFiles(files);
      if (files.length > 0 && !selectedFileId) {
        setSelectedFileId(files[0].id);
        fetchSheetsForFile(tok, files[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching drive spreadsheets:', err);
    } finally {
      setLoadingDrive(false);
    }
  };

  const fetchSheetsForFile = async (tok: string, fileId: string) => {
    try {
      const meta = await getSpreadsheetMetadata(tok, fileId);
      setAvailableSheets(meta.sheets);
      if (meta.sheets.length > 0) {
        setSelectedSheetName(meta.sheets[0]);
      }
    } catch (err: any) {
      console.error('Error fetching sheet tabs:', err);
    }
  };

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setToken(result.accessToken);
        setStatusMessage({ text: `Signed in successfully as ${result.user.email}`, type: 'success' });
        fetchDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to authenticate with Google.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setToken(null);
    setDriveFiles([]);
    setStatusMessage({ text: 'Signed out from Google Workspace.', type: 'info' });
  };

  const handleCreateNewSheet = async () => {
    if (!token) return;
    setLoading(true);
    setStatusMessage(null);
    setCreatedUrl(null);
    try {
      const result = await createGoogleSpreadsheet(token, spreadsheetTitle, records);
      setCreatedUrl(result.spreadsheetUrl);
      setStatusMessage({
        text: `Successfully created Google Sheet with ${records.length} active student records!`,
        type: 'success'
      });
      fetchDriveFiles(token);
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to create Google Sheet.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToExistingSheetClick = () => {
    if (!selectedFileId || !selectedSheetName || !token) {
      setStatusMessage({ text: 'Please select a Google Sheet and Tab name first.', type: 'error' });
      return;
    }

    const file = driveFiles.find((f) => f.id === selectedFileId);
    const fileName = file ? file.name : selectedFileId;

    if (syncMode === 'overwrite') {
      // Require explicit confirmation dialog before overwriting existing data
      setPendingConfirm({
        type: 'overwrite_sheet',
        title: `Overwrite contents of "${fileName}"?`,
        description: `This will clear all existing rows in tab "${selectedSheetName}" and replace them with ${records.length} current active student records from Oromia State University database.`,
        action: async () => {
          await executeSyncToExisting('overwrite');
        }
      });
    } else {
      executeSyncToExisting('append');
    }
  };

  const executeSyncToExisting = async (mode: 'overwrite' | 'append') => {
    if (!token || !selectedFileId || !selectedSheetName) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      await syncRecordsToExistingSheet(token, selectedFileId, selectedSheetName, records, mode);
      setStatusMessage({
        text: `Successfully ${mode === 'overwrite' ? 'overwritten' : 'appended'} ${records.length} records in Google Sheet tab "${selectedSheetName}"!`,
        type: 'success'
      });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to sync with Google Sheet.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewImport = async () => {
    if (!token || !selectedFileId || !selectedSheetName) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const imported = await importRecordsFromGoogleSheet(token, selectedFileId, selectedSheetName);
      setImportedPreview(imported);
      if (imported.length === 0) {
        setStatusMessage({ text: 'No record rows were found in the selected sheet.', type: 'info' });
      } else {
        setStatusMessage({ text: `Found ${imported.length} rows ready for import. Review below and confirm.`, type: 'info' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to read Google Sheet rows.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImportClick = () => {
    if (importedPreview.length === 0) return;

    setPendingConfirm({
      type: 'import_records',
      title: `Import ${importedPreview.length} Student Records into Central Database?`,
      description: `This operation will add ${importedPreview.length} new active student records into Oromia State University's central Firestore database. All connected devices will see the updated dataset immediately.`,
      action: async () => {
        onImportRecords(importedPreview);
        setImportedPreview([]);
        setStatusMessage({
          text: `Successfully imported ${importedPreview.length} student records into central database!`,
          type: 'success'
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0F4C3A] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-snug">
                Google Sheets Integration & Database Sync
              </h3>
              <p className="text-xs text-emerald-100">
                Oromia State University Institutional Data Exchange
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Status Banner */}
          {statusMessage && (
            <div
              className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : statusMessage.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : statusMessage.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              ) : (
                <Database className="w-4 h-4 shrink-0 text-blue-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Authentication Section */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 shadow-xs border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {googleUser ? googleUser.displayName || googleUser.email : 'Google Workspace Account'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {token ? 'Authenticated with Google Sheets & Drive Scopes' : 'Sign in to access Google Drive & Sheets API'}
                </p>
              </div>
            </div>

            {token ? (
              <button
                onClick={handleGoogleSignOut}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Disconnect Account
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="gsi-material-button cursor-pointer flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-xl hover:shadow-md transition-all text-xs"
              >
                <div className="gsi-material-button-icon shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                </div>
                <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>

          {!token ? (
            <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <ShieldCheck className="w-12 h-12 text-[#0F4C3A] dark:text-emerald-400 mx-auto mb-3 opacity-80" />
              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">
                Google Authorization Required
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                Sign in with your Google account above to export student records directly into Google Spreadsheets or import spreadsheet data into Oromia State University central database.
              </p>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="px-5 py-2.5 bg-[#0F4C3A] hover:bg-[#0A3428] text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Connect Google Drive & Sheets</span>
              </button>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setActiveTab('export')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    activeTab === 'export'
                      ? 'border-[#0F4C3A] text-[#0F4C3A] dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Create New Google Sheet</span>
                </button>

                <button
                  onClick={() => setActiveTab('existing')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    activeTab === 'existing'
                      ? 'border-[#0F4C3A] text-[#0F4C3A] dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync to Existing Sheet</span>
                </button>

                <button
                  onClick={() => setActiveTab('import')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    activeTab === 'import'
                      ? 'border-[#0F4C3A] text-[#0F4C3A] dark:border-emerald-400 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Records from Sheet</span>
                </button>
              </div>

              {/* TAB 1: Create New Google Sheet */}
              {activeTab === 'export' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Spreadsheet Document Title
                    </label>
                    <input
                      type="text"
                      value={spreadsheetTitle}
                      onChange={(e) => setSpreadsheetTitle(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#0F4C3A]"
                    />
                  </div>

                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                    <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                      Data Payload Summary
                    </h5>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Exporting <strong>{records.length} active student record rows</strong> with full column attributes (Academic Year, Program Level, Department, Mode, Campus, Gender totals).
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleCreateNewSheet}
                      disabled={loading || records.length === 0}
                      className="px-5 py-2.5 bg-[#0F4C3A] hover:bg-[#0A3428] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>Export All Records to Google Sheets</span>
                    </button>

                    {createdUrl && (
                      <a
                        href={createdUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Created Sheet</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Sync to Existing Sheet */}
              {activeTab === 'existing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Select Google Sheet from Drive
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedFileId}
                          onChange={(e) => {
                            setSelectedFileId(e.target.value);
                            if (token) fetchSheetsForFile(token, e.target.value);
                          }}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          {driveFiles.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => token && fetchDriveFiles(token)}
                          className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl"
                          title="Refresh Drive files"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingDrive ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Select Tab / Sheet
                      </label>
                      <select
                        value={selectedSheetName}
                        onChange={(e) => setSelectedSheetName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        {availableSheets.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Sync Mode
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="syncMode"
                          checked={syncMode === 'overwrite'}
                          onChange={() => setSyncMode('overwrite')}
                          className="text-[#0F4C3A]"
                        />
                        <span>Overwrite Sheet Data (Clear & Replace)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="syncMode"
                          checked={syncMode === 'append'}
                          onChange={() => setSyncMode('append')}
                          className="text-[#0F4C3A]"
                        />
                        <span>Append New Rows at Bottom</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSyncToExistingSheetClick}
                      disabled={loading || !selectedFileId}
                      className="px-5 py-2.5 bg-[#0F4C3A] hover:bg-[#0A3428] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      <span>Sync Data to Selected Google Sheet</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: Import Records from Sheet */}
              {activeTab === 'import' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Source Google Sheet File
                      </label>
                      <select
                        value={selectedFileId}
                        onChange={(e) => {
                          setSelectedFileId(e.target.value);
                          if (token) fetchSheetsForFile(token, e.target.value);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        {driveFiles.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Tab Name
                      </label>
                      <select
                        value={selectedSheetName}
                        onChange={(e) => setSelectedSheetName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        {availableSheets.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePreviewImport}
                      disabled={loading || !selectedFileId}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>Fetch & Preview Sheet Data</span>
                    </button>
                  </div>

                  {importedPreview.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Previewing {importedPreview.length} Rows from Google Sheet:
                        </span>
                        <button
                          onClick={handleConfirmImportClick}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Import {importedPreview.length} Records to Database</span>
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                        <table className="w-full text-[11px] text-left text-slate-600 dark:text-slate-300">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase text-[10px] sticky top-0">
                            <tr>
                              <th className="px-3 py-1.5">Year</th>
                              <th className="px-3 py-1.5">Program</th>
                              <th className="px-3 py-1.5">Department</th>
                              <th className="px-3 py-1.5">Mode</th>
                              <th className="px-3 py-1.5">Male</th>
                              <th className="px-3 py-1.5">Female</th>
                              <th className="px-3 py-1.5">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {importedPreview.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-3 py-1 font-mono">{item.year}</td>
                                <td className="px-3 py-1">{item.program}</td>
                                <td className="px-3 py-1 font-semibold">{item.department}</td>
                                <td className="px-3 py-1">{item.mode}</td>
                                <td className="px-3 py-1">{item.male}</td>
                                <td className="px-3 py-1">{item.female}</td>
                                <td className="px-3 py-1 font-bold">{item.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Oromia State University · Google Workspace Connector</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Destructive / Data Mutating Actions */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-700 p-5 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {pendingConfirm.title}
              </h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {pendingConfirm.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const act = pendingConfirm.action;
                  setPendingConfirm(null);
                  await act();
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Confirm Operation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
