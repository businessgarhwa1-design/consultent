import React, { useState, useEffect } from 'react';
import { User, FinancialYear, FY_MONTHS } from '../types';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Download, 
  LogOut, 
  Menu, 
  ShieldCheck, 
  UserCheck, 
  User as UserIcon,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Radio
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onSwitchUser?: (user: User) => void;
  onLogout: () => void;
  users?: User[];
  financialYears: FinancialYear[];
  selectedFY: FinancialYear;
  onSelectFY: (fy: FinancialYear) => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onToggleSidebar: () => void;
  companyName: string;
  onRefreshPortal?: () => void;
  isRefreshing?: boolean;
}

interface IndiaLiveTime {
  timeStr: string;
  dateStr: string;
  dayStr: string;
  monthStr: string;
  monthShort: string;
  yearStr: string;
  liveFYStr: string;
  liveFullFY: string;
}

function getIndiaLiveTime(): IndiaLiveTime {
  const now = new Date();

  // Time in IST (Asia/Kolkata)
  const timeFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const dayFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  });

  const monthFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'long',
  });

  const monthShortFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
  });

  // Calculate Indian Financial Year (starts 1st April)
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  const yearNum = parseInt(parts.find((p) => p.type === 'year')?.value || '2026', 10);
  const monthNum = parseInt(parts.find((p) => p.type === 'month')?.value || '4', 10);

  const fyStart = monthNum >= 4 ? yearNum : yearNum - 1;
  const fyEnd = fyStart + 1;
  const liveFYStr = `FY ${fyStart}-${String(fyEnd).slice(-2)}`;
  const liveFullFY = `FY ${fyStart}-${fyEnd}`;

  return {
    timeStr: timeFormatter.format(now),
    dateStr: dateFormatter.format(now),
    dayStr: dayFormatter.format(now),
    monthStr: monthFormatter.format(now),
    monthShort: monthShortFormatter.format(now).toUpperCase(),
    yearStr: String(yearNum),
    liveFYStr,
    liveFullFY,
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  onLogout,
  users,
  financialYears,
  selectedFY,
  onSelectFY,
  selectedMonth,
  onSelectMonth,
  onToggleSidebar,
  companyName,
  onRefreshPortal,
  isRefreshing = false,
}) => {
  const [localSpin, setLocalSpin] = useState(false);
  const [liveIndiaTime, setLiveIndiaTime] = useState<IndiaLiveTime>(() => getIndiaLiveTime());

  // Live India (Kolkata) clock ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveIndiaTime(getIndiaLiveTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefreshClick = () => {
    setLocalSpin(true);
    if (onRefreshPortal) {
      onRefreshPortal();
    }
    setTimeout(() => {
      setLocalSpin(false);
    }, 800);
  };

  const isSpinning = isRefreshing || localSpin;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-3 sm:px-4 py-2 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Toggle, CA Firm Heading & Down/Below Small Live IST Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            id="mobile-sidebar-toggle-btn"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-none shrink-0"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 flex items-center justify-center text-white shadow-sm font-black shrink-0 ring-2 ring-blue-600/20">
            <Building2 className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            {/* Main CA Firm Heading */}
            <div className="flex items-center gap-2">
              <h1 className="font-black text-slate-950 uppercase tracking-tight text-sm sm:text-base md:text-lg leading-tight truncate">
                {companyName}
              </h1>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 tracking-wider">
                CA FIRM
              </span>
            </div>

            {/* DIRECTLY BELOW HEADING (Heading ke niche / small): Live India Kolkata Date, Time, Month & Live FY */}
            <div 
              id="live-india-kolkata-heading-subbar"
              className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[10px] sm:text-[11px] font-medium text-slate-600"
              title="Live Real-time Date, Time (Asia/Kolkata) & Current Indian Financial Year (Fixed IST)"
            >
              {/* Live Pulsing Dot & IST Tag */}
              <div className="flex items-center gap-1 font-bold text-emerald-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-extrabold tracking-wide uppercase">IST LIVE:</span>
              </div>

              {/* Live Time */}
              <div className="flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80">
                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                <span>{liveIndiaTime.timeStr}</span>
              </div>

              <span className="text-slate-300 hidden sm:inline">•</span>

              {/* Live Date, Day & Month */}
              <div className="flex items-center gap-1 font-semibold text-slate-700">
                <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
                <span>{liveIndiaTime.dateStr}</span>
                <span className="text-slate-500 font-normal">({liveIndiaTime.dayStr})</span>
              </div>

              <span className="text-slate-300 hidden sm:inline">•</span>

              {/* Live Current Indian Financial Year */}
              <div className="flex items-center gap-1 font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/80">
                <span className="text-[10px] text-blue-600 font-semibold">Live:</span>
                <span>{liveIndiaTime.liveFYStr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Refresh, Work FY & Work Month Filter Selectors, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Refresh All Portal Button */}
          <button
            id="navbar-refresh-portal-btn"
            onClick={handleRefreshClick}
            disabled={isSpinning}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer border ${
              isSpinning
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 opacity-90'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:shadow-sm active:scale-95'
            }`}
            title="Refresh & Sync All Portal Data (Clients, Monthly Work, Bank Turnover, Office Visits, Logs)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin text-emerald-900' : 'text-white'}`} />
            <span className="hidden sm:inline font-bold">
              {isSpinning ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>

          {/* Active Work FY Selector */}
          <div className="flex items-center bg-blue-50/90 border border-blue-200 rounded-xl px-2 sm:px-2.5 py-1 text-xs shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 mr-1 sm:mr-1.5 shrink-0" />
            <span className="font-bold text-blue-950 mr-1 text-[11px] hidden md:inline">Work FY:</span>
            <select
              id="global-fy-selector"
              value={selectedFY.id}
              onChange={(e) => {
                const found = financialYears.find((f) => f.id === Number(e.target.value));
                if (found) onSelectFY(found);
              }}
              className="bg-transparent font-bold text-blue-800 focus:outline-none cursor-pointer pr-1 text-xs"
              title="Select Active Financial Year to View/Edit Records"
            >
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Work Month Selector */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-2 sm:px-2.5 py-1 text-xs shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-600 mr-1 sm:mr-1.5 shrink-0" />
            <span className="font-bold text-slate-700 mr-1 text-[11px] hidden md:inline">Month:</span>
            <select
              id="global-month-selector"
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
              title="Select Active Month to View/Edit Records"
            >
              {FY_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* User Profile & Role Switcher */}
          <div className="relative group">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-2.5 py-1 cursor-pointer hover:bg-slate-100 transition-colors shadow-2xs">
              <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-bold text-slate-800 leading-none truncate max-w-[100px]">
                  {currentUser.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">
                  {currentUser.role}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            {/* User Profile Dropdown */}
            <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 hidden group-hover:block z-50">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <div className="text-[11px] text-slate-500 font-medium">Signed in as:</div>
                <div className="text-sm font-bold text-slate-900 truncate mt-0.5">{currentUser.name}</div>
                {currentUser.email && (
                  <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                )}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    currentUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {currentUser.role === 'admin' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{currentUser.role.toUpperCase()} PANEL</span>
                  </span>
                  <span className="text-[10px] text-slate-400">@{currentUser.username}</span>
                </div>
              </div>

              {/* Real-time IST info inside profile dropdown */}
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-600">
                <div className="flex items-center justify-between font-semibold">
                  <span>Current IST:</span>
                  <span className="font-mono text-amber-700 font-bold">{liveIndiaTime.timeStr}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 mt-0.5">
                  <span>Live Date:</span>
                  <span className="font-medium text-slate-700">{liveIndiaTime.dateStr}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 mt-0.5">
                  <span>Live FY:</span>
                  <span className="font-bold text-blue-700">{liveIndiaTime.liveFYStr}</span>
                </div>
              </div>

              <div className="px-2 pt-1.5 space-y-1">
                <button
                  onClick={handleRefreshClick}
                  className="w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-semibold rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>Sync & Refresh All Data</span>
                </button>
                <button
                  id="user-logout-dropdown-btn"
                  onClick={onLogout}
                  className="w-full text-left px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-semibold rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sign Out / Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Direct Logout Icon Button */}
          <button
            id="navbar-logout-btn"
            onClick={onLogout}
            title="Sign Out / Lock Session"
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
