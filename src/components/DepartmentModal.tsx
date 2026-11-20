import React, { useState, useEffect, useMemo } from 'react';
import { DepartmentSummary } from '../types';
import { PROGRAM_LEVELS, YEARS } from '../data/analytics';
import { X, Check, Plus } from 'lucide-react';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentSummary | null;
  activeYears?: number[];
  onSave: (
    name: string,
    program: string,
    years: number[],
    oldDept?: { name: string; program: string },
    customYearsList?: number[]
  ) => void;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  department,
  activeYears,
  onSave
}) => {
  const baseYearsList = useMemo(
    () =>
      activeYears && activeYears.length > 0
        ? Array.from(new Set(activeYears)).sort((a, b) => a - b)
        : ([...YEARS] as number[]),
    [activeYears]
  );

  const [yearsList, setYearsList] = useState<number[]>(baseYearsList);
  const [newYearInput, setNewYearInput] = useState<string>('');
  const [name, setName] = useState('');
  const [program, setProgram] = useState<string>(PROGRAM_LEVELS[0]);
  const [years, setYears] = useState<string[]>(() => baseYearsList.map(() => '0'));
  const [error, setError] = useState('');

  useEffect(() => {
    setYearsList(baseYearsList);
    if (department) {
      setName(department.department);
      setProgram(department.program);
      setYears(baseYearsList.map((_, i) => String(department.years[i] || 0)));
    } else {
      setName('');
      setProgram(PROGRAM_LEVELS[0]);
      setYears(baseYearsList.map(() => '0'));
    }
    setNewYearInput('');
    setError('');
  }, [department, isOpen, baseYearsList]);

  if (!isOpen) return null;

  const handleAddYear = () => {
    setError('');
    const parsedYr = parseInt(newYearInput.trim(), 10);
    if (isNaN(parsedYr) || parsedYr < 1900 || parsedYr > 2200) {
      setError('Enter a valid academic year between 1900 and 2200 (e.g. 2019).');
      return;
    }
    if (yearsList.includes(parsedYr)) {
      setError(`Year ${parsedYr} is already listed.`);
      return;
    }

    const pairs = yearsList.map((yr, idx) => ({ yr, val: years[idx] || '0' }));
    pairs.push({ yr: parsedYr, val: '0' });
    pairs.sort((a, b) => a.yr - b.yr);

    setYearsList(pairs.map((p) => p.yr));
    setYears(pairs.map((p) => p.val));
    setNewYearInput('');
  };

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
      department ? { name: department.department, program: department.program } : undefined,
      yearsList
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
      <div className="bg-white dark:bg-[#16221F] text-[#17262B] dark:text-[#E7EFEC] rounded-xl shadow-2xl border border-[#C5D8CF] dark:border-[#2C413A] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0F4C3A] text-white">
          <h2 id="dept-modal-title" className="text-lg font-serif font-bold tracking-tight">
            {department ? 'Edit Department Intake' : 'Add New Department Program'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#9CC7B7] hover:text-white transition-colors p-1 rounded-md cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
              Department Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Accounting, Computer Science, Public Health"
              className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC] mb-1">
              Program Level
            </label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full px-3 py-2 border border-[#BFCDC8] dark:border-[#354C45] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A526] bg-white dark:bg-[#101A17]"
            >
              {PROGRAM_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-[#324840] dark:text-[#CFE6DC]">
                Annual Intake (Entrants per Year)
              </label>

              {/* Inline Add New Academic Year Control */}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1900"
                  max="2200"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddYear();
                    }
                  }}
                  placeholder={String((yearsList[yearsList.length - 1] || 2018) + 1)}
                  className="w-20 px-2 py-1 text-xs border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#E0A526]"
                />
                <button
                  type="button"
                  onClick={handleAddYear}
                  className="px-2 py-1 text-[11px] font-bold bg-[#EFF6F3] dark:bg-white/10 hover:bg-[#E0A526] hover:text-[#221702] text-[#0F4C3A] dark:text-[#A9D3C2] border border-[#BFCDC8] dark:border-white/15 rounded inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Year</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {yearsList.map((yr, idx) => (
                <div key={yr}>
                  <span className="block text-center text-xs font-medium text-[#52665F] dark:text-[#9DB0AA] mb-1">
                    {yr}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={years[idx] ?? '0'}
                    onChange={(e) => handleYearChange(idx, e.target.value)}
                    className="w-full px-2 py-1.5 border border-[#BFCDC8] dark:border-[#354C45] bg-white dark:bg-[#101A17] rounded-md text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#E0A526]"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-[#6A8077] dark:text-[#9DB0AA]">
              New years added here automatically appear in All Years filters, tables, charts, and totals.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E3ECE7] dark:border-white/10">
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
              Save Department
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
