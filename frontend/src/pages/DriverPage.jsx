// src/pages/DriverPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { driverApi } from '../api/endpoints';
import { Navigation, Play, Square, AlertCircle, CheckCircle, Radio, Lock, Phone, User } from 'lucide-react';

export default function DriverPage() {
  const { user, isAuthenticated, role, login, signup, logout } = useAuth();

  // Toggle between 'login' and 'signup' views
  const [authMode, setAuthMode] = useState('login');

  // Login form state
  const [phone, setPhone] = useState('9000000002'); // prefilled seeded driver
  const [password, setPassword] = useState('password123'); // prefilled seeded password
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // Trip and Tracking State
  const [tripActive, setTripActive] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'no-gps' | 'error'
  const [statusText, setStatusText] = useState('Standby');
  const [lastPing, setLastPing] = useState(null);
  const [pingCount, setPingCount] = useState(0);

  // Simulation mode for desktop testing
  const [simulateMode, setSimulateMode] = useState(true);

  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const simulationStepRef = useRef(0);

  // Simulated GPS track in Hyderabad for Bus TS09-1234
  const SIMULATED_COORDS = [
    { lat: 17.4344, lng: 78.5017, speed: 32 },
    { lat: 17.4382, lng: 78.4840, speed: 38 },
    { lat: 17.4448, lng: 78.4659, speed: 41 },
    { lat: 17.4412, lng: 78.4550, speed: 28 },
    { lat: 17.4375, lng: 78.4483, speed: 35 },
    { lat: 17.4420, lng: 78.4210, speed: 46 },
    { lat: 17.4480, lng: 78.3950, speed: 42 },
    { lat: 17.4504, lng: 78.3808, speed: 30 },
  ];

  // Handle Driver Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const res = await login(phone.trim(), password);
    if (!res.success) {
      setLoginError(res.error || 'Failed to authenticate driver credentials');
    } else if (res.user.role !== 'driver') {
      setLoginError('Account role is not a driver. Please use a driver account.');
    }
    setLoginLoading(false);
  };

  // Handle Driver Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError('');

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match');
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters');
      return;
    }

    setSignupLoading(true);
    const res = await signup(signupName.trim(), signupPhone.trim(), signupPassword);
    if (!res.success) {
      setSignupError(res.error || 'Failed to create driver account');
    }
    setSignupLoading(false);
  };

  // Start Trip
  const handleStartTrip = async () => {
    try {
      setStatusText('Initiating trip...');
      await driverApi.startTrip();
      setTripActive(true);
      setStatus('sending');
      setStatusText('GPS Broadcasting Active');

      if (simulateMode) {
        intervalRef.current = setInterval(async () => {
          const step = simulationStepRef.current % SIMULATED_COORDS.length;
          const currentPoint = SIMULATED_COORDS[step];
          simulationStepRef.current += 1;

          try {
            await driverApi.sendLocation({
              bus_id: user?.bus_id || 1,
              lat: currentPoint.lat,
              lng: currentPoint.lng,
              speed: currentPoint.speed,
              timestamp: new Date().toISOString(),
            });
            setStatus('sending');
            setStatusText('GPS Active (Simulated)');
            setLastPing(new Date().toLocaleTimeString());
            setPingCount((c) => c + 1);
          } catch (err) {
            console.error('Simulated ping error:', err);
            setStatus('error');
            setStatusText(err.message || 'Transmission failed');
          }
        }, 5000);
      } else {
        if (!navigator.geolocation) {
          setStatus('no-gps');
          setStatusText('Geolocation not supported on this browser');
          return;
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
          async (position) => {
            try {
              await driverApi.sendLocation({
                bus_id: user?.bus_id || 1,
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                speed: (position.coords.speed || 0) * 3.6,
                timestamp: new Date(position.timestamp).toISOString(),
              });
              setStatus('sending');
              setStatusText('GPS Locked & Sending');
              setLastPing(new Date().toLocaleTimeString());
              setPingCount((c) => c + 1);
            } catch (err) {
              console.error('Location transmission error:', err);
              setStatus('error');
              setStatusText(err.message || 'Transmission failed');
            }
          },
          (err) => {
            console.warn('Geolocation error:', err);
            setStatus('no-gps');
            setStatusText('Waiting for GPS signal...');
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000,
          }
        );
      }
    } catch (err) {
      console.error('Failed to start trip:', err);
      setStatus('error');
      setStatusText(err.message || 'Could not start trip');
    }
  };

  // End Trip
  const handleEndTrip = async () => {
    try {
      await driverApi.endTrip();
    } catch (err) {
      console.error('End trip warning:', err);
    } finally {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTripActive(false);
      setStatus('idle');
      setStatusText('Trip Ended');
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 1. If not authenticated or not a driver, show high-contrast Login/Signup Screen
  if (!isAuthenticated || role !== 'driver') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-900">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto text-white shadow-lg">
              <Navigation className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Driver Console</h2>
            <p className="text-xs text-slate-500 font-medium">
              {authMode === 'login'
                ? 'Log in to operate assigned transit vehicle'
                : 'Create a driver account to get started'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => {
                setAuthMode('login');
                setSignupError('');
              }}
              className={`flex-1 py-2 rounded-lg transition ${
                authMode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setLoginError('');
              }}
              className={`flex-1 py-2 rounded-lg transition ${
                authMode === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              Create Account
            </button>
          </div>

          {authMode === 'login' ? (
            <>
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9000000002"
                    className="w-full text-base font-medium px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-base font-medium px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-4 rounded-xl font-black text-base uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition active:scale-98 disabled:opacity-50"
                >
                  {loginLoading ? 'Signing in...' : 'Sign In as Driver'}
                </button>
              </form>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 text-center">
                Demo driver seeded in database: <br />
                <strong className="text-slate-800">9000000002</strong> / <strong className="text-slate-800">password123</strong>
              </div>
            </>
          ) : (
            <>
              {signupError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{signupError}</span>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full text-base font-medium px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="e.g. 9123456789"
                    className="w-full text-base font-medium px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Password
                  </label>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full text-base font-medium px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full text-base font-medium px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full py-4 rounded-xl font-black text-base uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition active:scale-98 disabled:opacity-50"
                >
                  {signupLoading ? 'Creating account...' : 'Create Driver Account'}
                </button>
              </form>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 text-center">
                After signing up, contact your admin to get assigned to a bus and route.
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // 2. Authenticated Driver Screen: High contrast, big tap targets
  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 select-none">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Assigned Vehicle</span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-emerald-400">
              {user?.bus_id ? `Bus ID #${user.bus_id}` : 'No bus assigned yet'}
            </h1>
          </div>

          <button
            onClick={logout}
            className="text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"
          >
            Sign Out
          </button>
        </div>

        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-4 h-4 rounded-full ${
                status === 'sending'
                  ? 'bg-emerald-500 animate-ping'
                  : status === 'no-gps'
                  ? 'bg-amber-400'
                  : status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-600'
              }`}
            ></span>
            <div>
              <div className="text-sm font-bold capitalize">
                {status === 'sending' ? 'Live Telemetry Active' : statusText}
              </div>
              <div className="text-xs text-slate-400">
                {lastPing ? `Last ping: ${lastPing} (${pingCount} total)` : 'No pings sent yet'}
              </div>
            </div>
          </div>

          <Radio
            className={`w-6 h-6 ${
              status === 'sending' ? 'text-emerald-400 animate-pulse' : 'text-slate-600'
            }`}
          />
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-300">Desktop Simulation Mode</span>
            <p className="text-[11px] text-slate-500">Auto-steps GPS coordinates along Route 10H</p>
          </div>
          <button
            disabled={tripActive}
            onClick={() => setSimulateMode(!simulateMode)}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              simulateMode
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {simulateMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="py-8 flex flex-col items-center justify-center">
        {!tripActive ? (
          <button
            onClick={handleStartTrip}
            className="w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-2xl uppercase tracking-widest shadow-2xl flex flex-col items-center justify-center gap-3 transition duration-200 border-8 border-emerald-600/40"
          >
            <Play className="w-16 h-16 fill-current text-slate-950" />
            <span>START TRIP</span>
          </button>
        ) : (
          <button
            onClick={handleEndTrip}
            className="w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-2xl uppercase tracking-widest shadow-2xl flex flex-col items-center justify-center gap-3 transition duration-200 border-8 border-rose-700/40 animate-pulse"
          >
            <Square className="w-14 h-14 fill-current text-white" />
            <span>END TRIP</span>
          </button>
        )}
      </div>

      <div className="text-center text-xs text-slate-500 py-2 border-t border-slate-900">
        Leave this screen open while operating. Location pings broadcast to all commuters watching your route.
      </div>
    </div>
  );
}