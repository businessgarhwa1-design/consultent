import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityLog,
  Client,
  FinancialYear,
  FY_MONTHS,
  MonthlyWork,
  OfficeVisit,
  User,
  WorkStatus,
  ClientGstTurnover,
  ClientBankAccount,
  ClientBankTurnover,
} from '../types';
import { GSTStorage } from '../utils/storage';
import { generateTopClientsTurnoverPDF, TopClientExportRow } from '../utils/pdfGenerator';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  FileSpreadsheet,
  PlusCircle,
  FileCheck,
  Calendar,
  Layers,
  ShieldCheck,
  Landmark,
  FileText,
  RefreshCw,
  UserCheck,
  Building2,
  LogIn,
  LogOut,
  BadgePercent,
  Sparkles,
  Phone,
  Calculator,
  Search,
  ChevronRight,
  TrendingDown,
  Activity,
  UserCog,
  FileUp,
  FileDown,
  BarChart3,
  PieChart as PieChartIcon,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  Building,
  CheckCircle,
  XCircle,
  Flame,
  Zap,
  Trophy,
  Award,
  Download,
  Printer,
  CheckSquare,
  Square,
  Trash2,
  Edit3,
  Plus,
  ListFilter,
  SlidersHorizontal,
  Copy,
  Check,
  RotateCcw,
  FilePlus2,
  Share2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

interface DashboardProps {
  clients: Client[];
  monthlyWork: MonthlyWork[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  selectedMonth: string;
  users: User[];
  activityLogs: ActivityLog[];
  officeVisits?: OfficeVisit[];
  onNavigateTab: (tab: any, filterStatus?: string, filterScheme?: string) => void;
  onOpenAddClient: () => void;
  onOpenImportModal: () => void;
  onRefresh?: () => void;
}

export const getSchemeCategory = (val?: string): 'Normal' | 'Composition' | 'QRMP' => {
  if (!val) return 'Normal';
  const c = val.trim().toLowerCase();
  if (c === 'composition') return 'Composition';
  if (c === 'qrmp') return 'QRMP';
  return 'Normal';
};

// Format currency in Indian Rupees
const formatINR = (amount: number): string => {
  if (!amount || isNaN(amount)) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

const formatFullINR = (amount: number): string => {
  if (!amount || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const Dashboard: React.FC<DashboardProps> = ({
  clients,
  monthlyWork,
  financialYears,
  selectedFY,
  selectedMonth,
  users,
  activityLogs,
  officeVisits = [],
  onNavigateTab,
  onOpenAddClient,
  onOpenImportModal,
  onRefresh,
}) => {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    'compliance' | 'gst-turnover-list' | 'visitors' | 'staff' | 'audit'
  >('compliance');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [schemeFilter, setSchemeFilter] = useState<'all' | 'Normal' | 'Composition' | 'QRMP'>('all');

  // All Clients GST Turnover State
  const [turnoverSortField, setTurnoverSortField] = useState<
    'totalTurnover' | 'taxableTurnover' | 'exemptTurnover' | 'bankTurnover' | 'firm_name' | 'file_no' | 'percentageShare'
  >('totalTurnover');
  const [turnoverSortOrder, setTurnoverSortOrder] = useState<'desc' | 'asc'>('desc');
  const [turnoverRangeFilter, setTurnoverRangeFilter] = useState<
    'all' | 'gt10cr' | '5cr_10cr' | '1.5cr_5cr' | '50l_1.5cr' | '20l_50l' | '5l_20l' | 'lt5l' | 'nil' | 'custom'
  >('all');
  const [turnoverCustomMin, setTurnoverCustomMin] = useState('');
  const [turnoverCustomMax, setTurnoverCustomMax] = useState('');
  const [turnoverSchemeFilter, setTurnoverSchemeFilter] = useState<'all' | 'Normal' | 'Composition' | 'QRMP'>('all');
  const [turnoverStatusFilter, setTurnoverStatusFilter] = useState<'active' | 'all' | 'inactive'>('active');
  const [turnoverSearchTerm, setTurnoverSearchTerm] = useState('');
  const [copiedTurnoverTooltip, setCopiedTurnoverTooltip] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Active clients
  const activeClients = useMemo(() => clients.filter((c) => c.status === 'active'), [clients]);
  const inactiveClientsCount = clients.length - activeClients.length;

  // Monthly work for selected month
  const currentMonthRecords = useMemo(
    () =>
      monthlyWork.filter(
        (m) => m.financial_year_id === selectedFY.id && m.month === selectedMonth
      ),
    [monthlyWork, selectedFY.id, selectedMonth]
  );

  const workMap = useMemo(() => {
    const map = new Map<number, MonthlyWork>();
    currentMonthRecords.forEach((r) => map.set(r.client_id, r));
    return map;
  }, [currentMonthRecords]);

  // Status counters for selected month
  let completed = 0;
  let nilFiled = 0;
  let rcmPay = 0;
  let dataReceived = 0;
  let challanGenerated = 0;
  let billPending = 0;
  let taxPaymentPending = 0;
  let docsPending = 0;
  let clientResponsePending = 0;
  let gstr1Filed = 0;
  let notStarted = 0;
  let other = 0;

  activeClients.forEach((c) => {
    const rec = workMap.get(c.id);
    const status: WorkStatus = rec ? rec.status : 'Not Started';

    if (status === 'Completed') completed++;
    else if (status === 'Nil Filed') nilFiled++;
    else if (status === 'GSTR-1 Filed') gstr1Filed++;
    else if (status === 'RCM Pay') rcmPay++;
    else if (status === 'Data Received') dataReceived++;
    else if (status === 'Challan Generated') challanGenerated++;
    else if (status === 'Bill Pending') billPending++;
    else if (status === 'Tax Payment Pending') taxPaymentPending++;
    else if (status === 'Documents Pending') docsPending++;
    else if (status === 'Client Response Pending') clientResponsePending++;
    else if (status === 'Not Started') notStarted++;
    else other++;
  });

  const totalFiledOrDone = completed + nilFiled;
  const totalPendingAction =
    rcmPay +
    dataReceived +
    challanGenerated +
    billPending +
    taxPaymentPending +
    docsPending +
    clientResponsePending +
    gstr1Filed +
    other;

  const completionRate =
    activeClients.length > 0 ? Math.round((totalFiledOrDone / activeClients.length) * 100) : 0;

  // Schemes breakdown
  const normalClients = useMemo(
    () => activeClients.filter((c) => getSchemeCategory(c.gst_type) === 'Normal'),
    [activeClients]
  );
  const compositionClients = useMemo(
    () => activeClients.filter((c) => getSchemeCategory(c.gst_type) === 'Composition'),
    [activeClients]
  );
  const qrmpClients = useMemo(
    () => activeClients.filter((c) => getSchemeCategory(c.gst_type) === 'QRMP'),
    [activeClients]
  );

  // Scheme specific progress
  const getSchemeStats = (clientList: Client[]) => {
    let done = 0;
    let pend = 0;
    let unstarted = 0;
    clientList.forEach((c) => {
      const st = workMap.get(c.id)?.status || 'Not Started';
      if (st === 'Completed' || st === 'Nil Filed') done++;
      else if (st === 'Not Started') unstarted++;
      else pend++;
    });
    const rate = clientList.length > 0 ? Math.round((done / clientList.length) * 100) : 0;
    return { done, pend, unstarted, rate, total: clientList.length };
  };

  const normalStats = useMemo(() => getSchemeStats(normalClients), [normalClients, workMap]);
  const compStats = useMemo(() => getSchemeStats(compositionClients), [compositionClients, workMap]);
  const qrmpStats = useMemo(() => getSchemeStats(qrmpClients), [qrmpClients, workMap]);

  // Load GST Turnovers from Storage for Financial Intelligence
  const allGstTurnovers: ClientGstTurnover[] = useMemo(() => {
    try {
      return GSTStorage.getGstTurnover();
    } catch {
      return [];
    }
  }, [selectedFY.id, selectedMonth, clients, monthlyWork, isRefreshing]);

  const fyGstTurnovers = useMemo(
    () => allGstTurnovers.filter((t) => t.financial_year_id === selectedFY.id),
    [allGstTurnovers, selectedFY.id]
  );

  const annualTaxableTotal = useMemo(
    () => fyGstTurnovers.reduce((sum, t) => sum + (Number(t.taxable_turnover) || 0), 0),
    [fyGstTurnovers]
  );

  const annualExemptTotal = useMemo(
    () => fyGstTurnovers.reduce((sum, t) => sum + (Number(t.exempt_turnover) || 0), 0),
    [fyGstTurnovers]
  );

  const annualGrandGstTurnover = annualTaxableTotal + annualExemptTotal;

  // Selected Month GST Turnover
  const selectedMonthGstTurnovers = useMemo(
    () => fyGstTurnovers.filter((t) => t.month === selectedMonth),
    [fyGstTurnovers, selectedMonth]
  );
  const selectedMonthGstTotal = useMemo(
    () =>
      selectedMonthGstTurnovers.reduce(
        (sum, t) => sum + (Number(t.taxable_turnover) || 0) + (Number(t.exempt_turnover) || 0),
        0
      ),
    [selectedMonthGstTurnovers]
  );

  // Monthly Turnover Trajectory (April - March)
  const monthlyGstSalesChart = useMemo(() => {
    return FY_MONTHS.map((m) => {
      const recs = fyGstTurnovers.filter((t) => t.month === m);
      const tax = recs.reduce((sum, r) => sum + (Number(r.taxable_turnover) || 0), 0);
      const ex = recs.reduce((sum, r) => sum + (Number(r.exempt_turnover) || 0), 0);
      const tot = tax + ex;
      return {
        month: m.slice(0, 3),
        fullMonth: m,
        taxable: Math.round(tax),
        exempt: Math.round(ex),
        total: Math.round(tot),
      };
    });
  }, [fyGstTurnovers]);

  // Load Bank Turnover & Accounts for Financial & Top Clients intelligence
  const bankAccounts: ClientBankAccount[] = useMemo(() => {
    try {
      return GSTStorage.getBankAccounts();
    } catch {
      return [];
    }
  }, [clients, isRefreshing]);

  const bankTurnovers: ClientBankTurnover[] = useMemo(() => {
    try {
      return GSTStorage.getBankTurnover();
    } catch {
      return [];
    }
  }, [selectedFY.id, selectedMonth, clients, isRefreshing]);

  const fyBankTurnovers = useMemo(
    () => bankTurnovers.filter((b) => b.financial_year_id === selectedFY.id),
    [bankTurnovers, selectedFY.id]
  );

  const annualBankTotal = useMemo(
    () => fyBankTurnovers.reduce((sum, b) => sum + (Number(b.turnover_amount) || 0), 0),
    [fyBankTurnovers]
  );

  // Selected Month Bank Turnover
  const selectedMonthBankTurnovers = useMemo(
    () => fyBankTurnovers.filter((b) => b.month === selectedMonth),
    [fyBankTurnovers, selectedMonth]
  );
  const selectedMonthBankTotal = useMemo(
    () =>
      selectedMonthBankTurnovers.reduce(
        (sum, b) => sum + (Number(b.turnover_amount) || 0),
        0
      ),
    [selectedMonthBankTurnovers]
  );

  // Base raw list of all clients with GST & Bank Turnover for selected FY
  const rawClientTurnovers = useMemo(() => {
    const clientSalesMap = new Map<number, { taxable: number; exempt: number; total: number }>();
    fyGstTurnovers.forEach((t) => {
      const cur = clientSalesMap.get(t.client_id) || { taxable: 0, exempt: 0, total: 0 };
      cur.taxable += Number(t.taxable_turnover) || 0;
      cur.exempt += Number(t.exempt_turnover) || 0;
      cur.total += (Number(t.taxable_turnover) || 0) + (Number(t.exempt_turnover) || 0);
      clientSalesMap.set(t.client_id, cur);
    });

    const clientBankMap = new Map<number, number>();
    fyBankTurnovers.forEach((b) => {
      const cur = clientBankMap.get(b.client_id) || 0;
      clientBankMap.set(b.client_id, cur + (Number(b.turnover_amount) || 0));
    });

    return clients.map((client) => {
      const sales = clientSalesMap.get(client.id) || { taxable: 0, exempt: 0, total: 0 };
      const bankTurnover = clientBankMap.get(client.id) || 0;
      const scheme = getSchemeCategory(client.gst_type);
      const percentageShare = annualGrandGstTurnover > 0 ? (sales.total / annualGrandGstTurnover) * 100 : 0;
      return {
        client,
        id: client.id,
        file_no: client.file_no || '',
        firm_name: client.firm_name,
        client_name: client.client_name || '',
        gstin: client.gstin || '',
        mobile: client.mobile || '',
        status: client.status,
        scheme,
        taxableTurnover: sales.taxable,
        exemptTurnover: sales.exempt,
        totalTurnover: sales.total,
        bankTurnover,
        percentageShare,
      };
    });
  }, [clients, fyGstTurnovers, fyBankTurnovers, annualGrandGstTurnover]);

  // Filtered & Sorted All Clients GST Turnover List
  const filteredSortedClientsTurnover = useMemo(() => {
    let list = [...rawClientTurnovers];

    // 1. Status filter
    if (turnoverStatusFilter === 'active') {
      list = list.filter((c) => c.status === 'active');
    } else if (turnoverStatusFilter === 'inactive') {
      list = list.filter((c) => c.status !== 'active');
    }

    // 2. Scheme filter
    if (turnoverSchemeFilter !== 'all') {
      list = list.filter((c) => c.scheme === turnoverSchemeFilter);
    }

    // 3. Search filter
    if (turnoverSearchTerm.trim()) {
      const q = turnoverSearchTerm.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.firm_name.toLowerCase().includes(q) ||
          c.client_name.toLowerCase().includes(q) ||
          c.gstin.toLowerCase().includes(q) ||
          c.file_no.toLowerCase().includes(q) ||
          c.mobile.toLowerCase().includes(q)
      );
    }

    // 4. Turnover-wise Range Filter
    if (turnoverRangeFilter === 'gt10cr') {
      list = list.filter((c) => c.totalTurnover >= 100000000);
    } else if (turnoverRangeFilter === '5cr_10cr') {
      list = list.filter((c) => c.totalTurnover >= 50000000 && c.totalTurnover < 100000000);
    } else if (turnoverRangeFilter === '1.5cr_5cr') {
      list = list.filter((c) => c.totalTurnover >= 15000000 && c.totalTurnover < 50000000);
    } else if (turnoverRangeFilter === '50l_1.5cr') {
      list = list.filter((c) => c.totalTurnover >= 5000000 && c.totalTurnover < 15000000);
    } else if (turnoverRangeFilter === '20l_50l') {
      list = list.filter((c) => c.totalTurnover >= 2000000 && c.totalTurnover < 5000000);
    } else if (turnoverRangeFilter === '5l_20l') {
      list = list.filter((c) => c.totalTurnover >= 500000 && c.totalTurnover < 2000000);
    } else if (turnoverRangeFilter === 'lt5l') {
      list = list.filter((c) => c.totalTurnover > 0 && c.totalTurnover < 500000);
    } else if (turnoverRangeFilter === 'nil') {
      list = list.filter((c) => c.totalTurnover === 0);
    } else if (turnoverRangeFilter === 'custom') {
      const min = parseFloat(turnoverCustomMin) || 0;
      const max = parseFloat(turnoverCustomMax) ? parseFloat(turnoverCustomMax) : Infinity;
      list = list.filter((c) => c.totalTurnover >= min && c.totalTurnover <= max);
    }

    // 5. Ascending / Descending Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (turnoverSortField === 'totalTurnover') {
        comparison = a.totalTurnover - b.totalTurnover;
      } else if (turnoverSortField === 'taxableTurnover') {
        comparison = a.taxableTurnover - b.taxableTurnover;
      } else if (turnoverSortField === 'exemptTurnover') {
        comparison = a.exemptTurnover - b.exemptTurnover;
      } else if (turnoverSortField === 'bankTurnover') {
        comparison = a.bankTurnover - b.bankTurnover;
      } else if (turnoverSortField === 'firm_name') {
        comparison = a.firm_name.localeCompare(b.firm_name);
      } else if (turnoverSortField === 'file_no') {
        comparison = (a.file_no || '').localeCompare(b.file_no || '', undefined, { numeric: true });
      } else if (turnoverSortField === 'percentageShare') {
        comparison = a.percentageShare - b.percentageShare;
      }

      return turnoverSortOrder === 'asc' ? comparison : -comparison;
    });

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [
    rawClientTurnovers,
    turnoverStatusFilter,
    turnoverSchemeFilter,
    turnoverSearchTerm,
    turnoverRangeFilter,
    turnoverCustomMin,
    turnoverCustomMax,
    turnoverSortField,
    turnoverSortOrder,
  ]);

  // Executive Summary of Filtered Turnover Set
  const turnoverSummary = useMemo(() => {
    const totalTaxable = filteredSortedClientsTurnover.reduce((sum, c) => sum + c.taxableTurnover, 0);
    const totalExempt = filteredSortedClientsTurnover.reduce((sum, c) => sum + c.exemptTurnover, 0);
    const grandTotal = filteredSortedClientsTurnover.reduce((sum, c) => sum + c.totalTurnover, 0);
    const totalBankTurnover = filteredSortedClientsTurnover.reduce((sum, c) => sum + c.bankTurnover, 0);
    const portfolioShare = annualGrandGstTurnover > 0 ? (grandTotal / annualGrandGstTurnover) * 100 : 0;
    const avgTurnover = filteredSortedClientsTurnover.length > 0 ? grandTotal / filteredSortedClientsTurnover.length : 0;

    let maxTurnover = 0;
    let minTurnover = filteredSortedClientsTurnover.length > 0 ? filteredSortedClientsTurnover[0].totalTurnover : 0;

    filteredSortedClientsTurnover.forEach((c) => {
      if (c.totalTurnover > maxTurnover) maxTurnover = c.totalTurnover;
      if (c.totalTurnover < minTurnover) minTurnover = c.totalTurnover;
    });

    return {
      count: filteredSortedClientsTurnover.length,
      totalTaxable,
      totalExempt,
      grandTotal,
      totalBankTurnover,
      portfolioShare,
      portfolioTotal: annualGrandGstTurnover,
      avgTurnover,
      maxTurnover,
      minTurnover,
    };
  }, [filteredSortedClientsTurnover, annualGrandGstTurnover]);

  // Toggle sort helper
  const handleToggleSort = (
    field: 'totalTurnover' | 'taxableTurnover' | 'exemptTurnover' | 'bankTurnover' | 'firm_name' | 'file_no' | 'percentageShare'
  ) => {
    if (turnoverSortField === field) {
      setTurnoverSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setTurnoverSortField(field);
      setTurnoverSortOrder(field === 'firm_name' || field === 'file_no' ? 'asc' : 'desc');
    }
  };

  // Export handlers for All Clients GST Turnover
  const handleExportTurnoverPDF = () => {
    const exportRows: TopClientExportRow[] = filteredSortedClientsTurnover.map((row) => ({
      rank: row.rank,
      fileNo: row.file_no,
      firmName: row.firm_name,
      clientName: row.client_name,
      gstin: row.gstin,
      scheme: row.scheme,
      taxableTurnover: row.taxableTurnover,
      exemptTurnover: row.exemptTurnover,
      totalTurnover: row.totalTurnover,
      bankTurnover: row.bankTurnover,
      percentageShare: row.percentageShare,
      notes: row.status !== 'active' ? `Status: ${row.status}` : '',
    }));

    const sortOrderLabel = turnoverSortOrder === 'asc' ? 'Ascending' : 'Descending';
    const fieldLabel =
      turnoverSortField === 'totalTurnover'
        ? 'Total GST Turnover'
        : turnoverSortField === 'taxableTurnover'
        ? 'Taxable Sales'
        : turnoverSortField === 'exemptTurnover'
        ? 'Exempt Sales'
        : turnoverSortField === 'bankTurnover'
        ? 'Bank Turnover'
        : turnoverSortField === 'firm_name'
        ? 'Firm Name'
        : turnoverSortField === 'file_no'
        ? 'File Number'
        : 'Portfolio Share';

    const rangeLabel =
      turnoverRangeFilter === 'gt10cr'
        ? 'Turnover > 10 Cr'
        : turnoverRangeFilter === '5cr_10cr'
        ? 'Turnover 5 Cr - 10 Cr'
        : turnoverRangeFilter === '1.5cr_5cr'
        ? 'Turnover 1.5 Cr - 5 Cr'
        : turnoverRangeFilter === '50l_1.5cr'
        ? 'Turnover 50 L - 1.5 Cr'
        : turnoverRangeFilter === '20l_50l'
        ? 'Turnover 20 L - 50 L'
        : turnoverRangeFilter === '5l_20l'
        ? 'Turnover 5 L - 20 L'
        : turnoverRangeFilter === 'lt5l'
        ? 'Turnover < 5 L'
        : turnoverRangeFilter === 'nil'
        ? 'Nil / Zero Turnover'
        : turnoverRangeFilter === 'custom'
        ? `Custom Range (Rs. ${turnoverCustomMin || '0'} - ${turnoverCustomMax || 'Max'})`
        : 'All Turnover Ranges';

    const reportTitle = `All Clients GST Turnover Statement (${rangeLabel} • Sorted by ${fieldLabel} ${sortOrderLabel})`;

    generateTopClientsTurnoverPDF(
      exportRows,
      selectedFY,
      reportTitle,
      turnoverSummary
    );
  };

  const handleExportTurnoverCSV = () => {
    const headers = [
      'Rank',
      'File No',
      'Firm Name',
      'Client / Proprietor Name',
      'GSTIN',
      'GST Scheme',
      'Client Status',
      'Taxable Turnover (Rs.)',
      'Exempt Turnover (Rs.)',
      'Total GST Turnover (Rs.)',
      'Bank Turnover (Rs.)',
      'Share of Portfolio (%)',
    ];

    const rows = filteredSortedClientsTurnover.map((row) => [
      `#${row.rank}`,
      `"${row.file_no || ''}"`,
      `"${row.firm_name.replace(/"/g, '""')}"`,
      `"${(row.client_name || '').replace(/"/g, '""')}"`,
      `"${row.gstin || ''}"`,
      `"${row.scheme}"`,
      `"${row.status}"`,
      row.taxableTurnover.toFixed(2),
      row.exemptTurnover.toFixed(2),
      row.totalTurnover.toFixed(2),
      row.bankTurnover.toFixed(2),
      `${row.percentageShare.toFixed(2)}%`,
    ]);

    // Grand Total Row
    rows.push([
      'TOTAL',
      '',
      `"TOTAL OF ${filteredSortedClientsTurnover.length} FILTERED CLIENTS"`,
      '',
      '',
      '',
      '',
      turnoverSummary.totalTaxable.toFixed(2),
      turnoverSummary.totalExempt.toFixed(2),
      turnoverSummary.grandTotal.toFixed(2),
      turnoverSummary.totalBankTurnover.toFixed(2),
      `${turnoverSummary.portfolioShare.toFixed(2)}%`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Clients_GST_Turnover_${selectedFY.display_name}_${turnoverSortField}_${turnoverSortOrder}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyTurnoverTable = () => {
    const text = filteredSortedClientsTurnover
      .map(
        (c) =>
          `#${c.rank} | File: ${c.file_no || '-'} | ${c.firm_name} | GSTIN: ${c.gstin || 'N/A'} | Taxable: ₹${c.taxableTurnover.toLocaleString('en-IN')} | Exempt: ₹${c.exemptTurnover.toLocaleString('en-IN')} | Total GST: ₹${c.totalTurnover.toLocaleString('en-IN')} | Bank: ₹${c.bankTurnover.toLocaleString('en-IN')} (${c.percentageShare.toFixed(1)}%)`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedTurnoverTooltip(true);
    setTimeout(() => setCopiedTurnoverTooltip(false), 2000);
  };

  // Office visits stats
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const activeInOfficeVisits = useMemo(() => officeVisits.filter((v) => v.status === 'IN'), [officeVisits]);
  const todayVisits = useMemo(() => officeVisits.filter((v) => v.visit_date === todayDateStr), [officeVisits, todayDateStr]);
  const monthVisits = useMemo(
    () => officeVisits.filter((v) => v.financial_year_id === selectedFY.id && v.month === selectedMonth),
    [officeVisits, selectedFY.id, selectedMonth]
  );

  // Urgent Action Required Client List (Challan Pending, Tax Payment Pending, Docs Pending, Bill Pending, Client Response Pending)
  const urgentAttentionClients = useMemo(() => {
    const list: { client: Client; work: MonthlyWork }[] = [];
    activeClients.forEach((c) => {
      const work = workMap.get(c.id);
      if (
        work &&
        [
          'Tax Payment Pending',
          'Challan Generated',
          'Documents Pending',
          'Bill Pending',
          'Client Response Pending',
        ].includes(work.status)
      ) {
        list.push({ client: c, work });
      }
    });
    return list.slice(0, 8);
  }, [activeClients, workMap]);

  // Staff Workload & Performance
  const staffUsers = useMemo(() => users.filter((u) => u.role === 'staff' && u.status === 'active'), [users]);
  const staffWorkloadData = useMemo(() => {
    return staffUsers.map((staff) => {
      const staffClients = activeClients.filter((c) => c.assigned_staff_id === staff.id);
      let sCompleted = 0;
      let sPending = 0;
      let sNotStarted = 0;

      staffClients.forEach((sc) => {
        const rec = workMap.get(sc.id);
        const st = rec ? rec.status : 'Not Started';
        if (st === 'Completed' || st === 'Nil Filed') sCompleted++;
        else if (st === 'Not Started') sNotStarted++;
        else sPending++;
      });

      const compPercent = staffClients.length > 0 ? Math.round((sCompleted / staffClients.length) * 100) : 0;

      return {
        id: staff.id,
        name: staff.name,
        shortName: staff.name.split(' ')[0],
        mobile: staff.mobile,
        totalClients: staffClients.length,
        completed: sCompleted,
        pending: sPending,
        notStarted: sNotStarted,
        rate: compPercent,
      };
    });
  }, [staffUsers, activeClients, workMap]);

  // 12-Month Overall Filing Progression
  const trendData = useMemo(() => {
    return FY_MONTHS.map((m) => {
      const monthRecs = monthlyWork.filter(
        (mw) => mw.financial_year_id === selectedFY.id && mw.month === m
      );
      const comp = monthRecs.filter((r) => r.status === 'Completed' || r.status === 'Nil Filed').length;
      const pend = monthRecs.filter(
        (r) => r.status !== 'Completed' && r.status !== 'Nil Filed' && r.status !== 'Not Started'
      ).length;
      return {
        month: m.slice(0, 3),
        fullMonth: m,
        Completed: comp,
        Pending: pend,
      };
    });
  }, [monthlyWork, selectedFY.id]);

  // Global Quick Search Filtered Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return activeClients
      .filter(
        (c) =>
          c.firm_name.toLowerCase().includes(q) ||
          (c.client_name && c.client_name.toLowerCase().includes(q)) ||
          c.gstin.toLowerCase().includes(q) ||
          (c.file_no && c.file_no.toLowerCase().includes(q)) ||
          c.mobile.includes(q)
      )
      .slice(0, 6);
  }, [activeClients, searchQuery]);

  return (
    <div className="space-y-6 pb-8">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Subtle decorative glow accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Top Bar: Subtitle, Live Clock, Financial Year Context */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-700/70">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>CA Executive Operations Command</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold font-mono">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>FY {selectedFY.display_name}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Month: {selectedMonth}</span>
              </span>
            </div>

            {/* In-Office live indicator & Refresh */}
            <div className="flex items-center gap-2.5">
              {activeInOfficeVisits.length > 0 && (
                <button
                  onClick={() => onNavigateTab('office-visits')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-xl border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer animate-pulse"
                  title="View visitors currently in office"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{activeInOfficeVisits.length} In Office Now</span>
                </button>
              )}

              <button
                id="dashboard-refresh-btn"
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-600/60 text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Refresh system metrics and telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Main Title & Executive Quick Action Bar */}
          <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex flex-wrap items-center gap-2 sm:gap-3">
                <span>GST MASTER DASHBOARD</span>
                <span className="text-amber-400 font-bold text-sm sm:text-base lg:text-xl tracking-wide px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30">
                  CA RISHABH JAISWAL & ASSOCIATES
                </span>
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-3xl font-medium leading-relaxed">
                Comprehensive 360° overview of Master Clients, 12-Month GST Turnover, 5-Bank Turnover & Statement Backups, Office Reception Logs, and Filing Pipeline Generated by <span className="text-amber-300 font-bold">Naiyer Iqbal (Mo: 8228069899)</span>.
              </p>
            </div>

            {/* Quick Command Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="cmd-add-client"
                onClick={onOpenAddClient}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition-all hover:translate-y-[-1px] cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Client</span>
              </button>

              <button
                id="cmd-record-visit"
                onClick={() => onNavigateTab('office-visits')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all hover:translate-y-[-1px] cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Visitor Entry</span>
              </button>

              <button
                id="cmd-monthly-work"
                onClick={() => onNavigateTab('monthly-work')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl font-bold text-xs border border-slate-600 transition-all cursor-pointer"
              >
                <FileCheck className="w-4 h-4 text-amber-400" />
                <span>Monthly Work</span>
              </button>

              <button
                id="cmd-turnover-entry"
                onClick={() => onNavigateTab('gst-turnover-entry')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl font-bold text-xs border border-slate-600 transition-all cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>12M Turnover</span>
              </button>
            </div>
          </div>

          {/* Quick Progress Strip */}
          <div className="mt-6 pt-4 border-t border-slate-700/60 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-300 font-semibold">Monthly Filing ({selectedMonth}):</span>
              <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className="font-extrabold text-emerald-400 font-mono">{completionRate}%</span>
            </div>

            <div className="text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                <strong className="text-white">{totalFiledOrDone}</strong> of{' '}
                <strong className="text-white">{activeClients.length}</strong> Clients Filed
              </span>
            </div>

            <div className="text-slate-300 flex items-center gap-2 md:justify-end">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>
                <strong className="text-amber-400">{totalPendingAction}</strong> Pending Work Action Items
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. UNIVERSAL QUICK SEARCH & JUMP BAR */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            id="dashboard-client-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Universal Client Search: Type Firm Name, GSTIN, Owner Name, Mobile or File # to quickly navigate..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Search Instant Results Drawer */}
        {searchResults.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {searchResults.map((c) => {
              const currentStatus = workMap.get(c.id)?.status || 'Not Started';
              const scheme = getSchemeCategory(c.gst_type);
              return (
                <div
                  key={c.id}
                  className="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl transition-all flex flex-col justify-between gap-2 text-xs group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 group-hover:text-blue-700 truncate">
                        {c.firm_name}
                      </span>
                      {c.file_no && (
                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 font-mono text-[10px] font-bold rounded">
                          #{c.file_no}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{c.gstin}</div>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-200/60 text-[10px]">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        scheme === 'Normal'
                          ? 'bg-blue-100 text-blue-800'
                          : scheme === 'Composition'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {scheme}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onNavigateTab('monthly-work')}
                        className="px-2 py-0.5 bg-white text-blue-700 hover:bg-blue-600 hover:text-white rounded border border-blue-200 font-bold transition-colors cursor-pointer"
                        title="Open in Monthly Work Tracker"
                      >
                        Filing
                      </button>
                      <button
                        onClick={() => onNavigateTab('gst-turnover-entry')}
                        className="px-2 py-0.5 bg-white text-amber-800 hover:bg-amber-600 hover:text-white rounded border border-amber-200 font-bold transition-colors cursor-pointer"
                        title="Open in 12M Turnover"
                      >
                        Sales
                      </button>
                      <button
                        onClick={() => onNavigateTab('bank-turnover')}
                        className="px-2 py-0.5 bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white rounded border border-indigo-200 font-bold transition-colors cursor-pointer"
                        title="Open in Bank Accounts"
                      >
                        Bank
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. EXECUTIVE 7-PILLAR KPI METRIC RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Metric 1: Total Master Clients */}
        <div
          id="kpi-master-clients"
          onClick={() => onNavigateTab('clients')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Clients</span>
              <Users className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-blue-600">
              {activeClients.length}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-blue-700 font-bold">Norm: {normalClients.length}</span>
            <span className="text-purple-700 font-bold">Cmp: {compositionClients.length}</span>
          </div>
        </div>

        {/* Metric 2: Completed / Filed Returns */}
        <div
          id="kpi-completed-filings"
          onClick={() => onNavigateTab('monthly-work', 'Completed')}
          className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 hover:border-emerald-400 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-emerald-800 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Filed / Done</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-emerald-900">
              {totalFiledOrDone}
            </div>
          </div>
          <div className="text-[10px] text-emerald-700 font-bold mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between">
            <span>{completionRate}% of active</span>
            <span className="text-teal-800">Nil: {nilFiled}</span>
          </div>
        </div>

        {/* Metric 3: Total Pending Backlog */}
        <div
          id="kpi-pending-backlog"
          onClick={() => onNavigateTab('monthly-work', 'Pending')}
          className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 hover:border-amber-400 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-amber-800 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Pending</span>
              <AlertCircle className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-amber-900">
              {totalPendingAction}
            </div>
          </div>
          <div className="text-[10px] text-amber-700 font-bold mt-2 pt-2 border-t border-amber-200/60 truncate">
            Requires follow-up
          </div>
        </div>

        {/* Metric 4: Tax Payment Pending (Challan) */}
        <div
          id="kpi-tax-pending"
          onClick={() => onNavigateTab('monthly-work', 'Tax Payment Pending')}
          className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200 hover:border-rose-400 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-rose-800 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tax Pending</span>
              <Flame className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-rose-900">
              {taxPaymentPending}
            </div>
          </div>
          <div className="text-[10px] text-rose-700 font-bold mt-2 pt-2 border-t border-rose-200/60 truncate">
            Challan payment
          </div>
        </div>

        {/* Metric 5: Annual GST Turnover (FY) */}
        <div
          id="kpi-gst-turnover"
          onClick={() => onNavigateTab('gst-turnover-entry')}
          className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#D4C3A3] hover:border-[#78350F] shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-[#78350F] mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">GST Sales (FY)</span>
              <Calculator className="w-4 h-4 text-[#78350F] group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-[#78350F] truncate" title={formatFullINR(annualGrandGstTurnover)}>
              {formatINR(annualGrandGstTurnover)}
            </div>
          </div>
          <div className="text-[10px] text-[#78350F] font-bold mt-2 pt-2 border-t border-[#D4C3A3]/60 flex items-center justify-between truncate">
            <span>{selectedMonth.slice(0, 3)}: {formatINR(selectedMonthGstTotal)}</span>
            <span className="text-[9px] text-[#78350F]/70 uppercase">FY Total</span>
          </div>
        </div>

        {/* Metric 6: Bank Turnover & Accounts */}
        <div
          id="kpi-bank-turnover"
          onClick={() => onNavigateTab('bank-turnover')}
          className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200 hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-indigo-800 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Bank Turnover</span>
              <Landmark className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-indigo-900 truncate" title={formatFullINR(annualBankTotal)}>
              {formatINR(annualBankTotal)}
            </div>
          </div>
          <div className="text-[10px] text-indigo-700 font-bold mt-2 pt-2 border-t border-indigo-200/60 flex items-center justify-between truncate">
            <span>{selectedMonth.slice(0, 3)}: {formatINR(selectedMonthBankTotal)}</span>
            <span>{bankAccounts.length} A/C</span>
          </div>
        </div>

        {/* Metric 7: In-Office Visitors / Walk-Ins */}
        <div
          id="kpi-office-visits"
          onClick={() => onNavigateTab('office-visits')}
          className="bg-cyan-50/50 p-4 rounded-2xl border border-cyan-200 hover:border-cyan-400 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between col-span-2 sm:col-span-1"
        >
          <div>
            <div className="flex items-center justify-between text-cyan-900 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Reception</span>
              <Building2 className="w-4 h-4 text-cyan-700 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-cyan-900 flex items-center gap-1.5">
              <span>{activeInOfficeVisits.length}</span>
              <span className="text-xs font-bold text-cyan-700">IN</span>
            </div>
          </div>
          <div className="text-[10px] text-cyan-800 font-bold mt-2 pt-2 border-t border-cyan-200/60 flex items-center justify-between">
            <span>Today: {todayVisits.length}</span>
            <span>Month: {monthVisits.length}</span>
          </div>
        </div>
      </div>

      {/* 4. WORKSPACE TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveWorkspaceTab('compliance')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeWorkspaceTab === 'compliance'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>GST Compliance & Schemes ({selectedMonth})</span>
        </button>

        <button
          onClick={() => setActiveWorkspaceTab('gst-turnover-list')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeWorkspaceTab === 'gst-turnover-list'
              ? 'bg-[#78350F] text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-300" />
          <span>All Clients GST Turnover</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              activeWorkspaceTab === 'gst-turnover-list'
                ? 'bg-amber-400/20 text-amber-200'
                : 'bg-amber-100 text-[#78350F]'
            }`}
          >
            Asc / Desc Sort
          </span>
        </button>

        <button
          onClick={() => setActiveWorkspaceTab('visitors')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeWorkspaceTab === 'visitors'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Reception & Visitor Register</span>
          {activeInOfficeVisits.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveWorkspaceTab('staff')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeWorkspaceTab === 'staff'
              ? 'bg-indigo-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCog className="w-4 h-4" />
          <span>Staff Workload & Performance</span>
        </button>

        <button
          onClick={() => setActiveWorkspaceTab('audit')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeWorkspaceTab === 'audit'
              ? 'bg-slate-800 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit Log & System Activity</span>
        </button>
      </div>

      {/* 5. TAB VIEW CONTENTS */}

      {/* TAB A: GST COMPLIANCE & FILINGS */}
      {activeWorkspaceTab === 'compliance' && (
        <div className="space-y-6">
          {/* Taxpayer Scheme Breakdown (Normal vs Composition vs QRMP) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Normal Scheme Card */}
            <div
              id="scheme-card-normal"
              onClick={() => onNavigateTab('monthly-work', 'all', 'Normal')}
              className="p-5 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/60 to-white hover:border-blue-400 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white uppercase tracking-wider">
                    Normal / Regular
                  </span>
                  <span className="text-xs font-bold text-blue-800">
                    {normalClients.length > 0 ? ((normalClients.length / (activeClients.length || 1)) * 100).toFixed(0) : 0}% Portfolio
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-black text-slate-900 group-hover:text-blue-700">
                    {normalClients.length}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Taxpayers</span>
                </div>
                <div className="text-xs text-slate-600 font-medium mt-1">
                  Monthly GSTR-1 & GSTR-3B Filings
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-blue-200/70">
                <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-700">Filing Rate:</span>
                  <span className="text-blue-700">{normalStats.rate}% ({normalStats.done}/{normalClients.length})</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${normalStats.rate}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-bold">
                  <span className="text-emerald-700">✓ {normalStats.done} Filed</span>
                  <span className="text-amber-700">⏳ {normalStats.pend} Pending</span>
                  <span className="text-slate-500">○ {normalStats.unstarted} Not Started</span>
                </div>
              </div>
            </div>

            {/* Composition Scheme Card */}
            <div
              id="scheme-card-composition"
              onClick={() => onNavigateTab('monthly-work', 'all', 'Composition')}
              className="p-5 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/60 to-white hover:border-purple-400 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-purple-600 text-white uppercase tracking-wider">
                    Composition Scheme
                  </span>
                  <span className="text-xs font-bold text-purple-800">
                    {compositionClients.length > 0 ? ((compositionClients.length / (activeClients.length || 1)) * 100).toFixed(0) : 0}% Portfolio
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-black text-slate-900 group-hover:text-purple-700">
                    {compositionClients.length}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Taxpayers</span>
                </div>
                <div className="text-xs text-slate-600 font-medium mt-1">
                  Quarterly CMP-08 & Annual GSTR-4
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-purple-200/70">
                <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-700">Filing Rate:</span>
                  <span className="text-purple-700">{compStats.rate}% ({compStats.done}/{compositionClients.length})</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full transition-all" style={{ width: `${compStats.rate}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-bold">
                  <span className="text-emerald-700">✓ {compStats.done} Filed</span>
                  <span className="text-amber-700">⏳ {compStats.pend} Pending</span>
                  <span className="text-slate-500">○ {compStats.unstarted} Not Started</span>
                </div>
              </div>
            </div>

            {/* QRMP Scheme Card */}
            <div
              id="scheme-card-qrmp"
              onClick={() => onNavigateTab('monthly-work', 'all', 'QRMP')}
              className="p-5 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/60 to-white hover:border-orange-400 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-orange-600 text-white uppercase tracking-wider">
                    QRMP Scheme
                  </span>
                  <span className="text-xs font-bold text-orange-800">
                    {qrmpClients.length > 0 ? ((qrmpClients.length / (activeClients.length || 1)) * 100).toFixed(0) : 0}% Portfolio
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-black text-slate-900 group-hover:text-orange-700">
                    {qrmpClients.length}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Taxpayers</span>
                </div>
                <div className="text-xs text-slate-600 font-medium mt-1">
                  Quarterly Return + Monthly Payment (IFF)
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-orange-200/70">
                <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-700">Filing Rate:</span>
                  <span className="text-orange-700">{qrmpStats.rate}% ({qrmpStats.done}/{qrmpClients.length})</span>
                </div>
                <div className="w-full bg-orange-200 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-orange-600 h-full rounded-full transition-all" style={{ width: `${qrmpStats.rate}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-bold">
                  <span className="text-emerald-700">✓ {qrmpStats.done} Filed</span>
                  <span className="text-amber-700">⏳ {qrmpStats.pend} Pending</span>
                  <span className="text-slate-500">○ {qrmpStats.unstarted} Not Started</span>
                </div>
              </div>
            </div>
          </div>

          {/* Urgent Attention Action Queue & Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Urgent Attention Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Urgent Action Required Queue ({urgentAttentionClients.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tax payment blockers, documents pending, and action follow-ups for {selectedMonth}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('monthly-work', 'Pending')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Open Full Tracker</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {urgentAttentionClients.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-y border-slate-100">
                      <tr>
                        <th className="px-3 py-2.5">File #</th>
                        <th className="px-3 py-2.5">Firm / Client Name</th>
                        <th className="px-3 py-2.5">GSTIN</th>
                        <th className="px-3 py-2.5">Status Blocker</th>
                        <th className="px-3 py-2.5">Contact / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {urgentAttentionClients.map(({ client, work }) => (
                        <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-700">
                            #{client.file_no || '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-900">{client.firm_name}</div>
                            <div className="text-[10px] text-slate-500">{client.client_name}</div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600 text-[11px]">
                            {client.gstin}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                work.status === 'Tax Payment Pending'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : work.status === 'Challan Generated'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : work.status === 'Documents Pending'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-orange-100 text-orange-800 border border-orange-300'
                              }`}
                            >
                              {work.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {client.mobile && (
                                <a
                                  href={`tel:${client.mobile}`}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg border border-emerald-200 transition-colors"
                                  title={`Call ${client.mobile}`}
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                onClick={() => onNavigateTab('monthly-work')}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                Update Status
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700">No Critical Blockers</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">All pending tasks are progressing smoothly for this month.</p>
                </div>
              )}
            </div>

            {/* Work Stages Pipeline Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
                  Monthly Work Pipeline ({selectedMonth})
                </h3>
                <p className="text-xs text-slate-500 mb-4">Stage distribution across all {activeClients.length} active clients</p>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Completed / Filed</span>
                    </span>
                    <span className="font-mono font-black text-emerald-800">{completed}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-teal-50 border border-teal-100 text-xs">
                    <span className="font-bold text-teal-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-teal-600" />
                      <span>Nil Filed</span>
                    </span>
                    <span className="font-mono font-black text-teal-800">{nilFiled}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-xs">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-600" />
                      <span>RCM PAY</span>
                    </span>
                    <span className="font-mono font-black text-indigo-800">{rcmPay}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-100 text-xs">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Data Received</span>
                    </span>
                    <span className="font-mono font-black text-blue-800">{dataReceived}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 border border-rose-100 text-xs">
                    <span className="font-bold text-rose-900 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-600" />
                      <span>Tax Payment Pending</span>
                    </span>
                    <span className="font-mono font-black text-rose-800">{taxPaymentPending}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Not Started</span>
                    </span>
                    <span className="font-mono font-black text-slate-800">{notStarted}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('monthly-work')}
                className="mt-4 w-full py-2.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl font-bold text-xs border border-blue-200 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Manage Monthly Compliance Work</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: ALL CLIENTS GST TURNOVER LIST (TURNOVER-WISE & ASC/DESC SORTING) */}
      {activeWorkspaceTab === 'gst-turnover-list' && (
        <div className="space-y-6">
          {/* 1. Command Header & Export Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF6F0] text-[#78350F] flex items-center justify-center font-bold border border-[#D4C3A3] shadow-xs">
                    <Calculator className="w-5 h-5 text-[#78350F]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <span>All Clients GST Turnover List</span>
                      <span className="px-2 py-0.5 rounded-md bg-[#FAF6F0] text-[#78350F] border border-[#D4C3A3] text-xs font-bold">
                        FY {selectedFY.display_name}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Turnover-wise client statements with Ascending (Low to High) & Descending (High to Low) sorting
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportTurnoverPDF}
                  className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Generate official Clients Turnover PDF Report"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export PDF Report</span>
                </button>

                <button
                  onClick={handleExportTurnoverCSV}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Export filtered clients to CSV / Excel spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel / CSV</span>
                </button>

                <button
                  onClick={handleCopyTurnoverTable}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer relative"
                  title="Copy formatted turnover table to clipboard"
                >
                  {copiedTurnoverTooltip ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>

                {(turnoverSearchTerm ||
                  turnoverSchemeFilter !== 'all' ||
                  turnoverRangeFilter !== 'all' ||
                  turnoverStatusFilter !== 'active' ||
                  turnoverSortField !== 'totalTurnover' ||
                  turnoverSortOrder !== 'desc') && (
                  <button
                    onClick={() => {
                      setTurnoverSearchTerm('');
                      setTurnoverSchemeFilter('all');
                      setTurnoverRangeFilter('all');
                      setTurnoverCustomMin('');
                      setTurnoverCustomMax('');
                      setTurnoverStatusFilter('active');
                      setTurnoverSortField('totalTurnover');
                      setTurnoverSortOrder('desc');
                    }}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Reset all filters and sorting"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Sort Controls Grid */}
            <div className="space-y-3 pt-1">
              {/* Row 1: Primary Search, Scheme, Status, Sort Field, and Asc/Desc Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
                {/* Search */}
                <div className="lg:col-span-4 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={turnoverSearchTerm}
                    onChange={(e) => setTurnoverSearchTerm(e.target.value)}
                    placeholder="Search by Firm, Client Name, GSTIN, File #..."
                    className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-[#78350F]"
                  />
                  {turnoverSearchTerm && (
                    <button
                      onClick={() => setTurnoverSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* GST Scheme */}
                <div className="lg:col-span-2">
                  <select
                    value={turnoverSchemeFilter}
                    onChange={(e) => setTurnoverSchemeFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden focus:border-[#78350F]"
                  >
                    <option value="all">All GST Schemes</option>
                    <option value="Normal">Normal / Regular</option>
                    <option value="Composition">Composition (CMP-08)</option>
                    <option value="QRMP">QRMP Scheme</option>
                  </select>
                </div>

                {/* Client Status */}
                <div className="lg:col-span-2">
                  <select
                    value={turnoverStatusFilter}
                    onChange={(e) => setTurnoverStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden focus:border-[#78350F]"
                  >
                    <option value="active">Active Clients ({activeClients.length})</option>
                    <option value="all">All Clients ({clients.length})</option>
                    <option value="inactive">Inactive Only ({inactiveClientsCount})</option>
                  </select>
                </div>

                {/* Sort By Field */}
                <div className="lg:col-span-2">
                  <select
                    value={turnoverSortField}
                    onChange={(e) => setTurnoverSortField(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#FAF6F0] border border-[#D4C3A3] text-[#78350F] rounded-xl text-xs font-bold focus:outline-hidden"
                  >
                    <option value="totalTurnover">Sort: Total GST Turnover</option>
                    <option value="taxableTurnover">Sort: Taxable Turnover</option>
                    <option value="exemptTurnover">Sort: Exempt Turnover</option>
                    <option value="bankTurnover">Sort: Bank Turnover</option>
                    <option value="percentageShare">Sort: Portfolio Share (%)</option>
                    <option value="firm_name">Sort: Firm Name (A-Z)</option>
                    <option value="file_no">Sort: File / Ledger No.</option>
                  </select>
                </div>

                {/* Ascending / Descending Toggle Button */}
                <div className="lg:col-span-2">
                  <button
                    onClick={() => setTurnoverSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs border ${
                      turnoverSortOrder === 'desc'
                        ? 'bg-[#78350F] text-white border-[#78350F] hover:bg-[#5C290C]'
                        : 'bg-indigo-700 text-white border-indigo-700 hover:bg-indigo-800'
                    }`}
                    title="Click to toggle Ascending (Low to High) / Descending (High to Low)"
                  >
                    {turnoverSortOrder === 'desc' ? (
                      <>
                        <ArrowDown className="w-3.5 h-3.5 text-amber-300" />
                        <span>High to Low (Desc ⬇️)</span>
                      </>
                    ) : (
                      <>
                        <ArrowUp className="w-3.5 h-3.5 text-indigo-200" />
                        <span>Low to High (Asc ⬆️)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Row 2: Turnover Wise Range Filter Pills */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span>Turnover Wise:</span>
                  </span>

                  <button
                    onClick={() => setTurnoverRangeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      turnoverRangeFilter === 'all'
                        ? 'bg-[#FAF6F0] text-[#78350F] border border-[#D4C3A3] shadow-2xs ring-2 ring-[#78350F]/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    All Clients ({rawClientTurnovers.length})
                  </button>

                  <button
                    onClick={() => setTurnoverRangeFilter('gt10cr')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      turnoverRangeFilter === 'gt10cr'
                        ? 'bg-[#FAF6F0] text-[#78350F] border border-[#D4C3A3] shadow-2xs ring-2 ring-[#78350F]/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    &gt; ₹10 Cr
                  </button>

                  <button
                    onClick={() => setTurnoverRangeFilter('5cr_10cr')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      turnoverRangeFilter === '5cr_10cr'
                        ? 'bg-[#FAF6F0] text-[#78350F] border border-[#D4C3A3] shadow-2xs ring-2 ring-[#78350F]/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    ₹5 Cr - ₹10 Cr
                  </button>

                  <button
                    onClick={() => setTurnoverRangeFilter('1.5cr_5cr')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      turnoverRangeFilter === '1.5cr_5cr'
                        ? 'bg-[#FAF6F0] text-[#78350F] border border-[#D4C3A3] shadow-2xs ring-2 ring-[#78350F]/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    ₹1.5 Cr - ₹5 Cr
                  </button>

                  <button
                    onClick={() => setTurnoverRangeFilter('50l_1.5cr')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      turnoverRangeFilter === '50l_1.5cr'
                        ? 'bg-[#FAF6F0] text-[#78350F] border border-[#D4C3A3] shadow-2xs ring-2 ring-[#78350F]/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    ₹50 L - ₹1.5 Cr
                  </button>

                  <button
                    onClick={() => setTurnoverRangeFilter('20l_50l')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      turnoverRangeFilter === '20l_50l'
                        ? 'bg-[#FAF6F0] text-[#78350F] border border-[#D4C3A3] shadow-2xs ring-2 ring-[#78350F]/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    ₹20 L - ₹50 L
                  </button>

                  <button
                    onClick={() => setTurnoverRangeFilter('5l_20l')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      turnoverRangeFilter === '5l_20l'
                        ? 'bg-[#FAF6F0] text-[#78350F] border border-[#D4C3A3] shadow-2xs ring-2 ring-[#78350F]/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    ₹5 L - ₹20 L
                  </button>

                  <button
                    onClick={() => setTurnoverRangeFilter('lt5l')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      turnoverRangeFilter === 'lt5l'
                        ? 'bg-[#FAF6F0] text-[#78350F] border border-[#D4C3A3] shadow-2xs ring-2 ring-[#78350F]/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    &lt; ₹5 L
                  </button>

                  <button
                    onClick={() => setTurnoverRangeFilter('nil')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      turnoverRangeFilter === 'nil'
                        ? 'bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs ring-2 ring-rose-500/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Nil (₹0)
                  </button>

                  <button
                    onClick={() => setTurnoverRangeFilter('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      turnoverRangeFilter === 'custom'
                        ? 'bg-blue-50 text-blue-800 border border-blue-300 shadow-2xs ring-2 ring-blue-600/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Custom Range</span>
                  </button>
                </div>

                {/* Custom Min / Max Range Inputs */}
                {turnoverRangeFilter === 'custom' && (
                  <div className="mt-2.5 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-blue-900">Custom Turnover Bounds:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-600 font-medium">Min ₹</span>
                      <input
                        type="number"
                        value={turnoverCustomMin}
                        onChange={(e) => setTurnoverCustomMin(e.target.value)}
                        placeholder="0"
                        className="w-28 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:border-blue-600"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-600 font-medium">Max ₹</span>
                      <input
                        type="number"
                        value={turnoverCustomMax}
                        onChange={(e) => setTurnoverCustomMax(e.target.value)}
                        placeholder="Unlimited"
                        className="w-32 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:border-blue-600"
                      />
                    </div>
                    {(turnoverCustomMin || turnoverCustomMax) && (
                      <button
                        onClick={() => {
                          setTurnoverCustomMin('');
                          setTurnoverCustomMax('');
                        }}
                        className="text-xs text-blue-700 hover:underline font-bold ml-auto cursor-pointer"
                      >
                        Clear Bounds
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Executive KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtered Clients Count */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Filtered Clients</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {filteredSortedClientsTurnover.length}
                <span className="text-xs font-bold text-slate-400 ml-1">/ {clients.length}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-medium">
                <span>
                  Sort: {turnoverSortOrder === 'asc' ? 'Ascending ⬆️' : 'Descending ⬇️'}
                </span>
                <span className="text-blue-600 font-bold">
                  {turnoverRangeFilter.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Taxable Turnover */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Taxable Turnover</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-black text-blue-900 font-mono">
                {formatINR(turnoverSummary.totalTaxable)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                {formatFullINR(turnoverSummary.totalTaxable)}
              </div>
            </div>

            {/* Grand Total GST Turnover & Portfolio Share */}
            <div className="bg-gradient-to-br from-[#FAF6F0] to-[#F5EBE1] rounded-2xl p-4 border border-[#D4C3A3] shadow-2xs">
              <div className="flex items-center justify-between text-[#78350F] mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Grand Total GST Turnover</span>
                <span className="px-2 py-0.5 rounded-md bg-[#78350F] text-white text-[10px] font-black">
                  {turnoverSummary.portfolioShare.toFixed(1)}% FIRM
                </span>
              </div>
              <div className="text-xl font-black text-[#78350F] font-mono">
                {formatINR(turnoverSummary.grandTotal)}
              </div>
              <div className="text-[11px] text-[#78350F]/80 mt-1 font-mono">
                {formatFullINR(turnoverSummary.grandTotal)}
              </div>
            </div>

            {/* Bank Turnover & Stats */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Bank Turnover (5 A/C)</span>
                <Landmark className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl font-black text-indigo-900 font-mono">
                {formatINR(turnoverSummary.totalBankTurnover)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Avg: {formatINR(turnoverSummary.avgTurnover)}</span>
                <span>Max: {formatINR(turnoverSummary.maxTurnover)}</span>
              </div>
            </div>
          </div>

          {/* 3. Comprehensive Clients GST Turnover Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#78350F]" />
                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                  Client GST Turnover Register ({filteredSortedClientsTurnover.length} Records)
                </span>
                <span className="text-xs text-slate-500">
                  • Click any header to sort
                </span>
              </div>

              <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
                <span>Sort Order:</span>
                <span className={`px-2 py-0.5 rounded-md font-bold ${
                  turnoverSortOrder === 'desc' ? 'bg-[#FAF6F0] text-[#78350F] border border-[#D4C3A3]' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {turnoverSortOrder === 'desc' ? 'High to Low (Desc ⬇️)' : 'Low to High (Asc ⬆️)'}
                </span>
              </div>
            </div>

            {filteredSortedClientsTurnover.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200 select-none">
                    <tr>
                      {/* Rank */}
                      <th className="px-4 py-3.5 text-center w-14">#</th>

                      {/* File # */}
                      <th
                        onClick={() => handleToggleSort('file_no')}
                        className="px-4 py-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>File #</span>
                          {turnoverSortField === 'file_no' ? (
                            turnoverSortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#78350F]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#78350F]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </th>

                      {/* Client / Trade Name */}
                      <th
                        onClick={() => handleToggleSort('firm_name')}
                        className="px-4 py-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors min-w-[220px]"
                      >
                        <div className="flex items-center gap-1">
                          <span>Firm & Client Name</span>
                          {turnoverSortField === 'firm_name' ? (
                            turnoverSortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#78350F]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#78350F]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </th>

                      {/* GSTIN & Scheme */}
                      <th className="px-4 py-3.5">GSTIN / Scheme</th>

                      {/* Taxable Turnover */}
                      <th
                        onClick={() => handleToggleSort('taxableTurnover')}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Taxable Sales (₹)</span>
                          {turnoverSortField === 'taxableTurnover' ? (
                            turnoverSortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#78350F]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#78350F]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </th>

                      {/* Exempt Turnover */}
                      <th
                        onClick={() => handleToggleSort('exemptTurnover')}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Exempt Sales (₹)</span>
                          {turnoverSortField === 'exemptTurnover' ? (
                            turnoverSortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#78350F]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#78350F]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </th>

                      {/* Total GST Turnover */}
                      <th
                        onClick={() => handleToggleSort('totalTurnover')}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-amber-100/70 transition-colors bg-[#FAF6F0]/60"
                      >
                        <div className="flex items-center justify-end gap-1 text-[#78350F]">
                          <span>Total GST Turnover (₹)</span>
                          {turnoverSortField === 'totalTurnover' ? (
                            turnoverSortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#78350F]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#78350F]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </th>

                      {/* Bank Turnover */}
                      <th
                        onClick={() => handleToggleSort('bankTurnover')}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-200/70 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Bank Turnover (₹)</span>
                          {turnoverSortField === 'bankTurnover' ? (
                            turnoverSortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#78350F]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#78350F]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </th>

                      {/* Portfolio Share */}
                      <th
                        onClick={() => handleToggleSort('percentageShare')}
                        className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-200/70 transition-colors"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Share %</span>
                          {turnoverSortField === 'percentageShare' ? (
                            turnoverSortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#78350F]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#78350F]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </th>

                      {/* Quick Actions */}
                      <th className="px-4 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredSortedClientsTurnover.map((row) => {
                      const maxTurnoverInSet = turnoverSummary.maxTurnover || 1;
                      const relativeBarWidth = (row.totalTurnover / maxTurnoverInSet) * 100;

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Rank / Serial */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs inline-flex items-center justify-center font-mono">
                              {row.rank}
                            </span>
                          </td>

                          {/* File # */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-1 rounded-md bg-slate-100 font-mono text-slate-700 font-bold text-[11px]">
                              {row.file_no || '-'}
                            </span>
                          </td>

                          {/* Firm & Client Name */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {row.firm_name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              {row.client_name && <span>{row.client_name}</span>}
                              {row.mobile && <span>• {row.mobile}</span>}
                              {row.status !== 'active' && (
                                <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-sm text-[9px] font-bold uppercase">
                                  {row.status}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* GSTIN & Scheme */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-mono text-[11px] font-bold text-slate-700">
                              {row.gstin || 'N/A'}
                            </div>
                            <div className="mt-0.5">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  row.scheme === 'Composition'
                                    ? 'bg-amber-100 text-amber-800'
                                    : row.scheme === 'QRMP'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {row.scheme}
                              </span>
                            </div>
                          </td>

                          {/* Taxable Turnover */}
                          <td className="px-4 py-3 text-right font-mono text-slate-800 font-semibold whitespace-nowrap">
                            <div>{formatINR(row.taxableTurnover)}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {formatFullINR(row.taxableTurnover)}
                            </div>
                          </td>

                          {/* Exempt Turnover */}
                          <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                            <div>{formatINR(row.exemptTurnover)}</div>
                            <div className="text-[10px] text-emerald-600/70 font-normal">
                              {formatFullINR(row.exemptTurnover)}
                            </div>
                          </td>

                          {/* Total GST Turnover & Relative Bar */}
                          <td className="px-4 py-3 text-right whitespace-nowrap bg-[#FAF6F0]/40">
                            <div className="font-mono font-black text-[#78350F] text-xs sm:text-sm">
                              {formatINR(row.totalTurnover)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {formatFullINR(row.totalTurnover)}
                            </div>
                            <div className="mt-1 w-24 ml-auto bg-amber-100 rounded-full h-1 overflow-hidden">
                              <div
                                className="bg-[#78350F] h-1 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, relativeBarWidth))}%` }}
                              />
                            </div>
                          </td>

                          {/* Bank Turnover */}
                          <td className="px-4 py-3 text-right font-mono text-indigo-900 font-semibold whitespace-nowrap">
                            <div>{formatINR(row.bankTurnover)}</div>
                            <div className="text-[10px] text-indigo-600/70 font-normal">
                              5 Accounts
                            </div>
                          </td>

                          {/* Portfolio Share */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold font-mono text-xs">
                              {row.percentageShare.toFixed(1)}%
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onNavigateTab('gst-turnover-entry')}
                                className="px-2.5 py-1 bg-[#FAF6F0] hover:bg-[#78350F] text-[#78350F] hover:text-white border border-[#D4C3A3] rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                                title="View Full 12-Month Matrix"
                              >
                                Matrix
                              </button>
                              <button
                                onClick={() => onNavigateTab('bank-turnover')}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-700 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                                title="View Bank Accounts & Turnover"
                              >
                                Bank
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Grand Total Summary Footer */}
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                    <tr>
                      <td colSpan={4} className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="uppercase text-[11px] font-black text-slate-700">
                            TOTAL ({filteredSortedClientsTurnover.length} CLIENTS)
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Firm Total: {formatINR(annualGrandGstTurnover)})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-blue-900">
                        {formatINR(turnoverSummary.totalTaxable)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-900">
                        {formatINR(turnoverSummary.totalExempt)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-[#78350F] text-sm bg-[#FAF6F0]">
                        {formatINR(turnoverSummary.grandTotal)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-indigo-900">
                        {formatINR(turnoverSummary.totalBankTurnover)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2 py-1 rounded-md bg-[#FAF6F0] text-[#78350F] font-black text-xs border border-[#D4C3A3]">
                          {turnoverSummary.portfolioShare.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={handleExportTurnoverPDF}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50">
                <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">No Clients Match Filter</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Adjust your search terms, GST scheme filter, or turnover range bounds.
                </p>
                <button
                  onClick={() => {
                    setTurnoverSearchTerm('');
                    setTurnoverSchemeFilter('all');
                    setTurnoverRangeFilter('all');
                    setTurnoverCustomMin('');
                    setTurnoverCustomMax('');
                    setTurnoverStatusFilter('active');
                  }}
                  className="mt-4 px-4 py-2 bg-[#78350F] hover:bg-[#5C290C] text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB C: RECEPTION & VISITOR REGISTER */}
      {activeWorkspaceTab === 'visitors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Reception Walk-Ins & Consultation Register</span>
                  {activeInOfficeVisits.length > 0 && (
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs border border-emerald-300 animate-pulse">
                      {activeInOfficeVisits.length} In Office
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Track in-office client consultations, document drop-offs, and in/out timings
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab('office-visits')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>+ Record Entry</span>
                </button>

                <button
                  onClick={() => onNavigateTab('office-visits')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <span>Full Register ({officeVisits.length})</span>
                </button>
              </div>
            </div>

            {/* Active In-Office Visitors Spotlight */}
            {activeInOfficeVisits.length > 0 && (
              <div className="mb-6 p-4 bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>VISITORS CURRENTLY IN CA OFFICE</span>
                  </span>
                  <span className="text-xs text-emerald-700 font-bold">Active Consultations</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeInOfficeVisits.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{v.firm_name}</div>
                        <div className="text-[11px] text-slate-600">{v.client_name} • {v.mobile}</div>
                        <div className="mt-1 inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">
                          {v.purpose}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-700 font-mono font-bold">In: {v.in_time}</span>
                        <button
                          onClick={() => onNavigateTab('office-visits')}
                          className="text-emerald-700 hover:text-emerald-900 font-bold underline"
                        >
                          Mark OUT →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Log Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-y border-slate-100">
                  <tr>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Firm / Visitor Name</th>
                    <th className="px-3 py-2.5">Purpose</th>
                    <th className="px-3 py-2.5">In / Out Time</th>
                    <th className="px-3 py-2.5">Attended By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {officeVisits.slice(0, 6).map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {v.status === 'IN' ? (
                          <span className="px-2 py-0.5 bg-emerald-500 text-white font-black text-[10px] rounded-full">
                            IN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full">
                            OUT
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono">{v.visit_date}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        <div>{v.firm_name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{v.client_name}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{v.purpose}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">
                        <span className="text-emerald-700 font-bold">{v.in_time}</span>
                        {v.out_time && <span className="text-slate-400"> - {v.out_time}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{v.updated_by_name || 'Staff'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB D: STAFF WORKLOAD & PERFORMANCE */}
      {activeWorkspaceTab === 'staff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffWorkloadData.map((staff) => (
              <div
                key={staff.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{staff.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{staff.mobile || 'Staff Member'}</div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {staff.rate}% Done
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <div className="text-xs font-bold text-slate-500">Assigned</div>
                      <div className="text-lg font-black text-slate-900">{staff.totalClients}</div>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl">
                      <div className="text-xs font-bold text-emerald-700">Filed</div>
                      <div className="text-lg font-black text-emerald-800">{staff.completed}</div>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-xl">
                      <div className="text-xs font-bold text-amber-700">Pending</div>
                      <div className="text-lg font-black text-amber-800">{staff.pending}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${staff.rate}%` }} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('monthly-work')}
                  className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl font-bold text-xs border border-slate-200 transition-colors text-center cursor-pointer"
                >
                  View Assigned Tasks →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB E: AUDIT TRAIL & SYSTEM ACTIVITY */}
      {activeWorkspaceTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  <span>Real-Time System Audit Trail & Telemetry</span>
                </h3>
                <p className="text-xs text-slate-500">Immutable chronological log of all client updates, filings, and exports</p>
              </div>

              <button
                onClick={() => onNavigateTab('activity-logs')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>View Full Audit Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {activityLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 flex items-start justify-between gap-3 text-xs transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {log.user_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        {log.module && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[9px]">
                            {log.module}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5 truncate">{log.description}</p>
                      <div className="text-[10px] text-slate-400 mt-1">
                        By <strong className="text-slate-600">{log.user_name}</strong> ({log.user_role}) • IP: {log.ip_address}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                    {log.created_at}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. SYSTEM MODULES & ALL-MENU SHORTCUTS HUB */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>All System Modules & Direct Navigation</span>
            </h3>
            <p className="text-xs text-slate-500">Instant access to every operational module in the platform</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Master Clients */}
          <div
            onClick={() => onNavigateTab('clients')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Master Clients</div>
                <div className="text-[11px] text-slate-500 font-medium">{activeClients.length} Registered</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between text-blue-600 font-bold">
              <span>Directory & GSTINs</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Office Reception / Walk-ins */}
          <div
            onClick={() => onNavigateTab('office-visits')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Office Visits</div>
                <div className="text-[11px] text-slate-500 font-medium">{activeInOfficeVisits.length} Currently IN</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between text-emerald-600 font-bold">
              <span>Visitor Entry Desk</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Monthly Work Compliance */}
          <div
            onClick={() => onNavigateTab('monthly-work')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Monthly GST Work</div>
                <div className="text-[11px] text-slate-500 font-medium">{completionRate}% Completed</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between text-blue-600 font-bold">
              <span>Filing Tracker</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 12-Month GST Turnover */}
          <div
            onClick={() => onNavigateTab('gst-turnover-entry')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-[#78350F] hover:bg-[#FAF6F0] transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#FAF6F0] text-[#78350F] flex items-center justify-center border border-[#D4C3A3] group-hover:scale-110 transition-transform">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">12M GST Turnover</div>
                <div className="text-[11px] text-slate-500 font-medium">Sales Matrix & PDF</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between text-[#78350F] font-bold">
              <span>Taxable & Exempt</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 5-Bank Turnover */}
          <div
            onClick={() => onNavigateTab('bank-turnover')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Bank Turnover</div>
                <div className="text-[11px] text-slate-500 font-medium">5 Accounts / Client</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between text-indigo-600 font-bold">
              <span>Reconciliation & ZIP</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Reports & PDF */}
          <div
            onClick={() => onNavigateTab('reports')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Reports & PDF</div>
                <div className="text-[11px] text-slate-500 font-medium">Turnover Statements</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between text-blue-600 font-bold">
              <span>Print & Export</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Staff & User Management */}
          <div
            onClick={() => onNavigateTab('users')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCog className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Staff & Users</div>
                <div className="text-[11px] text-slate-500 font-medium">{users.length} Total Users</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between text-purple-600 font-bold">
              <span>Roles & Access</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Activity Logs / Audit */}
          <div
            onClick={() => onNavigateTab('activity-logs')}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Activity Logs</div>
                <div className="text-[11px] text-slate-500 font-medium">{activityLogs.length} Records</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between text-slate-700 font-bold">
              <span>Security Trail</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
