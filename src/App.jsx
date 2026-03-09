import { useState, useRef, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';
import Odometer from './screens/Odometer';
import StateSelector from './screens/StateSelector';
import MasterMap from './screens/MasterMap';
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

  // Profile back uses profileOrigin, which is never clobbered by BookLog navigation.
  const handleProfileBack = () => setScreen(profileOrigin);

  const handleAuthBack = () => {
    setScreen(previousScreen || 'stateSelector');
  };

  const handleLoginSuccess = () => {
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
          routeStateRef={routeStateRef}
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
      <AppInner />
    </AuthProvider>
  );
}

export default App;
