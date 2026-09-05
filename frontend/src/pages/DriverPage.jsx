// src/pages/DriverPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { driverApi } from '../api/endpoints';
import {
  Bus,
  Navigation,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  Radio,
  Lock,
  Phone,
  Eye,
  EyeOff,
  Clock,
  Wifi,
  Gauge,
  UploadCloud,
  MapPin,
  Compass,
  ArrowRight,
  Power,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

export default function DriverPage() {
  const { user, isAuthenticated, role, login, logout } = useAuth();

  // Login form state
  const [phoneInput, setPhoneInput] = useState('9000000002'); // seeded driver phone
  const [passwordInput, setPasswordInput] = useState('password123'); // seeded password
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Digital clock
  const [clockTime, setClockTime] = useState('');

  // Trip and Tracking State
  const [tripActive, setTripActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [pingCount, setPingCount] = useState(0);
  const [pingFlash, setPingFlash] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(38);
  const [gpsSimState, setGpsSimState] = useState('broadcasting'); // 'broadcasting' | 'acquiring' | 'lost'
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);

  // Simulation mode
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const simulationStepRef = useRef(0);

  // Simulated GPS track coordinates in Hyderabad
  const SIMULATED_COORDS = [
    { lat: 17.3850, lng: 78.4867, speed: 28, stop: 'Abids GPO', dist: '~800m' },
    { lat: 17.3940, lng: 78.4770, speed: 36, stop: 'Nampally Station', dist: '~1.2km' },
    { lat: 17.3995, lng: 78.4680, speed: 42, stop: 'Lakdikapool', dist: '~650m' },
    { lat: 17.4060, lng: 78.4590, speed: 34, stop: 'Khairatabad Circle', dist: '~500m' },
    { lat: 17.4140, lng: 78.4520, speed: 44, stop: 'Punjagutta Metro', dist: '~400m' },
    { lat: 17.4260, lng: 78.4480, speed: 32, stop: 'Ameerpet Junction', dist: '~350m' },
    { lat: 17.4375, lng: 78.4482, speed: 48, stop: 'Madhapur / Hitec City', dist: '~2.1km' },
    { lat: 17.4480, lng: 78.3900, speed: 40, stop: 'Kondapur Bus Depot', dist: '~1.4km' },
  ];

  // Real-time digital clock update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setClockTime(`${h}:${m}:${s}`);
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Trip Chronometer
  useEffect(() => {
    if (tripActive) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [tripActive]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  const formatChronometer = (totalSec) => {
    const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Handle Driver Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await login(phoneInput.trim(), passwordInput);
      if (!res.success) {
        setLoginError(res.error || 'Failed to authenticate driver credentials');
      } else if (res.user.role !== 'driver') {
        setLoginError('Account role is not a driver. Please log in with a driver account.');
      }
    } catch (err) {
      setLoginError(err?.message || 'Authentication error');
    } finally {
      setLoginLoading(false);
    }
  };

  // Start Trip Broadcast
  const handleStartTrip = async () => {
    try {
      await driverApi.startTrip();
      setTripActive(true);
      setSecondsElapsed(0);
      setPingCount(1);
      setGpsSimState('broadcasting');

      // Begin broadcast simulation loop every 3 seconds
      intervalRef.current = setInterval(async () => {
        const step = simulationStepRef.current % SIMULATED_COORDS.length;
        const currentCoord = SIMULATED_COORDS[step];
        simulationStepRef.current += 1;

        setCurrentSpeed(currentCoord.speed);

        // Flash radar dot
        setPingFlash(true);
        setTimeout(() => setPingFlash(false), 300);

        try {
          await driverApi.sendLocation({
            bus_id: user?.bus_id || 1,
            lat: currentCoord.lat,
            lng: currentCoord.lng,
            speed: currentCoord.speed,
            timestamp: new Date().toISOString(),
          });
          setPingCount((c) => c + 1);
        } catch (err) {
          console.warn('Driver ping error:', err);
        }
      }, 3000);
    } catch (err) {
      console.error('Failed to start trip:', err);
    }
  };

  // End Trip Broadcast
  const handleConfirmEndTrip = async () => {
    clearInterval(intervalRef.current);
    clearInterval(timerRef.current);
    try {
      await driverApi.endTrip();
    } catch (err) {
      console.warn('End trip endpoint notice:', err);
    }
    setTripActive(false);
    setSafetyModalOpen(false);
  };

  // Current coordinate slice
  const activePointIndex = simulationStepRef.current % SIMULATED_COORDS.length;
  const currentCoordinate = SIMULATED_COORDS[activePointIndex] || SIMULATED_COORDS[0];

  // ---------------------------------------------------------------------------
  // STATE 1: Unauthenticated Driver Terminal Login
  // ---------------------------------------------------------------------------
  if (!isAuthenticated || role !== 'driver') {
    return (
      <div className="flex-1 bg-surface flex flex-col items-center justify-center p-4 py-8 select-none">
        <div className="w-full max-w-md flex flex-col gap-6">
          {/* Terminal Top Bar */}
          <header className="flex items-center justify-between w-full pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white shadow-xs">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-display font-bold text-sm tracking-tight text-ink">
                  RTC COCKPIT
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] text-body-muted uppercase tracking-wider font-semibold">
                    Driver Portal • Live
                  </span>
                </div>
              </div>
            </div>

            {/* Live Terminal Clock */}
            <div className="flex flex-col items-end">
              <div className="font-display text-sm tracking-tight text-ink font-bold font-mono">
                {clockTime || '14:32:08'}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-body-muted font-medium">
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>4G High-Gain</span>
              </div>
            </div>
          </header>

          {/* Centered Prominent Auth Card */}
          <section className="w-full bg-canvas rounded-2xl shadow-xl p-6 flex flex-col gap-5 border border-black/10 relative overflow-hidden">
            {/* Top Status Badge */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-canvas-soft text-ink font-semibold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-black" />
                RTC Official Driver Access
              </span>
              <span className="text-[11px] text-body-muted font-mono">Terminal #041</span>
            </div>

            {/* Title & Description */}
            <div className="flex flex-col gap-1">
              <h1 className="font-display font-bold text-2xl text-ink tracking-tight">
                Driver Login
              </h1>
              <p className="text-xs text-body-muted leading-relaxed">
                Enter your registered transit mobile number and terminal PIN to access dashboard telemetry.
              </p>
            </div>

            {/* Feedback alert banner */}
            {loginError ? (
              <div className="w-full rounded-xl bg-black text-white p-3.5 flex items-start gap-3 transition-all">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 flex flex-col">
                  <span className="text-xs font-bold tracking-tight">
                    Terminal Authorization Warning
                  </span>
                  <span className="text-[11px] text-mute mt-0.5 leading-snug">{loginError}</span>
                </div>
              </div>
            ) : (
              <div className="w-full rounded-xl bg-canvas-soft text-ink p-3.5 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 flex flex-col">
                  <span className="text-xs font-bold tracking-tight">
                    Terminal Ready for Pairing
                  </span>
                  <span className="text-[11px] text-body-muted mt-0.5 leading-snug">
                    Depot Koti Central authenticated. Press 'Sign In' to claim shift.
                  </span>
                </div>
              </div>
            )}

            {/* Auth Form */}
            <form className="flex flex-col gap-4" onSubmit={handleLogin}>
              {/* Phone Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>Mobile Number</span>
                  <span className="text-body-muted font-normal text-[10px]">Registered SIM Only</span>
                </label>
                <div className="relative flex items-center bg-canvas-soft rounded-xl h-12 px-3.5 border border-transparent focus-within:border-black focus-within:bg-canvas transition-all">
                  <Phone className="w-4 h-4 text-body-muted mr-2.5 flex-shrink-0" />
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+91 90000 00002"
                    required
                    className="w-full bg-transparent text-sm text-ink placeholder:text-mute focus:outline-none font-medium"
                  />
                  <CheckCircle className="w-4 h-4 text-emerald-600 ml-2 flex-shrink-0" />
                </div>
              </div>

              {/* PIN Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>Terminal PIN</span>
                  <span className="text-body-muted font-normal text-[10px]">Access Key</span>
                </label>
                <div className="relative flex items-center bg-canvas-soft rounded-xl h-12 px-3.5 border border-transparent focus-within:border-black focus-within:bg-canvas transition-all">
                  <Lock className="w-4 h-4 text-body-muted mr-2.5 flex-shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••"
                    required
                    className="w-full bg-transparent text-sm text-ink placeholder:text-mute focus:outline-none font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="icon-btn p-1 text-body hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Pill Button */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 bg-primary text-white rounded-full py-3.5 px-6 font-semibold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-black-elevated active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                <span>{loginLoading ? 'Authenticating...' : 'Sign In to Terminal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Hint */}
            <div className="flex items-center justify-center gap-2 pt-1 text-center">
              <span className="text-[11px] text-body-muted">
                Forgot PIN? Report to Koti Central Depot Master or Dial 144
              </span>
            </div>
          </section>

          {/* Diagnostic Strip */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-canvas rounded-xl p-3 border border-black/5 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-canvas-soft flex items-center justify-center text-ink flex-shrink-0">
                <Gauge className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-body-muted uppercase truncate font-bold">
                  OBD Bus Telemetry
                </span>
                <span className="text-xs font-bold text-ink truncate">Standby (0 km/h)</span>
              </div>
            </div>

            <div className="bg-canvas rounded-xl p-3 border border-black/5 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-canvas-soft flex items-center justify-center text-ink flex-shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-body-muted uppercase truncate font-bold">
                  GPS Fix Accuracy
                </span>
                <span className="text-xs font-bold text-ink truncate">Sub-meter (RTK)</span>
              </div>
            </div>
          </div>

          {/* Metadata Footer */}
          <footer className="flex flex-col items-center justify-center text-center gap-1 text-[10px] text-body-muted">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-body-muted"></span>
              <span>Terminal ID: HYD-RTC-POS-041</span>
              <span>•</span>
              <span>Depot: Koti Central Depot</span>
            </div>
            <span>Telangana State Road Transport Corporation • Cockpit v4.12</span>
          </footer>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STATE 2: Authenticated Driver - Start Trip Prompt or Active Trip State
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 bg-surface flex flex-col items-center p-4 py-6 select-none max-w-xl mx-auto w-full space-y-4">
      {/* Driver Cockpit Header */}
      <header className="flex items-center justify-between w-full bg-canvas rounded-2xl p-3.5 px-4 shadow-xs border border-black/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
            HYD
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display font-bold text-sm text-ink">Cockpit Console</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${tripActive ? 'bg-emerald-500 animate-pulse' : 'bg-mute'}`}></span>
              <span className="text-[10px] text-body-muted uppercase tracking-wider font-semibold">
                Bus TS09-UB101 • {tripActive ? 'LIVE' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="font-mono text-sm font-bold text-ink">{clockTime}</div>
          <button
            onClick={logout}
            className="icon-btn px-3 py-1 bg-canvas-soft hover:bg-surface-pressed text-xs font-semibold rounded-full"
            title="Sign out"
          >
            Exit
          </button>
        </div>
      </header>

      {!tripActive ? (
        /* Standby / Initiate Trip Screen */
        <div className="w-full bg-canvas rounded-2xl p-6 shadow-uber-dock border border-black/10 flex flex-col gap-6 text-center">
          <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto shadow-md">
            <Play className="w-8 h-8 ml-1 text-white" />
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="font-display font-bold text-xl text-ink">Assigned Route: Route 127K</h2>
            <p className="text-xs text-body-muted max-w-sm mx-auto leading-relaxed">
              Koti Bus Station ➔ Kondapur Bus Depot. Press Start Trip below to initiate GNSS telemetry broadcast to commuter maps.
            </p>
          </div>

          <div className="bg-canvas-soft rounded-xl p-3.5 flex items-center justify-around text-xs text-body">
            <div>
              <span className="text-[10px] text-body-muted uppercase block font-bold">Vehicle</span>
              <span className="font-mono font-bold text-ink">TS09-UB101</span>
            </div>
            <div className="h-6 w-px bg-black/10"></div>
            <div>
              <span className="text-[10px] text-body-muted uppercase block font-bold">Depot</span>
              <span className="font-bold text-ink">Koti Central</span>
            </div>
            <div className="h-6 w-px bg-black/10"></div>
            <div>
              <span className="text-[10px] text-body-muted uppercase block font-bold">Telemetry</span>
              <span className="font-bold text-emerald-600">RTK Armed</span>
            </div>
          </div>

          <button
            onClick={handleStartTrip}
            className="w-full h-14 rounded-full bg-primary hover:bg-black-elevated text-white font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START TRIP BROADCAST</span>
          </button>
        </div>
      ) : (
        /* Active Trip Cockpit Console */
        <div className="w-full flex flex-col gap-3.5">
          {/* Top Status Banner */}
          <div className="bg-primary text-white rounded-2xl p-4 shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 bg-black-elevated px-3 py-1.5 rounded-full">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[11px] font-bold tracking-wide uppercase">
                  LIVE • TRIP IN PROGRESS
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-black-elevated px-3 py-1 rounded-full text-mute text-xs">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider">3s Sync</span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-mute uppercase tracking-widest font-bold">
                Assigned Transit Unit
              </span>
              <span className="font-display font-bold text-xl text-white tracking-tight">
                Bus TS09-UB101 <span className="text-mute text-xs font-normal">(Route 127K)</span>
              </span>
            </div>

            {/* Signal health indicator pill */}
            <div className="flex items-center justify-between bg-black-elevated rounded-xl px-3.5 py-2.5 transition-colors">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    gpsSimState === 'broadcasting'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : gpsSimState === 'acquiring'
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                  }`}
                ></span>
                <span className="text-xs font-bold tracking-tight">
                  {gpsSimState === 'broadcasting' && 'Broadcasting GPS (Every 3s)'}
                  {gpsSimState === 'acquiring' && 'Acquiring GNSS Lock...'}
                  {gpsSimState === 'lost' && 'Signal Weak / Reconnecting...'}
                </span>
              </div>
              <Compass className="w-4 h-4 text-mute" />
            </div>

            {/* Simulation Toggles */}
            <div className="flex flex-col gap-1 pt-1">
              <span className="text-[10px] text-mute uppercase tracking-wider font-semibold">
                Simulate GPS Receiver Health
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGpsSimState('broadcasting')}
                  className={`py-1 px-2 rounded-full text-[10px] uppercase font-bold text-center transition-all ${
                    gpsSimState === 'broadcasting'
                      ? 'bg-white text-black'
                      : 'bg-black-elevated text-mute hover:text-white'
                  }`}
                >
                  🟢 Broadcast
                </button>
                <button
                  type="button"
                  onClick={() => setGpsSimState('acquiring')}
                  className={`py-1 px-2 rounded-full text-[10px] uppercase font-bold text-center transition-all ${
                    gpsSimState === 'acquiring'
                      ? 'bg-white text-black'
                      : 'bg-black-elevated text-mute hover:text-white'
                  }`}
                >
                  🟡 Acquiring
                </button>
                <button
                  type="button"
                  onClick={() => setGpsSimState('lost')}
                  className={`py-1 px-2 rounded-full text-[10px] uppercase font-bold text-center transition-all ${
                    gpsSimState === 'lost'
                      ? 'bg-white text-black'
                      : 'bg-black-elevated text-mute hover:text-white'
                  }`}
                >
                  🔴 Lost Signal
                </button>
              </div>
            </div>
          </div>

          {/* Speedometer Hero Card */}
          <div className="bg-canvas text-ink rounded-2xl p-5 shadow-sm border border-black/10 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-body-muted" />
                <span className="text-[10px] text-body-muted uppercase tracking-widest font-bold">
                  Speedometer (GNSS)
                </span>
              </div>
              <span className="bg-canvas-soft px-2.5 py-0.5 rounded-full text-[10px] font-bold text-ink">
                LIMIT 50
              </span>
            </div>

            <div className="flex items-baseline justify-between py-2">
              <div className="flex items-baseline">
                <span className="font-display font-extrabold tracking-tighter text-6xl text-ink">
                  {currentSpeed}
                </span>
                <span className="font-display text-lg font-bold text-body-muted ml-2">km/h</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-body-muted uppercase font-semibold">Cruise Safety</span>
                <span className="text-xs font-bold text-emerald-600">OPTIMAL</span>
              </div>
            </div>

            {/* Speed Limit Progression Gauge Bar */}
            <div className="w-full bg-canvas-soft h-2.5 rounded-full overflow-hidden mt-1 p-0.5">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (currentSpeed / 50) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Trip Duration & Telemetry Pings Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Trip Duration */}
            <div className="bg-canvas text-ink rounded-2xl p-4 shadow-sm border border-black/10 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-body-muted">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-bold">Duration</span>
              </div>
              <div className="py-2">
                <span className="font-display font-bold text-2xl tracking-tight text-ink font-mono">
                  {formatChronometer(secondsElapsed)}
                </span>
              </div>
              <span className="text-[10px] text-body-muted">Route Started Live</span>
            </div>

            {/* Pings Sent Counter with Pulse Dot */}
            <div className="bg-canvas text-ink rounded-2xl p-4 shadow-sm border border-black/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-body-muted">
                <div className="flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider font-bold">GPS Pings</span>
                </div>
                <span
                  className={`w-2.5 h-2.5 rounded-full bg-black transition-opacity duration-200 ${
                    pingFlash ? 'opacity-100' : 'opacity-20'
                  }`}
                ></span>
              </div>
              <div className="py-2">
                <span className="font-display font-bold text-2xl tracking-tight text-ink font-mono">
                  {pingCount}
                </span>
              </div>
              <span className="text-[10px] text-body-muted">0 Dropped Packets</span>
            </div>
          </div>

          {/* Coordinates Card */}
          <div className="bg-canvas text-ink rounded-2xl p-4 shadow-sm border border-black/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-body-muted" />
                <span className="text-[10px] text-body-muted uppercase tracking-widest font-bold">
                  Hardware Coordinates
                </span>
              </div>
              <span className="bg-canvas-soft px-2 py-0.5 rounded text-[10px] font-mono text-ink font-semibold">
                HDOP 0.8
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="flex flex-col">
                <span className="text-xs font-bold font-mono tracking-tight text-ink">
                  {currentCoordinate.lat}° N, {currentCoordinate.lng}° E
                </span>
                <span className="text-[10px] text-body-muted">Hyderabad Urban Corridor</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono text-ink">536m</span>
                <span className="text-[9px] text-body-muted block uppercase">Altitude</span>
              </div>
            </div>
          </div>

          {/* Next Scheduled Stop Bar */}
          <div className="bg-primary text-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-black-elevated flex items-center justify-center flex-shrink-0">
                <Navigation className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-mute uppercase tracking-wider font-bold">
                  Next Scheduled Stop
                </span>
                <span className="font-display font-bold text-sm text-white tracking-tight">
                  {currentCoordinate.stop}
                </span>
              </div>
            </div>

            <div className="text-right flex-shrink-0 bg-black-elevated px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold font-mono text-white block">
                {currentCoordinate.dist}
              </span>
              <span className="text-[9px] text-mute uppercase font-semibold">Proximity</span>
            </div>
          </div>

          {/* END TRIP Button */}
          <div className="pt-2">
            <button
              onClick={() => setSafetyModalOpen(true)}
              className="w-full h-14 rounded-full bg-primary hover:bg-black-elevated text-white font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-all"
            >
              <Power className="w-5 h-5" />
              <span>END TRIP</span>
            </button>
            <p className="text-center text-[10px] text-body-muted mt-2">
              Tap requires double-confirmation for driver safety.
            </p>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal */}
      {safetyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-canvas text-ink w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-4 border border-black/10">
            <div className="w-12 h-12 rounded-full bg-canvas-soft flex items-center justify-center mx-auto text-ink">
              <AlertTriangle className="w-6 h-6 text-black" />
            </div>

            <div className="flex flex-col gap-1 text-center">
              <h3 className="font-display font-bold text-lg text-ink tracking-tight">
                End Current Trip?
              </h3>
              <p className="text-xs text-body-muted leading-relaxed">
                Are you sure you want to conclude this trip? Telemetry broadcast will cease on public commuter transit maps immediately.
              </p>
            </div>

            <div className="bg-canvas-softer rounded-xl p-3 flex flex-col gap-0.5 text-center">
              <span className="text-[10px] text-body-muted uppercase font-bold">Active Session</span>
              <span className="text-xs font-bold text-ink">Bus TS09-UB101 • Route 127K</span>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleConfirmEndTrip}
                className="w-full h-11 rounded-full bg-primary hover:bg-black-elevated text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-xs"
              >
                Confirm End Trip
              </button>
              <button
                onClick={() => setSafetyModalOpen(false)}
                className="w-full h-11 rounded-full bg-canvas-soft hover:bg-surface-pressed text-ink font-semibold text-xs transition-all active:scale-95"
              >
                Cancel / Resume Driving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
