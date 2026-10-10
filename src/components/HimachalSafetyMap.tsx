import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { 
  Search, 
  MapPin, 
  ShieldAlert, 
  ShieldCheck, 
  Phone, 
  Compass, 
  Activity, 
  Layers, 
  Flame, 
  Navigation, 
  Maximize2, 
  Filter, 
  X,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Info
} from 'lucide-react';
import { 
  HIMACHAL_PRADESH_BOUNDARY_GEOJSON, 
  HIMACHAL_SAFETY_POINTS, 
  HPSafetyPoint 
} from '../data/himachalGeoData';

interface HimachalSafetyMapProps {
  currentLat?: number;
  currentLng?: number;
  accuracyM?: number;
  onSelectPoint?: (point: HPSafetyPoint) => void;
  className?: string;
  isDashboardMode?: boolean;
}

export const HimachalSafetyMap: React.FC<HimachalSafetyMapProps> = ({
  currentLat = 32.2396,
  currentLng = 77.1887,
  accuracyM = 14,
  onSelectPoint,
  className = '',
  isDashboardMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  // Layer groups references
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const touristLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(['attraction', 'police', 'hospital', 'emergency', 'trekking', 'incident'])
  );
  const [showTouristLayer, setShowTouristLayer] = useState<boolean>(true);
  const [showHeatmapLayer, setShowHeatmapLayer] = useState<boolean>(true);
  const [selectedPoint, setSelectedPoint] = useState<HPSafetyPoint | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [activeDistrictFilter, setActiveDistrictFilter] = useState<string>('all');

  // Read environment coordinates as requested
  const metaEnv = (import.meta as any).env || {};
  const defaultCenterLat = parseFloat(metaEnv.VITE_MAP_CENTER_LAT || '31.95');
  const defaultCenterLng = parseFloat(metaEnv.VITE_MAP_CENTER_LNG || '77.20');

  // Districts list for quick filter
  const districts = useMemo(() => {
    const list = Array.from(new Set(HIMACHAL_SAFETY_POINTS.map((p) => p.district)));
    return ['all', ...list.sort()];
  }, []);

  // Filtered safety points
  const filteredPoints = useMemo(() => {
    return HIMACHAL_SAFETY_POINTS.filter((point) => {
      // Category filter
      if (!selectedCategories.has(point.category)) return false;

      // District filter
      if (activeDistrictFilter !== 'all' && point.district !== activeDistrictFilter) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = point.name.toLowerCase().includes(query);
        const matchesDistrict = point.district.toLowerCase().includes(query);
        const matchesDesc = point.description.toLowerCase().includes(query);
        const matchesCategory = point.category.toLowerCase().includes(query);
        if (!matchesName && !matchesDistrict && !matchesDesc && !matchesCategory) return false;
      }

      return true;
    });
  }, [selectedCategories, activeDistrictFilter, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      attraction: 0,
      police: 0,
      hospital: 0,
      emergency: 0,
      trekking: 0,
      incident: 0,
    };
    HIMACHAL_SAFETY_POINTS.forEach((p) => {
      if (counts[p.category] !== undefined) counts[p.category]++;
    });
    return counts;
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: [defaultCenterLat, defaultCenterLng],
      zoom: 8,
      zoomControl: false,
      attributionControl: true,
      maxBounds: [
        [29.8, 74.5], // South-West bounding boundary
        [34.0, 79.8], // North-East bounding boundary
      ],
      minZoom: 7,
    });

    // High-contrast, clean CartoDB Voyager tiles with full OpenStreetMap attribution
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a> · Himachal Safety Node',
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    // Zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add Himachal Pradesh Administrative Boundary GeoJSON Layer
    const boundaryLayer = L.geoJSON(HIMACHAL_PRADESH_BOUNDARY_GEOJSON, {
      style: {
        color: '#3b82f6', // Glowing blue border
        weight: 2.5,
        opacity: 0.85,
        fillColor: '#1e3a8a',
        fillOpacity: 0.08,
        dashArray: '6, 6',
      },
    }).addTo(map);

    geoJsonLayerRef.current = boundaryLayer;

    // Fit map bounds precisely to the entire state of Himachal Pradesh
    const bounds = boundaryLayer.getBounds();
    map.fitBounds(bounds, { padding: [25, 25] });

    // Initialize LayerGroups for dynamic updating
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    heatmapLayerGroupRef.current = L.layerGroup().addTo(map);
    touristLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    setIsMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setIsMapReady(false);
    };
  }, [defaultCenterLat, defaultCenterLng]);

  // Helper to create custom category pin SVG icons
  const createCategoryIcon = (category: HPSafetyPoint['category'], severity?: string) => {
    const config: Record<string, { bg: string; icon: string; border: string }> = {
      attraction: { bg: '#059669', icon: '🏞️', border: '#10b981' },
      police: { bg: '#2563eb', icon: '🚔', border: '#60a5fa' },
      hospital: { bg: '#dc2626', icon: '🏥', border: '#f87171' },
      emergency: { bg: '#d97706', icon: '🚨', border: '#fbbf24' },
      trekking: { bg: '#0d9488', icon: '🥾', border: '#2dd4bf' },
      incident: {
        bg: severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f97316' : '#eab308',
        icon: '⚠️',
        border: '#ffffff',
      },
    };

    const c = config[category] || { bg: '#64748b', icon: '📍', border: '#94a3b8' };

    return L.divIcon({
      className: 'hp-marker-pin',
      html: `
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: ${c.bg};
          border: 2px solid ${c.border};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.45);
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          <span>${c.icon}</span>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -16],
    });
  };

  // Update Points Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerGroupRef.current;
    if (!map || !markersGroup || !isMapReady) return;

    markersGroup.clearLayers();

    filteredPoints.forEach((point) => {
      const icon = createCategoryIcon(point.category, point.incidentDetails?.severity);
      const marker = L.marker([point.lat, point.lng], { icon });

      // Rich formatted popup
      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; color: #0f172a; min-width: 220px; max-width: 280px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
            <span style="
              text-transform: uppercase;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.05em;
              padding: 2px 6px;
              border-radius: 6px;
              background: ${point.category === 'incident' ? '#fee2e2' : point.category === 'hospital' ? '#fef2f2' : '#f0fdf4'};
              color: ${point.category === 'incident' ? '#b91c1c' : point.category === 'hospital' ? '#dc2626' : '#15803d'};
            ">
              ${point.category} · ${point.district}
            </span>
            ${
              point.is_demo_sample
                ? '<span style="font-size: 9px; font-family: monospace; color: #9333ea; background: #f3e8ff; padding: 1px 4px; border-radius: 4px;">sample data</span>'
                : '<span style="font-size: 9px; color: #0369a1; background: #e0f2fe; padding: 1px 4px; border-radius: 4px;">verified official</span>'
            }
          </div>

          <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 3px;">
            ${point.name}
          </div>

          ${
            point.elevation_m
              ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Elevation: <strong>${point.elevation_m}m</strong> above sea level</div>`
              : ''
          }

          <div style="color: #475569; font-size: 11.5px; line-height: 1.4; margin-bottom: 6px;">
            ${point.description}
          </div>

          ${
            point.incidentDetails
              ? `
              <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 6px; margin-bottom: 6px; font-size: 11px;">
                <div style="font-weight: 600; color: #be123c;">
                  Severity: ${point.incidentDetails.severity.toUpperCase()} · Status: ${point.incidentDetails.status}
                </div>
                <div style="color: #64748b; font-size: 10px; margin-top: 2px;">
                  Source: ${point.incidentDetails.verified_by}
                </div>
              </div>
            `
              : ''
          }

          ${
            point.phone
              ? `
              <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: #0f172a;">Contact / Helpline:</span>
                <a href="tel:${point.phone}" style="color: #2563eb; font-weight: 700; text-decoration: none; font-family: monospace;">
                  📞 ${point.phone}
                </a>
              </div>
            `
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        setSelectedPoint(point);
        onSelectPoint?.(point);
      });

      markersGroup.addLayer(marker);
    });
  }, [filteredPoints, isMapReady, onSelectPoint]);

  // Update Incident Heatmap & Danger Zone Radii Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const heatGroup = heatmapLayerGroupRef.current;
    if (!map || !heatGroup || !isMapReady) return;

    heatGroup.clearLayers();

    if (!showHeatmapLayer) return;

    // Render radial incident warning buffers for active hazards
    HIMACHAL_SAFETY_POINTS.filter((p) => p.category === 'incident' && p.incidentDetails).forEach(
      (incident) => {
        const details = incident.incidentDetails!;
        const radius = details.radius_m || 800;

        const colorMap: Record<string, { stroke: string; fill: string }> = {
          critical: { stroke: '#ef4444', fill: '#f87171' },
          warning: { stroke: '#f97316', fill: '#fb923c' },
          caution: { stroke: '#eab308', fill: '#fde047' },
          info: { stroke: '#3b82f6', fill: '#60a5fa' },
        };

        const colors = colorMap[details.severity] || { stroke: '#ef4444', fill: '#f87171' };

        // Outer radial buffer circle
        const circle = L.circle([incident.lat, incident.lng], {
          radius,
          color: colors.stroke,
          fillColor: colors.fill,
          fillOpacity: 0.22,
          weight: 2,
          dashArray: '5, 5',
        });

        circle.bindTooltip(
          `<strong>${incident.name}</strong><br/>Threat Radius: ${radius}m (${details.severity})`,
          { sticky: true }
        );

        heatGroup.addLayer(circle);
      }
    );
  }, [showHeatmapLayer, isMapReady]);

  // Update Tourist Location Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const touristGroup = touristLayerGroupRef.current;
    if (!map || !touristGroup || !isMapReady) return;

    touristGroup.clearLayers();

    if (!showTouristLayer) return;

    const touristIcon = L.divIcon({
      className: 'tourist-beacon-icon',
      html: `
        <div style="position: relative; width: 28px; height: 28px;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #3b82f6; opacity: 0.45; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; top: 4px; left: 4px; width: 20px; height: 20px; border-radius: 50%; background: #1d4ed8; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([currentLat, currentLng], { icon: touristIcon }).bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #0f172a;">
          <strong style="color: #1e40af;">📍 Your Active Position</strong><br/>
          <span>Coordinates: ${currentLat.toFixed(4)}°N, ${currentLng.toFixed(4)}°E</span><br/>
          <span style="color: #64748b; font-size: 11px;">GPS Accuracy: ±${Math.round(accuracyM)}m</span>
        </div>
      `);

    const accuracyCircle = L.circle([currentLat, currentLng], {
      radius: Math.max(accuracyM, 35),
      color: '#3b82f6',
      fillColor: '#93c5fd',
      fillOpacity: 0.15,
      weight: 1,
    });

    touristGroup.addLayer(accuracyCircle);
    touristGroup.addLayer(marker);
  }, [currentLat, currentLng, accuracyM, showTouristLayer, isMapReady]);

  // Reset to full Himachal Pradesh boundary
  const handleResetToHimachal = () => {
    const map = mapInstanceRef.current;
    const boundaryLayer = geoJsonLayerRef.current;
    if (!map || !boundaryLayer) return;

    map.fitBounds(boundaryLayer.getBounds(), {
      padding: [25, 25],
      animate: true,
      duration: 1.2,
    });
  };

  // Focus on a specific point
  const handleFocusPoint = (point: HPSafetyPoint) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setSelectedPoint(point);
    map.flyTo([point.lat, point.lng], 14, {
      animate: true,
      duration: 1,
    });
  };

  // Toggle Category Filter
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col ${className}`}
    >
      {/* Map Control & Search Header Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md z-20 space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          {/* Title & State Indicator */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base flex items-center gap-2">
                <Compass className="w-5 h-5 text-rose-400" />
                <span>Himachal Pradesh State Safety Map</span>
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30">
                12 Districts Coverage
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified police stations, trauma hospitals, mountain rescue units & active road hazard buffers.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search place, hospital, police..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Reset to Himachal State Boundary Button */}
            <button
              onClick={handleResetToHimachal}
              title="Fit map view to entire Himachal Pradesh boundary"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Fit HP State</span>
            </button>
          </div>
        </div>

        {/* Category Filters & Layer Toggles Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'attraction', label: 'Attractions', icon: '🏞️', count: categoryCounts.attraction },
              { id: 'police', label: 'Police Stations', icon: '🚔', count: categoryCounts.police },
              { id: 'hospital', label: 'Hospitals', icon: '🏥', count: categoryCounts.hospital },
              { id: 'emergency', label: 'Search & Rescue', icon: '🚨', count: categoryCounts.emergency },
              { id: 'trekking', label: 'Trekking Trails', icon: '🥾', count: categoryCounts.trekking },
              { id: 'incident', label: 'Active Hazards', icon: '⚠️', count: categoryCounts.incident },
            ].map((cat) => {
              const isSelected = selectedCategories.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition border flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                      : 'bg-slate-950/60 text-slate-500 border-slate-800/80 hover:text-slate-300'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({cat.count})</span>
                </button>
              );
            })}
          </div>

          {/* Layer toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHeatmapLayer(!showHeatmapLayer)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition cursor-pointer ${
                showHeatmapLayer
                  ? 'bg-rose-950/50 text-rose-300 border-rose-500/40'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-400" />
              <span>Hazard Buffers</span>
            </button>

            <button
              onClick={() => setShowTouristLayer(!showTouristLayer)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition cursor-pointer ${
                showTouristLayer
                  ? 'bg-blue-950/50 text-blue-300 border-blue-500/40'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              <Navigation className="w-3 h-3 text-blue-400" />
              <span>Tourist GPS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="relative w-full h-[460px] sm:h-[540px] lg:h-[600px] bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Destination Quick Jump Pill Bar */}
        <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex justify-center">
          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-lg pointer-events-auto flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar text-xs">
            <span className="text-slate-400 font-medium whitespace-nowrap text-[11px] mr-1">
              Quick Jump:
            </span>
            {HIMACHAL_SAFETY_POINTS.filter((p) => p.category === 'attraction')
              .slice(0, 7)
              .map((point) => (
                <button
                  key={point.id}
                  onClick={() => handleFocusPoint(point)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[11px] whitespace-nowrap transition cursor-pointer border border-slate-700/60"
                >
                  {point.name.split(' ')[0]}
                </button>
              ))}
          </div>
        </div>

        {/* Selected Point Inspector Modal / Card */}
        {selectedPoint && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex justify-between items-start mb-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  selectedPoint.category === 'incident'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : selectedPoint.category === 'hospital'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {selectedPoint.category} · {selectedPoint.district}
              </span>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="font-bold text-white text-sm mb-1">{selectedPoint.name}</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {selectedPoint.description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 mb-3">
              <div>
                <span className="text-slate-500 block">Coordinates</span>
                <span className="font-mono text-slate-300">
                  {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Elevation</span>
                <span className="text-slate-300">
                  {selectedPoint.elevation_m ? `${selectedPoint.elevation_m}m` : 'Alpine terrain'}
                </span>
              </div>
            </div>

            {selectedPoint.phone && (
              <a
                href={`tel:${selectedPoint.phone}`}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Helpline ({selectedPoint.phone})</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>Boundary Source: Himachal Pradesh Survey GeoJSON</span>
          <span aria-hidden="true">·</span>
          <span>OpenStreetMap & CartoDB tiles</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span>Official Helplines: <strong>112</strong> (National) · <strong>108</strong> (Ambulance) · <strong>1070</strong> (Disaster)</span>
        </div>
      </div>
    </div>
  );
};
