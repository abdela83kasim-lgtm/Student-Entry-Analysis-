import React, { useState } from 'react';
import {
  UserAccount,
  UserRole,
  DepartmentOfferStatus,
  RawRecord,
  generateDefaultSecurePassword,
  parseAssignedDepartments,
  serializeAssignedDepartments,
  matchesAssignedDepartment,
  parseProgramLevelScopes,
  serializeProgramLevelScopes,
  matchesProgramLevelScope
} from '../types';
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
  RefreshCw,
  Mail,
  Phone
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
    case 'all_viewer':
      return <Eye className="w-5 h-5 text-cyan-200" />;
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
  const [formProgramMode, setFormProgramMode] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [formSelectedPrograms, setFormSelectedPrograms] = useState<string[]>([]);
  const [customProgramInput, setCustomProgramInput] = useState('');
  const [formDeptMode, setFormDeptMode] = useState<'ALL' | 'SPECIFIC'>('SPECIFIC');
  const [formSelectedDepts, setFormSelectedDepts] = useState<string[]>([]);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [formOfferStatus, setFormOfferStatus] = useState<DepartmentOfferStatus>('offered');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formDataEntryDone, setFormDataEntryDone] = useState<boolean>(false);
  const [formRoleTitle, setFormRoleTitle] = useState('');
  const [formPassword, setFormPassword] = useState(() => generateDefaultSecurePassword());
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formRecoveryEmail, setFormRecoveryEmail] = useState('');
  const [formRecoveryPhone, setFormRecoveryPhone] = useState('');
  const [error, setError] = useState('');

  // Password visibility and action notices for admin
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedUsername, setCopiedUsername] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Combined unique program levels (standard + any custom selected levels)
  const allProgramLevels = Array.from(
    new Set([
      ...PROGRAM_LEVELS,
      ...formSelectedPrograms.filter(Boolean)
    ])
  );

  // Combined unique departments list (includes defaults, ledger depts, and currently selected custom depts)
  const allDepartments = Array.from(
    new Set([
      ...DEFAULT_DEPARTMENTS,
      ...existingDepartments.filter(Boolean),
      ...formSelectedDepts.filter(Boolean)
    ])
  ).sort((a, b) => a.localeCompare(b));

  const filteredDepartmentOptions = allDepartments.filter((dept) =>
    dept.toLowerCase().includes(deptSearchQuery.trim().toLowerCase())
  );

  if (!isOpen) return null;

  if (currentUserAccount.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#16221F] text-[#17262B] dark:text-[#E7EFEC] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-300 dark:border-amber-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#0F4C3A] dark:text-[#A9D3C2]">
                Administrator Access Required
              </h2>
              <p className="text-xs text-[#5B6B70] dark:text-[#9DB0AA]">
                Restricted security control
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[#324840] dark:text-[#CFE6DC] bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
            Only the University Administrator can view user accounts, add new users, edit roles/passwords, or switch accounts.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#0F4C3A] hover:bg-[#1A5C49] text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setFormUsername('');
    setFormName('');
    setFormProgramMode('ALL');
    setFormSelectedPrograms([]);
    setCustomProgramInput('');
    setFormDeptMode('ALL');
    setFormSelectedDepts([]);
    setDeptSearchQuery('');
    setCustomDeptInput('');
    setFormOfferStatus('offered');
    setFormIsActive(true);
    setFormDataEntryDone(false);
    setFormRoleTitle('');
    setFormPassword(generateDefaultSecurePassword());
    setFormShowPassword(false);
    setFormDescription('');
    setFormRecoveryEmail('');
    setFormRecoveryPhone('');
    setError('');
    setShowAddForm(false);
    setEditingUsername(null);
  };

  const handleStartEdit = (user: UserAccount) => {
    setEditingUsername(user.username);
    setFormUsername(user.username);
    setFormName(user.name);

    const parsedPrograms = parseProgramLevelScopes(user.programLevelScope);
    if (parsedPrograms.length === 0) {
      setFormProgramMode('ALL');
      setFormSelectedPrograms([]);
    } else {
      setFormProgramMode('SPECIFIC');
      setFormSelectedPrograms(parsedPrograms);
    }
    setCustomProgramInput('');

    const parsedDepts = parseAssignedDepartments(user.assignedDepartment);
    if (parsedDepts.length === 0) {
      setFormDeptMode('ALL');
      setFormSelectedDepts([]);
    } else {
      setFormDeptMode('SPECIFIC');
      setFormSelectedDepts(parsedDepts);
    }
    setDeptSearchQuery('');
    setCustomDeptInput('');

    setFormOfferStatus(user.departmentOfferStatus || 'assigned');
    setFormIsActive(user.isActive !== false);
    setFormDataEntryDone(Boolean(user.dataEntryCompleted));
    setFormRoleTitle(user.roleTitle);
    setFormPassword(user.password || '1');
    setFormDescription(user.description);
    setFormRecoveryEmail(user.username === 'admin' ? user.recoveryEmail || '' : '');
    setFormRecoveryPhone(user.username === 'admin' ? user.recoveryPhone || '' : '');
    setShowAddForm(true);
    setError('');
  };

  const toggleProgramSelection = (lvlName: string) => {
    setFormProgramMode('SPECIFIC');
    setFormSelectedPrograms((prev) => {
      const exists = prev.some((p) => p.toLowerCase() === lvlName.toLowerCase());
      if (exists) {
        return prev.filter((p) => p.toLowerCase() !== lvlName.toLowerCase());
      }
      return [...prev, lvlName];
    });
  };

  const handleAddCustomProgram = () => {
    const clean = customProgramInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.toUpperCase() !== 'ALL');
    if (clean.length === 0) return;
    setFormProgramMode('SPECIFIC');
    setFormSelectedPrograms((prev) => {
      const next = [...prev];
      for (const item of clean) {
        if (!next.some((p) => p.toLowerCase() === item.toLowerCase())) {
          next.push(item);
        }
      }
      return next;
    });
    setCustomProgramInput('');
  };

  const toggleDepartmentSelection = (deptName: string) => {
    setFormDeptMode('SPECIFIC');
    setFormSelectedDepts((prev) => {
      const exists = prev.some((d) => d.toLowerCase() === deptName.toLowerCase());
      if (exists) {
        return prev.filter((d) => d.toLowerCase() !== deptName.toLowerCase());
      }
      return [...prev, deptName];
    });
  };

  const handleAddCustomDepartment = () => {
    const clean = customDeptInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.toUpperCase() !== 'ALL');
    if (clean.length === 0) return;
    setFormDeptMode('SPECIFIC');
    setFormSelectedDepts((prev) => {
      const next = [...prev];
      for (const item of clean) {
        if (!next.some((d) => d.toLowerCase() === item.toLowerCase())) {
          next.push(item);
        }
      }
      return next;
    });
    setCustomDeptInput('');
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

    const isEditingSoleAdmin = editingUsername === 'admin';
    if (isEditingSoleAdmin) {
      const cleanEmail = formRecoveryEmail.trim().toLowerCase();
      const cleanPhone = formRecoveryPhone.trim();
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError('Please enter a valid Admin recovery email address.');
        return;
      }
      if (cleanEmail.length > 150) {
        setError('Admin recovery email must be 150 characters or fewer.');
        return;
      }
      if (cleanPhone && cleanPhone.replace(/\D/g, '').length < 7) {
        setError('Please enter a valid Admin recovery phone number (at least 7 digits).');
        return;
      }
      if (cleanPhone.length > 40) {
        setError('Admin recovery phone number must be 40 characters or fewer.');
        return;
      }
    }
    if (!isEditingSoleAdmin && formProgramMode === 'SPECIFIC' && formSelectedPrograms.length === 0) {
      setError('Please select at least one Program Level or choose "All Program Levels (ALL)".');
      return;
    }
    if (!isEditingSoleAdmin && formDeptMode === 'SPECIFIC' && formSelectedDepts.length === 0) {
      setError('Please select at least one department or choose "All Departments (ALL)".');
      return;
    }

    const finalProgramScope =
      isEditingSoleAdmin || formProgramMode === 'ALL'
        ? 'ALL'
        : serializeProgramLevelScopes(formSelectedPrograms);

    if (finalProgramScope.length > 500) {
      setError('Too many program levels selected for one user (exceeds 500-character limit).');
      return;
    }

    const finalDepartment =
      isEditingSoleAdmin || formDeptMode === 'ALL'
        ? 'ALL'
        : serializeAssignedDepartments(formSelectedDepts);

    if (finalDepartment.length > 1000) {
      setError('Too many departments selected for one user (exceeds 1000-character limit).');
      return;
    }

    const effectiveProgramScope = isEditingSoleAdmin ? 'ALL' : finalProgramScope;
    const effectiveDepartment = isEditingSoleAdmin ? 'ALL' : finalDepartment;
    const assignedCount = parseAssignedDepartments(effectiveDepartment).length;
    const programCount = parseProgramLevelScopes(effectiveProgramScope).length;
    const selectedProgramList = parseProgramLevelScopes(effectiveProgramScope);

    let roleType: UserRole = 'program_applied';
    let avatarColor = '#1F7A5C';

    // Single Admin Policy: ONLY @admin can ever have role === 'admin'.
    // Any other user assigned ALL Departments + ALL Program Levels gets 'all_viewer' (view all student list, cannot act as Admin).
    if (isEditingSoleAdmin) {
      roleType = 'admin';
      avatarColor = '#B45309';
    } else if (effectiveDepartment !== 'ALL') {
      roleType = 'department_officer';
      avatarColor = '#047857';
    } else if (effectiveProgramScope === 'ALL') {
      roleType = 'all_viewer';
      avatarColor = '#0E7490';
    } else if (selectedProgramList.length === 1) {
      const singleProg = selectedProgramList[0];
      if (singleProg === '1st Degree (Applied)') {
        roleType = 'program_applied';
        avatarColor = '#1F7A5C';
      } else if (singleProg === '1st Degree (Education)') {
        roleType = 'program_education';
        avatarColor = '#2F7F9E';
      } else if (singleProg === 'Diploma and Certificate') {
        roleType = 'program_diploma';
        avatarColor = '#D97706';
      } else if (singleProg === 'Masters') {
        roleType = 'program_masters';
        avatarColor = '#7C3AED';
      } else if (singleProg === 'PhD') {
        roleType = 'program_phd';
        avatarColor = '#9333EA';
      }
    } else {
      // Multi-program scope with ALL departments: keep non-admin scoped role so record filtering applies
      roleType = 'program_applied';
      avatarColor = '#0F766E';
    }

    const generatedRoleTitle =
      formRoleTitle.trim() ||
      (isEditingSoleAdmin
        ? 'University Executive Admin'
        : effectiveDepartment !== 'ALL'
        ? assignedCount > 1
          ? `Multi-Department Officer (${assignedCount} Depts)`
          : `${effectiveDepartment} Department Officer`
        : effectiveProgramScope === 'ALL'
        ? 'All-Student List Viewer (Non-Admin)'
        : programCount > 1
        ? `Multi-Program Officer (${programCount} Levels)`
        : `${effectiveProgramScope} Officer`);

    const generatedDescription =
      formDescription.trim() ||
      (isEditingSoleAdmin
        ? 'Sole Administrator account: Full institutional authority, data entry approval, reports, and user management.'
        : effectiveDepartment !== 'ALL'
        ? `Authorized to submit new student admissions for ${
            assignedCount > 1 ? `departments: ${effectiveDepartment}` : `Department of ${effectiveDepartment}`
          } (${effectiveProgramScope}). Entries require Admin approval.`
        : effectiveProgramScope === 'ALL'
        ? 'Department Assignment Offering: Can view the full student list across all departments and years, and submit new entries for Admin approval. Cannot act as Admin.'
        : `Restricted access: Can view ${effectiveProgramScope} data and submit new entries for Admin approval. Cannot act as Admin.`);

    const accountObj: UserAccount = {
      username: editingUsername || cleanUsername,
      name: formName.trim(),
      role: roleType,
      roleTitle: generatedRoleTitle,
      programLevelScope: effectiveProgramScope,
      assignedDepartment: effectiveDepartment,
      departmentOfferStatus: isEditingSoleAdmin ? 'assigned' : formOfferStatus,
      isActive: isEditingSoleAdmin ? true : formIsActive,
      dataEntryCompleted: formDataEntryDone,
      description: generatedDescription,
      avatarColor,
      password: formPassword.trim() || '1',
      ...(isEditingSoleAdmin
        ? {
            recoveryEmail: formRecoveryEmail.trim().toLowerCase() || undefined,
            recoveryPhone: formRecoveryPhone.trim() || undefined
          }
        : {})
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
    const hasSpecificDepts = parseAssignedDepartments(user.assignedDepartment).length > 0;
    const hasSpecificPrograms = parseProgramLevelScopes(user.programLevelScope).length > 0;
    if (!hasSpecificDepts && !hasSpecificPrograms) {
      return records.length;
    }
    return records.filter((r) => {
      const matchDept = matchesAssignedDepartment(r[2], user.assignedDepartment);
      const matchProgram = matchesProgramLevelScope(r[1], user.programLevelScope);
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

        {/* Single-Admin Policy Notice */}
        <div className="mb-4 p-2.5 px-3.5 bg-[#EFF6F3] dark:bg-white/5 border border-[#C5D8CF] dark:border-white/10 rounded-xl text-xs text-[#0F4C3A] dark:text-[#A9D3C2] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#E0A526] shrink-0" />
            <span>
              <strong>Single Admin Account Policy:</strong> Only <strong>1 Administrator (@admin)</strong> exists in Department Assignment Offering. Offering <strong>All Departments + ALL Program Levels</strong> grants full student-list viewing without Admin permissions; new entries submitted by non-admins require Admin approval.
            </span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5B6B70] dark:text-[#9DB0AA]">
            <span>Total Accounts: <strong className="text-[#0F4C3A] dark:text-white">{users.length}</strong></span>
            <span>·</span>
            <span>Admin Accounts: <strong className="text-[#B45309] dark:text-[#E0A526]">{users.filter((u) => u.role === 'admin').length} (Max 1)</strong></span>
            <span>·</span>
            <span>Active: <strong className="text-emerald-700 dark:text-emerald-400">{users.filter((u) => u.isActive !== false).length}</strong></span>
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
              <span>Create User / Department Offering</span>
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
                  : 'Create User by Department (Offer / Assignment — Non-Admin)'}
              </span>
              <span className="text-[11px] font-normal text-[#5B6B70] dark:text-[#9DB0AA]">
                Non-admin users submit new records as Pending until Admin approves.
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

            {/* Row 2: Program Level Scope (Multi-Select) & Department Assignment (Multi-Select) */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                    1. Program Level Scope — Multi-Select <span className="text-red-500">*</span>
                  </label>
                  {editingUsername !== 'admin' && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setFormProgramMode('ALL');
                          setFormSelectedPrograms([]);
                        }}
                        className={`px-2 py-0.5 rounded border font-semibold cursor-pointer transition-colors ${
                          formProgramMode === 'ALL'
                            ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                            : 'bg-white dark:bg-[#101A17] text-[#324840] dark:text-[#CFE6DC] border-[#BFCDC8] dark:border-[#354C45] hover:bg-[#EFF6F3]'
                        }`}
                      >
                        All Program Levels (ALL)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormProgramMode('SPECIFIC')}
                        className={`px-2 py-0.5 rounded border font-semibold cursor-pointer transition-colors ${
                          formProgramMode === 'SPECIFIC'
                            ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                            : 'bg-white dark:bg-[#101A17] text-[#324840] dark:text-[#CFE6DC] border-[#BFCDC8] dark:border-[#354C45] hover:bg-[#EFF6F3]'
                        }`}
                      >
                        Select Multiple Level(s) ({formSelectedPrograms.length})
                      </button>
                    </div>
                  )}
                </div>

                {editingUsername === 'admin' ? (
                  <div className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white/60 dark:bg-[#101A17]/60 rounded-lg text-xs font-semibold text-[#5B6B70] dark:text-[#9DB0AA]">
                    ALL Program Levels (Sole Admin)
                  </div>
                ) : formProgramMode === 'ALL' ? (
                  <div className="p-3 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[#324840] dark:text-[#CFE6DC]">
                      <strong>ALL Program Levels</strong> — User can view & submit records for any program level (Cannot Act as Admin).
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormProgramMode('SPECIFIC')}
                      className="text-[11px] font-semibold text-[#0F4C3A] dark:text-[#E0A526] hover:underline cursor-pointer"
                    >
                      Pick specific program levels →
                    </button>
                  </div>
                ) : (
                  <div className="border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-xl p-3 space-y-2.5">
                    {formSelectedPrograms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-[#E3ECE7] dark:border-white/10">
                        {formSelectedPrograms.map((lvl) => (
                          <span
                            key={lvl}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFF6F3] dark:bg-emerald-950/60 text-[#0F4C3A] dark:text-[#A9D3C2] border border-[#C5D8CF] dark:border-emerald-800 text-[11px] font-semibold"
                          >
                            <span>{lvl}</span>
                            <button
                              type="button"
                              onClick={() => toggleProgramSelection(lvl)}
                              className="text-[#5B6B70] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                              title={`Remove ${lvl}`}
                              aria-label={`Remove ${lvl}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA]">
                        Check one or more program levels to assign to this user:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFormSelectedPrograms(allProgramLevels)}
                          className="px-2 py-1 text-[11px] font-semibold text-[#0F4C3A] dark:text-[#A9D3C2] bg-[#EFF6F3] dark:bg-white/10 hover:bg-[#E1EEE8] rounded cursor-pointer"
                        >
                          Select All ({allProgramLevels.length})
                        </button>
                        {formSelectedPrograms.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormSelectedPrograms([])}
                            className="px-2 py-1 text-[11px] font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                      {allProgramLevels.map((lvl) => {
                        const isChecked = formSelectedPrograms.some(
                          (p) => p.toLowerCase() === lvl.toLowerCase()
                        );
                        return (
                          <label
                            key={lvl}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors select-none ${
                              isChecked
                                ? 'bg-[#EFF6F3] dark:bg-emerald-950/50 border-[#0F4C3A] dark:border-[#E0A526] text-[#0F4C3A] dark:text-white font-semibold'
                                : 'bg-[#FAFDFB] dark:bg-[#16221F] border-[#E3ECE7] dark:border-white/10 text-[#324840] dark:text-[#CFE6DC] hover:border-[#A2C4B7]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleProgramSelection(lvl)}
                              className="accent-[#0F4C3A] w-3.5 h-3.5 shrink-0 cursor-pointer"
                            />
                            <span className="truncate">{lvl}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#E3ECE7] dark:border-white/10">
                      <input
                        type="text"
                        value={customProgramInput}
                        onChange={(e) => setCustomProgramInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomProgram();
                          }
                        }}
                        placeholder="Add custom program level..."
                        className="flex-1 px-2.5 py-1 border border-[#BFCDC8] dark:border-[#354C45] bg-[#FAFDFB] dark:bg-[#16221F] rounded-lg text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomProgram}
                        className="px-2.5 py-1 bg-[#1F7A5C] hover:bg-[#176148] text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Level</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                    2. Assigned Department(s) — Multi-Select <span className="text-red-500">*</span>
                  </label>
                  {editingUsername !== 'admin' && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setFormDeptMode('ALL');
                          setFormSelectedDepts([]);
                        }}
                        className={`px-2 py-0.5 rounded border font-semibold cursor-pointer transition-colors ${
                          formDeptMode === 'ALL'
                            ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                            : 'bg-white dark:bg-[#101A17] text-[#324840] dark:text-[#CFE6DC] border-[#BFCDC8] dark:border-[#354C45] hover:bg-[#EFF6F3]'
                        }`}
                      >
                        All Departments (ALL)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormDeptMode('SPECIFIC')}
                        className={`px-2 py-0.5 rounded border font-semibold cursor-pointer transition-colors ${
                          formDeptMode === 'SPECIFIC'
                            ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                            : 'bg-white dark:bg-[#101A17] text-[#324840] dark:text-[#CFE6DC] border-[#BFCDC8] dark:border-[#354C45] hover:bg-[#EFF6F3]'
                        }`}
                      >
                        Select Multiple Department(s) ({formSelectedDepts.length})
                      </button>
                    </div>
                  )}
                </div>

                {editingUsername === 'admin' ? (
                  <div className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white/60 dark:bg-[#101A17]/60 rounded-lg text-xs font-semibold text-[#5B6B70] dark:text-[#9DB0AA]">
                    ALL Departments (Sole Admin)
                  </div>
                ) : formDeptMode === 'ALL' ? (
                  <div className="p-3 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[#324840] dark:text-[#CFE6DC]">
                      <strong>ALL Departments</strong> — User can view & submit records for any department (Cannot Act as Admin).
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormDeptMode('SPECIFIC')}
                      className="text-[11px] font-semibold text-[#0F4C3A] dark:text-[#E0A526] hover:underline cursor-pointer"
                    >
                      Pick specific departments →
                    </button>
                  </div>
                ) : (
                  <div className="border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-xl p-3 space-y-2.5">
                    {/* Selected Department Tags */}
                    {formSelectedDepts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-[#E3ECE7] dark:border-white/10">
                        {formSelectedDepts.map((dept) => (
                          <span
                            key={dept}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFF6F3] dark:bg-emerald-950/60 text-[#0F4C3A] dark:text-[#A9D3C2] border border-[#C5D8CF] dark:border-emerald-800 text-[11px] font-semibold"
                          >
                            <span>{dept}</span>
                            <button
                              type="button"
                              onClick={() => toggleDepartmentSelection(dept)}
                              className="text-[#5B6B70] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                              title={`Remove ${dept}`}
                              aria-label={`Remove ${dept}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Filter & Quick Select Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="search"
                        value={deptSearchQuery}
                        onChange={(e) => setDeptSearchQuery(e.target.value)}
                        placeholder="Search departments to check..."
                        className="flex-1 min-w-[160px] px-2.5 py-1 border border-[#BFCDC8] dark:border-[#354C45] bg-[#FAFDFB] dark:bg-[#16221F] rounded-lg text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setFormSelectedDepts(allDepartments)}
                        className="px-2 py-1 text-[11px] font-semibold text-[#0F4C3A] dark:text-[#A9D3C2] bg-[#EFF6F3] dark:bg-white/10 hover:bg-[#E1EEE8] rounded cursor-pointer"
                      >
                        Select All ({allDepartments.length})
                      </button>
                      {formSelectedDepts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormSelectedDepts([])}
                          className="px-2 py-1 text-[11px] font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Multi-Select Checkbox Grid */}
                    <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pr-1">
                      {filteredDepartmentOptions.map((dept) => {
                        const isChecked = formSelectedDepts.some(
                          (d) => d.toLowerCase() === dept.toLowerCase()
                        );
                        return (
                          <label
                            key={dept}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors select-none ${
                              isChecked
                                ? 'bg-[#EFF6F3] dark:bg-emerald-950/50 border-[#0F4C3A] dark:border-[#E0A526] text-[#0F4C3A] dark:text-white font-semibold'
                                : 'bg-[#FAFDFB] dark:bg-[#16221F] border-[#E3ECE7] dark:border-white/10 text-[#324840] dark:text-[#CFE6DC] hover:border-[#A2C4B7]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleDepartmentSelection(dept)}
                              className="accent-[#0F4C3A] w-3.5 h-3.5 shrink-0 cursor-pointer"
                            />
                            <span className="truncate">{dept}</span>
                          </label>
                        );
                      })}
                      {filteredDepartmentOptions.length === 0 && (
                        <div className="col-span-full text-[11px] text-[#5B6B70] dark:text-[#9DB0AA] py-2 text-center">
                          No matching departments. Add a custom department below.
                        </div>
                      )}
                    </div>

                    {/* Add Custom Department into Multi-Select */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#E3ECE7] dark:border-white/10">
                      <input
                        type="text"
                        value={customDeptInput}
                        onChange={(e) => setCustomDeptInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomDepartment();
                          }
                        }}
                        placeholder="Add custom department name..."
                        className="flex-1 px-2.5 py-1 border border-[#BFCDC8] dark:border-[#354C45] bg-[#FAFDFB] dark:bg-[#16221F] rounded-lg text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomDepartment}
                        className="px-2.5 py-1 bg-[#1F7A5C] hover:bg-[#176148] text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Dept</span>
                      </button>
                    </div>
                  </div>
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

            {editingUsername === 'admin' && (
              <div className="p-3 bg-[#EFF6F3] dark:bg-emerald-950/30 rounded-xl border border-[#C5D8CF] dark:border-emerald-800/60 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F4C3A] dark:text-[#A9D3C2]">
                  <Shield className="w-4 h-4 text-[#E0A526]" />
                  <span>Admin-Only Password Recovery Contacts (Email &amp; Phone Number)</span>
                </div>
                <p className="text-[11px] text-[#324840] dark:text-[#CFE6DC]">
                  Connect an Email Address, Phone Number, or both exclusively to <strong>@admin</strong> so you can receive a verification code if the Administrator password is lost.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                      Recovery Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-[#6D857C] absolute left-2.5 top-2 pointer-events-none" />
                      <input
                        type="email"
                        value={formRecoveryEmail}
                        onChange={(e) => setFormRecoveryEmail(e.target.value)}
                        placeholder="e.g. admin@osu.edu.et"
                        className="w-full pl-8 pr-3 py-1.5 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
                      Recovery Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-[#6D857C] absolute left-2.5 top-2 pointer-events-none" />
                      <input
                        type="tel"
                        value={formRecoveryPhone}
                        onChange={(e) => setFormRecoveryPhone(e.target.value)}
                        placeholder="e.g. +251 911 234 567"
                        className="w-full pl-8 pr-3 py-1.5 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg font-mono text-xs focus:ring-1 focus:ring-[#E0A526] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                        {account.role === 'admin' && (
                          <>
                            <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700">
                              <Shield className="w-3 h-3 text-[#E0A526]" />
                              <span>Sole System Admin (Only 1 Allowed)</span>
                            </span>
                            {(account.recoveryEmail || account.recoveryPhone) ? (
                              <span className="inline-flex flex-wrap items-center gap-1 font-semibold text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                                {account.recoveryEmail && (
                                  <>
                                    <Mail className="w-3 h-3" />
                                    <span>{account.recoveryEmail}</span>
                                  </>
                                )}
                                {account.recoveryEmail && account.recoveryPhone && <span>·</span>}
                                {account.recoveryPhone && (
                                  <>
                                    <Phone className="w-3 h-3" />
                                    <span>{account.recoveryPhone}</span>
                                  </>
                                )}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(account)}
                                className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700 cursor-pointer"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Connect Recovery Email / Phone</span>
                              </button>
                            )}
                          </>
                        )}

                        {(account.role === 'all_viewer' || account.role === 'registrar') && (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 rounded border border-cyan-200 dark:border-cyan-800">
                            <Eye className="w-3 h-3" />
                            <span>View All Student List · Non-Admin</span>
                          </span>
                        )}

                        {(() => {
                          const assignedList = parseAssignedDepartments(account.assignedDepartment);
                          if (assignedList.length === 0) {
                            return (
                              <span className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA] font-medium">
                                All Departments
                              </span>
                            );
                          }
                          if (assignedList.length === 1) {
                            return (
                              <span className="inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 bg-[#EFF6F3] dark:bg-white/10 text-[#0F4C3A] dark:text-[#E0A526] rounded border border-[#C5D8CF] dark:border-white/10">
                                <Briefcase className="w-3.5 h-3.5 text-[#0F4C3A] dark:text-[#E0A526]" />
                                <span>Department: <strong>{assignedList[0]}</strong></span>
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex flex-wrap items-center gap-1 font-bold text-xs px-2 py-0.5 bg-[#EFF6F3] dark:bg-white/10 text-[#0F4C3A] dark:text-[#E0A526] rounded border border-[#C5D8CF] dark:border-white/10">
                              <Briefcase className="w-3.5 h-3.5 text-[#0F4C3A] dark:text-[#E0A526] shrink-0" />
                              <span>Departments ({assignedList.length}):</span>
                              {assignedList.map((d) => (
                                <span
                                  key={d}
                                  className="px-1.5 py-0.2 bg-white dark:bg-[#101A17] text-[#0F4C3A] dark:text-[#A9D3C2] rounded border border-[#C5D8CF] dark:border-white/15 text-[10px] font-semibold"
                                >
                                  {d}
                                </span>
                              ))}
                            </span>
                          );
                        })()}

                        {(() => {
                          const progList = parseProgramLevelScopes(account.programLevelScope);
                          if (progList.length === 0) {
                            return (
                              <span className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA]">
                                Level: <strong>ALL</strong>
                              </span>
                            );
                          }
                          if (progList.length === 1) {
                            return (
                              <span className="text-[11px] text-[#5B6B70] dark:text-[#9DB0AA]">
                                Level: <strong>{progList[0]}</strong>
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex flex-wrap items-center gap-1 text-[11px] text-[#5B6B70] dark:text-[#9DB0AA]">
                              <span>Levels ({progList.length}):</span>
                              {progList.map((lvl) => (
                                <span
                                  key={lvl}
                                  className="px-1.5 py-0.2 bg-[#EFF6F3] dark:bg-white/10 text-[#0F4C3A] dark:text-[#A9D3C2] rounded border border-[#C5D8CF] dark:border-white/15 text-[10px] font-semibold"
                                >
                                  {lvl}
                                </span>
                              ))}
                            </span>
                          );
                        })()}

                        {/* Offer Status */}
                        {(parseAssignedDepartments(account.assignedDepartment).length > 0 ||
                          account.role === 'all_viewer') && (
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
