import React, { useState } from 'react';
import { User } from '../types';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  FileSpreadsheet,
  CalendarDays,
  UserCog,
  History,
  FileUp,
  FileDown,
  Settings,
  Receipt,
  X,
  LogOut,
  Landmark,
  ShieldCheck,
  ClipboardList,
  Calculator,
  ChevronDown,
  ChevronRight,
  Table,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'clients'
  | 'office-visits'
  | 'monthly-work'
  | 'gst-turnover-entry'
  | 'gst-turnover-matrix'
  | 'bank-turnover'
  | 'reports'
  | 'financial-years'
  | 'users'
  | 'activity-logs'
  | 'import'
  | 'export'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  currentUser: User;
  onLogout: () => void;
  clientCount: number;
  pendingCount: number;
  inVisitsCount?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  clientCount,
  pendingCount,
  inVisitsCount = 0,
  isOpen,
  onClose,
}) => {
  const isAdmin = currentUser.role === 'admin';

  const menuItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'clients' as TabType, label: 'Master Clients', icon: Users, badge: clientCount },
    {
      id: 'office-visits' as TabType,
      label: 'Office Client Entry',
      icon: ClipboardList,
      badge: inVisitsCount > 0 ? `${inVisitsCount} IN` : 'Register',
      badgeColor: inVisitsCount > 0 ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'bg-slate-700/80 text-slate-300',
    },
    {
      id: 'monthly-work' as TabType,
      label: 'Monthly GST Work',
      icon: CalendarCheck2,
      badge: pendingCount > 0 ? `${pendingCount} pending` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'gst-turnover-entry' as TabType,
      label: 'GST Turnover Entry',
      icon: Calculator,
      badge: '12-Month',
      badgeColor: 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30',
    },
    { id: 'bank-turnover' as TabType, label: 'Bank Turnover', icon: Landmark, badge: '5 Banks', badgeColor: 'bg-indigo-500/20 text-indigo-300' },
    { id: 'reports' as TabType, label: 'Reports & PDF', icon: FileSpreadsheet, badge: 'PDF', badgeColor: 'bg-blue-500/20 text-blue-300' },
  ];

  const adminItems = [
    { id: 'users' as TabType, label: 'Staff & Users', icon: UserCog },
    { id: 'financial-years' as TabType, label: 'Financial Years', icon: CalendarDays },
    { id: 'import' as TabType, label: 'Import Clients (CSV)', icon: FileUp },
    { id: 'export' as TabType, label: 'Export Data', icon: FileDown },
    { id: 'activity-logs' as TabType, label: 'Staff Activity / Audit Log', icon: ShieldCheck, badge: 'Audit', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
  ];

  return (
    <>
      {/* Mobile backdrop - underneath heading bar */}
      {isOpen && (
        <div
          className="fixed inset-0 top-[54px] sm:top-[58px] bg-slate-950/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:sticky top-[54px] sm:top-[58px] left-0 bottom-0 lg:bottom-auto lg:h-[calc(100vh-58px)] w-64 bg-slate-900 text-white z-40 flex flex-col shrink-0 transition-transform duration-200 ease-in-out border-r border-slate-800/80 shadow-xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Compact Sidebar Header */}
        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-2xs">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-xs text-white tracking-wide">CA OFFICE</div>
              <div className="text-[9px] text-blue-300 font-semibold tracking-wider uppercase">Portal Suite</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
            title="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation items - Smoothly scrollable with mouse cursor under heading bar */}
        <div 
          id="sidebar-menu-scroll-panel"
          className="flex-1 overflow-y-auto custom-sidebar-scroll py-2 px-2 space-y-1 overscroll-contain"
        >
          <div className="px-3 py-1 text-[10px] font-bold text-blue-300/80 uppercase tracking-wider flex items-center justify-between">
            <span>CA OFFICE NAVIGATION</span>
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isItemActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isItemActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Administration
              </div>

              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-tab-${item.id}`}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </>
          )}

          <div className="pt-4 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            System & Settings
          </div>

          <button
            id="sidebar-tab-settings"
            onClick={() => {
              onSelectTab('settings');
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Portal Settings</span>
          </button>
        </div>

        {/* Footer info & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Role: <strong className="text-slate-200 uppercase">{currentUser.role}</strong></span>
            <span className="text-emerald-400 font-medium text-[10px]">Active Session</span>
          </div>

          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-rose-900/50 text-slate-300 hover:text-rose-200 text-xs font-semibold border border-slate-700/60 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Lock</span>
          </button>
        </div>
      </aside>
    </>
  );
};
