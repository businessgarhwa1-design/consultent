import React, { useMemo } from 'react';
import {
  Client,
  FinancialYear,
  OfficeVisit,
} from '../../types';
import { GSTStorage } from '../../utils/storage';
import {
  Building2,
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  MapPin,
  FileCheck,
} from 'lucide-react';

interface ActiveClientOfficeVisitsProps {
  client: Client;
  financialYear: FinancialYear;
  selectedMonth: string; // 'All' | 'April' | ... | 'March'
  officeVisits?: OfficeVisit[];
  onSelectMonth?: (month: string) => void;
}

export const ActiveClientOfficeVisits: React.FC<ActiveClientOfficeVisitsProps> = ({
  client,
  financialYear,
  selectedMonth,
  officeVisits: propOfficeVisits,
}) => {
  // Query all visits from prop or GSTStorage
  const allVisits = useMemo(() => {
    if (propOfficeVisits && propOfficeVisits.length > 0) {
      return propOfficeVisits;
    }
    return GSTStorage.getOfficeVisits();
  }, [propOfficeVisits]);

  // Filter STRICTLY by active client_id
  const clientVisits = useMemo(() => {
    return allVisits.filter((v) => v.client_id === client.id);
  }, [allVisits, client.id]);

  // Filter by selected FY
  const fyVisits = useMemo(() => {
    return clientVisits.filter((v) => {
      if (v.financial_year_id && v.financial_year_id === financialYear.id) {
        return true;
      }
      if (v.visit_date) {
        const year = parseInt(v.visit_date.slice(0, 4), 10);
        const monthNum = parseInt(v.visit_date.slice(5, 7), 10);
        const fyYear = monthNum >= 4 ? year : year - 1;
        if (fyYear === financialYear.start_year) return true;
      }
      return false;
    });
  }, [clientVisits, financialYear]);

  // Filter by selected month
  const filteredVisits = useMemo(() => {
    if (selectedMonth === 'All') return fyVisits;
    return fyVisits.filter(
      (v) => v.month && v.month.toLowerCase() === selectedMonth.toLowerCase()
    );
  }, [fyVisits, selectedMonth]);

  // Sort visits newest first
  const sortedVisits = useMemo(() => {
    return [...filteredVisits].sort((a, b) => {
      const dateA = a.visit_date || a.created_at || '';
      const dateB = b.visit_date || b.created_at || '';
      return dateB.localeCompare(dateA);
    });
  }, [filteredVisits]);

  // Statistics
  const totalVisitsCount = filteredVisits.length;
  const inOfficeCount = filteredVisits.filter((v) => v.status === 'IN').length;
  const completedCount = filteredVisits.filter((v) => v.status === 'OUT').length;
  const lastVisit = sortedVisits[0] || null;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Client
            </span>
            <span className="text-sm font-extrabold text-slate-900 truncate block mt-0.5" title={client.firm_name}>
              {client.firm_name}
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-semibold">
              {client.file_no ? `File #${client.file_no}` : client.gstin}
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {selectedMonth === 'All' ? 'Total Visits (FY)' : `Total Visits (${selectedMonth})`}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{totalVisitsCount}</span>
              <span className="text-xs text-slate-500 font-semibold">time(s) visited</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">
              {selectedMonth === 'All' ? `Across FY ${financialYear.display_name}` : `In ${selectedMonth} ${financialYear.display_name}`}
            </span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Visit Status Breakdown
            </span>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-slate-800">{completedCount}</span>
                <span className="text-slate-400 text-[11px]">Completed</span>
              </div>
              {inOfficeCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="font-bold text-amber-700">{inOfficeCount}</span>
                  <span className="text-slate-400 text-[11px]">In Office</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Annual FY Visits: <strong>{fyVisits.length}</strong>
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
              Last Visit Recorded
            </span>
            <span className="text-sm font-extrabold text-white block mt-0.5 truncate">
              {lastVisit ? lastVisit.visit_date : 'No Visits Recorded'}
            </span>
            <span className="text-[10px] text-indigo-200/80 font-medium truncate block">
              {lastVisit ? `${lastVisit.in_time} • ${lastVisit.purpose}` : 'N/A'}
            </span>
          </div>
          <div className="p-2.5 bg-white/10 text-white rounded-xl border border-white/15">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Office Client Entry / Visit Log Table */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Office Client Entry Report (Visits Log)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Client office में कितनी बार आया है: <strong>{totalVisitsCount} record(s)</strong> found for{' '}
              <strong className="text-slate-700">{client.firm_name}</strong>
              {selectedMonth !== 'All' ? ` in ${selectedMonth}` : ` in FY ${financialYear.display_name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
              {client.file_no ? `File #${client.file_no}` : client.gstin}
            </span>
          </div>
        </div>

        {sortedVisits.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-800">
              No Office Visits Found
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Active Client <strong>{client.firm_name}</strong> did not record any office entries in{' '}
              {selectedMonth !== 'All' ? selectedMonth : `FY ${financialYear.display_name}`}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 whitespace-nowrap">#</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Visit Date</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Timing</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Visitor / Contact</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Purpose of Visit</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Attended By</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap min-w-[180px]">Latest Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedVisits.map((v, index) => {
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{v.visit_date}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal ml-5">
                          {v.month}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-slate-800">{v.in_time || '—'}</span>
                        </div>
                        {v.out_time && (
                          <div className="text-[10px] text-slate-400 ml-4">
                            Out: {v.out_time}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{v.client_name || client.client_name || 'Visitor'}</div>
                        {v.mobile && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{v.mobile}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100">
                          {v.purpose || 'General Consultation'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                        {v.entry_by_name || 'Staff User'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {v.status === 'IN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            IN OFFICE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <CheckCircle2 className="w-3 h-3 text-slate-500" />
                            OUT
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {v.current_remark ? (
                          <span className="text-slate-800">{v.current_remark}</span>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
