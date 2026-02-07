// server/seed-routes-with-geometry.ts
// Seeds popular Ghana routes with Mapbox directions geometry into the database
import { storage } from "./storage";
import { testConnection, closeDb } from "./db";
import { getRouteDetails } from "./mapbox-directions";

interface RouteDefinition {
  name: string;
  startLocation: string;
  endLocation: string;
  busType: string;
  stops: { name: string; lat: number; lng: number }[];
}

// Popular Ghana routes with known coordinates for stops
const POPULAR_ROUTES: RouteDefinition[] = [
  {
    name: "Circle - Tema",
    startLocation: "Circle Neoplan Station",
    endLocation: "Tema Community 1 Station",
    busType: "standard",
    stops: [
      { name: "Circle Neoplan Station", lat: 5.568833, lng: -0.219167 },
      { name: "37 Lorry Station", lat: 5.589, lng: -0.1794 },
      { name: "Tetteh Quarshie Interchange", lat: 5.6111, lng: -0.1778 },
      { name: "Spintex Road Station", lat: 5.6250, lng: -0.1100 },
      { name: "Tema Community 1 Station", lat: 5.6698, lng: -0.0166 },
    ],
  },
  {
    name: "Kaneshie - Madina",
    startLocation: "Kaneshie Lorry Station",
    endLocation: "Madina Station",
    busType: "standard",
    stops: [
      { name: "Kaneshie Lorry Station", lat: 5.55667, lng: -0.22472 },
      { name: "Circle Neoplan Station", lat: 5.568833, lng: -0.219167 },
      { name: "37 Lorry Station", lat: 5.589, lng: -0.1794 },
      { name: "Legon - University of Ghana", lat: 5.6505, lng: -0.1870 },
      { name: "Madina Station", lat: 5.6731273, lng: -0.1663851 },
    ],
  },
  {
    name: "Circle - Kasoa",
    startLocation: "Circle Neoplan Station",
    endLocation: "Kasoa",
    busType: "standard",
    stops: [
      { name: "Circle Neoplan Station", lat: 5.568833, lng: -0.219167 },
      { name: "Kaneshie Lorry Station", lat: 5.55667, lng: -0.22472 },
      { name: "Odorkor Station", lat: 5.5750, lng: -0.2750 },
      { name: "Mallam Junction", lat: 5.5700, lng: -0.3000 },
      { name: "Kasoa", lat: 5.5340, lng: -0.4190 },
    ],
  },
  {
    name: "Accra - Kumasi (VIP)",
    startLocation: "Circle VIP Station",
    endLocation: "Kumasi Central (Kejetia)",
    busType: "luxury",
    stops: [
      { name: "Circle VIP Station", lat: 5.5670, lng: -0.2180 },
      { name: "Achimota Terminal", lat: 5.6228, lng: -0.2262 },
      { name: "Nsawam", lat: 5.8090, lng: -0.3530 },
      { name: "Suhum", lat: 6.0380, lng: -0.4510 },
      { name: "Nkawkaw", lat: 6.5510, lng: -0.7680 },
      { name: "Kumasi Central (Kejetia)", lat: 6.6885, lng: -1.6244 },
    ],
  },
  {
    name: "Accra - Cape Coast",
    startLocation: "Tudu Lorry Station",
    endLocation: "Cape Coast Station",
    busType: "standard",
    stops: [
      { name: "Tudu Lorry Station", lat: 5.55036, lng: -0.20664 },
      { name: "Kaneshie Lorry Station", lat: 5.55667, lng: -0.22472 },
      { name: "Kasoa", lat: 5.5340, lng: -0.4190 },
      { name: "Winneba", lat: 5.3530, lng: -0.6260 },
      { name: "Cape Coast Station", lat: 5.1053, lng: -1.2466 },
    ],
  },
  {
    name: "Madina - Adenta",
    startLocation: "Madina Station",
    endLocation: "Adenta Lorry Station",
    busType: "minibus",
    stops: [
      { name: "Madina Station", lat: 5.6731273, lng: -0.1663851 },
      { name: "Adenta Lorry Station", lat: 5.70597, lng: -0.16574 },
    ],
  },
  {
    name: "Lapaz - Achimota",
    startLocation: "Lapaz Station",
    endLocation: "Achimota Terminal",
    busType: "minibus",
    stops: [
      { name: "Lapaz Station", lat: 5.609507, lng: -0.250754 },
      { name: "Achimota Terminal", lat: 5.6228, lng: -0.2262 },
    ],
  },
  {
    name: "Circle - Osu",
    startLocation: "Circle Neoplan Station",
    endLocation: "Osu Oxford Street",
    busType: "minibus",
    stops: [
      { name: "Circle Neoplan Station", lat: 5.568833, lng: -0.219167 },
      { name: "Ridge Hospital Stop", lat: 5.5595, lng: -0.1950 },
      { name: "Osu Oxford Street", lat: 5.5556, lng: -0.1850 },
    ],
  },
  {
    name: "Achimota - East Legon",
    startLocation: "Achimota Terminal",
    endLocation: "East Legon Station",
    busType: "minibus",
    stops: [
      { name: "Achimota Terminal", lat: 5.6228, lng: -0.2262 },
      { name: "Legon - University of Ghana", lat: 5.6505, lng: -0.1870 },
      { name: "East Legon Station", lat: 5.6350, lng: -0.1550 },
    ],
  },
  {
    name: "Kaneshie - Dansoman",
    startLocation: "Kaneshie Lorry Station",
    endLocation: "Dansoman Control Stop",
    busType: "minibus",
    stops: [
      { name: "Kaneshie Lorry Station", lat: 5.55667, lng: -0.22472 },
      { name: "Dansoman Control Stop", lat: 5.5550, lng: -0.2650 },
    ],
  },
  {
    name: "Accra - Takoradi",
    startLocation: "Tudu Lorry Station",
    endLocation: "Takoradi Station",
    busType: "standard",
    stops: [
      { name: "Tudu Lorry Station", lat: 5.55036, lng: -0.20664 },
      { name: "Kasoa", lat: 5.5340, lng: -0.4190 },
      { name: "Cape Coast Station", lat: 5.1053, lng: -1.2466 },
      { name: "Takoradi Station", lat: 4.8917, lng: -1.7583 },
    ],
  },
  {
    name: "Circle - Spintex",
    startLocation: "Circle Neoplan Station",
    endLocation: "Spintex Road Station",
    busType: "minibus",
    stops: [
      { name: "Circle Neoplan Station", lat: 5.568833, lng: -0.219167 },
      { name: "37 Lorry Station", lat: 5.589, lng: -0.1794 },
      { name: "Tetteh Quarshie Interchange", lat: 5.6111, lng: -0.1778 },
      { name: "Spintex Road Station", lat: 5.6250, lng: -0.1100 },
    ],
  },
];

async function seedRoutesWithGeometry() {
  try {
    console.log("🌱 Starting Route Seeding with Mapbox Geometry...\n");

    const isConnected = await testConnection();
    if (!isConnected) {
      console.error("❌ Database connection failed.");
      return;
    }

    // Also seed bus stops first
    console.log("🚏 Seeding bus stops...\n");

    const GHANA_BUS_STOPS = [
      { name: "Tudu Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.55036, lng: -0.20664 }, aliases: ["Tudu"] },
      { name: "Kinbu Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.550306, lng: -0.207403 }, aliases: ["Kinbu"] },
      { name: "CMB Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5500, lng: -0.2050 }, aliases: ["CMB"] },
      { name: "Accra Central Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5500, lng: -0.2050 }, aliases: ["Accra Station", "Central Accra"] },
      { name: "National Theatre", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5526, lng: -0.2001 } },
      { name: "Independence Square", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5420, lng: -0.1980 }, aliases: ["Black Star Square"] },
      { name: "Makola Market", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5480, lng: -0.2020 }, aliases: ["Makola"] },
      { name: "Ridge Hospital Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5595, lng: -0.1950 }, aliases: ["Ridge Hospital"] },
      { name: "37 Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.589, lng: -0.1794 }, aliases: ["37", "37 Military Hospital"] },
      { name: "Circle Neoplan Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.568833, lng: -0.219167 }, aliases: ["Circle", "Neoplan", "Kwame Nkrumah Circle"] },
      { name: "Circle VIP Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5670, lng: -0.2180 }, aliases: ["VIP Station"] },
      { name: "Kaneshie Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.55667, lng: -0.22472 }, aliases: ["Kaneshie", "Kaneshie Market"] },
      { name: "Odorkor Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5750, lng: -0.2750 }, aliases: ["Odorkor"] },
      { name: "Darkuman Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5780, lng: -0.2550 } },
      { name: "Dansoman Control Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5550, lng: -0.2650 }, aliases: ["Control"] },
      { name: "Mallam Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5700, lng: -0.3000 }, aliases: ["Mallam"] },
      { name: "Lapaz Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.609507, lng: -0.250754 }, aliases: ["Lapaz"] },
      { name: "Achimota Terminal", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.6228, lng: -0.2262 }, aliases: ["Achimota"] },
      { name: "Achimota Old Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6265, lng: -0.2195 } },
      { name: "Tesano Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5950, lng: -0.2200 } },
      { name: "Abeka Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5880, lng: -0.2250 } },
      { name: "Legon - University of Ghana", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6505, lng: -0.1870 }, aliases: ["Legon", "UG"] },
      { name: "Atomic Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6565, lng: -0.1874 }, aliases: ["Atomic"] },
      { name: "Madina Station", city: "Madina", region: "Greater Accra", type: "Terminal", location: { lat: 5.6731273, lng: -0.1663851 }, aliases: ["Madina", "Zongo Junction"] },
      { name: "Adenta Lorry Station", city: "Adenta", region: "Greater Accra", type: "Terminal", location: { lat: 5.70597, lng: -0.16574 }, aliases: ["Adenta"] },
      { name: "Kotoka Airport", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6052, lng: -0.1668 }, aliases: ["KIA", "Accra Airport"] },
      { name: "Tetteh Quarshie Interchange", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6111, lng: -0.1778 }, aliases: ["Tetteh Quarshie", "Accra Mall"] },
      { name: "American House Station", city: "East Legon", region: "Greater Accra", type: "Station", location: { lat: 5.6420, lng: -0.1380 }, aliases: ["American House"] },
      { name: "East Legon Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6350, lng: -0.1550 } },
      { name: "Spintex Road Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6250, lng: -0.1100 }, aliases: ["Spintex"] },
      { name: "Osu Oxford Street", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5556, lng: -0.1850 }, aliases: ["Oxford Street", "Osu"] },
      { name: "Labadi Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5600, lng: -0.1400 }, aliases: ["Labadi"] },
      { name: "Nungua Station", city: "Nungua", region: "Greater Accra", type: "Terminal", location: { lat: 5.5894, lng: -0.0750 }, aliases: ["Nungua"] },
      { name: "Tema Community 1 Station", city: "Tema", region: "Greater Accra", type: "Terminal", location: { lat: 5.6698, lng: -0.0166 }, aliases: ["Tema Station", "Community 1"] },
      { name: "Ashaiman Station", city: "Ashaiman", region: "Greater Accra", type: "Terminal", location: { lat: 5.6942, lng: -0.0389 } },
      { name: "Korle Bu Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5350, lng: -0.2280 }, aliases: ["Korle Bu"] },
      { name: "Kasoa", city: "Kasoa", region: "Central", type: "Terminal", location: { lat: 5.5340, lng: -0.4190 }, aliases: ["Kasoa Station"] },
      { name: "Winneba", city: "Winneba", region: "Central", type: "Station", location: { lat: 5.3530, lng: -0.6260 } },
      { name: "Nsawam", city: "Nsawam", region: "Eastern", type: "Station", location: { lat: 5.8090, lng: -0.3530 } },
      { name: "Suhum", city: "Suhum", region: "Eastern", type: "Station", location: { lat: 6.0380, lng: -0.4510 } },
      { name: "Nkawkaw", city: "Nkawkaw", region: "Eastern", type: "Station", location: { lat: 6.5510, lng: -0.7680 } },
      { name: "Kumasi Central (Kejetia)", city: "Kumasi", region: "Ashanti", type: "Terminal", location: { lat: 6.6885, lng: -1.6244 }, aliases: ["Kejetia", "Kumasi Station"] },
      { name: "Takoradi Station", city: "Takoradi", region: "Western", type: "Terminal", location: { lat: 4.8917, lng: -1.7583 } },
      { name: "Cape Coast Station", city: "Cape Coast", region: "Central", type: "Terminal", location: { lat: 5.1053, lng: -1.2466 } },
      { name: "Tamale Station", city: "Tamale", region: "Northern", type: "Terminal", location: { lat: 9.4075, lng: -0.8533 } },
      { name: "Koforidua Station", city: "Koforidua", region: "Eastern", type: "Terminal", location: { lat: 6.0940, lng: -0.2610 } },
      { name: "Ho Station", city: "Ho", region: "Volta", type: "Terminal", location: { lat: 6.6111, lng: 0.4722 } },
    ];

    await storage.clearBusStops();
    for (const stop of GHANA_BUS_STOPS) {
      await storage.createBusStop({
        ...stop,
        searchTerms: `${stop.name} ${stop.city} ${stop.region} ${(stop as any).aliases?.join(' ') || ''}`.toLowerCase(),
      });
    }
    console.log(`   ✅ Seeded ${GHANA_BUS_STOPS.length} bus stops\n`);

    // Seed routes with Mapbox geometry
    console.log("🗺️  Fetching Mapbox directions for routes...\n");

    let successCount = 0;
    let failCount = 0;

    for (const routeDef of POPULAR_ROUTES) {
      try {
        // Build coordinates array for Mapbox directions
        const coordinates: [number, number][] = routeDef.stops.map(s => [s.lng, s.lat]);

        console.log(`   📍 ${routeDef.name}: ${routeDef.startLocation} → ${routeDef.endLocation}`);

        // Fetch road-following geometry from Mapbox
        let geometry: [number, number][] | null = null;
        let distance: number | null = null;
        let duration: number | null = null;

        try {
          const routeDetails = await getRouteDetails(coordinates);
          if (routeDetails) {
            geometry = routeDetails.geometry;
            distance = routeDetails.distance;
            duration = routeDetails.duration;
            console.log(`      ✅ Got ${geometry.length} geometry points, ${distance}km, ${duration}min`);
          }
        } catch (mapboxErr) {
          console.warn(`      ⚠️  Mapbox directions failed, using straight-line fallback`);
        }

        // Create the route in the database
        const stops = routeDef.stops.map((s, i) => ({
          name: s.name,
          location: { lat: s.lat, lng: s.lng },
          order: i,
        }));

        await storage.createRoute({
          name: routeDef.name,
          startLocation: routeDef.startLocation,
          endLocation: routeDef.endLocation,
          distance: distance ? distance.toString() : null,
          estimatedDuration: duration || null,
          busType: routeDef.busType,
          geometry: geometry || coordinates,
          stops,
        });

        successCount++;
      } catch (err: any) {
        console.error(`      ❌ Failed to seed route "${routeDef.name}": ${err.message}`);
        failCount++;
      }

      // Small delay to respect Mapbox rate limits
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n🎉 Seeding complete! ${successCount} routes seeded, ${failCount} failed.`);
    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedRoutesWithGeometry();
