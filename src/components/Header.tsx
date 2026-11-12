import React from 'react';
import { ActiveView, UserAccount } from '../types';
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
  BookOpen
} from 'lucide-react';

interface HeaderProps {
  currentUser: string | null;
  currentUserAccount?: UserAccount;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onPrint: () => void;
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
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentUserAccount,
  activeView,
  onViewChange,
  onPrint,
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
  sidebarOpen = false,
  onToggleSidebar
}) => {
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
          {/* User Profile / Admin Management Button */}
          {currentUserAccount?.role === 'admin' ? (
            <button
              onClick={onOpenUserManagement}
              className="flex items-center gap-2 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer border border-[#E0A526]/60 text-left shadow-2xs"
              title="Super Admin: Click to manage users, department assignments & passwords"
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
                <span className="block text-[9px] text-[#A9D3C2] truncate max-w-[140px]">
                  Manage Users & Passwords
                </span>
              </div>
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-xl border border-white/15 text-left select-none"
              title={`Logged in as ${currentUserAccount?.name}. Scope restricted to ${currentUserAccount?.programLevelScope}.`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <div className="leading-tight hidden sm:block">
                <span className="block font-bold text-white text-xs truncate max-w-[130px]">
                  {currentUserAccount?.name || currentUser}
                </span>
                <span className="block text-[9px] text-[#A9D3C2] truncate max-w-[140px]">
                  {currentUserAccount?.assignedDepartment && currentUserAccount.assignedDepartment !== 'ALL'
                    ? `Dept: ${currentUserAccount.assignedDepartment}`
                    : `Scope: ${currentUserAccount?.programLevelScope || 'All'}`}
                </span>
              </div>
            </div>
          )}

          {/* Quick System Controls: Theme, History, Password, Logout */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-white/20">
            <button
              onClick={onToggleDarkMode}
              className="p-1.5 text-[#C4DDD2] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-[#E0A526]" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onOpenLoginHistory}
              className="p-1.5 text-[#9CC7B7] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="View Login History"
              aria-label="View Login History"
            >
              <History className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenChangePassword}
              className="p-1.5 text-[#9CC7B7] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Change Admin Password"
              aria-label="Change Admin Password"
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
            title="Print or export current report"
          >
            <Printer className="w-3.5 h-3.5 text-[#0F4C3A]" />
            <span>Print Report</span>
          </button>


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
