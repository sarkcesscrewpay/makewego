
import { storage } from "./storage";
import { testConnection, closeDb } from "./db";

const ACCRA_DATA = [
    { name: "Tudu Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.55036, lng: -0.20664 }, aliases: ["Tudu"] },
    { name: "Kinbu Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.550306, lng: -0.207403 }, aliases: ["Kinbu"] },
    { name: "CMB Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5500, lng: -0.2050 }, aliases: ["CMB"] },
    { name: "37 Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.589, lng: -0.1794 }, aliases: ["37"] },
    { name: "Circle Neoplan Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.568833, lng: -0.219167 }, aliases: ["Circle", "Neoplan"] },
    { name: "Kaneshie Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.55667, lng: -0.22472 }, aliases: ["Kaneshie"] },
    { name: "Achimota Terminal", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.6228, lng: -0.2262 }, aliases: ["Achimota"] },
    { name: "Lapaz Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.609507, lng: -0.250754 }, aliases: ["Lapaz"] },
    { name: "Madina Station", city: "Madina", region: "Greater Accra", type: "Terminal", location: { lat: 5.6731273, lng: -0.1663851 }, aliases: ["Madina"] },
    { name: "Adenta Lorry Station", city: "Adenta", region: "Greater Accra", type: "Terminal", location: { lat: 5.70597, lng: -0.16574 }, aliases: ["Adenta"] },
    { name: "Circle - Owerhead Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5615, lng: -0.2100 } },
    { name: "Tetteh Quarshie Interchange", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6111, lng: -0.1778 }, aliases: ["Tetteh Quarshie"] },
    { name: "Dansoman Control Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5550, lng: -0.2650 }, aliases: ["Control"] },
    { name: "Mallam Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5700, lng: -0.3000 }, aliases: ["Mallam"] },
    { name: "Odorkor Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5750, lng: -0.2750 }, aliases: ["Odorkor"] },
    { name: "Ridge Hospital Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5595, lng: -0.1950 } },
    { name: "Korle Bu Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5350, lng: -0.2280 }, aliases: ["Korle Bu"] },
    { name: "Osu Oxford Street", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5556, lng: -0.1850 }, aliases: ["Oxford Street"] },
    { name: "American House Station", city: "East Legon", region: "Greater Accra", type: "Station", location: { lat: 5.6420, lng: -0.1380 }, aliases: ["American House"] },
    { name: "Shiashie Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6150, lng: -0.1750 }, aliases: ["Shiashie"] },
    { name: "Spintex Road Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6250, lng: -0.1100 }, aliases: ["Spintex"] },
    { name: "East Legon Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6350, lng: -0.1550 } },
    { name: "Atomic Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6565, lng: -0.1874 } },
    { name: "Legon - University of Ghana", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6505, lng: -0.1870 }, aliases: ["Legon"] },
    { name: "Achimota Old Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6265, lng: -0.2195 } },
];

async function seed() {
    try {
        console.log("🌱 Starting Accra Bus Stops Seeding...");

        const isConnected = await testConnection();
        if (!isConnected) {
            console.error("❌ Database connection failed. Aborting.");
            return;
        }

        console.log("🧹 Clearing old bus stops...");
        await storage.clearBusStops();

        console.log(`🚀 Seeding ${ACCRA_DATA.length} Accra locations...`);
        for (const stop of ACCRA_DATA) {
            await storage.createBusStop({
                ...stop,
                searchTerms: `${stop.name} ${stop.city} ${stop.aliases?.join(' ') || ''}`.toLowerCase(),
            });
            console.log(`   Added: ${stop.name}`);
        }

        console.log("✅ Accra seeding complete!");
        await closeDb();
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seed();
