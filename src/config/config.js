// Feature Flags - Turn features on/off easily
export const FEATURES = {
  // Phase 1 - MVP (Core Map)
  SHOW_MAP: true,
  SHOW_ROUTE_PLANNER: true,
  SHOW_LOCATION_DETAILS: true,
  
  // Phase 2 - Social (Turn on later)
  SHOW_LOGIN: false,
  SHOW_CHECK_INS: false,
  SHOW_PASSPORT_STAMPS: false,
  SHOW_RATINGS: false,
  
  // Phase 3 - Googie Experience (Turn on later)
  SHOW_POSTCARD_STUDIO: false,
  SHOW_TRIVIA: false,
  SHOW_HITCHHIKER_FLEET: false,
  
  // Phase 4 - Premium (Turn on later)
  SHOW_PREMIUM_FEATURES: false,
  SHOW_PARTNER_PINS: false,
  
  // Accessibility
  ACCESSIBILITY_MODE: false,
};

// Your Googie Color Palette
export const COLORS = {
  midnightNavy: '#1A1B2E',
  starlightTurquoise: '#40E0D0',
  atomicOrange: '#FF4E00',
  paperWhite: '#F5F5DC',
  chromeSilver: '#C0C0C0',
};

// Map configuration
export const MAP_CONFIG = {
  defaultCenter: [38.2527, -85.7585], // Louisville, KY
  defaultZoom: 13,
  corridorWidth: 5, // miles
  maxZoom: 18,
  minZoom: 4,
};
