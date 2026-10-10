import {
  UserProfile,
  HazardZone,
  TourismService,
  CommunityReport,
  PriceCheckBaseline,
  Incident,
  AuditEntry,
  MockSmsMessage,
  RouteOption,
  UserRole
} from '../types';
import { supabase } from './supabase';

export const API_BASE = '';

// Helper to simulate network condition (for testing fallback ladder)
let networkSimulatorMode: 'online' | 'weak' | 'offline' = 'online';

export function setNetworkSimulator(mode: 'online' | 'weak' | 'offline') {
  networkSimulatorMode = mode;
}

export function getNetworkSimulator(): 'online' | 'weak' | 'offline' {
  return networkSimulatorMode;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (networkSimulatorMode === 'offline') {
    throw new Error('Network offline (Simulated)');
  }

  if (networkSimulatorMode === 'weak') {
    // Add artificial delay
    await new Promise(r => setTimeout(r, 1800));
  }

  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // User Profile
  getMe: () => request<UserProfile>('/api/v1/me'),
  updateMe: (data: Partial<UserProfile>) =>
    request<UserProfile>('/api/v1/me', { method: 'PATCH', body: JSON.stringify(data) }),
  regenerateQr: () =>
    request<{ public_id: string; message: string }>('/api/v1/me/qr/regenerate', { method: 'POST' }),
  verifyPublicId: (publicId: string) =>
    request<any>(`/api/v1/id/${encodeURIComponent(publicId)}/verify`),

  // Weather
  getWeather: () => request<any>('/api/v1/weather'),

  // Hazard Zones
  getZones: () => request<HazardZone[]>('/api/v1/zones'),
  createZone: (data: Partial<HazardZone>) =>
    request<HazardZone>('/api/v1/admin/zones', { method: 'POST', body: JSON.stringify(data) }),
  toggleZone: (id: string, is_active: boolean) =>
    request<HazardZone>(`/api/v1/admin/zones/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),

  // Routes
  rankRoutes: (destination: string) =>
    request<{ ranked_routes: RouteOption[]; destination: string }>('/api/v1/routes/rank', {
      method: 'POST',
      body: JSON.stringify({ destination }),
    }),

  // Fair Price
  checkPrice: (category: string, route_or_item: string, quoted_price: number) =>
    request<{
      baseline: PriceCheckBaseline;
      quoted_price: number;
      status: 'fair' | 'moderate' | 'overpriced';
      message: string;
      difference_percent: number;
      tourist_advice: string;
    }>('/api/v1/price/check', {
      method: 'POST',
      body: JSON.stringify({ category, route_or_item, quoted_price }),
    }),
  getPriceBaselines: () => request<PriceCheckBaseline[]>('/api/v1/price/baselines'),

  // Services
  getServices: (kind?: string) =>
    request<TourismService[]>(`/api/v1/services${kind ? `?kind=${kind}` : ''}`),
  verifyService: (id: string, status: 'verified' | 'rejected') =>
    request<TourismService>(`/api/v1/admin/services/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Community Reports
  getReports: () => request<CommunityReport[]>('/api/v1/reports'),
  submitReport: (data: Partial<CommunityReport>) =>
    request<CommunityReport>('/api/v1/reports', { method: 'POST', body: JSON.stringify(data) }),
  verifyReport: (id: string, status: 'verified' | 'rejected') =>
    request<CommunityReport>(`/api/v1/admin/reports/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Emergency SOS
  submitSos: async (data: {
    category?: string;
    severity?: string;
    latitude: number;
    longitude: number;
    accuracy_meters?: number;
    description?: string;
    battery_level?: number;
  }) => {
    const clientId = `cid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return request<{ duplicate: boolean; incident: Incident; message: string }>('/api/v1/sos', {
      method: 'POST',
      headers: {
        'Idempotency-Key': clientId,
      },
      body: JSON.stringify({
        client_id: clientId,
        ...data,
      }),
    });
  },

  getIncidents: (role: UserRole = 'tourist') =>
    request<Incident[]>(`/api/v1/incidents?role=${role}`),
  getIncident: (id: string) => request<Incident>(`/api/v1/incidents/${id}`),
  acknowledgeIncident: (id: string, responderName?: string) =>
    request<Incident>(`/api/v1/incidents/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ responder_name: responderName }),
    }),
  assignIncident: (id: string, responder_name: string) =>
    request<Incident>(`/api/v1/incidents/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ responder_name }),
    }),
  updateIncidentStatus: (id: string, status: string, notes?: string) =>
    request<Incident>(`/api/v1/incidents/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    }),

  // "I'm Safe" Check-In
  submitCheckin: (coords: { latitude: number; longitude: number; location_name?: string }) =>
    request<{ success: boolean; message: string; timestamp: string }>('/api/v1/checkins', {
      method: 'POST',
      body: JSON.stringify(coords),
    }),

  // Audit Ledger & Integrity
  getAuditLedger: () => request<AuditEntry[]>('/api/v1/admin/audit'),
  verifyAuditChain: () =>
    request<{
      is_valid: boolean;
      blocks_verified: number;
      total_blocks: number;
      latest_block_hash: string;
      tampered_block_id: number | null;
      verified_at: string;
      status_text: string;
    }>('/api/v1/audit/verify'),

  // Mock SMS Outbox
  getSmsOutbox: () => request<MockSmsMessage[]>('/api/v1/admin/sms-outbox'),

  // Demo Sweep
  triggerDemoSweep: () =>
    request<any>('/api/v1/admin/jobs/inactivity-sweep', { method: 'POST' }),
};
