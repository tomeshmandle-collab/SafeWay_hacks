import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json());

// In-Memory Data Store (per AI Studio migration guidelines)
interface AuditBlock {
  id: number;
  action: string;
  entity_table: string;
  entity_id: string;
  actor_role: string;
  actor_id: string;
  prev_hash: string;
  hash: string;
  created_at: string;
  details: string;
}

interface MockSms {
  id: string;
  recipient_phone: string;
  recipient_name: string;
  body: string;
  subject_type: 'sos_alert' | 'status_update' | 'checkin';
  created_at: string;
  status: 'sent' | 'delivered';
}

const auditLedger: AuditBlock[] = [];
const smsOutbox: MockSms[] = [];

// Helper to compute SHA-256 for audit chaining
function computeHash(prevHash: string, dataStr: string): string {
  return crypto.createHash('sha256').update(prevHash + ':' + dataStr).digest('hex');
}

function appendAuditEntry(
  action: string,
  entityTable: string,
  entityId: string,
  actorRole: string,
  actorId: string,
  details: string
): AuditBlock {
  const prevHash = auditLedger.length === 0
    ? '0000000000000000000000000000000000000000000000000000000000000000'
    : auditLedger[auditLedger.length - 1].hash;

  const id = auditLedger.length + 1;
  const createdAt = new Date().toISOString();
  const payloadToHash = `${id}|${action}|${entityTable}|${entityId}|${actorRole}|${actorId}|${createdAt}|${details}`;
  const hash = computeHash(prevHash, payloadToHash);

  const block: AuditBlock = {
    id,
    action,
    entity_table: entityTable,
    entity_id: entityId,
    actor_role: actorRole,
    actor_id: actorId,
    prev_hash: prevHash,
    hash,
    created_at: createdAt,
    details
  };

  auditLedger.push(block);
  return block;
}

// Initial Genesis Entry
appendAuditEntry('GENESIS_INITIALIZED', 'system', 'root-0', 'admin', 'sys-0', 'SafeWay audit ledger initialized for Manali pilot deployment');

// User Profile (Tourist Mayank Kumar)
let userProfile = {
  id: 'usr_manali_01',
  full_name: 'Mayank Kumar',
  email: 'mayank.tourist@safeway.gov.in',
  phone: '+91 98765 43210',
  role: 'tourist' as const,
  public_id: 'TID-2026-MNL-7842',
  blood_group: 'O+',
  medical_conditions: ['Mild Asthma (Carries Inhaler)'],
  emergency_contacts: [
    { id: 'cnt-1', name: 'Rajesh Kumar (Father)', relationship: 'Father', phone: '+91 98111 22334', priority: 1 },
    { id: 'cnt-2', name: 'Pooja Kumar (Sister)', relationship: 'Sister', phone: '+91 98222 33445', priority: 2 }
  ],
  identity_status: 'verified' as const,
  active_trip_id: 'trip-manali-solang-01',
  quiet_hours_enabled: false
};

// Hazard Zones in Manali Pilot Area
let hazardZones = [
  {
    id: 'zone-101',
    name: 'Solang-Palchan Landslide Prone Sector',
    hazard_type: 'landslide',
    severity: 'high',
    latitude: 32.3168,
    longitude: 77.1585,
    radius_meters: 650,
    description: 'Active unstable rock face on NH-3 approaching Solang. Heavy slope erosion reported after recent rains.',
    is_active: true,
    source: 'authority',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    is_sample: true
  },
  {
    id: 'zone-102',
    name: 'Gulaba - Marhi Black Ice & Frost Segment',
    hazard_type: 'road_closure',
    severity: 'critical',
    latitude: 32.3392,
    longitude: 77.2024,
    radius_meters: 900,
    description: 'Severe sub-zero black ice. Rohtang pass approach closed for two-wheelers without snow chains.',
    is_active: true,
    source: 'authority',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    is_sample: true
  },
  {
    id: 'zone-103',
    name: 'Beas Riverbank Flash Flood Precaution Buffer',
    hazard_type: 'flood',
    severity: 'medium',
    latitude: 32.2415,
    longitude: 77.1860,
    radius_meters: 350,
    description: 'High discharge from Pandoh Dam upstream. Tourists strictly advised not to descend to water edge.',
    is_active: true,
    source: 'authority',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    is_sample: true
  },
  {
    id: 'zone-104',
    name: 'Old Manali Bridge Maintenance & Single Lane',
    hazard_type: 'road_repair',
    severity: 'low',
    latitude: 32.2530,
    longitude: 77.1820,
    radius_meters: 200,
    description: 'Culvert structural reinforcement underway. 15-20 min intermittent vehicular stoppage during peak hours.',
    is_active: true,
    source: 'seed',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    is_sample: true
  }
];

// Price Baselines for Fair Price Checker (Manali Pilot)
const priceBaselines = [
  {
    id: 'pb-1',
    category: 'Taxi / Cab',
    route_or_item: 'Mall Road to Solang Valley (One Way / Drop)',
    min_price: 1000,
    max_price: 1400,
    fair_benchmark: 1200,
    unit: 'per cab (sedan/hatchback)',
    advisory_note: 'Government taxi union fixed rate is ₹1,200 for standard sedans. Beware private touts quoting ₹2,500+.'
  },
  {
    id: 'pb-2',
    category: 'Taxi / Cab',
    route_or_item: 'Manali to Rohtang Pass (Full Day Excursion & Permit)',
    min_price: 2800,
    max_price: 3800,
    fair_benchmark: 3200,
    unit: 'per vehicle (includes NGT Green Tax)',
    advisory_note: 'Ensure driver has official Rohtang NGT permit stamp. Rates exceeding ₹4,500 are overpricing scams.'
  },
  {
    id: 'pb-3',
    category: 'Adventure',
    route_or_item: 'Solang Valley Paragliding (Short Flight 1-2 min)',
    min_price: 1000,
    max_price: 1600,
    fair_benchmark: 1200,
    unit: 'per person with certified pilot',
    advisory_note: 'Must verify pilot Himachal Tourism Dept license badge and mandatory equipment inspection tag.'
  },
  {
    id: 'pb-4',
    category: 'Guide',
    route_or_item: 'Certified Alpine Guide (Jogini Falls / Old Manali Trek)',
    min_price: 1500,
    max_price: 2200,
    fair_benchmark: 1800,
    unit: 'per day / group up to 5',
    advisory_note: 'Approved guides carry Himachal Tourism ID card. Includes basic wilderness first aid kit.'
  },
  {
    id: 'pb-5',
    category: 'Adventure',
    route_or_item: 'Beas River Rafting (7 km Pirdi to Jhiri stretch)',
    min_price: 800,
    max_price: 1300,
    fair_benchmark: 1000,
    unit: 'per person including life jacket & helmet',
    advisory_note: 'Rafting is only permitted between 9:00 AM and 4:30 PM. Rafting operator must have HP-ADV registration.'
  },
  {
    id: 'pb-6',
    category: 'Hotel / Stay',
    route_or_item: 'Standard Deluxe Mountain View Room (Old Manali)',
    min_price: 1800,
    max_price: 3200,
    fair_benchmark: 2400,
    unit: 'per night (regular season)',
    advisory_note: 'Always verify room heater charges in winter. Standard GST rate is 12% on rooms below ₹7,500.'
  }
];

// Tourism Services (Guides, Taxis, Operators)
let tourismServices = [
  {
    id: 'srv-01',
    name: 'Himalayan Ridge Certified Alpine Guides',
    kind: 'guide' as const,
    provider_name: 'Tenzing Norbu & Team',
    license_number: 'HP-TM-4821',
    phone: '+91 94180 55123',
    rating: 4.9,
    price_range: '₹1,600 - ₹2,200 / day',
    languages: ['Hindi', 'English', 'Pahari'],
    location: 'Old Manali, near Club House',
    status: 'verified' as const,
    verified_at: '2026-08-15T10:00:00Z',
    is_sample: true,
    emergency_trained: true
  },
  {
    id: 'srv-02',
    name: 'Manali Eco-Cab Cooperative Union',
    kind: 'taxi' as const,
    provider_name: 'Ramesh Thakur (Fleet Lead)',
    license_number: 'HP-TX-9901',
    phone: '+91 98160 33441',
    rating: 4.8,
    price_range: 'Standard HP Govt Tariffs',
    languages: ['Hindi', 'English', 'Punjabi'],
    location: 'Mall Road Taxi Stand #3',
    status: 'verified' as const,
    verified_at: '2026-08-20T12:00:00Z',
    is_sample: true,
    emergency_trained: true
  },
  {
    id: 'srv-03',
    name: 'Solang Wings Paragliding & Adventure Association',
    kind: 'operator' as const,
    provider_name: 'Vikram Negi',
    license_number: 'HP-ADV-3105',
    phone: '+91 98055 77889',
    rating: 4.7,
    price_range: '₹1,200 - ₹3,500 / session',
    languages: ['Hindi', 'English'],
    location: 'Solang Valley Ground #2',
    status: 'verified' as const,
    verified_at: '2026-09-01T09:30:00Z',
    is_sample: true,
    emergency_trained: true
  },
  {
    id: 'srv-04',
    name: 'Pine Crest Heritage Boutique Homestay',
    kind: 'hotel' as const,
    provider_name: 'Sunita Sharma',
    license_number: 'HP-HST-1184',
    phone: '+91 98170 88220',
    rating: 4.9,
    price_range: '₹2,200 - ₹3,400 / night',
    languages: ['Hindi', 'English'],
    location: 'Vashisht Village, Upper Manali',
    status: 'verified' as const,
    verified_at: '2026-09-10T14:00:00Z',
    is_sample: true,
    emergency_trained: false
  },
  {
    id: 'srv-05',
    name: 'Private Rohtang Shuttles (Unverified Review)',
    kind: 'taxi' as const,
    provider_name: 'Sunny Taxi Rentals',
    license_number: 'Pending Submission',
    phone: '+91 98166 00112',
    rating: 3.4,
    price_range: 'Variable Rates',
    languages: ['Hindi'],
    location: 'Private Bus Stand',
    status: 'pending' as const,
    is_sample: true,
    emergency_trained: false
  }
];

// Incidents List
let incidents: any[] = [
  {
    id: 'inc-seed-01',
    reference: 'INC-2026-1042',
    client_id: 'c1042-seed-demo',
    reporter_id: 'usr_manali_01',
    reporter_name: 'Mayank Kumar',
    reporter_phone: '+91 98765 43210',
    category: 'lost_stranded',
    severity: 'high',
    status: 'acknowledged',
    latitude: 32.2854,
    longitude: 77.1680,
    accuracy_meters: 15,
    battery_level: 68,
    description: 'Vehicle tire punctured on isolated bend near Palchan in heavy mist. Need roadside recovery.',
    assigned_responder: 'Manali Quick Response Unit 2 (Officer Chauhan)',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    is_sample: true,
    events: [
      {
        id: 'ev-1',
        incident_id: 'inc-seed-01',
        actor_role: 'tourist',
        actor_name: 'Mayank Kumar',
        event_type: 'submitted',
        from_status: undefined,
        to_status: 'submitted',
        notes: 'SOS triggered via SafeWay App. GPS fix verified (15m accuracy).',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'ev-2',
        incident_id: 'inc-seed-01',
        actor_role: 'rescue',
        actor_name: 'Manali Rescue Dispatch (Desk 4)',
        event_type: 'acknowledged',
        from_status: 'submitted',
        to_status: 'acknowledged',
        notes: 'Control room acknowledged. Notified Palchan police patrol post.',
        created_at: new Date(Date.now() - 3600000 * 1.8).toISOString()
      },
      {
        id: 'ev-3',
        incident_id: 'inc-seed-01',
        actor_role: 'rescue',
        actor_name: 'Manali Rescue Dispatch',
        event_type: 'assigned',
        from_status: 'acknowledged',
        to_status: 'assigned',
        notes: 'Dispatched Unit 2 (Officer Chauhan) in 4x4 Gypsy with recovery winch.',
        created_at: new Date(Date.now() - 3600000 * 1).toISOString()
      }
    ]
  }
];

// Community Reports
let communityReports = [
  {
    id: 'rep-1',
    reporter_name: 'Aakash Verma (Tourist)',
    report_type: 'landslide',
    title: 'Loose scree stones falling near Palchan Bridge',
    description: 'Noticeable small rocks rolling down hillside during afternoon showers. Cars slowing down.',
    latitude: 32.2950,
    longitude: 77.1620,
    location_name: 'NH-3 Km Marker 12, near Palchan',
    status: 'verified' as const,
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    verified_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'rep-2',
    reporter_name: 'Shivika (Local Traveler)',
    report_type: 'scam',
    title: 'Touts overcharging ₹4,500 for Rohtang snow dress rentals',
    description: 'Unofficial vendors on Kothi road falsely claiming snow boots are mandatory for ₹1,500 extra.',
    latitude: 32.3210,
    longitude: 77.1950,
    location_name: 'Kothi Village Checkpoint',
    status: 'submitted' as const,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString()
  }
];

// ---------------- API ROUTES ----------------

// Public Health & Readiness
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'safeway-api',
    version: '1.0.0-pilot-manali'
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({
    status: 'ready',
    database: 'connected_in_memory_mock',
    audit_chain_valid: true,
    total_audit_blocks: auditLedger.length
  });
});

// Profile / Current User
app.get('/api/v1/me', (_req: Request, res: Response) => {
  res.json(userProfile);
});

app.patch('/api/v1/me', (req: Request, res: Response) => {
  const { full_name, phone, blood_group, medical_conditions, emergency_contacts, role } = req.body;
  if (full_name) userProfile.full_name = full_name;
  if (phone) userProfile.phone = phone;
  if (blood_group) userProfile.blood_group = blood_group;
  if (medical_conditions) userProfile.medical_conditions = medical_conditions;
  if (emergency_contacts) userProfile.emergency_contacts = emergency_contacts;
  if (role) userProfile.role = role;

  appendAuditEntry(
    'PROFILE_UPDATED',
    'profiles',
    userProfile.id,
    userProfile.role,
    userProfile.id,
    `Updated tourist profile for ${userProfile.full_name}`
  );

  res.json(userProfile);
});

// Regenerate Tourist Public QR ID
app.post('/api/v1/me/qr/regenerate', (_req: Request, res: Response) => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newPublicId = `TID-2026-MNL-${randomSuffix}`;
  userProfile.public_id = newPublicId;

  appendAuditEntry(
    'QR_REGENERATED',
    'profiles',
    userProfile.id,
    'tourist',
    userProfile.id,
    `Rotated public ID to ${newPublicId}`
  );

  res.json({ public_id: newPublicId, message: 'Tourist Public ID updated successfully.' });
});

// Public verification for QR scanner
app.get('/api/v1/id/:publicId/verify', (req: Request, res: Response) => {
  const { publicId } = req.params;
  const isSelf = userProfile.public_id === publicId;

  if (isSelf) {
    return res.json({
      valid: true,
      public_id: userProfile.public_id,
      tourist_name: userProfile.full_name,
      blood_group: userProfile.blood_group,
      identity_status: userProfile.identity_status,
      active_trip: userProfile.active_trip_id ? 'Manali Adventure Circuit' : 'No active trip',
      verified_by: 'Himachal Pradesh Tourism Safety Registry',
      issued_at: '2026-10-10T00:00:00Z',
      integrity_hash: computeHash('TID', userProfile.public_id)
    });
  }

  // Generic fallback verification for demo mock
  return res.json({
    valid: true,
    public_id: publicId,
    tourist_name: 'Verified SafeWay Traveler',
    blood_group: 'B+',
    identity_status: 'verified',
    active_trip: 'Manali Circuit',
    verified_by: 'Himachal Tourism Safety Registry',
    issued_at: new Date().toISOString(),
    integrity_hash: computeHash('TID', publicId)
  });
});

// Weather for Manali
app.get('/api/v1/weather', (_req: Request, res: Response) => {
  res.json({
    location: 'Manali, Himachal Pradesh',
    elevation_meters: 2050,
    temperature_celsius: 12.4,
    condition: 'Partly Cloudy with Mist',
    humidity_percent: 74,
    wind_kmh: 8.5,
    visibility_km: 4.2,
    advisory: 'Wet mountain road conditions near Nehru Kund. Reduced daylight visibility after 17:30 IST.',
    forecast_warning: 'Light afternoon rainfall expected over Solang valley slopes. High landslide risk on wet soil.',
    source: 'OpenWeather Cached Feed / IMD Manali Station',
    timestamp: new Date().toISOString()
  });
});

// Hazard Zones
app.get('/api/v1/zones', (_req: Request, res: Response) => {
  res.json(hazardZones.filter(z => z.is_active));
});

// Admin Zone management
app.post('/api/v1/admin/zones', (req: Request, res: Response) => {
  const { name, hazard_type, severity, latitude, longitude, radius_meters, description } = req.body;
  const newZone = {
    id: `zone-${Date.now()}`,
    name: name || 'Reported Hazard Area',
    hazard_type: hazard_type || 'landslide',
    severity: severity || 'medium',
    latitude: Number(latitude) || 32.2432,
    longitude: Number(longitude) || 77.1892,
    radius_meters: Number(radius_meters) || 400,
    description: description || 'Advisory hazard area created by administrator.',
    is_active: true,
    source: 'authority',
    created_at: new Date().toISOString(),
    is_sample: false
  };

  hazardZones.unshift(newZone);

  appendAuditEntry(
    'HAZARD_ZONE_CREATED',
    'hazard_zones',
    newZone.id,
    'admin',
    'adm-01',
    `Created hazard zone: ${newZone.name} (${newZone.hazard_type})`
  );

  res.status(201).json(newZone);
});

app.patch('/api/v1/admin/zones/:zone_id', (req: Request, res: Response) => {
  const { zone_id } = req.params;
  const zone = hazardZones.find(z => z.id === zone_id);
  if (!zone) return res.status(404).json({ error: 'Hazard zone not found' });

  if (typeof req.body.is_active === 'boolean') {
    zone.is_active = req.body.is_active;
  }
  if (req.body.severity) zone.severity = req.body.severity;
  if (req.body.description) zone.description = req.body.description;

  appendAuditEntry(
    'HAZARD_ZONE_UPDATED',
    'hazard_zones',
    zone.id,
    'admin',
    'adm-01',
    `Toggled hazard zone ${zone.name}: active=${zone.is_active}`
  );

  res.json(zone);
});

// Route Risk Ranking (Mall Road to Solang Valley / Rohtang)
app.post('/api/v1/routes/rank', (req: Request, res: Response) => {
  const { destination = 'Solang Valley' } = req.body;

  // Real-time calculation based on active hazard zones touching routes
  const activeLandslides = hazardZones.filter(z => z.is_active && z.hazard_type === 'landslide');
  const activeRoadRepairs = hazardZones.filter(z => z.is_active && z.hazard_type === 'road_repair');

  const routes = [
    {
      id: 'route-safest',
      name: 'Route 1: SafeWay Recommended (Shanag Bypass)',
      via: 'Via Shanag Link Road & Vashisht Bypass',
      distance_km: 15.8,
      duration_mins: 42,
      risk_score: 18,
      advisory_level: 'safe',
      risk_factors: [
        'Bypasses active Solang-Palchan landslide corridor completely',
        'Well-maintained multi-lane road with reinforced retaining walls',
        'Cellular coverage (4G/5G) maintained continuously across entire stretch'
      ],
      hazards_encountered: [],
      coordinates: [
        [32.2432, 77.1892], // Mall Road Manali
        [32.2530, 77.1850],
        [32.2680, 77.1820], // Shanag link
        [32.2880, 77.1720],
        [32.3050, 77.1610],
        [32.3160, 77.1550]  // Solang Valley arrival
      ]
    },
    {
      id: 'route-fastest',
      name: 'Route 2: Direct Old Highway (High Hazard Alert)',
      via: 'Direct via NH-3 Nehru Kund & Palchan Gorge',
      distance_km: 13.2,
      duration_mins: 34,
      risk_score: 74,
      advisory_level: 'warning',
      risk_factors: [
        `Touches active hazard zone: "${activeLandslides[0]?.name || 'Solang Landslide Sector'}"`,
        'Vulnerable narrow mountain bends with blind hairpin turns',
        'Reported loose gravel and 2 verified community scree hazard reports',
        activeRoadRepairs.length > 0 ? 'Intermittent 15-min stoppage at bridge repair site' : 'Single lane section'
      ],
      hazards_encountered: [
        'Solang-Palchan Landslide Prone Sector (650m buffer)',
        'Old Manali Bridge Maintenance & Single Lane'
      ],
      coordinates: [
        [32.2432, 77.1892], // Mall Road
        [32.2580, 77.1810],
        [32.2780, 77.1730], // Nehru Kund
        [32.2980, 77.1640], // Palchan (near hazard)
        [32.3168, 77.1585], // Landslide zone point
        [32.3160, 77.1550]  // Solang Valley
      ]
    }
  ];

  res.json({
    destination,
    ranked_routes: routes,
    generated_at: new Date().toISOString(),
    formula_weights: {
      hazard_zones: 0.50,
      weather_conditions: 0.15,
      night_risk: 0.10,
      verified_reports: 0.25
    }
  });
});

// Fair Price Checker
app.post('/api/v1/price/check', (req: Request, res: Response) => {
  const { category, route_or_item, quoted_price } = req.body;
  const price = parseFloat(quoted_price);

  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'Valid quoted_price number is required' });
  }

  // Find best baseline match
  let baseline = priceBaselines.find(b =>
    (category && b.category.toLowerCase().includes(category.toLowerCase())) ||
    (route_or_item && b.route_or_item.toLowerCase().includes(route_or_item.toLowerCase()))
  );

  if (!baseline) {
    baseline = priceBaselines[0]; // default to Mall Road taxi
  }

  const { min_price, max_price, fair_benchmark } = baseline;
  let status: 'fair' | 'moderate' | 'overpriced';
  let message = '';
  let difference_percent = Math.round(((price - fair_benchmark) / fair_benchmark) * 100);

  if (price <= max_price) {
    status = 'fair';
    message = `Fair Price. Your quoted price of ₹${price.toLocaleString()} is within the authorized reference range (₹${min_price.toLocaleString()} – ₹${max_price.toLocaleString()}).`;
  } else if (price <= max_price * 1.30) {
    status = 'moderate';
    message = `Slightly Elevated (+${difference_percent}%). Quoted ₹${price.toLocaleString()} is slightly above normal standard rate of ₹${fair_benchmark.toLocaleString()}. You can negotiate closer to ₹${fair_benchmark.toLocaleString()}.`;
  } else {
    status = 'overpriced';
    message = `Overpricing Alert! Quoted price of ₹${price.toLocaleString()} is ${difference_percent}% higher than the official government baseline of ₹${fair_benchmark.toLocaleString()} (Max standard: ₹${max_price.toLocaleString()}). Beware of touts!`;
  }

  res.json({
    baseline,
    quoted_price: price,
    status,
    message,
    difference_percent,
    tourist_advice: status === 'overpriced'
      ? 'Politely decline and book via the official Taxi Union Counter on Mall Road or choose an authorized SafeWay verified provider.'
      : 'Price matches local standards. Confirm all inclusions (tolls, parking, waiting time) before departing.'
  });
});

app.get('/api/v1/price/baselines', (_req: Request, res: Response) => {
  res.json(priceBaselines);
});

// Tourism Services
app.get('/api/v1/services', (req: Request, res: Response) => {
  const { kind, verified_only = 'true' } = req.query;
  let list = tourismServices;
  if (verified_only === 'true') {
    list = list.filter(s => s.status === 'verified');
  }
  if (kind) {
    list = list.filter(s => s.kind === kind);
  }
  res.json(list);
});

app.patch('/api/v1/admin/services/:id/verify', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status = 'verified' } = req.body;
  const srv = tourismServices.find(s => s.id === id);
  if (!srv) return res.status(404).json({ error: 'Service not found' });

  srv.status = status;
  if (status === 'verified') {
    srv.verified_at = new Date().toISOString();
  }

  appendAuditEntry(
    'SERVICE_VERIFICATION_UPDATED',
    'services',
    srv.id,
    'admin',
    'adm-01',
    `Updated status of service ${srv.name} to ${srv.status}`
  );

  res.json(srv);
});

// Community Problem Reports
app.get('/api/v1/reports', (_req: Request, res: Response) => {
  res.json(communityReports);
});

app.post('/api/v1/reports', (req: Request, res: Response) => {
  const { report_type, title, description, latitude, longitude, location_name } = req.body;
  const newReport = {
    id: `rep-${Date.now()}`,
    reporter_name: userProfile.full_name,
    report_type: report_type || 'landslide',
    title: title || 'Tourist Hazard Report',
    description: description || '',
    latitude: Number(latitude) || 32.2432,
    longitude: Number(longitude) || 77.1892,
    location_name: location_name || 'Manali Region',
    status: 'submitted' as const,
    created_at: new Date().toISOString()
  };

  communityReports.unshift(newReport);

  appendAuditEntry(
    'COMMUNITY_REPORT_SUBMITTED',
    'reports',
    newReport.id,
    'tourist',
    userProfile.id,
    `New problem report submitted: ${newReport.title} (${newReport.report_type})`
  );

  res.status(201).json(newReport);
});

app.patch('/api/v1/admin/reports/:id/verify', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status = 'verified' } = req.body;
  const report = communityReports.find(r => r.id === id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  report.status = status;
  if (status === 'verified') {
    report.verified_at = new Date().toISOString();
  }

  appendAuditEntry(
    'REPORT_VERIFICATION_UPDATED',
    'reports',
    report.id,
    'admin',
    'adm-01',
    `Report ${report.id} marked as ${status}`
  );

  res.json(report);
});

// SOS Emergency Endpoints
app.post('/api/v1/sos', (req: Request, res: Response) => {
  const { client_id, category = 'personal_safety', severity = 'high', latitude, longitude, accuracy_meters = 10, battery_level, description } = req.body;

  // Check idempotency
  const existing = incidents.find(i => i.client_id === client_id);
  if (existing) {
    return res.json({
      duplicate: true,
      incident: existing,
      message: 'Idempotent request: SOS incident already recorded.'
    });
  }

  const incidentId = `inc-${Date.now()}`;
  const reference = `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newIncident = {
    id: incidentId,
    reference,
    client_id: client_id || `cid-${Date.now()}`,
    reporter_id: userProfile.id,
    reporter_name: userProfile.full_name,
    reporter_phone: userProfile.phone,
    category,
    severity,
    status: 'submitted',
    latitude: Number(latitude) || 32.2432,
    longitude: Number(longitude) || 77.1892,
    accuracy_meters: Number(accuracy_meters) || 10,
    battery_level: battery_level || 85,
    description: description || 'Emergency SOS triggered from SafeWay tourist application.',
    created_at: now,
    updated_at: now,
    events: [
      {
        id: `ev-${Date.now()}`,
        incident_id: incidentId,
        actor_role: 'tourist',
        actor_name: userProfile.full_name,
        event_type: 'submitted',
        from_status: undefined,
        to_status: 'submitted',
        notes: `Emergency SOS initiated at coordinates ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)} with ±${accuracy_meters}m accuracy.`,
        created_at: now
      }
    ],
    is_sample: false
  };

  incidents.unshift(newIncident);

  // Automatically queue mock SMS to registered emergency contacts (Hybrid SMS model)
  userProfile.emergency_contacts.forEach((contact, idx) => {
    const smsId = `sms-${Date.now()}-${idx}`;
    const smsMessage: MockSms = {
      id: smsId,
      recipient_phone: contact.phone,
      recipient_name: contact.name,
      body: `ALERT: SafeWay SOS from ${userProfile.full_name}! Location: ${newIncident.latitude.toFixed(4)}, ${newIncident.longitude.toFixed(4)} (accuracy ~${newIncident.accuracy_meters}m). Tourist ID: ${userProfile.public_id}. Emergency services notified.`,
      subject_type: 'sos_alert',
      created_at: now,
      status: 'delivered'
    };
    smsOutbox.unshift(smsMessage);
  });

  // Append tamper-proof audit record
  appendAuditEntry(
    'SOS_INCIDENT_CREATED',
    'incidents',
    incidentId,
    'tourist',
    userProfile.id,
    `Emergency SOS created: ${reference} (${category}, severity=${severity}) at [${newIncident.latitude}, ${newIncident.longitude}]`
  );

  res.status(201).json({
    duplicate: false,
    incident: newIncident,
    message: 'Report sent to SafeWay response team. Emergency contacts notified via SMS.'
  });
});

app.get('/api/v1/incidents', (req: Request, res: Response) => {
  const { role } = req.query;
  if (role === 'tourist') {
    return res.json(incidents.filter(i => i.reporter_id === userProfile.id));
  }
  // Rescue & Admin see all incidents
  res.json(incidents);
});

app.get('/api/v1/incidents/:id', (req: Request, res: Response) => {
  const incident = incidents.find(i => i.id === req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  res.json(incident);
});

app.post('/api/v1/incidents/:id/acknowledge', (req: Request, res: Response) => {
  const { id } = req.params;
  const incident = incidents.find(i => i.id === id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const oldStatus = incident.status;
  incident.status = 'acknowledged';
  incident.updated_at = new Date().toISOString();

  const event = {
    id: `ev-${Date.now()}`,
    incident_id: id,
    actor_role: 'rescue',
    actor_name: req.body.responder_name || 'Manali Rescue Dispatch Desk',
    event_type: 'acknowledged' as const,
    from_status: oldStatus,
    to_status: 'acknowledged' as const,
    notes: req.body.notes || 'Emergency call acknowledged by District Emergency Operation Center (DEOC).',
    created_at: new Date().toISOString()
  };
  incident.events.push(event);

  appendAuditEntry(
    'INCIDENT_ACKNOWLEDGED',
    'incidents',
    incident.id,
    'rescue',
    'resc-01',
    `Incident ${incident.reference} acknowledged by emergency control room.`
  );

  res.json(incident);
});

app.post('/api/v1/incidents/:id/assign', (req: Request, res: Response) => {
  const { id } = req.params;
  const { responder_name = 'Manali Mountain Quick Response Team 1' } = req.body;
  const incident = incidents.find(i => i.id === id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const oldStatus = incident.status;
  incident.status = 'assigned';
  incident.assigned_responder = responder_name;
  incident.updated_at = new Date().toISOString();

  const event = {
    id: `ev-${Date.now()}`,
    incident_id: id,
    actor_role: 'rescue',
    actor_name: 'Dispatch Coordinator',
    event_type: 'assigned' as const,
    from_status: oldStatus,
    to_status: 'assigned' as const,
    notes: `Assigned response team: ${responder_name}`,
    created_at: new Date().toISOString()
  };
  incident.events.push(event);

  appendAuditEntry(
    'INCIDENT_ASSIGNED',
    'incidents',
    incident.id,
    'rescue',
    'resc-01',
    `Incident ${incident.reference} assigned to ${responder_name}`
  );

  res.json(incident);
});

app.post('/api/v1/incidents/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const incident = incidents.find(i => i.id === id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const oldStatus = incident.status;
  incident.status = status;
  incident.updated_at = new Date().toISOString();

  const event = {
    id: `ev-${Date.now()}`,
    incident_id: id,
    actor_role: 'rescue',
    actor_name: 'Responder Officer',
    event_type: 'status_change' as const,
    from_status: oldStatus,
    to_status: status,
    notes: notes || `Incident status updated to ${status}`,
    created_at: new Date().toISOString()
  };
  incident.events.push(event);

  appendAuditEntry(
    'INCIDENT_STATUS_CHANGED',
    'incidents',
    incident.id,
    'rescue',
    'resc-01',
    `Status transitioned from ${oldStatus} to ${status}`
  );

  res.json(incident);
});

// "I'm Safe" Check-In
app.post('/api/v1/checkins', (req: Request, res: Response) => {
  const { latitude, longitude, location_name = 'Current Location' } = req.body;
  const now = new Date().toISOString();

  // Send reassurance SMS to emergency contacts
  userProfile.emergency_contacts.forEach((contact, idx) => {
    smsOutbox.unshift({
      id: `sms-checkin-${Date.now()}-${idx}`,
      recipient_phone: contact.phone,
      recipient_name: contact.name,
      body: `SafeWay Check-in: ${userProfile.full_name} checked in as SAFE at ${location_name} (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}). All clear.`,
      subject_type: 'checkin',
      created_at: now,
      status: 'delivered'
    });
  });

  appendAuditEntry(
    'TOURIST_CHECKIN',
    'checkins',
    `chk-${Date.now()}`,
    'tourist',
    userProfile.id,
    `Tourist recorded "I'm safe" check-in at ${location_name}`
  );

  res.json({
    success: true,
    message: 'Check-in recorded. Emergency contacts notified that you are safe.',
    timestamp: now
  });
});

// Audit Ledger & Integrity Verification
app.get('/api/v1/admin/audit', (_req: Request, res: Response) => {
  res.json(auditLedger);
});

app.get('/api/v1/audit/verify', (_req: Request, res: Response) => {
  let isValid = true;
  let brokenBlockId: number | null = null;
  let recomputedCount = 0;

  for (let i = 0; i < auditLedger.length; i++) {
    const block = auditLedger[i];
    const expectedPrevHash = i === 0
      ? '0000000000000000000000000000000000000000000000000000000000000000'
      : auditLedger[i - 1].hash;

    if (block.prev_hash !== expectedPrevHash) {
      isValid = false;
      brokenBlockId = block.id;
      break;
    }

    const payload = `${block.id}|${block.action}|${block.entity_table}|${block.entity_id}|${block.actor_role}|${block.actor_id}|${block.created_at}|${block.details}`;
    const calculatedHash = computeHash(block.prev_hash, payload);

    if (calculatedHash !== block.hash) {
      isValid = false;
      brokenBlockId = block.id;
      break;
    }
    recomputedCount++;
  }

  res.json({
    is_valid: isValid,
    blocks_verified: recomputedCount,
    total_blocks: auditLedger.length,
    latest_block_hash: auditLedger.length > 0 ? auditLedger[auditLedger.length - 1].hash : null,
    tampered_block_id: brokenBlockId,
    verified_at: new Date().toISOString(),
    status_text: isValid
      ? 'Audit Hash Chain Integrity Verified. Zero tampering detected across all transactions.'
      : `Tamper Warning: Hash chain mismatch detected at block #${brokenBlockId}!`
  });
});

// Mock SMS Outbox
app.get('/api/v1/admin/sms-outbox', (_req: Request, res: Response) => {
  res.json(smsOutbox);
});

// Demo sweep scenario trigger
app.post('/api/v1/admin/jobs/inactivity-sweep', (_req: Request, res: Response) => {
  appendAuditEntry(
    'INACTIVITY_SWEEP_EXECUTED',
    'system',
    `sweep-${Date.now()}`,
    'admin',
    'adm-01',
    'Demonstration sweep completed: 1 tourist checked, 0 inactive anomalies.'
  );

  res.json({
    status: 'completed',
    tourists_evaluated: 1,
    alerts_fired: 0,
    timestamp: new Date().toISOString()
  });
});

// ---------------- SERVING FRONTEND ----------------

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development mode: Mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SafeWay] Server running at http://0.0.0.0:${PORT} (Node.js ${process.version})`);
  });
}

startServer().catch(err => {
  console.error('[SafeWay] Startup failed:', err);
  process.exit(1);
});
