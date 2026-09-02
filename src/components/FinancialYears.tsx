import React, { useState, useMemo } from 'react';
import { FinancialYear, MonthlyWork } from '../types';
import { Calendar, Plus, CheckCircle2, ShieldCheck, Database, Layers, ArrowUpDown, Search, Filter } from 'lucide-react';

interface FinancialYearsProps {
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  onSelectFY: (fy: FinancialYear) => void;
  onAddFY: (startYear: number) => { success: boolean; error?: string };
  monthlyWork: MonthlyWork[];
  fySortOrder?: 'asc' | 'desc';
  onToggleFYSortOrder?: () => void;
}

export const FinancialYears: React.FC<FinancialYearsProps> = ({
  financialYears,
  selectedFY,
  onSelectFY,
  onAddFY,
  monthlyWork,
  fySortOrder = 'asc',
  onToggleFYSortOrder,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [startYear, setStartYear] = useState(2027);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSortOrder, setLocalSortOrder] = useState<'asc' | 'desc'>(fySortOrder);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const res = onAddFY(startYear);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to add financial year.');
    } else {
      setSuccessMessage(`Financial Year ${startYear}-${String(startYear + 1).slice(2)} created successfully!`);
      setShowAddForm(false);
    }
  };

  const handleToggleSort = () => {
    if (onToggleFYSortOrder) {
      onToggleFYSortOrder();
    }
    setLocalSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const effectiveOrder = onToggleFYSortOrder ? fySortOrder : localSortOrder;

  const sortedAndFilteredFYs = useMemo(() => {
    let list = [...financialYears];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (f) =>
          f.display_name.toLowerCase().includes(q) ||
          String(f.start_year).includes(q) ||
          String(f.end_year).includes(q)
      );
    }
    return list.sort((a, b) =>
      effectiveOrder === 'desc' ? b.start_year - a.start_year : a.start_year - b.start_year
    );
  }, [financialYears, searchTerm, effectiveOrder]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Financial Year (FY) Architecture</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Each Financial Year represents a completely independent 12-month compliance cycle.
            Master clients remain permanently linked, while monthly status and remarks are isolated per FY.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Financial Year</span>
        </button>
      </div>

      {/* Architecture Explainer Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 text-xs text-blue-950">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-blue-900 mb-1">
              How Database Isolation Works in this Portal
            </h4>
            <p className="text-blue-800 leading-relaxed">
              In accordance with GST compliance guidelines, your client records (GSTIN, trade name, contact info) are stored in the <code className="bg-white px-1.5 py-0.5 rounded font-mono text-blue-900 border border-blue-200">clients</code> table.
              Every monthly status update creates or updates a record in <code className="bg-white px-1.5 py-0.5 rounded font-mono text-blue-900 border border-blue-200">monthly_work</code> bound to the unique <code className="bg-white px-1.5 py-0.5 rounded font-mono text-blue-900 border border-blue-200">financial_year_id</code> and <code className="bg-white px-1.5 py-0.5 rounded font-mono text-blue-900 border border-blue-200">month</code>.
              This guarantees that previous years' records are preserved forever without cluttering your new year workspace.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Add FY Modal/Form */}
      {showAddForm && (
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-md">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Create New Financial Year</h3>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Year</label>
              <input
                type="number"
                min={2020}
                max={2040}
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Label</label>
              <div className="font-mono font-bold text-slate-800 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                {startYear}-{String(startYear + 1).slice(2)}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-xs"
              >
                Create FY
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Sorting Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Financial Year (e.g. 2025-26, 2026)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-8 py-2 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Ascending / Descending Order Toggle Button */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Sort Order:</span>
          <button
            type="button"
            id="fy-page-sort-order-toggle-btn"
            onClick={handleToggleSort}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs transition-all cursor-pointer"
            title="Toggle Financial Years Ascending / Descending Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {effectiveOrder === 'desc'
                ? 'Descending (2056 → 2024)'
                : 'Ascending (2024 → 2056)'}
            </span>
          </button>

          <span className="text-xs font-semibold text-slate-500">
            ({sortedAndFilteredFYs.length} FYs)
          </span>
        </div>
      </div>

      {/* FY Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedAndFilteredFYs.map((fy) => {
          const isCurrentSelected = fy.id === selectedFY.id;
          const fyRecordsCount = monthlyWork.filter((m) => m.financial_year_id === fy.id).length;
          const fyCompletedCount = monthlyWork.filter(
            (m) => m.financial_year_id === fy.id && m.status === 'Completed'
          ).length;

          return (
            <div
              key={fy.id}
              className={`bg-white rounded-2xl border p-5 transition-all shadow-2xs ${
                isCurrentSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-base font-black text-slate-900">
                  FY {fy.display_name}
                </span>
                {isCurrentSelected ? (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active Selection</span>
                  </span>
                ) : (
                  <button
                    onClick={() => onSelectFY(fy)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                  >
                    Select this FY
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 space-y-1 mb-4">
                <div>
                  Duration: <strong className="text-slate-700">01 Apr {fy.start_year} – 31 Mar {fy.end_year}</strong>
                </div>
                <div>
                  Work Logged: <strong className="text-slate-700">{fyRecordsCount} monthly records</strong>
                </div>
                <div>
                  Completed Filings: <strong className="text-emerald-600">{fyCompletedCount}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Database ID: #{fy.id}</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Isolated Partition</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
