import React, { useState, useEffect } from 'react';
import { X, Edit, Building2, UserCheck, Phone, FileText, Tag, MessageSquare, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { OfficeVisit, VISIT_PURPOSES } from '../../types';

interface EditVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: OfficeVisit | null;
  onSave: (
    id: number,
    data: Partial<Omit<OfficeVisit, 'id' | 'created_at' | 'remarks_log'>> & { new_note?: string }
  ) => { success: boolean; visit?: OfficeVisit; error?: string };
}

export const EditVisitModal: React.FC<EditVisitModalProps> = ({
  isOpen,
  onClose,
  visit,
  onSave,
}) => {
  const [firmName, setFirmName] = useState('');
  const [clientName, setClientName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fileNumber, setFileNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [clientType, setClientType] = useState('Normal');
  const [purpose, setPurpose] = useState<string>(VISIT_PURPOSES[0]);
  const [currentRemark, setCurrentRemark] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [status, setStatus] = useState<'IN' | 'OUT'>('IN');
  const [editAuditNote, setEditAuditNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && visit) {
      setFirmName(visit.firm_name || '');
      setClientName(visit.client_name || '');
      setGstNumber(visit.gst_number || '');
      setFileNumber(visit.file_number || '');
      setMobile(visit.mobile || '');
      setAlternateMobile(visit.alternate_mobile || '');
      setClientType(visit.client_type || 'Normal');
      setPurpose(visit.purpose || VISIT_PURPOSES[0]);
      setCurrentRemark(visit.current_remark || '');
      setVisitDate(visit.visit_date || '');
      setInTime(visit.in_time || '');
      setOutTime(visit.out_time || '');
      setStatus(visit.status || 'IN');
      setEditAuditNote('');
      setError('');
    }
  }, [isOpen, visit]);

  if (!isOpen || !visit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firmName.trim() && !clientName.trim()) {
      setError('Please provide Firm Name or Visitor Name.');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      setError('Please provide a valid 10-digit mobile number.');
      return;
    }

    const payload: Partial<Omit<OfficeVisit, 'id' | 'created_at' | 'remarks_log'>> & {
      new_note?: string;
    } = {
      firm_name: firmName.trim(),
      client_name: clientName.trim(),
      gst_number: gstNumber.trim(),
      file_number: fileNumber.trim(),
      mobile: mobile.trim(),
      alternate_mobile: alternateMobile.trim(),
      client_type: clientType,
      purpose,
      current_remark: currentRemark.trim(),
      visit_date: visitDate,
      in_time: inTime.trim(),
      out_time: status === 'OUT' ? (outTime.trim() || '12:00 PM') : null,
      status,
      new_note: editAuditNote.trim()
        ? `[Edited details] ${editAuditNote.trim()}`
        : `Details updated for ${firmName.trim() || clientName.trim()}`,
    };

    const res = onSave(visit.id, payload);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to update visit details.');
    }
  };

  return (
    <div
      id="edit-visit-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="edit-visit-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden my-6 transition-all"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold">
              <Edit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Edit Visit Entry Record</h3>
              <p className="text-[11px] text-slate-300">Modify visit information & status</p>
            </div>
          </div>
          <button
            id="close-edit-visit-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Firm / Business Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Visitor / Contact Person <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GST Number</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Client Scheme</label>
              <select
                value={clientType}
                onChange={(e) => setClientType(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="Normal">Normal / Regular</option>
                <option value="Composition">Composition Scheme</option>
                <option value="QRMP">QRMP Scheme</option>
                <option value="Non-Registered">Non-Registered Visitor</option>
                <option value="Other">Other / Individual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">File / Folio No</label>
              <input
                type="text"
                value={fileNumber}
                onChange={(e) => setFileNumber(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alternate Mobile</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  maxLength={10}
                  value={alternateMobile}
                  onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Purpose of Visit</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium"
            >
              {VISIT_PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Current Active Remark</label>
            <textarea
              rows={2}
              value={currentRemark}
              onChange={(e) => setCurrentRemark(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Timing and Status */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Visit Date</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">IN Time</label>
              <input
                type="text"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'IN' | 'OUT')}
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
              >
                <option value="IN">🟢 IN OFFICE</option>
                <option value="OUT">⚪ OUT (Left)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">OUT Time</label>
              <input
                type="text"
                disabled={status === 'IN'}
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                placeholder={status === 'IN' ? 'Still IN' : 'e.g. 11:45 AM'}
                className="w-full px-2.5 py-1 bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Edit / Modification Note (Logged in History)
            </label>
            <input
              type="text"
              placeholder="e.g. Corrected contact person spelling & file number..."
              value={editAuditNote}
              onChange={(e) => setEditAuditNote(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              id="cancel-edit-visit-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-edit-visit-btn"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Update Visit Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
