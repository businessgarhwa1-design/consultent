import React, { useState, useMemo } from 'react';
import { OfficeVisit, Client, FinancialYear, User, AppSettings } from '../../types';
import {
  ClipboardList,
  Search,
  Plus,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileDown,
  X,
  Send,
  Building,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { generateOfficeVisitPDF } from '../OfficeVisits/OfficeVisitPdfReport';

interface StaffMobileVisitsProps {
  visits: OfficeVisit[];
  clients: Client[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  selectedMonth: string;
  users: User[];
  currentUser: User;
  settings?: AppSettings;
  onAddVisit: (visitData: Omit<OfficeVisit, 'id' | 'created_at' | 'updated_at' | 'remarks_log'>) => {
    success: boolean;
    error?: string;
  };
  onMarkVisitOut: (visitId: number, outTime: string, finalRemark?: string) => {
    success: boolean;
    error?: string;
  };
  onAddVisitNote: (visitId: number, note: string) => {
    success: boolean;
    error?: string;
  };
}

export const StaffMobileVisits: React.FC<StaffMobileVisitsProps> = ({
  visits,
  clients,
  financialYears,
  selectedFY,
  selectedMonth,
  users,
  currentUser,
  settings,
  onAddVisit,
  onMarkVisitOut,
  onAddVisitNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'IN' | 'OUT'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [noteModalVisit, setNoteModalVisit] = useState<OfficeVisit | null>(null);
  const [noteText, setNoteText] = useState('');

  // Add Visit Form State
  const [visitorType, setVisitorType] = useState<'registered' | 'new'>('registered');
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [visitorName, setVisitorName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gstin, setGstin] = useState('');
  const [fileNumber, setFileNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [currentRemark, setCurrentRemark] = useState('');
  const [inTime, setInTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  const inOfficeCount = visits.filter((v) => v.status === 'IN').length;

  // Filtered visits
  const filteredVisits = useMemo(() => {
    let list = [...visits];

    if (filterStatus !== 'all') {
      list = list.filter((v) => v.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (v) =>
          v.client_name.toLowerCase().includes(q) ||
          v.firm_name.toLowerCase().includes(q) ||
          v.mobile.includes(q) ||
          v.purpose.toLowerCase().includes(q) ||
          (v.file_number && v.file_number.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [visits, filterStatus, searchQuery]);

  // When registered client selected, autofill
  const handleClientSelect = (clientIdNum: number) => {
    setSelectedClientId(clientIdNum);
    const client = clients.find((c) => c.id === clientIdNum);
    if (client) {
      setVisitorName(client.client_name);
      setFirmName(client.firm_name);
      setMobile(client.mobile);
      setGstin(client.gstin);
      setFileNumber(client.file_no || '');
    }
  };

  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];

    onAddVisit({
      visitor_type: visitorType,
      client_id: visitorType === 'registered' && typeof selectedClientId === 'number' ? selectedClientId : null,
      client_name: visitorName.trim(),
      firm_name: firmName.trim() || 'General Visitor',
      gst_number: gstin.trim() || 'N/A',
      file_number: fileNumber.trim() || 'N/A',
      mobile: mobile.trim() || 'N/A',
      client_type: 'Normal',
      purpose: purpose.trim() || 'GST Consultation',
      currentRemark: currentRemark.trim() || 'Visitor checked in',
      visit_date: todayStr,
      financial_year_id: selectedFY.id,
      month: selectedMonth,
      in_time: inTime,
      out_time: null,
      status: 'IN',
      entry_by_id: currentUser.id,
      entry_by_name: currentUser.name,
      out_marked_by_id: null,
      out_marked_by_name: null,
      updated_by_id: currentUser.id,
      updated_by_name: currentUser.name,
    });

    setShowAddModal(false);
    // Reset form
    setVisitorName('');
    setFirmName('');
    setMobile('');
    setGstin('');
    setFileNumber('');
    setPurpose('');
    setCurrentRemark('');
    setSelectedClientId('');
  };

  const handleMarkOut = (visit: OfficeVisit) => {
    const nowTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    onMarkVisitOut(visit.id, nowTime, 'Client completed consultation and left.');
  };

  const handleSaveNote = () => {
    if (!noteModalVisit || !noteText.trim()) return;
    onAddVisitNote(noteModalVisit.id, noteText.trim());
    setNoteModalVisit(null);
    setNoteText('');
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Top Header Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Office Client Entry</h1>
            <p className="text-[11px] text-slate-500 font-semibold">
              Active Visitors IN: <span className="font-bold text-indigo-600">{inOfficeCount}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                generateOfficeVisitPDF(filteredVisits, selectedFY, selectedMonth, settings)
              }
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 shadow-2xs transition-all cursor-pointer"
              title="Print Visits PDF"
            >
              <FileDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search visitor, firm, mobile..."
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-8 py-2 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`flex-1 py-1.5 rounded-xl text-center transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({visits.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('IN')}
            className={`flex-1 py-1.5 rounded-xl text-center transition-all cursor-pointer ${
              filterStatus === 'IN'
                ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            IN Office ({inOfficeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('OUT')}
            className={`flex-1 py-1.5 rounded-xl text-center transition-all cursor-pointer ${
              filterStatus === 'OUT'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            OUT ({visits.length - inOfficeCount})
          </button>
        </div>
      </div>

      {/* Visits List */}
      {filteredVisits.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <ClipboardList className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="text-xs font-bold text-slate-800">No Visitor Entries Found</div>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Tap the "+ New Entry" button to log an office visitor.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredVisits.map((visit) => {
            const isIN = visit.status === 'IN';

            return (
              <div
                key={visit.id}
                className={`bg-white p-3.5 rounded-2xl border transition-all shadow-2xs space-y-2 ${
                  isIN ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-200'
                }`}
              >
                {/* Header: Visitor name & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-slate-900 leading-tight">
                      {visit.client_name}
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                      {visit.firm_name}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                      isIN
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isIN ? '● IN OFFICE' : '✓ OUT'}
                  </span>
                </div>

                {/* In/Out Time & Purpose */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-600" />
                      <span>IN: <strong className="text-slate-900">{visit.in_time}</strong></span>
                    </span>
                    {visit.out_time && (
                      <span className="text-slate-500">
                        OUT: <strong className="text-slate-900">{visit.out_time}</strong>
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600">
                    <span className="font-bold text-slate-700">Purpose: </span>
                    <span>{visit.purpose}</span>
                  </div>
                  {visit.current_remark && (
                    <div className="text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-600">Note: </span>
                      <span>{visit.current_remark}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  {visit.mobile && visit.mobile !== 'N/A' ? (
                    <a
                      href={`tel:${visit.mobile}`}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{visit.mobile}</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400">No phone</span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNoteModalVisit(visit);
                        setNoteText('');
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      Add Note
                    </button>

                    {isIN && (
                      <button
                        type="button"
                        onClick={() => handleMarkOut(visit)}
                        className="flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Mark OUT</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Visit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-black text-slate-900">New Office Visitor Entry</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="space-y-3">
              {/* Registered vs New Visitor Toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setVisitorType('registered')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    visitorType === 'registered' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600'
                  }`}
                >
                  Existing Client
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisitorType('new');
                    setSelectedClientId('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    visitorType === 'new' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600'
                  }`}
                >
                  New Visitor / Inquiry
                </button>
              </div>

              {/* Client Select dropdown if registered */}
              {visitorType === 'registered' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Select Client:
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientSelect(Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Registered Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firm_name} ({c.client_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Visitor Name *:
                </label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Visitor / Contact Person Name"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Firm / Business Name:
                </label>
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Business / Enterprise Name"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Mobile Number:
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    IN Time:
                  </label>
                  <input
                    type="text"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Purpose of Visit *:
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. GST Filing, Notice Response, Bill Submission"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Initial Remark:
                </label>
                <input
                  type="text"
                  value={currentRemark}
                  onChange={(e) => setCurrentRemark(e.target.value)}
                  placeholder="Additional notes, documents brought..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Entry (IN OFFICE)
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {noteModalVisit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold text-slate-900">
                Add Note for {noteModalVisit.client_name}
              </h3>
              <button
                type="button"
                onClick={() => setNoteModalVisit(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter consultation summary, documents collected..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveNote}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Save Note
              </button>
              <button
                type="button"
                onClick={() => setNoteModalVisit(null)}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
