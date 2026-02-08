// server/seed-greater-accra.ts
// Comprehensive seed script for 200+ Greater Accra bus stops, routes, and geometry
import { storage } from "./storage";
import { testConnection, closeDb } from "./db";
import { getRouteDetails } from "./mapbox-directions";

// ============================================================
// BUS STOPS - Greater Accra & Surroundings
// Coordinates sourced from known geographic data for Ghana
// ============================================================

const BUS_STOPS = [
  // === ACCRA CENTRAL / CBD ===
  { name: "Tudu Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.55036, lng: -0.20664 }, aliases: ["Tudu"] },
  { name: "Kinbu Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.550306, lng: -0.207403 }, aliases: ["Kinbu"] },
  { name: "CMB Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5500, lng: -0.2050 }, aliases: ["CMB"] },
  { name: "Accra Central Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5490, lng: -0.2055 }, aliases: ["Central Station"] },
  { name: "Makola Market", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5480, lng: -0.2020 }, aliases: ["Makola"] },
  { name: "National Theatre", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5526, lng: -0.2001 } },
  { name: "Independence Square", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5420, lng: -0.1980 }, aliases: ["Black Star Square"] },
  { name: "Jamestown", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5340, lng: -0.2120 }, aliases: ["James Town"] },
  { name: "Ridge Hospital Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5595, lng: -0.1950 }, aliases: ["Ridge Hospital", "Ridge"] },
  { name: "Korle Bu Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5350, lng: -0.2280 }, aliases: ["Korle Bu", "Korle Bu Hospital"] },
  { name: "Accra New Town", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5620, lng: -0.2130 }, aliases: ["New Town"] },

  // === CIRCLE / RING ROAD ===
  { name: "Circle Neoplan Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.568833, lng: -0.219167 }, aliases: ["Circle", "Neoplan", "Kwame Nkrumah Circle"] },
  { name: "Circle VIP Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.5670, lng: -0.2180 }, aliases: ["VIP Station", "VIP Bus"] },
  { name: "37 Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.589, lng: -0.1794 }, aliases: ["37", "37 Military Hospital"] },
  { name: "Kokomlemle", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5720, lng: -0.2100 }, aliases: ["Koko"] },
  { name: "Kotobabi", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5800, lng: -0.2180 }, aliases: ["Koto"] },
  { name: "Alajo", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5770, lng: -0.2250 } },
  { name: "Nima", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5780, lng: -0.2000 } },
  { name: "Mamobi", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5790, lng: -0.2050 } },

  // === OSU / CHRISTIANSBORG / LA ===
  { name: "Osu Oxford Street", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5556, lng: -0.1850 }, aliases: ["Oxford Street", "Osu"] },
  { name: "Christiansborg", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5480, lng: -0.1780 }, aliases: ["Osu Castle"] },
  { name: "La", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5560, lng: -0.1650 } },
  { name: "Labadi Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5600, lng: -0.1400 }, aliases: ["Labadi", "La Beach"] },

  // === KANESHIE / DANSOMAN / DARKUMAN / MAMPROBI ===
  { name: "Kaneshie Lorry Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.55667, lng: -0.22472 }, aliases: ["Kaneshie", "Kaneshie Market"] },
  { name: "Dansoman Control Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5550, lng: -0.2650 }, aliases: ["Control", "Dansoman"] },
  { name: "Darkuman Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5780, lng: -0.2550 }, aliases: ["Darkuman"] },
  { name: "Mamprobi", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5380, lng: -0.2380 } },
  { name: "Lartebiokorshie", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5520, lng: -0.2450 }, aliases: ["Larte"] },
  { name: "Mataheko", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5540, lng: -0.2550 } },
  { name: "Bubiashie", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5630, lng: -0.2350 } },
  { name: "Kwashieman", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5750, lng: -0.2620 }, aliases: ["Kwashie"] },
  { name: "Odorkor Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.5750, lng: -0.2750 }, aliases: ["Odorkor"] },

  // === LAPAZ / ACHIMOTA / DOME / TESANO ===
  { name: "Lapaz Station", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.609507, lng: -0.250754 }, aliases: ["Lapaz", "La Paz"] },
  { name: "Achimota Terminal", city: "Accra", region: "Greater Accra", type: "Terminal", location: { lat: 5.6228, lng: -0.2262 }, aliases: ["Achimota"] },
  { name: "Achimota Old Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6265, lng: -0.2195 } },
  { name: "Dome", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6350, lng: -0.2330 }, aliases: ["Dome Pillar 2"] },
  { name: "Tesano Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5950, lng: -0.2200 }, aliases: ["Tesano"] },
  { name: "Abeka Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5880, lng: -0.2250 }, aliases: ["Abeka"] },
  { name: "Dzorwulu", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5970, lng: -0.2020 } },
  { name: "Abelenkpe", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5980, lng: -0.1940 } },
  { name: "Akweteman", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6090, lng: -0.2310 } },

  // === SOWOTUOM / GBAWE / MALLAM / WEIJA ===
  { name: "Mallam Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5700, lng: -0.3000 }, aliases: ["Mallam"] },
  { name: "Gbawe", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5770, lng: -0.3130 } },
  { name: "Weija", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5670, lng: -0.3350 }, aliases: ["Weija Junction"] },
  { name: "Sowotuom", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6040, lng: -0.2780 } },
  { name: "Ablekuma", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5610, lng: -0.2850 } },
  { name: "Bortianor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5410, lng: -0.3620 } },
  { name: "Oblogo", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5580, lng: -0.3450 } },
  { name: "Tsokomey", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5350, lng: -0.3700 } },

  // === POKUASE / AMASAMAN / OFANKOR / MEDIE ===
  { name: "Pokuase", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6810, lng: -0.2920 }, aliases: ["Pokuase Interchange"] },
  { name: "Amasaman", city: "Amasaman", region: "Greater Accra", type: "Station", location: { lat: 5.7010, lng: -0.3050 } },
  { name: "Ofankor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6550, lng: -0.2700 } },
  { name: "Kutunse", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6730, lng: -0.2830 } },
  { name: "Medie", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7120, lng: -0.3130 } },
  { name: "Nsakina", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6930, lng: -0.2960 } },
  { name: "Ashalaja", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6890, lng: -0.3100 } },
  { name: "Oshiyie", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5620, lng: -0.3270 } },

  // === TAIFA / ATOMIC / HAATSO / DOME ===
  { name: "Taifa", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6480, lng: -0.2500 }, aliases: ["Taifa Junction"] },
  { name: "Atomic Junction", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6565, lng: -0.1874 }, aliases: ["Atomic"] },
  { name: "Haatso", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6580, lng: -0.2070 } },
  { name: "Kwabenya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6730, lng: -0.2230 } },
  { name: "Ashongman", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6800, lng: -0.2150 } },
  { name: "Pantang", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7000, lng: -0.2100 } },
  { name: "Nkwantanang", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6660, lng: -0.1720 } },

  // === LEGON / MADINA / ADENTA ===
  { name: "Legon - University of Ghana", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6505, lng: -0.1870 }, aliases: ["Legon", "UG"] },
  { name: "Madina Station", city: "Madina", region: "Greater Accra", type: "Terminal", location: { lat: 5.6731273, lng: -0.1663851 }, aliases: ["Madina", "Zongo Junction"] },
  { name: "Adenta Lorry Station", city: "Adenta", region: "Greater Accra", type: "Terminal", location: { lat: 5.70597, lng: -0.16574 }, aliases: ["Adenta", "Adentan"] },
  { name: "New Legon", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6620, lng: -0.1780 } },
  { name: "Papao", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6440, lng: -0.1790 } },

  // === EAST LEGON / SHIASHIE / AIRPORT AREA ===
  { name: "East Legon Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6350, lng: -0.1550 } },
  { name: "American House Station", city: "East Legon", region: "Greater Accra", type: "Station", location: { lat: 5.6420, lng: -0.1380 }, aliases: ["American House"] },
  { name: "Shiashie Stop", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6150, lng: -0.1750 }, aliases: ["Shiashie"] },
  { name: "Burma Camp", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5820, lng: -0.1650 } },
  { name: "Kotoka Airport", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6052, lng: -0.1668 }, aliases: ["KIA", "Airport"] },
  { name: "Tetteh Quarshie Interchange", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6111, lng: -0.1778 }, aliases: ["Tetteh Quarshie", "Accra Mall"] },
  { name: "Adjiringanor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6530, lng: -0.1380 } },

  // === SPINTEX / BAATSONAA / SAKUMONO ===
  { name: "Spintex Road Station", city: "Accra", region: "Greater Accra", type: "Station", location: { lat: 5.6250, lng: -0.1100 }, aliases: ["Spintex"] },
  { name: "Baatsonaa", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6170, lng: -0.0930 } },
  { name: "Sakumono", city: "Tema", region: "Greater Accra", type: "Stop", location: { lat: 5.6260, lng: -0.0470 }, aliases: ["Sakumono Estate"] },

  // === NUNGUA / TESHIE / LABADI ===
  { name: "Nungua Station", city: "Nungua", region: "Greater Accra", type: "Terminal", location: { lat: 5.5894, lng: -0.0750 }, aliases: ["Nungua"] },
  { name: "Teshie", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5760, lng: -0.1050 }, aliases: ["Teshie Nungua"] },

  // === TEMA / ASHAIMAN / KPONE ===
  { name: "Tema Community 1 Station", city: "Tema", region: "Greater Accra", type: "Terminal", location: { lat: 5.6698, lng: -0.0166 }, aliases: ["Tema Station", "Community 1"] },
  { name: "Tema Community 18", city: "Tema", region: "Greater Accra", type: "Stop", location: { lat: 5.6510, lng: -0.0080 } },
  { name: "Ashaiman Station", city: "Ashaiman", region: "Greater Accra", type: "Terminal", location: { lat: 5.6942, lng: -0.0389 } },
  { name: "Kpone", city: "Tema", region: "Greater Accra", type: "Stop", location: { lat: 5.6970, lng: 0.0410 } },

  // === DODOWA ROAD / OYIBI / ADENTA CORRIDOR ===
  { name: "Oyibi", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7380, lng: -0.1460 } },
  { name: "Ashaley Botwe", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6790, lng: -0.1550 }, aliases: ["Ashaley Botwe"] },
  { name: "Amrahia", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7210, lng: -0.1440 } },
  { name: "Katamanso", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7090, lng: -0.1210 } },
  { name: "Otinibi", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7350, lng: -0.1280 } },
  { name: "Oyarifa", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7070, lng: -0.1590 } },
  { name: "Bawaleshie", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6850, lng: -0.1600 } },
  { name: "Dodowa", city: "Dodowa", region: "Greater Accra", type: "Station", location: { lat: 5.8820, lng: -0.0980 }, aliases: ["Dodowa Station"] },

  // === AYAWASO / KOFORIDUA ROAD ===
  { name: "Ayawaso", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5920, lng: -0.2100 } },
  { name: "Mpehuasem", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6300, lng: -0.1640 } },
  { name: "Santeo", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7530, lng: -0.1230 } },

  // === PRAMPRAM / NINGO / ADA CORRIDOR ===
  { name: "Prampram", city: "Prampram", region: "Greater Accra", type: "Station", location: { lat: 5.7140, lng: 0.1210 } },
  { name: "Dawhenya", city: "Dawhenya", region: "Greater Accra", type: "Stop", location: { lat: 5.7290, lng: 0.0340 } },
  { name: "Dawa", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7190, lng: 0.0050 } },
  { name: "New Ningo", city: "Ningo", region: "Greater Accra", type: "Stop", location: { lat: 5.7830, lng: 0.0700 } },
  { name: "Old Ningo", city: "Ningo", region: "Greater Accra", type: "Stop", location: { lat: 5.7910, lng: 0.0790 } },
  { name: "Big Ada", city: "Ada", region: "Greater Accra", type: "Station", location: { lat: 5.7930, lng: 0.6260 }, aliases: ["Ada Foah"] },
  { name: "Ada Foah", city: "Ada", region: "Greater Accra", type: "Stop", location: { lat: 5.7870, lng: 0.6360 } },
  { name: "Ada Panya", city: "Ada", region: "Greater Accra", type: "Stop", location: { lat: 5.7840, lng: 0.5880 } },
  { name: "Sege", city: "Sege", region: "Greater Accra", type: "Stop", location: { lat: 5.7800, lng: 0.3370 } },
  { name: "Totope", city: "Totope", region: "Greater Accra", type: "Stop", location: { lat: 5.8030, lng: 0.2580 } },
  { name: "Matsekope", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8100, lng: 0.0480 } },
  { name: "Afienya", city: "Afienya", region: "Greater Accra", type: "Stop", location: { lat: 5.7580, lng: 0.0060 } },
  { name: "Asutsuare", city: "Asutsuare", region: "Greater Accra", type: "Stop", location: { lat: 6.1530, lng: 0.0470 } },
  { name: "Osudoku", city: "Osudoku", region: "Greater Accra", type: "Stop", location: { lat: 6.0700, lng: 0.1600 } },

  // === SHAI HILLS / DORYUMU CORRIDOR ===
  { name: "Shai Hills Station", city: "Shai Hills", region: "Greater Accra", type: "Stop", location: { lat: 5.8890, lng: 0.0520 } },
  { name: "Doryumu", city: "Doryumu", region: "Greater Accra", type: "Stop", location: { lat: 5.9120, lng: -0.0680 } },
  { name: "Ayikuma", city: "Ayikuma", region: "Greater Accra", type: "Stop", location: { lat: 5.8950, lng: -0.0800 } },
  { name: "Osuwem", city: "Osuwem", region: "Greater Accra", type: "Stop", location: { lat: 5.9480, lng: -0.0620 } },
  { name: "Agomeda", city: "Agomeda", region: "Greater Accra", type: "Stop", location: { lat: 5.8480, lng: -0.0280 } },
  { name: "Abokobi", city: "Abokobi", region: "Greater Accra", type: "Stop", location: { lat: 5.7380, lng: -0.1800 } },

  // === GBAWE / WEIJA / NGLESHIE CORRIDOR ===
  { name: "Ngleshie Amanfro", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5300, lng: -0.3800 }, aliases: ["Amanfro"] },
  { name: "Kokrobitey", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5140, lng: -0.4080 }, aliases: ["Kokrobite"] },
  { name: "Miotso", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5600, lng: -0.3550 } },

  // === KPONE / TEMA INDUSTRIAL AREA ===
  { name: "Kpone Katamanso", city: "Tema", region: "Greater Accra", type: "Stop", location: { lat: 5.7190, lng: -0.0680 } },
  { name: "Manhean", city: "Tema", region: "Greater Accra", type: "Stop", location: { lat: 5.7220, lng: -0.0600 } },
  { name: "Mantseman", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5260, lng: -0.2050 } },

  // === SPECIFIC REQUESTED LOCATIONS ===
  { name: "Abetinso", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6200, lng: -0.2000 } },
  { name: "Abominya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6050, lng: -0.2680 } },
  { name: "Adjen Kotoku", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7220, lng: -0.3250 } },
  { name: "Agbenyegakope", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8020, lng: 0.1800 } },
  { name: "Ahanya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8100, lng: 0.1200 } },
  { name: "Ahwiam", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7980, lng: -0.0950 } },
  { name: "Akplabanya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7750, lng: 0.2800 } },
  { name: "Alavanyo", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6150, lng: -0.2400 } },
  { name: "Alorkpem", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8350, lng: 0.1450 } },
  { name: "Amlakpo", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7850, lng: 0.3600 } },
  { name: "Anumle", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7200, lng: -0.1100 } },
  { name: "Anyakpor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7850, lng: 0.6100 } },
  { name: "Apenkwa", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.5960, lng: -0.2280 } },
  { name: "Asaprochona", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7730, lng: 0.1580 } },
  { name: "Ashieye", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7620, lng: -0.1340 } },
  { name: "Ayetepa", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7500, lng: -0.0200 } },
  { name: "Azizanya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7600, lng: 0.0600 } },
  { name: "Boi", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7430, lng: -0.1060 } },
  { name: "Buaku", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7550, lng: -0.1430 } },
  { name: "Chuim", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7340, lng: -0.1710 } },
  { name: "Danchira", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7450, lng: -0.0870 } },
  { name: "Faajiemohe", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7700, lng: 0.1000 } },
  { name: "Fantevikope", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8200, lng: 0.2300 } },
  { name: "Fiakonya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7950, lng: 0.4200 } },
  { name: "Gigedokum", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8050, lng: 0.0900 } },
  { name: "Goi", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7900, lng: 0.0400 } },
  { name: "Gonse", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7700, lng: 0.0200 } },
  { name: "Huapa", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.9250, lng: -0.0550 } },
  { name: "Kajanya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7950, lng: 0.0600 } },
  { name: "Kasunya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7880, lng: 0.1300 } },
  { name: "Kodiabe", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7960, lng: -0.0500 } },
  { name: "Koluedor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8130, lng: 0.2100 } },
  { name: "Kopodor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8040, lng: 0.2000 } },
  { name: "Kpatsedor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7980, lng: 0.3100 } },
  { name: "Kpetsupanya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7900, lng: 0.3500 } },
  { name: "Kpehe", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7860, lng: 0.3300 } },
  { name: "Kpotsum", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7830, lng: 0.2700 } },
  { name: "Kpongunor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7810, lng: 0.2500 } },
  { name: "Kposi", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7880, lng: 0.0980 } },
  { name: "Kubekro", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7700, lng: 0.0550 } },
  { name: "Kunyenya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7950, lng: 0.1050 } },
  { name: "Langma", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7450, lng: 0.0150 } },
  { name: "Lekpongunor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7780, lng: 0.2900 } },
  { name: "Lolonya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7920, lng: 0.4800 } },
  { name: "Lorlorvor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7880, lng: 0.4500 } },
  { name: "Lupunya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7840, lng: 0.5600 } },
  { name: "Maajor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7760, lng: 0.4000 } },
  { name: "Magbomada", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7820, lng: 0.5200 } },
  { name: "Maledjor", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7300, lng: 0.0000 } },
  { name: "Mampehia", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8070, lng: 0.0350 } },
  { name: "Mangotsonya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8000, lng: 0.5000 } },
  { name: "Manya Jorpanya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7950, lng: 0.5400 } },
  { name: "Mayera", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7600, lng: 0.0850 } },
  { name: "Minya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7700, lng: 0.1700 } },
  { name: "Mlitsakpo", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7950, lng: 0.1500 } },
  { name: "Nana Krom", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7320, lng: -0.1150 } },
  { name: "Nsuobri", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7420, lng: -0.1630 } },
  { name: "Nyapienya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7830, lng: 0.5900 } },
  { name: "Nyigbenya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7860, lng: 0.5700 } },
  { name: "Obakrowa", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7680, lng: 0.0750 } },
  { name: "Obeyeyie", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6600, lng: -0.2950 } },
  { name: "Ocanseykope", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7900, lng: 0.2200 } },
  { name: "Odaw", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.6100, lng: -0.2200 } },
  { name: "Odumse", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7250, lng: -0.1550 } },
  { name: "Okorhuem", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7650, lng: 0.0450 } },
  { name: "Onyansana", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7550, lng: -0.0500 } },
  { name: "Papase", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7650, lng: -0.0650 } },
  { name: "Pena", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7500, lng: 0.0450 } },
  { name: "Pute", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7380, lng: 0.0300 } },
  { name: "Samsam", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7150, lng: -0.0150 } },
  { name: "Sege Donya", city: "Sege", region: "Greater Accra", type: "Stop", location: { lat: 5.7750, lng: 0.3450 } },
  { name: "Sesemi", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7600, lng: 0.1300 } },
  { name: "Some", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7650, lng: 0.1100 } },
  { name: "Songonya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7750, lng: 0.4600 } },
  { name: "Sota", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7680, lng: 0.1550 } },
  { name: "Suapa", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7720, lng: 0.1900 } },
  { name: "Sugbanyate", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7800, lng: 0.2050 } },
  { name: "Tekpekope", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8200, lng: 0.2700 } },
  { name: "Tekpanya", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7980, lng: 0.2400 } },
  { name: "Tesa", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7700, lng: -0.0350 } },
  { name: "Toflokpo", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8080, lng: 0.3000 } },
  { name: "Togbloku", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7100, lng: 0.0800 } },
  { name: "Totimekope", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.8070, lng: 0.2600 } },
  { name: "Vakpo", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7900, lng: 0.1750 } },
  { name: "Wiaboman", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7400, lng: -0.1200 } },
  { name: "Wokumagbe", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7800, lng: 0.0700 } },
  { name: "Wuonyi", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7850, lng: 0.1150 } },
  { name: "Zanidaw", city: "Accra", region: "Greater Accra", type: "Stop", location: { lat: 5.7750, lng: 0.0300 } },

  // === OUTSIDE GREATER ACCRA - Major transit stops ===
  { name: "Kasoa", city: "Kasoa", region: "Central", type: "Terminal", location: { lat: 5.5340, lng: -0.4190 }, aliases: ["Kasoa Station"] },
  { name: "Winneba", city: "Winneba", region: "Central", type: "Station", location: { lat: 5.3530, lng: -0.6260 } },
  { name: "Nsawam", city: "Nsawam", region: "Eastern", type: "Station", location: { lat: 5.8090, lng: -0.3530 } },
  { name: "Suhum", city: "Suhum", region: "Eastern", type: "Station", location: { lat: 6.0380, lng: -0.4510 } },
  { name: "Nkawkaw", city: "Nkawkaw", region: "Eastern", type: "Station", location: { lat: 6.5510, lng: -0.7680 } },
  { name: "Kumasi Central (Kejetia)", city: "Kumasi", region: "Ashanti", type: "Terminal", location: { lat: 6.6885, lng: -1.6244 }, aliases: ["Kejetia", "Kumasi"] },
  { name: "Takoradi Station", city: "Takoradi", region: "Western", type: "Terminal", location: { lat: 4.8917, lng: -1.7583 } },
  { name: "Cape Coast Station", city: "Cape Coast", region: "Central", type: "Terminal", location: { lat: 5.1053, lng: -1.2466 } },
  { name: "Koforidua Station", city: "Koforidua", region: "Eastern", type: "Terminal", location: { lat: 6.0940, lng: -0.2610 } },
  { name: "Tamale Station", city: "Tamale", region: "Northern", type: "Terminal", location: { lat: 9.4075, lng: -0.8533 } },
  { name: "Ho Station", city: "Ho", region: "Volta", type: "Terminal", location: { lat: 6.6111, lng: 0.4722 } },
];

// ============================================================
// ROUTES - Major & Local Routes
// ============================================================

interface RouteDefinition {
  name: string;
  startLocation: string;
  endLocation: string;
  busType: string;
  stops: { name: string; lat: number; lng: number }[];
}

const ROUTES: RouteDefinition[] = [
  // === MAJOR TRUNK ROUTES ===
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
      { name: "Nungua Station", lat: 5.5894, lng: -0.0750 },
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
      { name: "Darkuman Junction", lat: 5.5780, lng: -0.2550 },
      { name: "Odorkor Station", lat: 5.5750, lng: -0.2750 },
      { name: "Mallam Junction", lat: 5.5700, lng: -0.3000 },
      { name: "Weija", lat: 5.5670, lng: -0.3350 },
      { name: "Kasoa", lat: 5.5340, lng: -0.4190 },
    ],
  },
  {
    name: "Madina - Adenta - Dodowa",
    startLocation: "Madina Station",
    endLocation: "Dodowa",
    busType: "standard",
    stops: [
      { name: "Madina Station", lat: 5.6731273, lng: -0.1663851 },
      { name: "Adenta Lorry Station", lat: 5.70597, lng: -0.16574 },
      { name: "Oyarifa", lat: 5.7070, lng: -0.1590 },
      { name: "Amrahia", lat: 5.7210, lng: -0.1440 },
      { name: "Oyibi", lat: 5.7380, lng: -0.1460 },
      { name: "Dodowa", lat: 5.8820, lng: -0.0980 },
    ],
  },
  {
    name: "Lapaz - Achimota - Pokuase",
    startLocation: "Lapaz Station",
    endLocation: "Pokuase",
    busType: "minibus",
    stops: [
      { name: "Lapaz Station", lat: 5.609507, lng: -0.250754 },
      { name: "Achimota Terminal", lat: 5.6228, lng: -0.2262 },
      { name: "Dome", lat: 5.6350, lng: -0.2330 },
      { name: "Taifa", lat: 5.6480, lng: -0.2500 },
      { name: "Ofankor", lat: 5.6550, lng: -0.2700 },
      { name: "Kutunse", lat: 5.6730, lng: -0.2830 },
      { name: "Pokuase", lat: 5.6810, lng: -0.2920 },
    ],
  },
  {
    name: "Pokuase - Amasaman",
    startLocation: "Pokuase",
    endLocation: "Amasaman",
    busType: "minibus",
    stops: [
      { name: "Pokuase", lat: 5.6810, lng: -0.2920 },
      { name: "Nsakina", lat: 5.6930, lng: -0.2960 },
      { name: "Amasaman", lat: 5.7010, lng: -0.3050 },
    ],
  },
  {
    name: "Achimota - East Legon",
    startLocation: "Achimota Terminal",
    endLocation: "American House Station",
    busType: "minibus",
    stops: [
      { name: "Achimota Terminal", lat: 5.6228, lng: -0.2262 },
      { name: "Legon - University of Ghana", lat: 5.6505, lng: -0.1870 },
      { name: "East Legon Station", lat: 5.6350, lng: -0.1550 },
      { name: "American House Station", lat: 5.6420, lng: -0.1380 },
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
    name: "Kaneshie - Dansoman",
    startLocation: "Kaneshie Lorry Station",
    endLocation: "Dansoman Control Stop",
    busType: "minibus",
    stops: [
      { name: "Kaneshie Lorry Station", lat: 5.55667, lng: -0.22472 },
      { name: "Lartebiokorshie", lat: 5.5520, lng: -0.2450 },
      { name: "Dansoman Control Stop", lat: 5.5550, lng: -0.2650 },
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
  {
    name: "Tema - Ashaiman - Kpone",
    startLocation: "Tema Community 1 Station",
    endLocation: "Kpone",
    busType: "minibus",
    stops: [
      { name: "Tema Community 1 Station", lat: 5.6698, lng: -0.0166 },
      { name: "Ashaiman Station", lat: 5.6942, lng: -0.0389 },
      { name: "Kpone", lat: 5.6970, lng: 0.0410 },
    ],
  },
  {
    name: "Tema - Prampram",
    startLocation: "Tema Community 1 Station",
    endLocation: "Prampram",
    busType: "standard",
    stops: [
      { name: "Tema Community 1 Station", lat: 5.6698, lng: -0.0166 },
      { name: "Kpone", lat: 5.6970, lng: 0.0410 },
      { name: "Dawhenya", lat: 5.7290, lng: 0.0340 },
      { name: "Afienya", lat: 5.7580, lng: 0.0060 },
      { name: "Prampram", lat: 5.7140, lng: 0.1210 },
    ],
  },
  {
    name: "Accra - Prampram - Ada",
    startLocation: "Tudu Lorry Station",
    endLocation: "Big Ada",
    busType: "standard",
    stops: [
      { name: "Tudu Lorry Station", lat: 5.55036, lng: -0.20664 },
      { name: "Tema Community 1 Station", lat: 5.6698, lng: -0.0166 },
      { name: "Prampram", lat: 5.7140, lng: 0.1210 },
      { name: "Sege", lat: 5.7800, lng: 0.3370 },
      { name: "Big Ada", lat: 5.7930, lng: 0.6260 },
    ],
  },
  {
    name: "Achimota - Dome - Kwabenya",
    startLocation: "Achimota Terminal",
    endLocation: "Kwabenya",
    busType: "minibus",
    stops: [
      { name: "Achimota Terminal", lat: 5.6228, lng: -0.2262 },
      { name: "Dome", lat: 5.6350, lng: -0.2330 },
      { name: "Haatso", lat: 5.6580, lng: -0.2070 },
      { name: "Ashongman", lat: 5.6800, lng: -0.2150 },
      { name: "Kwabenya", lat: 5.6730, lng: -0.2230 },
    ],
  },
  {
    name: "37 - Legon - Atomic - Haatso",
    startLocation: "37 Lorry Station",
    endLocation: "Haatso",
    busType: "minibus",
    stops: [
      { name: "37 Lorry Station", lat: 5.589, lng: -0.1794 },
      { name: "Legon - University of Ghana", lat: 5.6505, lng: -0.1870 },
      { name: "Atomic Junction", lat: 5.6565, lng: -0.1874 },
      { name: "Haatso", lat: 5.6580, lng: -0.2070 },
    ],
  },
  {
    name: "Mallam - Gbawe - Weija",
    startLocation: "Mallam Junction",
    endLocation: "Weija",
    busType: "minibus",
    stops: [
      { name: "Mallam Junction", lat: 5.5700, lng: -0.3000 },
      { name: "Gbawe", lat: 5.5770, lng: -0.3130 },
      { name: "Oblogo", lat: 5.5580, lng: -0.3450 },
      { name: "Weija", lat: 5.5670, lng: -0.3350 },
    ],
  },
  {
    name: "Madina - Ashaley Botwe - Katamanso",
    startLocation: "Madina Station",
    endLocation: "Katamanso",
    busType: "minibus",
    stops: [
      { name: "Madina Station", lat: 5.6731273, lng: -0.1663851 },
      { name: "Ashaley Botwe", lat: 5.6790, lng: -0.1550 },
      { name: "Bawaleshie", lat: 5.6850, lng: -0.1600 },
      { name: "Katamanso", lat: 5.7090, lng: -0.1210 },
    ],
  },
  // === INTERCITY ROUTES ===
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
    name: "Accra - Koforidua",
    startLocation: "Tudu Lorry Station",
    endLocation: "Koforidua Station",
    busType: "standard",
    stops: [
      { name: "Tudu Lorry Station", lat: 5.55036, lng: -0.20664 },
      { name: "Achimota Terminal", lat: 5.6228, lng: -0.2262 },
      { name: "Nsawam", lat: 5.8090, lng: -0.3530 },
      { name: "Koforidua Station", lat: 6.0940, lng: -0.2610 },
    ],
  },
];

// ============================================================
// SEED FUNCTION
// ============================================================

async function seedGreaterAccra() {
  try {
    console.log("=== Greater Accra Comprehensive Seed Script ===\n");

    const isConnected = await testConnection();
    if (!isConnected) {
      console.error("Database connection failed. Aborting.");
      return;
    }

    // 1. Seed bus stops
    console.log(`Clearing old bus stops...`);
    await storage.clearBusStops();

    console.log(`Seeding ${BUS_STOPS.length} bus stops...\n`);
    let stopCount = 0;
    for (const stop of BUS_STOPS) {
      try {
        await storage.createBusStop({
          ...stop,
          searchTerms: `${stop.name} ${stop.city} ${stop.region} ${(stop as any).aliases?.join(" ") || ""}`.toLowerCase(),
        });
        stopCount++;
        if (stopCount % 20 === 0) {
          console.log(`   ...seeded ${stopCount}/${BUS_STOPS.length} stops`);
        }
      } catch (err: any) {
        // Skip duplicates
        if (!err.message?.includes("Duplicate")) {
          console.error(`   Failed: ${stop.name} - ${err.message}`);
        }
      }
    }
    console.log(`\n   Seeded ${stopCount} bus stops.\n`);

    // 2. Seed routes with Mapbox geometry
    console.log(`Seeding ${ROUTES.length} routes with Mapbox geometry...\n`);
    let routeSuccess = 0;
    let routeFail = 0;

    for (const routeDef of ROUTES) {
      try {
        const coordinates: [number, number][] = routeDef.stops.map((s) => [s.lng, s.lat]);

        console.log(`   ${routeDef.name}: ${routeDef.startLocation} -> ${routeDef.endLocation}`);

        let geometry: [number, number][] | null = null;
        let distance: number | null = null;
        let duration: number | null = null;

        try {
          const routeDetails = await getRouteDetails(coordinates);
          if (routeDetails) {
            geometry = routeDetails.geometry;
            distance = routeDetails.distance;
            duration = routeDetails.duration;
            console.log(`      Got ${geometry.length} geometry points, ${distance}km, ${duration}min`);
          }
        } catch {
          console.warn(`      Mapbox directions failed, using straight-line fallback`);
        }

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

        routeSuccess++;
      } catch (err: any) {
        console.error(`      Failed: ${routeDef.name} - ${err.message}`);
        routeFail++;
      }

      // Respect Mapbox rate limits
      await new Promise((r) => setTimeout(r, 400));
    }

    console.log(`\n=== Seed Complete ===`);
    console.log(`   Bus Stops: ${stopCount}`);
    console.log(`   Routes: ${routeSuccess} success, ${routeFail} failed`);

    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedGreaterAccra();
