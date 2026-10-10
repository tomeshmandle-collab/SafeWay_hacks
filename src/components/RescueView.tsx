import React, { useState } from 'react';
import {
  LifeBuoy,
  AlertTriangle,
  Clock,
  Phone,
  CheckCircle2,
  Send,
  UserCheck,
  MapPin,
  Battery,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { Incident, HazardZone } from '../types';
import { api } from '../lib/api';
import { InteractiveMap } from './InteractiveMap';

interface RescueViewProps {
  incidents: Incident[];
  hazardZones: HazardZone[];
  onIncidentUpdated: () => void;
}

export const RescueView: React.FC<RescueViewProps> = ({
  incidents,
  hazardZones,
  onIncidentUpdated,
}) => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    incidents.length > 0 ? incidents[0] : null
  );
  const [assigneeUnit, setAssigneeUnit] = useState('Manali Quick Response Unit 1 (Officer Rana)');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAcknowledge = async (id: string) => {
    setIsUpdating(true);
    try {
      const updated = await api.acknowledgeIncident(id, 'Manali DEOC Central Desk');
      setSelectedIncident(updated);
      onIncidentUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssign = async (id: string) => {
    setIsUpdating(true);
    try {
      const updated = await api.assignIncident(id, assigneeUnit);
      setSelectedIncident(updated);
      onIncidentUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const updated = await api.updateIncidentStatus(id, newStatus, statusNote || `Status updated to ${newStatus}`);
      setSelectedIncident(updated);
      setStatusNote('');
      onIncidentUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const activeIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'cancelled');
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved');

  return (
    <div className="space-y-6 pb-16">
      
      {/* Rescue Control Center Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-rose-900/60 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-950 flex-shrink-0">
              <LifeBuoy className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                  Authority Console
                </span>
                <span className="text-xs text-slate-400">Station ID: MNL-DEOC-01</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                District Emergency Operation Center (DEOC)
              </h1>
              <p className="text-xs text-slate-300">
                Live monitoring, rapid SOS dispatch and incident response for Manali Sub-division.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-xl text-center">
              <div className="text-xl font-black text-rose-400">{activeIncidents.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Active SOS</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-xl text-center">
              <div className="text-xl font-black text-emerald-400">{resolvedIncidents.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Resolved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Map displaying Active Incidents */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-400" />
            <h2 className="font-bold text-white text-base">Live Emergency Geospatial Grid</h2>
          </div>
          <span className="text-xs text-slate-400">Pulsing pins denote active SOS requests</span>
        </div>

        <InteractiveMap
          hazardZones={hazardZones}
          incidents={incidents}
          userLocation={selectedIncident ? [selectedIncident.latitude, selectedIncident.longitude] : [32.2432, 77.1892]}
          heightClass="h-[360px]"
        />
      </div>

      {/* Main Split: Incidents Queue on Left, Selected Incident Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Incidents Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
            Incoming SOS Queue ({incidents.length})
          </h3>

          <div className="space-y-2.5">
            {incidents.map(inc => {
              const isSelected = selectedIncident?.id === inc.id;
              const isCritical = inc.severity === 'critical';
              const isResolved = inc.status === 'resolved';

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950/30 border-rose-500 shadow-lg shadow-rose-950/20'
                      : isResolved
                      ? 'bg-slate-850/40 border-slate-800 opacity-70 hover:opacity-100'
                      : 'bg-slate-850 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            isCritical
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-amber-500 text-slate-950'
                          }`}
                        >
                          {inc.severity}
                        </span>
                        <span className="font-mono text-xs font-bold text-white">{inc.reference}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">{inc.reporter_name}</h4>
                      <p className="text-xs text-slate-400 truncate max-w-[240px]">{inc.description}</p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          inc.status === 'submitted'
                            ? 'bg-rose-900/60 text-rose-300 border border-rose-500/40'
                            : inc.status === 'acknowledged'
                            ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                            : inc.status === 'assigned'
                            ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40'
                            : inc.status === 'in_progress'
                            ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-500/40'
                            : 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {inc.status}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        GPS ±{inc.accuracy_meters}m
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Incident Deep Dive & Action Controls (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl sticky top-24">
              
              {/* Incident Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {selectedIncident.reference}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      Category: {selectedIncident.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">
                    {selectedIncident.reporter_name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                    <a
                      href={`tel:${selectedIncident.reporter_phone}`}
                      className="text-amber-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {selectedIncident.reporter_phone}
                    </a>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Battery className="w-3.5 h-3.5" />
                      {selectedIncident.battery_level || 75}% Battery
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs text-slate-400">Coordinates Locked</div>
                  <div className="font-mono text-xs font-bold text-emerald-400">
                    {selectedIncident.latitude.toFixed(4)}, {selectedIncident.longitude.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Accuracy: ±{selectedIncident.accuracy_meters}m
                  </div>
                </div>
              </div>

              {/* Description Quote */}
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200">
                <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">
                  Reported Distress Statement
                </span>
                {selectedIncident.description}
              </div>

              {/* Dispatch Action Panel */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Command & Dispatch Action
                </h4>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedIncident.status === 'submitted' && (
                    <button
                      onClick={() => handleAcknowledge(selectedIncident.id)}
                      disabled={isUpdating}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>1. Acknowledge Receipt</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <select
                      value={assigneeUnit}
                      onChange={e => setAssigneeUnit(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="Manali Quick Response Unit 1 (Officer Rana)">Manali Unit 1 (Officer Rana)</option>
                      <option value="Manali 4x4 Mountain Recovery Unit 2 (Officer Chauhan)">Manali Unit 2 (Winch 4x4)</option>
                      <option value="Palchan Police Outpost Patrol">Palchan Outpost Patrol</option>
                      <option value="Solang Valley Medical Rescue Ambulance">Solang Medical Ambulance</option>
                    </select>

                    <button
                      onClick={() => handleAssign(selectedIncident.id)}
                      disabled={isUpdating}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign</span>
                    </button>
                  </div>
                </div>

                {/* Transition Status Row */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs text-slate-400 mr-1">Advance Status:</span>
                  {['in_progress', 'resolved'].map(st => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedIncident.id, st)}
                      disabled={isUpdating || selectedIncident.status === st}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        selectedIncident.status === st
                          ? 'bg-emerald-600 text-white border-emerald-500 opacity-60'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      {st === 'in_progress' ? 'Mark En Route / On Scene' : 'Mark Resolved ✓'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Timeline */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Incident Response Ledger & History
                </h4>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {selectedIncident.events.map((ev, idx) => (
                    <div
                      key={ev.id || idx}
                      className="bg-slate-850 p-3 rounded-xl border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-300">
                          {ev.actor_name} ({ev.actor_role})
                        </span>
                        <span className="text-slate-500">
                          {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{ev.notes}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
              Select an incident from the queue to view full telemetry and dispatch responders.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
