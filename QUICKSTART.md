# QUICK START GUIDE - The Literary Roads

## What You Have Now

I've built you a complete Phase 1 MVP with:
- A gorgeous Googie-themed loading screen (the Odometer)
- An interactive map with your color scheme
- Sample bookstore/cafe locations in Louisville
- Route plotting functionality
- Mobile-responsive design

## Your Next Steps (In Order!)

### Step 1: Get Your Firebase Config (5 minutes)

1. Go to https://console.firebase.google.com
2. Click on your project (the one you used for the landing page)
3. Click the gear icon ⚙️ → "Project settings"
4. Scroll down to "Your apps"
5. If you don't have a web app yet, click "Add app" → Web (</> icon)
6. Copy the `firebaseConfig` object
7. Open the file: `src/config/firebase.js`
8. Replace the placeholder with your real config

**It should look like this:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",  // Your actual key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Step 2: Install Dependencies (2 minutes)

Open Terminal and:
```bash
cd /path/to/literary-roads  # Navigate to the folder
npm install
```

This will download all the necessary packages.

### Step 3: Run the App! (30 seconds)

```bash
npm run dev
```

Then open your browser to: http://localhost:5173

You should see:
1. The odometer rolling to 1955
2. The fuel gauge filling up
3. Then the map appears!

### Step 4: Test It Out

- Click anywhere on the map to plot a route
- Click the location markers to see bookstore/cafe details
- The "Clear Route" button removes your path

## Customizing Your App

### Adding Real Bookstores

Right now it shows 3 sample locations in Louisville. To add more:

**Option 1: Hardcoded (Quick & Easy)**
Edit `src/screens/MasterMap.jsx` and add to the `SAMPLE_LOCATIONS` array:

```javascript
{
  id: 4,
  name: "Your Bookstore Name",
  type: 'bookstore', // or 'cafe' or 'landmark'
  lat: 38.1234,      // Get from Google Maps
  lng: -85.5678,
  address: "123 Main St, City, State",
  description: "A cool indie bookstore",
}
```

**Option 2: Firebase (Scalable)**
1. Go to Firebase Console → Firestore Database
2. Create a new collection called "locations"
3. Add documents with the same structure as above
4. Update the map code to fetch from Firestore (I can help with this next)

### Changing Colors

Edit `src/config/config.js` to change the color scheme

### Turning On Features Later

Edit `src/config/config.js` and change `false` to `true`:

```javascript
SHOW_LOGIN: true,  // Now login screen appears!
```

## Deploying to GitHub Pages

When you're ready to publish:

1. **Update vite.config.js:**
   ```javascript
   base: '/literary-roads/',  // Your repo name
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Deploy the `dist` folder to GitHub Pages**

## Troubleshooting

**"Module not found" errors:**
→ Run `npm install` again

**Map not showing:**
→ Check your internet connection (map tiles load from the web)

**Firebase errors:**
→ Make sure you replaced the config in `firebase.js`

**Port already in use:**
→ Try: `npm run dev -- --port 3000`

## What's Next?

Once Phase 1 is working and you've added some real bookstore data, we can move to:

**Phase 2: Social Features**
- User login
- Check-ins
- Passport stamps
- Star ratings

Let me know when you're ready!

---

Questions? Just ask! 🚗📚
