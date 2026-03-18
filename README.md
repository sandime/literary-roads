# The Literary Roads
**Where every mile is a new chapter.**

A soulful navigation platform for the book-obsessed traveler. Built with React, Vite, Tailwind, and Firebase.

## 🎨 Phase 1: Core MVP - "The Open Road"

### What's Included (Currently Active):
- ✅ Odometer loading screen with 1950s dashboard aesthetic
- ✅ Interactive map with Googie design
- ✅ Location markers for bookstores, cafes, and landmarks
- ✅ Route plotting (click to draw your path)
- ✅ Responsive design

### What's Coming Later (Feature Flagged):
- 🔒 Login & Traveler's Log
- 🔒 Social features (check-ins, car icons)
- 🔒 Postcard Studio
- 🔒 Midnight Trivia
- 🔒 Premium features
- 🔒 Native mobile apps

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- A Firebase account (you already have this!)

### Installation

1. **Install dependencies:**
   ```bash
   cd literary-roads
   npm install
   ```

2. **Configure Firebase:**
   - Open `src/config/firebase.js`
   - Replace the placeholder config with your actual Firebase credentials
   - Get these from: Firebase Console → Project Settings → General → Your apps

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:5173`

4. **Build for production:**
   ```bash
   npm run build
   ```
   The production files will be in the `dist/` folder

## 📁 Project Structure

```
literary-roads/
├── src/
│   ├── screens/          # Main app screens
│   │   ├── Odometer.jsx  # Loading screen
│   │   └── MasterMap.jsx # Main map interface
│   ├── components/       # Reusable components (future)
│   ├── config/           # Configuration files
│   │   ├── config.js     # Feature flags & settings
│   │   └── firebase.js   # Firebase setup
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Entry point
├── public/               # Static assets
└── index.html           # HTML template
```

## Design System

See [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) for:
- Icon usage
- Modal patterns
- Color palette
- Best practices

## 🎨 Design System (Highway Googie)

### Colors
- **Midnight Navy** (#1A1B2E) - Primary background
- **Starlight Turquoise** (#40E0D0) - Neon accents, route lines
- **Atomic Orange** (#FF4E00) - Highlights, CTAs
- **Paper White** (#F5F5DC) - Text
- **Chrome Silver** (#C0C0C0) - Borders, details

### Typography
- **Bungee** - Neon headers
- **Special Elite** - Typewriter body text

## 🔧 Feature Flags

Edit `src/config/config.js` to turn features on/off:

```javascript
export const FEATURES = {
  SHOW_LOGIN: false,        // Set to true to enable login
  SHOW_TRIVIA: false,       // Set to true for trivia game
  SHOW_PREMIUM: false,      // Set to true for premium features
  // etc...
};
```

## 🗺️ Adding Real Data

Currently showing sample Louisville locations. To add real data:

1. Create a Firestore collection called `locations`
2. Add documents with this structure:
   ```json
   {
     "name": "Bookstore Name",
     "type": "bookstore", // or "cafe" or "landmark"
     "lat": 38.2527,
     "lng": -85.7585,
     "address": "123 Main St",
     "description": "A great indie bookstore"
   }
   ```
3. Update `MasterMap.jsx` to fetch from Firestore instead of using SAMPLE_LOCATIONS

## 📱 Deploying to GitHub Pages

1. **Update `vite.config.js`:**
   ```javascript
   base: '/literary-roads/', // Your repo name
   ```

2. **Build and deploy:**
   ```bash
   npm run build
   # Then upload the dist/ folder to GitHub Pages
   ```

## 🎯 Next Steps (Your Roadmap)

- [ ] Replace Firebase placeholder config with real credentials
- [ ] Test the app locally
- [ ] Add real bookstore data to Firestore
- [ ] Deploy to GitHub Pages
- [ ] Start collecting emails on landing page
- [ ] Move to Phase 2 (Social features)

## 🛠️ Tech Stack

- **Frontend**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Maps**: React-Leaflet
- **Backend**: Firebase (Firestore + Auth)
- **Deployment**: GitHub Pages (web) → React Native (later for mobile)

## 📝 License

© 2026 The Literary Roads. All rights reserved.

---

**Status**: Phase 1 MVP in progress 🚗💨
**Landing Page**: LIVE at theliteraryroads.com
**Mobile App**: Coming soon to iOS & Android
