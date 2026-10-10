import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { HazardZone, RouteOption, Incident } from '../types';

interface InteractiveMapProps {
  hazardZones?: HazardZone[];
  activeRoute?: RouteOption | null;
  routes?: RouteOption[];
  incidents?: Incident[];
  userLocation?: [number, number];
  onSelectRoute?: (route: RouteOption) => void;
  heightClass?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  hazardZones = [],
  activeRoute = null,
  routes = [],
  incidents = [],
  userLocation = [32.2432, 77.1892],
  onSelectRoute,
  heightClass = 'h-[440px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: userLocation,
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Layers when props change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // Custom Icon Generators
    const createCustomIcon = (emoji: string, bgColor: string, borderColor = '#ffffff') => {
      return L.divIcon({
        className: 'custom-leaflet-pin',
        html: `
          <div style="
            background: ${bgColor};
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 2px solid ${borderColor};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
          ">
            ${emoji}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
    };

    // 1. Tourist Location Marker
    if (userLocation) {
      const userMarker = L.marker(userLocation, {
        icon: createCustomIcon('📍', '#2563eb', '#93c5fd'),
      }).bindPopup(`
        <div style="font-family: sans-serif; color: #1e293b; padding: 4px;">
          <strong style="color: #1d4ed8;">Your Current Position</strong>
          <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Manali Pilot Area (Foreground GPS)</p>
        </div>
      `);
      layers.addLayer(userMarker);
    }

    // 2. Key Manali Landmarks
    const landmarks = [
      { name: 'Mall Road Manali', coords: [32.2432, 77.1892] as [number, number], emoji: '🏙️' },
      { name: 'Solang Valley', coords: [32.3160, 77.1550] as [number, number], emoji: '⛷️' },
      { name: 'Atal Tunnel South Portal', coords: [32.3610, 77.1350] as [number, number], emoji: '🏔️' },
      { name: 'Rohtang Pass Viewpoint', coords: [32.3715, 77.2465] as [number, number], emoji: '❄️' },
    ];

    landmarks.forEach(lm => {
      const lmMarker = L.marker(lm.coords, {
        icon: createCustomIcon(lm.emoji, '#0f172a', '#cbd5e1'),
      }).bindPopup(`
        <div style="font-family: sans-serif; color: #1e293b; padding: 4px;">
          <strong>${lm.name}</strong>
        </div>
      `);
      layers.addLayer(lmMarker);
    });

    // 3. Hazard Zones (Translucent Circles & Warnings)
    hazardZones.forEach(zone => {
      if (!zone.is_active) return;

      const isCritical = zone.severity === 'critical';
      const isHigh = zone.severity === 'high';
      const fillColor = isCritical ? '#dc2626' : isHigh ? '#ea580c' : '#ca8a04';

      const circle = L.circle([zone.latitude, zone.longitude], {
        radius: zone.radius_meters,
        color: fillColor,
        fillColor: fillColor,
        fillOpacity: 0.28,
        weight: 2,
        dashArray: '4, 4',
      });

      const zoneIcon = zone.hazard_type === 'landslide' ? '⚠️' : zone.hazard_type === 'flood' ? '🌊' : '🚧';
      const zoneMarker = L.marker([zone.latitude, zone.longitude], {
        icon: createCustomIcon(zoneIcon, fillColor, '#ffffff'),
      });

      const popupHtml = `
        <div style="font-family: sans-serif; color: #1e293b; max-width: 220px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${fillColor}; color: #ffffff; padding: 2px 6px; border-radius: 4px;">
              ${zone.severity} HAZARD
            </span>
          </div>
          <strong style="font-size: 13px;">${zone.name}</strong>
          <p style="margin: 6px 0 0; font-size: 11px; color: #475569; line-height: 1.4;">${zone.description}</p>
          <div style="margin-top: 6px; font-size: 10px; color: #64748b;">
            Radius: ${zone.radius_meters}m • Source: ${zone.source}
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);
      zoneMarker.bindPopup(popupHtml);

      layers.addLayer(circle);
      layers.addLayer(zoneMarker);
    });

    // 4. Routes Polylines
    if (routes.length > 0) {
      routes.forEach(route => {
        const isSelected = activeRoute?.id === route.id;
        const isSafe = route.risk_score < 30;
        const color = isSafe ? '#10b981' : '#f59e0b';
        const weight = isSelected ? 6 : 4;
        const opacity = isSelected ? 0.95 : 0.65;

        const polyline = L.polyline(route.coordinates, {
          color,
          weight,
          opacity,
          dashArray: isSafe ? undefined : '6, 8',
        });

        polyline.on('click', () => {
          if (onSelectRoute) onSelectRoute(route);
        });

        polyline.bindPopup(`
          <div style="font-family: sans-serif; color: #1e293b; padding: 4px;">
            <strong style="color: ${color}; font-size: 13px;">${route.name}</strong>
            <div style="font-size: 11px; margin-top: 4px; color: #475569;">
              ${route.distance_km} km • ~${route.duration_mins} mins • Risk Score: <strong>${route.risk_score}/100</strong>
            </div>
            <div style="font-size: 11px; margin-top: 2px; color: #64748b;">
              ${route.via}
            </div>
          </div>
        `);

        layers.addLayer(polyline);
      });
    }

    // 5. Active Emergency SOS Incidents (Rescue markers)
    incidents.forEach(inc => {
      if (inc.status === 'resolved' || inc.status === 'cancelled') return;

      const sosMarker = L.marker([inc.latitude, inc.longitude], {
        icon: createCustomIcon('🆘', '#ef4444', '#fecaca'),
      }).bindPopup(`
        <div style="font-family: sans-serif; color: #1e293b; min-width: 180px;">
          <div style="background: #fee2e2; color: #b91c1c; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">
            ACTIVE SOS • ${inc.severity.toUpperCase()}
          </div>
          <div><strong>${inc.reference}</strong></div>
          <div style="font-size: 12px; color: #475569; margin: 4px 0;">Reporter: ${inc.reporter_name}</div>
          <div style="font-size: 11px; color: #64748b;">Status: <strong>${inc.status}</strong></div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Assigned: ${inc.assigned_responder || 'Unassigned'}</div>
        </div>
      `);
      layers.addLayer(sosMarker);
    });
  }, [hazardZones, activeRoute, routes, incidents, userLocation, onSelectRoute]);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-700/80 shadow-inner bg-slate-950`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Map Legend Floating Tag */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-700/70 text-slate-300 text-xs px-3 py-2 rounded-xl shadow-lg flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
          <span>Safe Route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
          <span>Caution Route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-600/60 border border-rose-500 inline-block"></span>
          <span>Active Hazard Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-rose-400 font-bold">🆘</span>
          <span>Live SOS</span>
        </div>
      </div>
    </div>
  );
};
