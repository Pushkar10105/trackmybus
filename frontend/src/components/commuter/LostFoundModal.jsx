// src/components/commuter/LostFoundModal.jsx
import React, { useState, useEffect } from 'react';
import { lostFoundApi } from '../../api/endpoints';
import {
  Package,
  Search,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  PlusCircle,
  Tag,
  Phone,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function LostFoundModal({ isOpen, onClose, routes = [] }) {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'report'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Browse search & category filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Report Form state
  const [reportType, setReportType] = useState('lost');
  const [routeId, setRouteId] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [description, setDescription] = useState('');
  const [approxTime, setApproxTime] = useState(new Date().toISOString().slice(0, 16));
  const [contactPhone, setContactPhone] = useState('');
  const [errors, setErrors] = useState({});

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await lostFoundApi.getAll();
      setItems(data || []);
    } catch (err) {
      console.warn('Failed to load lost/found items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchItems();
      setStatusMsg(null);
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const errs = {};
    if (!description.trim()) errs.description = 'Item description is required.';
    if (!approxTime) errs.approxTime = 'Date and approximate time are required.';
    if (!contactPhone.trim() || contactPhone.trim().length < 6) {
      errs.contactPhone = 'A valid contact phone number is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitLoading(true);
    setStatusMsg(null);

    try {
      await lostFoundApi.submit({
        type: reportType,
        route_id: routeId ? Number(routeId) : null,
        bus_id: null,
        description: busNumber ? `[Bus: ${busNumber}] ${description}` : description,
        approx_time: new Date(approxTime).toISOString(),
        contact_phone: contactPhone,
      });

      setStatusMsg({
        type: 'success',
        text: 'Report logged! Registered in central transit inventory. Depot coordinator will reach out if matched.',
      });

      setDescription('');
      setBusNumber('');
      setContactPhone('');
      fetchItems();
    } catch (err) {
      console.error('Submission error:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to submit report. Please verify connection and retry.',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter items in browse tab
  const filteredItems = items.filter((item) => {
    const matchQuery =
      searchQuery === '' ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bus_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const descLower = item.description?.toLowerCase() || '';
    let matchCat = true;
    if (selectedCategory === 'wallets') {
      matchCat = descLower.includes('wallet') || descLower.includes('purse') || descLower.includes('card');
    } else if (selectedCategory === 'bottles') {
      matchCat = descLower.includes('bottle') || descLower.includes('umbrella') || descLower.includes('gear');
    } else if (selectedCategory === 'bags') {
      matchCat = descLower.includes('bag') || descLower.includes('backpack') || descLower.includes('laptop');
    }

    return matchQuery && matchCat;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l border-black/10 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-black/5 bg-white select-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold shadow-xs">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display leading-none text-ink">
                  Lost &amp; Found Registry
                </h3>
                <p className="text-[11px] text-body-muted mt-1">
                  Central Transit Lost Property Depot
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="icon-btn h-8 w-8 rounded-full bg-canvas-soft hover:bg-surface-pressed flex items-center justify-center text-ink transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex p-1 bg-canvas-soft rounded-full">
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all text-center ${
                activeTab === 'browse'
                  ? 'bg-white text-ink shadow-xs'
                  : 'text-body hover:text-ink'
              }`}
            >
              Found Items (Browse)
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all text-center ${
                activeTab === 'report'
                  ? 'bg-white text-ink shadow-xs'
                  : 'text-body hover:text-ink'
              }`}
            >
              Report an Item
            </button>
          </div>
        </div>

        {/* Tab Content: Browse */}
        {activeTab === 'browse' && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search found items or depot notes..."
                  className="w-full bg-canvas-soft text-xs text-ink pl-9 pr-4 py-2.5 rounded-full border-0 focus:ring-1 focus:ring-black placeholder:text-mute"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] select-none">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'wallets', label: 'Wallets' },
                  { id: 'bottles', label: 'Bottles & Gear' },
                  { id: 'bags', label: 'Bags' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                      selectedCategory === cat.id
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-canvas-soft hover:bg-surface-pressed text-body'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Cards List */}
              <div className="space-y-2.5 pt-1">
                {loading ? (
                  <div className="text-center py-10 text-xs text-body">
                    Loading registered items...
                  </div>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-canvas-soft/80 border border-black/5 hover:border-black/15 transition-all space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-bold text-xs text-ink leading-snug">
                          {item.description}
                        </h5>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                            item.status === 'matched'
                              ? 'bg-black text-white'
                              : item.status === 'closed'
                              ? 'bg-surface-pressed text-body'
                              : 'bg-neutral-200 text-neutral-800'
                          }`}
                        >
                          {item.status ? item.status.toUpperCase() : 'OPEN'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-mute pt-1 border-t border-black/5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.approx_time ? new Date(item.approx_time).toLocaleDateString() : 'Recent'}
                        </span>
                        <span className="font-medium text-body font-mono">
                          {item.type === 'found' ? 'Registered by Conductor' : 'Commuter Claim'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4 bg-canvas-softer rounded-2xl border border-black/5">
                    <div className="w-12 h-12 bg-canvas-soft rounded-full flex items-center justify-center text-mute mb-2.5">
                      <Package className="w-6 h-6" />
                    </div>
                    <h5 className="font-bold text-xs text-ink mb-1">No matching items found</h5>
                    <p className="text-[11px] text-body-muted leading-relaxed">
                      Items logged by crews or commuters on transit routes will appear here once verified.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy note */}
            <div className="mt-4 p-3 bg-canvas-softer rounded-xl border border-black/5 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-black flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-body leading-normal">
                <strong>Privacy Note:</strong> For passenger privacy, finder phone details are kept confidential by transit administration.
              </p>
            </div>
          </div>
        )}

        {/* Tab Content: Report */}
        {activeTab === 'report' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <form className="space-y-3.5" onSubmit={handleReportSubmit}>
              {/* Report Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Report Type
                </label>
                <div className="grid grid-cols-2 p-1 bg-canvas-soft rounded-full text-xs font-bold select-none">
                  <button
                    type="button"
                    onClick={() => setReportType('lost')}
                    className={`py-1.5 rounded-full transition-all text-center ${
                      reportType === 'lost'
                        ? 'bg-black text-white shadow-xs'
                        : 'text-body hover:text-ink'
                    }`}
                  >
                    Lost Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType('found')}
                    className={`py-1.5 rounded-full transition-all text-center ${
                      reportType === 'found'
                        ? 'bg-black text-white shadow-xs'
                        : 'text-body hover:text-ink'
                    }`}
                  >
                    Found Item
                  </button>
                </div>
              </div>

              {/* Route */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Bus Route <span className="text-mute font-normal">(Optional)</span>
                </label>
                <select
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="w-full bg-canvas-soft focus:bg-white text-xs text-ink font-medium px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:ring-0 transition-all cursor-pointer"
                >
                  <option value="">Select bus route</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.start_point} ➔ {r.end_point})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bus Number */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Bus Number / ID <span className="text-mute font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  placeholder="e.g. TS09-UB101"
                  className="w-full bg-canvas-soft focus:bg-white text-xs text-ink font-medium px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:ring-0 placeholder:text-mute transition-all"
                />
              </div>

              {/* Item Description */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Item Description <span className="text-neutral-900 font-bold">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="2"
                  placeholder="Detailed description, color, brand, markings..."
                  className="w-full bg-canvas-soft focus:bg-white text-xs text-ink font-medium p-3 rounded-xl border border-transparent focus:border-black focus:ring-0 placeholder:text-mute resize-none transition-all"
                ></textarea>
                {errors.description && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{errors.description}</p>
                )}
              </div>

              {/* Approx Date & Time */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Approximate Date &amp; Time <span className="text-neutral-900 font-bold">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={approxTime}
                  onChange={(e) => setApproxTime(e.target.value)}
                  className="w-full bg-canvas-soft focus:bg-white text-xs text-ink font-medium px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:ring-0 transition-all"
                />
                {errors.approxTime && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{errors.approxTime}</p>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Contact Phone <span className="text-neutral-900 font-bold">*</span>
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-canvas-soft focus:bg-white text-xs text-ink font-medium px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:ring-0 placeholder:text-mute transition-all"
                />
                {errors.contactPhone && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{errors.contactPhone}</p>
                )}
              </div>

              {/* Status Notice */}
              {statusMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                    statusMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                      : 'bg-red-50 border border-red-200 text-red-900'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full bg-black hover:bg-black-elevated text-white text-xs font-semibold py-3 rounded-full transition-all text-center shadow-md active:scale-95 disabled:opacity-50"
                >
                  {submitLoading ? 'Logging in Registry...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
