// client/src/components/OfflineIndicator.tsx
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus, useOfflineData } from '@/hooks/use-offline';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { sync, isSyncing } = useOfflineData();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
      <div className="bg-amber-500 text-white rounded-xl shadow-lg p-4 flex items-center gap-3">
        <WifiOff className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-sm">You're offline</p>
          <p className="text-xs text-amber-100">Showing cached data</p>
        </div>
        <button
          onClick={() => sync()}
          disabled={isSyncing}
          className="p-2 bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
