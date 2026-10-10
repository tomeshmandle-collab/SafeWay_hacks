import React, { useState } from 'react';
import { 
  Compass, 
  MapPin, 
  ShieldCheck, 
  DollarSign, 
  AlertOctagon, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  CloudRain, 
  Phone, 
  UserPlus, 
  Trash2, 
  Eye, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Shield,
  Send,
  Navigation
} from 'lucide-react';
import { 
  TouristProfile, 
  Trip, 
  HazardZone, 
  RouteOption, 
  PriceBaseline, 
  ServiceProvider, 
  EmergencyContact,
  CommunityReport,
  Incident
} from '../types';
import { LeafletMap } from './LeafletMap';
import { HimachalSafetyMap } from './HimachalSafetyMap';
import { AppState } from '../utils/storage';

interface TouristViewProps {
  tourist: TouristProfile;
  trip: Trip | null;
  hazards: HazardZone[];
  routes: RouteOption[];
  priceBaselines: PriceBaseline[];
  services: ServiceProvider[];
  onUpdateTourist: (updated: TouristProfile) => void;
  onUpdateTrip: (updated: Trip | null) => void;
  onOpenPublicIdModal: () => void;
  onOpenUidaiModal?: () => void;
  onTriggerSOS: () => void;
}

export const TouristView: React.FC<TouristViewProps> = ({
  tourist,
  trip,
  hazards,
  routes,
  priceBaselines,
  services,
  onUpdateTourist,
  onUpdateTrip,
  onOpenPublicIdModal,
  onOpenUidaiModal,
  onTriggerSOS,
}) => {
  const [activeTab, setActiveTab] = useState<'routes' | 'trip' | 'prices' | 'services' | 'report' | 'id'>('routes');
  const [mapMode, setMapMode] = useState<'himachal_state' | 'manali_corridor'>('himachal_state');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route_atal_tunnel_safe');
  const [selectedHazard, setSelectedHazard] = useState<HazardZone | null>(null);

  // Price Checker State
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>(priceBaselines[0]?.id || '');
  const [quotedPriceInput, setQuotedPriceInput] = useState<string>('2200');

  // Contact management state
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactPhone, setNewContactPhone] = useState<string>('');
  const [newContactRelation, setNewContactRelation] = useState<string>('Family');
  const [showAddContact, setShowAddContact] = useState<boolean>(false);

  // Community report state
  const [reportType, setReportType] = useState<CommunityReport['type']>('landslide');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [reportSubmittedAlert, setReportSubmittedAlert] = useState<boolean>(false);

  // Haversine distance helper (km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Find nearest active hazard to current user location
  const currentLat = trip?.current_lat || 32.2396;
  const currentLng = trip?.current_lng || 77.1887;
  const accuracyM = trip?.accuracy_m || 14;

  const nearestHazard = hazards
    .filter((h) => h.active)
    .map((h) => {
      const distKm = calculateDistance(currentLat, currentLng, h.lat, h.lng);
      const distM = distKm * 1000;
      const isInside = distM <= h.radius_m;
      const isApproaching = distM <= h.radius_m + 1500;
      return { ...h, distKm, distM, isInside, isApproaching };
    })
    .sort((a, b) => a.distKm - b.distKm)[0];

  // Price analysis
  const currentBaseline = priceBaselines.find((p) => p.id === selectedBaselineId) || priceBaselines[0];
  const parsedQuote = parseFloat(quotedPriceInput);
  const isOverpriced = !isNaN(parsedQuote) && parsedQuote > (currentBaseline?.max_price || 0);
  const isFairPrice = !isNaN(parsedQuote) && parsedQuote >= (currentBaseline?.min_price || 0) && parsedQuote <= (currentBaseline?.max_price || 0);
  const isBelowMin = !isNaN(parsedQuote) && parsedQuote < (currentBaseline?.min_price || 0);

  // Trip action handlers
  const handleStartTrip = () => {
    if (tourist.contacts.length === 0) {
      alert('Trip cannot start with 0 emergency contacts! Add at least 1 consented contact.');
      return;
    }
    const singleAcknowledged = tourist.contacts.length === 1 
      ? confirm('You have only 1 emergency contact added. Proceed with reduced fallback coverage?')
      : true;

    if (!singleAcknowledged) return;

    const newTrip: Trip = {
      id: 'trip_' + Date.now(),
      tourist_id: tourist.id,
      origin: 'Mall Road, Manali',
      destination: 'Solang Valley & Rohtang Pass',
      status: 'active',
      started_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      single_contact_acknowledged: tourist.contacts.length === 1,
      location_consent: true,
      current_lat: 32.2396,
      current_lng: 77.1887,
      accuracy_m: 12,
    };
    onUpdateTrip(newTrip);
    AppState.saveTrip(newTrip);
  };

  const handleEndTrip = () => {
    if (!trip) return;
    const completed = { ...trip, status: 'completed' as const };
    onUpdateTrip(completed);
    AppState.saveTrip(completed);
  };

  const handleHeartbeatSafe = () => {
    if (!trip) return;
    const updated = { ...trip, last_heartbeat: new Date().toISOString() };
    onUpdateTrip(updated);
    AppState.saveTrip(updated);
    alert("Heartbeat recorded! Inactivity check-in timer has been reset.");
  };

  // Add Contact
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;
    if (tourist.contacts.length >= 2) {
      alert('Maximum 2 emergency contacts allowed per database constraint.');
      return;
    }
    const newContact: EmergencyContact = {
      id: 'cnt_' + Date.now(),
      name: newContactName,
      phone: newContactPhone,
      relationship: newContactRelation,
      consent_at: new Date().toISOString(),
    };
    const updated = { ...tourist, contacts: [...tourist.contacts, newContact] };
    onUpdateTourist(updated);
    AppState.saveTourist(updated);
    setNewContactName('');
    setNewContactPhone('');
    setShowAddContact(false);
  };

  const handleRemoveContact = (contactId: string) => {
    const updated = { ...tourist, contacts: tourist.contacts.filter((c) => c.id !== contactId) };
    onUpdateTourist(updated);
    AppState.saveTourist(updated);
  };

  // Submit Community Report
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;

    const newReport: CommunityReport = {
      id: 'rep_' + Date.now(),
      user_name: tourist.full_name,
      type: reportType,
      description: reportDesc,
      lat: currentLat + (Math.random() - 0.5) * 0.01,
      lng: currentLng + (Math.random() - 0.5) * 0.01,
      status: 'submitted',
      created_at: new Date().toISOString(),
      is_sample_data: true,
    };

    const currentReports = AppState.getReports();
    AppState.saveReports([newReport, ...currentReports]);

    setReportDesc('');
    setReportSubmittedAlert(true);
    setTimeout(() => setReportSubmittedAlert(false), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Geofence Advisory Banner if approaching or inside hazard */}
      {nearestHazard && (nearestHazard.isInside || nearestHazard.isApproaching) && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 shadow-lg animate-in slide-in-from-top-2 duration-300 ${
            nearestHazard.isInside
              ? 'bg-rose-950/70 border-rose-500 text-rose-200'
              : 'bg-amber-950/60 border-amber-500/60 text-amber-200'
          }`}
        >
          <AlertOctagon className={`w-6 h-6 shrink-0 mt-0.5 ${nearestHazard.isInside ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/40">
                {nearestHazard.isInside ? 'CRITICAL GEOFENCE ADVISORY' : 'APPROACH ADVISORY'}
              </span>
              <span className="text-xs text-slate-300">
                {nearestHazard.isInside ? 'Inside Hazard Radius' : `${(nearestHazard.distKm).toFixed(1)} km away`}
              </span>
            </div>
            <div className="font-bold text-white text-sm">
              {nearestHazard.name} ({nearestHazard.severity.toUpperCase()} {nearestHazard.type})
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {nearestHazard.description}
            </p>
            <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
              <span>Source: {nearestHazard.source}</span>
              <span className="text-purple-300 font-mono">(sample data)</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Tab Navigation */}
      <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
        {[
          { key: 'routes', label: 'Road Safety & Routes', icon: Compass },
          { key: 'trip', label: 'My Trip & Contacts', icon: MapPin },
          { key: 'prices', label: 'Price Checker', icon: DollarSign },
          { key: 'services', label: 'Verified Services', icon: ShieldCheck },
          { key: 'report', label: 'Report Hazard', icon: AlertTriangle },
          { key: 'id', label: 'Digital Tourist ID', icon: QrCode },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-950/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ROAD SAFETY & SAFE ROUTE (Centerpiece Demo) */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          {/* Top Info Header with Weather */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Safe Routing Engine · Piloted for Manali
                  </span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-mono">
                    sample data
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Hazard-Aware Route Ranking (Mall Road → Solang & Rohtang)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluates active landslide risks, municipal road repairs, weather, and verified community reports to recommend the safest transit.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Current GPS: <strong className="text-slate-200 font-mono">{currentLat.toFixed(4)}°N, {currentLng.toFixed(4)}°E</strong>
                </span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Foreground GPS active</span>
                </span>
              </div>
            </div>

            {/* Weather Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    External Weather Info
                  </span>
                  <h4 className="text-2xl font-black text-white mt-1">11°C</h4>
                  <p className="text-xs text-slate-300">Light Alpine Rain / Drizzle</p>
                </div>
                <CloudRain className="w-8 h-8 text-blue-400" />
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div>Road surface: <strong className="text-amber-300">Wet & Slippery</strong></div>
                <div className="text-[10px] text-slate-500">
                  Source: OpenWeather observation (sample data)
                </div>
              </div>
            </div>
          </div>

          {/* Map View Mode Selector */}
          <div className="flex items-center justify-between p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMapMode('himachal_state')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  mapMode === 'himachal_state'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Himachal Pradesh State Safety Map</span>
              </button>

              <button
                onClick={() => setMapMode('manali_corridor')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  mapMode === 'manali_corridor'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Manali Corridor Route Ranking</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500 hidden sm:inline font-mono pr-2">
              {mapMode === 'himachal_state' ? 'Full State Boundary GeoJSON' : 'Atal Tunnel vs Rohtang'}
            </span>
          </div>

          {/* Interactive Map Display */}
          {mapMode === 'himachal_state' ? (
            <HimachalSafetyMap
              currentLat={currentLat}
              currentLng={currentLng}
              accuracyM={accuracyM}
            />
          ) : (
            <LeafletMap
              currentLat={currentLat}
              currentLng={currentLng}
              accuracyM={accuracyM}
              hazards={hazards}
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              onHazardClick={(h) => setSelectedHazard(h)}
            />
          )}

          {/* Route Options Comparison Cards */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>Alternative Routes Comparison</span>
              <span className="text-xs normal-case text-slate-500 font-normal">
                (Click to select and view explainable risk formula)
              </span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routes.map((route) => {
                const isSelected = route.id === selectedRouteId;
                const isSafe = route.risk_level === 'recommended_safe';

                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`cursor-pointer rounded-3xl p-5 border transition relative overflow-hidden ${
                      isSelected
                        ? isSafe
                          ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                          isSafe
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {isSafe ? '🛡️ Recommended Safe' : '⚠️ High Hazard Exposure'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-black ${isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {route.risk_score}<span className="text-xs text-slate-400 font-normal">/100 risk</span>
                        </div>
                      </div>
                    </div>

                    <h5 className="font-bold text-white text-base mb-1">{route.name}</h5>
                    <p className="text-xs text-slate-400 mb-3">{route.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 mb-3">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Distance</span>
                        <span className="font-semibold text-slate-200">{route.distance_km} km</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Est. Drive Time</span>
                        <span className="font-semibold text-slate-200">{route.estimated_min} minutes</span>
                      </div>
                    </div>

                    {/* Contributing Factors Breakdown */}
                    <div className="text-xs space-y-1.5 pt-2 border-t border-slate-800">
                      <div className="text-slate-300 font-medium flex items-center justify-between">
                        <span>Contributing Factors:</span>
                        <span className="text-[11px] text-slate-500 font-mono">Explainable rules</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        "{route.factors.explanation}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explainable Scoring Breakdown Formula Box */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span>Explainable Risk Formula (PRD FR-28)</span>
              </h5>
              <span className="text-xs text-purple-300 font-mono bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/40">
                Rules-based scoring (No opaque black-box AI)
              </span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl font-mono text-xs text-slate-300 border border-slate-800">
              <code>risk = (w1 · hazard_proximity) + (w2 · weather_severity) + (w3 · night_factor) + (w4 · report_density)</code>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[11px]">w1 (Hazard Proximity)</span>
                <span className="font-bold text-white">40% weight</span>
              </div>
              <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[11px]">w2 (Weather Severity)</span>
                <span className="font-bold text-white">25% weight</span>
              </div>
              <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[11px]">w3 (Night / Visibility)</span>
                <span className="font-bold text-white">15% weight</span>
              </div>
              <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[11px]">w4 (Verified Reports)</span>
                <span className="font-bold text-white">20% weight</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY TRIP & EMERGENCY CONTACTS */}
      {activeTab === 'trip' && (
        <div className="space-y-6">
          {/* Trip Status Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Active Journey Status
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {trip?.destination || 'No active trip'}
                </h3>
                <p className="text-xs text-slate-400">
                  Origin: {trip?.origin || 'Manali Mall Road'} · Started: {trip ? new Date(trip.started_at).toLocaleTimeString() : 'N/A'}
                </p>
              </div>

              <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                trip?.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {trip?.status === 'active' ? '● Active Trip' : 'Trip Idle'}
              </span>
            </div>

            {/* Foreground GPS Notice as required by PRD FR-6 */}
            <div className="bg-blue-950/40 border border-blue-500/30 p-3.5 rounded-2xl flex items-center gap-3">
              <Navigation className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="text-xs text-blue-200">
                <strong>Notice:</strong> Keep SafeWay open for continuous location tracking. Background OS tracking is not claimed.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {trip?.status === 'active' ? (
                <>
                  <button
                    onClick={handleHeartbeatSafe}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-950"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I'm Safe (Send Heartbeat)</span>
                  </button>

                  <button
                    onClick={handleEndTrip}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl text-xs transition border border-slate-700"
                  >
                    End Journey
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartTrip}
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs transition shadow-lg shadow-rose-950 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Start Manali Trip (Gated by Contacts)</span>
                </button>
              )}
            </div>
          </div>

          {/* Emergency Contacts Management (FR-3 & FR-5) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-base font-bold text-white">
                  Consented Emergency Contacts ({tourist.contacts.length}/2)
                </h4>
                <p className="text-xs text-slate-400">
                  Required for automated SOS SMS alerts and inactivity alerts. Zero contacts blocks trip start.
                </p>
              </div>

              {tourist.contacts.length < 2 && !showAddContact && (
                <button
                  onClick={() => setShowAddContact(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Contact</span>
                </button>
              )}
            </div>

            {/* List Contacts */}
            <div className="space-y-3">
              {tourist.contacts.length === 0 ? (
                <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-xs text-rose-300 text-center">
                  ⚠️ No emergency contacts added yet. You cannot start a trip until at least one contact with consent is recorded!
                </div>
              ) : (
                tourist.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex justify-between items-center"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white text-sm flex items-center gap-2">
                        <span>{contact.name}</span>
                        <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                          {contact.relationship}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {contact.phone}
                      </div>
                      <div className="text-[11px] text-emerald-400/90 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Consent recorded: {new Date(contact.consent_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveContact(contact.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-900 transition"
                      title="Remove contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Contact Form */}
            {showAddContact && (
              <form onSubmit={handleAddContact} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="font-semibold text-xs text-slate-200">New Emergency Contact</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    required
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500"
                  />
                  <input
                    type="tel"
                    placeholder="+91 Phone Number"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    required
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500"
                  />
                  <select
                    value={newContactRelation}
                    onChange={(e) => setNewContactRelation(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="Parent">Parent</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Friend">Friend / Travel Partner</option>
                    <option value="Sibling">Sibling</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddContact(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Save & Record Consent
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FAIR PRICE CHECKER (PRD FR-31) */}
      {activeTab === 'prices' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Scam Prevention & Rate Card
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Fair Price Checker (Manali Pilot)
                </h3>
                <p className="text-xs text-slate-400">
                  Compares taxi quotes, trekking guides, and adventure activities against official union rate cards.
                </p>
              </div>
              <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                sample data
              </span>
            </div>

            {/* Interactive Price Evaluation Form */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Select Service / Route:
                  </label>
                  <select
                    value={selectedBaselineId}
                    onChange={(e) => setSelectedBaselineId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {priceBaselines.map((pb) => (
                      <option key={pb.id} value={pb.id}>
                        [{pb.kind.toUpperCase()}] {pb.item_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Quoted Price You Were Offered (₹ INR):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      value={quotedPriceInput}
                      onChange={(e) => setQuotedPriceInput(e.target.value)}
                      placeholder="e.g. 2200"
                      className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Price Result Evaluation Banner */}
              {currentBaseline && quotedPriceInput && (
                <div className={`p-4 rounded-2xl border transition ${
                  isOverpriced
                    ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                    : isFairPrice
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                    : 'bg-blue-950/40 border-blue-500/60 text-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {isOverpriced ? (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="font-bold text-sm">
                        {isOverpriced
                          ? `⚠️ Price seems too high!`
                          : isFairPrice
                          ? `✅ Fair Price Confirmed`
                          : `Discount / Lower than Baseline`}
                      </div>
                      <p className="text-xs text-slate-300">
                        {isOverpriced ? (
                          <>
                            You were quoted <strong className="text-white font-mono">₹{parsedQuote}</strong>, which is{' '}
                            <strong className="text-rose-400 font-mono">₹{parsedQuote - currentBaseline.max_price}</strong> above
                            the typical baseline range (<strong className="font-mono">₹{currentBaseline.min_price} – ₹{currentBaseline.max_price}</strong>).
                          </>
                        ) : isFairPrice ? (
                          <>
                            Quote of <strong className="text-white font-mono">₹{parsedQuote}</strong> falls within the official union baseline range of{' '}
                            <strong className="font-mono">₹{currentBaseline.min_price} – ₹{currentBaseline.max_price}</strong>.
                          </>
                        ) : (
                          <>
                            Quote of <strong className="text-white font-mono">₹{parsedQuote}</strong> is below the baseline minimum of ₹{currentBaseline.min_price}.
                          </>
                        )}
                      </p>
                      <div className="text-[11px] text-slate-400 pt-1">
                        Source: {currentBaseline.source} · ({currentBaseline.unit})
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* All Baselines Table */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Official Reference Baselines (Manali Region)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {priceBaselines.map((pb) => (
                  <div key={pb.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-white">{pb.item_name}</div>
                      <div className="text-slate-400 text-[11px]">{pb.unit}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400">
                        ₹{pb.min_price} – ₹{pb.max_price}
                      </div>
                      <span className="text-[10px] text-purple-400 font-mono">sample data</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VERIFIED SERVICES (PRD FR-32) */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Trust & Safety Directory
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Verified Tourism Services (Manali)
                </h3>
                <p className="text-xs text-slate-400">
                  Only verified guides, taxis, and operators are displayed. Unverified or rejected operators are filtered out.
                </p>
              </div>
              <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                sample data
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services
                .filter((s) => s.status === 'verified')
                .map((srv) => (
                  <div
                    key={srv.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold uppercase tracking-wide border border-blue-500/30">
                            {srv.kind}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-base mt-1.5">{srv.name}</h4>
                        <p className="text-xs text-slate-400">Owner: {srv.owner_name}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-amber-400 font-bold text-sm">★ {srv.rating}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">License / Reg ID</span>
                        <span className="font-mono font-semibold text-slate-300">{srv.license_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Languages</span>
                        <span className="text-slate-300">{srv.languages.join(', ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-mono text-slate-300">{srv.phone}</span>
                      <a
                        href={`tel:${srv.phone}`}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call Service</span>
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REPORT HAZARD / PROBLEM (PRD FR-33) */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Community Safety Network
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                Report a Road Hazard, Scam or Breakdown
              </h3>
              <p className="text-xs text-slate-400">
                Submissions are sent to the SafeWay response desk for authority verification before appearing on public hazard feeds.
              </p>
            </div>

            {reportSubmittedAlert && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Report received! Logged for review by the Manali Safety Command Desk.</span>
              </div>
            )}

            <form onSubmit={handleSubmitReport} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Hazard Category:
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="landslide">Landslide / Falling Rocks</option>
                    <option value="roadblock">Roadblock / Road Collapse</option>
                    <option value="accident">Traffic Accident</option>
                    <option value="wildlife">Wildlife Sighting</option>
                    <option value="scam">Pricing Scam / Overcharging</option>
                    <option value="harassment">Harassment / Safety Concern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Location Stamp (GPS):
                  </label>
                  <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono flex items-center justify-between">
                    <span>{currentLat.toFixed(4)}°N, {currentLng.toFixed(4)}°E</span>
                    <span className="text-[11px] text-emerald-400">Auto-tagged</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Detailed Description:
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe exact landmark, road conditions, obstruction width, etc."
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs transition shadow-lg shadow-rose-950 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Report to Command Desk</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: DIGITAL TOURIST ID (PRD FR-39) */}
      {activeTab === 'id' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Digital Tourist Safety ID
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Opaque Revocable Safety Pass
                </h3>
                <p className="text-xs text-slate-400">
                  Proof of safety registration for checkpoints, hotel check-in, and rescue units. Contains zero sensitive biometric data.
                </p>
              </div>

              <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                Sandbox/Demo
              </span>
            </div>

            {/* Digital ID Card */}
            <div className="max-w-md mx-auto bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/80 border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛡️</span>
                  <span className="font-black text-white text-base">SafeWay ID</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                  Verified Tourist Pass
                </span>
              </div>

              <div className="flex gap-4 items-center mb-5">
                <div className="w-20 h-20 bg-white p-2 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                  {/* QR SVG Simulation */}
                  <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950">
                    <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                    <rect x="5" y="5" width="20" height="20" fill="white" />
                    <rect x="10" y="10" width="10" height="10" fill="currentColor" />
                    <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                    <rect x="75" y="5" width="20" height="20" fill="white" />
                    <rect x="80" y="10" width="10" height="10" fill="currentColor" />
                    <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                    <rect x="5" y="75" width="20" height="20" fill="white" />
                    <rect x="10" y="80" width="10" height="10" fill="currentColor" />
                    <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                    <rect x="35" y="10" width="15" height="10" fill="currentColor" />
                    <rect x="55" y="75" width="20" height="15" fill="currentColor" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white">{tourist.full_name}</h4>
                  <div className="text-xs font-mono text-rose-300 font-bold">
                    ID: {tourist.public_id}
                  </div>
                  <div className="text-xs text-slate-400">
                    Blood Group: <strong className="text-slate-200">{tourist.blood_group || 'B+ Positive'}</strong>
                  </div>
                  <div className="text-xs text-slate-400">
                    Language: <strong className="text-slate-200">{tourist.language}</strong>
                  </div>
                  <div className="pt-1">
                    {tourist.uidai_status === 'sandbox_verified' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>UIDAI Sandbox Verified ({tourist.uidai_masked_id || 'XXXXXXXX0001'})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <span>Identity KYC: Sandbox Pending</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {tourist.uidai_status === 'sandbox_verified' ? (
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-xs space-y-1 mb-2 font-mono">
                  <div className="text-slate-400 text-[11px]">UIDAI Sandbox Txn Reference:</div>
                  <div className="text-emerald-300 text-[11px] truncate">{tourist.uidai_txn_id}</div>
                </div>
              ) : (
                <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs flex justify-between items-center mb-2">
                  <span className="text-slate-400 text-[11px]">UIDAI Sandbox Auth:</span>
                  <button
                    onClick={onOpenUidaiModal}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verify Now</span>
                  </button>
                </div>
              )}

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-xs space-y-1">
                <div className="text-slate-400">Active Destination:</div>
                <div className="font-semibold text-white">{trip?.destination || 'Manali Region'}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                <span>Issued by Himachal SafeWay Pilot</span>
                <span className="font-mono">Expires: 7 Days</span>
              </div>
            </div>

            {/* Test Public Scan */}
            <div className="text-center pt-2">
              <button
                onClick={onOpenPublicIdModal}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs transition border border-slate-700 inline-flex items-center gap-2"
              >
                <Eye className="w-4 h-4 text-purple-400" />
                <span>Simulate Public QR Scanner View (/id/{tourist.public_id})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
