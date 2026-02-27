import { useEffect, useState } from 'react';

const Odometer = ({ onComplete }) => {
  const [miles, setMiles] = useState(0);
  const [fuelLevel, setFuelLevel] = useState(0);

  useEffect(() => {
    // Animate odometer from 0 to 1955
    const mileInterval = setInterval(() => {
      setMiles((prev) => {
        if (prev >= 1955) {
          clearInterval(mileInterval);
          return 1955;
        }
        return prev + 37; // Increment speed
      });
    }, 30);

    // Animate fuel gauge
    const fuelInterval = setInterval(() => {
      setFuelLevel((prev) => {
        if (prev >= 100) {
          clearInterval(fuelInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Move to main app after animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearInterval(mileInterval);
      clearInterval(fuelInterval);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-midnight-navy flex items-center justify-center relative overflow-hidden">
      {/* Starfield background */}
      <div className="absolute inset-0 bg-gradient-to-b from-midnight-navy to-black">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Dashboard */}
      <div className="relative z-10 text-center">
        {/* Odometer */}
        <div className="mb-8">
          <div className="text-starlight-turquoise font-bungee text-2xl mb-4 drop-shadow-[0_0_10px_rgba(64,224,208,0.8)]">
            THE LITERARY ROADS
          </div>
          <div className="bg-black/80 border-4 border-chrome-silver rounded-lg p-6 inline-block shadow-2xl">
            <div className="text-paper-white font-special-elite text-sm mb-2">
              ODOMETER
            </div>
            <div className="text-atomic-orange font-mono text-6xl font-bold tabular-nums tracking-wider">
              {miles.toString().padStart(4, '0')}
            </div>
            <div className="text-paper-white font-special-elite text-xs mt-2">
              MILES
            </div>
          </div>
        </div>

        {/* Fuel Gauge */}
        <div className="max-w-xs mx-auto">
          <div className="text-paper-white font-special-elite text-sm mb-2">
            INSPIRATION FUEL
          </div>
          <div className="relative h-8 bg-black/80 border-2 border-chrome-silver rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-atomic-orange to-starlight-turquoise transition-all duration-100 ease-out"
              style={{ width: `${fuelLevel}%` }}
            >
              <div className="h-full w-full animate-pulse bg-white/20" />
            </div>
          </div>
          <div className="flex justify-between text-paper-white font-special-elite text-xs mt-1">
            <span>EMPTY</span>
            <span>FULL</span>
          </div>
        </div>

        {/* Loading text */}
        <div className="mt-8 text-starlight-turquoise font-special-elite text-sm animate-pulse">
          Starting your engine...
        </div>
      </div>
    </div>
  );
};

export default Odometer;
