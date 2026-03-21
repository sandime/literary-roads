import { useState, useEffect } from 'react';
import { haversine } from '../utils/dayTripAlgorithm';

// Build a Google Maps URL with all remaining stops as waypoints (round-trip back to start)
const buildGoogleMapsUrl = (startCoords, stops) => {
  if (!stops.length || !startCoords) return null;
  const origin = `${startCoords[0]},${startCoords[1]}`;
  const waypoints = stops.slice(0, 9).map(s => `${s.coords[0]},${s.coords[1]}`).join('|');
  const params = new URLSearchParams({ api: '1', origin, destination: origin, travelmode: 'driving' });
  if (waypoints) params.set('waypoints', waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const fmtDist = (miles) => {
  if (miles < 0.1) return null; // "arrived"
  if (miles < 0.5) return `${Math.round(miles * 5280)} ft`;
  return `${miles.toFixed(1)} mi`;
};

// ─────────────────────────────────────────────────────────────────────────────
const TripProgressPanel = ({ stops, startCoords, onDismiss }) => {
  const [completedIdx, setCompletedIdx] = useState(-1);
  const [userPos, setUserPos]           = useState(null);

  // Watch GPS position for distance-to-next-stop
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      p => setUserPos([p.coords.latitude, p.coords.longitude]),
      null,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const nextIdx  = completedIdx + 1;
  const nextStop = stops[nextIdx];
  const isDone   = nextIdx >= stops.length;

  const distMiles = nextStop && userPos ? haversine(userPos, nextStop.coords) : null;
  const arrived   = distMiles !== null && distMiles < 0.1; // ~530 ft
  const distLabel = distMiles !== null ? fmtDist(distMiles) : null;

  const remainingStops = isDone ? [] : stops.slice(nextIdx);
  const mapsUrl = buildGoogleMapsUrl(startCoords, remainingStops);

  return (
    <div
      className="bg-midnight-navy/97 border-2 border-starlight-turquoise rounded-xl shadow-2xl overflow-hidden"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Progress bar — one segment per stop */}
      <div className="flex gap-0.5 p-2 pb-0">
        {stops.map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
            i <= completedIdx ? 'bg-starlight-turquoise' : 'bg-chrome-silver/20'
          }`} />
        ))}
      </div>

      <div className="px-3 py-2">
        {isDone ? (
          /* ── Trip complete ── */
          <div className="flex items-center justify-between">
            <div>
              <p className="text-starlight-turquoise font-bungee text-sm drop-shadow-[0_0_6px_rgba(64,224,208,0.7)]">
                TRIP COMPLETE 🎉
              </p>
              <p className="text-chrome-silver/60 font-special-elite text-xs mt-0.5">
                {stops.length} stop{stops.length !== 1 ? 's' : ''} · head back to start
              </p>
            </div>
            <button onClick={onDismiss}
              className="text-chrome-silver/50 hover:text-chrome-silver font-bungee text-xs px-2 py-1"
            >
              CLOSE
            </button>
          </div>
        ) : (
          /* ── Active stop ── */
          <div className="flex items-center gap-3">
            {/* Stop info */}
            <div className="flex-1 min-w-0">
              <p className="text-chrome-silver/50 font-special-elite text-[10px] uppercase tracking-wide">
                Stop {nextIdx + 1} of {stops.length}
              </p>
              <p className="text-paper-white font-bungee text-sm leading-tight truncate">
                {nextStop.name}
              </p>
              <p className="text-chrome-silver/50 font-special-elite text-xs truncate mt-0.5">
                {nextStop.address}
              </p>
              {arrived ? (
                <p className="text-starlight-turquoise font-special-elite text-xs mt-0.5 animate-pulse">
                  📍 You've arrived!
                </p>
              ) : distLabel ? (
                <p className="text-chrome-silver/60 font-special-elite text-xs mt-0.5">
                  🚗 {distLabel} away
                </p>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => setCompletedIdx(nextIdx)}
                className={`px-3 py-1.5 rounded-lg font-bungee text-xs transition-all ${
                  arrived
                    ? 'bg-starlight-turquoise text-midnight-navy shadow-[0_0_8px_rgba(64,224,208,0.6)]'
                    : 'bg-starlight-turquoise/15 text-starlight-turquoise border border-starlight-turquoise/40 hover:bg-starlight-turquoise/30'
                }`}
              >
                ✓ DONE
              </button>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg font-bungee text-xs bg-atomic-orange/15 text-atomic-orange border border-atomic-orange/30 hover:bg-atomic-orange/25 text-center"
                >
                  MAPS
                </a>
              )}
            </div>

            {/* Dismiss */}
            <button onClick={onDismiss}
              className="text-chrome-silver/30 hover:text-chrome-silver/60 self-start text-sm flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripProgressPanel;
