import { useState } from 'react';
import MyRoutes from '../components/MyRoutes';

const RoadTrip = ({ items, onRemove, onClearAll, onClose, onSelectStop, savedRoutes = [], onLoadRoute, onDeleteRoute, onRenameRoute, onShareRoute }) => {
  const [activeTab, setActiveTab] = useState('stops');

  return (
    <div className="absolute inset-0 z-[1002] bg-midnight-navy flex flex-col animate-slide-up">

      {/* ── Header ── */}
      <div className="border-b-2 border-starlight-turquoise bg-midnight-navy p-4 flex items-center justify-between flex-shrink-0">
        {/* Close */}
        <button
          onClick={onClose}
          className="text-starlight-turquoise hover:text-atomic-orange transition-colors p-1"
          title="Back to map"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-starlight-turquoise font-bungee text-xl drop-shadow-[0_0_10px_rgba(64,224,208,0.8)]">
            MY ROAD TRIP
          </h1>
          <p className="text-atomic-orange font-special-elite text-xs mt-0.5">
            {activeTab === 'stops'
              ? `${items.length} stop${items.length !== 1 ? 's' : ''} planned`
              : `${savedRoutes.length} saved route${savedRoutes.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Clear all / spacer */}
        {activeTab === 'stops' && items.length > 0 ? (
          <button
            onClick={onClearAll}
            className="text-chrome-silver hover:text-atomic-orange font-special-elite text-xs border border-chrome-silver/50 hover:border-atomic-orange px-2 py-1 rounded transition-colors"
          >
            CLEAR ALL
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Neon accent */}
      <div className="h-0.5 bg-gradient-to-r from-atomic-orange via-starlight-turquoise to-atomic-orange opacity-70 flex-shrink-0" />

      {/* ── Tabs ── */}
      <div className="flex border-b border-white/10 flex-shrink-0 bg-midnight-navy">
        <button
          onClick={() => setActiveTab('stops')}
          className="flex-1 font-bungee py-2.5 transition-all relative"
          style={{
            fontSize: '11px',
            color: activeTab === 'stops' ? '#40E0D0' : 'rgba(192,192,192,0.5)',
            background: activeTab === 'stops' ? 'rgba(64,224,208,0.06)' : 'transparent',
            borderBottom: activeTab === 'stops' ? '2px solid #40E0D0' : '2px solid transparent',
          }}
        >
          MY STOPS
          {items.length > 0 && (
            <span className="ml-1.5 bg-atomic-orange text-midnight-navy font-bungee text-[9px] w-4 h-4 rounded-full inline-flex items-center justify-center leading-none">
              {items.length > 9 ? '9+' : items.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className="flex-1 font-bungee py-2.5 transition-all relative"
          style={{
            fontSize: '11px',
            color: activeTab === 'routes' ? '#40E0D0' : 'rgba(192,192,192,0.5)',
            background: activeTab === 'routes' ? 'rgba(64,224,208,0.06)' : 'transparent',
            borderBottom: activeTab === 'routes' ? '2px solid #40E0D0' : '2px solid transparent',
          }}
        >
          MY ROUTES
          {savedRoutes.length > 0 && (
            <span className="ml-1.5 bg-starlight-turquoise text-midnight-navy font-bungee text-[9px] w-4 h-4 rounded-full inline-flex items-center justify-center leading-none">
              {savedRoutes.length > 9 ? '9+' : savedRoutes.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* MY STOPS tab */}
        {activeTab === 'stops' && (
          items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <svg className="w-16 h-16 text-starlight-turquoise/25 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-paper-white font-bungee text-xl mb-2">NO STOPS YET</p>
              <p className="text-chrome-silver font-special-elite text-sm max-w-xs">
                Tap any pin on the map to open it, then tap "+ ADD TO TRIP" to save it here.
              </p>
              <button
                onClick={onClose}
                className="mt-8 bg-atomic-orange text-midnight-navy font-bungee px-6 py-3 rounded-lg hover:bg-starlight-turquoise transition-all shadow-lg"
              >
                BACK TO MAP
              </button>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => onSelectStop?.(item)}
                  className="bg-black/40 border border-starlight-turquoise/40 hover:border-starlight-turquoise rounded-lg p-4 relative transition-colors cursor-pointer"
                >
                  {/* Remove */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                    className="absolute top-3 right-3 text-chrome-silver/60 hover:text-atomic-orange transition-colors"
                    title="Remove stop"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-start gap-3 pr-6">
                    {/* Stop number */}
                    <div className="w-6 h-6 rounded-full bg-atomic-orange text-midnight-navy font-bungee text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Type badge */}
                      <div className="mb-1">
                        {item.type === 'bookstore' && (
                          <span className="text-atomic-orange font-bungee text-xs">📚 BOOKSTORE</span>
                        )}
                        {item.type === 'cafe' && (
                          <span className="text-starlight-turquoise font-bungee text-xs">☕ COFFEE SHOP</span>
                        )}
                        {item.type === 'landmark' && (
                          <span className="text-paper-white font-bungee text-xs">🌲 LITERARY LANDMARK</span>
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="text-starlight-turquoise font-bungee text-base leading-tight mb-1">
                        {item.name}
                      </h3>

                      {/* Address */}
                      {item.address && (
                        <p className="text-chrome-silver font-special-elite text-xs mb-1 truncate">
                          {item.address}
                        </p>
                      )}

                      {/* Description */}
                      {item.description && (
                        <p className="text-paper-white/70 font-special-elite text-xs leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* MY ROUTES tab */}
        {activeTab === 'routes' && (
          <MyRoutes
            savedRoutes={savedRoutes}
            onLoad={onLoadRoute}
            onDelete={onDeleteRoute}
            onRename={onRenameRoute}
            onShare={onShareRoute}
          />
        )}
      </div>
    </div>
  );
};

export default RoadTrip;
