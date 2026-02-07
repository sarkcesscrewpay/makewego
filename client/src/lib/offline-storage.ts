// client/src/lib/offline-storage.ts - IndexedDB helper for offline data
const DB_NAME = 'bus-connect-offline';
const DB_VERSION = 1;

interface OfflineDB {
  routes: any[];
  busStops: any[];
  favorites: any[];
  userPreferences: {
    lowDataMode: boolean;
    offlineMapsEnabled: boolean;
    lastSync: string;
  };
}

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export async function initOfflineDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Routes store
      if (!database.objectStoreNames.contains('routes')) {
        const routesStore = database.createObjectStore('routes', { keyPath: '_id' });
        routesStore.createIndex('name', 'name', { unique: false });
        routesStore.createIndex('startLocation', 'startLocation', { unique: false });
      }

      // Bus stops store
      if (!database.objectStoreNames.contains('busStops')) {
        const stopsStore = database.createObjectStore('busStops', { keyPath: '_id' });
        stopsStore.createIndex('name', 'name', { unique: false });
        stopsStore.createIndex('region', 'region', { unique: false });
      }

      // Favorites store
      if (!database.objectStoreNames.contains('favorites')) {
        database.createObjectStore('favorites', { keyPath: 'id' });
      }

      // User preferences store
      if (!database.objectStoreNames.contains('preferences')) {
        database.createObjectStore('preferences', { keyPath: 'key' });
      }

      // Cached schedules store
      if (!database.objectStoreNames.contains('schedules')) {
        const schedulesStore = database.createObjectStore('schedules', { keyPath: '_id' });
        schedulesStore.createIndex('routeId', 'routeId', { unique: false });
      }
    };
  });
}

// Generic store operations
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const database = await initOfflineDB();
  const transaction = database.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

// Save data to a store
export async function saveToStore<T>(storeName: string, data: T | T[]): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  const items = Array.isArray(data) ? data : [data];

  return new Promise((resolve, reject) => {
    const transaction = store.transaction;

    items.forEach(item => {
      store.put(item);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Get all data from a store
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get single item by key
export async function getFromStore<T>(storeName: string, key: string): Promise<T | undefined> {
  const store = await getStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Delete from store
export async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');

  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear entire store
export async function clearStore(storeName: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');

  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// === Specific offline operations ===

// Cache routes for offline use
export async function cacheRoutes(routes: any[]): Promise<void> {
  await saveToStore('routes', routes);
  await savePreference('lastRoutesSync', new Date().toISOString());
}

// Get cached routes
export async function getCachedRoutes(): Promise<any[]> {
  return getAllFromStore('routes');
}

// Cache bus stops
export async function cacheBusStops(stops: any[]): Promise<void> {
  await saveToStore('busStops', stops);
  await savePreference('lastStopsSync', new Date().toISOString());
}

// Get cached bus stops
export async function getCachedBusStops(): Promise<any[]> {
  return getAllFromStore('busStops');
}

// Cache schedules
export async function cacheSchedules(schedules: any[]): Promise<void> {
  await saveToStore('schedules', schedules);
}

// Get cached schedules
export async function getCachedSchedules(): Promise<any[]> {
  return getAllFromStore('schedules');
}

// === Favorites ===

export interface FavoriteRoute {
  id: string;
  type: 'route' | 'location';
  name: string;
  data: any;
  createdAt: string;
}

export async function addFavorite(favorite: Omit<FavoriteRoute, 'createdAt'>): Promise<void> {
  await saveToStore('favorites', {
    ...favorite,
    createdAt: new Date().toISOString()
  });
}

export async function removeFavorite(id: string): Promise<void> {
  await deleteFromStore('favorites', id);
}

export async function getFavorites(): Promise<FavoriteRoute[]> {
  return getAllFromStore('favorites');
}

// === Preferences ===

export async function savePreference(key: string, value: any): Promise<void> {
  await saveToStore('preferences', { key, value });
}

export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
  const result = await getFromStore<{ key: string; value: T }>('preferences', key);
  return result?.value ?? defaultValue;
}

// Low-data mode
export async function setLowDataMode(enabled: boolean): Promise<void> {
  await savePreference('lowDataMode', enabled);
}

export async function getLowDataMode(): Promise<boolean> {
  return getPreference('lowDataMode', false);
}

// Offline maps enabled
export async function setOfflineMapsEnabled(enabled: boolean): Promise<void> {
  await savePreference('offlineMapsEnabled', enabled);
}

export async function getOfflineMapsEnabled(): Promise<boolean> {
  return getPreference('offlineMapsEnabled', true);
}

// === Sync operations ===

export async function syncOfflineData(): Promise<{ routes: number; stops: number }> {
  try {
    // Fetch and cache routes
    const routesRes = await fetch('/api/routes');
    if (routesRes.ok) {
      const routes = await routesRes.json();
      await cacheRoutes(routes);
    }

    // Fetch and cache bus stops
    const stopsRes = await fetch('/api/bus-stops');
    if (stopsRes.ok) {
      const stops = await stopsRes.json();
      await cacheBusStops(stops);
    }

    const cachedRoutes = await getCachedRoutes();
    const cachedStops = await getCachedBusStops();

    return {
      routes: cachedRoutes.length,
      stops: cachedStops.length
    };
  } catch (error) {
    console.error('Offline sync failed:', error);
    throw error;
  }
}

// Check if we're offline
export function isOffline(): boolean {
  return !navigator.onLine;
}

// Get last sync time
export async function getLastSyncTime(): Promise<string | null> {
  return getPreference('lastRoutesSync', null);
}

// Calculate offline data size (approximate)
export async function getOfflineDataSize(): Promise<string> {
  const routes = await getCachedRoutes();
  const stops = await getCachedBusStops();
  const schedules = await getCachedSchedules();

  const totalItems = routes.length + stops.length + schedules.length;
  const estimatedSize = JSON.stringify([...routes, ...stops, ...schedules]).length;

  if (estimatedSize < 1024) {
    return `${estimatedSize} B`;
  } else if (estimatedSize < 1024 * 1024) {
    return `${(estimatedSize / 1024).toFixed(1)} KB`;
  } else {
    return `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// Clear all offline data
export async function clearAllOfflineData(): Promise<void> {
  await clearStore('routes');
  await clearStore('busStops');
  await clearStore('schedules');
  await clearStore('favorites');

  // Also clear service worker caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith('bus-connect-'))
        .map(name => caches.delete(name))
    );
  }
}
