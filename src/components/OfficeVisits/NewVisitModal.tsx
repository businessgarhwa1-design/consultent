import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  UserCheck,
  UserPlus,
  Search,
  Clock,
  Calendar,
  FileText,
  Phone,
  Tag,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { Client, FinancialYear, OfficeVisit, User, VISIT_PURPOSES, VisitorType } from '../../types';

interface NewVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: Omit<
      OfficeVisit,
      'id' | 'created_at' | 'updated_at' | 'updated_by_id' | 'updated_by_name' | 'remarks_log'
    > & { initial_note?: string }
  ) => { success: boolean; visit?: OfficeVisit; error?: string };
  clients: Client[];
  currentUser: User;
  selectedFY: FinancialYear;
  selectedMonth: string;
  prefillClient?: Client | null;
  existingVisits?: OfficeVisit[];
}

function getCurrentTime12Hour(): string {
  try {
    const d = new Date();
    return d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    const d = new Date();
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minStr} ${ampm}`;
  }
}

function getTodayISTDate(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export const NewVisitModal: React.FC<NewVisitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clients,
  currentUser,
  selectedFY,
  selectedMonth,
  prefillClient,
  existingVisits = [],
}) => {
  const [visitorType, setVisitorType] = useState<VisitorType>('registered');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(prefillClient || null);

  // Form Fields
  const [firmName, setFirmName] = useState('');
  const [clientName, setClientName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fileNumber, setFileNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [clientType, setClientType] = useState('Normal');
  const [purpose, setPurpose] = useState<string>(VISIT_PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState('');
  const [initialNote, setInitialNote] = useState('');
  const [visitDate, setVisitDate] = useState(getTodayISTDate());
  const [inTime, setInTime] = useState(getCurrentTime12Hour());
  const [error, setError] = useState('');

  // Reset or pre-fill on open
  useEffect(() => {
    if (isOpen) {
      setError('');
      setVisitDate(getTodayISTDate());
      setInTime(getCurrentTime12Hour());
      if (prefillClient) {
        setVisitorType('registered');
        selectClient(prefillClient);
      } else {
        setVisitorType('registered');
        setClientSearch('');
        setSelectedClient(null);
        setFirmName('');
        setClientName('');
        setGstNumber('');
        setFileNumber('');
        setMobile('');
        setAlternateMobile('');
        setClientType('Normal');
        setPurpose(VISIT_PURPOSES[0]);
        setCustomPurpose('');
        setInitialNote('');
      }
    }
  }, [isOpen, prefillClient]);

  const selectClient = (c: Client) => {
    setSelectedClient(c);
    setFirmName(c.firm_name);
    setClientName(c.client_name);
    setGstNumber(c.gstin);
    setMobile(c.mobile || '');
    setAlternateMobile(c.alternate_mobile || '');
    setClientType(
      c.gst_type === 'composition'
        ? 'Composition'
        : c.gst_type === 'qrmp'
        ? 'QRMP'
        : 'Normal'
    );
    setFileNumber(`FILE-GST-${c.id}`);
    setClientSearch('');
  };

  // Filter clients for dropdown
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 10);
    const q = clientSearch.toLowerCase().trim();
    return clients.filter(
      (c) =>
        c.firm_name.toLowerCase().includes(q) ||
        c.client_name.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.alternate_mobile && c.alternate_mobile.includes(q))
    );
  }, [clients, clientSearch]);

  // Check if mobile previously visited (helpful insight)
  const previousVisitsForMobile = useMemo(() => {
    const clean = mobile.replace(/\D/g, '');
    if (clean.length < 10) return [];
    return existingVisits.filter((v) => v.mobile.replace(/\D/g, '') === clean);
  }, [mobile, existingVisits]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalPurpose = purpose === 'Other Office Service' && customPurpose.trim()
      ? customPurpose.trim()
      : purpose;

    if (visitorType === 'registered') {
      if (!selectedClient && !firmName.trim()) {
        setError('Please search & select a registered client from the list.');
        return;
      }
    } else {
      if (!clientName.trim() && !firmName.trim()) {
        setError('Please enter Visitor Name or Business/Firm Name.');
        return;
      }
    }

    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      setError('Please provide a valid 10-digit mobile number.');
      return;
    }

    const payload: Omit<
      OfficeVisit,
      'id' | 'created_at' | 'updated_at' | 'updated_by_id' | 'updated_by_name' | 'remarks_log'
    > & { initial_note?: string } = {
      visitor_type: visitorType,
      client_id: visitorType === 'registered' && selectedClient ? selectedClient.id : null,
      client_name: clientName.trim() || (selectedClient ? selectedClient.client_name : firmName.trim()),
      firm_name: firmName.trim() || (selectedClient ? selectedClient.firm_name : clientName.trim()),
      gst_number: gstNumber.trim() || (selectedClient ? selectedClient.gstin : 'N/A'),
      file_number: fileNumber.trim() || (selectedClient ? `FILE-GST-${selectedClient.id}` : 'VISIT-REF'),
      mobile: mobile.trim(),
      alternate_mobile: alternateMobile.trim(),
      client_type: visitorType === 'registered' ? clientType : 'Non-Registered',
      purpose: finalPurpose,
      current_remark: initialNote.trim() || `Marked IN for ${finalPurpose}`,
      visit_date: visitDate,
      financial_year_id: selectedFY.id,
      financial_year_name: selectedFY.display_name,
      month: selectedMonth,
      in_time: inTime.trim() || getCurrentTime12Hour(),
      out_time: null,
      status: 'IN',
      entry_by_id: currentUser.id,
      entry_by_name: currentUser.name,
      out_marked_by_id: null,
      out_marked_by_name: null,
      initial_note: initialNote.trim(),
    };

    const res = onSave(payload);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to save office visit entry.');
    }
  };

  return (
    <div
      id="new-visit-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="new-visit-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-6 transition-all"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/90 text-white flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                New Office Client Entry / Mark IN
              </h2>
              <p className="text-xs text-slate-300">
                Log visitor arrival &bull; Period: {selectedMonth} ({selectedFY.display_name})
              </p>
            </div>
          </div>
          <button
            id="close-new-visit-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visitor Type Selector Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            id="tab-registered-client"
            onClick={() => {
              setVisitorType('registered');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              visitorType === 'registered'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>A. REGISTERED CLIENT (Existing GST Account)</span>
          </button>

          <button
            type="button"
            id="tab-new-visitor"
            onClick={() => {
              setVisitorType('new');
              setSelectedClient(null);
              setClientType('Non-Registered');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              visitorType === 'new'
                ? 'bg-white text-amber-800 shadow-xs border border-amber-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>B. NEW / NON-REGISTERED VISITOR</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* REGISTERED CLIENT SEARCH SECTION */}
          {visitorType === 'registered' && (
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Search Existing Registered Client:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  id="search-client-input"
                  placeholder="Type Firm Name, GSTIN, Contact Person, or Mobile..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Instant Search Results */}
              {clientSearch.trim() && (
                <div className="max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-md divide-y divide-slate-100">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => selectClient(c)}
                        className="w-full text-left p-2.5 hover:bg-blue-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{c.firm_name}</div>
                          <div className="text-[11px] text-slate-500">
                            {c.client_name} &bull; Mob: {c.mobile}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[11px] text-blue-600 font-semibold">
                            {c.gstin}
                          </span>
                          <div className="text-[10px] text-slate-400 uppercase">{c.gst_type}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching registered client found.
                    </div>
                  )}
                </div>
              )}

              {/* Selected Client Card */}
              {selectedClient && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-950">
                        {selectedClient.firm_name}
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        {selectedClient.client_name} &bull; GSTIN: {selectedClient.gstin}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setFirmName('');
                      setClientName('');
                      setGstNumber('');
                      setMobile('');
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 underline ml-2"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CLIENT & FIRM DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Client / Firm / Business Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  id="visit-firm-name-input"
                  required
                  placeholder="e.g. Apex Traders Pvt Ltd"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Visitor / Contact Person Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  id="visit-client-name-input"
                  required
                  placeholder="e.g. Rajesh Nair"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GST Number {visitorType === 'registered' && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                id="visit-gst-input"
                placeholder={visitorType === 'registered' ? '15-Digit GSTIN' : 'N/A'}
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Client Scheme / Type
              </label>
              <select
                id="visit-client-type-select"
                value={clientType}
                onChange={(e) => setClientType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-medium"
              >
                <option value="Normal">Normal / Regular</option>
                <option value="Composition">Composition Scheme</option>
                <option value="QRMP">QRMP Scheme</option>
                <option value="Non-Registered">Non-Registered Visitor</option>
                <option value="Other">Other / Individual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                File / Folio / Ref Number
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  id="visit-file-number-input"
                  placeholder="e.g. FILE-101 / RACK-B2"
                  value={fileNumber}
                  onChange={(e) => setFileNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  id="visit-mobile-input"
                  required
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
                />
              </div>
              {previousVisitsForMobile.length > 0 && (
                <div className="mt-1 text-[11px] text-amber-700 font-medium flex items-center gap-1">
                  <span>ℹ️ Visited {previousVisitsForMobile.length} time(s) before in office.</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alternate Mobile (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  id="visit-alt-mobile-input"
                  placeholder="Optional alternate contact"
                  maxLength={10}
                  value={alternateMobile}
                  onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* PURPOSE & REASON */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Purpose / Reason for Visit <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <select
                id="visit-purpose-select"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-medium"
              >
                {VISIT_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {purpose === 'Other Office Service' && (
              <input
                type="text"
                id="visit-custom-purpose-input"
                placeholder="Specify exact purpose / service..."
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            )}
          </div>

          {/* INITIAL REMARK / RUNNING NOTE */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Initial Remark / Meeting Note <span className="text-slate-400 font-normal">(Recorded in activity timeline)</span>
            </label>
            <div className="relative">
              <MessageSquare className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <textarea
                id="visit-remark-textarea"
                rows={2}
                placeholder="e.g. Submitted purchase bills & bank statement for August reconciliation..."
                value={initialNote}
                onChange={(e) => setInitialNote(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* DATE & TIME & STAFF DETAILS */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Visit Date (IST)
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  id="visit-date-input"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                IN Time (Arrival)
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                <input
                  type="text"
                  id="visit-in-time-input"
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                  placeholder="e.g. 10:30 AM"
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Entry Logged By (Staff)
              </label>
              <input
                type="text"
                disabled
                value={currentUser.name}
                className="w-full px-2.5 py-1.5 bg-slate-200/80 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              id="cancel-new-visit-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              id="save-new-visit-btn"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark IN & Save Visit Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
