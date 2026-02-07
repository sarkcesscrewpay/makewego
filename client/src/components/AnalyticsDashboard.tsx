// client/src/components/AnalyticsDashboard.tsx
import { Card } from '@/components/ui/card';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react';
import { useRevenueAnalytics, usePeakHoursAnalytics, useDemandAnalytics } from '@/hooks/use-analytics';

export default function AnalyticsDashboard() {
  const { data: revenueData, isLoading: revenueLoading } = useRevenueAnalytics();
  const { data: peakData, isLoading: peakLoading } = usePeakHoursAnalytics();
  const { data: demandData, isLoading: demandLoading } = useDemandAnalytics();

  const isLoading = revenueLoading || peakLoading || demandLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Find peak hours
  const peakHour = peakData?.reduce((max, curr) =>
    curr.bookingCount > (max?.bookingCount || 0) ? curr : max
  , peakData[0]);

  // Calculate total from demand
  const totalDemandBookings = demandData?.reduce((sum, d) => sum + d.bookingCount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 rounded-xl border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Total Bookings</p>
              <p className="text-2xl font-bold text-slate-800">
                {revenueData?.summary.totalBookings || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-xl border-none shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-800">
                GH₵ {(revenueData?.summary.totalRevenue || 0).toFixed(0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-xl border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-600 font-medium">Avg. Fare</p>
              <p className="text-2xl font-bold text-slate-800">
                GH₵ {(revenueData?.summary.avgRevenue || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-xl border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-purple-600 font-medium">Peak Hour</p>
              <p className="text-2xl font-bold text-slate-800">
                {peakHour ? `${peakHour.hour}:00` : 'N/A'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        <Card className="p-5 rounded-2xl border-none shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Daily Revenue (Last 30 Days)
          </h3>
          <div className="space-y-2">
            {revenueData?.dailyRevenue.slice(-7).map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-20">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min((day.revenue / (revenueData?.summary.totalRevenue || 1)) * 100 * 7, 100)}%`
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700 w-20 text-right">
                  GH₵ {day.revenue.toFixed(0)}
                </span>
              </div>
            ))}
            {(!revenueData?.dailyRevenue || revenueData.dailyRevenue.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-4">No revenue data available</p>
            )}
          </div>
        </Card>

        {/* Peak Hours Heatmap */}
        <Card className="p-5 rounded-2xl border-none shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-purple-600" />
            Peak Hours Analysis
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center text-xs text-slate-500 font-medium pb-1">
                {day}
              </div>
            ))}
            {/* Time slots 6AM - 9PM */}
            {[6, 9, 12, 15, 18, 21].map((hour) => (
              [2, 3, 4, 5, 6, 7, 1].map((dayOfWeek) => {
                const data = peakData?.find(p => p.hour === hour && p.dayOfWeek === dayOfWeek);
                const maxBookings = Math.max(...(peakData?.map(p => p.bookingCount) || [1]));
                const intensity = data ? (data.bookingCount / maxBookings) : 0;

                return (
                  <div
                    key={`${hour}-${dayOfWeek}`}
                    className="aspect-square rounded-sm flex items-center justify-center text-xs"
                    style={{
                      backgroundColor: intensity > 0
                        ? `rgba(147, 51, 234, ${0.1 + intensity * 0.7})`
                        : '#f1f5f9'
                    }}
                    title={`${hour}:00 ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek - 1]}: ${data?.bookingCount || 0} bookings`}
                  >
                    {data && data.bookingCount > 0 && (
                      <span className={intensity > 0.5 ? 'text-white' : 'text-purple-700'}>
                        {data.bookingCount}
                      </span>
                    )}
                  </div>
                );
              })
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <span>6AM</span>
            <span>9PM</span>
          </div>
        </Card>
      </div>

      {/* Popular Routes & Demand */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Popular Routes */}
        <Card className="p-5 rounded-2xl border-none shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Top Performing Routes
          </h3>
          <div className="space-y-3">
            {revenueData?.popularRoutes.map((route, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  index === 0 ? 'bg-amber-500' :
                  index === 1 ? 'bg-slate-400' :
                  index === 2 ? 'bg-amber-700' : 'bg-slate-300'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{route.route}</p>
                  <p className="text-xs text-slate-500">{route.bookings} bookings</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">GH₵ {route.revenue.toFixed(0)}</p>
                </div>
              </div>
            ))}
            {(!revenueData?.popularRoutes || revenueData.popularRoutes.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-4">No route data available</p>
            )}
          </div>
        </Card>

        {/* Demand Hotspots */}
        <Card className="p-5 rounded-2xl border-none shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-red-600" />
            Demand Hotspots
          </h3>
          <div className="space-y-3">
            {demandData?.slice(0, 5).map((demand, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <div className="p-2 bg-red-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {demand.startLocation} → {demand.endLocation}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-red-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${(demand.bookingCount / totalDemandBookings) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{demand.bookingCount}</span>
                  </div>
                </div>
              </div>
            ))}
            {(!demandData || demandData.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-4">No demand data available</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
