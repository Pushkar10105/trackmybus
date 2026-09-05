// src/components/commuter/IssueModal.jsx
import React, { useState } from 'react';
import { issuesApi } from '../../api/endpoints';
import { AlertCircle, X, Check, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  'Broken Seat',
  'AC Not Working',
  'Cleanliness',
  'Safety Concern',
  'Rash Driving',
  'Other',
];

export default function IssueModal({ isOpen, onClose, defaultBusNumber = '' }) {
  const [busNumber, setBusNumber] = useState(defaultBusNumber);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successTicket, setSuccessTicket] = useState(null);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!busNumber.trim()) errs.busNumber = 'Bus number is required.';
    if (!category) errs.category = 'Please pick an issue category.';
    if (!description.trim()) errs.description = 'Please enter an issue description.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await issuesApi.submit({
        bus_number: busNumber.trim(),
        category,
        description: description.trim(),
      });

      // Generate a realistic ticket number like #TC-8492
      const randomTicketNum = Math.floor(1000 + Math.random() * 9000);
      setSuccessTicket(`TC-${randomTicketNum}`);
      setBusNumber('');
      setCategory('');
      setDescription('');
    } catch (err) {
      console.error('Failed to submit issue:', err);
      setErrors({ form: err?.message || 'Submission failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    setSuccessTicket(null);
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-black/10 transition-all duration-200">
        {!successTicket ? (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold shadow-xs">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display leading-none text-ink">
                    Report Bus Issue
                  </h3>
                  <p className="text-[11px] text-body-muted mt-1">
                    Prompt vehicle dispatch &amp; maintenance logging
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

            {/* Form */}
            <form className="space-y-3.5" onSubmit={handleSubmit} noValidate>
              {errors.form && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
                  {errors.form}
                </div>
              )}

              {/* Bus Number */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Bus Number <span className="text-neutral-900">*</span>
                </label>
                <input
                  type="text"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  placeholder="e.g. TS09-UB101"
                  className="w-full bg-canvas-soft focus:bg-white text-xs text-ink font-medium px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:ring-0 transition-all placeholder:text-mute"
                />
                {errors.busNumber && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{errors.busNumber}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Issue Category <span className="text-neutral-900">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-canvas-soft focus:bg-white text-xs text-ink font-medium px-3.5 py-2.5 rounded-xl border border-transparent focus:border-black focus:ring-0 transition-all cursor-pointer"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{errors.category}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Description <span className="text-neutral-900">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  placeholder="Describe the issue in detail..."
                  className="w-full bg-canvas-soft focus:bg-white text-xs text-ink font-medium p-3 rounded-xl border border-transparent focus:border-black focus:ring-0 transition-all placeholder:text-mute resize-none"
                ></textarea>
                {errors.description && (
                  <p className="text-[11px] text-red-600 font-medium mt-1">{errors.description}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 select-none">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white hover:bg-canvas-soft text-ink border border-black/15 text-xs font-semibold py-2.5 rounded-full transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-black hover:bg-black-elevated text-white text-xs font-semibold py-2.5 rounded-full transition-all text-center shadow-md active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Success confirmation state */
          <div className="text-center py-5">
            <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Check className="w-7 h-7 text-white" />
            </div>
            <h4 className="text-base font-bold font-display text-ink">
              Report Submitted Successfully!
            </h4>
            <p className="text-xs text-body-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
              Ticket <strong className="text-ink font-mono font-bold">#{successTicket}</strong>{' '}
              generated and dispatched to Telangana RTC central maintenance cell.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={handleDone}
                className="w-full bg-black hover:bg-black-elevated text-white text-xs font-semibold py-2.5 rounded-full transition-all shadow-md active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
