export const LIVE_PORTAL_URL = 'https://osu-active-studente.netlify.app/';

export type RecordApprovalStatus = 'approved' | 'pending' | 'rejected';

export type RawRecord = [
  year: number,
  program: string,
  department: string,
  mode: string,
  campus: string | null,
  male: number | null,
  female: number | null,
  total: number | null,
  sourceCell: string | null,
  approvalStatus?: RecordApprovalStatus,
  submittedBy?: string | null
];

export function getRecordApprovalStatus(record: RawRecord): RecordApprovalStatus {
  return record[9] || 'approved';
}

export interface RecordItem {
  id: string;
  year: number;
  program: string;
  department: string;
  mode: string;
  campus: string | null;
  male: number | null;
  female: number | null;
  total: number | null;
  sourceCell: string | null;
  approvalStatus?: RecordApprovalStatus;
  submittedBy?: string | null;
}

export interface DepartmentSummary {
  department: string;
  program: string;
  years: number[]; // 2014, 2015, 2016, 2017, 2018
  total: number;
  femaleShare2018: number | null;
}

export interface CampusSummary {
  campus: string;
  years: number[];
  maleTotal: number;
  femaleTotal: number;
  total: number;
}

export interface ReportSectionConfig {
  id: string;
  title: string;
  enabled: boolean;
  type:
    | 'kpi'
    | 'summary'
    | 'yearTrend'
    | 'levelMode'
    | 'gender'
    | 'departments'
    | 'campuses'
    | 'findings'
    | 'rawData'
    | 'custom'
    | 'notes';
  customTitle?: string;
  customContent?: string;
}

export interface ReportDocument {
  id: string;
  name: string;
  institution: string;
  preparedBy: string;
  date: string;
  status: 'Draft' | 'Under Review' | 'Final' | 'Archived';
  sections: ReportSectionConfig[];
  customSummary?: string;
  customFindings?: string[];
  customNotes?: string[];
  updatedAt: number;
  dataHash: number;
}

export type ActiveView = 'report' | 'departments' | 'data' | 'preview';

export type UserRole =
  | 'admin'
  | 'registrar'
  | 'all_viewer'
  | 'program_applied'
  | 'program_education'
  | 'program_diploma'
  | 'program_masters'
  | 'program_phd'
  | 'department_officer';

export type DepartmentOfferStatus = 'assigned' | 'offered' | 'accepted' | 'declined';

export const generateDefaultSecurePassword = (prefix = 'OSU'): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
};

export interface UserAccount {
  username: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  programLevelScope: string; // Single or comma-separated program levels (e.g., '1st Degree (Applied), Masters') or 'ALL'
  assignedDepartment?: string; // Single or comma-separated departments (e.g., 'Accounting, Law') or 'ALL'
  departmentOfferStatus?: DepartmentOfferStatus;
  isActive?: boolean; // Defaults to true; Admin can deactivate when data entry is completed
  dataEntryCompleted?: boolean; // Set when user finishes all student admissions data entry
  description: string;
  avatarColor: string;
  password?: string;
  recoveryEmail?: string; // Admin-only recovery email
  recoveryPhone?: string; // Admin-only recovery phone number
}

export function emailsMatch(stored?: string | null, entered?: string | null): boolean {
  const a = (stored || '').trim().toLowerCase();
  const b = (entered || '').trim().toLowerCase();
  return Boolean(a && b && a === b);
}

export function phonesMatch(stored?: string | null, entered?: string | null): boolean {
  const a = (stored || '').replace(/\D/g, '');
  const b = (entered || '').replace(/\D/g, '');
  if (!a || !b) return false;
  if (a === b) return true;
  return a.length >= 9 && b.length >= 9 && a.slice(-9) === b.slice(-9);
}

export function maskRecoveryEmail(email?: string | null): string {
  const clean = (email || '').trim();
  const atIdx = clean.indexOf('@');
  if (atIdx <= 0) return '';
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***${domain}`;
}

export function maskRecoveryPhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return '••••';
  return `${'•'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

export function parseProgramLevelScopes(programLevelScope?: string | null): string[] {
  if (!programLevelScope) return [];
  const trimmed = programLevelScope.trim();
  if (!trimmed || trimmed.toUpperCase() === 'ALL') return [];
  const parts = trimmed
    .split(',')
    .map((lvl) => lvl.trim())
    .filter((lvl) => lvl.length > 0 && lvl.toUpperCase() !== 'ALL');
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }
  return unique;
}

export function serializeProgramLevelScopes(programLevels: string[]): string {
  const cleaned = parseProgramLevelScopes(programLevels.join(','));
  if (cleaned.length === 0) return 'ALL';
  return cleaned.join(', ');
}

export function matchesProgramLevelScope(
  recordProgram: string,
  programLevelScope?: string | null
): boolean {
  const levels = parseProgramLevelScopes(programLevelScope);
  if (levels.length === 0) return true;
  const target = (recordProgram || '').trim().toLowerCase();
  return levels.some((lvl) => lvl.toLowerCase() === target);
}

export function formatProgramLevelScopeLabel(programLevelScope?: string | null): string {
  const levels = parseProgramLevelScopes(programLevelScope);
  if (levels.length === 0) return 'All Program Levels';
  if (levels.length === 1) return levels[0];
  if (levels.length <= 2) return levels.join(', ');
  return `${levels.slice(0, 2).join(', ')} +${levels.length - 2} more`;
}

export function parseAssignedDepartments(assignedDepartment?: string | null): string[] {
  if (!assignedDepartment) return [];
  const trimmed = assignedDepartment.trim();
  if (!trimmed || trimmed.toUpperCase() === 'ALL') return [];
  const parts = trimmed
    .split(',')
    .map((d) => d.trim())
    .filter((d) => d.length > 0 && d.toUpperCase() !== 'ALL');
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }
  return unique;
}

export function serializeAssignedDepartments(departments: string[]): string {
  const cleaned = parseAssignedDepartments(departments.join(','));
  if (cleaned.length === 0) return 'ALL';
  return cleaned.join(', ');
}

export function matchesAssignedDepartment(
  recordDepartment: string,
  assignedDepartment?: string | null
): boolean {
  const depts = parseAssignedDepartments(assignedDepartment);
  if (depts.length === 0) return true;
  const target = (recordDepartment || '').trim().toLowerCase();
  return depts.some((d) => d.toLowerCase() === target);
}

export function formatAssignedDepartmentsLabel(assignedDepartment?: string | null): string {
  const depts = parseAssignedDepartments(assignedDepartment);
  if (depts.length === 0) return 'All Departments';
  if (depts.length === 1) return depts[0];
  if (depts.length <= 2) return depts.join(', ');
  return `${depts.slice(0, 2).join(', ')} +${depts.length - 2} more`;
}

export const PROGRAM_LEVEL_USERS: UserAccount[] = [
  {
    username: 'registrar',
    name: 'Academic Registrar Office',
    role: 'registrar',
    roleTitle: 'Office of the Registrar',
    programLevelScope: 'ALL',
    assignedDepartment: 'ALL',
    departmentOfferStatus: 'assigned',
    isActive: true,
    dataEntryCompleted: false,
    description: 'Enrolls and records new student entrants with full institutional admissions view (entries require Admin approval). Cannot act as Admin.',
    avatarColor: '#0F4C3A'
  },
  {
    username: 'student_viewer',
    name: 'All Students List Officer',
    role: 'all_viewer',
    roleTitle: 'All-Student List Viewer (Non-Admin)',
    programLevelScope: 'ALL',
    assignedDepartment: 'ALL',
    departmentOfferStatus: 'offered',
    isActive: true,
    dataEntryCompleted: false,
    description: 'Department Assignment Offering: Can view the full student list across all departments and years, and submit new student entries for Admin approval. Cannot act as Admin.',
    avatarColor: '#0E7490'
  },
  {
    username: 'accounting_lead',
    name: 'Accounting Dept Coordinator',
    role: 'department_officer',
    roleTitle: 'Accounting Admission Officer',
    programLevelScope: '1st Degree (Applied)',
    assignedDepartment: 'Accounting',
    departmentOfferStatus: 'offered',
    isActive: true,
    dataEntryCompleted: false,
    description: 'Departmental coordinator: Enters student intake records for the Department of Accounting (requires Admin approval).',
    avatarColor: '#047857'
  },
  {
    username: 'applied',
    name: 'Applied Degree Coordinator',
    role: 'program_applied',
    roleTitle: '1st Degree (Applied) Officer',
    programLevelScope: '1st Degree (Applied)',
    assignedDepartment: 'ALL',
    departmentOfferStatus: 'assigned',
    isActive: true,
    dataEntryCompleted: false,
    description: 'Undergraduate applied disciplines (Law, Computer Science, Accounting, Management, Economics).',
    avatarColor: '#1F7A5C'
  },
  {
    username: 'education',
    name: 'Education Degree Coordinator',
    role: 'program_education',
    roleTitle: '1st Degree (Education) Officer',
    programLevelScope: '1st Degree (Education)',
    assignedDepartment: 'ALL',
    departmentOfferStatus: 'assigned',
    isActive: true,
    dataEntryCompleted: false,
    description: 'Bachelor of Education curricula, pedagogical faculties, and high-volume school partnerships.',
    avatarColor: '#2F7F9E'
  },
  {
    username: 'diploma',
    name: 'Diploma & Certificate Coordinator',
    role: 'program_diploma',
    roleTitle: 'Diploma and Certificate Officer',
    programLevelScope: 'Diploma and Certificate',
    assignedDepartment: 'ALL',
    departmentOfferStatus: 'assigned',
    isActive: true,
    dataEntryCompleted: false,
    description: 'Summer teacher training certificates, diploma upgrades, and continuing professional programs.',
    avatarColor: '#D97706'
  },
  {
    username: 'masters',
    name: 'Masters Program Coordinator',
    role: 'program_masters',
    roleTitle: 'Masters Studies Officer',
    programLevelScope: 'Masters',
    assignedDepartment: 'ALL',
    departmentOfferStatus: 'assigned',
    isActive: true,
    dataEntryCompleted: false,
    description: 'Postgraduate admissions: MBA, Project Management, Public Management, and MSc tracks.',
    avatarColor: '#7C3AED'
  },
  {
    username: 'phd',
    name: 'PhD Doctoral Coordinator',
    role: 'program_phd',
    roleTitle: 'PhD & Doctoral Officer',
    programLevelScope: 'PhD',
    assignedDepartment: 'ALL',
    departmentOfferStatus: 'assigned',
    isActive: true,
    dataEntryCompleted: false,
    description: 'Doctoral research: PhD in Development Studies, Leadership & Management, and Economics.',
    avatarColor: '#9333EA'
  },
  {
    username: 'admin',
    name: 'Institutional Administrator',
    role: 'admin',
    roleTitle: 'University Executive Admin',
    programLevelScope: 'ALL',
    assignedDepartment: 'ALL',
    departmentOfferStatus: 'assigned',
    isActive: true,
    dataEntryCompleted: false,
    description: 'Sole Administrator account: Full institutional authority, data entry approval, reports, and user management.',
    avatarColor: '#B45309'
  }
];
