// src/pages/CommuterPage.jsx
import React, { useState, useEffect } from 'react';
import { routesApi } from '../api/endpoints';
import { useSocket } from '../hooks/useSocket';
import BusMap from '../components/commuter/BusMap';
import EtaCard from '../components/commuter/EtaCard';
import IssueModal from '../components/commuter/IssueModal';
import LostFoundModal from '../components/commuter/LostFoundModal';
import ChatWidget from '../components/commuter/ChatWidget';
import {
  Bus,
  MapPin,
  AlertCircle,
  Package,
  Radio,
  Crosshair,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

export default function CommuterPage() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [currentRouteDetails, setCurrentRouteDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

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
  const currentStops = currentRouteDetails?.stops || [];

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden select-none bg-canvas">
      {/* Fullscreen Map Background */}
      <div className="absolute inset-0 z-0">
        <BusMap
          stops={currentStops}
          liveBuses={liveBuses}
          recenterTrigger={recenterTrigger}
        />
      </div>

      {/* Sleek Floating Horizontal Bar Across Top (Cockpit HUD Style) */}
      <header className="absolute top-4 left-4 right-4 z-20 flex flex-col md:flex-row items-stretch md:items-center justify-between pointer-events-none gap-3">
        {/* Consolidated Top Command Bar */}
        <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-uber-dock border border-black/10 gap-3 max-w-full md:max-w-2xl w-full">
          {/* Transit Emblem */}
          <div className="h-10 w-10 bg-black rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold tracking-tight text-sm shadow-sm">
            <Bus className="w-5 h-5 text-white" />
          </div>

          {/* Route Dropdown & Details */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-0.5">
              <label className="text-[10px] font-bold tracking-wider uppercase text-body-muted">
                Select Route
              </label>

              {/* Route Active Bus Badge */}
              <span className="bg-black text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>
                  {activeBusesCount} {activeBusesCount === 1 ? 'Active Bus' : 'Active Buses'}
                </span>
              </span>

              {/* GPS Sync telemetry indicator */}
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-body-muted font-medium bg-canvas-soft px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>GPS Live • 3s</span>
              </span>
            </div>

            <div className="relative">
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full bg-canvas-soft hover:bg-canvas-softer transition-colors font-semibold text-xs md:text-sm text-ink rounded-xl py-1.5 pl-3 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-black border-0"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}: {r.start_point} ➔ {r.end_point}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-ink pointer-events-none" />
            </div>
          </div>

          {/* Quick Reset / Re-center Location Button */}
          <button
            onClick={() => setRecenterTrigger((t) => t + 1)}
            className="icon-btn h-9 w-9 bg-canvas-soft hover:bg-surface-pressed rounded-full flex items-center justify-center text-ink transition-all flex-shrink-0"
            title="Center Route View"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action Pill Buttons (Right Side) */}
        <div className="pointer-events-auto flex items-center gap-2 flex-shrink-0 self-end md:self-auto">
          <button
            onClick={() => setLostFoundModalOpen(true)}
            className="pill-btn bg-white/95 backdrop-blur-md hover:bg-canvas-soft text-ink text-xs font-semibold px-4 py-2.5 rounded-full shadow-uber-dock border border-black/10 flex items-center gap-2"
          >
            <Package className="w-4 h-4 text-black" />
            <span>Lost &amp; Found</span>
          </button>

          <button
            onClick={() => setIssueModalOpen(true)}
            className="pill-btn bg-white/95 backdrop-blur-md hover:bg-canvas-soft text-ink text-xs font-semibold px-4 py-2.5 rounded-full shadow-uber-dock border border-black/10 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-black" />
            <span>Report Issue</span>
          </button>
        </div>
      </header>

      {/* Left Side Floating Dock / ETA Card */}
      <EtaCard
        routeDetails={currentRouteDetails}
        liveBuses={liveBuses}
        selectedRouteName={routes.find((r) => String(r.id) === String(selectedRouteId))?.name}
        stops={currentStops}
      />

      {/* Floating AI Assistant Chat Bubble & Drawer */}
      <ChatWidget />

      {/* Report Issue Modal */}
      <IssueModal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        defaultBusNumber={Object.values(liveBuses)[0]?.bus_number || ''}
      />

      {/* Lost & Found Drawer */}
      <LostFoundModal
        isOpen={lostFoundModalOpen}
        onClose={() => setLostFoundModalOpen(false)}
        routes={routes}
      />
    </div>
  );
}
