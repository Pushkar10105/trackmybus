// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, issuesApi, lostFoundApi, routesApi } from '../api/endpoints';
import Modal from '../components/Modal';
import {
  ShieldCheck,
  Bus,
  MapPin,
  AlertTriangle,
  Package,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Phone,
  Lock,
} from 'lucide-react';

export default function AdminPage() {
  const { user, isAuthenticated, role, login, logout } = useAuth();

  // Admin login form state
  const [phone, setPhone] = useState('9000000001'); // prefilled seeded admin
  const [password, setPassword] = useState('password123'); // prefilled seeded password
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Tab: 'routes' | 'buses' | 'issues' | 'lostfound'
  const [activeTab, setActiveTab] = useState('issues');

  // Data states
  const [routes, setRoutes] = useState([]);
  const [expandedRouteId, setExpandedRouteId] = useState(null);
  const [routeDetailsMap, setRouteDetailsMap] = useState({});
  const [issues, setIssues] = useState([]);
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Add Route Modal state
  const [addRouteModalOpen, setAddRouteModalOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteStart, setNewRouteStart] = useState('');
  const [newRouteEnd, setNewRouteEnd] = useState('');
  const [newRouteCity, setNewRouteCity] = useState('HYD');

  // Add Stop Modal state
  const [addStopModalOpen, setAddStopModalOpen] = useState(false);
  const [targetRouteId, setTargetRouteId] = useState('');
  const [newStopName, setNewStopName] = useState('');
  const [newStopLat, setNewStopLat] = useState('');
  const [newStopLng, setNewStopLng] = useState('');
  const [newStopSeq, setNewStopSeq] = useState('1');

  // Add Bus Modal state
  const [addBusModalOpen, setAddBusModalOpen] = useState(false);
  const [newBusRouteId, setNewBusRouteId] = useState('');
  const [newBusNumber, setNewBusNumber] = useState('');
  const [newBusDriverPhone, setNewBusDriverPhone] = useState('');

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const res = await login(phone.trim(), password);
    if (!res.success) {
      setLoginError(res.error || 'Authentication failed');
    } else if (res.user.role !== 'admin') {
      setLoginError('Access denied: Account role is not an Administrator.');
    }
    setLoginLoading(false);
  };

  // Fetch data based on active tab
  const refreshData = async () => {
    if (!isAuthenticated || role !== 'admin') return;
    setLoading(true);
    try {
      if (activeTab === 'routes' || activeTab === 'buses') {
        const rList = await routesApi.getAll();
        setRoutes(rList || []);
      }
      if (activeTab === 'issues') {
        const issueList = await issuesApi.getSummary();
        setIssues(issueList || []);
      }
      if (activeTab === 'lostfound') {
        const lfList = await lostFoundApi.getAll();
        setLostFoundItems(lfList || []);
      }
    } catch (err) {
      console.error('Data refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeTab, isAuthenticated, role]);

  // Load stops when expanding a route
  const toggleExpandRoute = async (routeId) => {
    if (expandedRouteId === routeId) {
      setExpandedRouteId(null);
      return;
    }
    setExpandedRouteId(routeId);
    if (!routeDetailsMap[routeId]) {
      try {
        const details = await routesApi.getById(routeId);
        setRouteDetailsMap((prev) => ({ ...prev, [routeId]: details }));
      } catch (err) {
        console.error('Failed to load stops:', err);
      }
    }
  };

  // Resolve issue group
  const handleResolveIssue = async (busId, category) => {
    try {
      await issuesApi.resolve(busId, category);
      setActionNotice({ type: 'success', text: `Resolved all open ${category} complaints for Bus ${busId}` });
      refreshData();
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      setActionNotice({ type: 'error', text: err.message || 'Failed to resolve issues' });
    }
  };

  // Update Lost & Found item status
  const handleUpdateLfStatus = async (id, newStatus) => {
    try {
      await lostFoundApi.updateStatus(id, newStatus);
      setActionNotice({ type: 'success', text: `Item #${id} status updated to ${newStatus}` });
      refreshData();
      setTimeout(() => setActionNotice(null), 2500);
    } catch (err) {
      setActionNotice({ type: 'error', text: err.message || 'Failed to update status' });
    }
  };

  // Add Route
  const handleCreateRoute = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createRoute({
        name: newRouteName,
        start_point: newRouteStart,
        end_point: newRouteEnd,
        city_code: newRouteCity,
      });
      setAddRouteModalOpen(false);
      setNewRouteName('');
      setNewRouteStart('');
      setNewRouteEnd('');
      refreshData();
    } catch (err) {
      alert(err.message || 'Error creating route');
    }
  };

  // Add Stop
  const handleCreateStop = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createStop({
        route_id: targetRouteId,
        name: newStopName,
        lat: newStopLat,
        lng: newStopLng,
        sequence_number: newStopSeq,
      });
      setAddStopModalOpen(false);
      setNewStopName('');
      setNewStopLat('');
      setNewStopLng('');
      // Reload route stops
      const updated = await routesApi.getById(targetRouteId);
      setRouteDetailsMap((prev) => ({ ...prev, [targetRouteId]: updated }));
    } catch (err) {
      alert(err.message || 'Error creating stop');
    }
  };

  // Add Bus
  const handleCreateBus = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createBus({
        route_id: newBusRouteId || null,
        bus_number: newBusNumber,
        driver_phone: newBusDriverPhone || null,
      });
      setAddBusModalOpen(false);
      setNewBusNumber('');
      setNewBusDriverPhone('');
      setActionNotice({ type: 'success', text: `Bus ${newBusNumber} successfully added to fleet!` });
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      alert(err.message || 'Error registering bus');
    }
  };

  // Delete Route
  const handleDeleteRoute = async (id) => {
    if (!window.confirm('Delete this route and all its stops?')) return;
    try {
      await adminApi.deleteRoute(id);
      refreshData();
    } catch (err) {
      alert(err.message || 'Error deleting route');
    }
  };

  // Delete Stop
  const handleDeleteStop = async (routeId, stopId) => {
    if (!window.confirm('Delete this stop?')) return;
    try {
      await adminApi.deleteStop(stopId);
      const updated = await routesApi.getById(routeId);
      setRouteDetailsMap((prev) => ({ ...prev, [routeId]: updated }));
    } catch (err) {
      alert(err.message || 'Error deleting stop');
    }
  };

  // 1. Admin Login Screen if not authenticated
  if (!isAuthenticated || role !== 'admin') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-900">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto text-white shadow-lg">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin Portal</h2>
            <p className="text-xs text-slate-500 font-medium">Municipal Transit Operations Management</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Admin Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9000000001"
                className="w-full text-base font-medium px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                className="w-full text-base font-medium px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 rounded-xl font-black text-base uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition active:scale-98 disabled:opacity-50"
            >
              {loginLoading ? 'Authenticating...' : 'Sign In as Admin'}
            </button>
          </form>

          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 text-center">
            Demo admin seeded in database: <br />
            <strong className="text-slate-800">9000000001</strong> / <strong className="text-slate-800">password123</strong>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-indigo-600">Operations Control</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
              Transit Fleet & Community Triage
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Admin: <strong className="text-slate-800">{user?.phone}</strong>
            </span>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 transition"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{actionNotice.text}</span>
          </div>
        )}

        {/* Dashboard Tabs */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2">
          {[
            { id: 'issues', label: 'Community Issues', icon: AlertTriangle },
            { id: 'routes', label: 'Routes & Stops', icon: MapPin },
            { id: 'buses', label: 'Fleet Assets', icon: Bus },
            { id: 'lostfound', label: 'Lost & Found', icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                  isSelected
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="bg-white rounded-b-2xl p-6 border border-t-0 border-slate-200 shadow-sm min-h-[450px]">
          {/* TAB 1: ISSUES TRIAGE */}
          {activeTab === 'issues' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Reported Bus Complaints</h3>
                  <p className="text-xs text-slate-500">
                    Calculated by trailing 7-day backlog count into High (6+), Medium (3-5), and Low (1-2) severities.
                  </p>
                </div>
                <button
                  onClick={refreshData}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Refresh Feed
                </button>
              </div>

              {issues.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                  No open passenger complaints! Fleet is running smoothly.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Severity</th>
                        <th className="py-3 px-4">Bus Number</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Report Count</th>
                        <th className="py-3 px-4">Last Flagged</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {issues.map((iss, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                iss.severity === 'high'
                                  ? 'bg-rose-100 text-rose-800'
                                  : iss.severity === 'medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {iss.severity}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 font-mono">{iss.bus_number}</td>
                          <td className="py-3 px-4 capitalize font-semibold">{iss.category}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{iss.flag_count} flags</td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(iss.last_flagged_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleResolveIssue(iss.bus_id, iss.category)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-300 font-bold transition text-[11px]"
                            >
                              Mark Resolved
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ROUTES & STOPS */}
          {activeTab === 'routes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Transit Route Network</h3>
                  <p className="text-xs text-slate-500">Manage corridors, terminal points, and ordered pickup stops.</p>
                </div>
                <button
                  onClick={() => setAddRouteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition"
                >
                  <Plus className="w-4 h-4" /> Add Route
                </button>
              </div>

              <div className="space-y-3">
                {routes.map((route) => {
                  const isExpanded = expandedRouteId === route.id;
                  const details = routeDetailsMap[route.id];

                  return (
                    <div
                      key={route.id}
                      className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm"
                    >
                      {/* Route Header Row */}
                      <div
                        onClick={() => toggleExpandRoute(route.id)}
                        className="flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer transition select-none"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                          <div>
                            <span className="font-bold text-sm text-slate-900">{route.name}</span>
                            <span className="ml-2 text-xs text-slate-500">
                              ({route.start_point} ➔ {route.end_point})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {route.city_code}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoute(route.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            title="Delete Route"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Stops Sequence */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Sequence of Stops
                            </h4>
                            <button
                              onClick={() => {
                                setTargetRouteId(String(route.id));
                                setNewStopSeq(String((details?.stops?.length || 0) + 1));
                                setAddStopModalOpen(true);
                              }}
                              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Stop
                            </button>
                          </div>

                          {!details ? (
                            <div className="text-xs text-slate-400 py-2">Loading stops...</div>
                          ) : details.stops?.length === 0 ? (
                            <div className="text-xs text-slate-400 italic py-2">
                              No stops defined for this route yet.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {details.stops.map((stop) => (
                                <div
                                  key={stop.id}
                                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px]">
                                      {stop.sequence_number}
                                    </span>
                                    <div>
                                      <p className="font-semibold text-slate-800">{stop.name}</p>
                                      <p className="text-[10px] text-slate-400">
                                        {Number(stop.lat).toFixed(4)}, {Number(stop.lng).toFixed(4)}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteStop(route.id, stop.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1"
                                    title="Delete Stop"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: FLEET & BUSES */}
          {activeTab === 'buses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Fleet Assets & Drivers</h3>
                  <p className="text-xs text-slate-500">Vehicle registry and designated driver operational assignments.</p>
                </div>
                <button
                  onClick={() => setAddBusModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition"
                >
                  <Plus className="w-4 h-4" /> Register Bus
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="font-bold text-slate-800">Standard Fleet Asset:</div>
                <p className="text-slate-600">
                  Primary demo vehicle <strong className="text-slate-900 font-mono">TS09-1234</strong> is assigned to Driver Ramesh Kumar (<strong className="text-slate-900">9000000002</strong>) on Route 10H.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: LOST & FOUND LEDGER */}
          {activeTab === 'lostfound' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Central Transit Property Ledger</h3>
                  <p className="text-xs text-slate-500">
                    Admin access reveals verified commuter phone numbers for property restitution.
                  </p>
                </div>
                <button
                  onClick={refreshData}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>

              {lostFoundItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">No items in the property depot.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Passenger Contact</th>
                        <th className="py-3 px-4">Approx Date</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {lostFoundItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.type === 'found' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs">{item.description}</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                            {item.contact_phone || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(item.approx_time).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={item.status}
                              onChange={(e) => handleUpdateLfStatus(item.id, e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold capitalize focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="open">Open</option>
                              <option value="matched">Matched</option>
                              <option value="closed">Closed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD ROUTE */}
      <Modal isOpen={addRouteModalOpen} onClose={() => setAddRouteModalOpen(false)} title="Add Transit Corridor">
        <form onSubmit={handleCreateRoute} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Route Name</label>
            <input
              type="text"
              placeholder="e.g. Route 22D - Old City Link"
              value={newRouteName}
              onChange={(e) => setNewRouteName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Point</label>
              <input
                type="text"
                placeholder="e.g. Charminar"
                value={newRouteStart}
                onChange={(e) => setNewRouteStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Point</label>
              <input
                type="text"
                placeholder="e.g. Falaknuma"
                value={newRouteEnd}
                onChange={(e) => setNewRouteEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">City Code</label>
            <input
              type="text"
              value={newRouteCity}
              onChange={(e) => setNewRouteCity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddRouteModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
            >
              Save Corridor
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD STOP */}
      <Modal isOpen={addStopModalOpen} onClose={() => setAddStopModalOpen(false)} title="Add Sequential Stop">
        <form onSubmit={handleCreateStop} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Stop Name</label>
            <input
              type="text"
              placeholder="e.g. Jubilee Hills Check Post"
              value={newStopName}
              onChange={(e) => setNewStopName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Latitude (Lat)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 17.4321"
                value={newStopLat}
                onChange={(e) => setNewStopLat(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Longitude (Lng)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 78.4112"
                value={newStopLng}
                onChange={(e) => setNewStopLng(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Sequence Order Number</label>
            <input
              type="number"
              min="1"
              value={newStopSeq}
              onChange={(e) => setNewStopSeq(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddStopModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
            >
              Save Stop
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: REGISTER BUS */}
      <Modal isOpen={addBusModalOpen} onClose={() => setAddBusModalOpen(false)} title="Register Fleet Bus">
        <form onSubmit={handleCreateBus} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Bus Number (License / Fleet ID)</label>
            <input
              type="text"
              placeholder="e.g. TS09-5678"
              value={newBusNumber}
              onChange={(e) => setNewBusNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assign to Route</label>
            <select
              value={newBusRouteId}
              onChange={(e) => setNewBusRouteId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Unassigned</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Driver Phone Number (Optional)</label>
            <input
              type="tel"
              placeholder="e.g. 9000000002"
              value={newBusDriverPhone}
              onChange={(e) => setNewBusDriverPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Must match a registered user with role 'driver' in the system.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddBusModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
            >
              Register Vehicle
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
