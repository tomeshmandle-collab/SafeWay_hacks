import React from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  UserCheck, 
  AlertCircle 
} from 'lucide-react';
import { TouristProfile, Trip } from '../types';

interface PublicIdVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourist: TouristProfile;
  trip: Trip | null;
}

export const PublicIdVerifyModal: React.FC<PublicIdVerifyModalProps> = ({
  isOpen,
  onClose,
  tourist,
  trip,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />

        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">SafeWay Public Verification</h3>
              <p className="text-[11px] text-slate-400 font-mono">/id/{tourist.public_id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-200">
              <div className="font-bold">Active Tourist Registration Found</div>
              <div>Verified against the SafeWay Manali Central Safety Registry.</div>
            </div>
          </div>

          {/* Consented Fields Display (PRD FR-39) */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Public Tourist ID</span>
              <span className="font-mono font-bold text-white">{tourist.public_id}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Registered Name</span>
              <span className="font-semibold text-white">{tourist.full_name}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Identity KYC (UIDAI Sandbox)</span>
              <span className={tourist.uidai_status === 'sandbox_verified' ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                {tourist.uidai_status === 'sandbox_verified' ? `✓ Sandbox Verified (${tourist.uidai_masked_id || 'XXXXXXXX0001'})` : 'Sandbox Pending'}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Emergency Contacts</span>
              <span className="text-emerald-400 font-medium">
                {tourist.contacts.length} Consented Contacts on File
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Active Destination</span>
              <span className="text-white">{trip?.destination || 'Manali Pilot Sector'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Current Trip Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                trip?.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {trip?.status || 'idle'}
              </span>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Protection:</strong> Phone number and sensitive details are withheld on public scan. Full records accessible by authorized rescue and police command accounts only.
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            Close Scan Preview
          </button>
        </div>
      </div>
    </div>
  );
};
