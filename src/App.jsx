import { useState, useRef, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import SharedRoutePage from './screens/SharedRoutePage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import Odometer from './screens/Odometer';
import StateSelector from './screens/StateSelector';
import MasterMap from './screens/MasterMap';
import DayTripPlanner from './screens/DayTripPlanner';
import FestivalTripPlanner from './screens/FestivalTripPlanner';
import Login from './screens/Login';
import Profile from './screens/Profile';
import Resources from './screens/Resources';
import BookLog from './screens/BookLog';
import Ethics from './screens/Ethics';
import Credits from './screens/Credits';
import EthicsModal from './components/EthicsModal';
import './App.css';

function AppInner() {
  const { user } = useAuth();
  const [screen, setScreen] = useState('loading'); // 'loading' | 'stateSelector' | 'map' | 'login' | 'profile' | 'resources' | 'bookLog' | 'ethics' | 'credits'
  const [selectedStates, setSelectedStates] = useState([]);
  const [previousScreen, setPreviousScreen] = useState(null);
  // Tracks where Profile was opened from (map or stateSelector) — never clobbered by sub-navigation
  const [profileOrigin, setProfileOrigin] = useState('stateSelector');
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

  const handleLoadingComplete = () => setScreen('stateSelector');

  const handleStateSelect = (statesArray) => {
    setSelectedStates(statesArray);
    setScreen('map');
  };

  const handleHome = () => {
    // Clear saved route when going back to state selection
    routeStateRef.current = { startCity: '', endCity: '', route: [], visibleLocations: [], showPlanner: true };
    setSelectedStates([]);
    setScreen('stateSelector');
  };

  const handleNearMeFromSelector = () => {
    setSelectedStates([]);
    routeStateRef.current = { startCity: '', endCity: '', route: [], visibleLocations: [], showPlanner: false, pendingNearMe: true };
    setScreen('map');
  };

  const handleSelectStopFromSelector = (item) => {
    setSelectedStates([]);
    routeStateRef.current = {
      startCity: '', endCity: '', route: [],
      visibleLocations: [item],
      showPlanner: false,
      pendingLocation: item,   // MasterMap reads this to open the Shelf on mount
    };
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
      visibleLocations: savedRoute.stops || [],
      showPlanner: false,
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

  const handleShowEthics = () => {
    setPreviousScreen(screen);
    setScreen('ethics');
  };

  const handleShowCredits = () => {
    setPreviousScreen(screen);
    setScreen('credits');
  };

  const handleShowBookLog = () => {
    setPreviousScreen(screen);
    setScreen('bookLog');
  };

  const handleShowDayTrip = () => {
    setPreviousScreen(screen);
    setScreen('dayTripPlanner');
  };

  const handleShowFestivalTrip = () => {
    setPreviousScreen(screen);
    setScreen('festivalTrip');
  };

  const handleLoadDayTrip = ({ startCity, endCity, route, visibleLocations, showPlanner, tripStops }) => {
    setSelectedStates([]);
    const ref = { startCity, endCity, route, visibleLocations, showPlanner, tripStops: tripStops ?? visibleLocations ?? [] };
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

  // Profile back uses profileOrigin, which is never clobbered by BookLog navigation.
  const handleProfileBack = () => setScreen(profileOrigin);

  const handleAuthBack = () => {
    setScreen(previousScreen || 'stateSelector');
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
    setScreen(previousScreen || 'stateSelector');
  };

  return (
    <>
      {screen === 'loading' && <Odometer onComplete={handleLoadingComplete} />}
      {screen === 'stateSelector' && (
        <StateSelector
          onStateSelect={handleStateSelect}
          onShowLogin={handleShowLogin}
          onShowProfile={handleShowProfile}
          onShowResources={handleShowResources}
          onShowBookLog={handleShowBookLog}
          onShowEthics={handleShowEthics}
          onShowCredits={handleShowCredits}
          onLoadSavedRoute={handleLoadSavedRoute}
          onSelectStop={handleSelectStopFromSelector}
          onNearMe={handleNearMeFromSelector}
          onShowDayTrip={handleShowDayTrip}
          onShowFestivalTrip={handleShowFestivalTrip}
        />
      )}
      {screen === 'map' && (
        <MasterMap
          selectedStates={selectedStates}
          onHome={handleHome}
          onShowProfile={handleShowProfile}
          onShowLogin={handleShowLogin}
          onShowResources={handleShowResources}
          onShowEthics={handleShowEthics}
          onShowCredits={handleShowCredits}
          onShowDayTrip={handleShowDayTrip}
          onShowFestivalTrip={handleShowFestivalTrip}
          routeStateRef={routeStateRef}
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
          onLoadTrip={handleLoadDayTrip}
          onShowLogin={handleShowLogin}
        />
      )}
      {screen === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onBack={handleAuthBack}
          onContinueAsGuest={handleAuthBack}
        />
      )}
      {screen === 'profile' && (
        <Profile
          onBack={handleProfileBack}
          onShowBookLog={handleShowBookLog}
          selectedStates={selectedStates}
        />
      )}
      {screen === 'bookLog' && (
        <BookLog onBack={handleAuthBack} />
      )}
      {screen === 'resources' && (
        <Resources onBack={handleAuthBack} />
      )}
      {screen === 'ethics' && (
        <Ethics onBack={handleAuthBack} />
      )}
      {screen === 'credits' && (
        <Credits onBack={handleAuthBack} />
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
        <Route path="*" element={<AppInner />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
