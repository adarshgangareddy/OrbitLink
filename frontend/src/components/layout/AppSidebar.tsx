import {
  Activity,
  BarChart3,
  Bot,
  Database,
  History,
  LayoutDashboard,
  Lightbulb,
  Radio,
  Satellite,
  Settings,
  User,
  Wifi,
  X,
} from 'lucide-react';
import type { HealthStatus, NetworkMeasurement } from '../../types';

export type NavSection =
  | 'overview'
  | 'monitor'
  | 'usage'
  | 'performance'
  | 'recommendations'
  | 'satellite'
  | 'assistant'
  | 'history'
  | 'settings';

interface AppSidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  health: HealthStatus | null;
  latest: NetworkMeasurement | null;
  lastUpdated: Date;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function AppSidebar({
  currentSection,
  onSelectSection,
  health,
  latest,
  lastUpdated,
  isOpenMobile = false,
  onCloseMobile,
}: AppSidebarProps) {
  const isConnected = latest ? latest.status === 'connected' : health?.status === 'healthy';

  const navItems = [
    { id: 'overview' as NavSection, label: 'Starlink Overview', icon: LayoutDashboard },
    { id: 'monitor' as NavSection, label: 'Hardware & RF Monitor', icon: Activity },
    { id: 'usage' as NavSection, label: 'Data Usage & Plans', icon: Database },
    { id: 'performance' as NavSection, label: 'Performance & Jitter', icon: BarChart3 },
    { id: 'recommendations' as NavSection, label: 'AI Optimisation', icon: Lightbulb },
    { id: 'satellite' as NavSection, label: 'Satellite Simulator', icon: Satellite },
    { id: 'assistant' as NavSection, label: 'Diagnostic Assistant', icon: Bot },
    { id: 'history' as NavSection, label: 'Telemetry History', icon: History },
    { id: 'settings' as NavSection, label: 'System Settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0A0E18] text-slate-100 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base tracking-tight text-white font-mono">OrbitLink</span>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono">
                PRO
              </span>
            </div>
            <p className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
              STARLINK INTELLIGENCE
            </p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Terminal Connection Status Pill in Sidebar */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold text-slate-200">
              {isConnected ? 'Terminal Online' : 'Terminal Offline'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 font-bold">
            {latest?.latency_ms !== null && latest?.latency_ms !== undefined
              ? `${latest.latency_ms} ms`
              : '-- ms'}
          </span>
        </div>
        {latest?.wifi_ssid && (
          <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-1 truncate">
            <Wifi className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="truncate">{latest.wifi_ssid}</span>
            {latest.wifi_signal_pct !== null && (
              <span className="text-[10px] text-emerald-400 font-medium shrink-0 font-mono">
                ({latest.wifi_signal_pct}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectSection(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/20 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-cyan-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User / Host Node Profile Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate font-mono">
              {latest?.device_id || 'ADARSH'}
            </p>
            <p className="text-[10px] text-slate-500 truncate">Starlink Terminal Node</p>
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
          <span>Synced: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="font-mono uppercase text-emerald-400 font-bold">
            {health?.database_engine || 'SQLite'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-800/80 flex-col h-screen fixed left-0 top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative w-72 max-w-xs h-full z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
