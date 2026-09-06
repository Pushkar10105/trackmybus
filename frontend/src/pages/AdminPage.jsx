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
  Search,
  Check,
  Download,
  AlertCircle,
  Settings,
  Eye,
  LogOut,
  Radio,
  Sliders,
  Layers
} from 'lucide-react';

export default function AdminPage() {
  const { user, isAuthenticated, role, login, logout } = useAuth();

  // Admin login form state
  const [phone, setPhone] = useState('9000000001'); // seeded admin
  const [password, setPassword] = useState('password123'); // seeded password
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Tab: 'routes' | 'buses' | 'issues' | 'lostfound'
  const [activeTab, setActiveTab] = useState('routes');

  // Clock
  const [clockTime, setClockTime] = useState('');

  // Data states
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [expandedRouteId, setExpandedRouteId] = useState(null);
  const [routeDetailsMap, setRouteDetailsMap] = useState({});
  const [issues, setIssues] = useState([]);
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Search & Filters
  const [routesSearch, setRoutesSearch] = useState('');
  const [issuesSort, setIssuesSort] = useState('severity'); // 'severity' | 'time'
  const [lfFilter, setLfFilter] = useState('All');
  const [lfSearch, setLfSearch] = useState('');

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

  // Add Lost & Found Item Drawer state
  const [logItemDrawerOpen, setLogItemDrawerOpen] = useState(false);
  const [logItemType, setLogItemType] = useState('found');
  const [logItemDesc, setLogItemDesc] = useState('');
  const [logItemPhone, setLogItemPhone] = useState('');
  const [logItemRouteId, setLogItemRouteId] = useState('');


  // Clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setClockTime(`${h}:${m}:${s} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data based on active tab
  const refreshData = async () => {
    if (!isAuthenticated || role !== 'admin') return;
    setLoading(true);
    try {
      if (activeTab === 'routes' || activeTab === 'buses') {
        const rList = await routesApi.getAll();
        setRoutes(rList || []);
      }
      if (activeTab === 'buses') {
        try {
          const busList = await adminApi.getBuses();
          setBuses(busList || []);
        } catch (bErr) {
          console.warn('Failed to load buses from adminApi:', bErr);
        }
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
  }, [isAuthenticated, role, activeTab]);

  // Load single route details when expanded
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
        console.error('Failed to load route stops:', err);
      }
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await login(phone.trim(), password);
      if (!res.success) {
        setLoginError(res.error || 'Authentication failed');
      } else if (res.user.role !== 'admin') {
        setLoginError('Access denied: Account role is not an Administrator.');
      }
    } catch (err) {
      setLoginError(err?.message || 'Login error');
    } finally {
      setLoginLoading(false);
    }
  };

  const showNotice = (msg, type = 'success') => {
    setActionNotice({ msg, type });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Route Handlers
  const handleCreateRoute = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createRoute({
        name: newRouteName.trim(),
        start_point: newRouteStart.trim(),
        end_point: newRouteEnd.trim(),
        city_code: newRouteCity.trim(),
      });
      showNotice(`Route "${newRouteName}" created successfully!`);
      setAddRouteModalOpen(false);
      setNewRouteName('');
      setNewRouteStart('');
      setNewRouteEnd('');
      refreshData();
    } catch (err) {
      showNotice(err.message || 'Failed to create route', 'error');
    }
  };

  const handleDeleteRoute = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete route "${name}"?`)) return;
    try {
      await adminApi.deleteRoute(id);
      showNotice(`Route "${name}" deleted.`);
      refreshData();
    } catch (err) {
      showNotice(err.message || 'Failed to delete route', 'error');
    }
  };

  // Stop Handlers
  const handleCreateStop = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createStop({
        route_id: targetRouteId,
        name: newStopName.trim(),
        lat: newStopLat,
        lng: newStopLng,
        sequence_number: newStopSeq,
      });
      showNotice(`Stop "${newStopName}" added!`);
      setAddStopModalOpen(false);
      setNewStopName('');
      setNewStopLat('');
      setNewStopLng('');
      // Reload route details
      const details = await routesApi.getById(targetRouteId);
      setRouteDetailsMap((prev) => ({ ...prev, [targetRouteId]: details }));
    } catch (err) {
      showNotice(err.message || 'Failed to add stop', 'error');
    }
  };

  const handleDeleteStop = async (stopId, routeId) => {
    if (!window.confirm('Delete this stop?')) return;
    try {
      await adminApi.deleteStop(stopId);
      showNotice('Stop removed from sequence.');
      const details = await routesApi.getById(routeId);
      setRouteDetailsMap((prev) => ({ ...prev, [routeId]: details }));
    } catch (err) {
      showNotice(err.message || 'Failed to delete stop', 'error');
    }
  };

  // Bus Handlers
  const handleCreateBus = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createBus({
        route_id: newBusRouteId || null,
        bus_number: newBusNumber.trim(),
        driver_phone: newBusDriverPhone.trim() || null,
      });
      showNotice(`Bus ${newBusNumber} added to active fleet!`);
      setAddBusModalOpen(false);
      setNewBusNumber('');
      setNewBusDriverPhone('');
      setNewBusRouteId('');
      refreshData();
    } catch (err) {
      showNotice(err.message || 'Failed to create bus', 'error');
    }
  };

  const handleDeleteBus = async (id, busNum) => {
    if (!window.confirm(`Decommission bus ${busNum}?`)) return;
    try {
      await adminApi.deleteBus(id);
      showNotice(`Bus ${busNum} removed from fleet.`);
      refreshData();
    } catch (err) {
      showNotice(err.message || 'Failed to delete bus', 'error');
    }
  };

  // Issue Handlers
  const handleResolveIssue = async (busId, category) => {
    try {
      await issuesApi.resolve(busId, category);
      showNotice(`Resolved issue on Bus ID ${busId}`);
      refreshData();
    } catch (err) {
      showNotice(err.message || 'Failed to resolve issue', 'error');
    }
  };

  // Lost & Found Status Update
  const handleUpdateLfStatus = async (id, newStatus) => {
    try {
      await lostFoundApi.updateStatus(id, newStatus);
      showNotice(`Item #${id} status changed to ${newStatus}`);
      refreshData();
    } catch (err) {
      showNotice(err.message || 'Failed to update item status', 'error');
    }
  };

  // Log Depot Item
  const handleLogDepotItem = async (e) => {
    e.preventDefault();
    try {
      await lostFoundApi.submit({
        type: logItemType,
        route_id: logItemRouteId ? Number(logItemRouteId) : null,
        description: logItemDesc,
        approx_time: new Date().toISOString(),
        contact_phone: logItemPhone || 'Custodian Logged',
      });
      showNotice('Item logged in depot inventory ledger.');
      setLogItemDrawerOpen(false);
      setLogItemDesc('');
      setLogItemPhone('');
      refreshData();
    } catch (err) {
      showNotice(err.message || 'Failed to log item', 'error');
    }
  };

  // CSV Ledger Download
  const downloadLedger = () => {
    const rows = [
      ['Tracking ID', 'Type', 'Description', 'Reported Time', 'Contact Phone', 'Status'],
      ...lostFoundItems.map((item) => [
        `#LF-${item.id}`,
        item.type?.toUpperCase() || 'FOUND',
        `"${(item.description || '').replace(/"/g, '""')}"`,
        item.approx_time || '',
        item.contact_phone || '',
        item.status || 'open',
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RTC_Lost_Found_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------------------------------------------------------------
  // STATE 1: Unauthenticated Admin Login
  // ---------------------------------------------------------------------------
  if (!isAuthenticated || role !== 'admin') {
    return (
      <div className="flex-1 bg-surface flex flex-col items-center justify-center p-4 py-12 select-none">
        <div className="w-full max-w-md bg-canvas rounded-2xl shadow-xl p-6 border border-black/10 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-ink">Transit Authority Desk</h1>
              <p className="text-xs text-body-muted">Operations Controller Terminal</p>
            </div>
          </div>

          {loginError && (
            <div className="p-3.5 bg-black text-white rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                Admin Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9000000001"
                required
                className="w-full bg-canvas-soft rounded-xl px-3.5 py-2.5 text-xs text-ink font-medium border border-transparent focus:border-black focus:bg-canvas focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                Security Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-canvas-soft rounded-xl px-3.5 py-2.5 text-xs text-ink font-medium border border-transparent focus:border-black focus:bg-canvas focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full mt-2 bg-primary text-white rounded-full py-3 px-4 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black-elevated active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              <span>{loginLoading ? 'Authenticating...' : 'Sign In to Operations Terminal'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-body-muted text-center pt-2">
            Restricted Access: Authorized Telangana RTC personnel and dispatchers only.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STATE 2: Authenticated Admin Operations Terminal
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 bg-surface flex flex-col md:flex-row min-h-[calc(100vh-64px)] select-none">
      {/* Left Operations Terminal Sidebar */}
      <aside className="w-full md:w-64 bg-surface-container-low border-r border-black/10 flex flex-col justify-between pt-6 pb-6 px-4 flex-shrink-0">
        <div className="flex flex-col gap-6">
          <div className="px-2 flex flex-col gap-1">
            <span className="font-display font-bold text-base tracking-tight text-ink uppercase">
              HYD-RTC
            </span>
            <span className="text-[10px] text-body-muted uppercase tracking-wider font-semibold">
              Operations Terminal
            </span>
          </div>

          <nav className="flex flex-col gap-1.5">
            {[
              { id: 'routes', label: 'Routes & Topology', icon: MapPin },
              { id: 'buses', label: 'Active Fleet', icon: Bus },
              { id: 'issues', label: 'Incident Triage', icon: AlertTriangle },
              { id: 'lostfound', label: 'Lost & Found', icon: Package },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2.5 rounded-full font-semibold text-xs gap-3 transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-body hover:bg-surface-container-high hover:text-ink'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Depot Status Card */}
        <div className="flex flex-col gap-3 pt-4">
          <div className="p-3.5 rounded-2xl bg-canvas border border-black/5 flex flex-col gap-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-body-muted uppercase tracking-wider font-bold">
                Depot Status
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <span className="font-bold text-xs text-ink">Depot Central</span>
            <span className="text-[10px] text-body-muted">Sector 04 • Hyderabad</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center justify-center px-4 py-2 rounded-full text-body hover:bg-surface-container-high hover:text-red-600 transition-all text-xs font-semibold gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Terminal Workspace */}
      <main className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
        {/* Terminal Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-xl text-ink">Transit Authority Desk</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-canvas-soft text-ink font-bold text-[10px]">
              v2.4
            </span>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-canvas-soft">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-ink font-bold tracking-wide">
                Depot Central • LIVE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-body-muted font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>{clockTime}</span>
            </div>
            <div className="h-4 w-px bg-surface-pressed"></div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs font-bold text-ink">Desk Controller</div>
                <div className="text-[10px] text-body-muted font-mono">{user?.phone}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Global Notice Toast */}
        {actionNotice && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in ${
              actionNotice.type === 'error'
                ? 'bg-red-50 text-red-900 border border-red-200'
                : 'bg-emerald-50 text-emerald-950 border border-emerald-200'
            }`}
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{actionNotice.msg}</span>
          </div>
        )}

        {/* Metric Sub-Header Banner */}
        <div className="w-full bg-canvas rounded-2xl p-5 shadow-xs border border-black/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-body-muted">
              <span>Metropolitan Grid Operations</span>
              <span className="w-1 h-1 rounded-full bg-black"></span>
              <span>South-Central Zone</span>
            </div>
            <h2 className="font-display font-bold text-lg text-ink">
              {activeTab === 'routes' && 'Route & Waypoint Topology'}
              {activeTab === 'buses' && 'Fleet Telemetry & Unit Tracking'}
              {activeTab === 'issues' && 'Incident & Triage Queue'}
              {activeTab === 'lostfound' && 'Depot Lost & Found Inventory Ledger'}
            </h2>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-canvas-soft px-4 py-2 rounded-2xl flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-body-muted">
                Active Routes
              </span>
              <span className="font-display font-bold text-sm text-ink">{routes.length || 14}</span>
            </div>
            <div className="bg-canvas-soft px-4 py-2 rounded-2xl flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-body-muted">
                Depot Code
              </span>
              <span className="font-display font-bold text-sm text-ink">HYD</span>
            </div>
            <div className="bg-primary text-white px-4 py-2 rounded-2xl flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mute">
                Corridor Sync
              </span>
              <span className="text-xs font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                REALTIME
              </span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: ROUTES & WAYPOINT TOPOLOGY */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'routes' && (
          <div className="space-y-4">
            {/* Filter & Action Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
                <input
                  type="text"
                  value={routesSearch}
                  onChange={(e) => setRoutesSearch(e.target.value)}
                  placeholder="Filter corridors, terminals, stops..."
                  className="w-full bg-canvas-soft text-xs text-ink pl-9 pr-4 py-2.5 rounded-full border-0 focus:ring-1 focus:ring-black placeholder:text-mute"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddRouteModalOpen(true)}
                  className="pill-btn bg-black text-white hover:bg-black-elevated px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Route</span>
                </button>
              </div>
            </div>

            {/* Routes Table */}
            <div className="bg-canvas rounded-2xl border border-black/10 shadow-xs overflow-hidden">
              <div className="grid grid-cols-12 px-6 py-3.5 bg-surface-container-low font-bold text-[10px] uppercase tracking-wider text-body-muted">
                <div className="col-span-3">Route Identifier</div>
                <div className="col-span-3">Start Terminal</div>
                <div className="col-span-3">Destination Terminal</div>
                <div className="col-span-1 text-center">City</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              <div className="divide-y divide-black/5">
                {routes
                  .filter((r) =>
                    routesSearch === '' ||
                    r.name?.toLowerCase().includes(routesSearch.toLowerCase()) ||
                    r.start_point?.toLowerCase().includes(routesSearch.toLowerCase()) ||
                    r.end_point?.toLowerCase().includes(routesSearch.toLowerCase())
                  )
                  .map((route) => {
                    const isExpanded = expandedRouteId === route.id;
                    const details = routeDetailsMap[route.id];
                    const stops = details?.stops || [];

                    return (
                      <div key={route.id} className="bg-canvas transition-colors">
                        <div
                          onClick={() => toggleExpandRoute(route.id)}
                          className="grid grid-cols-12 px-6 py-4 items-center hover:bg-canvas-soft/70 transition-all cursor-pointer"
                        >
                          <div className="col-span-3 flex items-center gap-3">
                            <button className="icon-btn w-6 h-6 rounded-full bg-black text-white flex items-center justify-center">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-ink">{route.name}</span>
                              <span className="text-[10px] text-body-muted">Arterial Corridor</span>
                            </div>
                          </div>

                          <div className="col-span-3 text-xs text-ink font-medium">
                            {route.start_point}
                          </div>

                          <div className="col-span-3 text-xs text-ink font-medium">
                            {route.end_point}
                          </div>

                          <div className="col-span-1 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-surface-pressed text-[10px] font-bold text-ink">
                              {route.city_code || 'HYD'}
                            </span>
                          </div>

                          <div className="col-span-2 flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTargetRouteId(String(route.id));
                                setAddStopModalOpen(true);
                              }}
                              className="icon-btn px-2.5 py-1 rounded-full bg-canvas-soft hover:bg-surface-pressed text-[11px] font-semibold text-ink"
                              title="Add Stop"
                            >
                              + Stop
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRoute(route.id, route.name);
                              }}
                              className="icon-btn p-1.5 rounded-full hover:bg-red-50 text-body hover:text-red-600 transition-colors"
                              title="Delete Route"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Embedded Stop Sequence Timeline */}
                        {isExpanded && (
                          <div className="px-8 py-5 bg-surface-container-low border-t border-black/5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-ink uppercase tracking-tight">
                                  Active Stop Sequence: {route.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-mono">
                                  {stops.length} Waypoints
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setTargetRouteId(String(route.id));
                                  setAddStopModalOpen(true);
                                }}
                                className="pill-btn px-3 py-1 rounded-full bg-black text-white text-[11px] font-semibold flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Waypoint Stop</span>
                              </button>
                            </div>

                            {stops.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {stops.map((stop, idx) => (
                                  <div
                                    key={stop.id || idx}
                                    className="flex items-center justify-between p-3 bg-canvas rounded-xl border border-black/5 shadow-xs"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="w-6 h-6 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
                                        {stop.sequence_number || idx + 1}
                                      </span>
                                      <div className="flex flex-col">
                                        <span className="font-bold text-xs text-ink">{stop.name}</span>
                                        <span className="text-[10px] text-body-muted font-mono">
                                          {Number(stop.lat).toFixed(4)}° N, {Number(stop.lng).toFixed(4)}° E
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteStop(stop.id, route.id)}
                                      className="icon-btn p-1 text-body-muted hover:text-red-600 rounded-full"
                                      title="Delete Stop"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 bg-canvas rounded-xl text-center text-xs text-body-muted border border-dashed border-black/10">
                                No stops configured for this corridor yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: ACTIVE FLEET */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'buses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Depot Fleet Inventory
              </span>
              <button
                onClick={() => setAddBusModalOpen(true)}
                className="pill-btn bg-black text-white hover:bg-black-elevated px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Register Bus Unit</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {buses.length > 0 ? (
                buses.map((bus) => (
                  <div
                    key={bus.id}
                    className="p-4 rounded-2xl bg-canvas border border-black/10 shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs">
                          <Bus className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-ink">{bus.bus_number}</h4>
                          <span className="text-[10px] text-body-muted font-mono">
                            Unit #{bus.id}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        bus.status === 'active' ? 'bg-black text-white' : 'bg-canvas-soft text-body'
                      }`}>
                        {bus.status ? bus.status.toUpperCase() : 'REGISTERED'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-body pt-2 border-t border-black/5">
                      <div className="flex justify-between">
                        <span>Assigned Route:</span>
                        <span className="font-bold text-ink">{bus.route_name || 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Driver Phone:</span>
                        <span className="font-mono text-ink">{bus.driver_phone || 'Unassigned'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteBus(bus.id, bus.bus_number)}
                      className="pill-btn w-full mt-1 py-1.5 rounded-full bg-canvas-soft hover:bg-red-50 text-body hover:text-red-600 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Decommission Unit</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-3 p-8 bg-canvas rounded-2xl text-center text-xs text-body-muted border border-black/10">
                  {loading ? 'Loading registered fleet units...' : 'No fleet buses registered yet. Click "Register Bus Unit" to add one.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: INCIDENT TRIAGE BOARD */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'issues' && (
          <div className="space-y-4">
            {/* Triage Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-canvas p-4 rounded-2xl border border-black/10 shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-body-muted">
                  High Risk Alerts
                </span>
                <span className="font-display font-bold text-2xl text-red-600 mt-2">
                  {issues.filter((i) => (i.report_count || 1) >= 3).length}
                </span>
                <span className="text-[10px] text-body-muted mt-1">Bus units flagged &gt;=3 times</span>
              </div>

              <div className="bg-canvas p-4 rounded-2xl border border-black/10 shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-body-muted">
                  Total Active Issues
                </span>
                <span className="font-display font-bold text-2xl text-ink mt-2">
                  {issues.length}
                </span>
                <span className="text-[10px] text-body-muted mt-1">Across all transit corridors</span>
              </div>

              <div className="bg-black text-white p-4 rounded-2xl shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-mute">
                  Depot Ops Triage
                </span>
                <span className="font-display font-bold text-lg text-white mt-2">
                  Sector 04 Central
                </span>
                <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Active Dispatch Protocol
                </span>
              </div>
            </div>

            {/* Issues List */}
            <div className="bg-canvas rounded-2xl border border-black/10 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-black/5">
                <span className="text-xs font-bold text-ink uppercase tracking-tight">
                  Commuter Incident Queue ({issues.length})
                </span>
                <span className="text-[10px] text-body-muted">
                  Real-time complaints submitted from commuter maps
                </span>
              </div>

              {issues.length > 0 ? (
                <div className="space-y-3">
                  {issues.map((issue, idx) => {
                    const isHigh = (issue.report_count || 1) >= 3;
                    return (
                      <div
                        key={`issue-${idx}`}
                        className="p-4 rounded-2xl bg-canvas-soft/80 border border-black/5 hover:border-black/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0 text-ink">
                            <AlertCircle className="w-5 h-5 text-black" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-xs text-ink font-mono">
                                {issue.bus_number}
                              </span>
                              <span className="text-body-muted">•</span>
                              <span className="font-semibold text-xs text-ink">{issue.category}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isHigh ? 'bg-red-600 text-white' : 'bg-neutral-200 text-neutral-800'
                                }`}
                              >
                                {issue.report_count || 1} Flags
                              </span>
                            </div>
                            <div className="text-[11px] text-body-muted mt-1 leading-relaxed">
                              {issue.latest_description || 'No detailed note provided.'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
                          <button
                            onClick={() => handleResolveIssue(issue.bus_id, issue.category)}
                            className="pill-btn px-4 py-1.5 rounded-full bg-black text-white hover:bg-black-elevated text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-body-muted">
                  No open issues currently reported. Fleet operating cleanly!
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: LOST & FOUND INVENTORY LEDGER */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'lostfound' && (
          <div className="space-y-4">
            {/* Filter and CSV Export Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
                <input
                  type="text"
                  value={lfSearch}
                  onChange={(e) => setLfSearch(e.target.value)}
                  placeholder="Search item, contact, description..."
                  className="w-full bg-canvas-soft text-xs text-ink pl-9 pr-4 py-2.5 rounded-full border-0 focus:ring-1 focus:ring-black placeholder:text-mute"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center p-1 bg-canvas-soft rounded-full text-xs font-semibold">
                  {['All', 'Open', 'Matched', 'Closed'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setLfFilter(f)}
                      className={`px-3 py-1 rounded-full transition-all ${
                        lfFilter === f ? 'bg-black text-white shadow-xs' : 'text-body hover:text-ink'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <button
                  onClick={downloadLedger}
                  className="icon-btn h-9 w-9 bg-canvas-soft hover:bg-surface-pressed text-ink rounded-full flex items-center justify-center"
                  title="Export CSV"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setLogItemDrawerOpen(true)}
                  className="pill-btn bg-black text-white hover:bg-black-elevated px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Depot Item</span>
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-canvas rounded-2xl border border-black/10 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low text-body-muted text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-6">Tracking ID</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-6 min-w-[240px]">Description</th>
                      <th className="py-3.5 px-4">Reported</th>
                      <th className="py-3.5 px-6">Contact Number</th>
                      <th className="py-3.5 px-6 text-right">Custodian State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 text-xs text-ink font-medium">
                    {lostFoundItems
                      .filter((item) => {
                        const matchSearch =
                          lfSearch === '' ||
                          item.description?.toLowerCase().includes(lfSearch.toLowerCase()) ||
                          item.contact_phone?.includes(lfSearch);
                        const matchFilter =
                          lfFilter === 'All' ||
                          (item.status || 'open').toLowerCase() === lfFilter.toLowerCase();
                        return matchSearch && matchFilter;
                      })
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-canvas-soft/70 transition-colors">
                          <td className="py-3.5 px-6 font-bold font-mono">#LF-{item.id}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.type === 'found' ? 'bg-canvas-soft text-ink' : 'bg-black text-white'
                              }`}
                            >
                              {(item.type || 'FOUND').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="font-bold text-ink">{item.description}</div>
                            {item.bus_number && (
                              <div className="text-[10px] text-body-muted">Bus: {item.bus_number}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-body-muted whitespace-nowrap">
                            {item.approx_time ? new Date(item.approx_time).toLocaleDateString() : 'Recent'}
                          </td>
                          <td className="py-3.5 px-6 font-mono text-xs whitespace-nowrap">
                            {item.contact_phone ? (
                              <a
                                href={`tel:${item.contact_phone}`}
                                className="hover:underline flex items-center gap-1 text-ink"
                              >
                                <Phone className="w-3 h-3 text-body-muted" />
                                <span>{item.contact_phone}</span>
                              </a>
                            ) : (
                              <span className="text-body-muted font-normal">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            <select
                              value={item.status || 'open'}
                              onChange={(e) => handleUpdateLfStatus(item.id, e.target.value)}
                              className="px-2.5 py-1 rounded-full bg-canvas-soft text-ink font-bold text-[10px] border border-black/10 focus:outline-none cursor-pointer"
                            >
                              <option value="open">● Open</option>
                              <option value="matched">◐ Matched</option>
                              <option value="closed">✕ Closed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------------- */}

      {/* Add Route Modal */}
      {addRouteModalOpen && (
        <Modal isOpen={true} onClose={() => setAddRouteModalOpen(false)} title="Create Transit Route">
          <form onSubmit={handleCreateRoute} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Route Identifier</label>
              <input
                type="text"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                placeholder="e.g. Route 127K"
                required
                className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Origin Terminal</label>
              <input
                type="text"
                value={newRouteStart}
                onChange={(e) => setNewRouteStart(e.target.value)}
                placeholder="e.g. Koti Bus Station"
                required
                className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Destination Terminal</label>
              <input
                type="text"
                value={newRouteEnd}
                onChange={(e) => setNewRouteEnd(e.target.value)}
                placeholder="e.g. Kondapur Bus Depot"
                required
                className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddRouteModalOpen(false)}
                className="pill-btn px-4 py-2 text-xs font-semibold rounded-full border border-black/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pill-btn px-5 py-2 text-xs font-bold rounded-full bg-black text-white hover:bg-black-elevated shadow-xs"
              >
                Create Corridor
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Stop Modal */}
      {addStopModalOpen && (
        <Modal isOpen={true} onClose={() => setAddStopModalOpen(false)} title="Add Waypoint Stop">
          <form onSubmit={handleCreateStop} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Stop Name</label>
              <input
                type="text"
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
                placeholder="e.g. Punjagutta Metro Gate 3"
                required
                className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={newStopLat}
                  onChange={(e) => setNewStopLat(e.target.value)}
                  placeholder="17.4260"
                  required
                  className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={newStopLng}
                  onChange={(e) => setNewStopLng(e.target.value)}
                  placeholder="78.4480"
                  required
                  className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Sequence Order Number</label>
              <input
                type="number"
                value={newStopSeq}
                onChange={(e) => setNewStopSeq(e.target.value)}
                min="1"
                required
                className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddStopModalOpen(false)}
                className="pill-btn px-4 py-2 text-xs font-semibold rounded-full border border-black/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pill-btn px-5 py-2 text-xs font-bold rounded-full bg-black text-white hover:bg-black-elevated shadow-xs"
              >
                Add Stop
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Bus Modal */}
      {addBusModalOpen && (
        <Modal isOpen={true} onClose={() => setAddBusModalOpen(false)} title="Register Bus Unit">
          <form onSubmit={handleCreateBus} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Bus Number Plate</label>
              <input
                type="text"
                value={newBusNumber}
                onChange={(e) => setNewBusNumber(e.target.value)}
                placeholder="e.g. TS09-UB101"
                required
                className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Assigned Route</label>
              <select
                value={newBusRouteId}
                onChange={(e) => setNewBusRouteId(e.target.value)}
                className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none"
              >
                <option value="">Select Route</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Driver Mobile Phone <span className="text-mute font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                value={newBusDriverPhone}
                onChange={(e) => setNewBusDriverPhone(e.target.value)}
                placeholder="9000000002"
                className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddBusModalOpen(false)}
                className="pill-btn px-4 py-2 text-xs font-semibold rounded-full border border-black/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pill-btn px-5 py-2 text-xs font-bold rounded-full bg-black text-white hover:bg-black-elevated shadow-xs"
              >
                Register Unit
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Log Depot Item Modal */}
      {logItemDrawerOpen && (
        <Modal isOpen={true} onClose={() => setLogItemDrawerOpen(false)} title="Log Depot Item">
          <form onSubmit={handleLogDepotItem} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Classification</label>
              <div className="grid grid-cols-2 p-1 bg-canvas-soft rounded-full text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLogItemType('found')}
                  className={`py-1.5 rounded-full transition-all ${
                    logItemType === 'found' ? 'bg-black text-white shadow-xs' : 'text-body'
                  }`}
                >
                  Found in Transit
                </button>
                <button
                  type="button"
                  onClick={() => setLogItemType('lost')}
                  className={`py-1.5 rounded-full transition-all ${
                    logItemType === 'lost' ? 'bg-black text-white shadow-xs' : 'text-body'
                  }`}
                >
                  Passenger Claim
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Description</label>
              <textarea
                value={logItemDesc}
                onChange={(e) => setLogItemDesc(e.target.value)}
                placeholder="Item details, where found/lost, distinguishing marks..."
                required
                rows="3"
                className="w-full bg-canvas-soft text-xs text-ink p-3 rounded-xl border border-transparent focus:border-black focus:outline-none resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Contact Phone / Custodian ID
              </label>
              <input
                type="tel"
                value={logItemPhone}
                onChange={(e) => setLogItemPhone(e.target.value)}
                placeholder="+91 98491 55201"
                className="w-full bg-canvas-soft text-xs text-ink px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLogItemDrawerOpen(false)}
                className="pill-btn px-4 py-2 text-xs font-semibold rounded-full border border-black/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pill-btn px-5 py-2 text-xs font-bold rounded-full bg-black text-white hover:bg-black-elevated shadow-xs"
              >
                Add to Ledger
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
