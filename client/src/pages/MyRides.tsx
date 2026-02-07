import { useBookings, useCancelBooking, useDeleteBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ShareLocationToggle from "@/components/ShareLocationToggle";
import { Ticket, Calendar, Clock, MapPin, XCircle, Map as MapIcon, ArrowRight, Trash2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, lazy, Suspense } from "react";
// ... (keep other imports)
// Remove static import: import LiveMap from "@/components/LiveMap";

// Lazy load LiveMap to split chunk and avoid build warning
const LiveMap = lazy(() => import("@/components/LiveMap"));



interface BookingData {
  _id?: string;
  id?: number;
  status: string;
  scheduleId: string;
  seatNumber: number;
  price?: number;
  pickup?: string;
  dropoff?: string;
  schedule?: {
    departureTime: string | Date;
    price?: number;
    route?: {
      startLocation: string;
      endLocation: string;
    };
    driver?: {
      firstName: string;
      lastName: string;
      phone?: string | null;
      phoneVerified?: boolean;
      vehicle: {
        make: string;
        model: string;
        plateNumber: string;
        color: string;
      } | null;
    } | null;
  };
  route?: {
    startLocation: string;
    endLocation: string;
  };
}

export default function MyRides() {
  const { data: bookings, isLoading, isError } = useBookings();
  const { user } = useAuth();
  const cancelBooking = useCancelBooking();
  const deleteBooking = useDeleteBooking();
  const { toast } = useToast();
  const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);

  const handleCancel = (id: string) => {
    cancelBooking.mutate(id, {
      onSuccess: () => {
        toast({ title: "Booking Cancelled", description: "Your refund has been processed." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to cancel booking.", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: string) => {
    deleteBooking.mutate(id, {
      onSuccess: () => {
        toast({ title: "Removed", description: "Trip removed from history." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to remove trip.", variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md mx-auto p-8 rounded-2xl bg-white shadow-sm border border-red-100">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unavailable</h2>
          <p className="text-gray-500 mb-6">We couldn't load your tickets. This might be a temporary connection issue.</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-8 flex items-center">
          <Ticket className="mr-3 h-8 w-8 text-primary" />
          My Tickets
        </h1>

        <div className="space-y-6">
          {bookings?.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl shadow-sm">
              <Ticket className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-gray-900">No upcoming trips</h2>
              <p className="text-gray-500 mb-6">Ready to explore? Book your first ride now.</p>
              <Button onClick={() => window.location.href = "/dashboard"} className="btn-primary">Find a Ride</Button>
            </div>
          ) : (
            (bookings as BookingData[])?.map((booking) => (
              <div key={booking._id || booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 sm:p-6">
                  {/* Header: Route and Status */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Route</div>
                      <div className="font-bold text-lg text-gray-900 flex items-center flex-wrap gap-1">
                        <span className="truncate">{booking.route?.startLocation || "Unknown"}</span>
                        <span className="text-gray-300 flex-shrink-0">→</span>
                        <span className="truncate">{booking.route?.endLocation || "Unknown"}</span>
                      </div>
                    </div>
                    <span className={`self-start px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${booking.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : booking.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                      }`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Trip Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 p-4 bg-slate-50 rounded-xl">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Date
                      </div>
                      <div className="font-semibold text-gray-900">
                        {booking.schedule?.departureTime
                          ? format(new Date(booking.schedule.departureTime), "MMM d, yyyy")
                          : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Time
                      </div>
                      <div className="font-semibold text-gray-900">
                        {booking.schedule?.departureTime
                          ? format(new Date(booking.schedule.departureTime), "HH:mm")
                          : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Price</div>
                      <div className="font-bold text-emerald-600">
                        GHS {Number(booking.price || booking.schedule?.price || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Seat</div>
                      <div className="font-bold text-gray-900">
                        {booking.seatNumber}
                      </div>
                    </div>
                  </div>

                  {/* Pickup & Dropoff Details */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Pick-up</div>
                      <div className="font-bold text-gray-900 line-clamp-1">{booking.pickup || booking.route?.startLocation || booking.schedule?.route?.startLocation || "Unknown"}</div>
                    </div>
                    <div className="px-4 text-gray-300">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Drop-off</div>
                      <div className="font-bold text-gray-900 line-clamp-1">{booking.dropoff || booking.route?.endLocation || booking.schedule?.route?.endLocation || "Unknown"}</div>
                    </div>
                  </div>

                  {/* Driver & Vehicle Details */}
                  {booking.schedule?.driver && (
                    <div className="flex flex-wrap gap-x-6 gap-y-3 pb-5 mb-5 border-b border-gray-100">
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Driver</div>
                        <div className="text-sm font-semibold text-gray-700">
                          {booking.schedule.driver.firstName} {booking.schedule.driver.lastName}
                        </div>
                      </div>
                      {booking.schedule.driver.phone && (
                        <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Contact</div>
                          <a
                            href={`tel:${booking.schedule.driver.phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-lg transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {booking.schedule.driver.phone}
                          </a>
                        </div>
                      )}
                      {booking.schedule.driver.vehicle && (
                        <>
                          <div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Vehicle</div>
                            <div className="text-sm font-semibold text-gray-700">
                              {booking.schedule.driver.vehicle.make} {booking.schedule.driver.vehicle.model}
                              <span className="ml-1 text-xs font-normal text-gray-400">({booking.schedule.driver.vehicle.color})</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Plate Number</div>
                            <div className="inline-block px-2 py-0.5 bg-yellow-100 border border-yellow-300 rounded text-xs font-mono font-bold text-yellow-800">
                              {booking.schedule.driver.vehicle.plateNumber}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Share Location Toggle */}
                    {booking.status === 'confirmed' && user && (
                      <div className="flex-shrink-0">
                        <ShareLocationToggle
                          scheduleId={booking.scheduleId}
                          userId={user._id}
                          userName={`${user.firstName} ${user.lastName}`}
                        />
                      </div>
                    )}

                    {/* Spacer for non-confirmed bookings */}
                    {booking.status !== 'confirmed' && <div />}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                      {/* Track Bus Button */}
                      {booking.status === 'confirmed' && (
                        <Button
                          variant={activeTrackingId === booking._id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveTrackingId(activeTrackingId === booking._id ? null : (booking._id || String(booking.id)))}
                          className="gap-2"
                        >
                          <MapIcon className="h-4 w-4" />
                          {activeTrackingId === booking._id ? "Stop Tracking" : "Track Bus"}
                        </Button>
                      )}

                      {/* Cancel Button */}
                      {booking.status === 'confirmed' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 border-red-200">
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Trip</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this trip?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Ride</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancel(booking._id || String(booking.id))} className="bg-red-600 hover:bg-red-700">
                                Yes, Cancel
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* Delete Button */}
                      {(booking.status === 'cancelled' || booking.status === 'completed') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4 mr-1" /> Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove from History?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this {booking.status} trip from your list.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(booking._id || String(booking.id))}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Tracking Map */}
                {activeTrackingId === booking._id && (
                  <div className="p-6 pt-0 border-t border-gray-50 bg-slate-50/30">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                        Live Bus Location
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTrackingId(null)}
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Stop Tracking
                      </Button>
                    </div>
                    <LiveMap key={booking.scheduleId} scheduleId={booking.scheduleId} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
