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
}

export function AppSidebar({
  currentSection,
  onSelectSection,
  health,
  latest,
  lastUpdated,
}: AppSidebarProps) {
  const isConnected = latest ? latest.status === 'connected' : health?.status === 'healthy';

  const navItems = [
    { id: 'overview' as NavSection, label: 'Overview', icon: LayoutDashboard },
    { id: 'monitor' as NavSection, label: 'Network Monitor', icon: Activity },
    { id: 'usage' as NavSection, label: 'Data Usage', icon: Database },
    { id: 'performance' as NavSection, label: 'Performance Analysis', icon: BarChart3 },
    { id: 'recommendations' as NavSection, label: 'AI Recommendations', icon: Lightbulb },
    { id: 'satellite' as NavSection, label: 'Satellite Simulator', icon: Satellite },
    { id: 'assistant' as NavSection, label: 'AI Assistant', icon: Bot },
    { id: 'history' as NavSection, label: 'Test History', icon: History },
    { id: 'settings' as NavSection, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-xs">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base tracking-tight text-gray-900">OrbitLink</span>
              <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-1 py-0.2 rounded">
                v0.1
              </span>
            </div>
            <p className="text-[9px] font-medium tracking-widest text-gray-400 uppercase">
              NETWORK INTELLIGENCE
            </p>
          </div>
        </div>
      </div>

      {/* Connection Health Pill in Sidebar */}
      <div className="px-5 py-3 border-b border-gray-100 bg-[#FFF7F0]/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold text-gray-800">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-gray-500">
            {latest?.latency_ms !== null && latest?.latency_ms !== undefined
              ? `${latest.latency_ms} ms`
              : '-- ms'}
          </span>
        </div>
        {latest?.wifi_ssid && (
          <div className="flex items-center space-x-1 text-[11px] text-gray-500 mt-1 truncate">
            <Wifi className="w-3 h-3 text-orange-500 shrink-0" />
            <span className="truncate">{latest.wifi_ssid}</span>
            {latest.wifi_signal_pct !== null && (
              <span className="text-[10px] text-emerald-600 font-medium shrink-0">
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
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-orange-500 text-white shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-orange-50/50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-orange-500'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User / Local Demo Profile Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/60">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {latest?.device_id || 'ADARSH'}
            </p>
            <p className="text-[10px] text-gray-400 truncate">Local Student Node</p>
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-gray-200/50 flex items-center justify-between text-[10px] text-gray-400">
          <span>Synced: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="font-mono uppercase text-emerald-600">
            {health?.database_engine || 'SQLite'}
          </span>
        </div>
      </div>
    </aside>
  );
}
