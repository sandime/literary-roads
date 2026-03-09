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

// HARD EXCLUDE: Fast food, ice cream, alcohol, warehouse, and non-coffee places
const HARD_EXCLUDE_CAFE = [
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
  // Gas stations / convenience stores
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
  'thorntons',
  'thornton',
  'quiktrip',
  'quick trip',
  'racetrac',
  'race trac',
  'cumberland farms',
  'getgo',
  'get-go',
  'mapco',
  'maverik',
  'kum & go',
  'holiday station',
  'holiday stationstore',
  // Pharmacies (serve coffee incidentally)
  'cvs',
  'walgreens',
  'rite aid',
  'duane reade',
  // Donut chains
  'krispy kreme',
  'winchell',
  "shipley do-nut",
  "shipley donut",
  'ice cream',
  'gelato',
  'yogurt',
  'froyo',
  'baskin',
  'dairy bar',
  'custard',
  'shake',
  'smoothie',
  // Breweries / bars / wine
  'brewing',
  'brewery',
  'brewhouse',
  'brewpub',
  'vineyard',
  'winery',
  'wine bar',
  'taproom',
  'tap room',
  ' bar & grill',
  ' bar and grill',
  'sports bar',
  'cocktail',
  // Warehouse / big box
  "sam's club",
  'costco',
  'target',
  'walmart',
  // Restaurants / dining (not coffee shops)
  'ristorante',
  'trattoria',
  'osteria',
  'gastropub',
  'tavern',
  ' grill',
  'grille',
  ' kitchen',
  'dining room',
  'steakhouse',
  'steak house',
  'chophouse',
  'chop house',
  'sushi',
  'ramen',
  'taqueria',
  'cantina',
  'pizzeria',
];

// Google place types that flag a restaurant (not a dedicated coffee shop)
const RESTAURANT_TYPES = ['restaurant', 'bar', 'meal_takeaway', 'meal_delivery', 'food'];

// Name keywords that confirm a dedicated coffee shop regardless of other signals
const STRONG_COFFEE_KEYWORDS = [
  'coffee', 'espresso', 'cappuccino', 'latte', 'roasters', 'roastery',
  'brew', 'bean', 'cafe', 'caffeine', 'tea house', 'teahouse', 'perk',
];

// Check if a cafe is a real coffee shop.
// placeTypes: the Google `types` array for the place (used to reject restaurants tagged as cafe)
// googleConfirmed=true: Google typed it as 'cafe'/'coffee_shop' via includedTypes search
const isRealCoffeeShop = (placeName, googleConfirmed = false, placeTypes = []) => {
  const lowerName = placeName.toLowerCase();

  // Step 1: HARD EXCLUDE — always applied
  if (HARD_EXCLUDE_CAFE.some(term => lowerName.includes(term))) return false;

  // Step 2: Reject standalone "bar" unless it's a coffee/juice bar
  if (lowerName.includes(' bar') || lowerName.startsWith('bar ') || lowerName === 'bar') {
    const okBar = ['coffee bar', 'juice bar', 'tea bar', 'espresso bar'];
    if (!okBar.some(t => lowerName.includes(t))) return false;
  }

  // Step 3: If Google explicitly typed it as 'coffee_shop' — most specific signal, always trust it
  if (placeTypes.includes('coffee_shop')) return true;

  // Step 4: If Google also typed it as a restaurant/bar AND it's not a dedicated coffee_shop,
  // require a strong coffee keyword in the name.
  // e.g. "Gralehaus" (gastropub) → types: [cafe, restaurant, bar] → no coffee keyword → reject
  // e.g. "Please and Thank You" → if it's coffee_shop type, already passed above
  const hasRestaurantType = RESTAURANT_TYPES.some(t => placeTypes.includes(t));
  if (hasRestaurantType) {
    return STRONG_COFFEE_KEYWORDS.some(kw => lowerName.includes(kw));
  }

  // Step 5: If Google confirmed via includedTypes search and name isn't restaurant-flagged, trust it
  if (googleConfirmed) return true;

  // Step 6: ALLOWED CHAINS
  if (ALLOWED_COFFEE_CHAINS.some(chain => lowerName.includes(chain))) return true;

  // Step 7: COFFEE KEYWORDS
  if (STRONG_COFFEE_KEYWORDS.some(kw => lowerName.includes(kw))) return true;

  // Step 8: Default reject
  return false;
};

// KNOWN BOOKSTORE CHAINS — always accept regardless of name pattern
const KNOWN_BOOKSTORE_CHAINS = [
  'barnes & noble',
  'barnes and noble',
  'half price books',
  "powell's",
  'books-a-million',
  'books a million',
  'second & charles',
  'second and charles',
  'hastings',
  'tattered cover',
  'strand bookstore',
  'the strand',
];

// BOOKSTORE HARD EXCLUDE — crystal shops, gift shops, discount retail, etc.
const HARD_EXCLUDE_BOOKSTORE = [
  'crystal',
  'mystical',
  'metaphysical',
  'psychic',
  'tarot',
  'gift shop',
  'gifts & more',
  'gifts and more',
  'souvenir',
  'antique mall',
  'antique market',
  'antique store',
  'antique shop',
  'general store',
  'convenience store',
  'tobacco',
  'vape',
  'smoke shop',
  "sam's club",
  'costco',
  'target',
  'walmart',
  "ollie's",
  'ollies',
  'bargain outlet',
  'bargain bin',
  'discount outlet',
  'wholesale',
  'dollar tree',
  'dollar general',
  '5 below',
  'five below',
  'big lots',
  'grocery',
  'supermarket',
];

// Check if a place tagged "book_store" is actually a real bookstore
const isRealBookstore = (placeName) => {
  const lowerName = placeName.toLowerCase();

  // Step 1: HARD EXCLUDE
  if (HARD_EXCLUDE_BOOKSTORE.some(term => lowerName.includes(term))) return false;

  // Step 2: KNOWN CHAINS — always pass
  if (KNOWN_BOOKSTORE_CHAINS.some(chain => lowerName.includes(chain))) return true;

  // Step 3: REQUIRE positive book indicators in name
  const bookKeywords = ['book', 'books', 'bookstore', 'bookshop', 'bookery', 'bookseller', 'booksellers', 'library', 'lit ', 'literary', 'reading', 'page', 'novel', 'story', 'stories', 'chapter', 'shelf', 'tome'];
  if (bookKeywords.some(kw => lowerName.includes(kw))) return true;

  // Step 4: Reject — tagged book_store but nothing in the name suggests it
  return false;
};

// Resolve a Places API placeId to precise coordinates via Place Details
export const getPlaceCoords = async (placeId) => {
  if (!placeId) return null;
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=location,displayName,formattedAddress`,
      {
        headers: {
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'location,displayName,formattedAddress',
        },
      }
    );
    const data = await response.json();
    if (data.location) {
      return {
        lat: data.location.latitude,
        lng: data.location.longitude,
        formatted: data.formattedAddress || data.displayName?.text || placeId,
      };
    }
    return null;
  } catch {
    return null;
  }
};

// Geocode a city name to coordinates
export const geocodeCity = async (cityState) => {
  if (!cityState || !cityState.trim()) return null;
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
      .filter(place => isRealBookstore(place.displayName?.text || ''))
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
      .filter(place => isRealCoffeeShop(place.displayName?.text || '', true, place.types || []))
      .map(place => ({
        id: place.id,
        name: place.displayName?.text || 'Unnamed Cafe',
        type: 'cafe',
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        address: place.formattedAddress || '',
        description: 'Coffee shop'
      }));

    // Search for drive-in theaters (movie_theater type filtered by name)
    const driveInResponse = await fetch(
      `https://places.googleapis.com/v1/places:searchNearby`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.id,places.nationalPhoneNumber,places.websiteUri,places.businessStatus',
        },
        body: JSON.stringify({
          includedTypes: ['movie_theater'],
          maxResultCount: 5,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: Math.min(radiusMeters * 3, 48280), // Drive-ins are rarer; search up to ~30mi
            },
          },
        }),
      }
    );
    const driveInData = await driveInResponse.json();
    const driveInKeywords = ['drive-in', 'drive in', 'drivein', 'auto movie', 'twin drive'];
    const driveIns = (driveInData.places || [])
      .filter(place => {
        const n = (place.displayName?.text || '').toLowerCase();
        return driveInKeywords.some(k => n.includes(k)) &&
          place.businessStatus !== 'CLOSED_PERMANENTLY';
      })
      .map(place => ({
        id: place.id,
        name: place.displayName?.text || 'Drive-In Theater',
        type: 'drivein',
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        address: place.formattedAddress || '',
        phone: place.nationalPhoneNumber || '',
        url: place.websiteUri || '',
        description: 'Drive-in movie theater',
      }));

    return [...bookstores, ...cafes, ...driveIns];
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
        const name = place.displayName?.text || 'Unknown Place';
        let type = 'landmark';
        if (types.includes('book_store')) type = 'bookstore';
        else if (types.some((t) => ['cafe', 'coffee_shop'].includes(t))) type = 'cafe';

        // Apply same filters as nearby search
        if (type === 'bookstore' && !isRealBookstore(name)) type = 'landmark';
        if (type === 'cafe' && !isRealCoffeeShop(name)) type = 'landmark';

        const description =
          place.editorialSummary?.text ||
          (type === 'bookstore' ? 'Independent bookstore' :
           type === 'cafe'      ? 'Coffee shop'           : '');

        return {
          id: place.id,
          name,
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
// Haversine distance in miles between two [lat, lng] points
const distanceMiles = ([lat1, lng1], [lat2, lng2]) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const searchAlongRoute = async (routePoints, radiusMiles = 5) => {
  if (!routePoints.length) return [];

  // Sample one point every SAMPLE_INTERVAL miles so coverage is consistent
  // regardless of how many geometry points the route has (simplified vs full).
  // With radiusMiles=5 and SAMPLE_INTERVAL=10, adjacent circles overlap, ensuring
  // no gap larger than the search radius.
  const SAMPLE_INTERVAL = 10; // miles between sample points
  const samplePoints = [routePoints[0]];
  let accumulated = 0;
  for (let i = 1; i < routePoints.length; i++) {
    accumulated += distanceMiles(routePoints[i - 1], routePoints[i]);
    if (accumulated >= SAMPLE_INTERVAL) {
      samplePoints.push(routePoints[i]);
      accumulated = 0;
    }
  }
  // Always include the last point
  const last = routePoints[routePoints.length - 1];
  if (samplePoints[samplePoints.length - 1] !== last) samplePoints.push(last);

  console.log(`[searchAlongRoute] ${routePoints.length} route points → ${samplePoints.length} samples @ ${SAMPLE_INTERVAL}mi intervals`);

  // Run all searches in parallel then deduplicate
  const results = await Promise.all(
    samplePoints.map((pt) => searchNearbyPlaces(pt[0], pt[1], radiusMiles))
  );

  const seenIds = new Set();
  const allPlaces = [];
  for (const places of results) {
    for (const place of places) {
      if (!seenIds.has(place.id)) {
        seenIds.add(place.id);
        allPlaces.push(place);
      }
    }
  }
  return allPlaces;
};
