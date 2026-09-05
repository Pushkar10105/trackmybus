// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bus, Navigation, ShieldCheck, LogOut, Menu, X, Radio, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/commuter')) return true;
    return location.pathname === path;
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-black/10 sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Emblem & Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105 active:scale-95">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg text-ink tracking-tight">
                  TrackMyBus
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black text-white shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-body-muted hidden sm:block">Hyderabad RTC Telemetry</p>
            </div>
          </Link>

          {/* Desktop Nav Pills */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-canvas-soft p-1 rounded-full border border-black/5">
            <Link
              to="/"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-150 active:scale-95 ${
                isActive('/')
                  ? 'bg-black text-white shadow-sm'
                  : 'text-body hover:text-ink hover:bg-surface-pressed/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Live Map
            </Link>

            <Link
              to="/driver"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-150 active:scale-95 ${
                isActive('/driver')
                  ? 'bg-black text-white shadow-sm'
                  : 'text-body hover:text-ink hover:bg-surface-pressed/60'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              Driver Cockpit
            </Link>

            <Link
              to="/admin"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-150 active:scale-95 ${
                isActive('/admin')
                  ? 'bg-black text-white shadow-sm'
                  : 'text-body hover:text-ink hover:bg-surface-pressed/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Fleet
            </Link>
          </nav>

          {/* User Auth State / Staff Action */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-black px-2.5 py-0.5 rounded-full inline-block">
                    {user?.role}
                  </span>
                  <span className="text-[11px] text-body font-mono mt-0.5">{user?.phone}</span>
                </div>
                <button
                  onClick={logout}
                  className="icon-btn h-9 w-9 bg-canvas-soft hover:bg-black hover:text-white rounded-full flex items-center justify-center text-ink transition-colors shadow-xs"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/driver"
                className="pill-btn text-xs font-semibold px-4 py-2 rounded-full border border-black/15 bg-white hover:bg-black hover:text-white text-ink transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>Terminal Login</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="icon-btn p-2 text-ink hover:bg-canvas-soft rounded-full transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-black/10 bg-white/98 backdrop-blur-xl px-4 pt-3 pb-5 space-y-2 animate-in fade-in slide-in-from-top duration-200">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              isActive('/') ? 'bg-black text-white shadow-sm' : 'text-ink hover:bg-canvas-soft'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4" />
              <span>Live Map (Commuter)</span>
            </div>
            {isActive('/') && <span className="w-2 h-2 rounded-full bg-white"></span>}
          </Link>
          <Link
            to="/driver"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              isActive('/driver') ? 'bg-black text-white shadow-sm' : 'text-ink hover:bg-canvas-soft'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4" />
              <span>Driver Cockpit</span>
            </div>
            {isActive('/driver') && <span className="w-2 h-2 rounded-full bg-white"></span>}
          </Link>
          <Link
            to="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              isActive('/admin') ? 'bg-black text-white shadow-sm' : 'text-ink hover:bg-canvas-soft'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Fleet Desk</span>
            </div>
            {isActive('/admin') && <span className="w-2 h-2 rounded-full bg-white"></span>}
          </Link>

          {isAuthenticated ? (
            <div className="pt-3 border-t border-black/5 flex items-center justify-between px-2">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold text-body-muted">Active Session</span>
                <span className="text-xs font-semibold text-ink">{user?.phone} ({user?.role})</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="pill-btn text-xs font-bold px-4 py-2 rounded-full bg-black text-white hover:bg-black-elevated"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                to="/driver"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center block text-xs font-semibold py-2.5 rounded-full bg-black text-white"
              >
                Sign In to Terminal
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
