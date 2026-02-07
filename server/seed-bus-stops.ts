// server/seed-bus-stops.ts
// Comprehensive Ghana Bus Stops Database with emphasis on Greater Accra
import { storage } from "./storage";
import { testConnection, closeDb } from "./db";

interface BusStop {
  name: string;
  city: string;
  region: string;
  type: "Terminal" | "Stop" | "Station";
  location: { lat: number; lng: number };
  aliases?: string[];
}

const GHANA_BUS_STOPS: BusStop[] = [
  // ============================================================
  // GREATER ACCRA REGION - Major Terminals & Stations
  // ============================================================

  // Accra Central & Downtown
  { name: "Tudu Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.55036, lng: -0.20664 }, aliases: ["Tudu"] },
  { name: "Kinbu Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.550306, lng: -0.207403 }, aliases: ["Kinbu"] },
  { name: "CMB Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5500, lng: -0.2050 }, aliases: ["CMB"] },
  { name: "Accra Central Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5500, lng: -0.2050 }, aliases: ["Accra Station", "Central Accra"] },
  { name: "Accra New Tema Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5459, lng: -0.1983 }, aliases: ["Tema Station Accra"] },
  { name: "National Theatre", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5526, lng: -0.2001 } },
  { name: "Independence Square", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5420, lng: -0.1980 }, aliases: ["Black Star Square", "Independence Arch"] },
  { name: "Kwame Nkrumah Memorial Park", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5446, lng: -0.2041 }, aliases: ["Mausoleum"] },
  { name: "Makola Market", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5480, lng: -0.2020 }, aliases: ["Makola"] },
  { name: "Arts Centre", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5430, lng: -0.2010 } },

  // Ridge & Cantonments (Corporate & Medical)
  { name: "Ridge Hospital Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5595, lng: -0.1950 }, aliases: ["Ridge Hospital", "Greater Accra Regional Hospital"] },
  { name: "37 Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.589, lng: -0.1794 }, aliases: ["37", "37 Military Hospital"] },
  { name: "Police Headquarters Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5750, lng: -0.1850 } },
  { name: "Flagstaff House", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5780, lng: -0.1860 }, aliases: ["Jubilee House", "Presidency"] },
  { name: "Cantonments Post Office", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5780, lng: -0.1700 } },
  { name: "American Embassy Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5850, lng: -0.1650 }, aliases: ["US Embassy"] },

  // Circle & Surrounds
  { name: "Circle Neoplan Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.568833, lng: -0.219167 }, aliases: ["Circle", "Neoplan", "Kwame Nkrumah Circle"] },
  { name: "Circle VIP Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5670, lng: -0.2180 }, aliases: ["VIP Station"] },
  { name: "Circle Overhead Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5615, lng: -0.2100 } },
  { name: "Paloma Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5650, lng: -0.1980 } },

  // Kaneshie, Odorkor, Dansoman (West)
  { name: "Kaneshie Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.55667, lng: -0.22472 }, aliases: ["Kaneshie", "Kaneshie Market"] },
  { name: "Odorkor Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5750, lng: -0.2750 }, aliases: ["Odorkor"] },
  { name: "Darkuman Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5780, lng: -0.2550 } },
  { name: "Dansoman Control Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5550, lng: -0.2650 }, aliases: ["Control"] },
  { name: "Dansoman Exhibition", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5480, lng: -0.2750 } },
  { name: "Mataheko Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5600, lng: -0.2450 } },
  { name: "Mallam Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5700, lng: -0.3000 }, aliases: ["Mallam"] },
  { name: "McCarthy Hill", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5750, lng: -0.3250 } },

  // Lapaz, Achimota, Tesano (North-West)
  { name: "Lapaz Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.609507, lng: -0.250754 }, aliases: ["Lapaz"] },
  { name: "Achimota Terminal", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.6228, lng: -0.2262 }, aliases: ["Achimota", "Achimota New Station"] },
  { name: "Achimota Old Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6265, lng: -0.2195 } },
  { name: "Tesano Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5950, lng: -0.2200 } },
  { name: "Abeka Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5880, lng: -0.2250 } },

  // Legon, Madina, Adenta (North-East)
  { name: "Legon - University of Ghana", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6505, lng: -0.1870 }, aliases: ["Legon", "UG"] },
  { name: "Atomic Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6565, lng: -0.1874 }, aliases: ["Atomic"] },
  { name: "Madina Station", city: "Madina", region: "Greater Accra", type: "Terminal", location: { lat: 5.6731273, lng: -0.1663851 }, aliases: ["Madina", "Zongo Junction"] },
  { name: "Adenta Lorry Station", city: "Adenta", region: "Greater Accra", type: "Terminal", location: { lat: 5.70597, lng: -0.16574 }, aliases: ["Adenta"] },
  { name: "UPSA Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6650, lng: -0.1700 } },

  // Airport, East Legon, Spintex (East)
  { name: "Kotoka Airport", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6052, lng: -0.1668 }, aliases: ["KIA", "Accra Airport"] },
  { name: "Airport City Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6020, lng: -0.1750 }, aliases: ["Marina Mall"] },
  { name: "Tetteh Quarshie Interchange", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6111, lng: -0.1778 }, aliases: ["Tetteh Quarshie", "Accra Mall"] },
  { name: "Shiashie Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6150, lng: -0.1750 }, aliases: ["Shiashie"] },
  { name: "American House Station", city: "East Legon", region: "Greater Accra", type: "Station", location: { lat: 5.6420, lng: -0.1380 }, aliases: ["American House"] },
  { name: "East Legon Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6350, lng: -0.1550 } },
  { name: "Spintex Road Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6250, lng: -0.1100 }, aliases: ["Spintex"] },
  { name: "Flower Pot", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6150, lng: -0.1300 } },
  { name: "Junction Mall", city: "Nungua", region: "Greater Accra", type: "Stop", location: { lat: 5.6050, lng: -0.0650 } },

  // Osu, Labadi, Nungua (Coast)
  { name: "Osu Oxford Street", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5556, lng: -0.1850 }, aliases: ["Oxford Street", "Osu"] },
  { name: "Labadi Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5600, lng: -0.1400 }, aliases: ["Labadi"] },
  { name: "La Beach", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5550, lng: -0.1350 } },
  { name: "Nungua Station", city: "Nungua", region: "Greater Accra", type: "Terminal", location: { lat: 5.5894, lng: -0.0750 }, aliases: ["Nungua"] },
  { name: "Teshie Station", city: "Teshie", region: "Greater Accra", type: "Station", location: { lat: 5.5844, lng: -0.1050 }, aliases: ["Teshie"] },

  // Tema & Ashaiman
  { name: "Tema Community 1 Station", city: "Tema", region: "Greater Accra", type: "Terminal", location: { lat: 5.6698, lng: -0.0166 }, aliases: ["Tema Station", "Community 1"] },
  { name: "Tema Community 9", city: "Tema", region: "Greater Accra", type: "Station", location: { lat: 5.6750, lng: -0.0050 } },
  { name: "Tema Harbour", city: "Tema", region: "Greater Accra", type: "Station", location: { lat: 5.6300, lng: 0.0100 } },
  { name: "Ashaiman Station", city: "Ashaiman", region: "Greater Accra", type: "Terminal", location: { lat: 5.6942, lng: -0.0389 } },

  // Korle Bu & Jamestown
  { name: "Korle Bu Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5350, lng: -0.2280 }, aliases: ["Korle Bu"] },
  { name: "Jamestown Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5350, lng: -0.2100 }, aliases: ["Lighthouse"] },

  // ============================================================
  // OTHER REGIONS (Selected Major Hubs)
  // ============================================================
  { name: "Kumasi Central (Kejetia)", city: "Kumasi", region: "Ashanti", type: "Terminal", location: { lat: 6.6885, lng: -1.6244 }, aliases: ["Kejetia", "Kumasi Station"] },
  { name: "Kejetia Market", city: "Kumasi", region: "Ashanti", type: "Terminal", location: { lat: 6.6900, lng: -1.6230 } },
  { name: "Takoradi Station", city: "Takoradi", region: "Western", type: "Terminal", location: { lat: 4.8917, lng: -1.7583 } },
  { name: "Cape Coast Station", city: "Cape Coast", region: "Central", type: "Terminal", location: { lat: 5.1053, lng: -1.2466 } },
  { name: "Tamale Station", city: "Tamale", region: "Northern", type: "Terminal", location: { lat: 9.4075, lng: -0.8533 } },
  { name: "Koforidua Station", city: "Koforidua", region: "Eastern", type: "Terminal", location: { lat: 6.0940, lng: -0.2610 } },
  { name: "Ho Station", city: "Ho", region: "Volta", type: "Terminal", location: { lat: 6.6111, lng: 0.4722 } },
];

const POPULAR_ROUTES = [
  { name: "Circle - Tema", start: "Circle Neoplan Station", end: "Tema Community 1 Station", via: ["37 Station", "Teshie Station"] },
  { name: "Kaneshie - Madina", start: "Kaneshie Lorry Station", end: "Madina Station", via: ["Circle Neoplan Station", "37 Station", "Legon - University of Ghana"] },
  { name: "Circle - Kasoa", start: "Circle Neoplan Station", end: "Kasoa Station", via: ["Kaneshie Lorry Station", "Odorkor Station"] },
  { name: "Accra - Kumasi", start: "Circle VIP Station", end: "Kumasi Central (Kejetia)", via: ["Nsawam", "Suhum", "Nkawkaw"] },
];

async function seed() {
  try {
    console.log("🌱 Starting SQL Bus Stops Seeding...");

    const isConnected = await testConnection();
    if (!isConnected) {
      console.error("❌ Database connection failed.");
      return;
    }

    console.log("🧹 Clearing old bus stops...");
    await storage.clearBusStops();

    console.log(`🚀 Seeding ${GHANA_BUS_STOPS.length} locations...`);
    for (const stop of GHANA_BUS_STOPS) {
      await storage.createBusStop({
        ...stop,
        searchTerms: `${stop.name} ${stop.city} ${stop.region} ${stop.aliases?.join(' ') || ''}`.toLowerCase(),
      });
      console.log(`   Added: ${stop.name}`);
    }

    console.log("✅ Seeding complete!");
    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
