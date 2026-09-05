// src/components/commuter/LostFoundModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { lostFoundApi } from '../../api/endpoints';
import { PackageSearch, PlusCircle, CheckCircle, Clock } from 'lucide-react';

export default function LostFoundModal({ isOpen, onClose, routes = [] }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'report'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Form states
  const [type, setType] = useState('lost');
  const [routeId, setRouteId] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [description, setDescription] = useState('');
  const [approxTime, setApproxTime] = useState(new Date().toISOString().slice(0, 16));
  const [contactPhone, setContactPhone] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await lostFoundApi.getAll();
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load lost/found items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchItems();
      setStatusMsg(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setStatusMsg(null);

    try {
      await lostFoundApi.submit({
        type,
        route_id: routeId || null,
        description: busNumber ? `[Bus: ${busNumber}] ${description}` : description,
        approx_time: new Date(approxTime).toISOString(),
        contact_phone: contactPhone,
      });

      setStatusMsg({
        type: 'success',
        text: 'Record submitted successfully! Transit authorities will cross-reference reports.',
      });
      setDescription('');
      setBusNumber('');
      setContactPhone('');
      fetchItems();
      setTimeout(() => {
        setActiveTab('list');
        setStatusMsg(null);
      }, 1500);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to submit report. Please check the fields.',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transit Lost & Found Ledger" maxWidth="max-w-xl">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-4">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'list'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PackageSearch className="w-4 h-4" />
          Recently Found Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'report'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Report Lost / Found Item
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : null}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Tab 1: Found Items List */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading catalog...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <PackageSearch className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No items currently reported in the depot.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-200 bg-white transition space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Found Property
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.approx_time).toLocaleDateString()} {new Date(item.approx_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-800 font-medium pt-1">{item.description}</p>
                <div className="pt-1 text-[11px] text-slate-500">
                  Status: <span className="font-semibold text-slate-700 capitalize">{item.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Report Form */}
      {activeTab === 'report' && (
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Report Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              >
                <option value="lost">Lost (I lost something)</option>
                <option value="found">Found (I found something on a bus)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Route (if known)</label>
              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              >
                <option value="">Unknown / Any Route</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bus Number (optional)</label>
              <input
                type="text"
                placeholder="e.g. TS09-1234"
                value={busNumber}
                onChange={(e) => setBusNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Approximate Date & Time</label>
              <input
                type="datetime-local"
                value={approxTime}
                onChange={(e) => setApproxTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Your Contact Phone</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              required
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Only transit desk admins can view this number for retrieval verification.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Item Description</label>
            <textarea
              rows="3"
              placeholder="Detailed description (e.g. Blue backpack containing spiral notebook and water bottle)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow disabled:opacity-50"
            >
              {submitLoading ? 'Saving...' : 'Submit Entry'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
