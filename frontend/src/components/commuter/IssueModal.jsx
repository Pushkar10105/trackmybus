// src/components/commuter/IssueModal.jsx
import React, { useState } from 'react';
import Modal from '../Modal';
import { issuesApi } from '../../api/endpoints';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { value: 'cleanliness', label: '🧹 Cleanliness / Hygiene' },
  { value: 'seat', label: '💺 Broken Seat / Furniture' },
  { value: 'ac', label: '❄️ AC / Ventilation' },
  { value: 'safety', label: '🛡️ Safety Concern' },
  { value: 'driving', label: '⚠️ Rash / Unsafe Driving' },
  { value: 'other', label: '📝 Other Issue' },
];

export default function IssueModal({ isOpen, onClose, defaultBusNumber = '' }) {
  const [busNumber, setBusNumber] = useState(defaultBusNumber);
  const [category, setCategory] = useState('cleanliness');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Update busNumber if prop changes
  React.useEffect(() => {
    if (defaultBusNumber) setBusNumber(defaultBusNumber);
  }, [defaultBusNumber]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const bus = busNumber.trim();
    if (!bus) {
      setStatusMessage({ type: 'error', text: 'Please enter a bus registration number.' });
      return;
    }
    if (!description.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide a short description of the issue.' });
      return;
    }

    // Rate limiting: 1 flag per bus+category per session
    const spamKey = `flagged_${bus.toLowerCase()}_${category}`;
    if (sessionStorage.getItem(spamKey)) {
      setStatusMessage({
        type: 'warning',
        text: `You have already reported a "${category}" issue for bus ${bus} in this session.`,
      });
      return;
    }

    setLoading(true);
    try {
      await issuesApi.submit({
        bus_number: bus,
        category,
        description: description.trim(),
      });

      sessionStorage.setItem(spamKey, 'true');
      setStatusMessage({
        type: 'success',
        text: 'Thank you! Your report has been submitted to the transit operations team.',
      });
      setDescription('');
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 2000);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to submit report. Please check the bus number.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report an On-Board Issue">
      <form onSubmit={handleSubmit} className="space-y-4">
        {statusMessage && (
          <div
            className={`p-3 rounded-xl flex items-start gap-2 text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {statusMessage.type === 'warning' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Bus Registration Number
          </label>
          <input
            type="text"
            placeholder="e.g. TS09-1234"
            value={busNumber}
            onChange={(e) => setBusNumber(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
          <textarea
            rows="3"
            placeholder="Describe the issue (e.g. Broken handrail on middle door, AC not cooling)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
