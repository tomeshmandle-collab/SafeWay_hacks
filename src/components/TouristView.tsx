import React, { useState, useEffect } from 'react';
import {
  Navigation,
  ShieldCheck,
  IndianRupee,
  AlertTriangle,
  CloudRain,
  MapPin,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  LifeBuoy
} from 'lucide-react';
import {
  UserProfile,
  HazardZone,
  TourismService,
  CommunityReport,
  RouteOption,
  PriceCheckBaseline,
  Incident
} from '../types';
import { api } from '../lib/api';
import { InteractiveMap } from './InteractiveMap';

interface TouristViewProps {
  userProfile: UserProfile;
  currentLocation: [number, number];
  hazardZones: HazardZone[];
  services: TourismService[];
  reports: CommunityReport[];
  incidents: Incident[];
  onOpenSos: () => void;
  onOpenReportModal: () => void;
  onCheckinSuccess: () => void;
}

export const TouristView: React.FC<TouristViewProps> = ({
  userProfile,
  currentLocation,
  hazardZones,
  services,
  reports,
  incidents,
  onOpenSos,
  onOpenReportModal,
  onCheckinSuccess,
}) => {
  // Routes state
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [destination, setDestination] = useState('Solang Valley');
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  // Weather state
  const [weather, setWeather] = useState<any>(null);

  // Price Checker state
  const [priceCategory, setPriceCategory] = useState('Taxi / Cab');
  const [selectedBaselineItem, setSelectedBaselineItem] = useState('Mall Road to Solang Valley (One Way / Drop)');
  const [quotedPriceInput, setQuotedPriceInput] = useState('2200');
  const [priceBaselines, setPriceBaselines] = useState<PriceCheckBaseline[]>([]);
  const [priceCheckResult, setPriceCheckResult] = useState<any>(null);
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);

  // Service filter state
  const [serviceKindFilter, setServiceKindFilter] = useState<string>('all');
  const [serviceSearch, setServiceSearch] = useState('');

  // Checkin state
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinSuccessMsg, setCheckinSuccessMsg] = useState<string | null>(null);

  // Load initial routes, baselines, and weather
  useEffect(() => {
    loadRoutes(destination);
    loadWeather();
    loadBaselines();
  }, []);

  const loadRoutes = async (dest: string) => {
    setIsLoadingRoutes(true);
    try {
      const res = await api.rankRoutes(dest);
      setRoutes(res.ranked_routes);
      if (res.ranked_routes.length > 0) {
        setSelectedRoute(res.ranked_routes[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const loadWeather = async () => {
    try {
      const w = await api.getWeather();
      setWeather(w);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBaselines = async () => {
    try {
      const b = await api.getPriceBaselines();
      setPriceBaselines(b);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePriceCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(quotedPriceInput);
    if (isNaN(priceNum)) return;

    setIsCheckingPrice(true);
    try {
      const res = await api.checkPrice(priceCategory, selectedBaselineItem, priceNum);
      setPriceCheckResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingPrice(false);
    }
  };

  const handleCheckin = async () => {
    setIsCheckingIn(true);
    try {
      const res = await api.submitCheckin({
        latitude: currentLocation[0],
        longitude: currentLocation[1],
        location_name: 'Manali Mall Road Hub',
      });
      setCheckinSuccessMsg(res.message);
      onCheckinSuccess();
      setTimeout(() => setCheckinSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Filtered Services
  const filteredServices = services.filter(s => {
    const matchesKind = serviceKindFilter === 'all' || s.kind === serviceKindFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.provider_name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.location.toLowerCase().includes(serviceSearch.toLowerCase());
    return matchesKind && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Welcome & Emergency Callout Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                Himachal Pilot • Active Journey
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                Manali Region
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to Manali, {userProfile.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              SafeWay is actively monitoring your corridor. Check safe routes avoiding active landslide sectors, compare taxi and adventure quotes against official government baselines, and access instant SOS support.
            </p>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleCheckin}
              disabled={isCheckingIn}
              className="flex-1 md:flex-initial px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isCheckingIn ? 'Sending SMS...' : "I'm Safe Check-In"}</span>
            </button>

            <button
              onClick={onOpenSos}
              className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-rose-950 flex items-center justify-center gap-2 transition-all active:scale-95 animate-pulse"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>1-TAP SOS</span>
            </button>
          </div>
        </div>

        {/* Check-In Success Alert */}
        {checkinSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{checkinSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Weather & Active Mountain Hazards Strip */}
      {weather && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-850/80 border border-slate-700/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CloudRain className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Manali Altitude 2,050m</div>
              <div className="text-lg font-black text-white flex items-center gap-2">
                <span>{weather.temperature_celsius}°C</span>
                <span className="text-xs font-normal text-slate-300">({weather.condition})</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Humidity {weather.humidity_percent}% • Visibility {weather.visibility_km} km
              </div>
            </div>
          </div>

          <div className="col-span-2 bg-amber-950/20 border border-amber-600/30 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <span>Mountain Road Advisory</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Real-time</span>
              </div>
              <p className="text-xs text-slate-200">
                {weather.advisory}
              </p>
              <p className="text-[11px] text-amber-300/80">
                ⚠️ {weather.forecast_warning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Hazard-Aware Safe Routing & Interactive Map */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Hazard-Aware Safe Route Navigator
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              AI route risk evaluation comparing landslides, road closures, and cellular connectivity
            </p>
          </div>

          {/* Destination Selector */}
          <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
            <span className="text-xs text-slate-400 pl-2">Destination:</span>
            <select
              value={destination}
              onChange={e => {
                setDestination(e.target.value);
                loadRoutes(e.target.value);
              }}
              className="bg-slate-900 text-white font-bold text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="Solang Valley">Solang Valley (Adventure Hub)</option>
              <option value="Atal Tunnel">Atal Tunnel (South Portal)</option>
              <option value="Rohtang Pass">Rohtang Pass (High Altitude)</option>
              <option value="Old Manali">Old Manali (Cafes & Temples)</option>
            </select>
          </div>
        </div>

        {/* Map Display */}
        <InteractiveMap
          hazardZones={hazardZones}
          activeRoute={selectedRoute}
          routes={routes}
          incidents={incidents}
          userLocation={currentLocation}
          onSelectRoute={r => setSelectedRoute(r)}
          heightClass="h-[420px]"
        />

        {/* Route Alternatives Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map(r => {
            const isSelected = selectedRoute?.id === r.id;
            const isSafe = r.risk_score < 30;

            return (
              <div
                key={r.id}
                onClick={() => setSelectedRoute(r)}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? isSafe
                      ? 'bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-950/30'
                      : 'bg-amber-950/20 border-amber-500 shadow-lg shadow-amber-950/30'
                    : 'bg-slate-850/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        isSafe
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {isSafe ? 'SafeWay Recommended' : 'Higher Risk Alternate'}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">
                      {r.name}
                    </h3>
                    <p className="text-xs text-slate-400">{r.via}</p>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-lg font-black ${
                        isSafe ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      Risk {r.risk_score}/100
                    </div>
                    <div className="text-xs text-slate-400">
                      {r.distance_km} km • ~{r.duration_mins}m
                    </div>
                  </div>
                </div>

                {/* Factors checklist */}
                <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-1.5">
                  {r.risk_factors.map((factor, idx) => (
                    <div key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className={isSafe ? 'text-emerald-400 mt-0.5' : 'text-amber-400 mt-0.5'}>
                        {isSafe ? '✓' : '⚠️'}
                      </span>
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Fair Price Checker */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Fair Price Checker & Anti-Scam Shield
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verify quotes for Taxis, Guides, Hotels and Paragliding against government authorized baseline rates
            </p>
          </div>
          <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full self-start sm:self-auto">
            HP Tourism Baseline Data
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handlePriceCheck} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-850 p-4 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">
              Category
            </label>
            <select
              value={priceCategory}
              onChange={e => {
                setPriceCategory(e.target.value);
                const matching = priceBaselines.find(b => b.category.includes(e.target.value));
                if (matching) setSelectedBaselineItem(matching.route_or_item);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="Taxi / Cab">Taxi / Cab</option>
              <option value="Adventure">Adventure Activity</option>
              <option value="Guide">Trekking Guide</option>
              <option value="Hotel / Stay">Hotel Room / Homestay</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">
              Route / Service Item
            </label>
            <select
              value={selectedBaselineItem}
              onChange={e => setSelectedBaselineItem(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {priceBaselines
                .filter(b => !priceCategory || b.category.includes(priceCategory))
                .map(b => (
                  <option key={b.id} value={b.route_or_item}>
                    {b.route_or_item} (Std: ₹{b.fair_benchmark})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">
              Quoted Price (₹ INR)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                required
                value={quotedPriceInput}
                onChange={e => setQuotedPriceInput(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
              />
              <button
                type="submit"
                disabled={isCheckingPrice}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex-shrink-0 transition-colors"
              >
                {isCheckingPrice ? '...' : 'Check'}
              </button>
            </div>
          </div>
        </form>

        {/* Price Check Result */}
        {priceCheckResult && (
          <div
            className={`p-5 rounded-2xl border-2 space-y-3 animate-in fade-in ${
              priceCheckResult.status === 'fair'
                ? 'bg-emerald-950/20 border-emerald-500/60'
                : priceCheckResult.status === 'moderate'
                ? 'bg-amber-950/20 border-amber-500/60'
                : 'bg-rose-950/20 border-rose-500/80 shadow-lg shadow-rose-950/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {priceCheckResult.status === 'fair' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                )}
                <h3 className="text-base font-extrabold text-white">
                  {priceCheckResult.status === 'fair'
                    ? 'Fair Price Verified'
                    : priceCheckResult.status === 'moderate'
                    ? 'Slightly High Quote'
                    : 'Overpricing Alert: Beware of Overcharging'}
                </h3>
              </div>

              <div className="text-xs font-mono font-bold">
                <span className="text-slate-400">Quoted: </span>
                <span className="text-white">₹{priceCheckResult.quoted_price.toLocaleString()}</span>
                <span className="text-slate-400"> | Official Range: </span>
                <span className="text-emerald-400">
                  ₹{priceCheckResult.baseline.min_price.toLocaleString()} - ₹{priceCheckResult.baseline.max_price.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-200">
              {priceCheckResult.message}
            </p>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-amber-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Tourist Guidance:</strong> {priceCheckResult.tourist_advice}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: Verified Tourism Services Directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Verified Tourism Services
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Browse government-verified guides, licensed taxis, and inspected operators
            </p>
          </div>

          {/* Service Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'guide', 'taxi', 'operator', 'hotel'].map(kind => (
              <button
                key={kind}
                onClick={() => setServiceKindFilter(kind)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  serviceKindFilter === kind
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {kind.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            value={serviceSearch}
            onChange={e => setServiceSearch(e.target.value)}
            placeholder="Search verified provider name, location or license number..."
            className="w-full bg-slate-850 border border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map(srv => (
            <div
              key={srv.id}
              className="bg-slate-850 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-all shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                      HP Gov Verified
                    </span>
                    {srv.emergency_trained && (
                      <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">
                        First Aid Trained
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5">{srv.name}</h3>
                  <p className="text-xs text-slate-400">
                    Lead: {srv.provider_name} • License: <strong className="font-mono text-slate-300">{srv.license_number}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 text-xs font-bold">★ {srv.rating} / 5.0</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{srv.price_range}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  {srv.location}
                </span>
                <span>•</span>
                <span>Languages: {srv.languages.join(', ')}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href={`tel:${srv.phone}`}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
                >
                  <span>Direct Call: {srv.phone}</span>
                </a>
                <span className="text-[10px] text-slate-500">Sample pilot listing</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: Community Road Problem Reports Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Live Community Road Hazard Reports
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Field observations submitted by fellow tourists and local drivers in Manali
            </p>
          </div>

          <button
            onClick={onOpenReportModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 self-start sm:self-auto"
          >
            <span>+ Report Problem / Hazard</span>
          </button>
        </div>

        {/* Reports list */}
        <div className="space-y-3">
          {reports.map(rep => (
            <div
              key={rep.id}
              className="bg-slate-850 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                    {rep.report_type}
                  </span>
                  <span className="text-xs font-bold text-white">{rep.title}</span>
                  {rep.status === 'verified' && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      ✓ Corroborated
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">{rep.description}</p>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>📍 {rep.location_name}</span>
                  <span>•</span>
                  <span>Reported by {rep.reporter_name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
