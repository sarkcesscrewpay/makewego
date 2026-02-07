// client/src/components/QuickAccess.tsx
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Heart,
  Home,
  Briefcase,
  MapPin,
  Plus,
  X,
  ChevronRight,
  Star,
  Trash2,
} from 'lucide-react';
import { useFavorites, useLocationPresets, type LocationPreset } from '@/hooks/use-favorites';
import { useToast } from '@/hooks/use-toast';

interface QuickAccessProps {
  onSelectRoute?: (routeId: string) => void;
  onSelectLocation?: (location: LocationPreset) => void;
}

export default function QuickAccess({ onSelectRoute, onSelectLocation }: QuickAccessProps) {
  const { toast } = useToast();
  const { favorites, removeFromFavorites } = useFavorites();
  const {
    presets,
    setHomeLocation,
    setWorkLocation,
    addCustomLocation,
    removePreset,
    getHomeLocation,
    getWorkLocation,
  } = useLocationPresets();

  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({ type: 'home' as 'home' | 'work' | 'custom', name: '', address: '' });

  const homeLocation = getHomeLocation();
  const workLocation = getWorkLocation();
  const customLocations = presets.filter(p => p.type === 'custom');
  const favoriteRoutes = favorites.filter(f => f.type === 'route');

  const handleSaveLocation = async () => {
    if (!newLocation.address) {
      toast({ title: 'Enter an address', variant: 'destructive' });
      return;
    }

    let success = false;
    if (newLocation.type === 'home') {
      success = await setHomeLocation(newLocation.address);
    } else if (newLocation.type === 'work') {
      success = await setWorkLocation(newLocation.address);
    } else {
      if (!newLocation.name) {
        toast({ title: 'Enter a name for this location', variant: 'destructive' });
        return;
      }
      success = await addCustomLocation(newLocation.name, newLocation.address);
    }

    if (success) {
      toast({ title: 'Location Saved' });
      setIsAddingLocation(false);
      setNewLocation({ type: 'home', name: '', address: '' });
    }
  };

  const handleRemoveFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFromFavorites(id);
    toast({ title: 'Removed from Favorites' });
  };

  const handleRemovePreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removePreset(id);
    toast({ title: 'Location Removed' });
  };

  return (
    <Card className="p-4 rounded-2xl border-none shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
        <Star className="h-5 w-5 text-amber-500" />
        Quick Access
      </h3>

      {/* Location Presets */}
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-500 uppercase mb-2">Saved Locations</p>
        <div className="space-y-2">
          {/* Home */}
          <button
            onClick={() => homeLocation && onSelectLocation?.(homeLocation)}
            className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-left"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <Home className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800">Home</p>
              {homeLocation ? (
                <p className="text-sm text-slate-500 truncate">{homeLocation.address}</p>
              ) : (
                <p className="text-sm text-slate-400">Not set</p>
              )}
            </div>
            {homeLocation && (
              <button
                onClick={(e) => handleRemovePreset('home', e)}
                className="p-1 text-slate-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </button>

          {/* Work */}
          <button
            onClick={() => workLocation && onSelectLocation?.(workLocation)}
            className="w-full flex items-center gap-3 p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors text-left"
          >
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Briefcase className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800">Work</p>
              {workLocation ? (
                <p className="text-sm text-slate-500 truncate">{workLocation.address}</p>
              ) : (
                <p className="text-sm text-slate-400">Not set</p>
              )}
            </div>
            {workLocation && (
              <button
                onClick={(e) => handleRemovePreset('work', e)}
                className="p-1 text-slate-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </button>

          {/* Custom Locations */}
          {customLocations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => onSelectLocation?.(loc)}
              className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-left"
            >
              <div className="p-2 bg-slate-200 rounded-lg">
                <MapPin className="h-4 w-4 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800">{loc.name}</p>
                <p className="text-sm text-slate-500 truncate">{loc.address}</p>
              </div>
              <button
                onClick={(e) => handleRemovePreset(loc.id, e)}
                className="p-1 text-slate-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </button>
          ))}

          {/* Add Location Button */}
          {!isAddingLocation ? (
            <button
              onClick={() => setIsAddingLocation(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </button>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl space-y-3">
              <div className="flex gap-2">
                {(['home', 'work', 'custom'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewLocation({ ...newLocation, type })}
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      newLocation.type === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              {newLocation.type === 'custom' && (
                <Input
                  placeholder="Location name"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                />
              )}
              <Input
                placeholder="Address or bus stop name"
                value={newLocation.address}
                onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveLocation}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingLocation(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Favorite Routes */}
      {favoriteRoutes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase mb-2">Favorite Routes</p>
          <div className="space-y-2">
            {favoriteRoutes.map((fav) => (
              <button
                key={fav.id}
                onClick={() => onSelectRoute?.(fav.id)}
                className="w-full flex items-center gap-3 p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-left"
              >
                <div className="p-2 bg-red-100 rounded-lg">
                  <Heart className="h-4 w-4 text-red-500 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{fav.name}</p>
                  <p className="text-sm text-slate-500 truncate">
                    {fav.data?.startLocation} → {fav.data?.endLocation}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleRemoveFavorite(fav.id, e)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {favoriteRoutes.length === 0 && !homeLocation && !workLocation && customLocations.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">
          Add your home, work, or favorite routes for quick access
        </p>
      )}
    </Card>
  );
}
