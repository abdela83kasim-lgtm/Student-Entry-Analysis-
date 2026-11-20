import React, { useState, useEffect } from 'react';
import {
  UserAccount,
  PROGRAM_LEVEL_USERS,
  LIVE_PORTAL_URL,
  parseAssignedDepartments,
  formatAssignedDepartmentsLabel,
  formatProgramLevelScopeLabel,
  emailsMatch,
  phonesMatch,
  maskRecoveryEmail,
  maskRecoveryPhone
} from '../types';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  GraduationCap,
  BookOpen,
  Award,
  Sparkles,
  Building2,
  Users,
  Check,
  CheckCircle2,
  User,
  ExternalLink,
  Mail,
  Phone,
  Key,
  Send,
  Copy,
  RefreshCw,
  Clock
} from 'lucide-react';

export type RecoveryChannel = 'email' | 'phone';

interface AdminLoginProps {
  onLogin: (password: string, remember: boolean, userAccount?: UserAccount) => boolean;
  onRecoverAdminPassword?: (
    channel: RecoveryChannel,
    contactValue: string,
    newPassword: string
  ) => { ok: boolean; error?: string };
  onLogRecoveryCodeRequest?: (channel: RecoveryChannel) => void;
  users?: UserAccount[];
}

const generateSixDigitCode = (): string => {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return String(100000 + (arr[0] % 900000));
  }
  return String(Math.floor(100000 + Math.random() * 900000));
};

const formatCountdown = (msRemaining: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'registrar':
      return <GraduationCap className="w-4 h-4 text-[#E0A526]" />;
    case 'all_viewer':
      return <Eye className="w-4 h-4 text-cyan-300" />;
    case 'program_applied':
      return <BookOpen className="w-4 h-4 text-emerald-400" />;
    case 'program_education':
      return <Award className="w-4 h-4 text-sky-400" />;
    case 'program_diploma':
      return <Sparkles className="w-4 h-4 text-amber-400" />;
    case 'program_masters':
      return <Building2 className="w-4 h-4 text-purple-400" />;
    case 'program_phd':
      return <Award className="w-4 h-4 text-fuchsia-400" />;
    default:
      return <ShieldCheck className="w-4 h-4 text-[#E0A526]" />;
  }
};

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLogin,
  onRecoverAdminPassword,
  onLogRecoveryCodeRequest,
  users
}) => {
  const userList = users && users.length > 0 ? users : PROGRAM_LEVEL_USERS;
  const [selectedUser, setSelectedUser] = useState<UserAccount>(() => userList[0] || PROGRAM_LEVEL_USERS[0]);
  const [typedUsername, setTypedUsername] = useState<string>(() => userList[0]?.username || 'registrar');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin-only password recovery state (3-step: verify_contact -> verify_code -> reset)
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'verify_contact' | 'verify_code' | 'reset'>('verify_contact');
  const [recoveryChannel, setRecoveryChannel] = useState<RecoveryChannel>('email');
  const [recoveryContactInput, setRecoveryContactInput] = useState('');
  const [issuedCode, setIssuedCode] = useState('');
  const [codeExpiresAt, setCodeExpiresAt] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  const isSelectedAdmin = selectedUser.role === 'admin' && selectedUser.username === 'admin';
  const adminAccount = userList.find((u) => u.username === 'admin' && u.role === 'admin');
  const hasEmailRecovery = Boolean(adminAccount?.recoveryEmail?.trim());
  const hasPhoneRecovery = Boolean(adminAccount?.recoveryPhone?.trim());
  const hasAdminRecoveryConfigured = hasEmailRecovery || hasPhoneRecovery;

  // When typed username changes, attempt to match user
  useEffect(() => {
    const trimmed = typedUsername.trim().toLowerCase();
    const found = userList.find((u) => u.username.toLowerCase() === trimmed);
    if (found) {
      setSelectedUser(found);
      if (found.role !== 'admin' || found.username !== 'admin') {
        setRecoveryMode(false);
      }
    }
  }, [typedUsername, userList]);

  // Countdown tick while waiting for 6-digit verification code entry
  useEffect(() => {
    if (!recoveryMode || recoveryStep !== 'verify_code') return;
    setNowTs(Date.now());
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recoveryMode, recoveryStep]);

  const openRecoveryFlow = () => {
    if (!isSelectedAdmin) return;
    const defaultChannel: RecoveryChannel = hasEmailRecovery ? 'email' : 'phone';
    setRecoveryMode(true);
    setRecoveryStep('verify_contact');
    setRecoveryChannel(defaultChannel);
    setRecoveryContactInput('');
    setIssuedCode('');
    setCodeExpiresAt(0);
    setVerificationCodeInput('');
    setCodeCopied(false);
    setNewAdminPassword('');
    setConfirmAdminPassword('');
    setShowNewAdminPassword(false);
    setRecoveryError('');
    setError('');
    setSuccessNotice('');
  };

  const closeRecoveryFlow = () => {
    setRecoveryMode(false);
    setRecoveryStep('verify_contact');
    setIssuedCode('');
    setCodeExpiresAt(0);
    setVerificationCodeInput('');
    setRecoveryError('');
  };

  const issueVerificationCode = (channel: RecoveryChannel) => {
    const code = generateSixDigitCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    setIssuedCode(code);
    setCodeExpiresAt(expiresAt);
    setNowTs(Date.now());
    setVerificationCodeInput('');
    setCodeCopied(false);
    onLogRecoveryCodeRequest?.(channel);
  };

  const handleSendRecoveryCode = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (!isSelectedAdmin || !adminAccount || !hasAdminRecoveryConfigured) {
      setRecoveryError('Recovery email or phone number is not configured for @admin.');
      return;
    }

    if (recoveryChannel === 'email') {
      if (!hasEmailRecovery) {
        setRecoveryError('No recovery Email Address is connected to @admin. Please use Phone Number.');
        return;
      }
      if (!emailsMatch(adminAccount.recoveryEmail, recoveryContactInput)) {
        setRecoveryError('Email address does not match the connected @admin recovery email.');
        return;
      }
    } else {
      if (!hasPhoneRecovery) {
        setRecoveryError('No recovery Phone Number is connected to @admin. Please use Email Address.');
        return;
      }
      if (!phonesMatch(adminAccount.recoveryPhone, recoveryContactInput)) {
        setRecoveryError('Phone number does not match the connected @admin recovery phone number.');
        return;
      }
    }

    issueVerificationCode(recoveryChannel);
    setRecoveryStep('verify_code');
  };

  const handleResendCode = () => {
    setRecoveryError('');
    issueVerificationCode(recoveryChannel);
  };

  const handleCopyIssuedCode = async () => {
    if (!issuedCode) return;
    try {
      await navigator.clipboard.writeText(issuedCode);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setCodeCopied(false);
    }
  };

  const handleVerifyCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (!issuedCode || !codeExpiresAt) {
      setRecoveryError('No active verification code found. Please request a new code.');
      return;
    }
    if (Date.now() > codeExpiresAt) {
      setRecoveryError('This verification code has expired. Please click Resend Code to generate a new 6-digit code.');
      return;
    }

    const entered = verificationCodeInput.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(entered)) {
      setRecoveryError('Please enter the 6-digit numeric verification code.');
      return;
    }
    if (entered !== issuedCode) {
      setRecoveryError('Verification code does not match. Check your 6-digit code and try again.');
      return;
    }

    setRecoveryStep('reset');
  };

  const handleResetAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (!isSelectedAdmin || !onRecoverAdminPassword) {
      setRecoveryError('Password recovery is strictly restricted to the System Administrator (@admin).');
      return;
    }

    const trimmedNew = newAdminPassword.trim();
    const trimmedConfirm = confirmAdminPassword.trim();

    if (trimmedNew.length < 4) {
      setRecoveryError('New Admin password must be at least 4 characters long.');
      return;
    }
    if (trimmedNew.length > 128) {
      setRecoveryError('New Admin password must be 128 characters or fewer.');
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setRecoveryError('New password and confirmation do not match.');
      return;
    }

    const result = onRecoverAdminPassword(
      recoveryChannel,
      recoveryContactInput.trim(),
      trimmedNew
    );

    if (!result.ok) {
      setRecoveryError(result.error || 'Could not reset Admin password. Please verify your details.');
      return;
    }

    setRecoveryMode(false);
    setRecoveryStep('verify_contact');
    setIssuedCode('');
    setCodeExpiresAt(0);
    setVerificationCodeInput('');
    setPassword('');
    setSuccessNotice('Admin password recovered and updated. Sign in below with your new password.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    const matchedUser = userList.find((u) => u.username.toLowerCase() === typedUsername.trim().toLowerCase()) || selectedUser;

    if (!matchedUser) {
      setError(`Username "@${typedUsername}" was not found. Please select from the list or enter a valid username.`);
      return;
    }

    if (matchedUser.isActive === false) {
      setError(
        `Account Deactivated: All student data entry for "${matchedUser.name}" has been completed and archived by Administrator.`
      );
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const success = onLogin(password.trim(), remember, matchedUser);
    setIsSubmitting(false);

    if (!success) {
      setError('Incorrect password. Please check your credentials or contact Administrator.');
    }
  };

  const msRemaining = Math.max(0, codeExpiresAt - nowTs);
  const isCodeExpired = Boolean(codeExpiresAt && msRemaining === 0);
  const maskedDestination =
    recoveryChannel === 'email'
      ? maskRecoveryEmail(adminAccount?.recoveryEmail)
      : maskRecoveryPhone(adminAccount?.recoveryPhone);

  const dispatchHref = (() => {
    if (!issuedCode) return '#';
    if (recoveryChannel === 'email' && adminAccount?.recoveryEmail) {
      const subject = encodeURIComponent('OSU Active Student Report — @admin Verification Code');
      const body = encodeURIComponent(
        `Your Oromia State University (@admin) password recovery verification code is: ${issuedCode}\n\nThis code expires in 10 minutes.`
      );
      return `mailto:${encodeURIComponent(adminAccount.recoveryEmail)}?subject=${subject}&body=${body}`;
    }
    if (recoveryChannel === 'phone' && adminAccount?.recoveryPhone) {
      const body = encodeURIComponent(
        `OSU Admin (@admin) Password Recovery Code: ${issuedCode} (valid 10 mins).`
      );
      return `sms:${adminAccount.recoveryPhone.replace(/[^\d+]/g, '')}?body=${body}`;
    }
    return '#';
  })();

  return (
    <div className="min-h-screen bg-[#EAEFEA] dark:bg-[#0D1513] flex flex-col justify-center items-center p-3 sm:p-6 transition-colors">
      <div className="w-full max-w-xl bg-white dark:bg-[#16221F] rounded-2xl shadow-xl border border-[#D5E2DC] dark:border-[#2A3B37] overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-4">
        {/* Institutional Branding Header */}
        <div className="bg-[#0F4C3A] text-white p-6 sm:p-8 text-center border-b-4 border-[#E0A526]">
          <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
            <img
              src="/assets/aistudio/Forest_Green_Radiant_Shield_Emblem_7f18a355.png"
              alt="Oromia State University Official Logo"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </div>
          <div className="text-xs uppercase tracking-widest text-[#A9D3C2] font-semibold mb-1">
            Oromia State University
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            OSU Active Student Report
          </h1>
          <p className="text-xs text-[#CFE6DC] mt-1">
            Institutional Admissions Portal & Program Level Management
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          <div className="mb-5 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EFF6F3] dark:bg-white/5 border border-[#D0E2D9] dark:border-white/10 rounded-full text-xs font-semibold text-[#0F4C3A] dark:text-[#A9D3C2]">
              <Users className="w-3.5 h-3.5 text-[#E0A526]" />
              <span>User Authentication & Username Login</span>
            </div>
            <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA] mt-1.5">
              Enter any user username (e.g. registrar, accounting_lead, admin) or choose from the dropdown to sign in.
            </p>
          </div>

          {successNotice && (
            <div
              className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-medium flex items-center gap-2"
              role="status"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {error && !recoveryMode && (
            <div
              className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium flex items-center gap-2"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Admin-Only Lost Password Recovery Panel */}
          {recoveryMode && isSelectedAdmin ? (
            <div className="space-y-4 p-4 sm:p-5 rounded-xl border border-[#C5D8CF] dark:border-[#2C413A] bg-[#FAFDFB] dark:bg-[#111B18] animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#E3ECE7] dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-[#0F4C3A] text-white">
                    <Key className="w-4 h-4 text-[#E0A526]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-serif font-bold text-[#0F4C3A] dark:text-[#A9D3C2]">
                      Admin Password Recovery (@admin Only)
                    </h2>
                    <p className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA]">
                      {recoveryStep === 'verify_contact' && 'Step 1 of 3: Choose connected Email or Phone Number to send a verification code.'}
                      {recoveryStep === 'verify_code' && 'Step 2 of 3: Enter the 6-digit verification code sent to your connected contact.'}
                      {recoveryStep === 'reset' && 'Step 3 of 3: Set a new password for the @admin account.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeRecoveryFlow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F4C3A] dark:text-[#E0A526] hover:underline cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              </div>

              {recoveryError && (
                <div
                  className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium flex items-center gap-2"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {!hasAdminRecoveryConfigured ? (
                <div className="space-y-3 text-xs text-[#324840] dark:text-[#CFE6DC]">
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-900 dark:text-amber-200 leading-relaxed">
                    <strong>No Recovery Email or Phone Connected Yet:</strong> Password recovery is available strictly for <strong>@admin</strong> after connecting an official recovery Email Address or Phone Number inside <em>Change Password → Recovery (Email &amp; Phone)</em> or <em>User Management → Edit @admin</em>.
                  </div>
                  <button
                    type="button"
                    onClick={closeRecoveryFlow}
                    className="w-full py-2 px-4 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : recoveryStep === 'verify_contact' ? (
                <form onSubmit={handleSendRecoveryCode} className="space-y-3.5">
                  <div className="p-2.5 bg-[#EFF6F3] dark:bg-white/5 border border-[#D0E2D9] dark:border-white/10 rounded-lg text-[11px] text-[#283C35] dark:text-[#CFE6DC] flex flex-wrap items-center gap-x-3 gap-y-1">
                    {hasEmailRecovery && (
                      <span>
                        Connected Email:{' '}
                        <strong className="font-mono">{maskRecoveryEmail(adminAccount?.recoveryEmail)}</strong>
                      </span>
                    )}
                    {hasEmailRecovery && hasPhoneRecovery && <span>·</span>}
                    {hasPhoneRecovery && (
                      <span>
                        Connected Phone:{' '}
                        <strong className="font-mono">{maskRecoveryPhone(adminAccount?.recoveryPhone)}</strong>
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1.5">
                      Send Verification Code Via
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!hasEmailRecovery}
                        onClick={() => {
                          setRecoveryChannel('email');
                          setRecoveryContactInput('');
                          setRecoveryError('');
                        }}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                          recoveryChannel === 'email'
                            ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                            : 'bg-white dark:bg-[#101A17] text-[#324840] dark:text-[#CFE6DC] border-[#BFCDC8] dark:border-[#354C45] hover:border-[#0F4C3A]'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email Address</span>
                      </button>
                      <button
                        type="button"
                        disabled={!hasPhoneRecovery}
                        onClick={() => {
                          setRecoveryChannel('phone');
                          setRecoveryContactInput('');
                          setRecoveryError('');
                        }}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                          recoveryChannel === 'phone'
                            ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                            : 'bg-white dark:bg-[#101A17] text-[#324840] dark:text-[#CFE6DC] border-[#BFCDC8] dark:border-[#354C45] hover:border-[#0F4C3A]'
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Phone Number</span>
                      </button>
                    </div>
                  </div>

                  {recoveryChannel === 'email' ? (
                    <div>
                      <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                        Confirm Connected Admin Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#6D857C] absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="email"
                          value={recoveryContactInput}
                          onChange={(e) => {
                            setRecoveryContactInput(e.target.value);
                            if (recoveryError) setRecoveryError('');
                          }}
                          placeholder="Enter connected admin email..."
                          className="w-full pl-9 pr-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                        Confirm Connected Admin Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#6D857C] absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="tel"
                          value={recoveryContactInput}
                          onChange={(e) => {
                            setRecoveryContactInput(e.target.value);
                            if (recoveryError) setRecoveryError('');
                          }}
                          placeholder="Enter connected admin phone number..."
                          className="w-full pl-9 pr-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-[#E0A526]" />
                    <span>
                      Send Verification Code to {recoveryChannel === 'email' ? 'Email' : 'Phone'}
                    </span>
                  </button>
                </form>
              ) : recoveryStep === 'verify_code' ? (
                <form onSubmit={handleVerifyCodeSubmit} className="space-y-3.5">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          6-digit code prepared for{' '}
                          <strong className="font-mono">{maskedDestination}</strong>
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                          isCodeExpired
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-white/80 dark:bg-black/30 text-[#0F4C3A] dark:text-[#A9D3C2]'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{isCodeExpired ? 'Expired' : formatCountdown(msRemaining)}</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-md bg-white dark:bg-[#101A17] border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-[#5B6B70] dark:text-[#9DB0AA]">
                          One-Time Verification Code
                        </div>
                        <div className="text-lg font-mono font-bold tracking-[0.25em] text-[#0F4C3A] dark:text-[#E0A526]">
                          {issuedCode}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={handleCopyIssuedCode}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#C5D8CF] dark:border-[#354C45] text-[11px] font-semibold text-[#0F4C3A] dark:text-[#CFE6DC] hover:bg-[#EFF6F3] dark:hover:bg-white/5 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{codeCopied ? 'Copied' : 'Copy Code'}</span>
                        </button>
                        <a
                          href={dispatchHref}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0F4C3A] hover:bg-[#1A5C49] text-white text-[11px] font-semibold"
                        >
                          {recoveryChannel === 'email' ? (
                            <Mail className="w-3 h-3 text-[#E0A526]" />
                          ) : (
                            <Phone className="w-3 h-3 text-[#E0A526]" />
                          )}
                          <span>{recoveryChannel === 'email' ? 'Send via Email App' : 'Send via SMS App'}</span>
                        </a>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#324840] dark:text-[#B4CCC3] leading-relaxed">
                      Because this portal runs directly in your browser without a background mail/SMS server, you can either dispatch the code with your {recoveryChannel === 'email' ? 'Email' : 'SMS'} app or enter the one-time code above to verify ownership.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                        Enter 6-Digit Verification Code <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleResendCode}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F4C3A] dark:text-[#E0A526] hover:underline cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend Code</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCodeInput}
                      onChange={(e) => {
                        setVerificationCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                        if (recoveryError) setRecoveryError('');
                      }}
                      placeholder="Enter 6-digit code"
                      className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg font-mono text-base tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryStep('verify_contact');
                        setRecoveryError('');
                      }}
                      className="px-3.5 py-2.5 border border-[#C5D8CF] dark:border-[#354C45] text-[#283C35] dark:text-[#CFE6DC] rounded-lg text-xs font-semibold hover:bg-[#F2F7F4] dark:hover:bg-white/5 cursor-pointer"
                    >
                      Change Contact
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Verify Code &amp; Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetAdminPasswordSubmit} className="space-y-3.5">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Code verified for {recoveryChannel === 'email' ? 'Email' : 'Phone'}{' '}
                      <strong className="font-mono">{maskedDestination}</strong>. Set your new Admin password below.
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                        New Admin Password <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewAdminPassword((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[11px] text-[#0F4C3A] dark:text-[#A9D3C2] hover:underline cursor-pointer"
                      >
                        {showNewAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showNewAdminPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showNewAdminPassword ? 'text' : 'password'}
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                      Confirm New Admin Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showNewAdminPassword ? 'text' : 'password'}
                      value={confirmAdminPassword}
                      onChange={(e) => setConfirmAdminPassword(e.target.value)}
                      placeholder="Re-enter new Admin password"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save New Admin Password</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input & Dropdown Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="username-input"
                    className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]"
                  >
                    Username / Account
                  </label>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6D857C]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="username-input"
                    type="text"
                    value={typedUsername}
                    onChange={(e) => {
                      setTypedUsername(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter username (e.g. registrar, admin)..."
                    required
                    className="w-full pl-10 pr-24 py-2.5 border border-[#BFCDC8] dark:border-[#384E47] rounded-xl text-sm bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono shadow-xs"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <select
                      value={selectedUser.username}
                      onChange={(e) => {
                        const found = userList.find((u) => u.username === e.target.value);
                        if (found) {
                          setSelectedUser(found);
                          setTypedUsername(found.username);
                          setPassword('');
                          if (error) setError('');
                        }
                      }}
                      className="bg-[#EFF6F3] dark:bg-white/10 text-[#0F4C3A] dark:text-[#A9D3C2] text-xs font-semibold py-1.5 px-2 rounded-lg border border-[#BFCDC8] dark:border-white/10 focus:outline-none cursor-pointer"
                      title="Quick select user"
                    >
                      {userList.map((user) => (
                        <option key={user.username} value={user.username}>
                          @{user.username}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active Selected User Card Preview */}
                <div
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    selectedUser.isActive === false
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-[#0F4C3A]/30 dark:border-[#E0A526]/30 bg-[#F2F8F5] dark:bg-white/5 ring-1 ring-[#0F4C3A]/10 dark:ring-[#E0A526]/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs relative"
                      style={{ backgroundColor: selectedUser.avatarColor }}
                    >
                      {getRoleIcon(selectedUser.role)}
                      {selectedUser.isActive === false && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-600 text-white text-[9px] flex items-center justify-center font-bold">
                          ✕
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-[#183127] dark:text-white truncate">
                          {selectedUser.name}
                        </span>
                        <span className="text-[11px] font-mono text-[#5B6B70] dark:text-[#9DB0AA]">
                          (@{selectedUser.username})
                        </span>
                        {selectedUser.isActive === false ? (
                          <span className="text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                            Deactivated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#5B6B70] dark:text-[#9DB0AA] flex-wrap mt-0.5">
                        {parseAssignedDepartments(selectedUser.assignedDepartment).length > 0 && (
                          <span className="font-bold text-[#0F4C3A] dark:text-[#A9D3C2] bg-emerald-50 dark:bg-white/10 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-white/10 text-[10px]">
                            Dept: {formatAssignedDepartmentsLabel(selectedUser.assignedDepartment)}
                          </span>
                        )}
                        <span
                          className="font-medium text-[#183127] dark:text-[#CFE6DC]"
                          title={selectedUser.programLevelScope}
                        >
                          {formatProgramLevelScopeLabel(selectedUser.programLevelScope)}
                        </span>
                        <span>·</span>
                        <span className="italic truncate">{selectedUser.roleTitle}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#0F4C3A] dark:text-[#E0A526] bg-[#0F4C3A]/10 dark:bg-[#E0A526]/10 px-2.5 py-1 rounded-lg">
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Ready</span>
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="admin-password"
                    className="text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]"
                  >
                    Password for <strong className="text-[#0F4C3A] dark:text-[#E0A526]">{selectedUser.name}</strong>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <Lock className="w-3 h-3 text-[#E0A526]" />
                    <span>Secure & Protected</span>
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    autoComplete="current-password"
                    placeholder="Enter account password..."
                    required
                    className="w-full px-3.5 py-2.5 pr-10 border border-[#BFCDC8] dark:border-[#384E47] rounded-lg text-sm bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono tracking-wide placeholder:font-sans placeholder:tracking-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#6D857C] hover:text-[#0F4C3A] dark:hover:text-white transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 gap-2 flex-wrap">
                <label className="flex items-center gap-2 text-[#5B6B70] dark:text-[#9DB0AA] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#0F4C3A] cursor-pointer"
                  />
                  <span>Remember session on this device</span>
                </label>

                {isSelectedAdmin ? (
                  <button
                    type="button"
                    onClick={openRecoveryFlow}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F4C3A] dark:text-[#E0A526] hover:underline cursor-pointer"
                  >
                    <Key className="w-3 h-3" />
                    <span>Forgot Admin Password? Send Code to Email or Phone</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA] italic">
                    Managed by Administrator
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E0A526] focus:ring-offset-2 mt-2"
              >
                <span>Sign In as {selectedUser.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer text */}
      <footer className="mt-4 text-center text-xs text-[#6B8077] dark:text-[#7A938A] space-y-1">
        <div>
          <a
            href={LIVE_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#0F4C3A] dark:text-[#A9D3C2] hover:underline font-medium"
          >
            <span>Live Portal: osu-active-studente.netlify.app</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div>© Oromia State University | Copyright by Abdela Kasim</div>
      </footer>
    </div>
  );
};
