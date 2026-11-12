import React, { useState, useEffect } from 'react';
import { UserAccount, PROGRAM_LEVEL_USERS } from '../types';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, GraduationCap, BookOpen, Award, Sparkles, Building2, Users, Check, ChevronDown, User } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (password: string, remember: boolean, userAccount?: UserAccount) => boolean;
  users?: UserAccount[];
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'registrar':
      return <GraduationCap className="w-4 h-4 text-[#E0A526]" />;
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

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, users }) => {
  const userList = users && users.length > 0 ? users : PROGRAM_LEVEL_USERS;
  const [selectedUser, setSelectedUser] = useState<UserAccount>(() => userList[0] || PROGRAM_LEVEL_USERS[0]);
  const [typedUsername, setTypedUsername] = useState<string>(() => userList[0]?.username || 'registrar');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When typed username changes, attempt to match user
  useEffect(() => {
    const trimmed = typedUsername.trim().toLowerCase();
    const found = userList.find((u) => u.username.toLowerCase() === trimmed);
    if (found) {
      setSelectedUser(found);
    }
  }, [typedUsername, userList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

          {error && (
            <div
              className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium flex items-center gap-2"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                      {selectedUser.assignedDepartment && selectedUser.assignedDepartment !== 'ALL' && (
                        <span className="font-bold text-[#0F4C3A] dark:text-[#A9D3C2] bg-emerald-50 dark:bg-white/10 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-white/10 text-[10px]">
                          Dept: {selectedUser.assignedDepartment}
                        </span>
                      )}
                      <span className="font-medium text-[#183127] dark:text-[#CFE6DC]">
                        {selectedUser.programLevelScope}
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

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-[#5B6B70] dark:text-[#9DB0AA] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0F4C3A] cursor-pointer"
                />
                <span>Remember session on this device</span>
              </label>
              <span className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA] italic">
                Managed by Administrator
              </span>
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
        </div>
      </div>

      {/* Footer text */}
      <footer className="mt-4 text-center text-xs text-[#6B8077] dark:text-[#7A938A]">
        © Oromia State University | Copyright by Abdela Kasim
      </footer>
    </div>
  );
};
