import React, { useState, useEffect } from 'react';
import { 
  UserRole, 
  TouristProfile, 
  Trip, 
  HazardZone, 
  RouteOption, 
  PriceBaseline, 
  ServiceProvider, 
  Incident, 
  CommunityReport, 
  MockSMS, 
  AuditBlock 
} from './types';
import { AppState } from './utils/storage';
import { Navbar } from './components/Navbar';
import { TouristView } from './components/TouristView';
import { RescueAdminView } from './components/RescueAdminView';
import { AuditLedgerView } from './components/AuditLedgerView';
import { SOSModal } from './components/SOSModal';
import { PublicIdVerifyModal } from './components/PublicIdVerifyModal';
import { CinematicHero } from './components/CinematicHero';
import { UidaiVerificationModal } from './components/UidaiVerificationModal';

export const App: React.FC = () => {
  // App Core State
  const [currentRole, setCurrentRole] = useState<UserRole>('tourist');
  const [activeView, setActiveView] = useState<'tourist' | 'rescue_admin' | 'audit_ledger'>('tourist');
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState<boolean>(false);
  const [isPublicIdModalOpen, setIsPublicIdModalOpen] = useState<boolean>(false);
  const [isUidaiModalOpen, setIsUidaiModalOpen] = useState<boolean>(false);

  // Domain Entities
  const [tourist, setTourist] = useState<TouristProfile>(AppState.getTourist());
  const [trip, setTrip] = useState<Trip | null>(AppState.getTrip());
  const [hazards, setHazards] = useState<HazardZone[]>(AppState.getHazards());
  const [routes] = useState<RouteOption[]>(AppState.getRoutes());
  const [priceBaselines] = useState<PriceBaseline[]>(AppState.getPriceBaselines());
  const [services, setServices] = useState<ServiceProvider[]>(AppState.getServices());
  const [incidents, setIncidents] = useState<Incident[]>(AppState.getIncidents());
  const [reports, setReports] = useState<CommunityReport[]>(AppState.getReports());
  const [smsOutbox, setSmsOutbox] = useState<MockSMS[]>(AppState.getSMSOutbox());
  const [auditLedger, setAuditLedger] = useState<AuditBlock[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<Incident[]>(AppState.getOfflineQueue());

  // Load audit ledger asynchronously
  useEffect(() => {
    AppState.getAuditLedger().then((ledger) => {
      setAuditLedger(ledger);
    });
  }, []);

  // Sync offline queue when coming back online or manual sync trigger
  const handleSyncQueue = async () => {
    const queue = AppState.getOfflineQueue();
    if (queue.length === 0) return;

    const currentInc = AppState.getIncidents();
    const updatedInc = [...queue.map((item) => ({ ...item, is_offline_queued: false, ui_status: 'submitted' as const })), ...currentInc];
    
    // Update state
    setIncidents(updatedInc);
    AppState.saveIncidents(updatedInc);

    // Record mock SMS and audit entries for each synced incident
    for (const item of queue) {
      tourist.contacts.forEach((contact) => {
        AppState.recordMockSMS(
          contact.phone,
          contact.name,
          `EMERGENCY ALERT (Synced from offline queue): Tourist ${item.tourist_name} (${item.tourist_public_id}) activated SOS [${item.category.toUpperCase()}]. Location: ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}. Response unit alerted.`,
          'sos_alert'
        );
      });

      await AppState.appendAuditEntry(
        'SOS_SYNCED_FROM_OFFLINE_QUEUE',
        item.tourist_name,
        'tourist',
        `Synced incident ${item.id} from device offline queue. Category=${item.category}`
      );
    }

    // Clear offline queue
    AppState.saveOfflineQueue([]);
    setOfflineQueue([]);
    setSmsOutbox(AppState.getSMSOutbox());
    const freshLedger = await AppState.getAuditLedger();
    setAuditLedger(freshLedger);
  };

  const handleToggleOffline = () => {
    const next = !isSimulatedOffline;
    setIsSimulatedOffline(next);
    if (!next && offlineQueue.length > 0) {
      handleSyncQueue();
    }
  };

  const handleRefreshSMS = () => {
    setSmsOutbox(AppState.getSMSOutbox());
  };

  const handleRefreshLedger = async () => {
    const fresh = await AppState.getAuditLedger();
    setAuditLedger(fresh);
  };

  const handleIncidentCreated = async (newIncident: Incident) => {
    if (isSimulatedOffline) {
      setOfflineQueue(AppState.getOfflineQueue());
    } else {
      setIncidents(AppState.getIncidents());
      setSmsOutbox(AppState.getSMSOutbox());
      const fresh = await AppState.getAuditLedger();
      setAuditLedger(fresh);
    }
  };

  // Automatically switch activeView when role changes if appropriate
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'rescue' || role === 'admin') {
      setActiveView('rescue_admin');
    } else if (role === 'tourist') {
      setActiveView('tourist');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        isSimulatedOffline={isSimulatedOffline}
        onToggleOffline={handleToggleOffline}
        queuedItemsCount={offlineQueue.length}
        onSyncQueue={handleSyncQueue}
        onTriggerSOS={() => setIsSOSModalOpen(true)}
        activeView={activeView}
        onViewChange={(v) => setActiveView(v)}
        onOpenUidaiModal={() => setIsUidaiModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeView === 'tourist' && (
          <>
            <CinematicHero
              tourist={tourist}
              onExploreRoutes={() => {
                setActiveView('tourist');
              }}
              onOpenUidaiModal={() => setIsUidaiModalOpen(true)}
              onTriggerSOS={() => setIsSOSModalOpen(true)}
            />
            <TouristView
              tourist={tourist}
              trip={trip}
              hazards={hazards}
              routes={routes}
              priceBaselines={priceBaselines}
              services={services}
              onUpdateTourist={(updated) => setTourist(updated)}
              onUpdateTrip={(updated) => setTrip(updated)}
              onOpenPublicIdModal={() => setIsPublicIdModalOpen(true)}
              onOpenUidaiModal={() => setIsUidaiModalOpen(true)}
              onTriggerSOS={() => setIsSOSModalOpen(true)}
            />
          </>
        )}

        {activeView === 'rescue_admin' && (
          <RescueAdminView
            currentRole={currentRole}
            incidents={incidents}
            hazards={hazards}
            services={services}
            reports={reports}
            smsOutbox={smsOutbox}
            onUpdateIncidents={(updated) => setIncidents(updated)}
            onUpdateHazards={(updated) => setHazards(updated)}
            onUpdateServices={(updated) => setServices(updated)}
            onUpdateReports={(updated) => setReports(updated)}
            onRefreshSMS={handleRefreshSMS}
          />
        )}

        {activeView === 'audit_ledger' && (
          <AuditLedgerView
            ledger={auditLedger}
            onRefreshLedger={handleRefreshLedger}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto space-y-1">
          <p>
            SafeWay · Prototype Tourist Safety & Emergency Coordination System for Manali, Himachal Pradesh.
          </p>
          <p className="text-[11px] text-slate-600">
            Seeded zones, rate cards, and mock SMS alerts are labelled sample data. Aligned with Indian emergency dispatch standards (112, 100, 108).
          </p>
        </div>
      </footer>

      {/* SOS Modal Dialog */}
      <SOSModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        tourist={tourist}
        currentLat={trip?.current_lat || 32.2396}
        currentLng={trip?.current_lng || 77.1887}
        accuracyM={trip?.accuracy_m || 14}
        isSimulatedOffline={isSimulatedOffline}
        onIncidentCreated={handleIncidentCreated}
      />

      {/* Public ID Verification Modal Dialog */}
      <PublicIdVerifyModal
        isOpen={isPublicIdModalOpen}
        onClose={() => setIsPublicIdModalOpen(false)}
        tourist={tourist}
        trip={trip}
      />

      {/* UIDAI Sandbox Authentication Modal Dialog */}
      <UidaiVerificationModal
        isOpen={isUidaiModalOpen}
        onClose={() => setIsUidaiModalOpen(false)}
        tourist={tourist}
        onVerificationComplete={(updated) => {
          setTourist(updated);
          AppState.getAuditLedger().then(setAuditLedger);
        }}
      />
    </div>
  );
};
