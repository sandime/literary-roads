import { useState, useRef, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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
import AdminUpload from './screens/AdminUpload';
import AdminPanel from './screens/AdminPanel';
import NewsletterPreview from './screens/NewsletterPreview';
import GazetteArchive from './screens/GazetteArchive';
import GazetteIssue from './screens/GazetteIssue';
import GazetteNewspaper from './screens/GazetteNewspaper';
import Store from './screens/Store';
import './App.css';

function AppInner() {
  const { user } = useAuth();
  const [screen, setScreen] = useState('loading'); // 'loading' | 'map' | 'login' | 'profile' | 'resources' | 'library' | 'ethics' | 'credits' | 'badges' | 'privacy'
  const [selectedStates, setSelectedStates] = useState([]);
  const [previousScreen, setPreviousScreen] = useState(null);
  // Tracks where Profile was opened from — never clobbered by sub-navigation
  const [profileOrigin, setProfileOrigin] = useState('map');
  const [showEthicsModal, setShowEthicsModal] = useState(false);

  // Check if logged-in user has accepted the Code of Ethics; show modal if not
  useEffect(() => {
    if (!user) { setShowEthicsModal(false); return; }
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (!snap.exists() || !snap.data().acceptedEthics) setShowEthicsModal(true);
    }).catch(() => {});
  }, [user]);

  // Persists route state across navigation so the map restores when returning
  const routeStateRef = useRef({
    startCity: '',
    endCity: '',
    route: [],
    visibleLocations: [],
    showPlanner: true,
  });

  const handleLoadingComplete = () => setScreen('map');

  const handleHome = () => {
    // MasterMap handles its own state-selection mode internally;
    // this is kept as a no-op safety valve (e.g., back from profile when screen was 'stateSelector')
    setScreen('map');
  };

  const handleLoadSavedRoute = (savedRoute) => {
    const states = savedRoute.selectedStates?.length ? savedRoute.selectedStates : [];
    setSelectedStates(states);
    routeStateRef.current = {
      startCity: savedRoute.startCity || '',
      endCity: savedRoute.endCity || '',
      route: typeof savedRoute.routeCoordinates === 'string'
        ? JSON.parse(savedRoute.routeCoordinates)
        : (savedRoute.routeCoordinates || []),
      // Normalize festival stops that only have coords:[lat,lng] (no lat/lng properties)
      visibleLocations: (savedRoute.stops || []).map(s =>
        s.lat == null && s.coords?.length ? { ...s, lat: s.coords[0], lng: s.coords[1] } : s
      ),
      showPlanner: false,
      pendingLoadedRoute: savedRoute, // MasterMap reads this on mount to set fitTarget + loadedRoute panel
    };
    setScreen('map');
  };

  const handleShowLogin = () => {
    // Preserve any plotted route in localStorage so it survives sign-in / registration
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
    setPreviousScreen(screen);
    setScreen('login');
  };

  const handleShowProfile = () => {
    setProfileOrigin(screen);   // remember map vs stateSelector
    setPreviousScreen(screen);
    setScreen('profile');
  };

  const handleShowResources = () => {
    setPreviousScreen(screen);
    setScreen('resources');
  };

  const handleShowAbout = () => {
    setPreviousScreen(screen);
    setScreen('about');
  };

  const handleShowEthics = () => {
    setPreviousScreen(screen);
    setScreen('ethics');
  };

  const handleShowCredits = () => {
    setPreviousScreen(screen);
    setScreen('credits');
  };

  const handleShowLibrary = () => {
    setPreviousScreen(screen);
    setScreen('library');
  };

  const handleShowDayTrip = () => {
    setPreviousScreen(screen);
    setScreen('dayTripPlanner');
  };

  const handleShowFestivalTrip = () => {
    setPreviousScreen(screen);
    setScreen('festivalTrip');
  };

  const handleShowBadges = () => {
    setPreviousScreen(screen);
    setScreen('badges');
  };

  const handleShowPrivacy = () => {
    setPreviousScreen(screen);
    setScreen('privacy');
  };

  const handleLoadDayTrip = ({ startCity, endCity, route, visibleLocations, showPlanner, tripStops, selectedStates: _ignored, routeType }) => {
    setSelectedStates([]);
    setPreviousScreen(screen);
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
    setScreen('map');
  };

  // Profile back uses profileOrigin, which is never clobbered by sub-screen navigation.
  const handleProfileBack = () => setScreen(profileOrigin);

  const handleAuthBack = () => {
    setScreen(previousScreen || 'map');
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
            pendingSavePrompt: true,  // MasterMap shows "save your route?" banner
          };
          if (pending.selectedStates?.length) setSelectedStates(pending.selectedStates);
        }
        localStorage.removeItem('lr_pending_route');
      }
    } catch {}
    setScreen(previousScreen || 'map');
  };

  return (
    <>
      {screen === 'loading' && <Odometer onComplete={handleLoadingComplete} />}
      {screen === 'map' && (
        <MasterMap
          selectedStates={selectedStates}
          onHome={handleHome}
          onShowProfile={handleShowProfile}
          onShowLogin={handleShowLogin}
          onShowResources={handleShowResources}
          onShowLibrary={handleShowLibrary}
          onShowAbout={handleShowAbout}
          onShowEthics={handleShowEthics}
          onShowCredits={handleShowCredits}
          onShowDayTrip={handleShowDayTrip}
          onShowFestivalTrip={handleShowFestivalTrip}
          onShowBadges={handleShowBadges}
          onShowPrivacy={handleShowPrivacy}
          routeStateRef={routeStateRef}
          onBackToPlanner={
            previousScreen === 'festivalTrip' ? handleShowFestivalTrip :
            previousScreen === 'dayTripPlanner' ? handleShowDayTrip :
            undefined
          }
        />
      )}
      {screen === 'dayTripPlanner' && (
        <DayTripPlanner
          onBack={handleAuthBack}
          onLoadTrip={handleLoadDayTrip}
          onShowLogin={handleShowLogin}
        />
      )}
      {screen === 'festivalTrip' && (
        <FestivalTripPlanner
          onBack={handleAuthBack}
          onHome={handleHome}
          onLoadTrip={handleLoadDayTrip}
          onShowLogin={handleShowLogin}
        />
      )}
      {screen === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onBack={handleAuthBack}
          onContinueAsGuest={handleAuthBack}
          onShowPrivacy={handleShowPrivacy}
          onShowEthics={handleShowEthics}
        />
      )}
      {screen === 'profile' && (
        <Profile
          onBack={handleProfileBack}
          onShowLibrary={handleShowLibrary}
          onShowBadges={handleShowBadges}
          selectedStates={selectedStates}
        />
      )}
      {screen === 'badges' && (
        <Badges onBack={handleAuthBack} />
      )}
      {screen === 'library' && (
        <Library onBack={handleAuthBack} />
      )}
      {screen === 'resources' && (
        <Resources onBack={handleAuthBack} />
      )}
      {screen === 'about' && (
        <About onBack={handleAuthBack} />
      )}
      {screen === 'ethics' && (
        <Ethics onBack={handleAuthBack} onShowPrivacy={handleShowPrivacy} />
      )}
      {screen === 'credits' && (
        <Credits onBack={handleAuthBack} />
      )}
      {screen === 'privacy' && (
        <PrivacyPolicy onBack={handleAuthBack} />
      )}

      {/* First-time ethics acceptance modal — blocks app until accepted */}
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
        <Route path="/route/:routeId" element={<SharedRoutePage />} />
        <Route path="/admin" element={<AdminUpload />} />
        <Route path="/gazette" element={<AdminPanel />} />
        <Route path="/newsletter" element={<NewsletterPreview />} />
        <Route path="/newspaper/current" element={<GazetteNewspaper />} />
        <Route path="/newspaper/archive" element={<GazetteArchive />} />
        <Route path="/newspaper/:slug" element={<GazetteIssue />} />
        <Route path="/store" element={<Store onBack={() => window.history.back()} />} />
        <Route path="*" element={<AppInner />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
