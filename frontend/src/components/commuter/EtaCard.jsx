// src/components/commuter/EtaCard.jsx
import React from 'react';
import { Clock, Navigation, AlertCircle, Bus } from 'lucide-react';

export default function EtaCard({ liveBuses = {}, selectedRoute }) {
  const busList = Object.values(liveBuses).filter((b) => b.status !== 'inactive');

  if (!selectedRoute) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
        <Bus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h4 className="font-semibold text-slate-800">Select a Transit Route</h4>
        <p className="text-xs text-slate-500 mt-1">
          Pick a corridor from the dropdown above to track live buses and view arrival times.
        </p>
      </div>
    );
  }

  if (busList.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-amber-200 bg-amber-50/40 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 text-sm">No Active Buses Currently Pinging</h4>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Buses on <span className="font-medium">{selectedRoute.name}</span> are either scheduled for a later shift or have completed their trips.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {busList.map((bus) => (
        <div
          key={bus.bus_id}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md hover:border-emerald-300 transition"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Bus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Bus {bus.bus_number}</h4>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-slate-400" />
                  Speed: {Number(bus.speed).toFixed(1)} km/h
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              On Route
            </span>
          </div>

          {/* Upcoming Stops List */}
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Next Stop ETAs
            </p>
            {bus.etas && bus.etas.length > 0 ? (
              <div className="space-y-2">
                {bus.etas.slice(0, 3).map((eta, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-800">{eta.stop_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-700">
                        {eta.eta_min === 0 ? '< 1' : eta.eta_min}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">min</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Approaching terminal or recalculating stops...</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
