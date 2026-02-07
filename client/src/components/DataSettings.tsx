// client/src/components/DataSettings.tsx
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Database,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  HardDrive,
  Clock,
  Route,
  MapPin,
} from 'lucide-react';
import { useOfflineData, useLowDataMode, useOnlineStatus } from '@/hooks/use-offline';
import { useToast } from '@/hooks/use-toast';

export default function DataSettings() {
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const { stats, sync, isSyncing, clearCache, isClearing } = useOfflineData();
  const { lowDataMode, toggleLowDataMode, isLoading } = useLowDataMode();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSync = async () => {
    try {
      await sync();
      toast({
        title: 'Sync Complete',
        description: `Cached ${stats.routesCount} routes and ${stats.stopsCount} stops`,
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Could not sync offline data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClearCache = async () => {
    try {
      await clearCache();
      setShowClearConfirm(false);
      toast({
        title: 'Cache Cleared',
        description: 'All offline data has been removed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not clear cache',
        variant: 'destructive',
      });
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <Card className="p-6 rounded-2xl border-none shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-blue-600" />
        Data & Offline Settings
      </h3>

      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-emerald-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-amber-500" />
          )}
          <div>
            <p className="font-medium text-slate-800">
              {isOnline ? 'Connected' : 'Offline'}
            </p>
            <p className="text-xs text-slate-500">
              {isOnline ? 'Using live data' : 'Using cached data'}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Low Data Mode */}
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-blue-500" />
          <div>
            <p className="font-medium text-slate-800">Low Data Mode</p>
            <p className="text-xs text-slate-500">
              Reduces map quality and data usage
            </p>
          </div>
        </div>
        <Switch
          checked={lowDataMode}
          onCheckedChange={toggleLowDataMode}
          disabled={isLoading}
        />
      </div>

      {/* Cached Data Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-blue-50 rounded-xl">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Route className="h-4 w-4" />
            <span className="text-xs font-medium">Routes</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{stats.routesCount}</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-medium">Stops</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{stats.stopsCount}</p>
        </div>
      </div>

      {/* Cache Info */}
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-slate-400" />
          <div>
            <p className="text-sm text-slate-600">Last synced</p>
            <p className="font-medium text-slate-800">
              {formatLastSync(stats.lastSync)}
            </p>
          </div>
        </div>
        <span className="text-sm text-slate-500">{stats.size}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSync}
          disabled={isSyncing || !isOnline}
          className="flex-1 rounded-xl"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>

        {showClearConfirm ? (
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleClearCache}
              disabled={isClearing}
              className="rounded-xl"
            >
              {isClearing ? 'Clearing...' : 'Confirm'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowClearConfirm(true)}
            className="rounded-xl"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </Card>
  );
}
