import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Radio, 
  UserCheck, 
  Send, 
  Plus, 
  AlertTriangle, 
  MessageSquare, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Compass
} from 'lucide-react';
import { 
  Incident, 
  IncidentStatus, 
  HazardZone, 
  ServiceProvider, 
  CommunityReport, 
  MockSMS,
  UserRole
} from '../types';
import { AppState } from '../utils/storage';
import { HimachalSafetyMap } from './HimachalSafetyMap';

interface RescueAdminViewProps {
  currentRole: UserRole;
  incidents: Incident[];
  hazards: HazardZone[];
  services: ServiceProvider[];
  reports: CommunityReport[];
  smsOutbox: MockSMS[];
  onUpdateIncidents: (updated: Incident[]) => void;
  onUpdateHazards: (updated: HazardZone[]) => void;
  onUpdateServices: (updated: ServiceProvider[]) => void;
  onUpdateReports: (updated: CommunityReport[]) => void;
  onRefreshSMS: () => void;
}

export const RescueAdminView: React.FC<RescueAdminViewProps> = ({
  currentRole,
  incidents,
  hazards,
  services,
  reports,
  smsOutbox,
  onUpdateIncidents,
  onUpdateHazards,
  onUpdateServices,
  onUpdateReports,
  onRefreshSMS,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'map' | 'incidents' | 'hazards' | 'services' | 'reports' | 'sms' | 'sweep'>('map');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidents[0]?.id || '');
  const [responderNoteInput, setResponderNoteInput] = useState<string>('');
  const [assignedUnitInput, setAssignedUnitInput] = useState<string>('Unit 1 - Solang Rescue Team');

  // New Hazard Form state
  const [showAddHazard, setShowAddHazard] = useState<boolean>(false);
  const [newHazardName, setNewHazardName] = useState<string>('');
  const [newHazardType, setNewHazardType] = useState<HazardZone['type']>('landslide');
  const [newHazardSeverity, setNewHazardSeverity] = useState<HazardZone['severity']>('warning');
  const [newHazardLat, setNewHazardLat] = useState<string>('32.3300');
  const [newHazardLng, setNewHazardLng] = useState<string>('77.1650');
  const [newHazardRadius, setNewHazardRadius] = useState<string>('600');
  const [newHazardDesc, setNewHazardDesc] = useState<string>('');

  // Demo sweep result notification
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  // Lifecycle state transition handler
  const handleTransitionStatus = async (incidentId: string, nextStatus: IncidentStatus) => {
    const updatedIncidents = incidents.map((inc) => {
      if (inc.id === incidentId) {
        const newEvent = {
          id: 'evt_' + Date.now(),
          incident_id: inc.id,
          status: nextStatus,
          actor: currentRole === 'admin' ? 'Admin Officer' : 'Rescue Desk Vikram',
          actor_role: currentRole,
          note: `Incident status transitioned to ${nextStatus}`,
          created_at: new Date().toISOString(),
        };
        return {
          ...inc,
          status: nextStatus,
          ui_status: nextStatus,
          updated_at: new Date().toISOString(),
          events: [...inc.events, newEvent],
        };
      }
      return inc;
    });

    onUpdateIncidents(updatedIncidents);
    AppState.saveIncidents(updatedIncidents);

    // Append to audit ledger
    await AppState.appendAuditEntry(
      `INCIDENT_${nextStatus.toUpperCase()}`,
      currentRole === 'admin' ? 'Admin Officer' : 'Rescue Desk Vikram',
      currentRole,
      `Incident ${incidentId} transitioned to ${nextStatus}`
    );
  };

  // Assign responder unit
  const handleAssignUnit = async (incidentId: string) => {
    const updatedIncidents = incidents.map((inc) => {
      if (inc.id === incidentId) {
        const newEvent = {
          id: 'evt_' + Date.now(),
          incident_id: inc.id,
          status: 'assigned' as IncidentStatus,
          actor: 'Operations Commander',
          actor_role: currentRole,
          note: `Assigned unit: ${assignedUnitInput}`,
          created_at: new Date().toISOString(),
        };
        return {
          ...inc,
          assigned_to: assignedUnitInput,
          status: 'assigned' as IncidentStatus,
          ui_status: 'assigned' as IncidentStatus,
          updated_at: new Date().toISOString(),
          events: [...inc.events, newEvent],
        };
      }
      return inc;
    });

    onUpdateIncidents(updatedIncidents);
    AppState.saveIncidents(updatedIncidents);

    await AppState.appendAuditEntry(
      'INCIDENT_ASSIGNED',
      'Operations Commander',
      currentRole,
      `Incident ${incidentId} assigned to ${assignedUnitInput}`
    );
  };

  // Add operational note
  const handleAddNote = (incidentId: string) => {
    if (!responderNoteInput.trim()) return;

    const updatedIncidents = incidents.map((inc) => {
      if (inc.id === incidentId) {
        const newEvent = {
          id: 'evt_' + Date.now(),
          incident_id: inc.id,
          status: inc.status,
          actor: currentRole === 'admin' ? 'Admin' : 'Rescue Unit',
          actor_role: currentRole,
          note: responderNoteInput,
          created_at: new Date().toISOString(),
        };
        return {
          ...inc,
          responder_notes: responderNoteInput,
          events: [...inc.events, newEvent],
        };
      }
      return inc;
    });

    onUpdateIncidents(updatedIncidents);
    AppState.saveIncidents(updatedIncidents);
    setResponderNoteInput('');
  };

  // Create Hazard Zone
  const handleCreateHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHazardName) return;

    const newZone: HazardZone = {
      id: 'hz_' + Date.now(),
      name: newHazardName,
      type: newHazardType,
      severity: newHazardSeverity,
      lat: parseFloat(newHazardLat),
      lng: parseFloat(newHazardLng),
      radius_m: parseInt(newHazardRadius, 10),
      description: newHazardDesc || 'Identified road hazard in Manali area',
      active: true,
      source: 'Admin Field Inspection Command',
      created_at: new Date().toISOString(),
      is_sample_data: true,
    };

    const updated = [newZone, ...hazards];
    onUpdateHazards(updated);
    AppState.saveHazards(updated);

    await AppState.appendAuditEntry(
      'ZONE_ACTIVATED',
      'Admin Station Officer',
      'admin',
      `Hazard zone created: ${newHazardName} (${newHazardSeverity} ${newHazardType})`
    );

    setShowAddHazard(false);
    setNewHazardName('');
    setNewHazardDesc('');
  };

  // Toggle Hazard Active
  const handleToggleHazard = async (hazardId: string) => {
    const updated = hazards.map((h) => {
      if (h.id === hazardId) {
        return { ...h, active: !h.active };
      }
      return h;
    });
    onUpdateHazards(updated);
    AppState.saveHazards(updated);

    const target = updated.find((h) => h.id === hazardId);
    await AppState.appendAuditEntry(
      target?.active ? 'ZONE_ACTIVATED' : 'ZONE_DEACTIVATED',
      'Admin Officer',
      'admin',
      `Hazard zone ${target?.name} set to active=${target?.active}`
    );
  };

  // Approve / Reject Service
  const handleUpdateServiceStatus = async (serviceId: string, status: 'verified' | 'rejected') => {
    const updated = services.map((s) => {
      if (s.id === serviceId) {
        return {
          ...s,
          status,
          verified_at: status === 'verified' ? new Date().toISOString() : undefined,
        };
      }
      return s;
    });

    onUpdateServices(updated);
    AppState.saveServices(updated);

    const target = updated.find((s) => s.id === serviceId);
    await AppState.appendAuditEntry(
      status === 'verified' ? 'SERVICE_APPROVED' : 'SERVICE_REJECTED',
      'Admin Licensing Officer',
      'admin',
      `Service ${target?.name} marked as ${status}`
    );
  };

  // Verify Community Report
  const handleVerifyReport = async (reportId: string, status: 'verified' | 'rejected') => {
    const updated = reports.map((r) => {
      if (r.id === reportId) {
        return { ...r, status };
      }
      return r;
    });

    onUpdateReports(updated);
    AppState.saveReports(updated);

    const target = updated.find((r) => r.id === reportId);
    await AppState.appendAuditEntry(
      status === 'verified' ? 'REPORT_VERIFIED' : 'REPORT_REJECTED',
      'Incident Desk Vikram',
      'rescue',
      `Community report ${reportId} (${target?.type}) marked as ${status}`
    );
  };

  // Convert verified report to hazard zone (PRD FR-33)
  const handleConvertReportToZone = async (report: CommunityReport) => {
    const newZone: HazardZone = {
      id: 'hz_from_rep_' + Date.now(),
      name: `Hazard: ${report.type.toUpperCase()} (From Verified Report)`,
      type: report.type === 'accident' || report.type === 'landslide' || report.type === 'wildlife' ? report.type : 'road_closure',
      severity: 'warning',
      lat: report.lat,
      lng: report.lng,
      radius_m: 500,
      description: report.description,
      active: true,
      source: `Verified Community Report by ${report.user_name}`,
      created_at: new Date().toISOString(),
      is_sample_data: true,
    };

    const updated = [newZone, ...hazards];
    onUpdateHazards(updated);
    AppState.saveHazards(updated);

    await AppState.appendAuditEntry(
      'ZONE_ACTIVATED_FROM_REPORT',
      'Admin Officer',
      'admin',
      `Created active hazard zone from verified report ${report.id}`
    );
    alert(`Successfully converted verified report to active hazard circle (Radius: 500m)!`);
  };

  // Demo Inactivity Sweep Simulation (PRD FR-25)
  const handleTriggerDemoSweep = () => {
    const tourist = AppState.getTourist();
    const trip = AppState.getTrip();

    // 1-min Inactivity Nudge simulated
    // 2-min Contact SMS simulated
    tourist.contacts.forEach((contact) => {
      AppState.recordMockSMS(
        contact.phone,
        contact.name,
        `SafeWay Inactivity Alert: No location heartbeat or check-in received from tourist ${tourist.full_name} (${tourist.public_id}) for over scheduled window. Last known position: Mall Road / Solang Valley. (Demo sweep trigger)`,
        'inactivity_contact_sms'
      );
    });

    onRefreshSMS();
    setSweepResult(
      `Demo Inactivity Sweep Executed: In-app nudge and simulated Contact SMS dispatched to ${tourist.contacts.length} emergency contacts in Mock SMS outbox.`
    );
    setTimeout(() => setSweepResult(null), 8000);
  };

  return (
    <div className="space-y-6">
      {/* Top Command Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Safety Coordination & Operations Desk
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                Active Role: {currentRole.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Manali Incident Queue & Threat Management
            </h2>
            <p className="text-xs text-slate-400">
              Authorized responders acknowledge emergency dispatches, assign mountain patrol teams, manage hazard zones, and audit records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerDemoSweep}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trigger Demo Inactivity Sweep</span>
            </button>
          </div>
        </div>

        {sweepResult && (
          <div className="mt-4 p-3 bg-purple-950/40 border border-purple-500/40 rounded-2xl text-purple-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{sweepResult}</span>
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
        {[
          { key: 'map', label: 'HP State Safety Map', icon: Compass },
          { key: 'incidents', label: `Emergency Queue (${incidents.length})`, icon: ShieldAlert },
          { key: 'hazards', label: `Hazard Zones (${hazards.length})`, icon: AlertTriangle },
          { key: 'services', label: `Service Approvals (${services.length})`, icon: UserCheck },
          { key: 'reports', label: `Community Reports (${reports.length})`, icon: Radio },
          { key: 'sms', label: `Mock SMS Outbox (${smsOutbox.length})`, icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 0: HIMACHAL STATE SAFETY MAP */}
      {activeSubTab === 'map' && (
        <div className="space-y-4">
          <HimachalSafetyMap isDashboardMode={true} />
        </div>
      )}

      {/* SUBTAB 1: INCIDENT QUEUE */}
      {activeSubTab === 'incidents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incident List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Active Incident Queue
            </div>
            {incidents.length === 0 ? (
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl text-center text-xs text-slate-400">
                No active emergency incidents recorded.
              </div>
            ) : (
              incidents.map((inc) => {
                const isSelected = inc.id === selectedIncident?.id;
                const isResolved = inc.status === 'resolved' || inc.status === 'closed';

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className={`cursor-pointer p-4 rounded-2xl border transition ${
                      isSelected
                        ? 'bg-slate-800/90 border-blue-500 shadow-md ring-1 ring-blue-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        isResolved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : inc.status === 'in_progress'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {inc.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-bold text-white text-sm">{inc.tourist_name}</div>
                    <div className="text-xs text-rose-400 font-medium">Category: {inc.category}</div>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-1">{inc.description}</p>
                    
                    <div className="mt-2 text-[11px] text-slate-500 font-mono">
                      Ref: {inc.id} · GPS: {inc.lat.toFixed(3)}, {inc.lng.toFixed(3)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Incident Detail & Controls */}
          {selectedIncident && (
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400">
                      Incident Ref: {selectedIncident.id}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase border border-rose-500/30">
                      {selectedIncident.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    Tourist: {selectedIncident.tourist_name} ({selectedIncident.tourist_public_id})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Phone: {selectedIncident.tourist_phone} · GPS Fix: {selectedIncident.lat.toFixed(4)}°N, {selectedIncident.lng.toFixed(4)}°E (±{Math.round(selectedIncident.accuracy_m)}m)
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-400">Current Status:</div>
                  <div className="text-sm font-bold text-white uppercase tracking-wider">{selectedIncident.status}</div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">Reported Distress Summary:</span>
                <p className="text-xs text-slate-200 leading-relaxed">{selectedIncident.description}</p>
              </div>

              {/* State Transitions Toolbar (FR-16) */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Lifecycle State Transitions (PRD FR-16):
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleTransitionStatus(selectedIncident.id, 'acknowledged')}
                    className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-xl text-xs font-semibold transition"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => handleTransitionStatus(selectedIncident.id, 'in_progress')}
                    className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold transition"
                  >
                    Mark In-Progress
                  </button>
                  <button
                    onClick={() => handleTransitionStatus(selectedIncident.id, 'resolved')}
                    className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-semibold transition"
                  >
                    Resolve Incident
                  </button>
                  <button
                    onClick={() => handleTransitionStatus(selectedIncident.id, 'closed')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Assignment Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold uppercase text-slate-400">
                  Assign Responding Team (FR-35)
                </div>
                <div className="flex gap-2">
                  <select
                    value={assignedUnitInput}
                    onChange={(e) => setAssignedUnitInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="Unit 1 - Solang Rescue Team">Unit 1 - Solang Rescue Team</option>
                    <option value="Unit 2 - Atal Tunnel Emergency Quick Reaction Team">Unit 2 - Atal Tunnel QRT</option>
                    <option value="Unit 3 - Gulaba Mountain Patrol">Unit 3 - Gulaba Mountain Patrol</option>
                    <option value="Unit 4 - Mall Road Quick Response Medical">Unit 4 - Mall Road Medical</option>
                  </select>
                  <button
                    onClick={() => handleAssignUnit(selectedIncident.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Assign Unit
                  </button>
                </div>
                {selectedIncident.assigned_to && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Currently Assigned to: {selectedIncident.assigned_to}</span>
                  </div>
                )}
              </div>

              {/* Add Note & Timeline */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase text-slate-400">Incident Event Timeline</div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedIncident.events.map((evt) => (
                    <div key={evt.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{evt.actor} ({evt.actor_role})</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-mono">
                            {evt.status}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs mt-0.5">{evt.note}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Log operational note (e.g. dispatched ambulance with oxygen tank)"
                    value={responderNoteInput}
                    onChange={(e) => setResponderNoteInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500"
                  />
                  <button
                    onClick={() => handleAddNote(selectedIncident.id)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    Add Log Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: HAZARD ZONES */}
      {activeSubTab === 'hazards' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white">Active Hazard Zones & Geofences</h3>
              <p className="text-xs text-slate-400">
                Centrally managed circular hazard perimeters used by the safe routing engine and proximity alert system.
              </p>
            </div>
            {!showAddHazard && (
              <button
                onClick={() => setShowAddHazard(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Hazard Zone</span>
              </button>
            )}
          </div>

          {/* New Hazard Form */}
          {showAddHazard && (
            <form onSubmit={handleCreateHazard} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="font-semibold text-xs text-slate-200">New Hazard Perimeter</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Hazard Name (e.g. Kothi Rockfall Sector)"
                  value={newHazardName}
                  onChange={(e) => setNewHazardName(e.target.value)}
                  required
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                />
                <select
                  value={newHazardType}
                  onChange={(e) => setNewHazardType(e.target.value as any)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="landslide">Landslide</option>
                  <option value="road_repair">Road Repair / Closure</option>
                  <option value="wildlife">Wildlife Warning</option>
                  <option value="low_network">Low-Network Zone</option>
                  <option value="flood">Flood / River Overflow</option>
                </select>
                <select
                  value={newHazardSeverity}
                  onChange={(e) => setNewHazardSeverity(e.target.value as any)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="caution">Caution</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Latitude (32.xxxx)"
                  value={newHazardLat}
                  onChange={(e) => setNewHazardLat(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                />
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Longitude (77.xxxx)"
                  value={newHazardLng}
                  onChange={(e) => setNewHazardLng(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Radius in Meters (e.g. 800)"
                  value={newHazardRadius}
                  onChange={(e) => setNewHazardRadius(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <textarea
                placeholder="Description & Advisory details"
                value={newHazardDesc}
                onChange={(e) => setNewHazardDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddHazard(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
                >
                  Publish Zone
                </button>
              </div>
            </form>
          )}

          {/* List Hazards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hazards.map((h) => (
              <div key={h.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      h.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {h.severity} {h.type}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{h.name}</h4>
                  </div>

                  <button
                    onClick={() => handleToggleHazard(h.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition border ${
                      h.active
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {h.active ? '● Active' : '○ Disabled'}
                  </button>
                </div>

                <p className="text-xs text-slate-300">{h.description}</p>

                <div className="text-[11px] text-slate-400 font-mono pt-1 flex justify-between border-t border-slate-800/80">
                  <span>GPS: {h.lat.toFixed(4)}, {h.lng.toFixed(4)}</span>
                  <span>Radius: {h.radius_m}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: SERVICE APPROVALS */}
      {activeSubTab === 'services' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Tourism Service Verification Desk</h3>
            <p className="text-xs text-slate-400">
              Review and certify guides, taxis, and operators. Approved services get an immutable verified audit badge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((srv) => (
              <div key={srv.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {srv.kind}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{srv.name}</h4>
                    <p className="text-xs text-slate-400">Owner: {srv.owner_name} · Lic: {srv.license_number}</p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase ${
                    srv.status === 'verified'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : srv.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {srv.status}
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  {srv.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateServiceStatus(srv.id, 'rejected')}
                        className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-semibold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleUpdateServiceStatus(srv.id, 'verified')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                      >
                        Approve & Verify
                      </button>
                    </>
                  )}
                  {srv.status === 'verified' && (
                    <span className="text-xs text-emerald-400 font-mono">
                      ✓ Audit Record Anchored
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: COMMUNITY REPORTS */}
      {activeSubTab === 'reports' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Crowd Hazard Reports Verification</h3>
            <p className="text-xs text-slate-400">
              Community submissions must be vetted by responders before appearing on tourist route hazard maps.
            </p>
          </div>

          <div className="space-y-3">
            {reports.map((rep) => (
              <div key={rep.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {rep.type}
                    </span>
                    <span className="font-semibold text-white text-xs">Report by {rep.user_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      rep.status === 'verified' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {rep.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{rep.description}</p>
                  <div className="text-[11px] text-slate-500 font-mono">
                    GPS: {rep.lat.toFixed(4)}, {rep.lng.toFixed(4)} · Submitted: {new Date(rep.created_at).toLocaleTimeString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rep.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleVerifyReport(rep.id, 'rejected')}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-semibold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerifyReport(rep.id, 'verified')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                      >
                        Verify Report
                      </button>
                    </>
                  )}
                  {rep.status === 'verified' && (
                    <button
                      onClick={() => handleConvertReportToZone(rep)}
                      className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Convert to Hazard Zone</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: MOCK SMS OUTBOX (PRD FR-36 & FR-38) */}
      {activeSubTab === 'sms' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">
                Mock SMS Provider · Outbox Audit
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Dispatched Emergency SMS Log
              </h3>
              <p className="text-xs text-slate-400">
                Transparently labelled "Mock SMS" per honesty guidelines. Simulates carrier dispatch to consented contacts.
              </p>
            </div>
            <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
              Mock SMS
            </span>
          </div>

          <div className="space-y-3">
            {smsOutbox.map((msg) => (
              <div key={msg.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{msg.recipient_name}</span>
                    <span className="text-slate-400 font-mono">({msg.to_phone})</span>
                  </div>
                  <span className="text-[10px] text-purple-400 font-mono bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                    {msg.provider} · {msg.type}
                  </span>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono">
                  "{msg.message}"
                </div>

                <div className="text-[11px] text-slate-500 font-mono text-right">
                  Sent: {new Date(msg.sent_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
