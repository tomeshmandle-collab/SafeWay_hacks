import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { HazardZone, RouteOption } from '../types';

interface LeafletMapProps {
  currentLat: number;
  currentLng: number;
  accuracyM: number;
  hazards: HazardZone[];
  routes: RouteOption[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  onHazardClick?: (hazard: HazardZone) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  currentLat,
  currentLng,
  accuracyM,
  hazards,
  routes,
  selectedRouteId,
  onSelectRoute,
  onHazardClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    userMarker?: L.Marker;
    accuracyCircle?: L.Circle;
    hazardLayers: L.Circle[];
    routeLines: L.Polyline[];
  }>({
    hazardLayers: [],
    routeLines: [],
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [32.2900, 77.1800],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark-themed CartoDB / OSM tiles for high-contrast safety UI
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update User Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.userMarker) {
      layersRef.current.userMarker.remove();
    }
    if (layersRef.current.accuracyCircle) {
      layersRef.current.accuracyCircle.remove();
    }

    // Custom pulse icon for tourist GPS location
    const touristIcon = L.divIcon({
      className: 'custom-tourist-pin',
      html: `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: #3b82f6; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background-color: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const userMarker = L.marker([currentLat, currentLng], { icon: touristIcon })
      .bindPopup(`
        <div style="font-family: inherit; font-size: 13px; color: #0f172a;">
          <strong style="color: #1e3a8a;">📍 Current Tourist Position</strong><br/>
          <span>Mayank Sharma (Foreground GPS active)</span><br/>
          <small style="color: #64748b;">GPS Accuracy: ±${Math.round(accuracyM)}m</small>
        </div>
      `)
      .addTo(map);

    const accuracyCircle = L.circle([currentLat, currentLng], {
      radius: Math.max(accuracyM, 30),
      color: '#3b82f6',
      fillColor: '#60a5fa',
      fillOpacity: 0.15,
      weight: 1,
    }).addTo(map);

    layersRef.current.userMarker = userMarker;
    layersRef.current.accuracyCircle = accuracyCircle;
  }, [currentLat, currentLng, accuracyM]);

  // Update Hazard Zones
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous hazards
    layersRef.current.hazardLayers.forEach((h) => h.remove());
    layersRef.current.hazardLayers = [];

    hazards.forEach((hazard) => {
      if (!hazard.active) return;

      const colorMap: Record<HazardZone['severity'], { stroke: string; fill: string }> = {
        critical: { stroke: '#dc2626', fill: '#ef4444' },
        warning: { stroke: '#ea580c', fill: '#f97316' },
        caution: { stroke: '#eab308', fill: '#facc15' },
        info: { stroke: '#0284c7', fill: '#38bdf8' },
      };

      const colors = colorMap[hazard.severity] || { stroke: '#64748b', fill: '#94a3b8' };

      const circle = L.circle([hazard.lat, hazard.lng], {
        radius: hazard.radius_m,
        color: colors.stroke,
        fillColor: colors.fill,
        fillOpacity: 0.28,
        weight: 2,
        dashArray: hazard.severity === 'critical' ? undefined : '4, 4',
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; min-width: 180px; color: #0f172a;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 14px;">${hazard.type === 'landslide' ? '⚠️' : hazard.type === 'wildlife' ? '🐻' : hazard.type === 'low_network' ? '📵' : '🚧'}</span>
            <strong style="color: ${colors.stroke}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">${hazard.severity} HAZARD</strong>
          </div>
          <div style="font-weight: 600; color: #0f172a; margin-bottom: 2px;">${hazard.name}</div>
          <div style="color: #475569; font-size: 12px; margin-bottom: 6px;">${hazard.description}</div>
          <div style="font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            Source: ${hazard.source} ${hazard.is_sample_data ? '<span style="color: #9333ea;">(sample data)</span>' : ''}
          </div>
        </div>
      `);

      circle.on('click', () => {
        onHazardClick?.(hazard);
      });

      layersRef.current.hazardLayers.push(circle);
    });
  }, [hazards, onHazardClick]);

  // Update Route Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    layersRef.current.routeLines.forEach((r) => r.remove());
    layersRef.current.routeLines = [];

    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      const isSafe = route.risk_level === 'recommended_safe';

      const polyline = L.polyline(route.coordinates, {
        color: isSafe ? '#10b981' : '#f43f5e',
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.6,
        dashArray: isSafe ? undefined : '6, 8',
      }).addTo(map);

      polyline.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; color: #0f172a;">
          <div style="font-weight: 700; color: ${isSafe ? '#059669' : '#e11d48'};">
            ${isSafe ? '🛡️ ' : '⚠️ '}${route.name}
          </div>
          <div style="color: #475569; font-size: 12px; margin-top: 2px;">
            ${route.distance_km} km · ~${route.estimated_min} mins · Risk Score: <strong>${route.risk_score}/100</strong>
          </div>
          <div style="color: #64748b; font-size: 11px; margin-top: 4px;">
            ${route.description}
          </div>
        </div>
      `);

      polyline.on('click', () => {
        onSelectRoute?.(route.id);
      });

      layersRef.current.routeLines.push(polyline);
    });
  }, [routes, selectedRouteId, onSelectRoute]);

  return (
    <div className="relative w-full h-[400px] md:h-[480px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Legend Badge */}
      <div className="absolute top-3 right-3 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 text-xs shadow-lg space-y-1.5 pointer-events-none">
        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
          <span>Manali Sector Pilot</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 font-mono">sample data</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-1 bg-emerald-500 rounded-full inline-block"></span>
          <span>Atal Tunnel Route (Safe)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-1 bg-rose-500 rounded-full inline-block"></span>
          <span>Rohtang Highway (Hazard)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/40 border border-rose-500 inline-block"></span>
          <span>Landslide Hazard Circle</span>
        </div>
      </div>
    </div>
  );
};
