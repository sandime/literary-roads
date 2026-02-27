// Wikipedia API integration for literary landmarks

// Search for literary landmarks near a location
export const searchLiteraryLandmarks = async (lat, lng, radiusMiles = 5) => {
console.log('→ searchLiteraryLandmarks called for', lat, lng);
  const radiusMeters = Math.round(radiusMiles * 1609.34);
  
  try {
    // Wikipedia's geosearch API
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?` +
      `action=query&` +
      `list=geosearch&` +
      `gscoord=${lat}|${lng}&` +
      `gsradius=${Math.min(radiusMeters, 10000)}&` + // Max 10km per request
      `gslimit=50&` +
      `format=json&` +
      `origin=*`
    );
    
    const data = await response.json();
    console.log('  Wikipedia API response:', data);
    if (!data.query || !data.query.geosearch) 
      {
      return [];
    }
    
    console.log('Wikipedia found', data.query.geosearch.length, 'places near', lat, lng);
    
    // Literary keywords - check title first
    const literaryKeywords = [
      'hemingway', 'twain', 'poe', 'fitzgerald', 'faulkner',
      'dickinson', 'whitman', 'thoreau', 'emerson', 'alcott',
      'steinbeck', 'kerouac', 'salinger', 'morrison', 'angelou',
      'hawthorne', 'melville', 'london', 'o\'connor', 'williams',
      'literary', 'literature', 'author', 'writer', 'poet'
    ];
    
    const literaryPlaces = [];
    
    for (const place of data.query.geosearch) {
      const titleLower = place.title.toLowerCase();
      console.log('  Checking:', place.title);
      
      // Check if title contains literary keywords
      const isLiterary = literaryKeywords.some(keyword => titleLower.includes(keyword));
      
      console.log('    Literary?', isLiterary);
      
      if (isLiterary) {
        // Get description
        try {
          const detailResponse = await fetch(
            `https://en.wikipedia.org/w/api.php?` +
            `action=query&` +
            `pageids=${place.pageid}&` +
            `prop=extracts&` +
            `exintro=1&` +
            `explaintext=1&` +
            `exsentences=2&` +
            `format=json&` +
            `origin=*`
          );
          
          const detailData = await detailResponse.json();
          const page = detailData.query?.pages?.[place.pageid];
          const extract = page?.extract || place.title;
          
          console.log('    ✓ ADDING:', place.title);
          
          literaryPlaces.push({
            id: `wiki_${place.pageid}`,
            name: place.title,
            type: 'landmark',
            lat: place.lat,
            lng: place.lon,
            address: place.title,
            description: extract.substring(0, 150) + (extract.length > 150 ? '...' : ''),
            source: 'wikipedia',
            url: `https://en.wikipedia.org/?curid=${place.pageid}`
          });
        } catch (err) {
          console.error('    Error getting details:', err);
        }
      }
    }
    
    console.log('Wikipedia returning', literaryPlaces.length, 'literary places');
    return literaryPlaces;
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return [];
  }
};

// Search along a route for literary landmarks
export const searchLiteraryAlongRoute = async (routePoints, radiusMiles = 5) => {
  // Sample every few points to avoid too many API calls
  const samplePoints = routePoints.filter((_, index) => index % 3 === 0);
  
  console.log('Searching Wikipedia along', samplePoints.length, 'points');
  
  const allLandmarks = [];
  const seenIds = new Set();
  
  for (const point of samplePoints) {
    console.log('Searching point:', point[0], point[1]);
    const landmarks = await searchLiteraryLandmarks(point[0], point[1], radiusMiles);
    
    // Deduplicate
    landmarks.forEach(landmark => {
      if (!seenIds.has(landmark.id)) {
        seenIds.add(landmark.id);
        allLandmarks.push(landmark);
      }
    });
    
    // Small delay to be nice to Wikipedia's servers
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('Total Wikipedia landmarks found:', allLandmarks.length);
  return allLandmarks;
};
