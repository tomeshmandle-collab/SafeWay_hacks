import React from 'react';
import { 
  Compass, 
  ShieldCheck, 
  MapPin, 
  AlertTriangle, 
  ArrowRight, 
  Navigation, 
  Activity,
  Sparkles
} from 'lucide-react';
import { BackgroundVideo } from './BackgroundVideo';
import { TouristProfile } from '../types';

interface CinematicHeroProps {
  tourist: TouristProfile;
  onExploreRoutes: () => void;
  onOpenUidaiModal: () => void;
  onTriggerSOS: () => void;
}

export const CinematicHero: React.FC<CinematicHeroProps> = ({
  tourist,
  onExploreRoutes,
  onOpenUidaiModal,
  onTriggerSOS,
}) => {
  return (
    <div className="relative w-full min-h-[580px] lg:min-h-[660px] rounded-3xl overflow-hidden mb-8 border border-slate-800/80 shadow-2xl bg-slate-950 flex flex-col justify-between">
      {/* Cinematic Background Video with smooth continuous looping */}
      <BackgroundVideo
        videoSrc="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        posterSrc="/src/assets/images/cinematic_manali_landscape_1791639623052.jpg"
      />

      {/* Hero Content Layer */}
      <div className="relative z-20 p-6 sm:p-10 lg:p-12 flex flex-col justify-between h-full">
        {/* Top Badges Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold tracking-wide text-white">Manali Pilot Sector</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-400">Himachal Pradesh</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-400 font-mono text-[11px]">Elevation 2,050m</span>
          </div>

          {/* UIDAI Sandbox Verification Badge */}
          <button
            onClick={onOpenUidaiModal}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md transition flex items-center gap-1.5 ${
              tourist.uidai_status === 'sandbox_verified'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-slate-900/70 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${tourist.uidai_status === 'sandbox_verified' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>
              {tourist.uidai_status === 'sandbox_verified'
                ? 'UIDAI Sandbox Verified'
                : 'Sandbox ID Verification'}
            </span>
          </button>
        </div>

        {/* Center Split: Editorial Typography on Left, Travelling Tourist Visual Anchor on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-4">
          {/* Left Column: Editorial Headline & Value Proposition */}
          <div className="lg:col-span-7 space-y-5">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.08] text-balance">
              Find your next <span className="italic font-serif text-rose-300">extraordinary</span> escape in the Himalayas.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl font-normal leading-relaxed">
              SafeWay combines continuous hazard awareness, verified local guides, transparent rate cards, and rapid one-tap emergency response across Himachal Pradesh.
            </p>

            {/* CTA Group */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onExploreRoutes}
                className="px-6 py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-xl shadow-rose-950/80 transition flex items-center gap-2 group cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Safe Routes</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onOpenUidaiModal}
                className="px-5 py-3.5 bg-slate-900/80 hover:bg-slate-800/90 text-slate-200 font-semibold rounded-2xl text-xs sm:text-sm border border-slate-700/80 backdrop-blur-md transition flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verify Identity (UIDAI Sandbox)</span>
              </button>
            </div>
          </div>

          {/* Right Column: The Travelling Tourist Character Visual Anchor */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative group max-w-xs sm:max-w-sm w-full">
              {/* Backlight halo */}
              <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/20 to-amber-500/20 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition duration-700" />

              {/* Character Card Surface */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-700/70 bg-slate-900/60 backdrop-blur-md shadow-2xl">
                <img
                  src="/src/assets/images/hero_tourist_character_1791639609319.jpg"
                  alt="Solo Tourist Explorer in Himachal Pradesh"
                  referrerPolicy="no-referrer"
                  className="w-full h-80 sm:h-96 object-cover object-top hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Floating Glassmorphic Trail Status Tag */}
                <div className="absolute bottom-3 inset-x-3 p-3.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>{tourist.full_name}</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      GPS Active (±14m)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Exploring Manali Valley ↔ Solang Ridge
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Glassmorphic Quick-Safety Metrics Strip */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/50 backdrop-blur-sm p-3 rounded-2xl border border-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Recommended Route</span>
            <span className="font-bold text-emerald-400">Atal Tunnel Bypass</span>
          </div>

          <div className="bg-slate-950/50 backdrop-blur-sm p-3 rounded-2xl border border-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Active Hazards</span>
            <span className="font-bold text-rose-400">1 Landslide (Marhi)</span>
          </div>

          <div className="bg-slate-950/50 backdrop-blur-sm p-3 rounded-2xl border border-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Taxi Baseline</span>
            <span className="font-bold text-white">₹1,200 – ₹1,500</span>
          </div>

          <div className="bg-slate-950/50 backdrop-blur-sm p-3 rounded-2xl border border-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Emergency Response</span>
            <span className="font-bold text-blue-400">112 / 100 / 108 Ladder</span>
          </div>
        </div>
      </div>
    </div>
  );
};
