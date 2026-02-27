import { useState } from 'react';
import Odometer from './screens/Odometer';
import StateSelector from './screens/StateSelector';
import MasterMap from './screens/MasterMap';
import './App.css';

function App() {
  const [screen, setScreen] = useState('loading'); // 'loading' | 'stateSelector' | 'map'
  const [selectedStates, setSelectedStates] = useState([]);

  const handleLoadingComplete = () => {
    setScreen('stateSelector');
  };

  const handleStateSelect = (statesArray) => {
    setSelectedStates(statesArray);
    setScreen('map');
  };

  const handleHome = () => {
    setSelectedStates([]);
    setScreen('stateSelector');
  };

  return (
    <>
      {screen === 'loading' && <Odometer onComplete={handleLoadingComplete} />}
      {screen === 'stateSelector' && <StateSelector onStateSelect={handleStateSelect} />}
      {screen === 'map' && <MasterMap selectedStates={selectedStates} onHome={handleHome} />}
    </>
  );
}

export default App;
