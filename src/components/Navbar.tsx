import React from 'react';
import { 
  ShieldAlert, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  User, 
  ShieldCheck, 
  Activity, 
  FileCheck
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isSimulatedOffline: boolean;
  onToggleOffline: () => void;
  queuedItemsCount: number;
  onSyncQueue: () => void;
  onTriggerSOS: () => void;
  activeView: 'tourist' | 'rescue_admin' | 'audit_ledger';
  onViewChange: (view: 'tourist' | 'rescue_admin' | 'audit_ledger') => void;
  onOpenUidaiModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  isSimulatedOffline,
  onToggleOffline,
  queuedItemsCount,
  onSyncQueue,
  onTriggerSOS,
  activeView,
  onViewChange,
  onOpenUidaiModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          {/* Logo & Pilot Tag */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/40 text-white font-black text-xl">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">SafeWay</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Manali Pilot
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Hazard-Aware Routing & Emergency Assistance
              </p>
            </div>
          </div>

          {/* Navigation Views */}
          <div className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => onViewChange('tourist')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                activeView === 'tourist'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Tourist Portal</span>
            </button>

            <button
              onClick={() => onViewChange('rescue_admin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                activeView === 'rescue_admin'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Rescue & Ops Command</span>
            </button>

            <button
              onClick={() => onViewChange('audit_ledger')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                activeView === 'audit_ledger'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Audit Chain (/verify)</span>
            </button>

            {onOpenUidaiModal && (
              <button
                onClick={onOpenUidaiModal}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 text-slate-300 hover:text-emerald-300 hover:bg-slate-900"
                title="UIDAI Developer Sandbox Identity KYC"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>UIDAI Sandbox</span>
              </button>
            )}
          </div>

          {/* Controls: Role selector, Network Toggle, Sync, SOS */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Network Simulator Toggle */}
            <button
              onClick={onToggleOffline}
              title={isSimulatedOffline ? "Network offline simulated. Click to reconnect." : "Click to simulate offline network"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                isSimulatedOffline
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-emerald-400'
              }`}
            >
              {isSimulatedOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                  <span className="hidden sm:inline">Offline Mode</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Online</span>
                </>
              )}
            </button>

            {/* Offline Sync Button if items queued */}
            {queuedItemsCount > 0 && (
              <button
                onClick={onSyncQueue}
                title="Sync queued SOS and reports"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold animate-pulse shadow-md transition"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sync ({queuedItemsCount})</span>
              </button>
            )}

            {/* Role Switcher */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 px-1 hidden sm:inline text-[11px]">Role:</span>
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs pr-1"
              >
                <option value="tourist" className="bg-slate-900 text-white">Tourist</option>
                <option value="rescue" className="bg-slate-900 text-white">Rescue Unit</option>
                <option value="admin" className="bg-slate-900 text-white">Admin Officer</option>
                <option value="guide" className="bg-slate-900 text-white">Guide</option>
              </select>
            </div>

            {/* One-Tap Emergency SOS Trigger */}
            <button
              onClick={onTriggerSOS}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-rose-950/80 flex items-center gap-1.5 active:scale-95 transition"
            >
              <ShieldAlert className="w-4 h-4 animate-bounce text-white" />
              <span>SOS</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation View Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80">
          <button
            onClick={() => onViewChange('tourist')}
            className={`text-xs font-semibold py-1 px-2 rounded-lg transition ${
              activeView === 'tourist' ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400'
            }`}
          >
            Tourist
          </button>
          <button
            onClick={() => onViewChange('rescue_admin')}
            className={`text-xs font-semibold py-1 px-2 rounded-lg transition ${
              activeView === 'rescue_admin' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400'
            }`}
          >
            Rescue / Ops
          </button>
          <button
            onClick={() => onViewChange('audit_ledger')}
            className={`text-xs font-semibold py-1 px-2 rounded-lg transition ${
              activeView === 'audit_ledger' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
            }`}
          >
            Audit (/verify)
          </button>
        </div>
      </div>
    </header>
  );
};
