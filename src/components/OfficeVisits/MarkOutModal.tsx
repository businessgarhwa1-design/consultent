import React, { useState, useEffect } from 'react';
import { X, LogOut, Clock, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { OfficeVisit, User } from '../../types';

interface MarkOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: OfficeVisit | null;
  currentUser: User;
  onConfirmOut: (id: number, outTime: string, outRemark?: string) => void;
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

export const MarkOutModal: React.FC<MarkOutModalProps> = ({
  isOpen,
  onClose,
  visit,
  currentUser,
  onConfirmOut,
}) => {
  const [outTime, setOutTime] = useState(getCurrentTime12Hour());
  const [outRemark, setOutRemark] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setOutTime(getCurrentTime12Hour());
      setOutRemark('');
      setError('');
    }
  }, [isOpen, visit]);

  if (!isOpen || !visit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outTime.trim()) {
      setError('Please provide OUT departure time.');
      return;
    }
    onConfirmOut(visit.id, outTime.trim(), outRemark.trim());
    onClose();
  };

  return (
    <div
      id="mark-out-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div
        id="mark-out-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden transition-all"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Mark Visitor OUT</h3>
              <p className="text-[11px] text-slate-300">Record departure & completion note</p>
            </div>
          </div>
          <button
            id="close-mark-out-modal-btn"
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

          {/* Visitor Brief info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="text-xs font-bold text-slate-900">{visit.firm_name || visit.client_name}</div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Visitor: {visit.client_name} &bull; Mob: {visit.mobile}</span>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-100/80 px-1.5 py-0.5 rounded text-[10px]">
                IN: {visit.in_time}
              </span>
            </div>
            <div className="text-[11px] text-blue-700 font-medium pt-1 border-t border-slate-200/60">
              Purpose: {visit.purpose}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Departure Time (OUT) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                id="mark-out-time-input"
                required
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                placeholder="e.g. 11:45 AM"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Exit Remark / Work Completed Note (Optional)
            </label>
            <div className="relative">
              <MessageSquare className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <textarea
                id="mark-out-remark-textarea"
                rows={2}
                placeholder="e.g. Discussion finished. Signed acknowledgment handed over to client..."
                value={outRemark}
                onChange={(e) => setOutRemark(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-100 p-2.5 rounded-lg flex items-center justify-between">
            <span>OUT Marked By:</span>
            <strong className="text-slate-800">{currentUser.name}</strong>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              id="cancel-mark-out-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-mark-out-btn"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Visitor OUT</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
