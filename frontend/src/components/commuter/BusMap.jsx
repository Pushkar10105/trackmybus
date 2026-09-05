// src/components/commuter/BusMap.jsx
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom Map Controller to auto-fit bounds when route stops change
function MapController({ stops, liveBuses }) {
  const map = useMap();

  useEffect(() => {
    if (stops && stops.length > 0) {
      const bounds = stops.map((s) => [Number(s.lat), Number(s.lng)]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [stops, map]);

  return null;
}

// Stop pin DivIcon
function createStopIcon(sequenceNumber) {
  return L.divIcon({
    className: 'custom-stop-marker',
    html: `
      <div style="
        background: #1e293b;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${sequenceNumber}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

// Bus icon DivIcon
function createBusIcon(busNumber, isInactive = false) {
  const bg = isInactive ? '#64748b' : '#16a34a';
  const pulseClass = isInactive ? '' : 'live-bus-marker';
  return L.divIcon({
    className: 'custom-bus-marker',
    html: `
      <div class="${pulseClass}" style="
        background: ${bg};
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 700;
        border: 2px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.25);
        white-space: nowrap;
      ">
        <span>🚌</span>
        <span>${busNumber}</span>
      </div>
    `,
    iconSize: [80, 30],
    iconAnchor: [40, 15],
    popupAnchor: [0, -18],
  });
}

export default function BusMap({ stops = [], liveBuses = {}, center = [17.4344, 78.4659], zoom = 13 }) {
  const polylineCoords = stops.map((s) => [Number(s.lat), Number(s.lng)]);
  const busList = Object.values(liveBuses);

  return (
    <div className="relative w-full h-[500px] md:h-[620px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController stops={stops} liveBuses={liveBuses} />

        {/* Route alignment polyline */}
        {polylineCoords.length > 1 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: '#059669',
              weight: 5,
              opacity: 0.8,
              dashArray: '8, 8',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Sequential stops */}
        {stops.map((stop) => (
          <Marker
            key={`stop-${stop.id}`}
            position={[Number(stop.lat), Number(stop.lng)]}
            icon={createStopIcon(stop.sequence_number)}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold text-slate-900 text-sm">{stop.name}</div>
                <div className="text-slate-500">Stop #{stop.sequence_number} on this route</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  GPS: {Number(stop.lat).toFixed(4)}, {Number(stop.lng).toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Live buses */}
        {busList.map((bus) => {
          const isInactive = bus.status === 'inactive';
          return (
            <Marker
              key={`bus-${bus.bus_id}`}
              position={[Number(bus.lat), Number(bus.lng)]}
              icon={createBusIcon(bus.bus_number, isInactive)}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1">
                      🚌 {bus.bus_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isInactive ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isInactive ? 'Inactive' : 'Live'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600">
                    <p>
                      <strong>Speed:</strong> {Number(bus.speed).toFixed(1)} km/h
                    </p>
                    {bus.etas && bus.etas.length > 0 ? (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="font-semibold text-slate-800 mb-1">Upcoming ETAs:</p>
                        <div className="space-y-1">
                          {bus.etas.slice(0, 3).map((eta, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="truncate max-w-[130px]">{eta.stop_name}</span>
                              <span className="font-bold text-emerald-700">{eta.eta_min} min</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Calculating upcoming stop ETAs...</p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
