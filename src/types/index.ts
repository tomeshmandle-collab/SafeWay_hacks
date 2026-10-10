export type UserRole = 'tourist' | 'guide' | 'rescue' | 'admin';

export type IncidentStatus = 
  | 'submitted'
  | 'acknowledged'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'cancelled'
  | 'duplicate';

export type IncidentCategory = 
  | 'medical'
  | 'accident'
  | 'lost_stranded'
  | 'personal_safety'
  | 'other';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type ServiceKind = 'guide' | 'taxi' | 'hotel' | 'operator';
export type ServiceStatus = 'pending' | 'verified' | 'rejected';

export type ReportType = 
  | 'accident'
  | 'landslide'
  | 'flood'
  | 'roadblock'
  | 'scam'
  | 'harassment';

export type ReportStatus = 'submitted' | 'verified' | 'rejected';

export type HazardType = 
  | 'landslide'
  | 'flood'
  | 'road_closure'
  | 'road_repair'
  | 'wildlife'
  | 'low_network'
  | 'restricted';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  priority: number;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  public_id: string; // e.g. TID-2026-MNL-7842
  blood_group: string;
  medical_conditions: string[];
  emergency_contacts: EmergencyContact[];
  identity_status: 'verified' | 'pending' | 'mock_verified';
  active_trip_id?: string;
  quiet_hours_enabled: boolean;
}

export interface HazardZone {
  id: string;
  name: string;
  hazard_type: HazardType;
  severity: Severity;
  latitude: number;
  longitude: number;
  radius_meters: number;
  description: string;
  is_active: boolean;
  source: 'authority' | 'crowd' | 'seed';
  created_at: string;
  is_sample: boolean;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  actor_role: UserRole;
  actor_name: string;
  event_type: 'submitted' | 'acknowledged' | 'assigned' | 'status_change' | 'note';
  from_status?: IncidentStatus;
  to_status?: IncidentStatus;
  notes?: string;
  created_at: string;
}

export interface Incident {
  id: string;
  reference: string; // e.g. INC-2026-1042
  client_id: string;
  reporter_id: string;
  reporter_name: string;
  reporter_phone: string;
  category: IncidentCategory;
  severity: Severity;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  battery_level?: number;
  description?: string;
  assigned_responder?: string;
  created_at: string;
  updated_at: string;
  events: IncidentEvent[];
  is_sample: boolean;
}

export interface TourismService {
  id: string;
  name: string;
  kind: ServiceKind;
  provider_name: string;
  license_number: string;
  phone: string;
  rating: number;
  price_range: string;
  languages: string[];
  location: string;
  status: ServiceStatus;
  verified_at?: string;
  is_sample: boolean;
  emergency_trained: boolean;
}

export interface CommunityReport {
  id: string;
  reporter_name: string;
  report_type: ReportType;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  location_name: string;
  status: ReportStatus;
  created_at: string;
  verified_at?: string;
  photo_url?: string;
}

export interface PriceCheckBaseline {
  id: string;
  category: string;
  route_or_item: string;
  min_price: number;
  max_price: number;
  fair_benchmark: number;
  unit: string;
  advisory_note: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  entity_table: string;
  entity_id: string;
  actor_role: UserRole;
  actor_id: string;
  prev_hash: string;
  hash: string;
  created_at: string;
  details: string;
}

export interface MockSmsMessage {
  id: string;
  recipient_phone: string;
  recipient_name: string;
  body: string;
  subject_type: 'sos_alert' | 'status_update' | 'checkin';
  created_at: string;
  status: 'sent' | 'delivered';
}

export interface RouteOption {
  id: string;
  name: string;
  via: string;
  distance_km: number;
  duration_mins: number;
  risk_score: number; // 0 to 100
  advisory_level: 'safe' | 'caution' | 'warning' | 'danger';
  risk_factors: string[];
  hazards_encountered: string[];
  coordinates: [number, number][]; // lat, lng
}
