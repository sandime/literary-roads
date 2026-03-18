# Design Guidelines

## Icons & Visual Elements

### ✅ USE:
- Custom SVG icons from `src/components/Icons.jsx`
- Example: `<BookIcon size={24} />`

### ❌ NEVER USE:
- Emojis (📚 ☕ 🎨)
- Font icons (Font Awesome, Material Icons)
- Generic stock icons

### Custom Icon Set:
- BookIcon, ClosedBookIcon, OpenBookIcon
- CoffeeIcon
- CarIcon
- CameraIcon
- PinIcon
- ProfileIcon
- BackArrowIcon
- CloseIcon
- SparkleIcon
- RefreshIcon
- PlayIcon
- [add others as created]

### Color Palette:
- Teal: #00F0FF
- Orange: #FF5E00
- Pink: #FF2A9D
- Cream: #FFFDE7

### When You Need a New Icon:
1. Request custom SVG design
2. Add to Icons.jsx
3. Use throughout app

NO EMOJIS. EVER.
```

---

## **💡 BENEFITS OF EMOJIS (Why people use them):**

### **Pros:**
- ✅ Quick/easy (no design work)
- ✅ Universal recognition
- ✅ Colorful/friendly
- ✅ Free

### **Cons:**
- ❌ Look different on every platform (iOS vs Android vs Windows)
- ❌ Generic/unprofessional
- ❌ No brand consistency
- ❌ Can't customize colors
- ❌ Can't control size/style
- ❌ Accessibility issues
- ❌ Every app looks the same

---

## **🎨 WHY CUSTOM ICONS ARE BETTER:**

### **Your Custom Icons:**
- ✅ **Unique brand identity** (retro/neon aesthetic)
- ✅ **Consistent across all devices** (SVG = same everywhere)
- ✅ **Customizable** (size, color if needed)
- ✅ **Professional appearance**
- ✅ **Better accessibility** (proper ARIA labels)
- ✅ **Memorable** (users remember YOUR style)
- ✅ **Scalable** (vector, not raster)

**Example:**
- Emoji: 📚 (looks different on iPhone vs Android)
- Your icon: Custom book with atomic burst (same everywhere, branded!)

---

## **🎯 WHEN EMOJIS ARE OKAY:**

### **ONLY in user-generated content:**

**Guestbook posts:**
```
"Love this bookstore! 📚❤️"
  ↑ User typed this - that's fine!
```

**Reviews/comments:**
```
User writes: "Best coffee ever ☕️"
  ↑ Their choice - allow it!
```

**But NOT in your UI:**
```
❌ Button text: "Add to favorites ❤️"
✅ Button: <HeartIcon size={16} /> "Add to favorites"
