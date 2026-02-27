# Adding Curated Literary Landmarks to Firebase

Your app now searches THREE sources for literary places:
1. **Google Places** - bookstores & cafes (automatic)
2. **Wikipedia** - literary landmarks (automatic)
3. **Firebase** - YOUR hand-picked favorites (manual)

## How to Add Curated Landmarks

### Step 1: Go to Firebase Console
1. Go to https://console.firebase.google.com
2. Select "The Literary Roads" project
3. Click "Firestore Database" in the left menu
4. Click "+ Start collection"

### Step 2: Create the Collection
- Collection ID: `literary_landmarks`
- Click "Next"

### Step 3: Add Your First Landmark
Click "Add document" and fill in these fields:

**Example: Ernest Hemingway Home**
```
Document ID: (Auto-generate)

Fields:
name: "Ernest Hemingway Home and Museum"
type: "landmark"
lat: 24.5511
lng: -81.8004
address: "907 Whitehead St, Key West, FL 33040"
description: "Ernest Hemingway lived and wrote here from 1931-1939. Home to the famous six-toed cats."
author: "Ernest Hemingway"
featured: true
```

### Step 4: Add More!

Here are 20 iconic American literary landmarks to get you started:

**East Coast:**
1. **Edgar Allan Poe House** - Baltimore, MD (39.2904, -76.6428)
2. **Walden Pond** - Concord, MA (42.4406, -71.3369) - Thoreau
3. **Emily Dickinson Museum** - Amherst, MA (42.3706, -72.5156)
4. **Mark Twain House** - Hartford, CT (41.7673, -72.7011)
5. **F. Scott Fitzgerald's Grave** - Rockville, MD (39.0840, -77.1528)

**South:**
6. **Hemingway Home** - Key West, FL (24.5511, -81.8004)
7. **Flannery O'Connor House** - Savannah, GA (32.0758, -81.0960)
8. **Tennessee Williams House** - New Orleans, LA (29.9584, -90.0644)
9. **William Faulkner's Rowan Oak** - Oxford, MS (34.3515, -89.5265)

**Midwest:**
10. **Carl Sandburg Birthplace** - Galesburg, IL (40.9478, -90.3712)
11. **Laura Ingalls Wilder Home** - Mansfield, MO (37.1064, -92.5818)
12. **Sinclair Lewis Boyhood Home** - Sauk Centre, MN (45.7383, -94.9522)

**West:**
13. **Jack London State Park** - Glen Ellen, CA (38.3547, -122.5422)
14. **John Steinbeck House** - Salinas, CA (36.6777, -121.6555)
15. **Beat Museum** - San Francisco, CA (37.7989, -122.4068) - Kerouac, Ginsberg
16. **Cormac McCarthy's El Paso** - El Paso, TX (31.7619, -106.4850)

**Northwest:**
17. **Tom Robbins Territory** - Seattle, WA (47.6062, -122.3321)

**Historical:**
18. **Louisa May Alcott's Orchard House** - Concord, MA (42.4595, -71.3489)
19. **Ralph Waldo Emerson House** - Concord, MA (42.4595, -71.3517)
20. **Nathaniel Hawthorne's House of Seven Gables** - Salem, MA (42.5195, -70.8967)

### Field Definitions:

- **name**: Full name of the landmark
- **type**: Always "landmark"
- **lat**: Latitude (get from Google Maps)
- **lng**: Longitude (get from Google Maps)
- **address**: Full street address
- **description**: 1-2 sentences about why it's literary significant
- **author** (optional): The author associated with this place
- **featured** (optional): true/false - should this be highlighted?

### How to Get Coordinates:
1. Go to Google Maps
2. Right-click on the location
3. Click the coordinates at the top
4. Copy the lat/lng numbers

## Priority System

When users plot a route, they'll see:
1. **Your curated landmarks FIRST** (highest quality)
2. Then Google bookstores/cafes
3. Then Wikipedia landmarks (fills gaps)

This gives you full editorial control while still having nationwide automatic coverage!

## Tips:
- Start with 10-20 iconic landmarks
- Add more as you find them
- Ask users to submit via "Road Scout" program later
- You review and approve before adding to Firebase
