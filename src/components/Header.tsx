import React from 'react';
import { ActiveView, UserAccount, LIVE_PORTAL_URL, parseAssignedDepartments, formatAssignedDepartmentsLabel, formatProgramLevelScopeLabel } from '../types';
import {
  Printer,
  Save,
  CheckCircle2,
  Moon,
  Sun,
  Plus,
  Key,
  LogOut,
  Shield,
  History,
  PanelLeft,
  PanelLeftClose,
  FileText,
  Building2,
  Users,
  Download,
  BookOpen,
  FileSpreadsheet,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

interface HeaderAnalyticsSummary {
  totalStudents: number;
  totalMale: number;
  totalFemale: number;
  overallFemaleShare: number;
  years: number[];
  totalRecords: number;
  departmentCount: number;
  yearTotals: { year: number; total: number }[];
}

interface HeaderProps {
  currentUser: string | null;
  currentUserAccount?: UserAccount;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onPrint: () => void;
  onDownloadPDF?: () => void;
  onExportDOCX?: () => void;
  onSave: () => void;
  onNewReport: () => void;
  onAddDataRecord: () => void;
  onExportJSON: () => void;
  isDirty: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onOpenChangePassword: () => void;
  onOpenLoginHistory: () => void;
  onOpenUserManagement?: () => void;
  onOpenDocumentation?: () => void;
  onOpenGoogleSheets?: () => void;
  onOpenGoogleChat?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  analyticsSummary?: HeaderAnalyticsSummary;
  pendingApprovalCount?: number;
  onOpenPendingApprovals?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentUserAccount,
  activeView,
  onViewChange,
  onPrint,
  onDownloadPDF,
  onExportDOCX,
  onSave,
  onNewReport,
  onAddDataRecord,
  onExportJSON,
  isDirty,
  isEditing,
  onToggleEdit,
  darkMode,
  onToggleDarkMode,
  onLogout,
  onOpenChangePassword,
  onOpenLoginHistory,
  onOpenUserManagement,
  onOpenDocumentation,
  onOpenGoogleSheets,
  onOpenGoogleChat,
  sidebarOpen = false,
  onToggleSidebar,
  analyticsSummary,
  pendingApprovalCount = 0,
  onOpenPendingApprovals
}) => {
  const isAdmin = currentUserAccount?.role === 'admin';
  const yearsList = analyticsSummary?.years || [];
  const yearSpanLabel =
    yearsList.length > 1
      ? `${yearsList[0]}–${yearsList[yearsList.length - 1]}`
      : yearsList.length === 1
      ? String(yearsList[0])
      : 'All Years';

  return (
    <header className="app-header sticky top-0 z-40 bg-[#0F4C3A] text-white border-b border-[#0A3428] shadow-sm transition-colors">
      {/* =========================================================================
          TIER 1 (TOP ROW): Brand Identity & User Access / Session Controls
         ========================================================================= */}
      <div className="px-3 sm:px-5 lg:px-6 py-2 flex items-center justify-between gap-3 lg:gap-4 border-b border-white/10">
        {/* Left: Brand Wordmark & Sidebar Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                sidebarOpen
                  ? 'bg-[#E0A526] text-[#221702] border-[#E0A526]'
                  : 'text-[#D2E4DC] hover:text-white hover:bg-white/10 border-white/20'
              }`}
              title={sidebarOpen ? 'Hide side panel' : 'Open side panel'}
              aria-label="Toggle side panel"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => onViewChange('report')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E0A526] rounded-sm"
          >
            <img
              src="/assets/aistudio/Forest_Green_Radiant_Shield_Emblem_7f18a355.png"
              alt="Oromia State University Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-xs group-hover:scale-105 transition-transform"
            />
            <div className="leading-tight">
              <span className="text-sm sm:text-base font-serif font-bold tracking-tight text-white whitespace-nowrap block">
                OSU Active Student Report
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#9CC7B7] block font-sans tracking-wide">
                Oromia State University · Institutional Portal
              </span>
            </div>
          </button>
        </div>

        {/* Right: User Profile Card & Top System Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Pending Data Approval Alert for Sole Admin */}
          {isAdmin && pendingApprovalCount > 0 && (
            <button
              type="button"
              onClick={onOpenPendingApprovals || (() => onViewChange('data'))}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer animate-pulse"
              title="New student data entries awaiting Administrator approval"
            >
              <span>{pendingApprovalCount} Pending Approval</span>
            </button>
          )}

          {/* User Profile / Admin Management Button (Admin Only can view/add/edit/switch users) */}
          {isAdmin ? (
            <button
              onClick={onOpenUserManagement}
              className="flex items-center gap-2 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer border border-[#E0A526]/60 text-left shadow-2xs"
              title="Admin Only: View, add, edit, switch users & manage passwords"
            >
              <Shield className="w-3.5 h-3.5 text-[#E0A526] shrink-0" />
              <div className="leading-tight hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs truncate max-w-[130px]">
                    {currentUserAccount?.name || currentUser}
                  </span>
                  <span className="text-[9px] bg-[#E0A526] text-[#221702] font-black px-1 rounded">
                    ADMIN
                  </span>
                </div>
                <span className="block text-[9px] text-[#A9D3C2] truncate max-w-[170px]">
                  View, Add & Edit Users
                </span>
              </div>
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-xl border border-white/15 text-left select-none"
              title={`Logged in as ${currentUserAccount?.name}. Non-Admin access (${currentUserAccount?.programLevelScope}).`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <div className="leading-tight hidden sm:block">
                <span className="block font-bold text-white text-xs truncate max-w-[140px]">
                  {currentUserAccount?.name || currentUser}
                </span>
                <span className="block text-[9px] text-[#A9D3C2] truncate max-w-[175px]">
                  {currentUserAccount?.role === 'all_viewer'
                    ? 'All Student List · Non-Admin'
                    : parseAssignedDepartments(currentUserAccount?.assignedDepartment).length > 0
                    ? `Dept: ${formatAssignedDepartmentsLabel(currentUserAccount?.assignedDepartment)}`
                    : `Scope: ${formatProgramLevelScopeLabel(currentUserAccount?.programLevelScope)}`}
                </span>
              </div>
            </div>
          )}

          {/* Quick System Controls: Live Portal Link, Theme, Admin History, Admin Password, Logout */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-white/20">
            <a
              href={LIVE_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#D2E4DC] hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/15"
              title="Open Live Portal (osu-active-studente.netlify.app)"
            >
              <ExternalLink className="w-3 h-3 text-[#E0A526]" />
              <span>Live Portal</span>
            </a>

            <button
              onClick={onToggleDarkMode}
              className="p-1.5 text-[#C4DDD2] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-[#E0A526]" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {isAdmin && (
              <button
                onClick={onOpenLoginHistory}
                className="p-1.5 text-[#9CC7B7] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="View Login History (Admin Only)"
                aria-label="View Login History"
              >
                <History className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onOpenChangePassword}
              className="p-1.5 text-[#9CC7B7] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={`Change My Personal Password (@${currentUserAccount?.username || 'user'})`}
              aria-label="Change Personal Password"
            >
              <Key className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 text-[#9CC7B7] hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Sign Out / Lock Portal"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          UNIFIED ONE-HEADER ALL DATA STUDENT NUMBER VIEW
         ========================================================================= */}
      {analyticsSummary && (
        <div className="bg-[#093528] px-3 sm:px-5 lg:px-6 py-1.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => onViewChange('data')}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-left hover:bg-white/5 px-2 py-0.5 -mx-2 rounded-lg transition-colors cursor-pointer"
            title="Click to open full Student Data Ledger"
          >
            <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#E0A526]">
              <Users className="w-3.5 h-3.5" />
              <span>All Data Student Numbers ({yearSpanLabel}):</span>
            </span>

            <span className="text-[#D2E4DC]">
              Total:{' '}
              <strong className="text-white font-mono text-xs tabular-nums">
                {analyticsSummary.totalStudents.toLocaleString('en-US')}
              </strong>
            </span>

            <span className="text-white/25">·</span>

            <span className="text-[#D2E4DC]">
              Male:{' '}
              <strong className="text-[#A9D3C2] font-mono tabular-nums">
                {analyticsSummary.totalMale.toLocaleString('en-US')}
              </strong>
            </span>

            <span className="text-white/25">·</span>

            <span className="text-[#D2E4DC]">
              Female:{' '}
              <strong className="text-rose-300 font-mono tabular-nums">
                {analyticsSummary.totalFemale.toLocaleString('en-US')}
              </strong>{' '}
              <span className="text-[#9CC7B7]">
                ({analyticsSummary.overallFemaleShare.toFixed(1)}%)
              </span>
            </span>

            <span className="text-white/25 hidden md:inline">·</span>

            <span className="text-[#9CC7B7] hidden md:inline">
              Depts: <strong className="text-white tabular-nums">{analyticsSummary.departmentCount}</strong> · Records:{' '}
              <strong className="text-white tabular-nums">{analyticsSummary.totalRecords}</strong>
            </span>
          </button>

          {/* Dynamic per-year student counts in header (auto-updates whenever a new year is added) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] uppercase tracking-wider text-[#9CC7B7] font-semibold whitespace-nowrap">
              By Year:
            </span>
            {analyticsSummary.yearTotals.map((yt) => (
              <button
                key={yt.year}
                type="button"
                onClick={() => onViewChange('data')}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-[#E0A526] hover:text-[#221702] text-[#E7F3ED] font-mono text-[10px] font-semibold transition-colors whitespace-nowrap cursor-pointer tabular-nums"
                title={`${yt.year}: ${yt.total.toLocaleString('en-US')} active students`}
              >
                {yt.year}: {yt.total.toLocaleString('en-US')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TIER 2 (DOWN ROW PARALLEL): All Buttons Listed Directly (No Dropdowns)
         ========================================================================= */}
      <div className="bg-[#0B3D2E] px-3 sm:px-5 lg:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: All Navigation View Buttons Listed in Parallel */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CC7B7] mr-1 hidden sm:inline">
            Views:
          </span>

          <button
            onClick={() => onViewChange('report')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeView === 'report'
                ? 'bg-[#E0A526] text-[#221702] shadow-xs font-bold'
                : 'text-[#D2E4DC] hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Report Document</span>
          </button>

          <button
            onClick={() => onViewChange('departments')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeView === 'departments'
                ? 'bg-[#E0A526] text-[#221702] shadow-xs font-bold'
                : 'text-[#D2E4DC] hover:text-white hover:bg-white/10'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Department List</span>
          </button>

          <button
            onClick={() => onViewChange('data')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeView === 'data'
                ? 'bg-[#E0A526] text-[#221702] shadow-xs font-bold'
                : 'text-[#D2E4DC] hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Data</span>
          </button>

          <button
            onClick={() => onViewChange('preview')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeView === 'preview'
                ? 'bg-[#E0A526] text-[#221702] shadow-xs font-bold'
                : 'text-[#D2E4DC] hover:text-white hover:bg-white/10'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Layout Preview</span>
          </button>
        </div>

        {/* Right: All Operation Action Buttons Listed in Parallel */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar ml-auto">
          {/* 1. Global Add Student Button */}
          <button
            onClick={onAddDataRecord}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] rounded-lg transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            title="Add New Student Admissions Record"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Student Record</span>
          </button>

          {/* Documentation PDF Button */}
          <button
            onClick={onOpenDocumentation}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white rounded-lg transition-colors shadow-xs cursor-pointer whitespace-nowrap border border-white/20"
            title="View & Download Official System Documentation PDF"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#E0A526]" />
            <span>Documentation PDF</span>
          </button>



          {/* 2. Save Report Button */}
          <button
            onClick={onSave}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap border ${
              isDirty
                ? 'bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] border-[#E0A526] shadow-xs'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
            title="Save report and data changes"
          >
            {isDirty ? (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9CC7B7]" />
                <span>Saved</span>
              </>
            )}
          </button>

          {/* 3. Print Report Button */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#113127] bg-[#E7F3ED] hover:bg-white rounded-lg transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            title="Open System Print dialog with official OSU logo and save PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#0F4C3A]" />
            <span>Print Report</span>
          </button>

          {/* 3a. Direct Download PDF (With Logo) Button */}
          {onDownloadPDF && (
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#E0A526] hover:bg-[#D4991E] text-[#221702] rounded-lg transition-colors shadow-xs cursor-pointer whitespace-nowrap"
              title="Download official report PDF with embedded OSU logo"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          )}

          {/* 3b. Generate DOCX (With Logo) Button */}
          {onExportDOCX && (
            <button
              onClick={onExportDOCX}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[#1F7A5C] hover:bg-[#248A68] border border-white/20 rounded-lg transition-colors shadow-xs cursor-pointer whitespace-nowrap"
              title="Generate and download Word (.docx) report with official OSU logo"
            >
              <FileText className="w-3.5 h-3.5 text-[#E0A526]" />
              <span>Generate DOCX</span>
            </button>
          )}


          {/* 4. Edit Report Button (Admin only on report view) */}
          {activeView === 'report' && currentUserAccount?.role === 'admin' && (
            <button
              onClick={onToggleEdit}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap border ${
                isEditing
                  ? 'bg-[#E0A526] text-[#261A00] border-[#E0A526] ring-1 ring-white/40'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
            >
              {isEditing ? 'Finish Editing' : 'Edit Report'}
            </button>
          )}

          {/* 5. New Report Button (Admin only) */}
          {currentUserAccount?.role === 'admin' && (
            <button
              onClick={onNewReport}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#E3EFE9] border border-white/20 hover:border-white/40 hover:bg-white/10 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              title="Start a new report document"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
