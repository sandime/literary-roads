// Google Places API integration
const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

// ALLOWED coffee chains (real coffee culture)
const ALLOWED_COFFEE_CHAINS = [
  'starbucks',
  'peet',
  'coffee bean',
  'philz',
  'blue bottle',
  'intelligentsia',
  'la colombe',
  'caribou',
  'dunn brothers',
  'peets',
];

// HARD EXCLUDE: Fast food, ice cream, and non-coffee chains
const HARD_EXCLUDE = [
  'mcdonald',
  'burger king',
  'wendy',
  'taco bell',
  'kfc',
  'pizza',
  'domino',
  'papa john',
  'subway',
  'chipotle',
  'chick-fil-a',
  'sonic',
  'arby',
  'dairy queen',
  'popeyes',
  'five guys',
  'jimmy john',
  'panda express',
  'dunkin',
  'tim horton',
  'panera',
  '7-eleven',
  '7 eleven',
  'circle k',
  'sheetz',
  'wawa',
  'casey',
  'flying j',
  'pilot',
  'loves',
  'speedway',
  'marathon',
  'shell',
  'bp ',
  'exxon',
  'chevron',
  'valero',
  'ice cream',
  'gelato',
  'yogurt',
  'froyo',
  'baskin',
  'dairy bar',
  'custard',
  'shake',
  'smoothie',
];

// Check if a cafe is a real coffee shop
const isRealCoffeeShop = (placeName) => {
  const lowerName = placeName.toLowerCase();
  
  // Step 1: HARD EXCLUDE - if it's in this list, reject immediately
  if (HARD_EXCLUDE.some(term => lowerName.includes(term))) {
    return false;
  }
  
  // Step 2: ALLOWED CHAINS - if it's a known good chain, accept it
  if (ALLOWED_COFFEE_CHAINS.some(chain => lowerName.includes(chain))) {
    return true;
  }
  
  // Step 3: COFFEE KEYWORDS - if it has coffee-specific terms, probably good
  const strongCoffeeKeywords = ['coffee', 'espresso', 'cappuccino', 'latte', 'roasters', 'roastery', 'brew', 'bean', 'cafe', 'caffeine'];
  const hasStrongCoffeeKeyword = strongCoffeeKeywords.some(keyword => lowerName.includes(keyword));
  
  if (hasStrongCoffeeKeyword) {
    return true;
  }
  
  // Step 4: Default reject (if it's just called "cafe" with no coffee terms, probably not a coffee shop)
  return false;
};

// Check if a bookstore name is excluded
const isExcludedBookstore = (placeName) => {
  // For bookstores, we're less strict - only exclude if clearly not a bookstore
  return false; // Keep all bookstores for now
};

// Geocode a city name to coordinates
export const geocodeCity = async (cityState) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityState)}&key=${GOOGLE_PLACES_API_KEY}`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formatted: data.results[0].formatted_address
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Get real road route between two points using Google Directions API
export const getDirectionsRoute = async (startLat, startLng, endLat, endLng) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${startLat},${startLng}&` +
      `destination=${endLat},${endLng}&` +
      `key=${GOOGLE_PLACES_API_KEY}&` +
      `mode=driving`
    );
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const points = [];
      
      // Extract all lat/lng points from the route
      route.legs.forEach(leg => {
        leg.steps.forEach(step => {
          points.push([step.start_location.lat, step.start_location.lng]);
          points.push([step.end_location.lat, step.end_location.lng]);
        });
      });
      
      return points;
    }
    
    return null;
  } catch (error) {
    console.error('Directions error:', error);
    return null;
  }
};

// Search for bookstores and cafes near a location
export const searchNearbyPlaces = async (lat, lng, radiusMiles = 5) => {
  const radiusMeters = radiusMiles * 1609.34; // Convert miles to meters
  
  try {
    // Search for bookstores
    const bookstoreResponse = await fetch(
      `https://places.googleapis.com/v1/places:searchNearby`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.id'
        },
        body: JSON.stringify({
          includedTypes: ['book_store'],
          maxResultCount: 3, // Limit to 3 closest bookstores per point
          locationRestriction: {
            circle: {
              center: {
                latitude: lat,
                longitude: lng
              },
              radius: radiusMeters
            }
          }
        })
      }
    );

    const bookstoreData = await bookstoreResponse.json();

    // Search for cafes
    const cafeResponse = await fetch(
      `https://places.googleapis.com/v1/places:searchNearby`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.id'
        },
        body: JSON.stringify({
          includedTypes: ['cafe'],
          locationRestriction: {
            circle: {
              center: {
                latitude: lat,
                longitude: lng
              },
              radius: radiusMeters
            }
          }
        })
      }
    );

    const cafeData = await cafeResponse.json();

    // Combine and format results
    const bookstores = (bookstoreData.places || [])
      .filter(place => !isExcludedBookstore(place.displayName?.text || ''))
      .map(place => ({
        id: place.id,
        name: place.displayName?.text || 'Unnamed Bookstore',
        type: 'bookstore',
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        address: place.formattedAddress || '',
        description: 'Independent bookstore'
      }));

    const cafes = (cafeData.places || [])
      .filter(place => isRealCoffeeShop(place.displayName?.text || ''))
      .map(place => ({
        id: place.id,
        name: place.displayName?.text || 'Unnamed Cafe',
        type: 'cafe',
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        address: place.formattedAddress || '',
        description: 'Coffee shop'
      }));

    return [...bookstores, ...cafes];
  } catch (error) {
    console.error('Error fetching places:', error);
    return [];
  }
};

// Autocomplete a city name (US localities only)
export const autocompleteCity = async (input, regionCodes = ['US']) => {
  if (!input || input.length < 2) return [];
  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: ['locality', 'administrative_area_level_3'],
          includedRegionCodes: regionCodes,
        }),
      }
    );
    const data = await response.json();
    if (!data.suggestions) return [];
    return data.suggestions
      .filter(s => s.placePrediction)
      .slice(0, 5)
      .map(s => {
        const pred = s.placePrediction;
        const main = pred.structuredFormat?.mainText?.text || '';
        const secondary = (pred.structuredFormat?.secondaryText?.text || '').replace(/, USA$/, '');
        return {
          id: pred.placeId,
          display: main,
          state: secondary,
          label: secondary ? `${main}, ${secondary}` : main,
        };
      });
  } catch (err) {
    console.error('Autocomplete error:', err);
    return [];
  }
};

// Text search for bookstores, cafes, and landmarks anywhere in the US
export const searchPlacesByText = async (query) => {
  if (!query || query.length < 2) return [];
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.editorialSummary',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'en',
        regionCode: 'US',
        maxResultCount: 6,
      }),
    });
    const data = await response.json();
    if (!data.places) return [];

    return data.places
      .map((place) => {
        const types = place.types || [];
        let type = 'landmark';
        if (types.includes('book_store')) type = 'bookstore';
        else if (types.some((t) => ['cafe', 'coffee_shop'].includes(t))) type = 'cafe';

        const description =
          place.editorialSummary?.text ||
          (type === 'bookstore' ? 'Independent bookstore' :
           type === 'cafe'      ? 'Coffee shop'           : '');

        return {
          id: `search_${place.id}`,
          name: place.displayName?.text || 'Unknown Place',
          type,
          lat: place.location?.latitude,
          lng: place.location?.longitude,
          address: place.formattedAddress || '',
          description,
          source: 'search',
        };
      })
      .filter((p) => p.lat && p.lng);
  } catch (err) {
    console.error('[searchPlacesByText]', err);
    return [];
  }
};

// Search along a route (multiple points)
export const searchAlongRoute = async (routePoints, radiusMiles = 5) => {
  // Sample every 10 miles or so to avoid too many API calls
  const samplePoints = routePoints.filter((_, index) => index % 3 === 0);
  
  const allPlaces = [];
  const seenIds = new Set();

  for (const point of samplePoints) {
    const places = await searchNearbyPlaces(point[0], point[1], radiusMiles);
    
    // Deduplicate
    places.forEach(place => {
      if (!seenIds.has(place.id)) {
        seenIds.add(place.id);
        allPlaces.push(place);
      }
    });
  }

  return allPlaces;
};
