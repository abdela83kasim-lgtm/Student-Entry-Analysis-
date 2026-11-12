import React, { useState } from 'react';
import { UserAccount, UserRole, DepartmentOfferStatus, RawRecord, generateDefaultSecurePassword } from '../types';
import { PROGRAM_LEVELS } from '../data/analytics';
import {
  X,
  Check,
  Users,
  Shield,
  GraduationCap,
  BookOpen,
  Award,
  Sparkles,
  Building2,
  Plus,
  Trash2,
  Key,
  Edit2,
  UserX,
  UserCheck,
  Send,
  CheckCircle2,
  Clock,
  Layers,
  Briefcase,
  AlertTriangle,
  Eye,
  EyeOff,
  RotateCcw,
  Copy,
  Lock,
  RefreshCw
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserAccount: UserAccount;
  users: UserAccount[];
  existingDepartments?: string[];
  records?: RawRecord[];
  onSwitchUser: (account: UserAccount) => void;
  onAddUser: (account: UserAccount) => void;
  onDeleteUser: (username: string) => void;
  onUpdateUser: (account: UserAccount) => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'registrar':
      return <GraduationCap className="w-5 h-5 text-[#E0A526]" />;
    case 'department_officer':
      return <Briefcase className="w-5 h-5 text-emerald-300" />;
    case 'program_applied':
      return <BookOpen className="w-5 h-5 text-emerald-400" />;
    case 'program_education':
      return <Award className="w-5 h-5 text-sky-400" />;
    case 'program_diploma':
      return <Sparkles className="w-5 h-5 text-amber-400" />;
    case 'program_masters':
      return <Building2 className="w-5 h-5 text-purple-400" />;
    case 'program_phd':
      return <Award className="w-5 h-5 text-fuchsia-400" />;
    default:
      return <Shield className="w-5 h-5 text-amber-500" />;
  }
};

const DEFAULT_DEPARTMENTS = [
  'Accounting',
  'Law',
  'Economics',
  'Management',
  'Computer Science',
  'Public Management',
  'MBA',
  'Educational Planning & Management',
  'Development Studies',
  'Human Resource Management'
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserAccount,
  users,
  existingDepartments = [],
  records = [],
  onSwitchUser,
  onAddUser,
  onDeleteUser,
  onUpdateUser
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Form fields for adding/editing user
  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formProgramScope, setFormProgramScope] = useState<string>(PROGRAM_LEVELS[0]);
  const [formDepartment, setFormDepartment] = useState<string>('ALL');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [formOfferStatus, setFormOfferStatus] = useState<DepartmentOfferStatus>('offered');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formDataEntryDone, setFormDataEntryDone] = useState<boolean>(false);
  const [formRoleTitle, setFormRoleTitle] = useState('');
  const [formPassword, setFormPassword] = useState(() => generateDefaultSecurePassword());
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [error, setError] = useState('');

  // Password visibility and action notices for admin
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedUsername, setCopiedUsername] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Combined unique departments list
  const allDepartments = Array.from(
    new Set([...DEFAULT_DEPARTMENTS, ...existingDepartments.filter(Boolean)])
  ).sort();

  if (!isOpen) return null;

  const resetForm = () => {
    setFormUsername('');
    setFormName('');
    setFormProgramScope(PROGRAM_LEVELS[0]);
    setFormDepartment('ALL');
    setIsCustomDept(false);
    setCustomDeptInput('');
    setFormOfferStatus('offered');
    setFormIsActive(true);
    setFormDataEntryDone(false);
    setFormRoleTitle('');
    setFormPassword(generateDefaultSecurePassword());
    setFormShowPassword(false);
    setFormDescription('');
    setError('');
    setShowAddForm(false);
    setEditingUsername(null);
  };

  const handleStartEdit = (user: UserAccount) => {
    setEditingUsername(user.username);
    setFormUsername(user.username);
    setFormName(user.name);
    setFormProgramScope(user.programLevelScope);

    const userDept = user.assignedDepartment || 'ALL';
    if (userDept === 'ALL' || allDepartments.includes(userDept)) {
      setFormDepartment(userDept);
      setIsCustomDept(false);
      setCustomDeptInput('');
    } else {
      setFormDepartment('CUSTOM');
      setIsCustomDept(true);
      setCustomDeptInput(userDept);
    }

    setFormOfferStatus(user.departmentOfferStatus || 'assigned');
    setFormIsActive(user.isActive !== false);
    setFormDataEntryDone(Boolean(user.dataEntryCompleted));
    setFormRoleTitle(user.roleTitle);
    setFormPassword(user.password || '1');
    setFormDescription(user.description);
    setShowAddForm(true);
    setError('');
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formUsername.trim() || !formName.trim()) {
      setError('Username and Full Name are required.');
      return;
    }

    const cleanUsername = formUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    // Check duplicate if adding new
    if (!editingUsername && users.some((u) => u.username === cleanUsername)) {
      setError(`A user with username "${cleanUsername}" already exists.`);
      return;
    }

    const finalDepartment = isCustomDept
      ? customDeptInput.trim()
      : formDepartment === 'CUSTOM'
      ? customDeptInput.trim()
      : formDepartment;

    if (!finalDepartment) {
      setError('Please choose or enter an assigned department.');
      return;
    }

    let roleType: UserRole = 'program_applied';
    let avatarColor = '#1F7A5C';

    if (finalDepartment !== 'ALL') {
      roleType = 'department_officer';
      avatarColor = '#047857';
    } else if (formProgramScope === 'ALL') {
      roleType = 'admin';
      avatarColor = '#B45309';
    } else if (formProgramScope === '1st Degree (Applied)') {
      roleType = 'program_applied';
      avatarColor = '#1F7A5C';
    } else if (formProgramScope === '1st Degree (Education)') {
      roleType = 'program_education';
      avatarColor = '#2F7F9E';
    } else if (formProgramScope === 'Diploma and Certificate') {
      roleType = 'program_diploma';
      avatarColor = '#D97706';
    } else if (formProgramScope === 'Masters') {
      roleType = 'program_masters';
      avatarColor = '#7C3AED';
    } else if (formProgramScope === 'PhD') {
      roleType = 'program_phd';
      avatarColor = '#9333EA';
    }

    const generatedRoleTitle =
      formRoleTitle.trim() ||
      (finalDepartment !== 'ALL'
        ? `${finalDepartment} Department Officer`
        : formProgramScope === 'ALL'
        ? 'University Executive Admin'
        : `${formProgramScope} Officer`);

    const generatedDescription =
      formDescription.trim() ||
      (finalDepartment !== 'ALL'
        ? `Authorized to add and edit student admissions for Department of ${finalDepartment} (${formProgramScope}).`
        : formProgramScope === 'ALL'
        ? 'Full institutional authority over all university departments and records.'
        : `Restricted access: Can only view and manage ${formProgramScope} data.`);

    const accountObj: UserAccount = {
      username: editingUsername || cleanUsername,
      name: formName.trim(),
      role: roleType,
      roleTitle: generatedRoleTitle,
      programLevelScope: formProgramScope,
      assignedDepartment: finalDepartment,
      departmentOfferStatus: finalDepartment === 'ALL' ? 'assigned' : formOfferStatus,
      isActive: formIsActive,
      dataEntryCompleted: formDataEntryDone,
      description: generatedDescription,
      avatarColor,
      password: formPassword.trim() || '1'
    };

    if (editingUsername) {
      onUpdateUser(accountObj);
    } else {
      onAddUser(accountObj);
    }

    resetForm();
  };

  const handleToggleDeactivation = (user: UserAccount) => {
    const newActiveState = user.isActive === false ? true : false;
    const updated: UserAccount = {
      ...user,
      isActive: newActiveState,
      dataEntryCompleted: !newActiveState ? true : user.dataEntryCompleted
    };
    onUpdateUser(updated);
  };

  const handleAcceptOfferForUser = (user: UserAccount) => {
    onUpdateUser({
      ...user,
      departmentOfferStatus: 'accepted'
    });
  };

  const getDepartmentRecordCount = (user: UserAccount) => {
    if (!user.assignedDepartment || user.assignedDepartment === 'ALL') {
      if (user.programLevelScope === 'ALL') return records.length;
      return records.filter((r) => r[1] === user.programLevelScope).length;
    }
    return records.filter((r) => {
      const matchDept = r[2].toLowerCase() === user.assignedDepartment!.toLowerCase();
      const matchProgram =
        user.programLevelScope === 'ALL' || r[1] === user.programLevelScope;
      return matchDept && matchProgram;
    }).length;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#16221F] text-[#17262B] dark:text-[#E7EFEC] rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-[#D5E2DC] dark:border-[#2C413A] my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3ECE7] dark:border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0F4C3A] text-white flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-6 h-6 text-[#E0A526]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#EFF6F3] dark:bg-white/10 text-[#0F4C3A] dark:text-[#A9D3C2] rounded">
                  Admin Authority
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800">
                  Department Offerings & User Deactivation
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[#0F4C3A] dark:text-[#A9D3C2] mt-0.5">
                Department User Assignments & Access Control
              </h2>
              <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA]">
                Create users by department, offer/assign departments for student data entry, and deactivate users once data entry is complete.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5B6B70] hover:text-[#183127] dark:hover:text-white hover:bg-[#F2F7F4] dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5B6B70] dark:text-[#9DB0AA]">
            <span>Total Accounts: <strong className="text-[#0F4C3A] dark:text-white">{users.length}</strong></span>
            <span>·</span>
            <span>Active: <strong className="text-emerald-700 dark:text-emerald-400">{users.filter((u) => u.isActive !== false).length}</strong></span>
            <span>·</span>
            <span>Deactivated: <strong className="text-amber-700 dark:text-amber-400">{users.filter((u) => u.isActive === false).length}</strong></span>
          </div>
          {!showAddForm ? (
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="px-3.5 py-1.5 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#E0A526]" />
              <span>Create User by Department</span>
            </button>
          ) : (
            <button
              onClick={resetForm}
              className="px-3 py-1.5 border border-[#BFCDC8] dark:border-white/10 rounded-lg text-xs font-semibold text-[#5B6B70] hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel Add / Edit
            </button>
          )}
        </div>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div className="mb-4 p-2.5 px-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{actionNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 cursor-pointer text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Add / Edit User Form */}
        {showAddForm && (
          <form
            onSubmit={handleSaveUser}
            className="mb-5 p-4 sm:p-5 bg-[#F2F8F5] dark:bg-white/5 rounded-xl border border-[#D0E2D9] dark:border-white/10 space-y-4 text-xs sm:text-sm animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#D5E2DC] dark:border-white/10 font-bold text-xs text-[#0F4C3A] dark:text-[#E0A526]">
              <span>
                {editingUsername
                  ? `Edit User & Department Assignment: ${editingUsername}`
                  : 'Create User by Department (Offer / Assignment)'}
              </span>
              <span className="text-[11px] font-normal text-[#5B6B70] dark:text-[#9DB0AA]">
                Users with assigned departments can only add and edit student records within that department.
              </span>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                {error}
              </div>
            )}

            {/* Row 1: Username & Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formUsername}
                  disabled={Boolean(editingUsername)}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. accounting_dept, law_officer"
                  className="w-full px-3 py-1.5 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg font-mono text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                  Full Name / Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Accounting Admission Officer"
                  className="w-full px-3 py-1.5 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Row 2: Program Level & Department Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                  1. Program Level Scope <span className="text-red-500">*</span>
                </label>
                <select
                  value={formProgramScope}
                  onChange={(e) => setFormProgramScope(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                >
                  {PROGRAM_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                  <option value="ALL">ALL Program Levels (Institution-wide)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                    2. Assigned Department <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomDept(!isCustomDept);
                      if (!isCustomDept) setFormDepartment('CUSTOM');
                      else setFormDepartment(allDepartments[0] || 'ALL');
                    }}
                    className="text-[11px] text-[#0F4C3A] dark:text-[#E0A526] hover:underline cursor-pointer"
                  >
                    {isCustomDept ? 'Pick from list' : 'Custom department'}
                  </button>
                </div>

                {isCustomDept ? (
                  <input
                    type="text"
                    value={customDeptInput}
                    onChange={(e) => setCustomDeptInput(e.target.value)}
                    placeholder="Enter department name (e.g. Accounting, Law)..."
                    className="w-full px-3 py-1.5 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                    required
                  />
                ) : (
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                  >
                    <option value="ALL">ALL Departments (Full Program Level Access)</option>
                    <optgroup label="Academic Departments">
                      {allDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept} (Add/Edit only {dept})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                )}
              </div>
            </div>

            {/* Row 3: Assignment Offering Mode & Account Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white dark:bg-[#121D1A] rounded-xl border border-[#D5E2DC] dark:border-[#2B3E38]">
              <div>
                <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                  3. Department Assignment Offering
                </label>
                <select
                  value={formOfferStatus}
                  onChange={(e) => setFormOfferStatus(e.target.value as DepartmentOfferStatus)}
                  className="w-full px-3 py-1.5 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                >
                  <option value="offered">
                    Make Offer to User (User must accept upon sign-in to add/edit)
                  </option>
                  <option value="assigned">
                    Direct Assignment (Immediately active for this department)
                  </option>
                  <option value="accepted">Accepted (Verified department lead)</option>
                </select>
                <p className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA] mt-1">
                  {formOfferStatus === 'offered'
                    ? 'User will receive a prompt banner asking to accept the department appointment.'
                    : 'User is immediately designated as active lead for this department.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                  4. Account Status & Data Entry Completion
                </label>
                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="account-active-status"
                      checked={formIsActive}
                      onChange={() => setFormIsActive(true)}
                      className="accent-[#0F4C3A]"
                    />
                    <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      Active (User can sign in and enter student data)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="account-active-status"
                      checked={!formIsActive}
                      onChange={() => {
                        setFormIsActive(false);
                        setFormDataEntryDone(true);
                      }}
                      className="accent-amber-600"
                    />
                    <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Deactivated (Data Entry Complete / Lock Access)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Row 4: Password & Role Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                    User Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormPassword(generateDefaultSecurePassword())}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F4C3A] dark:text-[#E0A526] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Secure Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={formShowPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="e.g. OSU-8K39X2"
                    className="w-full px-3 py-1.5 pr-16 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg font-mono text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                    required
                  />
                  <div className="absolute right-1.5 top-1 flex items-center gap-1 text-[#6D857C]">
                    <button
                      type="button"
                      onClick={() => setFormShowPassword(!formShowPassword)}
                      className="p-1 hover:text-[#0F4C3A] dark:hover:text-white cursor-pointer"
                      title={formShowPassword ? 'Hide password' : 'View password'}
                    >
                      {formShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(formPassword);
                        setActionNotice({
                          message: `Copied generated password: ${formPassword}`,
                          type: 'success'
                        });
                        setTimeout(() => setActionNotice(null), 3000);
                      }}
                      className="p-1 hover:text-[#0F4C3A] dark:hover:text-white cursor-pointer"
                      title="Copy password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA] mt-1">
                  Default generated secure password. The admin can view, reset, and update anytime.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                  Custom Role Title (Optional)
                </label>
                <input
                  type="text"
                  value={formRoleTitle}
                  onChange={(e) => setFormRoleTitle(e.target.value)}
                  placeholder="e.g. Accounting Admission Officer"
                  className="w-full px-3 py-1.5 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-1.5 border border-[#BFCDC8] rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0F4C3A] text-white rounded-lg text-xs font-bold hover:bg-[#1A5C49] cursor-pointer shadow-xs"
              >
                {editingUsername ? 'Update User Assignment' : 'Create User & Assign Department'}
              </button>
            </div>
          </form>
        )}

        {/* User Accounts List */}
        <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
          {users.map((account) => {
            const isCurrent = currentUserAccount.username === account.username;
            const isSystemAdmin = account.username === 'admin';
            const isSystemRegistrar = account.username === 'registrar';
            const isDeactivated = account.isActive === false;
            const recordCount = getDepartmentRecordCount(account);

            return (
              <div
                key={account.username}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  isDeactivated
                    ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 opacity-90'
                    : isCurrent
                    ? 'border-[#0F4C3A] dark:border-[#E0A526] bg-[#F2F8F5] dark:bg-white/5 ring-2 ring-[#0F4C3A]/20 dark:ring-[#E0A526]/20'
                    : 'border-[#D5E2DC] dark:border-[#2C413A] bg-white dark:bg-[#121D1A] hover:border-[#0F4C3A]/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs relative"
                      style={{ backgroundColor: account.avatarColor }}
                    >
                      {getRoleIcon(account.role)}
                      {isDeactivated && (
                        <div
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[9px] font-bold"
                          title="Deactivated"
                        >
                          ✕
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#183127] dark:text-white">
                          {account.name}
                        </span>
                        <span className="text-xs font-mono text-[#5B6B70] dark:text-[#9DB0AA]">
                          (@{account.username})
                        </span>

                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#0F4C3A] text-white rounded-full">
                            <Check className="w-3 h-3" />
                            <span>Current Session</span>
                          </span>
                        )}

                        {/* Status Badges */}
                        {isDeactivated ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-full border border-amber-300 dark:border-amber-700">
                            <UserX className="w-3 h-3" />
                            <span>Deactivated (Entry Complete)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active</span>
                          </span>
                        )}

                        {account.dataEntryCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 rounded-full">
                            ✓ Data Entry Completed
                          </span>
                        )}
                      </div>

                      {/* Department & Program Scope Badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                        {account.assignedDepartment && account.assignedDepartment !== 'ALL' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 bg-[#EFF6F3] dark:bg-white/10 text-[#0F4C3A] dark:text-[#E0A526] rounded border border-[#C5D8CF] dark:border-white/10">
                            <Briefcase className="w-3.5 h-3.5 text-[#0F4C3A] dark:text-[#E0A526]" />
                            <span>Department: <strong>{account.assignedDepartment}</strong></span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA] font-medium">
                            All Departments
                          </span>
                        )}

                        <span className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA]">
                          Level: <strong>{account.programLevelScope}</strong>
                        </span>

                        {/* Offer Status */}
                        {account.assignedDepartment && account.assignedDepartment !== 'ALL' && (
                          account.departmentOfferStatus === 'offered' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" />
                              <span>Offer Pending Acceptance</span>
                            </span>
                          ) : account.departmentOfferStatus === 'accepted' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Offer Accepted</span>
                            </span>
                          ) : account.departmentOfferStatus === 'assigned' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                              <span>Assigned Directly</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500 font-semibold">
                              Offer Declined
                            </span>
                          )
                        )}

                        <span className="text-[11px] text-[#6B8077] dark:text-[#8CA49C]">
                          ({recordCount} records in ledger)
                        </span>
                      </div>

                      <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA] mt-1 leading-relaxed">
                        {account.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="shrink-0 flex items-center gap-1.5 flex-wrap">
                    {/* Admin Deactivate / Activate Toggle */}
                    {!isSystemAdmin && !isSystemRegistrar && (
                      <button
                        onClick={() => handleToggleDeactivation(account)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                          isDeactivated
                            ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        }`}
                        title={
                          isDeactivated
                            ? 'Reactivate user to allow student data entry again'
                            : 'Deactivate user after all student data entry is completed'
                        }
                      >
                        {isDeactivated ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Reactivate</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Deactivate (Done)</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Accept Pending Offer on behalf of user if needed */}
                    {account.departmentOfferStatus === 'offered' && (
                      <button
                        onClick={() => handleAcceptOfferForUser(account)}
                        className="px-2 py-1 bg-white dark:bg-white/10 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-semibold"
                        title="Confirm and accept department offer immediately"
                      >
                        Approve Offer
                      </button>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={() => handleStartEdit(account)}
                      className="p-1.5 text-[#5B6B70] hover:text-[#0F4C3A] dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                      title="Edit user role, department assignment, or password"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => {
                        if (isCurrent) {
                          setDeleteWarning(
                            `Cannot delete "${account.name}" (@${account.username}) because you are currently logged in with this account. Switch to another account first.`
                          );
                          return;
                        }
                        const adminAccounts = users.filter((u) => u.role === 'admin');
                        if (account.role === 'admin' && adminAccounts.length <= 1) {
                          setDeleteWarning(
                            `Cannot delete "${account.name}" because it is the sole remaining Administrator account. At least one administrator account must be preserved.`
                          );
                          return;
                        }
                        setUserToDelete(account);
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        isCurrent
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer'
                      }`}
                      title={
                        isCurrent
                          ? 'Cannot delete active session user'
                          : `Delete user account "${account.name}"`
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Switch role button */}
                    {!isCurrent && (
                      <button
                        onClick={() => {
                          onSwitchUser(account);
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#0F4C3A] hover:bg-[#1A5C49] text-white rounded-lg transition-colors cursor-pointer shadow-2xs ml-1"
                        title="Switch into this user account"
                      >
                        Switch Role
                      </button>
                    )}
                  </div>
                </div>

                {/* Password & Security Management Row (Admin View, Copy, Reset & Update) */}
                <div className="mt-3 pt-2.5 border-t border-[#E8F0EC] dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFF5F2] dark:bg-white/5 border border-[#CFDFD8] dark:border-white/10 text-xs">
                      <Lock className="w-3.5 h-3.5 text-[#E0A526]" />
                      <span className="text-[11px] font-semibold text-[#5B6B70] dark:text-[#9DB0AA]">Password:</span>
                      <span className="font-mono text-xs font-bold text-[#0F4C3A] dark:text-[#A9D3C2] tracking-wider select-all px-1.5 py-0.5 rounded bg-white dark:bg-[#101A17] border border-[#BFCDC8] dark:border-white/10">
                        {revealedPasswords[account.username] ? (account.password || '1') : '••••••••'}
                      </span>
                    </div>

                    {/* View / Hide button */}
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedPasswords((prev) => ({
                          ...prev,
                          [account.username]: !prev[account.username]
                        }))
                      }
                      className="p-1 px-2 text-[#5B6B70] hover:text-[#0F4C3A] dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium border border-[#D5E2DC] dark:border-white/10"
                      title={revealedPasswords[account.username] ? 'Hide password' : 'View password'}
                    >
                      {revealedPasswords[account.username] ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-[#0F4C3A] dark:text-[#E0A526]" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </>
                      )}
                    </button>

                    {/* Copy button */}
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = account.password || '1';
                        navigator.clipboard?.writeText(pwd);
                        setCopiedUsername(account.username);
                        setActionNotice({
                          message: `Copied password for "${account.name}" (${account.username}): ${pwd}`,
                          type: 'success'
                        });
                        setTimeout(() => setCopiedUsername(null), 2500);
                        setTimeout(() => setActionNotice(null), 4000);
                      }}
                      className="p-1 px-2 text-[#5B6B70] hover:text-[#0F4C3A] dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium border border-[#D5E2DC] dark:border-white/10"
                      title="Copy password to clipboard"
                    >
                      {copiedUsername === account.username ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Reset Password Button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newPwd = generateDefaultSecurePassword();
                        const updated: UserAccount = { ...account, password: newPwd };
                        onUpdateUser(updated);
                        setRevealedPasswords((prev) => ({ ...prev, [account.username]: true }));
                        setActionNotice({
                          message: `Reset password for "${account.name}" to: ${newPwd} (copied to clipboard)`,
                          type: 'success'
                        });
                        navigator.clipboard?.writeText(newPwd);
                        setTimeout(() => setActionNotice(null), 6000);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#0F4C3A] dark:text-[#E0A526] hover:bg-[#0F4C3A]/10 dark:hover:bg-[#E0A526]/10 rounded-lg border border-[#0F4C3A]/20 dark:border-[#E0A526]/30 transition-colors cursor-pointer"
                      title="Generate a new secure password and reset this user account immediately"
                    >
                      <RotateCcw className="w-3 h-3 text-[#E0A526]" />
                      <span>Reset Password</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-[#E3ECE7] dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5B6B70] dark:text-[#9DB0AA]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#E0A526]" />
              <span>Passwords are secure and managed by Administrator.</span>
            </span>
            <span>·</span>
            <span className="italic">
              Admin can view, copy, reset, and update any user password at any time.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#EFF5F2] dark:bg-white/10 text-[#0F4C3A] dark:text-white rounded-lg font-semibold hover:bg-[#E2EDE7] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Custom In-App Delete Confirmation Modal (replaces blocked window.confirm) */}
        {userToDelete && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
            <div className="bg-white dark:bg-[#16221F] border border-red-200 dark:border-red-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-[#17262B] dark:text-white">
                    Permanently Delete User Account?
                  </h3>
                  <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA]">
                    This operation cannot be undone.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-red-50/80 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/40 text-xs text-red-900 dark:text-red-200 space-y-1.5">
                <p>
                  Are you sure you want to permanently delete user account:
                </p>
                <div className="font-bold text-sm text-[#0F4C3A] dark:text-[#A9D3C2]">
                  {userToDelete.name}{' '}
                  <span className="font-mono text-xs font-normal text-gray-500 dark:text-gray-400">
                    (@{userToDelete.username})
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400">
                  Role: <strong>{userToDelete.roleTitle}</strong> · Scope:{' '}
                  <strong>{userToDelete.assignedDepartment || userToDelete.programLevelScope}</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 border border-[#BFCDC8] dark:border-white/10 rounded-lg text-xs font-semibold text-[#5B6B70] dark:text-[#9DB0AA] hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const uname = userToDelete.username;
                    setUserToDelete(null);
                    onDeleteUser(uname);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete User</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Warning Modal (e.g. Current session or sole admin) */}
        {deleteWarning && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
            <div className="bg-white dark:bg-[#16221F] border border-amber-300 dark:border-amber-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-[#17262B] dark:text-white">
                    Cannot Delete User
                  </h3>
                  <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA]">
                    System safety protection
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                {deleteWarning}
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteWarning(null)}
                  className="px-4 py-2 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
