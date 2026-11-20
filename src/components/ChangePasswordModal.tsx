import React, { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle, Eye, EyeOff, User, Mail, Phone, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccount?: UserAccount;
  currentPasswordHash: string;
  onChangePassword: (newPassword: string, currentPassword: string) => void;
  onSaveAdminRecovery?: (recoveryEmail: string, recoveryPhone: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userAccount,
  currentPasswordHash,
  onChangePassword,
  onSaveAdminRecovery
}) => {
  const isAdmin = userAccount?.role === 'admin' && userAccount?.username === 'admin';
  const [activeTab, setActiveTab] = useState<'password' | 'recovery'>('password');

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');

  // Admin recovery contacts state
  const [recoveryEmail, setRecoveryEmail] = useState(userAccount?.recoveryEmail || '');
  const [recoveryPhone, setRecoveryPhone] = useState(userAccount?.recoveryPhone || '');
  const [recoveryError, setRecoveryError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('password');
      setRecoveryEmail(userAccount?.recoveryEmail || '');
      setRecoveryPhone(userAccount?.recoveryPhone || '');
      setRecoveryError('');
      setError('');
    }
  }, [isOpen, userAccount?.recoveryEmail, userAccount?.recoveryPhone]);

  if (!isOpen) return null;

  const effectiveCurrentPassword = userAccount?.password || currentPasswordHash || '1';

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setRecoveryError('');
    setShowPasswords(false);
    setActiveTab('password');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const enteredOld = oldPassword.trim();
    const enteredNew = newPassword.trim();
    const enteredConfirm = confirmPassword.trim();

    if (!enteredOld) {
      setError('Please enter your current password.');
      return;
    }

    const matchesCurrent =
      enteredOld === effectiveCurrentPassword ||
      (userAccount?.role === 'admin' && enteredOld === currentPasswordHash);

    if (!matchesCurrent) {
      setError('Current password is incorrect. Please check and try again.');
      return;
    }

    if (enteredNew.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }

    if (enteredNew.length > 128) {
      setError('New password must be 128 characters or fewer.');
      return;
    }

    if (enteredNew !== enteredConfirm) {
      setError('New password and confirmation do not match.');
      return;
    }

    onChangePassword(enteredNew, enteredOld);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswords(false);
    onClose();
  };

  const handleSaveRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (!isAdmin) {
      setRecoveryError('Only the System Administrator (@admin) can configure password recovery contacts.');
      return;
    }

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    const cleanPhone = recoveryPhone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');

    if (!cleanEmail && !cleanPhone) {
      setRecoveryError('Please enter an Admin recovery email address and/or phone number.');
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setRecoveryError('Please enter a valid Admin recovery email address.');
      return;
    }
    if (cleanEmail.length > 150) {
      setRecoveryError('Recovery email must be 150 characters or fewer.');
      return;
    }

    if (cleanPhone && phoneDigits.length < 7) {
      setRecoveryError('Please enter a valid Admin recovery phone number (at least 7 digits).');
      return;
    }
    if (cleanPhone.length > 40) {
      setRecoveryError('Recovery phone number must be 40 characters or fewer.');
      return;
    }

    onSaveAdminRecovery?.(cleanEmail, cleanPhone);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-pwd-title"
    >
      <div className="bg-white dark:bg-[#16221F] rounded-xl shadow-2xl border border-[#C5D8CF] dark:border-[#2B3E39] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0F4C3A] text-white border-b-2 border-[#E0A526]">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-[#E0A526] shrink-0" />
            <div>
              <h2 id="change-pwd-title" className="text-base font-serif font-bold tracking-tight">
                {activeTab === 'recovery' && isAdmin
                  ? 'Admin Password Recovery Contacts'
                  : 'Change Personal Password'}
              </h2>
              {userAccount && (
                <p className="text-[11px] text-[#A9D3C2] flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3" />
                  <span>
                    {userAccount.name} (@{userAccount.username})
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#9CC7B7] hover:text-white transition-colors p-1 rounded-md cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin-Only Tabs: Password vs Email & Phone Recovery */}
        {isAdmin && onSaveAdminRecovery && (
          <div className="flex border-b border-[#E3ECE7] dark:border-[#273B35] bg-[#FAFDFB] dark:bg-[#111B18] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'password'
                  ? 'border-[#0F4C3A] dark:border-[#E0A526] text-[#0F4C3A] dark:text-[#E0A526] bg-white dark:bg-[#16221F]'
                  : 'border-transparent text-[#5B6B70] dark:text-[#9DB0AA] hover:text-[#0F4C3A]'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recovery')}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'recovery'
                  ? 'border-[#0F4C3A] dark:border-[#E0A526] text-[#0F4C3A] dark:text-[#E0A526] bg-white dark:bg-[#16221F]'
                  : 'border-transparent text-[#5B6B70] dark:text-[#9DB0AA] hover:text-[#0F4C3A]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Recovery (Email & Phone)</span>
            </button>
          </div>
        )}

        {activeTab === 'recovery' && isAdmin ? (
          <form onSubmit={handleSaveRecovery} className="p-6 space-y-4 text-sm">
            <div className="p-3 bg-[#EFF6F3] dark:bg-emerald-950/30 border border-[#C5D8CF] dark:border-emerald-800/50 rounded-lg text-xs text-[#283C35] dark:text-[#CFE6DC] leading-relaxed">
              Connect an official <strong>Email Address</strong>, <strong>Phone Number</strong>, or both strictly to the <strong>@admin</strong> account. If the Admin password is lost, you can send a 6-digit verification code to your connected email or phone number to reset it.
            </div>

            {recoveryError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                Admin Recovery Email Address <span className="text-[11px] font-normal text-[#6D857C]">(Email or Phone required)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6D857C] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="e.g. admin@osu.edu.et"
                  className="w-full pl-9 pr-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                Admin Recovery Phone Number <span className="text-[11px] font-normal text-[#6D857C]">(Email or Phone required)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#6D857C] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="tel"
                  value={recoveryPhone}
                  onChange={(e) => setRecoveryPhone(e.target.value)}
                  placeholder="e.g. +251 911 234 567 or 0911234567"
                  className="w-full pl-9 pr-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E3ECE7] dark:border-[#273B35]">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-[#C5D8CF] dark:border-[#354C45] text-[#283C35] dark:text-[#CFE6DC] rounded-lg hover:bg-[#F2F7F4] dark:hover:bg-white/5 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0F4C3A] text-white rounded-lg hover:bg-[#1A5C49] font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Recovery Contacts</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                  Current Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#0F4C3A] dark:text-[#A9D3C2] hover:underline cursor-pointer"
                >
                  {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPasswords ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono text-sm"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                New Personal Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                Confirm New Personal Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono text-sm"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E3ECE7] dark:border-[#273B35]">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-[#C5D8CF] dark:border-[#354C45] text-[#283C35] dark:text-[#CFE6DC] rounded-lg hover:bg-[#F2F7F4] dark:hover:bg-white/5 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0F4C3A] text-white rounded-lg hover:bg-[#1A5C49] font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Update My Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
