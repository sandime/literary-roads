import { useState } from 'react';
import MyRoutes from '../components/MyRoutes';
import { CloseIcon } from '../components/Icons';

const TYPE_BADGE = {
  bookstore: 'BOOKSTORE', cafe: 'COFFEE SHOP', landmark: 'LANDMARK',
  drivein: 'DRIVE-IN', festival: 'FESTIVAL', museum: 'MUSEUM',
  park: 'PARK', restaurant: 'RESTAURANT',
};

const StopCard = ({ item, onSelect, onRemove, onShare, badge }) => (
  <div
    onClick={() => onSelect?.(item)}
    className="bg-black/40 border border-starlight-turquoise/40 hover:border-starlight-turquoise rounded-lg p-4 relative transition-colors cursor-pointer"
  >
    <button
      onClick={(e) => { e.stopPropagation(); onRemove(); }}
      className="absolute top-3 right-3 text-chrome-silver/60 hover:text-atomic-orange transition-colors"
      title="Remove"
    >
      <CloseIcon size={20} />
    </button>
    <div className="flex items-start gap-3 pr-6">
      <div className="w-6 h-6 rounded-full bg-starlight-turquoise/20 border border-starlight-turquoise text-starlight-turquoise font-bungee text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
        {badge}
      </div>
      <div className="flex-1 min-w-0">
        {TYPE_BADGE[item.type] && (
          <div className="mb-1">
            <span className="text-chrome-silver/60 font-bungee text-[10px]">{TYPE_BADGE[item.type]}</span>
          </div>
        )}
        <h3 className="text-starlight-turquoise font-bungee text-sm leading-tight mb-0.5 truncate">{item.name}</h3>
        {item.address && (
          <p className="text-chrome-silver font-special-elite text-xs truncate">{item.address}</p>
        )}
      </div>
    </div>
    {onShare && (
      <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onShare(item)}
          className="bg-atomic-orange/10 border border-atomic-orange text-atomic-orange font-bungee text-xs py-1.5 px-3 rounded-lg hover:bg-atomic-orange hover:text-midnight-navy transition-all flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          SHARE
        </button>
      </div>
    )}
  </div>
);

const RoadTrip = ({ items, onRemove, onClearAll, onClose, onSelectStop, savedRoutes = [], onLoadRoute, onDeleteRoute, onRenameRoute, onShareRoute, savedStops = [], onRemoveSaved, onShareSaved }) => {
  const [activeTab, setActiveTab] = useState('routes');

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
            MY TRIPS
          </h1>
          <p className="text-atomic-orange font-special-elite text-xs mt-0.5">
            {activeTab === 'routes'
              ? `${savedRoutes.length} saved trip${savedRoutes.length !== 1 ? 's' : ''}`
              : `${items.length + savedStops.length} saved place${(items.length + savedStops.length) !== 1 ? 's' : ''}`}
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
          onClick={() => setActiveTab('routes')}
          className="flex-1 font-bungee py-2.5 transition-all relative"
          style={{
            fontSize: '11px',
            color: activeTab === 'routes' ? '#40E0D0' : 'rgba(192,192,192,0.5)',
            background: activeTab === 'routes' ? 'rgba(64,224,208,0.06)' : 'transparent',
            borderBottom: activeTab === 'routes' ? '2px solid #40E0D0' : '2px solid transparent',
          }}
        >
          MY TRIPS
          {savedRoutes.length > 0 && (
            <span className="ml-1.5 bg-starlight-turquoise text-midnight-navy font-bungee text-[9px] w-4 h-4 rounded-full inline-flex items-center justify-center leading-none">
              {savedRoutes.length > 9 ? '9+' : savedRoutes.length}
            </span>
          )}
        </button>
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
          SAVED PLACES
          {(items.length + savedStops.length) > 0 && (
            <span className="ml-1.5 bg-atomic-orange text-midnight-navy font-bungee text-[9px] w-4 h-4 rounded-full inline-flex items-center justify-center leading-none">
              {(items.length + savedStops.length) > 9 ? '9+' : items.length + savedStops.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* SAVED PLACES tab */}
        {activeTab === 'stops' && (
          items.length === 0 && savedStops.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <svg className="w-16 h-16 text-starlight-turquoise/25 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-paper-white font-bungee text-xl mb-2">NO SAVED PLACES YET</p>
              <p className="text-chrome-silver font-special-elite text-sm max-w-xs">
                Tap any pin on the map, then tap the bookmark button to save a place here.
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

              {/* ── Permanently saved stops ── */}
              {savedStops.length > 0 && (
                <>
                  <p className="text-starlight-turquoise font-bungee text-xs tracking-widest pt-1 pb-0.5">
                    SAVED PLACES ({savedStops.length})
                  </p>
                  {savedStops.map((item) => (
                    <StopCard key={item.id} item={item} onSelect={onSelectStop}
                      onRemove={() => onRemoveSaved?.(item.id)}
                      onShare={onShareSaved ? () => onShareSaved(item) : undefined}
                      badgeColor="starlight-turquoise" badge="★" />
                  ))}
                </>
              )}

              {/* ── Trip bag items (from ADD TO TRIP, if any remain) ── */}
              {items.length > 0 && (
                <>
                  {savedStops.length > 0 && (
                    <p className="text-chrome-silver/50 font-bungee text-xs tracking-widest pt-2 pb-0.5">
                      THIS SESSION
                    </p>
                  )}
                  {items.map((item, index) => (
                    <StopCard key={item.id} item={item} onSelect={onSelectStop}
                      onRemove={() => onRemove(item.id)} badgeColor="atomic-orange" badge={index + 1} />
                  ))}
                </>
              )}
            </div>
          )
        )}

        {/* MY TRIPS tab */}
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
