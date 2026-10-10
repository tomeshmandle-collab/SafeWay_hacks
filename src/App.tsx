import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile, HazardZone, TourismService, CommunityReport, Incident } from './types';
import { api, setNetworkSimulator, getNetworkSimulator } from './lib/api';
import { Header } from './components/Header';
import { TouristView } from './components/TouristView';
import { RescueView } from './components/RescueView';
import { AdminView } from './components/AdminView';
import { SosModal } from './components/SosModal';
import { DigitalIdModal } from './components/DigitalIdModal';
import { ReportModal } from './components/ReportModal';
import { supabase } from './lib/supabase';
import { AuthView } from './components/AuthView';
import { Session } from '@supabase/supabase-js';

export const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<UserRole>('tourist');
  const [networkMode, setNetworkMode] = useState<'online' | 'weak' | 'offline'>('online');
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([32.2432, 77.1892]);

  // Data state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [services, setServices] = useState<TourismService[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isDigitalIdOpen, setIsDigitalIdOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    // Supabase Auth Listener
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session?.user?.user_metadata?.role) {
          setCurrentRole(session.user.user_metadata.role as UserRole);
        }
        setAuthLoading(false);
      })
      .catch(err => {
        console.error('Failed to get Supabase session:', err);
        setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.user_metadata?.role) {
        setCurrentRole(session.user.user_metadata.role as UserRole);
      } else {
        setCurrentRole('tourist');
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setUserProfile(null);
      setIsLoading(true);
      return;
    }
    loadAllData();

    // Check browser geolocation if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          // Keep Manali coordinates if user is elsewhere, but note precision
          // Only override if within Manali bounds (lat ~32, lng ~77)
          if (Math.abs(pos.coords.latitude - 32.2) < 2.0 && Math.abs(pos.coords.longitude - 77.1) < 2.0) {
            setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
          }
        },
        () => {
          // Default to Manali center
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [session]);

  const loadAllData = async () => {
    try {
      const [me, z, s, r, inc] = await Promise.all([
        api.getMe(),
        api.getZones(),
        api.getServices(),
        api.getReports(),
        api.getIncidents('rescue'),
      ]);
      setUserProfile(me);
      setHazardZones(z);
      setServices(s);
      setReports(r);
      setIncidents(inc);
    } catch (e) {
      console.error('Failed to load initial data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNetworkChange = (mode: 'online' | 'weak' | 'offline') => {
    setNetworkMode(mode);
    setNetworkSimulator(mode);
  };

  const activeSosCount = incidents.filter(i => i.status !== 'resolved' && i.status !== 'cancelled').length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 gap-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-white">Safe Yatra Auth</h2>
          <p className="text-xs text-slate-400 mt-1">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  if (isLoading || !userProfile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 gap-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-white">Safe Yatra Emergency System</h2>
          <p className="text-xs text-slate-400 mt-1">Initializing Manali Pilot Infrastructure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <Header
        currentRole={currentRole}
        networkMode={networkMode}
        onNetworkModeChange={handleNetworkChange}
        onOpenSos={() => setIsSosOpen(true)}
        onOpenDigitalId={() => setIsDigitalIdOpen(true)}
        activeSosCount={activeSosCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentRole === 'tourist' && (
          <TouristView
            userProfile={userProfile}
            currentLocation={currentLocation}
            hazardZones={hazardZones}
            services={services}
            reports={reports}
            incidents={incidents}
            onOpenSos={() => setIsSosOpen(true)}
            onOpenReportModal={() => setIsReportOpen(true)}
            onCheckinSuccess={loadAllData}
          />
        )}

        {currentRole === 'rescue' && (
          <RescueView
            incidents={incidents}
            hazardZones={hazardZones}
            onIncidentUpdated={loadAllData}
          />
        )}

        {currentRole === 'admin' && (
          <AdminView
            hazardZones={hazardZones}
            services={services}
            reports={reports}
            onDataChanged={loadAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-amber-400">Safe Yatra</span>
            <span>• Pilot: Manali, Himachal Pradesh, India</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Build With Bharat 4.0</span>
            <span>•</span>
            <span>Team Minions: Mayank, Tomesh, Shivika, Yukta</span>
          </div>
        </div>
      </footer>

      {/* Emergency Modals */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        userProfile={userProfile}
        currentLocation={currentLocation}
        onIncidentCreated={inc => {
          setIncidents([inc, ...incidents]);
          loadAllData();
        }}
      />

      <DigitalIdModal
        isOpen={isDigitalIdOpen}
        onClose={() => setIsDigitalIdOpen(false)}
        userProfile={userProfile}
        onProfileUpdated={setUserProfile}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        currentLocation={currentLocation}
        onReportSubmitted={rep => {
          setReports([rep, ...reports]);
          loadAllData();
        }}
      />

    </div>
  );
};
