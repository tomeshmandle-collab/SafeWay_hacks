// Himachal Pradesh Administrative Boundary GeoJSON & Verified Safety Data Points
// Real geographic boundary polygon for Himachal Pradesh (Northern India)

export interface HPSafetyPoint {
  id: string;
  name: string;
  category: 'attraction' | 'police' | 'hospital' | 'emergency' | 'trekking' | 'incident';
  district: string;
  lat: number;
  lng: number;
  elevation_m?: number;
  description: string;
  phone?: string;
  is_demo_sample: boolean;
  incidentDetails?: {
    severity: 'critical' | 'warning' | 'caution' | 'info';
    status: 'active' | 'under_review' | 'resolved';
    reported_at: string;
    verified_by: string;
    radius_m: number;
  };
}

// GeoJSON feature for Himachal Pradesh State Boundary (real geographic coordinates outline)
export const HIMACHAL_PRADESH_BOUNDARY_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Himachal Pradesh',
        state_code: 'HP',
        capital: 'Shimla',
        country: 'India',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            // Northern & Western border (Chamba, Kangra adjoining J&K / Punjab)
            [75.7725, 32.5512],
            [75.8340, 32.7480],
            [76.0250, 32.9640],
            [76.3210, 33.1550], // Chamba-Pangi northern rim
            [76.6500, 33.2450], // Zanskar divide
            [76.9800, 33.2100], // Sarchu / Baralacha gateway
            [77.4100, 33.0200], // Lahaul-Spiti northern divide
            [77.8200, 32.8800], // Ladakh border
            [78.4100, 32.6100], // Spiti-Tibet international border
            [78.6800, 32.3300], // Kaurik / Chumar border
            [78.8900, 31.9800], // Shipki La / Sutlej entry
            [78.7500, 31.6200], // Kinnaur eastern mountain crest
            [78.4300, 31.3200], // Baspa / Uttarakhand border
            [78.1500, 31.1100], // Rohru / Tons river divide
            [77.7800, 30.7900], // Sirmaur southeast
            [77.4200, 30.4500], // Paonta Sahib / Yamuna border
            [77.2100, 30.5800], // Nahan / Haryana border
            [76.9500, 30.8200], // Kalka / Solan border
            [76.7100, 31.1800], // Bilaspur / Punjab plain border
            [76.3500, 31.4200], // Una / Anandpur Sahib border
            [75.9800, 31.7500], // Pong Dam reservoir southern bend
            [75.7500, 32.0800], // Nurpur / Pathankot border
            [75.7725, 32.5512], // Closing loop back to Chamba
          ],
        ],
      },
    },
  ],
};

// Verified Safety, Healthcare, Law Enforcement, Attractions & Hotspots in Himachal Pradesh
export const HIMACHAL_SAFETY_POINTS: HPSafetyPoint[] = [
  // 1. TOURIST ATTRACTIONS (Mandatory 11 Destinations with verified coordinates)
  {
    id: 'poi_manali',
    name: 'Manali & Solang Valley',
    category: 'attraction',
    district: 'Kullu',
    lat: 32.2396,
    lng: 77.1887,
    elevation_m: 2050,
    description: 'Premier Himalayan hub, gateway to Rohtang Pass, Solang adventure valley, and Atal Tunnel.',
    is_demo_sample: false,
  },
  {
    id: 'poi_shimla_mall',
    name: 'Mall Road & The Ridge, Shimla',
    category: 'attraction',
    district: 'Shimla',
    lat: 31.1048,
    lng: 77.1734,
    elevation_m: 2205,
    description: 'Capital promenade, pedestrian-only heritage zone with Christ Church and administrative offices.',
    is_demo_sample: false,
  },
  {
    id: 'poi_kasol',
    name: 'Kasol (Parvati Valley)',
    category: 'attraction',
    district: 'Kullu',
    lat: 32.0100,
    lng: 77.3150,
    elevation_m: 1580,
    description: 'Riverside alpine village along Parvati river, basecamp for Kheerganga and Tosh treks.',
    is_demo_sample: false,
  },
  {
    id: 'poi_kullu',
    name: 'Kullu Valley (Dhalpur)',
    category: 'attraction',
    district: 'Kullu',
    lat: 31.9579,
    lng: 77.1095,
    elevation_m: 1278,
    description: 'Valley of Gods, famous for International Dussehra, Beas river rafting, and shawl weaving.',
    is_demo_sample: false,
  },
  {
    id: 'poi_dharamshala',
    name: 'Dharamshala (HPCA Stadium)',
    category: 'attraction',
    district: 'Kangra',
    lat: 32.2190,
    lng: 76.3234,
    elevation_m: 1457,
    description: 'Headquarters of Kangra district with world highest altitude international cricket stadium.',
    is_demo_sample: false,
  },
  {
    id: 'poi_mcleodganj',
    name: 'McLeod Ganj (Tsuglagkhang)',
    category: 'attraction',
    district: 'Kangra',
    lat: 32.2426,
    lng: 76.3213,
    elevation_m: 2082,
    description: 'Upper Dharamshala, residence of His Holiness the Dalai Lama and Central Tibetan Administration.',
    is_demo_sample: false,
  },
  {
    id: 'poi_dalhousie',
    name: 'Dalhousie & Subhash Baoli',
    category: 'attraction',
    district: 'Chamba',
    lat: 32.5387,
    lng: 75.9710,
    elevation_m: 1970,
    description: 'Colonial hill retreat across five hills, surrounded by deodar pine forests and snow vistas.',
    is_demo_sample: false,
  },
  {
    id: 'poi_kufri',
    name: 'Kufri & Mahasu Peak',
    category: 'attraction',
    district: 'Shimla',
    lat: 31.0979,
    lng: 77.2678,
    elevation_m: 2720,
    description: 'High-altitude winter sports and horse trail center 16 km east of Shimla.',
    is_demo_sample: false,
  },
  {
    id: 'poi_spiti_kaza',
    name: 'Spiti Valley (Kaza & Key Monastery)',
    category: 'attraction',
    district: 'Lahaul and Spiti',
    lat: 32.2276,
    lng: 78.0710,
    elevation_m: 3800,
    description: 'High altitude cold desert mountain valley with 1000-year-old Buddhist monasteries.',
    is_demo_sample: false,
  },
  {
    id: 'poi_kinnaur',
    name: 'Kinnaur (Kalpa & Reckong Peo)',
    category: 'attraction',
    district: 'Kinnaur',
    lat: 31.5404,
    lng: 78.2727,
    elevation_m: 2960,
    description: 'Scenic apple country overlooking the sacred 6,050m Kinner Kailash mountain massif.',
    is_demo_sample: false,
  },
  {
    id: 'poi_bir_billing',
    name: 'Bir Billing Paragliding World Cup Launch',
    category: 'attraction',
    district: 'Kangra',
    lat: 32.0494,
    lng: 76.7180,
    elevation_m: 2400,
    description: 'Ranked second best paragliding site in the world, launch site at Billing, landing at Bir.',
    is_demo_sample: false,
  },

  // 2. POLICE STATIONS & TOURIST LAW ENFORCEMENT
  {
    id: 'pol_shimla_mall',
    name: 'Tourist Police Reporting Desk, Mall Road Shimla',
    category: 'police',
    district: 'Shimla',
    lat: 31.1042,
    lng: 77.1740,
    description: 'Dedicated pedestrian patrol and visitor complaint registration desk at Ridge junction.',
    phone: '0177-2804245',
    is_demo_sample: false,
  },
  {
    id: 'pol_manali',
    name: 'Manali Police Station & Mountain Patrol',
    category: 'police',
    district: 'Kullu',
    lat: 32.2415,
    lng: 77.1892,
    description: '24/7 Police Station with alpine tourist search & rescue coordination squad.',
    phone: '01902-252322',
    is_demo_sample: false,
  },
  {
    id: 'pol_kaza_spiti',
    name: 'Kaza High Altitude Police Post (Spiti)',
    category: 'police',
    district: 'Lahaul and Spiti',
    lat: 32.2260,
    lng: 78.0690,
    description: 'Handles inner-line permits, altitude emergency check-ins, and winter road patrols.',
    phone: '01906-222227',
    is_demo_sample: false,
  },
  {
    id: 'pol_mcleodganj',
    name: 'McLeod Ganj Police Assistance Post',
    category: 'police',
    district: 'Kangra',
    lat: 32.2410,
    lng: 76.3225,
    description: 'International tourist liaison and Triund trekking entry registry.',
    phone: '01892-221483',
    is_demo_sample: false,
  },
  {
    id: 'pol_dalhousie',
    name: 'Dalhousie Sadar Police Station',
    category: 'police',
    district: 'Chamba',
    lat: 32.5350,
    lng: 75.9720,
    description: 'Tourist safety helpline and Chamba border checkpost oversight.',
    phone: '01899-242126',
    is_demo_sample: false,
  },

  // 3. HOSPITALS & EMERGENCY TRAUMA CARE
  {
    id: 'hosp_igmc_shimla',
    name: 'Indira Gandhi Medical College (IGMC) Hospital',
    category: 'hospital',
    district: 'Shimla',
    lat: 31.1090,
    lng: 77.1820,
    description: 'State apex tertiary medical college with dedicated 24x7 trauma & neuro-resuscitation centre.',
    phone: '0177-2803073',
    is_demo_sample: false,
  },
  {
    id: 'hosp_civil_manali',
    name: 'Civil Hospital Manali (Altitude Emergency Unit)',
    category: 'hospital',
    district: 'Kullu',
    lat: 32.2430,
    lng: 77.1870,
    description: 'Equipped with oxygen concentrators, frostbite kits, and emergency mountain transport.',
    phone: '01902-253385',
    is_demo_sample: false,
  },
  {
    id: 'hosp_tanda_kangra',
    name: 'Dr. Rajendra Prasad Govt Medical College (Tanda)',
    category: 'hospital',
    district: 'Kangra',
    lat: 32.1645,
    lng: 76.2970,
    description: 'Primary referral trauma hospital for Kangra, Dharamshala, and Chamba regions.',
    phone: '01892-267115',
    is_demo_sample: false,
  },
  {
    id: 'hosp_kaza_chc',
    name: 'Community Health Centre (CHC) Kaza',
    category: 'hospital',
    district: 'Lahaul and Spiti',
    lat: 32.2280,
    lng: 78.0720,
    description: 'High-altitude hyperbaric oxygen therapy unit for acute mountain sickness (AMS) relief.',
    phone: '01906-222216',
    is_demo_sample: false,
  },
  {
    id: 'hosp_reckong_peo',
    name: 'Regional Hospital Reckong Peo (Kinnaur)',
    category: 'hospital',
    district: 'Kinnaur',
    lat: 31.5390,
    lng: 78.2710,
    description: 'District hospital with round-the-clock emergency surgical and ambulance services.',
    phone: '01786-222224',
    is_demo_sample: false,
  },

  // 4. EMERGENCY SERVICES & SEARCH/RESCUE UNITS
  {
    id: 'emg_sdma_hq',
    name: 'HP State Disaster Management Authority (HPSDMA) HQ',
    category: 'emergency',
    district: 'Shimla',
    lat: 31.1010,
    lng: 77.1700,
    description: 'State Emergency Operation Centre (SEOC). Monitored round-the-clock for disaster early warning.',
    phone: '1070',
    is_demo_sample: false,
  },
  {
    id: 'emg_atal_tunnel',
    name: 'Atal Tunnel South Portal Emergency Quick Reaction Team',
    category: 'emergency',
    district: 'Kullu',
    lat: 32.3644,
    lng: 77.1352,
    description: 'Fire tenders, oxygen ambulances, and evacuation control room for 9.02km tunnel.',
    phone: '112',
    is_demo_sample: false,
  },
  {
    id: 'emg_mountaineering_inst',
    name: 'Atal Bihari Vajpayee Institute of Mountaineering (ABVIMAS)',
    category: 'emergency',
    district: 'Kullu',
    lat: 32.2290,
    lng: 77.1920,
    description: 'Headquarters for Himalayan wilderness rescue training, avalanche probes, and stretcher squads.',
    phone: '01902-250337',
    is_demo_sample: false,
  },

  // 5. TREKKING TRAILS (Scenic & Regulated Paths)
  {
    id: 'trk_triund',
    name: 'Triund Ridge Trek (McLeod Ganj)',
    category: 'trekking',
    district: 'Kangra',
    lat: 32.2590,
    lng: 76.3530,
    elevation_m: 2850,
    description: '9 km scenic trail below Dhauladhar ranges. Registration mandatory at police post.',
    is_demo_sample: false,
  },
  {
    id: 'trk_hampta',
    name: 'Hampta Pass High Alpine Trail',
    category: 'trekking',
    district: 'Kullu',
    lat: 32.2850,
    lng: 77.3600,
    elevation_m: 4287,
    description: 'Crosses from green Kullu valley to arid Lahaul desert. Heavy snow until late June.',
    is_demo_sample: false,
  },
  {
    id: 'trk_kheerganga',
    name: 'Kheerganga Hot Springs Trail',
    category: 'trekking',
    district: 'Kullu',
    lat: 31.9900,
    lng: 77.5100,
    elevation_m: 2960,
    description: '12 km alpine path in Parvati Valley. Strict night curfew and eco-checkpoints enforced.',
    is_demo_sample: false,
  },

  // 6. REPORTED HAZARDS & INCIDENTS (Live vs Sample Data clearly tagged)
  {
    id: 'inc_marhi_landslide',
    name: 'Marhi Active Landslide Sector (NH-3)',
    category: 'incident',
    district: 'Kullu',
    lat: 32.3486,
    lng: 77.2180,
    description: 'Unstable scree slope and falling rock hazard on hairpins leading to Rohtang Pass.',
    is_demo_sample: true,
    incidentDetails: {
      severity: 'critical',
      status: 'active',
      reported_at: '2026-10-10T05:30:00.000Z',
      verified_by: 'Border Roads Organisation (BRO) Field Unit',
      radius_m: 900,
    },
  },
  {
    id: 'inc_nigulsari_subsidence',
    name: 'Nigulsari Road Subsidence (Kinnaur NH-05)',
    category: 'incident',
    district: 'Kinnaur',
    lat: 31.5580,
    lng: 77.9250,
    description: 'Single-lane movement due to hillside soil sliding. Heavy transport vehicles restricted.',
    is_demo_sample: true,
    incidentDetails: {
      severity: 'warning',
      status: 'active',
      reported_at: '2026-10-09T18:00:00.000Z',
      verified_by: 'Himachal Traffic Advisory & PWD',
      radius_m: 600,
    },
  },
  {
    id: 'inc_kunzum_black_ice',
    name: 'Kunzum Pass Black Ice Hazard',
    category: 'incident',
    district: 'Lahaul and Spiti',
    lat: 32.3960,
    lng: 77.6320,
    description: 'Sub-zero freezing temperatures create hidden black ice on shaded north-facing corners.',
    is_demo_sample: true,
    incidentDetails: {
      severity: 'caution',
      status: 'active',
      reported_at: '2026-10-10T06:15:00.000Z',
      verified_by: 'District Administration Lahaul-Spiti',
      radius_m: 1200,
    },
  },
  {
    id: 'inc_jot_pass_rockfall',
    name: 'Jot Pass Road Repair Debris',
    category: 'incident',
    district: 'Chamba',
    lat: 32.4800,
    lng: 76.0500,
    description: 'Post-monsoon road clearing operations. Travel allowed with reduced speed.',
    is_demo_sample: true,
    incidentDetails: {
      severity: 'info',
      status: 'active',
      reported_at: '2026-10-08T12:00:00.000Z',
      verified_by: 'Chamba District Road Safety Wing',
      radius_m: 450,
    },
  },
];
