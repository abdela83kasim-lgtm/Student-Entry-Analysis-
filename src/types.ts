export type RawRecord = [
  year: number,
  program: string,
  department: string,
  mode: string,
  campus: string | null,
  male: number | null,
  female: number | null,
  total: number | null,
  sourceCell: string | null
];

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
  programLevelScope: string; // '1st Degree (Applied)', 'Masters', etc. or 'ALL'
  assignedDepartment?: string; // Specific department (e.g., 'Accounting', 'Law', 'MBA') or 'ALL'
  departmentOfferStatus?: DepartmentOfferStatus;
  isActive?: boolean; // Defaults to true; Admin can deactivate when data entry is completed
  dataEntryCompleted?: boolean; // Set when user finishes all student admissions data entry
  description: string;
  avatarColor: string;
  password?: string;
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
    description: 'Enrolls and records new student entrants with full institutional admissions authority.',
    avatarColor: '#0F4C3A'
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
    description: 'Departmental coordinator: Enters, reviews, and edits student intake records for the Department of Accounting.',
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
    description: 'Full institutional planning, cross-faculty analysis, reports, and credential configuration.',
    avatarColor: '#B45309'
  }
];
