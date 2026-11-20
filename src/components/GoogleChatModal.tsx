import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, RefreshCw, Check, AlertTriangle, ExternalLink, ShieldAlert, Building } from 'lucide-react';
import { ReportDocument, UserAccount } from '../types';
import {
  googleSignIn,
  googleSignOut,
  initGoogleAuthListener,
  getCachedGoogleAccessToken
} from '../services/googleSheetsService';
import {
  listGoogleChatSpaces,
  sendGoogleChatMessage,
  sendReportSummaryToGoogleChat,
  ChatSpace,
  CHAT_APP_CONSOLE_URL
} from '../services/googleChatService';

interface GoogleChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportDocument;
  totalStudents: number;
  departmentCount: number;
  femalePercentage: number;
  currentUserAccount?: UserAccount;
}

export const GoogleChatModal: React.FC<GoogleChatModalProps> = ({
  isOpen,
  onClose,
  report,
  totalStudents,
  departmentCount,
  femalePercentage,
  currentUserAccount
}) => {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(getCachedGoogleAccessToken());
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Chat Spaces & Message State
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState<boolean>(false);
  const [selectedSpaceName, setSelectedSpaceName] = useState<string>('');
  const [manualSpaceName, setManualSpaceName] = useState<string>('');
  const [customMessageText, setCustomMessageText] = useState<string>(
    `🏛️ Oromia State University Admissions Update: ${totalStudents.toLocaleString()} total active students across ${departmentCount} departments.`
  );
  const [messageMode, setMessageMode] = useState<'report_card' | 'custom'>('report_card');
  const [chatAppConfigRequired, setChatAppConfigRequired] = useState<boolean>(false);

  // Mandatory user confirmation dialog before sending message to Google Chat
  const [pendingConfirm, setPendingConfirm] = useState<{
    spaceDisplayName: string;
    targetSpace: string;
    messageSummary: string;
    action: () => Promise<void>;
  } | null>(null);

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
      fetchSpaces(token);
    }

    return () => unsubscribe();
  }, [isOpen, token]);

  const fetchSpaces = async (tok: string) => {
    setLoadingSpaces(true);
    setChatAppConfigRequired(false);
    try {
      const sp = await listGoogleChatSpaces(tok);
      setSpaces(sp);
      if (sp.length > 0) {
        setSelectedSpaceName(sp[0].name);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('GOOGLE_CHAT_APP_NOT_CONFIGURED')) {
        setChatAppConfigRequired(true);
        setStatusMessage({
          text: 'Google Chat app configuration is required in Google Cloud Console before listing spaces or sending messages.',
          type: 'error'
        });
      } else {
        setStatusMessage({
          text: err.message || 'Failed to list Google Chat spaces.',
          type: 'error'
        });
      }
    } finally {
      setLoadingSpaces(false);
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
        setStatusMessage({ text: `Signed in as ${result.user.email}`, type: 'success' });
        fetchSpaces(result.accessToken);
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to sign in with Google.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setToken(null);
    setSpaces([]);
    setStatusMessage({ text: 'Signed out from Google Workspace.', type: 'info' });
  };

  const getTargetSpaceName = (): string => {
    if (selectedSpaceName && selectedSpaceName !== 'manual') return selectedSpaceName;
    if (manualSpaceName.trim()) {
      return manualSpaceName.trim().startsWith('spaces/') ? manualSpaceName.trim() : `spaces/${manualSpaceName.trim()}`;
    }
    return '';
  };

  const handleSendClick = () => {
    const targetSpace = getTargetSpaceName();
    if (!token || !targetSpace) {
      setStatusMessage({ text: 'Please select or enter a Google Chat space target.', type: 'error' });
      return;
    }

    const matched = spaces.find((s) => s.name === targetSpace);
    const spaceDisplayName = matched?.displayName || targetSpace;

    const summary =
      messageMode === 'report_card'
        ? `Official Report Summary: "${report.name}" (${totalStudents.toLocaleString()} students)`
        : customMessageText;

    // Trigger mandatory user confirmation dialog
    setPendingConfirm({
      spaceDisplayName,
      targetSpace,
      messageSummary: summary,
      action: async () => {
        await executeSendMessage(targetSpace);
      }
    });
  };

  const executeSendMessage = async (spaceName: string) => {
    if (!token) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      if (messageMode === 'report_card') {
        await sendReportSummaryToGoogleChat(
          token,
          spaceName,
          report,
          totalStudents,
          departmentCount,
          femalePercentage
        );
      } else {
        await sendGoogleChatMessage(token, spaceName, customMessageText);
      }
      setStatusMessage({
        text: `Message successfully posted to Google Chat space!`,
        type: 'success'
      });
    } catch (err: any) {
      if (err.message && err.message.includes('GOOGLE_CHAT_APP_NOT_CONFIGURED')) {
        setChatAppConfigRequired(true);
        setStatusMessage({
          text: 'Google Chat app configuration is required in Cloud Console before posting messages.',
          type: 'error'
        });
      } else {
        setStatusMessage({
          text: err.message || 'Failed to send Google Chat message.',
          type: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0F4C3A] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
              <MessageSquare className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-snug">
                Google Chat Integration & Dispatch
              </h3>
              <p className="text-xs text-emerald-100">
                Oromia State University Institutional Communication
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
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Status Alert */}
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
                <Building className="w-4 h-4 shrink-0 text-blue-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Google Cloud Console Chat App Configuration Notice if 404 */}
          {chatAppConfigRequired && (
            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Google Chat App Configuration Required</span>
              </div>
              <p>
                Google Chat API requires a one-time configuration of your Chat App details in Google Cloud Console for project <strong>southern-dogfish-gw1rw</strong>.
              </p>
              <div className="pt-1">
                <a
                  href={CHAT_APP_CONSOLE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all"
                >
                  <span>Open Cloud Console Chat API Setup</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Google Workspace Prerequisite Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
            <Building className="w-4 h-4 text-[#0F4C3A] dark:text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong>Account Requirement:</strong> Calling Google Chat API with user authorization requires a Business or Enterprise Google Workspace account.
            </p>
          </div>

          {/* Account Authentication Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 shadow-xs border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-[#0F4C3A] dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {googleUser ? googleUser.displayName || googleUser.email : 'Google Workspace Account'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {token ? 'Google Chat API Scopes Active' : 'Sign in to send Google Chat notifications'}
                </p>
              </div>
            </div>

            {token ? (
              <button
                onClick={handleGoogleSignOut}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-lg cursor-pointer"
              >
                Disconnect
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

          {token && (
            <>
              {/* Space Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Google Chat Space
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedSpaceName}
                    onChange={(e) => setSelectedSpaceName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {spaces.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.displayName ? `${s.displayName} (${s.name})` : s.name}
                      </option>
                    ))}
                    <option value="manual">-- Enter Space ID manually --</option>
                  </select>
                  <button
                    onClick={() => token && fetchSpaces(token)}
                    className="p-2 text-slate-500 hover:text-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    title="Refresh Chat spaces"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSpaces ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {selectedSpaceName === 'manual' && (
                  <div>
                    <input
                      type="text"
                      placeholder="e.g. spaces/AAAAAAAAAAA"
                      value={manualSpaceName}
                      onChange={(e) => setManualSpaceName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>

              {/* Message Format Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Content Type
                </label>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="chatMessageMode"
                      checked={messageMode === 'report_card'}
                      onChange={() => setMessageMode('report_card')}
                      className="text-[#0F4C3A]"
                    />
                    <span>Institutional Report Summary Card</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="chatMessageMode"
                      checked={messageMode === 'custom'}
                      onChange={() => setMessageMode('custom')}
                      className="text-[#0F4C3A]"
                    />
                    <span>Custom Text Message</span>
                  </label>
                </div>

                {messageMode === 'report_card' ? (
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5 font-mono text-slate-800 dark:text-slate-200">
                    <div className="font-bold text-emerald-800 dark:text-emerald-300">
                      🏛️ OROMIA STATE UNIVERSITY · INSTITUTIONAL REPORT DISPATCH
                    </div>
                    <div>📋 Report: {report.name}</div>
                    <div>📊 Total Entrants: {totalStudents.toLocaleString()} | Depts: {departmentCount} | Female: {femalePercentage.toFixed(1)}%</div>
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={customMessageText}
                    onChange={(e) => setCustomMessageText(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleSendClick}
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#0F4C3A] hover:bg-[#0A3428] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Post Message to Google Chat</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Oromia State University · Google Workspace Chat Connector</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Mandatory Explicit Confirmation Dialog */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-500/40 p-5 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-[#0F4C3A] dark:text-emerald-400">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Confirm Google Chat Dispatch
              </h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to post this message to Google Chat Space <strong>"{pendingConfirm.spaceDisplayName}"</strong> on behalf of your Google account?
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] font-mono text-slate-700 dark:text-slate-300 max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-700">
              {pendingConfirm.messageSummary}
            </div>

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
                className="px-4 py-2 text-xs font-bold bg-[#0F4C3A] hover:bg-[#0A3428] text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
