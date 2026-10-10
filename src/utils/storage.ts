import { 
  TouristProfile, 
  Trip, 
  HazardZone, 
  RouteOption, 
  PriceBaseline, 
  ServiceProvider, 
  Incident, 
  CommunityReport, 
  AuditBlock, 
  MockSMS,
  SOSCategory,
  IncidentStatus,
  UserRole
} from '../types';
import { 
  INITIAL_TOURIST, 
  INITIAL_TRIP, 
  INITIAL_HAZARDS, 
  INITIAL_ROUTES, 
  INITIAL_PRICE_BASELINES, 
  INITIAL_SERVICES, 
  INITIAL_INCIDENTS, 
  INITIAL_REPORTS 
} from './initialData';
import { computeBlockHash } from './crypto';

const STORAGE_KEYS = {
  TOURIST: 'safeway_tourist',
  TRIP: 'safeway_trip',
  HAZARDS: 'safeway_hazards',
  SERVICES: 'safeway_services',
  INCIDENTS: 'safeway_incidents',
  REPORTS: 'safeway_reports',
  AUDIT: 'safeway_audit',
  SMS_OUTBOX: 'safeway_sms_outbox',
  OFFLINE_QUEUE: 'safeway_offline_queue',
};

// Helper to safely get from localStorage
function getStored<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error:', e);
  }
}

// Initial audit chain generator
export async function generateInitialAuditLedger(): Promise<AuditBlock[]> {
  const t0 = new Date(Date.now() - 86400000).toISOString();
  const t1 = new Date(Date.now() - 72000000).toISOString();
  const t2 = new Date(Date.now() - 3600000).toISOString();
  const t3 = new Date(Date.now() - 3300000).toISOString();

  const b0Hash = await computeBlockHash(0, t0, 'GENESIS_BLOCK', 'SYSTEM', 'system', 'SafeWay Tamper-Evident Ledger Initialized for Manali Pilot', '0'.repeat(64));
  const b1Hash = await computeBlockHash(1, t1, 'ZONE_ACTIVATED', 'Admin Officer', 'admin', 'Activated Marhi Landslide Sector (Radius: 800m)', b0Hash);
  const b2Hash = await computeBlockHash(2, t2, 'SOS_SUBMITTED', 'Mayank Sharma', 'tourist', 'SOS clnt_uuid_901 triggered (Category: lost_stranded)', b1Hash);
  const b3Hash = await computeBlockHash(3, t3, 'INCIDENT_ACKNOWLEDGED', 'Dispatcher Vikram', 'rescue', 'Incident inc_mnl_901 acknowledged by Manali Station', b2Hash);

  return [
    {
      index: 0,
      timestamp: t0,
      action: 'GENESIS_BLOCK',
      actor: 'SYSTEM',
      actor_role: 'system',
      payload_summary: 'SafeWay Tamper-Evident Ledger Initialized for Manali Pilot',
      prev_hash: '0'.repeat(64),
      block_hash: b0Hash,
      verified: true,
    },
    {
      index: 1,
      timestamp: t1,
      action: 'ZONE_ACTIVATED',
      actor: 'Admin Officer',
      actor_role: 'admin',
      payload_summary: 'Activated Marhi Landslide Sector (Radius: 800m)',
      prev_hash: b0Hash,
      block_hash: b1Hash,
      verified: true,
    },
    {
      index: 2,
      timestamp: t2,
      action: 'SOS_SUBMITTED',
      actor: 'Mayank Sharma',
      actor_role: 'tourist',
      payload_summary: 'SOS clnt_uuid_901 triggered (Category: lost_stranded)',
      prev_hash: b1Hash,
      block_hash: b2Hash,
      verified: true,
    },
    {
      index: 3,
      timestamp: t3,
      action: 'INCIDENT_ACKNOWLEDGED',
      actor: 'Dispatcher Vikram',
      actor_role: 'rescue',
      payload_summary: 'Incident inc_mnl_901 acknowledged by Manali Station',
      prev_hash: b2Hash,
      block_hash: b3Hash,
      verified: true,
    },
  ];
}

export class AppState {
  static getTourist(): TouristProfile {
    return getStored<TouristProfile>(STORAGE_KEYS.TOURIST, INITIAL_TOURIST);
  }

  static saveTourist(tourist: TouristProfile): void {
    setStored(STORAGE_KEYS.TOURIST, tourist);
  }

  static getTrip(): Trip | null {
    return getStored<Trip | null>(STORAGE_KEYS.TRIP, INITIAL_TRIP);
  }

  static saveTrip(trip: Trip | null): void {
    setStored(STORAGE_KEYS.TRIP, trip);
  }

  static getHazards(): HazardZone[] {
    return getStored<HazardZone[]>(STORAGE_KEYS.HAZARDS, INITIAL_HAZARDS);
  }

  static saveHazards(hazards: HazardZone[]): void {
    setStored(STORAGE_KEYS.HAZARDS, hazards);
  }

  static getRoutes(): RouteOption[] {
    return INITIAL_ROUTES;
  }

  static getPriceBaselines(): PriceBaseline[] {
    return INITIAL_PRICE_BASELINES;
  }

  static getServices(): ServiceProvider[] {
    return getStored<ServiceProvider[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  }

  static saveServices(services: ServiceProvider[]): void {
    setStored(STORAGE_KEYS.SERVICES, services);
  }

  static getIncidents(): Incident[] {
    return getStored<Incident[]>(STORAGE_KEYS.INCIDENTS, INITIAL_INCIDENTS);
  }

  static saveIncidents(incidents: Incident[]): void {
    setStored(STORAGE_KEYS.INCIDENTS, incidents);
  }

  static getReports(): CommunityReport[] {
    return getStored<CommunityReport[]>(STORAGE_KEYS.REPORTS, INITIAL_REPORTS);
  }

  static saveReports(reports: CommunityReport[]): void {
    setStored(STORAGE_KEYS.REPORTS, reports);
  }

  static getSMSOutbox(): MockSMS[] {
    return getStored<MockSMS[]>(STORAGE_KEYS.SMS_OUTBOX, [
      {
        id: 'sms_init_1',
        to_phone: '+91 98765 43210',
        recipient_name: 'Ramesh Sharma (Father)',
        message: 'SafeWay Alert: Mayank Sharma initiated active trip Manali to Solang Valley & Rohtang Pass. Emergency tracking enabled.',
        type: 'trip_status',
        sent_at: new Date(Date.now() - 7200000).toISOString(),
        provider: 'Mock SMS',
      },
      {
        id: 'sms_init_2',
        to_phone: '+91 98765 43210',
        recipient_name: 'Ramesh Sharma (Father)',
        message: 'EMERGENCY SOS: Mayank Sharma (ID: SW-MNL-84920) reported lost_stranded near GPS 32.3190, 77.1950. Local Mountain Patrol dispatched.',
        type: 'sos_alert',
        sent_at: new Date(Date.now() - 3600000).toISOString(),
        provider: 'Mock SMS',
      },
    ]);
  }

  static saveSMSOutbox(outbox: MockSMS[]): void {
    setStored(STORAGE_KEYS.SMS_OUTBOX, outbox);
  }

  static async getAuditLedger(): Promise<AuditBlock[]> {
    const stored = localStorage.getItem(STORAGE_KEYS.AUDIT);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fallback below
      }
    }
    const initial = await generateInitialAuditLedger();
    setStored(STORAGE_KEYS.AUDIT, initial);
    return initial;
  }

  static saveAuditLedger(ledger: AuditBlock[]): void {
    setStored(STORAGE_KEYS.AUDIT, ledger);
  }

  static async appendAuditEntry(
    action: string,
    actor: string,
    actor_role: string,
    payload_summary: string
  ): Promise<AuditBlock> {
    const currentLedger = await this.getAuditLedger();
    const lastBlock = currentLedger[currentLedger.length - 1];
    const prevHash = lastBlock ? lastBlock.block_hash : '0'.repeat(64);
    const newIndex = currentLedger.length;
    const timestamp = new Date().toISOString();

    const blockHash = await computeBlockHash(
      newIndex,
      timestamp,
      action,
      actor,
      actor_role,
      payload_summary,
      prevHash
    );

    const newBlock: AuditBlock = {
      index: newIndex,
      timestamp,
      action,
      actor,
      actor_role,
      payload_summary,
      prev_hash: prevHash,
      block_hash: blockHash,
      verified: true,
    };

    const updated = [...currentLedger, newBlock];
    this.saveAuditLedger(updated);
    return newBlock;
  }

  static getOfflineQueue(): Incident[] {
    return getStored<Incident[]>(STORAGE_KEYS.OFFLINE_QUEUE, []);
  }

  static saveOfflineQueue(queue: Incident[]): void {
    setStored(STORAGE_KEYS.OFFLINE_QUEUE, queue);
  }

  // Send an SMS to mock outbox
  static recordMockSMS(
    to_phone: string,
    recipient_name: string,
    message: string,
    type: MockSMS['type']
  ): void {
    const current = this.getSMSOutbox();
    const newSMS: MockSMS = {
      id: 'sms_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      to_phone,
      recipient_name,
      message,
      type,
      sent_at: new Date().toISOString(),
      provider: 'Mock SMS',
    };
    this.saveSMSOutbox([newSMS, ...current]);
  }
}
