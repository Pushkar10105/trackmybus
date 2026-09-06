// src/components/commuter/BusMap.jsx
import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom Map Controller to auto-fit bounds when route stops change
function MapController({ stops, recenterTrigger }) {
  const map = useMap();

  useEffect(() => {
    if (stops && stops.length > 0) {
      const bounds = stops.map((s) => [Number(s.lat), Number(s.lng)]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [stops, recenterTrigger, map]);

  return null;
}

// Stop marker DivIcon
function createStopIcon(sequenceNumber, isTerminal = false) {
  const bg = isTerminal ? '#000000' : '#ffffff';
  const text = isTerminal ? '#ffffff' : '#000000';
  const border = isTerminal ? '2px solid #ffffff' : '2px solid #000000';

  return L.divIcon({
    className: 'custom-stop-marker',
    html: `
      <div style="
        background: ${bg};
        color: ${text};
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        border: ${border};
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        cursor: pointer;
        transition: transform 0.2s;
      ">
        ${sequenceNumber}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -15],
  });
}

// Bus marker DivIcon with pulse radar ring
function createBusIcon(busNumber, speed = 0, isInactive = false) {
  const pulseRingHtml = isInactive
    ? ''
    : '<div class="bus-pulse-ring"></div>';

  return L.divIcon({
    className: 'custom-bus-marker',
    html: `
      <div style="position: relative; cursor: pointer;">
        ${pulseRingHtml}
        <div style="
          background: #000000;
          color: #ffffff;
          padding: 5px 10px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          border: 2px solid #ffffff;
          box-shadow: 0 6px 16px rgba(0,0,0,0.35);
          white-space: nowrap;
          font-family: 'Plus Jakarta Sans', sans-serif;
        ">
          <span style="display: inline-flex; width: 7px; height: 7px; border-radius: 50%; background: ${isInactive ? '#a3a3a3' : '#34d399'};"></span>
          <span>${busNumber}</span>
          ${speed > 0 ? `<span style="opacity: 0.8; font-size: 9px; font-weight: 600; padding: 1px 5px; border-radius: 999px; background: #262626;">${Math.round(speed)}kph</span>` : ''}
        </div>
      </div>
    `,
    iconSize: [110, 36],
    iconAnchor: [55, 18],
    popupAnchor: [0, -20],
  });
}

const DEFAULT_LAT = Number(import.meta.env.VITE_DEFAULT_LAT) || 31.3260;
const DEFAULT_LNG = Number(import.meta.env.VITE_DEFAULT_LNG) || 75.5762;
const DEFAULT_ZOOM = Number(import.meta.env.VITE_DEFAULT_ZOOM) || 13;

const BusMap = forwardRef(function BusMap(
  {
    stops = [],
    liveBuses = {},
    center = [DEFAULT_LAT, DEFAULT_LNG],
    zoom = DEFAULT_ZOOM,
    recenterTrigger = 0,
  },
  ref
) {
  const polylineCoords = stops.map((s) => [Number(s.lat), Number(s.lng)]);
  const busList = Object.values(liveBuses);
  const initialCenter =
    stops && stops.length > 0
      ? [Number(stops[0].lat), Number(stops[0].lng)]
      : center;

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-canvas select-none">
      <MapContainer center={initialCenter} zoom={zoom} scrollWheelZoom={true} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController stops={stops} recenterTrigger={recenterTrigger} />

        {/* Route alignment polyline - high-contrast black line */}
        {polylineCoords.length > 1 && (
          <>
            {/* Outer casing */}
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: '#ffffff',
                weight: 8,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Core road line */}
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: '#000000',
                weight: 4,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* Bus stop markers */}
        {stops.map((stop, idx) => {
          const isTerminal = idx === 0 || idx === stops.length - 1;
          return (
            <Marker
              key={`stop-${stop.id || idx}`}
              position={[Number(stop.lat), Number(stop.lng)]}
              icon={createStopIcon(stop.sequence_number || idx + 1, isTerminal)}
            >
              <Popup>
                <div className="p-1 font-sans">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-black"></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-body">
                      Stop #{stop.sequence_number || idx + 1}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-ink">{stop.name}</div>
                  <div className="text-[11px] text-body-muted font-mono mt-0.5">
                    {Number(stop.lat).toFixed(4)}° N, {Number(stop.lng).toFixed(4)}° E
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Live buses markers */}
        {busList.map((bus) => {
          if (!bus.lat || !bus.lng) return null;
          const isInactive = bus.status === 'inactive';
          return (
            <Marker
              key={`bus-${bus.bus_id || bus.bus_number}`}
              position={[Number(bus.lat), Number(bus.lng)]}
              icon={createBusIcon(bus.bus_number, bus.speed, isInactive)}
            >
              <Popup>
                <div className="p-1 font-sans min-w-[170px]">
                  <div className="flex items-center justify-between pb-1 border-b border-black/10">
                    <span className="font-bold text-sm text-ink">{bus.bus_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isInactive ? 'bg-canvas-soft text-body' : 'bg-black text-white'
                    }`}>
                      {isInactive ? 'Standby' : 'Live Broadcast'}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-body">
                    <div className="flex justify-between">
                      <span>Speed:</span>
                      <strong className="text-ink font-mono">{Math.round(bus.speed || 0)} km/h</strong>
                    </div>
                    {bus.driver_phone && (
                      <div className="flex justify-between">
                        <span>Driver:</span>
                        <strong className="text-ink font-mono">{bus.driver_phone}</strong>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-mute pt-1 border-t border-black/5">
                      <span>Telemetry:</span>
                      <span>Real-time</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
});

export default BusMap;
