import { useState, useRef } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Odometer from './screens/Odometer';
import StateSelector from './screens/StateSelector';
import MasterMap from './screens/MasterMap';
import Login from './screens/Login';
import Profile from './screens/Profile';
import Resources from './screens/Resources';
import BookLog from './screens/BookLog';
import './App.css';

function AppInner() {
  const [screen, setScreen] = useState('loading'); // 'loading' | 'stateSelector' | 'map' | 'login' | 'profile' | 'resources' | 'bookLog'
  const [selectedStates, setSelectedStates] = useState([]);
  const [previousScreen, setPreviousScreen] = useState(null);

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

  const handleShowLogin = () => {
    setPreviousScreen(screen);
    setScreen('login');
  };

  const handleShowProfile = () => {
    setPreviousScreen(screen);
    setScreen('profile');
  };

  const handleShowResources = () => {
    setPreviousScreen(screen);
    setScreen('resources');
  };

  const handleShowBookLog = () => {
    setPreviousScreen(screen);
    setScreen('bookLog');
  };

  // Profile is only ever opened from the map, so its back always returns to map.
  const handleProfileBack = () => setScreen('map');

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
        <StateSelector onStateSelect={handleStateSelect} onShowLogin={handleShowLogin} />
      )}
      {screen === 'map' && (
        <MasterMap
          selectedStates={selectedStates}
          onHome={handleHome}
          onShowProfile={handleShowProfile}
          onShowLogin={handleShowLogin}
          onShowResources={handleShowResources}
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
