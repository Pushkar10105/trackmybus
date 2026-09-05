// src/pages/CommuterPage.jsx
import React, { useState, useEffect } from 'react';
import { routesApi } from '../api/endpoints';
import { useSocket } from '../hooks/useSocket';
import BusMap from '../components/commuter/BusMap';
import EtaCard from '../components/commuter/EtaCard';
import IssueModal from '../components/commuter/IssueModal';
import LostFoundModal from '../components/commuter/LostFoundModal';
import ChatWidget from '../components/commuter/ChatWidget';
import { Bus, MapPin, AlertCircle, Package, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function CommuterPage() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [currentRouteDetails, setCurrentRouteDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);

  // Modals
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [lostFoundModalOpen, setLostFoundModalOpen] = useState(false);

  // Socket connection & real-time bus locations
  const { isConnected, liveBuses, setLiveBuses } = useSocket(selectedRouteId);

  // Load all transit routes
  useEffect(() => {
    async function loadRoutes() {
      try {
        const data = await routesApi.getAll();
        setRoutes(data || []);
        if (data && data.length > 0) {
          setSelectedRouteId(String(data[0].id));
        }
      } catch (err) {
        console.error('Failed to fetch transit routes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRoutes();
  }, []);

  // When selected route changes, fetch full stops sequence and initial live positions
  useEffect(() => {
    if (!selectedRouteId) return;

    async function loadRouteData() {
      try {
        const [routeDetails, initialLive] = await Promise.all([
          routesApi.getById(selectedRouteId),
          routesApi.getLiveBuses(selectedRouteId),
        ]);

        setCurrentRouteDetails(routeDetails);

        // Populate initial live buses map
        const initialMap = {};
        if (Array.isArray(initialLive)) {
          initialLive.forEach((bus) => {
            initialMap[bus.bus_id] = {
              ...bus,
              status: 'active',
              lastUpdated: Date.now(),
            };
          });
        }
        setLiveBuses(initialMap);
      } catch (err) {
        console.error('Failed to load route details or live buses:', err);
      }
    }

    loadRouteData();
  }, [selectedRouteId, setLiveBuses]);

  const activeBusesCount = Object.values(liveBuses).filter((b) => b.status !== 'inactive').length;
  const firstActiveBusNumber = Object.values(liveBuses).find((b) => b.status !== 'inactive')?.bus_number || '';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Route Picker */}
          <div className="w-full md:w-auto flex-1 max-w-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-emerald-600" />
              Select Bus Route
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.start_point} ➔ {r.end_point})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            <button
              onClick={() => setIssueModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Report Issue
            </button>

            <button
              onClick={() => setLostFoundModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition"
            >
              <Package className="w-3.5 h-3.5 text-sky-600" />
              Lost & Found
            </button>

            <button
              onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                lowBandwidthMode
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Toggle Low Bandwidth Text Mode"
            >
              {lowBandwidthMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              {lowBandwidthMode ? 'Text Mode ON' : 'Map Mode'}
            </button>
          </div>
        </div>

        {/* Route Status Summary Ribbon */}
        {currentRouteDetails && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <span className="font-bold">{currentRouteDetails.name}:</span>
              <span>
                {currentRouteDetails.start_point} ➔ {currentRouteDetails.end_point}
              </span>
              <span className="text-slate-400">|</span>
              <span>{currentRouteDetails.stops?.length || 0} designated stops</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-semibold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeBusesCount > 0 ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                  }`}
                ></span>
                {activeBusesCount} Bus{activeBusesCount === 1 ? '' : 'es'} Active Now
              </span>
              <span className="text-slate-400">|</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <RefreshCw className={`w-3 h-3 ${isConnected ? 'text-emerald-600' : 'text-amber-500'}`} />
                {isConnected ? 'Live Telemetry Connected' : 'Connecting to Socket...'}
              </span>
            </div>
          </div>
        )}

        {/* Main Grid: Map & Live ETA Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Interactive Map or Low-Bandwidth Mode */}
          <div className="lg:col-span-2 space-y-4">
            {lowBandwidthMode ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Low Bandwidth Itinerary View</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">Text Telemetry</span>
                </div>
                <div className="space-y-2">
                  {currentRouteDetails?.stops?.map((stop) => (
                    <div
                      key={stop.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                          {stop.sequence_number}
                        </span>
                        <div>
                          <p className="font-semibold text-sm text-slate-800">{stop.name}</p>
                          <p className="text-xs text-slate-400">Sequence #{stop.sequence_number}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <BusMap
                stops={currentRouteDetails?.stops || []}
                liveBuses={liveBuses}
                center={[
                  Number(import.meta.env.VITE_DEFAULT_LAT || 17.4344),
                  Number(import.meta.env.VITE_DEFAULT_LNG || 78.4659),
                ]}
              />
            )}
          </div>

          {/* Right Col: Live Upcoming Stop ETAs */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Live Arrival Estimates
            </h3>
            <EtaCard liveBuses={liveBuses} selectedRoute={currentRouteDetails} />
          </div>
        </div>
      </div>

      {/* Modals & AI Assistant */}
      <IssueModal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        defaultBusNumber={firstActiveBusNumber}
      />
      <LostFoundModal
        isOpen={lostFoundModalOpen}
        onClose={() => setLostFoundModalOpen(false)}
        routes={routes}
      />
      <ChatWidget />
    </div>
  );
}
