import { useState } from 'react';

const MyRoutes = ({ savedRoutes, onLoad, onDelete, onRename }) => {
  const [renamingId, setRenamingId]         = useState(null);
  const [renameValue, setRenameValue]       = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const startRename = (route) => {
    setRenamingId(route.id);
    setRenameValue(route.routeName);
  };

  const commitRename = () => {
    if (renameValue.trim() && renamingId) onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!savedRoutes.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="w-16 h-16 text-starlight-turquoise/25 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-paper-white font-bungee text-xl mb-2">NO SAVED ROUTES</p>
        <p className="text-chrome-silver font-special-elite text-sm max-w-xs">
          Plot a route on the map and tap "SAVE ROUTE" to keep it for later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {savedRoutes.map((route) => (
        <div
          key={route.id}
          className="bg-black/40 border border-starlight-turquoise/40 hover:border-starlight-turquoise rounded-lg p-4 transition-colors"
        >
          {/* Name + action icons */}
          <div className="flex items-start gap-2 mb-1.5 pr-1">
            {renamingId === route.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="flex-1 bg-black/60 border border-starlight-turquoise text-starlight-turquoise font-bungee text-sm px-2 py-0.5 rounded focus:outline-none"
                autoFocus
              />
            ) : (
              <h3 className="flex-1 text-starlight-turquoise font-bungee text-base leading-tight">
                {route.routeName}
              </h3>
            )}

            {/* Rename */}
            <button
              onClick={() => startRename(route)}
              className="text-chrome-silver/50 hover:text-starlight-turquoise transition-colors flex-shrink-0 mt-0.5"
              title="Rename"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            {/* Delete */}
            <button
              onClick={() => setConfirmDeleteId(route.id)}
              className="text-chrome-silver/50 hover:text-atomic-orange transition-colors flex-shrink-0 mt-0.5"
              title="Delete route"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Cities */}
          <p className="text-chrome-silver font-special-elite text-xs mb-2">
            {route.startCity} &rarr; {route.endCity}
          </p>

          {/* Stop counts */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-xs font-special-elite">
            {route.bookstoreCount > 0 && (
              <span className="text-atomic-orange">
                📚 {route.bookstoreCount} bookstore{route.bookstoreCount !== 1 ? 's' : ''}
              </span>
            )}
            {route.cafeCount > 0 && (
              <span className="text-starlight-turquoise">
                ☕ {route.cafeCount} café{route.cafeCount !== 1 ? 's' : ''}
              </span>
            )}
            {route.landmarkCount > 0 && (
              <span style={{ color: '#39FF14' }}>
                🌲 {route.landmarkCount} landmark{route.landmarkCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Notes */}
          {route.notes && (
            <p className="text-paper-white/60 font-special-elite text-xs mb-2 italic line-clamp-2">
              {route.notes}
            </p>
          )}

          {/* Date */}
          <p className="text-chrome-silver/40 font-special-elite text-xs mb-3">
            Saved {formatDate(route.createdAt)}
          </p>

          {/* Delete confirm or Load button */}
          {confirmDeleteId === route.id ? (
            <div className="flex gap-2">
              <button
                onClick={() => { onDelete(route.id); setConfirmDeleteId(null); }}
                className="flex-1 bg-atomic-orange text-midnight-navy font-bungee text-xs py-2 rounded-lg hover:opacity-80 transition-colors"
              >
                YES, DELETE
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-starlight-turquoise text-starlight-turquoise font-bungee text-xs py-2 rounded-lg hover:bg-starlight-turquoise hover:text-midnight-navy transition-colors"
              >
                KEEP IT
              </button>
            </div>
          ) : (
            <button
              onClick={() => onLoad(route)}
              className="w-full bg-starlight-turquoise/10 border border-starlight-turquoise text-starlight-turquoise font-bungee text-xs py-2 rounded-lg hover:bg-starlight-turquoise hover:text-midnight-navy transition-all"
            >
              LOAD ROUTE
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default MyRoutes;
