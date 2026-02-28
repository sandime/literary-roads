import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Odometer from './screens/Odometer';
import StateSelector from './screens/StateSelector';
import MasterMap from './screens/MasterMap';
import Login from './screens/Login';
import Profile from './screens/Profile';
import './App.css';

function AppInner() {
  const [screen, setScreen] = useState('loading'); // 'loading' | 'stateSelector' | 'map' | 'login' | 'profile'
  const [selectedStates, setSelectedStates] = useState([]);
  const [previousScreen, setPreviousScreen] = useState(null);

  const handleLoadingComplete = () => setScreen('stateSelector');

  const handleStateSelect = (statesArray) => {
    setSelectedStates(statesArray);
    setScreen('map');
  };

  const handleHome = () => {
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
          onBack={handleAuthBack}
          selectedStates={selectedStates}
        />
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
