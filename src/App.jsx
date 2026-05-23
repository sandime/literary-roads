import { useState, useRef, useEffect } from 'react';
import { Routes, Route, useSearchParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import SharedRoutePage from './screens/SharedRoutePage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import Odometer from './screens/Odometer';
import MasterMap from './screens/MasterMap';
import DayTripPlanner from './screens/DayTripPlanner';
import FestivalTripPlanner from './screens/FestivalTripPlanner';
import Login from './screens/Login';
import Profile from './screens/Profile';
import Resources from './screens/Resources';
import Library from './screens/Library';
import About from './screens/About';
import Ethics from './screens/Ethics';
import Credits from './screens/Credits';
import Badges from './screens/Badges';
import PrivacyPolicy from './screens/PrivacyPolicy';
import EthicsModal from './components/EthicsModal';
import WelcomeModal, { hasBeenWelcomed } from './components/WelcomeModal';
import AdminUpload from './screens/AdminUpload';
import AdminPanel from './screens/AdminPanel';
import NewsletterPreview from './screens/NewsletterPreview';
import GazetteArchive from './screens/GazetteArchive';
import GazetteIssue from './screens/GazetteIssue';
import GazetteNewspaper from './screens/GazetteNewspaper';
import Store from './screens/Store';
import GuideScreen from './screens/GuideScreen';
import AuthorPage from './screens/AuthorPage';
import JourneysPage from './screens/JourneysPage';
import SwapMeetScreen from './screens/SwapMeetScreen';
import LibraryFinderScreen from './screens/LibraryFinderScreen';
import './App.css';

// window flags: survive HMR module re-evaluation (unlike module-level lets) but reset on
// full page reload — exactly the right lifetime for per-session, cross-remount state.
// AppInner unmounts/remounts whenever the user navigates to standalone routes (/gazette,
// /author, /newspaper/*) and back, so component state alone can't track these.

function AppInner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Show odometer only on the very first load — never again after it completes, even if
  // AppInner remounts (which happens when navigating to/from standalone routes like /gazette).
  const [showOdometer, setShowOdometer] = useState(() => {
    if (sessionStorage.getItem('lr_odometer_done')) return false;
    const hash = window.location.hash.slice(1) || '/';
    const [hashPath, hashQuery] = hash.split('?');
    const p = new URLSearchParams(hashQuery || '');
    const shouldShow = hashPath === '/' && !p.get('back') && !p.get('landmark') && !p.get('center') && !p.get('bookstoreId');
    // Mark done immediately if we're skipping — so remounts and page reloads never re-trigger
    if (!shouldShow) sessionStorage.setItem('lr_odometer_done', '1');
    return shouldShow;
  });

  // Incremented when back is pressed while already on the map — MasterMap resets to fresh state
  const [mapResetKey, setMapResetKey] = useState(0);
  const locationPathnameRef = useRef(location.pathname);

  const [selectedStates, setSelectedStates] = useState([]);
  const [showEthicsModal, setShowEthicsModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Persists map/route state across navigation so the map restores when returning
  const routeStateRef = useRef({
    startCity: '',
    endCity: '',
    route: [],
    visibleLocations: [],
    showPlanner: true,
  });

  // Ethics modal — shown to logged-in users who haven't accepted yet
  useEffect(() => {
    if (!user) { setShowEthicsModal(false); return; }
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (!snap.exists() || !snap.data().acceptedEthics) setShowEthicsModal(true);
    }).catch(() => {});
  }, [user]);

  // Populate routeStateRef synchronously during render so MasterMap's mount effect sees
  // these values. useEffect fires after child effects, so writing there is too late —
  // MasterMap (a child) runs its mount effect before AppInner's effect.
  const urlInitRef = useRef(false);
  if (!urlInitRef.current) {
    urlInitRef.current = true;
    const landmarkId = searchParams.get('landmark');
    if (landmarkId) routeStateRef.current.pendingLandmark = landmarkId;
    const center = searchParams.get('center');
    if (center) {
      const [lat, lng] = center.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) routeStateRef.current.pendingCenter = [lat, lng];
    }
    const bookstoreId = searchParams.get('bookstoreId');
    if (bookstoreId) routeStateRef.current.pendingBookstore = bookstoreId;
    const pinName = searchParams.get('pinName');
    if (pinName) {
      routeStateRef.current.pendingPin = {
        name: pinName,
        city:    searchParams.get('pinCity')    || '',
        state:   searchParams.get('pinState')   || '',
        type:    searchParams.get('pinType')    || 'bookstore',
        website: searchParams.get('pinWebsite') || '',
      };
    }
  }

  // Keep pathname ref current so popstate handler sees latest value
  useEffect(() => {
    locationPathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Back-press at the map resets to a fresh state instead of exiting the app.
  // The buffer entry is pushed once per page lifetime so AppInner remounts (when the user
  // navigates to/from standalone routes like /author) don't accumulate extra history entries
  // that would throw React Router out of sync.
  useEffect(() => {
    if (showOdometer) return;
    if (!window.__lr_buffer_pushed) {
      window.history.pushState({ literaryRoadsBuffer: true }, '', window.location.href);
      window.__lr_buffer_pushed = true;
    }
    const handlePop = () => {
      const hash = window.location.hash;
      const atMap = !hash || hash === '#/' || hash === '#';
      if (atMap && locationPathnameRef.current === '/') {
        // Reset the map — do NOT push another buffer entry here, that would put React
        // Router's internal history out of sync with the real browser history.
        setMapResetKey(k => k + 1);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [showOdometer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation handlers ───────────────────────────────────────────────────

  const handleLoadSavedRoute = (savedRoute) => {
    const states = savedRoute.selectedStates?.length ? savedRoute.selectedStates : [];
    setSelectedStates(states);
    routeStateRef.current = {
      startCity: savedRoute.startCity || '',
      endCity: savedRoute.endCity || '',
      route: typeof savedRoute.routeCoordinates === 'string'
        ? JSON.parse(savedRoute.routeCoordinates)
        : (savedRoute.routeCoordinates || []),
      visibleLocations: (savedRoute.stops || []).map(s =>
        s.lat == null && s.coords?.length ? { ...s, lat: s.coords[0], lng: s.coords[1] } : s
      ),
      showPlanner: false,
      pendingLoadedRoute: savedRoute,
    };
    navigate('/');
  };

  const handleShowLogin = () => {
    // Preserve any plotted route so it survives sign-in / registration
    const { route, startCity, endCity, visibleLocations } = routeStateRef.current;
    if (route?.length > 0) {
      try {
        localStorage.setItem('lr_pending_route', JSON.stringify({
          route,
          startCity:        startCity        || '',
          endCity:          endCity          || '',
          visibleLocations: visibleLocations || [],
          selectedStates:   selectedStates   || [],
          timestamp: Date.now(),
        }));
      } catch {}
    }
    navigate('/login', { state: { from: location.pathname } });
  };

  const handleLoginSuccess = () => {
    // Restore any route that was saved before sign-in (within the last 30 min)
    try {
      const raw = localStorage.getItem('lr_pending_route');
      if (raw) {
        const pending = JSON.parse(raw);
        const THIRTY_MIN = 30 * 60 * 1000;
        if (Date.now() - pending.timestamp < THIRTY_MIN && pending.route?.length > 0) {
          routeStateRef.current = {
            ...routeStateRef.current,
            route:            pending.route,
            startCity:        pending.startCity        || '',
            endCity:          pending.endCity          || '',
            visibleLocations: pending.visibleLocations || [],
            showPlanner:      false,
            pendingSavePrompt: true,
          };
          if (pending.selectedStates?.length) setSelectedStates(pending.selectedStates);
        }
        localStorage.removeItem('lr_pending_route');
      }
    } catch {}
    const from = location.state?.from || '/';
    navigate(from, { replace: true });
  };

  const handleLoadCuratedRoute = ({ route, stops }) => {
    setSelectedStates([]);
    const validStops = stops.filter(s => s.lat != null && s.lng != null);
    routeStateRef.current = {
      startCity: stops[0]?.name || '',
      endCity:   stops[stops.length - 1]?.name || '',
      route:     [],
      visibleLocations: validStops,
      showPlanner: false,
      curatedRouteBanner: { name: route.name, routeId: route.id },
    };
    navigate('/', { state: { fromPlanner: 'curated' } });
  };

  const handleLoadDayTrip = ({ startCity, endCity, route, visibleLocations, showPlanner, tripStops, routeType }) => {
    setSelectedStates([]);
    const ref = { startCity, endCity, route, visibleLocations, showPlanner, tripStops: tripStops ?? visibleLocations ?? [], routeType: routeType || 'dayTrip' };
    if (route?.length > 0) {
      const lats = route.map(p => p[0]);
      const lngs = route.map(p => p[1]);
      const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const maxDiff = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
      let zoom = 10;
      if (maxDiff > 10) zoom = 6;
      else if (maxDiff > 5) zoom = 7;
      else if (maxDiff > 2) zoom = 8;
      else if (maxDiff > 1) zoom = 9;
      else if (maxDiff > 0.5) zoom = 10;
      else if (maxDiff > 0.2) zoom = 11;
      else zoom = 12;
      ref.mapCenter = [midLat, midLng];
      ref.mapZoom   = zoom;
    }
    routeStateRef.current = ref;
    navigate('/', { state: { fromPlanner: routeType === 'festivalTrip' ? 'festivalTrip' : 'dayTrip' } });
  };

  const isMapRoute = location.pathname === '/';

  // fromPlanner: used by MasterMap to show "Back to Planner" button
  const fromPlanner = location.state?.fromPlanner ?? null;

  return (
    <>
      {/* Odometer — shown once on fresh app load */}
      {showOdometer && (
        <Odometer onComplete={() => {
          sessionStorage.setItem('lr_odometer_done', '1');
          setShowOdometer(false);
          if (!hasBeenWelcomed()) setShowWelcomeModal(true);
        }} />
      )}

      {/* MasterMap — always mounted after odometer, never unmounts on navigation */}
      {!showOdometer && (
        <MasterMap
          selectedStates={selectedStates}
          onHome={() => navigate('/')}
          onShowProfile={() => navigate('/profile')}
          onShowLogin={handleShowLogin}
          onShowResources={() => navigate('/resources')}
          onShowLibrary={() => navigate('/library')}
          onShowAbout={() => navigate('/about')}
          onShowEthics={() => navigate('/ethics')}
          onShowCredits={() => navigate('/credits')}
          onShowDayTrip={() => navigate('/daytrip')}
          onShowFestivalTrip={() => navigate('/festivaltrip')}
          onShowJourneys={() => navigate('/journeys')}
          onShowBadges={() => navigate('/badges')}
          onShowSwapMeet={() => navigate('/swap-meet')}
          onShowPrivacy={() => navigate('/privacy')}
          routeStateRef={routeStateRef}
          onBackToPlanner={fromPlanner ? () => navigate(-1) : undefined}
          mapResetKey={mapResetKey}
        />
      )}

      {/* Full-screen overlay for non-map routes — covers map, map stays mounted */}
      {!showOdometer && !isMapRoute && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#1A1B2E', overflow: 'hidden',
        }}>
          <Routes>
            <Route path="/login" element={
              <Login
                onLoginSuccess={handleLoginSuccess}
                onBack={() => navigate(-1)}
                onContinueAsGuest={() => navigate(-1)}
                onShowPrivacy={() => navigate('/privacy')}
                onShowEthics={() => navigate('/ethics')}
              />
            } />
            <Route path="/profile" element={
              <Profile
                onBack={() => navigate(-1)}
                onShowLibrary={() => navigate('/library')}
                onShowBadges={() => navigate('/badges')}
                selectedStates={selectedStates}
              />
            } />
            <Route path="/badges" element={<Badges onBack={() => navigate(-1)} />} />
            <Route path="/library/*" element={<Library onBack={() => navigate(-1)} />} />
            <Route path="/resources" element={<Resources onBack={() => navigate(-1)} />} />
            <Route path="/about" element={<About onBack={() => navigate(-1)} />} />
            <Route path="/ethics" element={
              <Ethics onBack={() => navigate(-1)} onShowPrivacy={() => navigate('/privacy')} />
            } />
            <Route path="/credits" element={<Credits onBack={() => navigate(-1)} />} />
            <Route path="/privacy" element={<PrivacyPolicy onBack={() => navigate(-1)} />} />
            <Route path="/journeys/*" element={
              <JourneysPage
                onBack={() => navigate(-1)}
                onShowDayTrip={() => navigate('/daytrip')}
                onShowFestivalTrip={() => navigate('/festivaltrip')}
                onLoadCuratedRoute={handleLoadCuratedRoute}
                onShowLogin={handleShowLogin}
              />
            } />
            <Route path="/swap-meet" element={
              <SwapMeetScreen
                onBack={() => navigate(-1)}
                onShowLogin={handleShowLogin}
              />
            } />
            <Route path="/daytrip" element={
              <DayTripPlanner
                onBack={() => navigate(-1)}
                onLoadTrip={handleLoadDayTrip}
                onShowLogin={handleShowLogin}
              />
            } />
            <Route path="/festivaltrip" element={
              <FestivalTripPlanner
                onBack={() => navigate(-1)}
                onHome={() => navigate('/')}
                onLoadTrip={handleLoadDayTrip}
                onShowLogin={handleShowLogin}
              />
            } />
          </Routes>
        </div>
      )}

      {/* First-visit welcome modal */}
      {showWelcomeModal && (
        <WelcomeModal
          onDismiss={() => setShowWelcomeModal(false)}
          onSignIn={() => { setShowWelcomeModal(false); handleShowLogin(); }}
        />
      )}

      {/* Ethics acceptance modal — blocks app until accepted */}
      {showEthicsModal && user && (
        <EthicsModal user={user} onAccepted={() => setShowEthicsModal(false)} />
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Standalone routes — outside the main app shell */}
        <Route path="/route/:routeId" element={<SharedRoutePage />} />
        <Route path="/admin" element={<AdminUpload />} />
        <Route path="/gazette" element={<AdminPanel />} />
        <Route path="/newsletter" element={<NewsletterPreview />} />
        <Route path="/newspaper/current" element={<GazetteNewspaper />} />
        <Route path="/newspaper/archive" element={<GazetteArchive />} />
        <Route path="/newspaper/:slug" element={<GazetteIssue />} />
        <Route path="/store" element={<Store onBack={() => window.history.back()} />} />
        <Route path="/guide/:guideId" element={<GuideScreen />} />
        <Route path="/library-finder" element={<LibraryFinderScreen />} />
        <Route path="/author" element={<AuthorPage />} />
        {/* Main app — AppInner handles map + overlay screens */}
        <Route path="/*" element={<AppInner />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
