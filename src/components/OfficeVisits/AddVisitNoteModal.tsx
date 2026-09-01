import React, { useState } from 'react';
import { X, MessageSquarePlus, Clock, User, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { OfficeVisit } from '../../types';

interface AddVisitNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: OfficeVisit | null;
  onAddNote: (visitId: number, noteText: string) => void;
}

export const AddVisitNoteModal: React.FC<AddVisitNoteModalProps> = ({
  isOpen,
  onClose,
  visit,
  onAddNote,
}) => {
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !visit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) {
      setError('Please enter a note or remark.');
      return;
    }
    onAddNote(visit.id, noteText.trim());
    setNoteText('');
    onClose();
  };

  return (
    <div
      id="add-visit-note-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div
        id="add-visit-note-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden transition-all"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Add Running Note / Remark</h3>
              <p className="text-[11px] text-slate-300">
                {visit.firm_name || visit.client_name} &bull; {visit.visit_date}
              </p>
            </div>
          </div>
          <button
            id="close-add-note-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Previous Running Notes Timeline */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Chronological Activity & Remarks History ({visit.remarks_log?.length || 0})</span>
            </div>

            <div className="max-h-48 overflow-y-auto bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2.5 divide-y divide-slate-200/60">
              {visit.remarks_log && visit.remarks_log.length > 0 ? (
                visit.remarks_log.map((log, idx) => (
                  <div key={log.id || idx} className={`${idx > 0 ? 'pt-2' : ''} text-xs`}>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <User className="w-3 h-3 text-blue-500" />
                        {log.staff_name}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-slate-400">
                        <Clock className="w-3 h-3" />
                        {log.timestamp}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium pl-4 border-l-2 border-blue-400 bg-white/60 p-1.5 rounded-r">
                      {log.note}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-2">No notes recorded yet.</div>
              )}
            </div>
          </div>

          {/* New Note Input */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Add New Note / Follow-up Update:
            </label>
            <textarea
              id="new-note-text-area"
              rows={3}
              required
              placeholder="e.g. Client requested computation draft on WhatsApp, Pooja shared file..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              id="cancel-add-note-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-add-note-btn"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Running Note</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
