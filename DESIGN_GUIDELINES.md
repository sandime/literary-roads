# Literary Roads Design Guidelines

## Icons & Visual Elements

### ✅ USE:
- Custom SVG icons from `src/components/Icons.jsx`
- Example: `<BookIcon size={24} />`

### ❌ NEVER USE:
- Emojis in UI

## Modal/Sheet Scrolling Pattern

**Pattern that works:**
```css
.container {
  overflow-y: auto;
  max-height: 90vh;
}

.sticky-header {
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.sticky-footer {
  position: sticky;
  bottom: 0;
  background: white;
  z-index: 1;
}
```

**Applied to:**
- Waypoints modal ✓
- Navigate trip page (in progress)

## Color Palette
- Teal: #00F0FF
- Orange: #FF5E00
- Pink: #FF2A9D
- Cream: #FFFDE7

## Custom Icons
- BookIcon, ClosedBookIcon, OpenBookIcon
- CoffeeIcon, CarIcon, PlayIcon
- CameraIcon, PinIcon, ProfileIcon
- BackArrowIcon, CloseIcon
- SparkleIcon, RefreshIcon
