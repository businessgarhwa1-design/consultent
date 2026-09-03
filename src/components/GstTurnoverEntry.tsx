import React, { useState, useEffect, useMemo } from 'react';
import {
  Client,
  FinancialYear,
  FY_MONTHS,
  User,
  ClientGstTurnover,
} from '../types';
import { GSTStorage } from '../utils/storage';
import { SupabaseService } from '../utils/supabaseService';
import {
  Calculator,
  Building,
  Calendar,
  Search,
  Save,
  CheckCircle2,
  Table,
  UserCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
  Filter,
  Check,
  RefreshCw,
  Info,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  generateClientReportPDF,
  generateAllClientsGstTurnoverPDF,
  AllClientsGstTurnoverExportData,
} from '../utils/pdfGenerator';

interface GstTurnoverEntryProps {
  clients: Client[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  currentUser: User;
  users: User[];
  initialClientId?: number | null;
  onSelectFY: (fy: FinancialYear) => void;
  onRefresh?: () => void;
}

export const GstTurnoverEntry: React.FC<GstTurnoverEntryProps> = ({
  clients,
  financialYears,
  selectedFY,
  currentUser,
  users,
  initialClientId,
  onSelectFY,
  onRefresh,
}) => {
  // Navigation / View state
  const [viewMode, setViewMode] = useState<'client-entry' | 'all-matrix'>('client-entry');
  const [selectedClientId, setSelectedClientId] = useState<number>(
    initialClientId || (clients.length > 0 ? clients[0].id : 0)
  );

  // Search & Filter for Client Switcher
  const [clientSearch, setClientSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Normal' | 'Composition' | 'QRMP'>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [turnoverStatusFilter, setTurnoverStatusFilter] = useState<'all' | 'with-data' | 'no-data'>('all');

  // 12-Month Input State for active client: { [month]: { taxable: string; exempt: string; remark: string } }
  const [monthlyInputs, setMonthlyInputs] = useState<
    Record<string, { taxable: string; exempt: string; remark: string }>
  >({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // All GST Turnover Records loaded from storage
  const [allGstTurnovers, setAllGstTurnovers] = useState<ClientGstTurnover[]>([]);

  // Load all turnover data on mount or FY change
  const refreshTurnoverData = () => {
    const list = GSTStorage.getGstTurnover();
    setAllGstTurnovers(list);
  };

  useEffect(() => {
    refreshTurnoverData();
    // Fetch live master GST Turnover from Supabase and merge safely
    SupabaseService.fetchGstTurnoverFromSupabase()
      .then((records) => {
        if (records && records.length > 0) {
          const currentLocal = GSTStorage.getGstTurnover();
          const merged = GSTStorage.mergeGstTurnoverLists(currentLocal, records);
          GSTStorage.saveGstTurnoverLocally(merged);
          setAllGstTurnovers(merged);
        }
      })
      .catch((e) => console.warn('Supabase fetch GST turnover notice:', e));
  }, [selectedFY.id]);

  useEffect(() => {
    if (initialClientId && initialClientId !== selectedClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

  // Active client object
  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0] || null;
  }, [clients, selectedClientId]);

  // Active client's staff name
  const getStaffName = (staffId: number | null) => {
    if (!staffId) return 'Unassigned';
    const u = users.find((usr) => usr.id === staffId);
    return u ? u.name : `Staff #${staffId}`;
  };

  // Format currency in Indian format
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumberOnly = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper to normalize client category
  const normalizeCat = (type?: string): 'Normal' | 'Composition' | 'QRMP' => {
    if (!type) return 'Normal';
    const low = type.toLowerCase();
    if (low.includes('comp')) return 'Composition';
    if (low.includes('qrmp')) return 'QRMP';
    return 'Normal';
  };

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Search query filter
      if (clientSearch.trim()) {
        const q = clientSearch.toLowerCase().trim();
        const matchesFirm = c.firm_name.toLowerCase().includes(q);
        const matchesGstin = c.gstin.toLowerCase().includes(q);
        const matchesName = c.client_name.toLowerCase().includes(q);
        const matchesMobile = (c.mobile && c.mobile.includes(q)) || (c.alternate_mobile && c.alternate_mobile.includes(q));
        const matchesFile = c.file_no && c.file_no.toLowerCase().includes(q);
        if (!matchesFirm && !matchesGstin && !matchesName && !matchesMobile && !matchesFile) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (normalizeCat(c.gst_type) !== categoryFilter) return false;
      }

      // Staff filter
      if (staffFilter !== 'all') {
        if (staffFilter === 'unassigned') {
          if (c.assigned_staff_id !== null) return false;
        } else {
          if (c.assigned_staff_id !== Number(staffFilter)) return false;
        }
      }

      // Turnover presence filter
      if (turnoverStatusFilter !== 'all') {
        const clientTurnovers = allGstTurnovers.filter(
          (t) => t.client_id === c.id && t.financial_year_id === selectedFY.id
        );
        const hasData = clientTurnovers.some((t) => (t.taxable_turnover || 0) + (t.exempt_turnover || 0) > 0);
        if (turnoverStatusFilter === 'with-data' && !hasData) return false;
        if (turnoverStatusFilter === 'no-data' && hasData) return false;
      }

      return true;
    });
  }, [clients, clientSearch, categoryFilter, staffFilter, turnoverStatusFilter, allGstTurnovers, selectedFY.id]);

  // Load active client 12-month data into state
  useEffect(() => {
    if (!activeClient) return;

    const turnovers = GSTStorage.getClientGstTurnover(activeClient.id, selectedFY.id);
    const inputs: Record<string, { taxable: string; exempt: string; remark: string }> = {};

    FY_MONTHS.forEach((m) => {
      const record = turnovers.find((t) => t.month === m);
      inputs[m] = {
        taxable: record && record.taxable_turnover > 0 ? String(record.taxable_turnover) : '',
        exempt: record && record.exempt_turnover > 0 ? String(record.exempt_turnover) : '',
        remark: record?.remark || '',
      };
    });

    setMonthlyInputs(inputs);
    setSaveStatus(null);
  }, [activeClient?.id, selectedFY.id, allGstTurnovers]);

  // Handle month field change
  const handleInputChange = (month: string, field: 'taxable' | 'exempt' | 'remark', value: string) => {
    const cleanVal = field === 'remark' ? value : value.replace(/[^0-9.]/g, '');
    setMonthlyInputs((prev) => ({
      ...prev,
      [month]: {
        taxable: prev[month]?.taxable || '',
        exempt: prev[month]?.exempt || '',
        remark: prev[month]?.remark || '',
        [field]: cleanVal,
      },
    }));
    setSaveStatus(null);
  };

  // Compute calculated metrics for active client
  const activeClientCalculations = useMemo(() => {
    let totalTaxable = 0;
    let totalExempt = 0;
    let filledMonthsCount = 0;

    const monthlyBreakdown = FY_MONTHS.map((month) => {
      const tax = parseFloat(monthlyInputs[month]?.taxable || '0') || 0;
      const ex = parseFloat(monthlyInputs[month]?.exempt || '0') || 0;
      const rem = monthlyInputs[month]?.remark || '';
      const tot = tax + ex;

      totalTaxable += tax;
      totalExempt += ex;
      if (tot > 0) filledMonthsCount++;

      return {
        month,
        taxable: tax,
        exempt: ex,
        total: tot,
        remark: rem,
      };
    });

    const grandTotal = totalTaxable + totalExempt;
    const avgMonthly = filledMonthsCount > 0 ? grandTotal / filledMonthsCount : 0;

    // Quarterly subtotals
    const q1 = monthlyBreakdown.slice(0, 3).reduce((acc, cur) => acc + cur.total, 0);
    const q2 = monthlyBreakdown.slice(3, 6).reduce((acc, cur) => acc + cur.total, 0);
    const q3 = monthlyBreakdown.slice(6, 9).reduce((acc, cur) => acc + cur.total, 0);
    const q4 = monthlyBreakdown.slice(9, 12).reduce((acc, cur) => acc + cur.total, 0);

    return {
      monthlyBreakdown,
      totalTaxable,
      totalExempt,
      grandTotal,
      filledMonthsCount,
      avgMonthly,
      quarters: { q1, q2, q3, q4 },
    };
  }, [monthlyInputs]);

  // Save 12-month data for active client
  const handleSaveClientTurnover = async () => {
    if (!activeClient) return;
    setIsSaving(true);
    setSaveStatus(null);

    const monthlyData: Record<string, { taxable: number; exempt: number; remark?: string }> = {};

    FY_MONTHS.forEach((m) => {
      const tax = parseFloat(monthlyInputs[m]?.taxable || '0') || 0;
      const ex = parseFloat(monthlyInputs[m]?.exempt || '0') || 0;
      const rem = monthlyInputs[m]?.remark?.trim() || '';
      monthlyData[m] = { taxable: tax, exempt: ex, remark: rem };
    });

    const result = await GSTStorage.asyncBatchSaveClientGstTurnover(
      activeClient.id,
      selectedFY.id,
      monthlyData
    );

    // Refresh state
    refreshTurnoverData();
    if (onRefresh) onRefresh();

    setIsSaving(false);
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    if (result.success) {
      setSaveStatus(`12-Month GST Turnover saved & synced to Supabase at ${nowTime}!`);
    } else {
      setSaveStatus(`Saved locally. Supabase note: ${result.error || 'Local cache updated'}`);
    }

    // Log Activity
    GSTStorage.logActivity(
      'UPDATE_GST_TURNOVER',
      `Updated 12-Month GST Turnover for ${activeClient.firm_name} (FY ${selectedFY.display_name}) - Total: ${formatINR(activeClientCalculations.grandTotal)}`,
      {
        clientId: activeClient.id,
        firmName: activeClient.firm_name,
        clientName: activeClient.client_name,
        financialYear: selectedFY.display_name,
        userId: currentUser.id,
        userName: currentUser.name,
        module: 'GST Turnover',
      }
    );

    setTimeout(() => {
      setSaveStatus(null);
    }, 4500);
  };

  // Quick Action: Copy to remaining months
  const handleCopyForward = (sourceMonth: string) => {
    const src = monthlyInputs[sourceMonth] || { taxable: '', exempt: '', remark: '' };
    const srcIndex = FY_MONTHS.indexOf(sourceMonth as any);
    if (srcIndex === -1) return;

    setMonthlyInputs((prev) => {
      const updated = { ...prev };
      for (let i = srcIndex + 1; i < FY_MONTHS.length; i++) {
        const m = FY_MONTHS[i];
        updated[m] = {
          taxable: src.taxable,
          exempt: src.exempt,
          remark: src.remark,
        };
      }
      return updated;
    });
    setSaveStatus('Values and remarks copied forward to remaining months. Click Save when done.');
  };

  // Quick Navigation: Next & Previous Client
  const currentClientIndex = filteredClients.findIndex((c) => c.id === selectedClientId);

  const handlePrevClient = () => {
    if (currentClientIndex > 0) {
      setSelectedClientId(filteredClients[currentClientIndex - 1].id);
    }
  };

  const handleNextClient = () => {
    if (currentClientIndex < filteredClients.length - 1) {
      setSelectedClientId(filteredClients[currentClientIndex + 1].id);
    }
  };

  // Export Client 12-Month PDF Report
  const handleExportClientPDF = () => {
    if (!activeClient) return;

    const gstRows = FY_MONTHS.map((m) => {
      const tax = parseFloat(monthlyInputs[m]?.taxable || '0') || 0;
      const ex = parseFloat(monthlyInputs[m]?.exempt || '0') || 0;
      return {
        month: m,
        taxable: tax,
        exempt: ex,
        total: tax + ex,
        remark: monthlyInputs[m]?.remark || '',
      };
    });

    const reportData = {
      client: activeClient,
      financialYear: selectedFY,
      gstRows,
      gstTotals: {
        taxable: activeClientCalculations.totalTaxable,
        exempt: activeClientCalculations.totalExempt,
        total: activeClientCalculations.grandTotal,
      },
      bankAccounts: [],
      totalBankTurnover: 0,
    };

    generateClientReportPDF(reportData, 'gst', 'CA Office GST Turnover System');
  };

  // Export Single Client 12-Month to CSV (Excel)
  const handleExportClientCSV = () => {
    if (!activeClient) return;

    const headers = [
      'Month',
      'Financial Year',
      'Taxable Sales (Rs.)',
      'Exempt Sales (Rs.)',
      'Total Turnover (Rs.)',
      'Monthly Remark (Apr-Mar)',
    ];

    const rows = FY_MONTHS.map((m) => {
      const tax = parseFloat(monthlyInputs[m]?.taxable || '0') || 0;
      const ex = parseFloat(monthlyInputs[m]?.exempt || '0') || 0;
      const tot = tax + ex;
      const rem = (monthlyInputs[m]?.remark || '').replace(/"/g, '""');
      return [
        m,
        `"${selectedFY.display_name}"`,
        tax,
        ex,
        tot,
        `"${rem}"`,
      ].join(',');
    });

    // Grand total row
    rows.push([
      '"ANNUAL GRAND TOTAL"',
      `"${selectedFY.display_name}"`,
      activeClientCalculations.totalTaxable,
      activeClientCalculations.totalExempt,
      activeClientCalculations.grandTotal,
      '""',
    ].join(','));

    const meta = [
      `"Client / Firm Name:","${activeClient.firm_name.replace(/"/g, '""')}"`,
      `"GSTIN:","${activeClient.gstin}"`,
      `"File No:","${activeClient.file_no || ''}"`,
      `"Mobile:","${activeClient.mobile}"`,
      `"Category / Scheme:","${normalizeCat(activeClient.gst_type)}"`,
      `"Financial Year:","${selectedFY.display_name}"`,
      '',
    ].join('\r\n');

    const csvContent = '\uFEFF' + meta + '\r\n' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `GST_Turnover_${activeClient.firm_name.replace(/[^a-zA-Z0-9_-]/g, '_')}_FY_${selectedFY.display_name}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export All Clients 12-Month Landscape PDF Report
  const handleExportAllClientsPDF = () => {
    const listToExport = filteredClients.length > 0 ? filteredClients : clients;
    if (listToExport.length === 0) return;

    const clientsData: AllClientsGstTurnoverExportData[] = listToExport.map((client) => {
      const clientTurnovers = allGstTurnovers.filter(
        (t) => t.client_id === client.id && t.financial_year_id === selectedFY.id
      );

      const monthly: Record<string, { taxable: number; exempt: number; total: number }> = {};
      let annualTaxable = 0;
      let annualExempt = 0;
      let annualTotal = 0;

      let q1 = 0;
      let q2 = 0;
      let q3 = 0;
      let q4 = 0;

      FY_MONTHS.forEach((m) => {
        const rec = clientTurnovers.find((t) => t.month === m);
        const taxable = rec ? rec.taxable_turnover : 0;
        const exempt = rec ? rec.exempt_turnover : 0;
        const total = taxable + exempt;

        monthly[m] = { taxable, exempt, total };
        annualTaxable += taxable;
        annualExempt += exempt;
        annualTotal += total;

        if (['April', 'May', 'June'].includes(m)) q1 += total;
        else if (['July', 'August', 'September'].includes(m)) q2 += total;
        else if (['October', 'November', 'December'].includes(m)) q3 += total;
        else if (['January', 'February', 'March'].includes(m)) q4 += total;
      });

      return {
        client,
        fileNo: client.file_no || '',
        firmName: client.firm_name,
        gstin: client.gstin,
        clientName: client.client_name || '',
        mobile: client.mobile,
        gstType: normalizeCat(client.gst_type),
        staffName: getStaffName(client.assigned_staff_id),
        monthly,
        quarterly: { q1, q2, q3, q4 },
        annualTaxable,
        annualExempt,
        annualTotal,
      };
    });

    generateAllClientsGstTurnoverPDF(clientsData, selectedFY, 'TaxPro GST Consultancy & Services');
  };

  // Export All Clients 12-Month Matrix to Complete CSV (Excel)
  const handleExportAllClientsCSV = () => {
    const listToExport = filteredClients.length > 0 ? filteredClients : clients;
    if (listToExport.length === 0) return;

    const headers = [
      'S.No',
      'File No',
      'Firm Name',
      'GSTIN',
      'Client Name',
      'Mobile 1',
      'Mobile 2',
      'Category / Scheme',
      'Assigned Staff',
      'Financial Year',
      ...FY_MONTHS.map((m) => `${m} Taxable`),
      ...FY_MONTHS.map((m) => `${m} Exempt`),
      ...FY_MONTHS.map((m) => `${m} Total`),
      'Q1 (Apr-Jun) Total',
      'Q2 (Jul-Sep) Total',
      'Q3 (Oct-Dec) Total',
      'Q4 (Jan-Mar) Total',
      'Annual Taxable Sales (Rs.)',
      'Annual Exempt Sales (Rs.)',
      'Annual Grand Total Turnover (Rs.)',
    ];

    let portfolioTaxable = 0;
    let portfolioExempt = 0;
    let portfolioTotal = 0;
    const monthlySumTax: Record<string, number> = {};
    const monthlySumEx: Record<string, number> = {};
    const monthlySumTot: Record<string, number> = {};
    FY_MONTHS.forEach((m) => {
      monthlySumTax[m] = 0;
      monthlySumEx[m] = 0;
      monthlySumTot[m] = 0;
    });

    const rows = listToExport.map((client, index) => {
      const clientTurnovers = allGstTurnovers.filter(
        (t) => t.client_id === client.id && t.financial_year_id === selectedFY.id
      );

      let annualTax = 0;
      let annualEx = 0;
      let annualTot = 0;
      let q1 = 0;
      let q2 = 0;
      let q3 = 0;
      let q4 = 0;

      const taxCells: number[] = [];
      const exCells: number[] = [];
      const totCells: number[] = [];

      FY_MONTHS.forEach((m) => {
        const rec = clientTurnovers.find((t) => t.month === m);
        const tax = rec ? rec.taxable_turnover : 0;
        const ex = rec ? rec.exempt_turnover : 0;
        const tot = tax + ex;

        taxCells.push(tax);
        exCells.push(ex);
        totCells.push(tot);

        monthlySumTax[m] += tax;
        monthlySumEx[m] += ex;
        monthlySumTot[m] += tot;

        annualTax += tax;
        annualEx += ex;
        annualTot += tot;

        if (['April', 'May', 'June'].includes(m)) q1 += tot;
        else if (['July', 'August', 'September'].includes(m)) q2 += tot;
        else if (['October', 'November', 'December'].includes(m)) q3 += tot;
        else if (['January', 'February', 'March'].includes(m)) q4 += tot;
      });

      portfolioTaxable += annualTax;
      portfolioExempt += annualEx;
      portfolioTotal += annualTot;

      return [
        String(index + 1),
        `"${(client.file_no || '').replace(/"/g, '""')}"`,
        `"${client.firm_name.replace(/"/g, '""')}"`,
        `"${client.gstin}"`,
        `"${(client.client_name || '').replace(/"/g, '""')}"`,
        `"${client.mobile}"`,
        `"${client.alternate_mobile || ''}"`,
        `"${normalizeCat(client.gst_type)}"`,
        `"${getStaffName(client.assigned_staff_id).replace(/"/g, '""')}"`,
        `"${selectedFY.display_name}"`,
        ...taxCells,
        ...exCells,
        ...totCells,
        q1,
        q2,
        q3,
        q4,
        annualTax,
        annualEx,
        annualTot,
      ].join(',');
    });

    // Grand Total Summary Row for Excel
    const summaryTaxCells = FY_MONTHS.map((m) => monthlySumTax[m]);
    const summaryExCells = FY_MONTHS.map((m) => monthlySumEx[m]);
    const summaryTotCells = FY_MONTHS.map((m) => monthlySumTot[m]);
    const summaryQ1 = summaryTotCells[0] + summaryTotCells[1] + summaryTotCells[2];
    const summaryQ2 = summaryTotCells[3] + summaryTotCells[4] + summaryTotCells[5];
    const summaryQ3 = summaryTotCells[6] + summaryTotCells[7] + summaryTotCells[8];
    const summaryQ4 = summaryTotCells[9] + summaryTotCells[10] + summaryTotCells[11];

    const totalRow = [
      'TOTAL',
      '',
      '"PORTFOLIO GRAND TOTAL"',
      '',
      '',
      '',
      '',
      '',
      '',
      `"${selectedFY.display_name}"`,
      ...summaryTaxCells,
      ...summaryExCells,
      ...summaryTotCells,
      summaryQ1,
      summaryQ2,
      summaryQ3,
      summaryQ4,
      portfolioTaxable,
      portfolioExempt,
      portfolioTotal,
    ].join(',');

    rows.push(totalRow);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `All_Clients_12Month_GST_Turnover_FY_${selectedFY.display_name}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Matrix Overview Calculations
  const matrixStats = useMemo(() => {
    let clientsWithData = 0;
    let totalFYTurnover = 0;
    let totalFYTaxable = 0;
    let totalFYExempt = 0;

    filteredClients.forEach((c) => {
      const turnovers = allGstTurnovers.filter(
        (t) => t.client_id === c.id && t.financial_year_id === selectedFY.id
      );
      let cTot = 0;
      turnovers.forEach((t) => {
        totalFYTaxable += t.taxable_turnover || 0;
        totalFYExempt += t.exempt_turnover || 0;
        cTot += (t.taxable_turnover || 0) + (t.exempt_turnover || 0);
      });
      if (cTot > 0) clientsWithData++;
      totalFYTurnover += cTot;
    });

    return {
      clientsWithData,
      totalFYTurnover,
      totalFYTaxable,
      totalFYExempt,
    };
  }, [filteredClients, allGstTurnovers, selectedFY.id]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8DCC4] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#78350F] flex items-center justify-center text-white shadow-xs">
                <Calculator className="w-4 h-4 text-amber-200" />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                12-Month GST Turnover Entry & Management
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Client-wise 12-month (April to March) Taxable Sales and Exempt Sales recording with annual compliance calculations.
            </p>
          </div>

          {/* Controls: FY Selector, Refresh, and View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Financial Year Selector */}
            <div className="flex items-center bg-[#FAF6F0] border border-[#E8DCC4] rounded-xl px-3 py-1.5 text-xs shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#78350F] mr-1.5" />
              <span className="font-bold text-[#78350F] mr-1">FY:</span>
              <select
                id="turnover-fy-select"
                value={selectedFY.id}
                onChange={(e) => {
                  const fy = financialYears.find((f) => f.id === Number(e.target.value));
                  if (fy) onSelectFY(fy);
                }}
                className="bg-transparent font-black text-slate-900 focus:outline-none cursor-pointer"
              >
                {[...financialYears]
                  .sort((a, b) => (GSTStorage.getFYSortOrder() === 'desc' ? b.start_year - a.start_year : a.start_year - b.start_year))
                  .map((fy) => (
                    <option key={fy.id} value={fy.id}>
                      FY {fy.display_name} {fy.id === selectedFY.id ? '(Active)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                id="view-mode-client-entry-btn"
                onClick={() => setViewMode('client-entry')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'client-entry'
                    ? 'bg-[#78350F] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Client Entry</span>
              </button>
              <button
                type="button"
                id="view-mode-all-matrix-btn"
                onClick={() => setViewMode('all-matrix')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'all-matrix'
                    ? 'bg-[#78350F] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>All Clients Grid</span>
              </button>
            </div>

            {/* All Clients Bulk Report Generation Buttons */}
            <div className="flex items-center gap-1.5 bg-[#FAF6F0] p-1 rounded-xl border border-[#E8DCC4]">
              <button
                type="button"
                id="header-export-all-pdf-btn"
                onClick={handleExportAllClientsPDF}
                className="px-2.5 py-1.5 bg-white hover:bg-[#78350F] text-[#78350F] hover:text-white font-bold text-xs rounded-lg border border-[#D4C3A3] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Download 12-Month GST Turnover PDF for All Clients"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>All PDF</span>
              </button>
              <button
                type="button"
                id="header-export-all-excel-btn"
                onClick={handleExportAllClientsCSV}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white font-bold text-xs rounded-lg border border-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Download 12-Month GST Turnover Excel (CSV) for All Clients"
              >
                <Download className="w-3.5 h-3.5" />
                <span>All Excel</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                refreshTurnoverData();
                if (onRefresh) onRefresh();
              }}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh GST Turnover Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: CLIENT-WISE 12-MONTH GST TURNOVER ENTRY & EDIT */}
      {/* ========================================================================= */}
      {viewMode === 'client-entry' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT COLUMN: CLIENT SELECTOR & SEARCH (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#78350F]" />
                  Select Client ({filteredClients.length})
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {currentClientIndex + 1} of {filteredClients.length}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search firm, GSTIN, file no, mobile..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#78350F] focus:bg-white"
                />
                {clientSearch && (
                  <button
                    type="button"
                    onClick={() => setClientSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                {(['all', 'Normal', 'Composition', 'QRMP'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-[10px] px-2 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-[#78350F] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'all' ? 'All Schemes' : cat}
                  </button>
                ))}
              </div>

              {/* Scrollable Client Selection List */}
              <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1 custom-sidebar-scroll">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No clients match your filter.
                  </div>
                ) : (
                  filteredClients.map((client) => {
                    const isSelected = client.id === selectedClientId;
                    const clientTurnovers = allGstTurnovers.filter(
                      (t) => t.client_id === client.id && t.financial_year_id === selectedFY.id
                    );
                    const clientAnnualTotal = clientTurnovers.reduce(
                      (acc, t) => acc + (t.taxable_turnover || 0) + (t.exempt_turnover || 0),
                      0
                    );

                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#FAF6F0] border-[#78350F] ring-1 ring-[#78350F] shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {client.file_no && (
                              <span className="font-mono text-[9px] font-bold text-[#78350F] bg-amber-50 px-1 rounded border border-amber-200">
                                {client.file_no}
                              </span>
                            )}
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {client.firm_name}
                            </div>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                            {client.gstin}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            📱 {client.mobile}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-mono font-bold text-slate-900">
                            {clientAnnualTotal > 0 ? formatINR(clientAnnualTotal) : '—'}
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                              clientAnnualTotal > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {clientAnnualTotal > 0 ? 'Recorded' : 'Empty'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Prev / Next Client Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevClient}
                  disabled={currentClientIndex <= 0}
                  className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="text-[11px] text-slate-500 font-medium">
                  {currentClientIndex + 1} / {filteredClients.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextClient}
                  disabled={currentClientIndex >= filteredClients.length - 1}
                  className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 12-MONTH TURNOVER ENTRY GRID & METRICS (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {activeClient ? (
              <>
                {/* Active Client Info Banner */}
                <div className="bg-white p-4 rounded-2xl border border-[#E8DCC4] shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DCC4]">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {activeClient.file_no && (
                          <span className="font-mono text-xs font-bold text-[#78350F] bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#E8DCC4]">
                            📁 File No: {activeClient.file_no}
                          </span>
                        )}
                        <h2 className="text-base font-black text-slate-900">
                          {activeClient.firm_name}
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-100 text-blue-800">
                          {normalizeCat(activeClient.gst_type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                        <span className="font-mono font-semibold text-slate-700">
                          GSTIN: {activeClient.gstin}
                        </span>
                        <span>•</span>
                        <span>📱 Mobile 1: <strong className="text-slate-900">{activeClient.mobile}</strong></span>
                        {activeClient.alternate_mobile && (
                          <>
                            <span>•</span>
                            <span>Mobile 2: <strong className="text-slate-800">{activeClient.alternate_mobile}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Report & Export Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        id="export-client-pdf-btn"
                        onClick={handleExportClientPDF}
                        className="px-2.5 py-1.5 bg-[#FAF6F0] hover:bg-[#78350F] text-[#78350F] hover:text-white font-bold text-xs rounded-xl border border-[#D4C3A3] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        title="Download 12-Month GST Turnover PDF for this Client"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Client PDF</span>
                      </button>
                      <button
                        type="button"
                        id="export-client-excel-btn"
                        onClick={handleExportClientCSV}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-700 text-emerald-800 hover:text-white font-bold text-xs rounded-xl border border-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        title="Download 12-Month GST Turnover Excel (CSV) for this Client"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Client Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <div className="bg-[#FAF6F0] p-3 rounded-xl border border-[#E8DCC4]">
                      <span className="text-[10px] font-bold text-[#78350F] uppercase tracking-wider block">
                        Total Taxable Sales
                      </span>
                      <div className="text-base font-black text-slate-900 mt-0.5 font-mono">
                        {formatINR(activeClientCalculations.totalTaxable)}
                      </div>
                      <span className="text-[10px] text-slate-500">12-Month Taxable</span>
                    </div>

                    <div className="bg-[#FAF6F0] p-3 rounded-xl border border-[#E8DCC4]">
                      <span className="text-[10px] font-bold text-[#78350F] uppercase tracking-wider block">
                        Total Exempt Sales
                      </span>
                      <div className="text-base font-black text-slate-900 mt-0.5 font-mono">
                        {formatINR(activeClientCalculations.totalExempt)}
                      </div>
                      <span className="text-[10px] text-slate-500">12-Month Exempt</span>
                    </div>

                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs">
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                        Grand Total Turnover
                      </span>
                      <div className="text-base font-black text-emerald-400 mt-0.5 font-mono">
                        {formatINR(activeClientCalculations.grandTotal)}
                      </div>
                      <span className="text-[10px] text-slate-400">Taxable + Exempt</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Active Months
                      </span>
                      <div className="text-base font-black text-slate-800 mt-0.5 font-mono">
                        {activeClientCalculations.filledMonthsCount} / 12 Months
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Avg: {formatINR(activeClientCalculations.avgMonthly)}/mo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Helper Tools & Save Action Bar */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#78350F]" />
                      <span>12-Month Turnover & Remark Entry (April to March)</span>
                    </span>
                  </div>

                  {/* Save Status / Feedback */}
                  <div className="flex items-center gap-3">
                    {saveStatus && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{saveStatus}</span>
                      </span>
                    )}

                    {/* Main Save 12-Month Turnover Button */}
                    <button
                      type="button"
                      id="save-client-gst-turnover-btn"
                      onClick={handleSaveClientTurnover}
                      disabled={isSaving}
                      className="px-4 py-2 bg-[#78350F] hover:bg-[#92400E] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 text-amber-200" />
                          <span>Save 12-Month Turnover</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 12-Month Input Table Grid */}
                <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-[#FAF6F0] border-b border-[#E8DCC4] text-[11px] font-bold text-[#78350F] uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 w-36">Month (FY {selectedFY.display_name})</th>
                          <th className="px-4 py-3 min-w-[180px]">Taxable Sales (₹)</th>
                          <th className="px-4 py-3 min-w-[180px]">Exempt Sales (₹)</th>
                          <th className="px-4 py-3 min-w-[150px] text-right">Total Turnover (₹)</th>
                          <th className="px-4 py-3 w-24 text-right">% Share</th>
                          <th className="px-3 py-3 min-w-[220px]">Monthly Remark (Apr - Mar)</th>
                          <th className="px-3 py-3 w-24 text-center">Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {FY_MONTHS.map((month, idx) => {
                          const taxStr = monthlyInputs[month]?.taxable || '';
                          const exStr = monthlyInputs[month]?.exempt || '';
                          const remStr = monthlyInputs[month]?.remark || '';
                          const taxNum = parseFloat(taxStr) || 0;
                          const exNum = parseFloat(exStr) || 0;
                          const monthTotal = taxNum + exNum;
                          const pctShare =
                            activeClientCalculations.grandTotal > 0
                              ? ((monthTotal / activeClientCalculations.grandTotal) * 100).toFixed(1)
                              : '0.0';

                          // Quarter markers
                          const isQ1End = month === 'June';
                          const isQ2End = month === 'September';
                          const isQ3End = month === 'December';
                          const isQ4End = month === 'March';

                          return (
                            <React.Fragment key={month}>
                              <tr className="hover:bg-[#FAF6F0]/40 transition-colors">
                                {/* Month Name */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <div className="font-bold text-slate-900 text-xs">{month}</div>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {idx < 9 ? selectedFY.start_year : selectedFY.end_year}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Taxable Sales Input */}
                                <td className="px-4 py-2.5">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                      ₹
                                    </span>
                                    <input
                                      type="text"
                                      id={`input-taxable-${month}`}
                                      placeholder="0"
                                      value={taxStr}
                                      onChange={(e) => handleInputChange(month, 'taxable', e.target.value)}
                                      className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#78350F] focus:bg-white transition-all"
                                    />
                                  </div>
                                </td>

                                {/* Exempt Sales Input */}
                                <td className="px-4 py-2.5">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                      ₹
                                    </span>
                                    <input
                                      type="text"
                                      id={`input-exempt-${month}`}
                                      placeholder="0"
                                      value={exStr}
                                      onChange={(e) => handleInputChange(month, 'exempt', e.target.value)}
                                      className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#78350F] focus:bg-white transition-all"
                                    />
                                  </div>
                                </td>

                                {/* Total Turnover Computed */}
                                <td className="px-4 py-3 text-right">
                                  <div className="font-mono font-black text-slate-900 text-xs">
                                    {monthTotal > 0 ? formatINR(monthTotal) : '—'}
                                  </div>
                                  {monthTotal > 0 && (
                                    <div className="text-[9px] text-slate-400">
                                      T: {formatINR(taxNum)} | E: {formatINR(exNum)}
                                    </div>
                                  )}
                                </td>

                                {/* Percentage Share */}
                                <td className="px-4 py-3 text-right">
                                  <span
                                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                      monthTotal > 0
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {pctShare}%
                                  </span>
                                </td>

                                {/* Monthly Remark (April to March) */}
                                <td className="px-3 py-2.5">
                                  <input
                                    type="text"
                                    id={`input-remark-${month}`}
                                    placeholder="Enter remark (e.g. Nil, Regular, Revised...)"
                                    value={remStr}
                                    onChange={(e) => handleInputChange(month, 'remark', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#78350F] focus:ring-1 focus:ring-[#78350F] rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
                                  />
                                </td>

                                {/* Copy Forward Action */}
                                <td className="px-3 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyForward(month)}
                                    title="Copy this month's taxable, exempt & remark to all following months"
                                    className="text-[10px] font-bold text-slate-500 hover:text-[#78350F] hover:bg-amber-50 px-2 py-1 rounded border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                                  >
                                    Copy ↓
                                  </button>
                                </td>
                              </tr>

                              {/* Quarterly Subtotal Row */}
                              {(isQ1End || isQ2End || isQ3End || isQ4End) && (
                                <tr className="bg-[#FAF6F0]/80 font-bold border-y border-[#E8DCC4] text-[11px]">
                                  <td colSpan={3} className="px-4 py-1.5 text-[#78350F] uppercase tracking-wider">
                                    {isQ1End && '📊 Quarter 1 Subtotal (Apr - Jun)'}
                                    {isQ2End && '📊 Quarter 2 Subtotal (Jul - Sep)'}
                                    {isQ3End && '📊 Quarter 3 Subtotal (Oct - Dec)'}
                                    {isQ4End && '📊 Quarter 4 Subtotal (Jan - Mar)'}
                                  </td>
                                  <td className="px-4 py-1.5 text-right font-mono font-black text-slate-900">
                                    {isQ1End && formatINR(activeClientCalculations.quarters.q1)}
                                    {isQ2End && formatINR(activeClientCalculations.quarters.q2)}
                                    {isQ3End && formatINR(activeClientCalculations.quarters.q3)}
                                    {isQ4End && formatINR(activeClientCalculations.quarters.q4)}
                                  </td>
                                  <td colSpan={3} className="px-4 py-1.5 text-slate-400 text-right text-[10px]">
                                    Quarterly Subtotal
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* Grand Annual Total Row */}
                        <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-800">
                          <td className="px-4 py-3.5 uppercase tracking-wider text-amber-300">
                            Annual Grand Total (12-M)
                          </td>
                          <td className="px-4 py-3.5 font-mono text-emerald-400">
                            {formatINR(activeClientCalculations.totalTaxable)}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-amber-300">
                            {formatINR(activeClientCalculations.totalExempt)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-emerald-400 text-sm">
                            {formatINR(activeClientCalculations.grandTotal)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-white">100.0%</td>
                          <td className="px-3 py-3.5 text-slate-400 text-xs italic">
                            {activeClientCalculations.filledMonthsCount} / 12 Months Recorded
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={handleSaveClientTurnover}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold cursor-pointer"
                            >
                              Save All
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                <Building className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No client selected.</p>
                <p className="text-xs text-slate-400 mt-1">Please pick a client from the left list.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: ALL CLIENTS 12-MONTH TURNOVER MATRIX & BULK OVERVIEW */}
      {/* ========================================================================= */}
      {viewMode === 'all-matrix' && (
        <div className="space-y-4">
          {/* Summary Metric Stats for All Clients */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF6F0] p-4 rounded-2xl border border-[#E8DCC4]">
            <div className="bg-white p-3.5 rounded-xl border border-[#E8DCC4] shadow-2xs">
              <span className="text-[10px] font-bold text-[#78350F] uppercase tracking-wider block">
                Total Clients
              </span>
              <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                {filteredClients.length}
              </div>
              <span className="text-[10px] text-slate-500">In FY {selectedFY.display_name}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Clients with Turnover
              </span>
              <div className="text-lg font-black text-emerald-700 mt-0.5 font-mono">
                {matrixStats.clientsWithData} / {filteredClients.length}
              </div>
              <span className="text-[10px] text-emerald-600">Sales recorded</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Total Taxable Sales
              </span>
              <div className="text-base sm:text-lg font-black text-amber-900 mt-0.5 font-mono">
                {formatINR(matrixStats.totalFYTaxable)}
              </div>
              <span className="text-[10px] text-amber-700">Across all clients</span>
            </div>

            <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                Total FY Turnover
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 font-mono">
                {formatINR(matrixStats.totalFYTurnover)}
              </div>
              <span className="text-[10px] text-slate-400">Grand FY Total</span>
            </div>
          </div>

          {/* Filter Toolbar for All Clients Grid */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter client, firm, GSTIN, file no..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#78350F]"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">All Schemes</option>
                <option value="Normal">Normal Scheme</option>
                <option value="Composition">Composition Scheme</option>
                <option value="QRMP">QRMP Scheme</option>
              </select>

              {/* Turnover Status Filter */}
              <select
                value={turnoverStatusFilter}
                onChange={(e) => setTurnoverStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">All Turnover Status</option>
                <option value="with-data">With Turnover Recorded</option>
                <option value="no-data">Empty / No Turnover</option>
              </select>
            </div>

            {/* Export All Clients PDF & Excel Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="export-turnover-matrix-pdf-btn"
                onClick={handleExportAllClientsPDF}
                className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-[#78350F] text-[#78350F] hover:text-white font-bold text-xs rounded-xl border border-[#D4C3A3] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Download 12-Month Landscape GST Turnover PDF Report for All Clients"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export All PDF</span>
              </button>

              <button
                type="button"
                id="export-turnover-matrix-csv-btn"
                onClick={handleExportAllClientsCSV}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-700 text-emerald-800 hover:text-white font-bold text-xs rounded-xl border border-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Download Complete 12-Month Turnover Excel (CSV) with Quarterly & Annual Breakdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export All Excel</span>
              </button>
            </div>
          </div>

          {/* Matrix Spreadsheet Table */}
          <div className="bg-white rounded-2xl border border-[#E8DCC4] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[1200px]">
                <thead className="bg-[#FAF6F0] border-b border-[#E8DCC4] text-[10px] font-bold text-[#78350F] uppercase">
                  <tr>
                    <th className="px-3 py-3 sticky left-0 bg-[#FAF6F0] z-10 w-52">
                      Client / Firm Name
                    </th>
                    {FY_MONTHS.map((m) => (
                      <th key={m} className="px-2.5 py-3 text-right w-24">
                        {m.slice(0, 3)}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right font-black text-slate-900 bg-[#E8DCC4]/60 w-32">
                      Annual Total
                    </th>
                    <th className="px-3 py-3 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="text-center py-10 text-slate-400">
                        No clients match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => {
                      const clientTurnovers = allGstTurnovers.filter(
                        (t) => t.client_id === client.id && t.financial_year_id === selectedFY.id
                      );

                      const monthlyMap: Record<string, { tax: number; ex: number; tot: number }> = {};
                      let annualTax = 0;
                      let annualEx = 0;
                      let annualTot = 0;

                      FY_MONTHS.forEach((m) => {
                        const rec = clientTurnovers.find((t) => t.month === m);
                        const tax = rec ? rec.taxable_turnover : 0;
                        const ex = rec ? rec.exempt_turnover : 0;
                        const tot = tax + ex;
                        monthlyMap[m] = { tax, ex, tot };
                        annualTax += tax;
                        annualEx += ex;
                        annualTot += tot;
                      });

                      return (
                        <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                          {/* Client Sticky Name */}
                          <td className="px-3 py-2.5 font-bold text-slate-900 sticky left-0 bg-white shadow-2xs z-10">
                            <div className="flex items-center gap-1.5">
                              {client.file_no && (
                                <span className="font-mono text-[9px] font-bold text-[#78350F] bg-[#FAF6F0] px-1 py-0.2 rounded border border-[#E8DCC4]">
                                  {client.file_no}
                                </span>
                              )}
                              <span className="truncate max-w-[150px]" title={client.firm_name}>
                                {client.firm_name}
                              </span>
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">{client.gstin}</div>
                          </td>

                          {/* 12 Months Cells */}
                          {FY_MONTHS.map((m) => {
                            const mData = monthlyMap[m];
                            return (
                              <td key={m} className="px-2 py-2 text-right">
                                {mData.tot > 0 ? (
                                  <div>
                                    <div className="font-mono font-bold text-slate-900 text-[11px]">
                                      {formatNumberOnly(mData.tot)}
                                    </div>
                                    <div className="text-[9px] text-slate-400">
                                      T: {formatNumberOnly(mData.tax)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Annual Total */}
                          <td className="px-3 py-2 text-right font-mono font-black text-slate-900 bg-[#FAF6F0] text-xs">
                            {annualTot > 0 ? formatINR(annualTot) : <span className="text-slate-300">—</span>}
                          </td>

                          {/* Edit Action */}
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setViewMode('client-entry');
                              }}
                              className="px-2.5 py-1 bg-[#78350F] hover:bg-[#92400E] text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
