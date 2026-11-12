import React, { useState, useEffect } from 'react';
import { DepartmentSummary } from '../types';
import { PROGRAM_LEVELS, YEARS } from '../data/analytics';
import { X, Check } from 'lucide-react';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentSummary | null;
  activeYears?: number[];
  onSave: (name: string, program: string, years: number[], oldDept?: { name: string; program: string }) => void;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  department,
  activeYears,
  onSave
}) => {
  const yearsList = activeYears && activeYears.length > 0 ? activeYears : (YEARS as unknown as number[]);
  const [name, setName] = useState('');
  const [program, setProgram] = useState<string>(PROGRAM_LEVELS[0]);
  const [years, setYears] = useState<string[]>(() => yearsList.map(() => '0'));
  const [error, setError] = useState('');

  useEffect(() => {
    if (department) {
      setName(department.department);
      setProgram(department.program);
      setYears(yearsList.map((_, i) => String(department.years[i] || 0)));
    } else {
      setName('');
      setProgram(PROGRAM_LEVELS[0]);
      setYears(yearsList.map(() => '0'));
    }
    setError('');
  }, [department, isOpen, yearsList]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a Department name.');
      return;
    }

    const parsedYears = years.map((y) => (y.trim() === '' ? 0 : parseInt(y, 10)));
    if (parsedYears.some((v) => isNaN(v) || v < 0)) {
      setError('Entrant numbers must be valid non-negative integers.');
      return;
    }

    if (!department && parsedYears.reduce((a, b) => a + b, 0) === 0) {
      setError('Enter at least 1 entrant in one of the years to add a department.');
      return;
    }

    onSave(
      name.trim(),
      program,
      parsedYears,
      department ? { name: department.department, program: department.program } : undefined
    );
    onClose();
  };

  const handleYearChange = (index: number, val: string) => {
    const updated = [...years];
    updated[index] = val;
    setYears(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dept-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-[#C5D8CF] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0F4C3A] text-white">
          <h2 id="dept-modal-title" className="text-lg font-serif font-bold tracking-tight">
            {department ? 'Edit Department Intake' : 'Add New Department Program'}
          </h2>
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
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#324840] mb-1">Department Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Accounting, Computer Science, Public Health"
              className="w-full px-3 py-2 border border-[#BFCDC8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#324840] mb-1">Program Level</label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full px-3 py-2 border border-[#BFCDC8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] bg-white"
            >
              {PROGRAM_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-[#324840] mb-2">
              Annual Intake (Entrants per Year)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {yearsList.map((yr, idx) => (
                <div key={yr}>
                  <span className="block text-center text-xs font-medium text-[#52665F] mb-1">
                    {yr}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={years[idx]}
                    onChange={(e) => handleYearChange(idx, e.target.value)}
                    className="w-full px-2 py-1.5 border border-[#BFCDC8] rounded-md text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#6A8077]">
              Changing values here synchronizes matching records in the Data ledger, preserving gender proportions.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E3ECE7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#C5D8CF] text-[#283C35] rounded-lg hover:bg-[#F2F7F4] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0F4C3A] text-white rounded-lg hover:bg-[#1A5C49] font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              Save Department
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
