import React, { useState } from 'react';
import { X, Key, Check, AlertCircle } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPasswordHash: string;
  onChangePassword: (newPassword: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentPasswordHash,
  onChangePassword
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.trim().length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    onChangePassword(newPassword.trim());
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
        <div className="flex items-center justify-between px-6 py-4 bg-[#0F4C3A] text-white">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#E0A526]" />
            <h2 id="change-pwd-title" className="text-base font-serif font-bold tracking-tight">
              Change Admin Password
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CC7B7] hover:text-white transition-colors p-1 rounded-md"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
              Current Admin Password <span className="text-[#6D857C] font-normal">(Optional / flexible)</span>
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Leave blank or enter current password"
              className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
              New Admin Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 4 characters"
              className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
              Confirm New Admin Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] text-[#162521] dark:text-[#E7EFEC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] font-mono text-sm"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E3ECE7] dark:border-[#273B35]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#C5D8CF] dark:border-[#354C45] text-[#283C35] dark:text-[#CFE6DC] rounded-lg hover:bg-[#F2F7F4] dark:hover:bg-white/5 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F4C3A] text-white rounded-lg hover:bg-[#1A5C49] font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
