// src/components/commuter/EtaCard.jsx
import React, { useState } from 'react';
import { Bus, Navigation, Clock, ChevronDown, ChevronUp, Radio, ArrowRight, ShieldCheck } from 'lucide-react';

export default function EtaCard({
  routeDetails,
  liveBuses = {},
  selectedRouteName = 'Route',
  stops = [],
}) {
  const [collapsed, setCollapsed] = useState(false);
  const busList = Object.values(liveBuses);
  const activeBuses = busList.filter((b) => b.status !== 'inactive');

  return (
    <aside
      className={`absolute left-4 bottom-6 top-auto md:top-24 md:bottom-6 w-[calc(100%-2rem)] md:w-[384px] z-20 pointer-events-auto flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-uber-dock border border-black/10 overflow-hidden transition-all duration-300 ${
        collapsed ? 'max-h-[72px]' : 'max-h-[60vh] md:max-h-[calc(100vh-140px)]'
      }`}
    >
      {/* Dock Header */}
      <div className="p-4 border-b border-black/5 flex items-center justify-between bg-white select-none">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base text-ink tracking-tight font-display truncate">
              {routeDetails?.name || selectedRouteName || 'Transit Route'}
            </h2>
            <span className="bg-black text-white font-semibold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 flex-shrink-0 shadow-xs">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              LIVE
            </span>
          </div>
          <p className="text-xs text-body-muted mt-0.5 flex items-center gap-1.5 truncate">
            <span className="truncate">{routeDetails?.start_point || 'Start'}</span>
            <ArrowRight className="w-3 h-3 text-mute flex-shrink-0" />
            <span className="truncate">{routeDetails?.end_point || 'Terminal'}</span>
          </p>
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="icon-btn h-8 w-8 bg-canvas-soft hover:bg-surface-pressed rounded-full flex items-center justify-center text-ink text-sm flex-shrink-0"
          title={collapsed ? 'Expand Drawer' : 'Collapse Drawer'}
        >
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Active Bus Cards List & Vertical Timeline Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {activeBuses.length > 0 ? (
              activeBuses.map((bus) => {
                const speed = Math.round(bus.speed || 0);
                return (
                  <div
                    key={bus.bus_id || bus.bus_number}
                    className="p-3.5 rounded-2xl bg-canvas-soft/70 border border-black/5 hover:border-black/20 transition-all space-y-2.5 shadow-xs"
                  >
                    {/* Bus Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs">
                          <Bus className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-ink">{bus.bus_number}</h4>
                          <span className="text-[10px] text-body-muted font-mono">
                            Assigned Transit Unit
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="bg-white border border-black/10 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold text-ink">
                          {speed} km/h
                        </span>
                        <span className="bg-black text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Rolling
                        </span>
                      </div>
                    </div>

                    {/* Timeline stops if available */}
                    {stops && stops.length > 0 && (
                      <div className="pt-2 border-t border-black/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-body-muted">
                          <span>Route Sequence</span>
                          <span>ETA Window</span>
                        </div>
                        <div className="space-y-1">
                          {stops.slice(0, 3).map((stop, sIdx) => (
                            <div
                              key={`stop-row-${stop.id || sIdx}`}
                              className="flex items-center justify-between text-xs py-0.5 text-body"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-black flex-shrink-0"></span>
                                <span className="truncate text-ink font-medium">{stop.name}</span>
                              </div>
                              <span className="text-[11px] font-mono font-semibold text-ink flex-shrink-0 ml-2">
                                ~{sIdx * 4 + 3} min
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-canvas-softer rounded-2xl border border-dashed border-black/10">
                <div className="w-10 h-10 rounded-full bg-canvas-soft flex items-center justify-center text-body mb-2">
                  <Radio className="w-5 h-5 text-mute" />
                </div>
                <h4 className="text-xs font-bold text-ink">No Active Buses Broadcasting</h4>
                <p className="text-[11px] text-body-muted mt-1 leading-relaxed">
                  Vehicles on this corridor are currently off-shift or idling at terminus depot.
                </p>
              </div>
            )}

            {/* Inactive fleet counter if any */}
            {busList.length > activeBuses.length && (
              <div className="px-3 py-2 rounded-xl bg-canvas-softer border border-black/5 flex items-center justify-between text-[11px] text-body">
                <span>Depot Standby Units:</span>
                <span className="font-mono font-bold text-ink">
                  {busList.length - activeBuses.length} off-shift
                </span>
              </div>
            )}
          </div>

          {/* High-Density Cockpit Telemetry Footer */}
          <div className="px-4 py-2.5 bg-canvas-softer border-t border-black/5 flex items-center justify-between text-[11px] text-body select-none">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>
                GPS Telemetry: <strong className="text-ink font-semibold">3s Sync</strong>
              </span>
            </div>
            <div className="flex items-center gap-1 text-body font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Transit Network Live</span>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
