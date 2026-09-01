import React, { useState, useMemo } from 'react';
import {
  X,
  History,
  Building2,
  Calendar,
  Clock,
  User,
  FileSpreadsheet,
  Printer,
  Plus,
  Phone,
  Tag,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { OfficeVisit, Client, FinancialYear, AppSettings } from '../../types';
import { generateOfficeVisitPDF } from './OfficeVisitPdfReport';

interface VisitHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClient: Client | null;
  targetMobile?: string;
  targetFirmName?: string;
  allVisits: OfficeVisit[];
  selectedFY: FinancialYear;
  selectedMonth: string;
  settings?: AppSettings;
  onOpenNewVisitForClient?: (client: Client) => void;
  onOpenAddNote?: (visit: OfficeVisit) => void;
}

export const VisitHistoryModal: React.FC<VisitHistoryModalProps> = ({
  isOpen,
  onClose,
  targetClient,
  targetMobile,
  targetFirmName,
  allVisits,
  selectedFY,
  selectedMonth,
  settings,
  onOpenNewVisitForClient,
  onOpenAddNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all visits related to this client or mobile or firm
  const clientVisits = useMemo(() => {
    return allVisits.filter((v) => {
      if (targetClient && v.client_id === targetClient.id) return true;
      if (targetMobile && v.mobile.replace(/\D/g, '') === targetMobile.replace(/\D/g, '')) return true;
      if (targetFirmName && v.firm_name.toLowerCase() === targetFirmName.toLowerCase()) return true;
      return false;
    });
  }, [allVisits, targetClient, targetMobile, targetFirmName]);

  const filteredVisits = useMemo(() => {
    if (!searchQuery.trim()) return clientVisits;
    const q = searchQuery.toLowerCase().trim();
    return clientVisits.filter(
      (v) =>
        v.purpose.toLowerCase().includes(q) ||
        v.current_remark.toLowerCase().includes(q) ||
        v.visit_date.includes(q) ||
        v.entry_by_name.toLowerCase().includes(q)
    );
  }, [clientVisits, searchQuery]);

  if (!isOpen) return null;

  const totalVisitsCount = clientVisits.length;
  const inOfficeCount = clientVisits.filter((v) => v.status === 'IN').length;
  const displayName = targetClient ? targetClient.firm_name : targetFirmName || 'Visitor History';
  const contactPerson = targetClient ? targetClient.client_name : (clientVisits[0]?.client_name || 'N/A');
  const gstin = targetClient ? targetClient.gstin : (clientVisits[0]?.gst_number || 'N/A');
  const mobile = targetClient ? targetClient.mobile : (targetMobile || clientVisits[0]?.mobile || 'N/A');
  const fileNo = targetClient ? `FILE-GST-${targetClient.id}` : (clientVisits[0]?.file_number || 'N/A');

  const handleExportCSV = () => {
    if (filteredVisits.length === 0) return;
    const headers = [
      'Visit Date',
      'Client / Firm Name',
      'Contact Person',
      'GSTIN',
      'File No',
      'Mobile',
      'Scheme / Type',
      'Purpose',
      'Latest Remark',
      'IN Time',
      'OUT Time',
      'Status',
      'Entry By',
      'OUT Marked By',
    ];

    const rows = filteredVisits.map((v) => [
      v.visit_date,
      `"${(v.firm_name || '').replace(/"/g, '""')}"`,
      `"${(v.client_name || '').replace(/"/g, '""')}"`,
      v.gst_number || 'N/A',
      v.file_number || 'N/A',
      v.mobile || '',
      v.client_type || '',
      `"${(v.purpose || '').replace(/"/g, '""')}"`,
      `"${(v.current_remark || '').replace(/"/g, '""')}"`,
      v.in_time,
      v.out_time || 'Still IN',
      v.status,
      `"${(v.entry_by_name || '').replace(/"/g, '""')}"`,
      `"${(v.out_marked_by_name || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `office_visits_${displayName.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    generateOfficeVisitPDF(
      filteredVisits,
      selectedFY,
      selectedMonth,
      settings,
      `Client History: ${displayName}`
    );
  };

  return (
    <div
      id="visit-history-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="visit-history-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden my-6 transition-all"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Office Visit History: {displayName}
              </h2>
              <p className="text-xs text-slate-300">
                Complete timeline of visits & meetings in office
              </p>
            </div>
          </div>
          <button
            id="close-visit-history-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Banner */}
        <div className="bg-slate-50 p-5 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Firm / Client</div>
            <div className="text-xs font-bold text-slate-900">{displayName}</div>
            <div className="text-[11px] text-slate-500">Contact: {contactPerson}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">GSTIN & File No</div>
            <div className="text-xs font-mono font-bold text-blue-700">{gstin}</div>
            <div className="text-[11px] text-slate-500">File: {fileNo}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Mobile Contact</div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{mobile}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {targetClient ? 'Registered Client' : 'Visitor Profile'}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
              <div className="text-base font-extrabold text-blue-600">{totalVisitsCount}</div>
              <div className="text-[9px] uppercase font-bold text-slate-400">Total Visits</div>
            </div>
            {inOfficeCount > 0 && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center shadow-xs">
                <div className="text-base font-extrabold text-emerald-600">{inOfficeCount}</div>
                <div className="text-[9px] uppercase font-bold text-emerald-700">Currently IN</div>
              </div>
            )}
          </div>
        </div>

        {/* Action and Search Toolbar */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search within this client's visits by purpose, note, or staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[240px] px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print / PDF</span>
            </button>

            {targetClient && onOpenNewVisitForClient && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewVisitForClient(targetClient);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New Visit</span>
              </button>
            )}
          </div>
        </div>

        {/* Visits Timeline Content */}
        <div className="p-6 max-h-[55vh] overflow-y-auto space-y-4">
          {filteredVisits.length > 0 ? (
            filteredVisits.map((v, idx) => {
              const isIN = v.status === 'IN';
              return (
                <div
                  key={v.id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isIN
                      ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                        {v.visit_date}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          isIN
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isIN ? '🟢 IN OFFICE' : `⚪ OUT (${v.out_time})`}
                      </span>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {v.purpose}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <Clock className="w-3 h-3" />
                        IN: {v.in_time}
                      </span>
                      {v.out_time && (
                        <span className="flex items-center gap-1 text-slate-600">
                          &bull; OUT: {v.out_time}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active Remark */}
                  <div className="text-xs text-slate-800 mb-2 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <strong className="text-slate-600">Summary:</strong> {v.current_remark || 'No remark entered'}
                  </div>

                  {/* Running Notes / Remarks Trail */}
                  {v.remarks_log && v.remarks_log.length > 0 && (
                    <div className="pl-3 border-l-2 border-slate-200 space-y-1.5 my-2">
                      <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Running Activity & Discussion Log ({v.remarks_log.length})
                      </div>
                      {v.remarks_log.map((note) => (
                        <div key={note.id} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                            {note.timestamp.split(' ')[1] || note.timestamp}
                          </span>
                          <span>
                            <strong className="text-slate-800">{note.staff_name}:</strong> {note.note}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Staff Info Footer & Quick Note Button */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <div>
                      Entry by: <strong className="text-slate-600">{v.entry_by_name}</strong>
                      {v.out_marked_by_name && (
                        <span> &bull; Exit by: <strong className="text-slate-600">{v.out_marked_by_name}</strong></span>
                      )}
                    </div>

                    {onOpenAddNote && (
                      <button
                        type="button"
                        onClick={() => onOpenAddNote(v)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                      >
                        + Add Note
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              No visit entries found for this client with the specified filter.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
