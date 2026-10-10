import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Radio,
  FileText,
  MessageSquare,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { HazardZone, TourismService, CommunityReport, AuditEntry, MockSmsMessage } from '../types';
import { api } from '../lib/api';

interface AdminViewProps {
  hazardZones: HazardZone[];
  services: TourismService[];
  reports: CommunityReport[];
  onDataChanged: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  hazardZones,
  services,
  reports,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'zones' | 'services' | 'sms'>('audit');

  // Audit state
  const [auditLedger, setAuditLedger] = useState<AuditEntry[]>([]);
  const [verificationData, setVerificationData] = useState<any | null>(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);

  // SMS Outbox state
  const [smsOutbox, setSmsOutbox] = useState<MockSmsMessage[]>([]);

  // New Zone Form state
  const [showNewZoneModal, setShowNewZoneModal] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState('landslide');
  const [zoneSeverity, setZoneSeverity] = useState('high');
  const [zoneRadius, setZoneRadius] = useState('500');
  const [zoneDescription, setZoneDescription] = useState('');

  // Demo storyline sweep state
  const [sweepResult, setSweepResult] = useState<string | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);

  useEffect(() => {
    loadAudit();
    loadSms();
  }, []);

  const loadAudit = async () => {
    try {
      const entries = await api.getAuditLedger();
      setAuditLedger(entries);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSms = async () => {
    try {
      const messages = await api.getSmsOutbox();
      setSmsOutbox(messages);
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyChain = async () => {
    setIsVerifyingChain(true);
    try {
      const res = await api.verifyAuditChain();
      setVerificationData(res);
      await loadAudit();
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifyingChain(false);
    }
  };

  const handleToggleZone = async (id: string, current: boolean) => {
    try {
      await api.toggleZone(id, !current);
      onDataChanged();
      loadAudit();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName) return;
    try {
      await api.createZone({
        name: zoneName,
        hazard_type: zoneType as any,
        severity: zoneSeverity as any,
        radius_meters: parseInt(zoneRadius, 10) || 400,
        description: zoneDescription,
        latitude: 32.2532,
        longitude: 77.1792,
      });
      setShowNewZoneModal(false);
      setZoneName('');
      setZoneDescription('');
      onDataChanged();
      loadAudit();
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyService = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await api.verifyService(id, status);
      onDataChanged();
      loadAudit();
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyReport = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await api.verifyReport(id, status);
      onDataChanged();
      loadAudit();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerSweep = async () => {
    setIsSweeping(true);
    try {
      const res = await api.triggerDemoSweep();
      setSweepResult(`Sweep executed: ${res.tourists_evaluated} tourist records verified.`);
      loadAudit();
      setTimeout(() => setSweepResult(null), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSweeping(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/60 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950 flex-shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  Trust & Integrity Console
                </span>
                <span className="text-xs text-slate-400">Himachal Tourism Safety Dept</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                Cryptographic Audit & Administration
              </h1>
              <p className="text-xs text-slate-300">
                Tamper-proof hash-chained audit ledger, hazard zones configuration, and verified provider licensing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerSweep}
              disabled={isSweeping}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSweeping ? 'Running...' : 'Run Demo Storyline Sweep'}</span>
            </button>
          </div>
        </div>

        {sweepResult && (
          <div className="mt-4 p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{sweepResult}</span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'audit', label: 'Hash-Chained Audit Ledger', icon: Layers },
          { id: 'zones', label: `Hazard Zones (${hazardZones.length})`, icon: AlertTriangle },
          { id: 'services', label: `Service Licensing (${services.length})`, icon: ShieldAlert },
          { id: 'sms', label: `Mock SMS Outbox (${smsOutbox.length})`, icon: MessageSquare },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Cryptographic Audit Ledger */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Verify Hash Chain Action Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-400" />
                  Append-Only SHA-256 Audit Chain Verification
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every state transition (SOS creation, status advance, hazard creation) is chained cryptographically: <code className="text-indigo-300">H(prev_hash + block_payload)</code>
                </p>
              </div>

              <button
                onClick={handleVerifyChain}
                disabled={isVerifyingChain}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isVerifyingChain ? 'animate-spin' : ''}`} />
                <span>Verify Audit Chain Integrity</span>
              </button>
            </div>

            {/* Verification Result Banner */}
            {verificationData && (
              <div
                className={`p-4 rounded-2xl border-2 flex items-start gap-3 animate-in fade-in ${
                  verificationData.is_valid
                    ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/60 text-rose-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-sm text-white">
                    {verificationData.status_text}
                  </div>
                  <div className="font-mono text-slate-300">
                    Blocks verified: <strong className="text-white">{verificationData.blocks_verified}</strong> / {verificationData.total_blocks}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 truncate">
                    Latest Block Hash: <span className="text-emerald-400">{verificationData.latest_block_hash}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audit Blocks Explorer */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Audit Block Explorer ({auditLedger.length} Records)
            </h4>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {auditLedger.map(block => (
                <div
                  key={block.id}
                  className="bg-slate-850 p-4 rounded-2xl border border-slate-800 font-mono text-xs space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded font-bold border border-indigo-500/30">
                        Block #{block.id}
                      </span>
                      <span className="font-bold text-amber-300">{block.action}</span>
                      <span className="text-slate-400">({block.entity_table})</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(block.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-slate-300 font-sans text-xs">{block.details}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                    <div className="truncate">
                      <span>Prev Hash: </span>
                      <span className="text-slate-500">{block.prev_hash.substring(0, 24)}...</span>
                    </div>
                    <div className="truncate text-left sm:text-right">
                      <span>Block Hash: </span>
                      <span className="text-emerald-400 font-bold">{block.hash.substring(0, 24)}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Hazard Zones Management */}
      {activeTab === 'zones' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white">Manali Hazard Zones Directory</h3>
              <p className="text-xs text-slate-400">
                Configure landslide, black ice, and flood zones factored into route risk scoring
              </p>
            </div>

            <button
              onClick={() => setShowNewZoneModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hazard Zone</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hazardZones.map(zone => (
              <div
                key={zone.id}
                className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                        {zone.severity} {zone.hazard_type}
                      </span>
                      {zone.is_sample && (
                        <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                          Sample Seed
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white mt-1.5">{zone.name}</h4>
                  </div>

                  <button
                    onClick={() => handleToggleZone(zone.id, zone.is_active)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      zone.is_active
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {zone.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <p className="text-xs text-slate-300">{zone.description}</p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <span>GPS: {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</span>
                  <span>Radius: {zone.radius_meters}m</span>
                </div>
              </div>
            ))}
          </div>

          {/* New Hazard Zone Form Modal */}
          {showNewZoneModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <form
                onSubmit={handleCreateZone}
                className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4"
              >
                <h4 className="text-base font-black text-white">Create New Mountain Hazard Zone</h4>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Zone Name</label>
                  <input
                    type="text"
                    required
                    value={zoneName}
                    onChange={e => setZoneName(e.target.value)}
                    placeholder="e.g. Marhi Hairpin Loose Soil Sector"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Hazard Type</label>
                    <select
                      value={zoneType}
                      onChange={e => setZoneType(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="landslide">Landslide</option>
                      <option value="road_closure">Road Closure / Ice</option>
                      <option value="flood">Flash Flood</option>
                      <option value="road_repair">Road Repair</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Severity</label>
                    <select
                      value={zoneSeverity}
                      onChange={e => setZoneSeverity(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Radius (meters)</label>
                  <input
                    type="number"
                    value={zoneRadius}
                    onChange={e => setZoneRadius(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={zoneDescription}
                    onChange={e => setZoneDescription(e.target.value)}
                    placeholder="Details for route advice..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewZoneModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                  >
                    Save Zone
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Tourism Services Licensing & Approvals */}
      {activeTab === 'services' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-black text-white">Service Licensing & Verification Queue</h3>
            <p className="text-xs text-slate-400">
              Review and approve local tour guides, taxis and hotel homestays
            </p>
          </div>

          <div className="space-y-3">
            {services.map(srv => (
              <div
                key={srv.id}
                className="bg-slate-850 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-slate-750 px-2 py-0.5 rounded text-amber-300 border border-slate-700">
                      {srv.kind}
                    </span>
                    <h4 className="text-sm font-bold text-white">{srv.name}</h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                        srv.status === 'verified'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {srv.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Lead: {srv.provider_name} • License: {srv.license_number} • Phone: {srv.phone}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {srv.status !== 'verified' && (
                    <button
                      onClick={() => handleVerifyService(srv.id, 'verified')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Approve & Verify
                    </button>
                  )}
                  {srv.status === 'verified' && (
                    <button
                      onClick={() => handleVerifyService(srv.id, 'rejected')}
                      className="px-3 py-1.5 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-bold text-xs"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Mock SMS Outbox */}
      {activeTab === 'sms' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">Mock SMS Outbox (Hybrid Delivery Ledger)</h3>
              <p className="text-xs text-slate-400">
                Messages dispatched to tourist emergency contacts (Father, Sister) and rescue personnel
              </p>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
              Provider: Mock SMS (Demo)
            </span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {smsOutbox.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No SMS dispatched yet. Trigger 1-Tap SOS or Check-In from the Tourist tab to generate SMS records.
              </div>
            ) : (
              smsOutbox.map(sms => (
                <div
                  key={sms.id}
                  className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300">To: {sms.recipient_name}</span>
                      <span className="font-mono text-slate-400">({sms.recipient_phone})</span>
                    </div>
                    <span className="text-emerald-400 font-bold uppercase text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      Delivered ✓
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-200 border border-slate-800">
                    "{sms.body}"
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">
                    {new Date(sms.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
