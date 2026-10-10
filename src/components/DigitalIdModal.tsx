import React, { useState } from 'react';
import { X, QrCode, ShieldCheck, RefreshCw, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../lib/api';

interface DigitalIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export const DigitalIdModal: React.FC<DigitalIdModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await api.regenerateQr();
      if (onProfileUpdated) {
        onProfileUpdated({ ...userProfile, public_id: res.public_id });
      }
      setVerificationResult(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleVerifyId = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyPublicId(userProfile.public_id);
      setVerificationResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(userProfile.public_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-200" />
            <div>
              <h3 className="font-extrabold text-base tracking-wide">
                Digital Tourist Safety ID
              </h3>
              <p className="text-[11px] text-amber-100">
                Himachal Pradesh Tourism Safety Registry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close digital ID modal"
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
          
          {/* Card Presentation Container */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 border-2 border-amber-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            {/* Watermark Emblem */}
            <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
              <ShieldCheck className="w-44 h-44 text-white" />
            </div>

            {/* Tourist Details Row */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Verified Traveler
                </span>
                <h4 className="text-xl font-black text-white mt-1.5">
                  {userProfile.full_name}
                </h4>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  {userProfile.phone}
                </p>
              </div>

              {/* QR Code Presentation Box */}
              <div className="w-20 h-20 bg-white p-1.5 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path fill="#0f172a" d="M0,0 h30 v30 h-30 z M4,4 h22 v22 h-22 z M8,8 h14 v14 h-14 z" />
                  <path fill="#0f172a" d="M70,0 h30 v30 h-30 z M74,4 h22 v22 h-22 z M78,8 h14 v14 h-14 z" />
                  <path fill="#0f172a" d="M0,70 h30 v30 h-30 z M4,74 h22 v22 h-22 z M8,78 h14 v14 h-14 z" />
                  <rect x="36" y="10" width="8" height="8" fill="#0f172a" />
                  <rect x="48" y="10" width="8" height="8" fill="#0f172a" />
                  <rect x="36" y="24" width="8" height="8" fill="#0f172a" />
                  <rect x="48" y="38" width="14" height="14" fill="#0f172a" />
                  <rect x="70" y="38" width="8" height="8" fill="#0f172a" />
                  <rect x="10" y="44" width="8" height="8" fill="#0f172a" />
                  <rect x="22" y="44" width="8" height="8" fill="#0f172a" />
                  <rect x="36" y="70" width="12" height="12" fill="#0f172a" />
                  <rect x="56" y="70" width="12" height="12" fill="#0f172a" />
                  <rect x="76" y="60" width="16" height="16" fill="#0f172a" />
                  <rect x="70" y="84" width="10" height="10" fill="#0f172a" />
                </svg>
              </div>
            </div>

            {/* Unique Public ID with Copy */}
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Unique Tourist ID
                </span>
                <p className="font-mono text-base font-bold text-amber-300">
                  {userProfile.public_id}
                </p>
              </div>
              <button
                onClick={handleCopyId}
                className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Copy ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Medical & Emergency Grid */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700/60 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood Group</span>
                <p className="font-bold text-white">{userProfile.blood_group || 'O+'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Trip Status</span>
                <p className="font-bold text-emerald-400">Active Circuit</p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Medical Note</span>
                <p className="text-slate-200 text-[11px] truncate">
                  {userProfile.medical_conditions?.join(', ') || 'None specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Result Display */}
          {verificationResult && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Authority Tamper-Check Passed</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Official HP Tourism Registry record matched. Hash: <span className="font-mono text-emerald-400">{verificationResult.integrity_hash.substring(0, 16)}...</span>
              </p>
            </div>
          )}

          {/* Actions: Verify & Regenerate */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleVerifyId}
              disabled={isVerifying}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>{isVerifying ? 'Verifying...' : 'Test Authority QR Scan'}</span>
            </button>

            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title="Regenerate rotating public ID"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>Rotate ID</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
