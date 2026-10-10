import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  ShieldAlert,
  X,
  CheckCircle2,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Incident, UserProfile } from '../types';
import { api, getNetworkSimulator } from '../lib/api';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  currentLocation: [number, number];
  onIncidentCreated?: (incident: Incident) => void;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  currentLocation,
  onIncidentCreated,
}) => {
  const [countdown, setCountdown] = useState<number | null>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFallbackLadder, setShowFallbackLadder] = useState(false);
  const [category, setCategory] = useState<'personal_safety' | 'medical' | 'accident' | 'lost_stranded'>('personal_safety');
  const [notes, setNotes] = useState('');

  // Countdown logic for accidental press protection (3 seconds per Business Logic)
  useEffect(() => {
    if (!isOpen) {
      setCountdown(3);
      setIsSubmitting(false);
      setErrorMessage(null);
      return;
    }

    if (activeIncident) {
      // Already sent
      return;
    }

    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Countdown finished -> Auto Trigger SOS
      triggerSosNow();
    }
  }, [isOpen, countdown, activeIncident]);

  const triggerSosNow = async () => {
    setCountdown(null);
    setIsSubmitting(true);
    setErrorMessage(null);

    const netMode = getNetworkSimulator();
    if (netMode === 'offline') {
      // Immediately activate Fallback Ladder
      setIsSubmitting(false);
      setErrorMessage('Network connection unavailable. Offline Fallback Ladder activated.');
      setShowFallbackLadder(true);
      return;
    }

    try {
      const res = await api.submitSos({
        category,
        severity: 'critical',
        latitude: currentLocation[0],
        longitude: currentLocation[1],
        accuracy_meters: 15,
        description: notes || 'Immediate emergency assistance requested via Safe Yatra 1-Tap SOS.',
        battery_level: 74,
      });

      setActiveIncident(res.incident);
      if (onIncidentCreated) {
        onIncidentCreated(res.incident);
      }
    } catch (err: any) {
      console.warn('SOS network submission error:', err);
      setErrorMessage('Emergency request pending or delayed over current network. Open SMS / Call fallback below.');
      setShowFallbackLadder(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCountdown = () => {
    setCountdown(null);
    onClose();
  };

  // Prefilled SMS content for emergency contacts
  const contacts = userProfile.emergency_contacts || [];
  const contactsPhones = contacts.map(c => c.phone.replace(/[^0-9+]/g, '')).join(',');
  const smsBody = encodeURIComponent(
    `SOS EMERGENCY from ${userProfile.full_name}! Location: ${currentLocation[0].toFixed(4)}, ${currentLocation[1].toFixed(4)} (accuracy ~15m) near Manali. Tourist ID: ${userProfile.public_id}. Please help or alert local rescue. Sent via Safe Yatra.`
  );
  const smsHref = `sms:${contactsPhones}?body=${smsBody}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-rose-600/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl shadow-rose-950/80">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-red-950 px-6 py-4 flex items-center justify-between border-b border-rose-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-900">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white tracking-wide">
                Safe Yatra SOS Response Center
              </h2>
              <p className="text-xs text-rose-200">
                Manali District Emergency Operation Center (DEOC)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close emergency modal"
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* Phase 1: Accidental Press Countdown */}
          {countdown !== null && (
            <div className="text-center py-4 space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full border-4 border-rose-500 bg-rose-950/50 flex items-center justify-center">
                <span className="text-5xl font-black text-rose-400 font-mono animate-ping">
                  {countdown}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Transmitting Emergency SOS in {countdown}s...
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Transmitting GPS location ({currentLocation[0].toFixed(4)}, {currentLocation[1].toFixed(4)}) and alerting rescue desk.
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleCancelCountdown}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 transition-colors"
                >
                  Cancel (Accidental Press)
                </button>
                <button
                  onClick={triggerSosNow}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-950 transition-colors"
                >
                  Send Immediately
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Transmitting */}
          {isSubmitting && (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 mx-auto border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-white text-base">Transmitting SOS to Emergency Dispatch...</p>
              <p className="text-xs text-slate-400">Locking GPS coordinates and dispatching SMS outbox</p>
            </div>
          )}

          {/* Phase 3: Active Incident Recorded */}
          {activeIncident && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-300 text-sm">
                    SOS Incident Recorded Successfully
                  </h4>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Emergency reference ID: <strong className="text-white font-mono">{activeIncident.reference}</strong>
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    Current status:{' '}
                    <span className="uppercase font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40">
                      {activeIncident.status}
                    </span>
                  </p>
                  {activeIncident.assigned_responder && (
                    <p className="text-xs text-slate-200 mt-1.5 font-medium">
                      Assigned Team: <span className="text-amber-400">{activeIncident.assigned_responder}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* SMS Notification Confirmation */}
              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>SMS alert dispatched to 2 emergency contacts ({userProfile.emergency_contacts.map(c => c.name).join(', ')})</span>
                </div>
                <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">Mock Outbox</span>
              </div>
            </div>
          )}

          {/* Error Message if Network Lag or Failure */}
          {errorMessage && (
            <div className="bg-amber-950/50 border border-amber-500/50 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Fallback Ladder (Always available if network drops or user needs immediate direct phone / SMS) */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                Emergency Fallback Ladder (Offline Mode)
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                Works Without Data
              </span>
            </div>

            {/* Direct Phone Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <a
                href="tel:112"
                className="flex items-center justify-between p-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-rose-400" />
                  <span>Call 112 (National)</span>
                </div>
                <ExternalLink className="w-3 h-3 text-rose-400" />
              </a>

              <a
                href="tel:108"
                className="flex items-center justify-between p-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>Call 108 (Ambulance)</span>
                </div>
                <ExternalLink className="w-3 h-3 text-amber-400" />
              </a>

              <a
                href="tel:100"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span>Call 100 (Police)</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <a
                href="tel:1363"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>1363 (Tourist Help)</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>

            {/* Prefilled SMS link button */}
            <a
              href={smsHref}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Open Pre-filled SMS to Contacts ({contacts.length} registered)</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </a>
            <p className="text-[11px] text-slate-400 mt-1.5 px-1">
              Includes GPS coordinates ({currentLocation[0].toFixed(4)}, {currentLocation[1].toFixed(4)}) and Tourist ID ({userProfile.public_id}).
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Foreground location locked • Himachal Pradesh</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors font-medium"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
