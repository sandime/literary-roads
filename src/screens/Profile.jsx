import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTrip } from '../utils/tripStorage';

const MARKER_LABELS = {
  landmark: '📖',
  bookstore: '📚',
  cafe: '☕',
};

export default function Profile({ onBack, selectedStates = [] }) {
  const { user, logout } = useAuth();
  const tripItems = getTrip();
  const [privacyOn, setPrivacyOn] = useState(
    () => localStorage.getItem('lr-privacy') === 'true'
  );

  const handlePrivacyToggle = () => {
    const next = !privacyOn;
    setPrivacyOn(next);
    localStorage.setItem('lr-privacy', String(next));
  };

  const handleSignOut = async () => {
    await logout();
    onBack();
  };

  const displayName = user?.displayName || 'Literary Traveler';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start px-4 py-8 overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #2D1B69 0%, #1A1B2E 60%, #0D0E1A 100%)' }}
    >
      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="font-special-elite text-chrome-silver hover:text-starlight-turquoise text-sm transition-colors"
        >
          ← Back
        </button>
        <h1
          className="font-bungee text-xl md:text-2xl"
          style={{
            color: '#40E0D0',
            textShadow: '0 0 15px rgba(64,224,208,0.7)',
          }}
        >
          TRAVELER'S LOG
        </h1>
        <div className="w-12" />
      </div>

      {/* Profile card */}
      <div
        className="w-full max-w-lg rounded-2xl p-[2px] mb-5"
        style={{
          background: 'linear-gradient(135deg, #40E0D0 0%, #FF4E00 100%)',
          boxShadow: '0 0 25px rgba(64,224,208,0.3)',
        }}
      >
        <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: '#1E1F33' }}>
          {/* Avatar */}
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-16 h-16 rounded-full flex-shrink-0"
              style={{ border: '3px solid #40E0D0', boxShadow: '0 0 12px rgba(64,224,208,0.6)' }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 font-bungee text-2xl"
              style={{
                background: '#1A1B2E',
                border: '3px solid #40E0D0',
                boxShadow: '0 0 12px rgba(64,224,208,0.6)',
                color: '#40E0D0',
              }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bungee text-paper-white text-base truncate">{displayName}</p>
            {/* Email visible only to the account owner — never stored publicly */}
            <p className="font-special-elite text-xs truncate mt-0.5" style={{ color: 'rgba(192,192,192,0.45)' }}>
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="w-full max-w-lg grid grid-cols-2 gap-3 mb-5">
        {[
          { icon: '📍', label: 'Stops Saved', value: tripItems.length },
          { icon: '🗺️', label: 'States Explored', value: selectedStates.length || '—' },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl p-4 flex flex-col items-center gap-1"
            style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}
          >
            <span className="text-2xl">{icon}</span>
            <span
              className="font-bungee text-2xl"
              style={{ color: '#FF4E00', textShadow: '0 0 10px rgba(255,78,0,0.5)' }}
            >
              {value}
            </span>
            <span className="font-special-elite text-chrome-silver text-xs text-center">{label}</span>
          </div>
        ))}
      </div>

      {/* Top Literary Stops */}
      <div
        className="w-full max-w-lg rounded-xl p-5 mb-5"
        style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}
      >
        <h2
          className="font-bungee text-sm mb-3"
          style={{ color: '#40E0D0', textShadow: '0 0 8px rgba(64,224,208,0.5)' }}
        >
          TOP LITERARY STOPS
        </h2>
        {tripItems.length === 0 ? (
          <p className="font-special-elite text-chrome-silver text-sm text-center py-4 italic">
            Start planning your route!
          </p>
        ) : (
          <ul className="space-y-2">
            {tripItems.slice(0, 5).map((item, i) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className="font-bungee text-atomic-orange text-xs w-4 flex-shrink-0">{i + 1}</span>
                <span className="text-sm flex-shrink-0">{MARKER_LABELS[item.type] || '📌'}</span>
                <span className="font-special-elite text-paper-white text-sm truncate">{item.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Privacy toggle */}
      <div
        className="w-full max-w-lg rounded-xl p-4 mb-5 flex items-center justify-between"
        style={{ background: '#1E1F33', border: '1px solid #2A2B45' }}
      >
        <div>
          <p className="font-bungee text-paper-white text-xs">PRIVATE PROFILE</p>
          <p className="font-special-elite text-chrome-silver text-xs mt-0.5">Hide your trips from others</p>
        </div>
        <button
          onClick={handlePrivacyToggle}
          className="w-11 h-6 rounded-full relative transition-all flex-shrink-0"
          style={{ background: privacyOn ? '#40E0D0' : '#3A3B55' }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
            style={{ left: privacyOn ? '22px' : '2px' }}
          />
        </button>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full max-w-lg font-bungee py-3 rounded-xl transition-all text-sm"
        style={{
          background: 'transparent',
          border: '2px solid #FF4E00',
          color: '#FF4E00',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#FF4E00';
          e.currentTarget.style.color = '#1A1B2E';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#FF4E00';
        }}
      >
        SIGN OUT
      </button>
    </div>
  );
}
