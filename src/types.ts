export type UserRole = 'tourist' | 'guide' | 'rescue' | 'admin';

export type SOSCategory = 'medical' | 'accident' | 'lost_stranded' | 'personal_safety' | 'other';

export type IncidentStatus = 
  | 'submitted' 
  | 'acknowledged' 
  | 'assigned' 
  | 'in_progress' 
  | 'resolved' 
  | 'closed' 
  | 'cancelled'
  | 'duplicate';

export type UIIncidentStatus = IncidentStatus | 'pending' | 'manually_sent' | 'failed';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  consent_at: string;
}

export interface TouristProfile {
  id: string;
  public_id: string;
  full_name: string;
  phone: string;
  language: string;
  blood_group?: string;
  is_verified_demo: boolean;
  contacts: EmergencyContact[];
  uidai_status?: 'unverified' | 'sandbox_verified' | 'failed' | 'pending';
  uidai_txn_id?: string;
  uidai_verified_at?: string;
  uidai_masked_id?: string;
}

export interface Trip {
  id: string;
  tourist_id: string;
  destination: string;
  origin: string;
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  last_heartbeat: string;
  single_contact_acknowledged: boolean;
  location_consent: boolean;
  current_lat: number;
  current_lng: number;
  accuracy_m: number;
}

export interface HazardZone {
  id: string;
  name: string;
  type: 'landslide' | 'flood' | 'road_closure' | 'road_repair' | 'wildlife' | 'low_network' | 'restricted' | 'accident';
  severity: 'info' | 'caution' | 'warning' | 'critical';
  lat: number;
  lng: number;
  radius_m: number;
  description: string;
  active: boolean;
  source: string;
  created_at: string;
  is_sample_data: boolean;
}

export interface RouteOption {
  id: string;
  name: string;
  description: string;
  distance_km: number;
  estimated_min: number;
  risk_level: 'recommended_safe' | 'caution' | 'high_risk';
  risk_score: number;
  coordinates: [number, number][];
  factors: {
    hazard_proximity: number;
    weather_severity: number;
    night_factor: number;
    report_density: number;
    explanation: string;
  };
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  status: IncidentStatus;
  actor: string;
  actor_role: UserRole;
  note: string;
  created_at: string;
}

export interface Incident {
  id: string;
  client_id: string;
  tourist_id: string;
  tourist_name: string;
  tourist_public_id: string;
  tourist_phone: string;
  category: SOSCategory;
  description: string;
  lat: number;
  lng: number;
  accuracy_m: number;
  status: IncidentStatus;
  ui_status?: UIIncidentStatus;
  severity: 'high' | 'critical';
  assigned_to?: string;
  responder_notes?: string;
  created_at: string;
  updated_at: string;
  events: IncidentEvent[];
  is_offline_queued?: boolean;
}

export interface MockSMS {
  id: string;
  to_phone: string;
  recipient_name: string;
  message: string;
  type: 'sos_alert' | 'inactivity_nudge' | 'inactivity_contact_sms' | 'trip_status';
  sent_at: string;
  provider: 'Mock SMS';
}

export interface AuditBlock {
  index: number;
  timestamp: string;
  action: string;
  actor: string;
  actor_role: string;
  payload_summary: string;
  prev_hash: string;
  block_hash: string;
  verified?: boolean;
}

export interface ServiceProvider {
  id: string;
  kind: 'guide' | 'taxi' | 'hotel' | 'operator';
  name: string;
  owner_name: string;
  phone: string;
  license_number: string;
  languages: string[];
  rating: number;
  status: 'verified' | 'pending' | 'rejected';
  verified_at?: string;
  is_sample_data: boolean;
}

export interface PriceBaseline {
  id: string;
  kind: 'taxi' | 'guide' | 'hotel' | 'activity';
  item_name: string;
  min_price: number;
  max_price: number;
  unit: string;
  source: string;
  is_sample_data: boolean;
}

export interface CommunityReport {
  id: string;
  user_name: string;
  type: 'landslide' | 'accident' | 'roadblock' | 'wildlife' | 'scam' | 'harassment';
  description: string;
  lat: number;
  lng: number;
  status: 'submitted' | 'verified' | 'rejected';
  created_at: string;
  photo_url?: string;
  is_sample_data: boolean;
}
