import { useState } from 'react';

const SaveRouteModal = ({ startCity, endCity, onSave, onClose, saving, error }) => {
  const defaultName = startCity && endCity ? `${startCity} to ${endCity}` : '';
  const [routeName, setRouteName] = useState(defaultName);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!routeName.trim()) return;
    onSave(routeName.trim(), notes.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-route-title"
      className="fixed inset-0 z-[1004] flex items-center justify-center p-4"
      style={{ background: 'rgba(13,14,26,0.92)' }}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-midnight-navy border-2 border-starlight-turquoise rounded-2xl shadow-2xl w-full max-w-sm p-6 relative overflow-hidden">
        {/* Neon top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-80" />

        <h2 id="save-route-title" className="text-starlight-turquoise font-bungee text-xl mb-0.5 drop-shadow-[0_0_10px_rgba(64,224,208,0.8)]">
          SAVE ROUTE
        </h2>
        <p className="text-chrome-silver font-special-elite text-xs mb-5">
          {startCity} &rarr; {endCity}
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-paper-white font-special-elite text-sm block mb-1">Route Name</label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Summer Reading Tour"
              className="w-full bg-black/50 border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange"
              style={{ fontSize: '0.9rem' }}
              autoFocus
            />
          </div>

          <div>
            <label className="text-paper-white font-special-elite text-sm block mb-1">
              Notes <span className="text-chrome-silver text-xs">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Notes about this trip..."
              className="w-full bg-black/50 border-2 border-starlight-turquoise text-paper-white font-special-elite px-3 py-2 rounded focus:outline-none focus:border-atomic-orange resize-none"
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {error && (
            <div className="bg-atomic-orange/20 border border-atomic-orange px-3 py-2 rounded">
              <p className="text-atomic-orange font-special-elite text-xs">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!routeName.trim() || saving}
              className="flex-1 bg-atomic-orange text-midnight-navy font-bungee py-2.5 rounded-lg hover:bg-starlight-turquoise transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
            <button
              onClick={onClose}
              className="px-4 bg-transparent text-starlight-turquoise border-2 border-starlight-turquoise font-special-elite py-2 rounded-lg hover:bg-starlight-turquoise hover:text-midnight-navy transition-all"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveRouteModal;
