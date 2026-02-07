// client/src/hooks/use-favorites.ts
import { useState, useEffect, useCallback } from 'react';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  savePreference,
  getPreference,
  type FavoriteRoute
} from '@/lib/offline-storage';

export type { FavoriteRoute };

export interface LocationPreset {
  id: string;
  type: 'home' | 'work' | 'custom';
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

// Hook for managing favorite routes
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const items = await getFavorites();
      setFavorites(items);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToFavorites = useCallback(async (item: Omit<FavoriteRoute, 'createdAt'>) => {
    try {
      await addFavorite(item);
      await loadFavorites();
      return true;
    } catch (error) {
      console.error('Failed to add favorite:', error);
      return false;
    }
  }, []);

  const removeFromFavorites = useCallback(async (id: string) => {
    try {
      await removeFavorite(id);
      setFavorites(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      return false;
    }
  }, []);

  const isFavorite = useCallback((id: string) => {
    return favorites.some(f => f.id === id);
  }, [favorites]);

  const toggleFavorite = useCallback(async (item: Omit<FavoriteRoute, 'createdAt'>) => {
    if (isFavorite(item.id)) {
      return removeFromFavorites(item.id);
    } else {
      return addToFavorites(item);
    }
  }, [isFavorite, addToFavorites, removeFromFavorites]);

  return {
    favorites,
    isLoading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
    refresh: loadFavorites,
  };
}

// Hook for managing location presets (home, work, etc.)
export function useLocationPresets() {
  const [presets, setPresets] = useState<LocationPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const saved = await getPreference<LocationPreset[]>('locationPresets', []);
      setPresets(saved);
    } catch (error) {
      console.error('Failed to load location presets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePresets = async (newPresets: LocationPreset[]) => {
    try {
      await savePreference('locationPresets', newPresets);
      setPresets(newPresets);
      return true;
    } catch (error) {
      console.error('Failed to save presets:', error);
      return false;
    }
  };

  const setHomeLocation = useCallback(async (address: string, coordinates?: { lat: number; lng: number }) => {
    const updated = presets.filter(p => p.type !== 'home');
    updated.push({
      id: 'home',
      type: 'home',
      name: 'Home',
      address,
      coordinates,
    });
    return savePresets(updated);
  }, [presets]);

  const setWorkLocation = useCallback(async (address: string, coordinates?: { lat: number; lng: number }) => {
    const updated = presets.filter(p => p.type !== 'work');
    updated.push({
      id: 'work',
      type: 'work',
      name: 'Work',
      address,
      coordinates,
    });
    return savePresets(updated);
  }, [presets]);

  const addCustomLocation = useCallback(async (name: string, address: string, coordinates?: { lat: number; lng: number }) => {
    const id = `custom-${Date.now()}`;
    const updated = [...presets, {
      id,
      type: 'custom' as const,
      name,
      address,
      coordinates,
    }];
    return savePresets(updated);
  }, [presets]);

  const removePreset = useCallback(async (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    return savePresets(updated);
  }, [presets]);

  const getHomeLocation = useCallback(() => {
    return presets.find(p => p.type === 'home');
  }, [presets]);

  const getWorkLocation = useCallback(() => {
    return presets.find(p => p.type === 'work');
  }, [presets]);

  return {
    presets,
    isLoading,
    setHomeLocation,
    setWorkLocation,
    addCustomLocation,
    removePreset,
    getHomeLocation,
    getWorkLocation,
    refresh: loadPresets,
  };
}
