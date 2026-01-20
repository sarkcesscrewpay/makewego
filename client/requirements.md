## Packages
leaflet | Core mapping library
react-leaflet | React components for Leaflet maps
@types/leaflet | TypeScript definitions for Leaflet
framer-motion | For beautiful page transitions and micro-interactions
date-fns | For date formatting and manipulation

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["'Outfit', sans-serif"],
  body: ["'DM Sans', sans-serif"],
}
Leaflet CSS will need to be imported in index.css or via CDN in index.html (I'll add it to index.css if possible, or assume it's handled).
The app uses a "Passenger" vs "Admin" role system.
