// client/src/components/DriverBadge.tsx - Verified driver badge
import { Shield, Star, CheckCircle, Award } from 'lucide-react';

interface DriverBadgeProps {
  driver: {
    firstName: string;
    lastName: string;
    isVerified?: boolean;
    rating?: number;
    totalTrips?: number;
    vehicle?: {
      make?: string;
      model?: string;
      plateNumber?: string;
      year?: string;
    };
  };
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export default function DriverBadge({ driver, size = 'md', showDetails = false }: DriverBadgeProps) {
  const isVerified = driver.isVerified !== false; // Default to verified for now
  const rating = driver.rating || 4.5;
  const totalTrips = driver.totalTrips || 0;

  const sizeClasses = {
    sm: {
      container: 'p-2',
      avatar: 'w-8 h-8 text-sm',
      name: 'text-sm',
      badge: 'h-3 w-3',
    },
    md: {
      container: 'p-3',
      avatar: 'w-10 h-10 text-base',
      name: 'text-base',
      badge: 'h-4 w-4',
    },
    lg: {
      container: 'p-4',
      avatar: 'w-12 h-12 text-lg',
      name: 'text-lg',
      badge: 'h-5 w-5',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`bg-white rounded-xl border border-slate-100 ${classes.container}`}>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <div className={`${classes.avatar} bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold`}>
            {driver.firstName[0]}{driver.lastName[0]}
          </div>
          {isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
              <CheckCircle className={`${classes.badge} text-emerald-500 fill-emerald-500`} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-semibold text-slate-800 truncate ${classes.name}`}>
              {driver.firstName} {driver.lastName}
            </p>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                <Shield className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-medium text-slate-700">{rating.toFixed(1)}</span>
            </div>
            {totalTrips > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">{totalTrips} trips</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Details */}
      {showDetails && driver.vehicle && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-600">
              {driver.vehicle.make} {driver.vehicle.model}
              {driver.vehicle.year && <span className="text-slate-400"> ({driver.vehicle.year})</span>}
            </div>
            {driver.vehicle.plateNumber && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-xs rounded">
                {driver.vehicle.plateNumber}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Achievement Badges */}
      {showDetails && totalTrips > 50 && (
        <div className="mt-3 flex items-center gap-2">
          {totalTrips >= 100 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
              <Award className="h-3 w-3" />
              Experienced
            </span>
          )}
          {totalTrips >= 500 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
              <Award className="h-3 w-3" />
              Pro Driver
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Simple inline verified badge
export function VerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-emerald-600 ${className}`}>
      <CheckCircle className="h-4 w-4 fill-emerald-500" />
      <span className="text-xs font-medium">Verified</span>
    </span>
  );
}

// Star rating display
export function DriverRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const starSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex items-center gap-1">
      <Star className={`${starSize} text-amber-400 fill-amber-400`} />
      <span className={`${textSize} font-medium text-slate-700`}>{rating.toFixed(1)}</span>
    </div>
  );
}
