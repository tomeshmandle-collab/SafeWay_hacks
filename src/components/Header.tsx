import React from 'react';
import { Shield, Radio, Wifi, WifiOff, AlertTriangle, QrCode, User, LifeBuoy } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  networkMode: 'online' | 'weak' | 'offline';
  onNetworkModeChange: (mode: 'online' | 'weak' | 'offline') => void;
  onOpenSos: () => void;
  onOpenDigitalId: () => void;
  activeSosCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  networkMode,
  onNetworkModeChange,
  onOpenSos,
  onOpenDigitalId,
  activeSosCount,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          
          {/* Brand Logo & Pilot Tag */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-rose-600 via-amber-500 to-emerald-500 p-0.5 shadow-lg flex-shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400 bg-clip-text text-transparent">
                  SafeWay
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full">
                  Manali Pilot
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400">
                AI-Assisted Tourist Safety & Emergency Assistance • HP, India
              </p>
            </div>
          </div>

          {/* Center Actions: Role Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => onRoleChange('tourist')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentRole === 'tourist'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Tourist</span>
            </button>

            <button
              onClick={() => onRoleChange('rescue')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all relative ${
                currentRole === 'rescue'
                  ? 'bg-rose-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Rescue</span>
              {activeSosCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center animate-pulse">
                  {activeSosCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onRoleChange('admin')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentRole === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Admin / Audit</span>
            </button>
          </div>

          {/* Right Controls: Network Simulation, Digital ID & SOS Button */}
          <div className="flex items-center gap-2">
            
            {/* Network Simulator Dropdown (Demonstrates Offline SMS Fallback Ladder) */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/80 px-2 py-1 rounded-lg text-xs text-slate-300">
              {networkMode === 'online' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : networkMode === 'weak' ? (
                <Wifi className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              )}
              <select
                value={networkMode}
                onChange={e => onNetworkModeChange(e.target.value as any)}
                aria-label="Network mode simulation"
                className="bg-transparent border-none text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="online" className="bg-slate-900 text-white">4G / Online</option>
                <option value="weak" className="bg-slate-900 text-white">Weak Network (Lag)</option>
                <option value="offline" className="bg-slate-900 text-white">Offline (SMS Test)</option>
              </select>
            </div>

            {/* Tourist ID Modal Button */}
            <button
              onClick={onOpenDigitalId}
              title="View Digital Tourist ID & Verification QR"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-amber-300 flex items-center gap-1.5 transition-colors"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Tourist ID</span>
            </button>

            {/* Emergency SOS Header Button */}
            <button
              onClick={onOpenSos}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-rose-950/80 flex items-center gap-2 border border-rose-500/40 animate-pulse transition-all active:scale-95"
            >
              <AlertTriangle className="w-4 h-4 fill-white text-rose-700" />
              <span>SOS EMERGENCY</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
