import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  PhoneCall, 
  MessageSquare, 
  X, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  Radio,
  WifiOff,
  Send
} from 'lucide-react';
import { SOSCategory, UIIncidentStatus, TouristProfile, Incident } from '../types';
import { AppState } from '../utils/storage';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourist: TouristProfile;
  currentLat: number;
  currentLng: number;
  accuracyM: number;
  isSimulatedOffline: boolean;
  onIncidentCreated: (incident: Incident) => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({
  isOpen,
  onClose,
  tourist,
  currentLat,
  currentLng,
  accuracyM,
  isSimulatedOffline,
  onIncidentCreated,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SOSCategory>('medical');
  const [description, setDescription] = useState<string>('');
  const [uiStatus, setUiStatus] = useState<UIIncidentStatus | null>(null);
  const [createdIncident, setCreatedIncident] = useState<Incident | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Categories locked per PRD FR-15
  const categories: { key: SOSCategory; label: string; icon: string; desc: string }[] = [
    { key: 'medical', label: 'Medical Emergency', icon: '🚑', desc: 'Altitude sickness, injury, unconsciousness' },
    { key: 'accident', label: 'Road Accident', icon: '💥', desc: 'Vehicle collision, vehicle rollover, road fall' },
    { key: 'lost_stranded', label: 'Lost / Stranded', icon: '🏔️', desc: 'Stranded in snow, lost off-trail, breakdown' },
    { key: 'personal_safety', label: 'Personal Safety', icon: '🛡️', desc: 'Harassment, threat, theft, trapped' },
    { key: 'other', label: 'Other Hazard', icon: '⚠️', desc: 'Sudden landslide or flash flood cutoff' },
  ];

  useEffect(() => {
    if (isOpen) {
      setCountdown(3);
      setUiStatus(null);
      setCreatedIncident(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        executeSOSDispatch();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const cancelCountdown = () => {
    setCountdown(null);
    onClose();
  };

  const executeSOSDispatch = async () => {
    setIsSubmitting(true);
    const clientId = 'clnt_' + Date.now();
    const incidentId = 'inc_mnl_' + Math.floor(1000 + Math.random() * 9000);
    const nowIso = new Date().toISOString();

    const newIncident: Incident = {
      id: incidentId,
      client_id: clientId,
      tourist_id: tourist.id,
      tourist_name: tourist.full_name,
      tourist_public_id: tourist.public_id,
      tourist_phone: tourist.phone,
      category: selectedCategory,
      description: description || `Emergency SOS triggered (${selectedCategory}) near Manali`,
      lat: currentLat,
      lng: currentLng,
      accuracy_m: accuracyM,
      status: 'submitted',
      ui_status: isSimulatedOffline ? 'pending' : 'submitted',
      severity: 'critical',
      created_at: nowIso,
      updated_at: nowIso,
      events: [
        {
          id: 'evt_' + Date.now(),
          incident_id: incidentId,
          status: 'submitted',
          actor: tourist.full_name,
          actor_role: 'tourist',
          note: isSimulatedOffline 
            ? 'SOS captured in local offline queue due to weak network' 
            : 'SOS transmitted to SafeWay Emergency Response Desk',
          created_at: nowIso,
        },
      ],
      is_offline_queued: isSimulatedOffline,
    };

    // Save incident to state
    if (isSimulatedOffline) {
      const currentQueue = AppState.getOfflineQueue();
      AppState.saveOfflineQueue([...currentQueue, newIncident]);
      setUiStatus('pending');
    } else {
      const currentIncidents = AppState.getIncidents();
      AppState.saveIncidents([newIncident, ...currentIncidents]);

      // Record Mock SMS to consented contacts
      tourist.contacts.forEach((contact) => {
        AppState.recordMockSMS(
          contact.phone,
          contact.name,
          `EMERGENCY ALERT: SafeWay tourist ${tourist.full_name} (${tourist.public_id}) activated SOS [${selectedCategory.toUpperCase()}]. Location: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)} (±${Math.round(accuracyM)}m). Local response teams notified.`,
          'sos_alert'
        );
      });

      // Append to cryptographic audit ledger
      await AppState.appendAuditEntry(
        'SOS_SUBMITTED',
        tourist.full_name,
        'tourist',
        `Incident ${incidentId} created: Category=${selectedCategory}, GPS=(${currentLat.toFixed(4)}, ${currentLng.toFixed(4)})`
      );

      setUiStatus('submitted');
    }

    setCreatedIncident(newIncident);
    setIsSubmitting(false);
    onIncidentCreated(newIncident);
  };

  // Build SMS link for consented contacts
  const buildSmsFallbackLink = () => {
    const phones = tourist.contacts.map((c) => c.phone.replace(/[^0-9+]/g, '')).join(',');
    const bodyText = encodeURIComponent(
      `SAFEWAY EMERGENCY: I need urgent help! Tourist: ${tourist.full_name} (ID: ${tourist.public_id}). Lat: ${currentLat.toFixed(5)}, Lng: ${currentLng.toFixed(5)} (±${Math.round(accuracyM)}m). Category: ${selectedCategory}. Time: ${new Date().toLocaleTimeString()}. SafeWay dispatch contacted.`
    );
    return `sms:${phones}?body=${bodyText}`;
  };

  const handleManualSmsClick = () => {
    setUiStatus('manually_sent');
    // Also record into outbox as fallback
    tourist.contacts.forEach((c) => {
      AppState.recordMockSMS(
        c.phone,
        c.name,
        `[Manual Offline SMS]: Tourist ${tourist.full_name} manually triggered SMS fallback from weak network area. GPS: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`,
        'sos_alert'
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-rose-600/40 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Top Warning Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-600 via-red-500 to-amber-500" />

        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-7 h-7 animate-pulse text-rose-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Emergency SOS Dispatch
              </h2>
              <p className="text-xs text-slate-400">
                SafeWay Response Network · Manali Pilot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State 1: Active 3-second Countdown */}
        {countdown !== null && countdown > 0 && (
          <div className="text-center py-6 space-y-5">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-rose-950/60 border-4 border-rose-500/60 flex items-center justify-center shadow-lg shadow-rose-950">
                <span className="text-5xl font-black text-rose-400 animate-bounce">
                  {countdown}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-rose-300">
                Sending Emergency SOS in {countdown} seconds...
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Capturing GPS coordinates and alerting verified emergency contacts. Tap Cancel if pressed by mistake.
              </p>
            </div>
            <button
              onClick={cancelCountdown}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl border border-slate-700 transition"
            >
              Cancel (Accidental Press)
            </button>
          </div>
        )}

        {/* State 2: Category Selection & Dispatch Options (if countdown finished or zero) */}
        {countdown === 0 && !uiStatus && (
          <div className="space-y-4">
            <div className="text-center py-4 text-slate-300">
              <Radio className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-2" />
              <p className="text-sm font-medium">Transmitting coordinates to response hub...</p>
            </div>
          </div>
        )}

        {/* State 3: Submitted / Confirmed by SafeWay Response Desk */}
        {uiStatus === 'submitted' && (
          <div className="space-y-5 py-2">
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl flex items-start gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-emerald-300 font-semibold text-sm">
                  Report Sent to SafeWay Response Team
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Incident Ref: <strong className="text-white font-mono">{createdIncident?.id}</strong>. 
                  Dispatcher desk has been notified. 2 consented emergency contacts received automated SMS alerts.
                </p>
                <p className="text-[11px] text-emerald-400/80 font-mono mt-1">
                  GPS Fixed: {currentLat.toFixed(4)}°N, {currentLng.toFixed(4)}°E (±{Math.round(accuracyM)}m)
                </p>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Consented Emergency Contacts Alerted
              </div>
              <div className="space-y-2">
                {tourist.contacts.map((c) => (
                  <div key={c.id} className="flex justify-between items-center text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-medium text-slate-200">{c.name} ({c.relationship})</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-mono">
                      <span>✓ Mock SMS Outbox</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-2xl border border-slate-700 transition"
            >
              Close & View Incident Tracker
            </button>
          </div>
        )}

        {/* State 4: Weak Network / Offline Fallback Ladder */}
        {(uiStatus === 'pending' || uiStatus === 'manually_sent') && (
          <div className="space-y-4 py-2">
            <div className="bg-amber-950/40 border border-amber-500/40 p-4 rounded-2xl flex items-start gap-3">
              <WifiOff className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-amber-300 font-semibold text-sm">
                  Weak Network · Offline Emergency Ladder Activated
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your SOS is safely saved in the device offline queue. Use the direct SMS and emergency calling links below to reach help instantly without data.
                </p>
                {uiStatus === 'manually_sent' && (
                  <div className="mt-2 text-xs bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30">
                    Status: <strong>manually_sent</strong> (Delivery and dashboard receipt unconfirmed until device reconnects).
                  </div>
                )}
              </div>
            </div>

            {/* Offline Fallback Buttons */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Direct Emergency Actions
              </div>

              {/* Prefilled SMS link */}
              <a
                href={buildSmsFallbackLink()}
                onClick={handleManualSmsClick}
                className="w-full flex items-center justify-between p-3.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-2xl shadow-lg shadow-rose-950 transition"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-rose-100" />
                  <div className="text-left">
                    <div className="text-sm font-bold">Send Prefilled SMS to Contacts</div>
                    <div className="text-[11px] text-rose-200">
                      Coordinates ({currentLat.toFixed(3)}, {currentLng.toFixed(3)}) pre-composed
                    </div>
                  </div>
                </div>
                <Send className="w-4 h-4 text-rose-200" />
              </a>

              {/* Direct Emergency Calls */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <a
                  href="tel:112"
                  className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 transition"
                >
                  <PhoneCall className="w-5 h-5 text-rose-400 mb-1" />
                  <span className="text-xs font-bold">Call 112</span>
                  <span className="text-[10px] text-slate-400">National SOS</span>
                </a>

                <a
                  href="tel:100"
                  className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 transition"
                >
                  <PhoneCall className="w-5 h-5 text-blue-400 mb-1" />
                  <span className="text-xs font-bold">Call 100</span>
                  <span className="text-[10px] text-slate-400">Police</span>
                </a>

                <a
                  href="tel:108"
                  className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 transition"
                >
                  <PhoneCall className="w-5 h-5 text-emerald-400 mb-1" />
                  <span className="text-xs font-bold">Call 108</span>
                  <span className="text-[10px] text-slate-400">Ambulance</span>
                </a>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-2xl border border-slate-700 transition text-xs"
            >
              Dismiss (SOS remains queued for automatic sync)
            </button>
          </div>
        )}

        {/* Category Picker before or during SOS trigger */}
        {countdown === null && !uiStatus && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Select category to dispatch specialized assistance:
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition ${
                    selectedCategory === cat.key
                      ? 'bg-rose-500/20 border-rose-500 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <div className="text-sm font-semibold">{cat.label}</div>
                    <div className="text-xs text-slate-400">{cat.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Optional notes (e.g., car broken down near Marhi hairpins)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />

            <button
              onClick={executeSOSDispatch}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl shadow-xl shadow-rose-950 transition flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm & Dispatch Immediate SOS</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
