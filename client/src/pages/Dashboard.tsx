import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSchedules } from "@/hooks/use-schedules";
import { useBookings, useCreateBooking } from "@/hooks/use-bookings";
import { useBusStops } from "@/hooks/use-bus-stops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { formatDateSafe, authFetch } from "@/lib/utils";
import { Search, MapPin, ArrowRight, Bus, Navigation, Clock, Wallet, Map as MapIcon, Trash2, Edit3, Loader2, XCircle, Users, Send, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import RouteDialog from "./RouteDialog";
import { Link } from "wouter";
import PassengerDemandMap from "@/components/PassengerDemandMap";
import TrackingToggle from "@/components/TrackingToggle";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { User as UserIcon } from "lucide-react";

// Lazy load map component
const LiveMap = lazy(() => import("@/components/LiveMap"));

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold animate-pulse">Loading Workspace...</p>
      </div>
    );
  }

  if (!user) return null;

  return user.role === "driver" ? <DriverDashboard user={user} /> : <PassengerDashboard />;
}

// ====================== DRIVER DASHBOARD ======================
function DriverDashboard({ user }: { user: any }) {
  const { toast } = useToast();
  const { data: allSchedules = [], isLoading, refetch } = useSchedules({ driverId: user?._id });

  const [isLive, setIsLive] = useState(user?.isLive || false);
  const [isTogglingLive, setIsTogglingLive] = useState(false);
  const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) setIsLive(!!user.isLive);
  }, [user?.isLive]);

  const toggleLive = async () => {
    setIsTogglingLive(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/driver/live-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ isLive: !isLive })
      });

      if (res.ok) {
        const data = await res.json();
        setIsLive(data.isLive);
        toast({
          title: data.isLive ? "You are now Live!" : "Broadcast Ended",
          description: data.isLive ? "Passengers can now see and book your routes." : "Your routes are now hidden from search."
        });
      } else {
        throw new Error("Failed to update status");
      }
    } catch (e) {
      toast({ title: "Error", description: "Could not update live status", variant: "destructive" });
    } finally {
      setIsTogglingLive(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this route forever?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast({ title: "Route removed" });
        refetch();
      }
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySchedules = allSchedules.filter((s: any) => {
    if (!s.departureTime) return false;
    const depTime = new Date(s.departureTime);
    depTime.setHours(0, 0, 0, 0);
    return depTime.getTime() === today.getTime();
  });

  const todayBookingsCount = todaySchedules.reduce((acc: number, s: any) =>
    acc + (s.capacity - (s.availableSeats ?? s.capacity)), 0);

  const todayEarnings = todaySchedules.reduce((acc: number, s: any) => {
    const booked = s.capacity - (s.availableSeats ?? s.capacity);
    return acc + (booked * (s.price || 0));
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pt-16 px-3 pb-20 md:pt-20 md:px-4 md:pb-12 transition-colors">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* DRIVER HEADER */}
        <div className="bg-slate-900 rounded-2xl md:rounded-[2rem] shadow-xl overflow-hidden text-white p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 text-center md:text-left">
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Driver Hub</h1>
              <p className="text-slate-400 mt-1 text-sm">
                Welcome back, <span className="text-emerald-400 font-bold">{user?.firstName}</span>
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {allSchedules.length === 0 && (
                <RouteDialog onSuccess={() => refetch()} />
              )}
              <Button
                size="sm"
                variant={isLive ? "destructive" : "secondary"}
                className={`rounded-full font-bold px-4 h-10 shadow-lg transition-all text-sm ${isTogglingLive ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={toggleLive}
                disabled={isTogglingLive}
              >
                <Navigation className={`mr-1.5 h-4 w-4 ${isLive ? "animate-pulse" : ""}`} />
                {isTogglingLive ? "Updating..." : (isLive ? "End Trip" : "Go Live")}
              </Button>
            </div>
          </div>

          <div className="mt-4 md:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
            <StatsCard label="Live Status" value={isLive ? "BROADCASTING" : "OFFLINE"} active={isLive} />
            <StatsCard label="Daily Earnings" value={`GHS ${todayEarnings.toFixed(2)}`} variant="emerald" />
            <StatsCard label="Today's Bookings" value={todayBookingsCount.toString()} />
            <StatsCard label="Active Fleet" value={`${allSchedules.length} Routes`} />
          </div>
        </div>

        {/* DRIVER ROUTES LIST */}
        <div className="space-y-3 md:space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 px-1">
            <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Active Operation</h2>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
              {allSchedules.length > 0 ? "Managing 1 Active Route" : "No Active Routes"}
            </div>
          </div>
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : allSchedules.length > 0 ? (
              allSchedules.map((s: any) => (
                <Card key={s._id || s.id} className="rounded-xl md:rounded-2xl p-4 md:p-5 border-none shadow-xl dark:shadow-slate-900 transition-all group bg-white dark:bg-slate-900 relative border border-slate-100 dark:border-slate-800">

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 border-b border-slate-50 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-900/20">
                        <Bus className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-black text-xl md:text-2xl text-slate-900 dark:text-white">GHS {s.price?.toFixed(2) || '0.00'}</div>
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">Base Price / Seat</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-inner">
                      <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="font-black text-[10px] uppercase tracking-tighter text-slate-600 dark:text-slate-400">
                        {isLive ? 'Currently Live' : 'System Offline'}
                      </span>
                      <TrackingToggle scheduleId={s._id || s.id} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Route Details</span>
                        <div className="font-black text-base md:text-lg text-slate-900 dark:text-white flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            {s.startLocation || s.route?.startLocation}
                          </div>
                          <div className="h-3 border-l-2 border-dashed border-slate-200 dark:border-slate-700 ml-1" />
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            {s.endLocation || s.route?.endLocation}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Departure</span>
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-black text-base">
                            <Clock className="h-4 w-4 text-blue-500" />
                            {formatDateSafe(s.departureTime, "p")}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Capacity</span>
                          <div className="flex items-center gap-2 font-black text-base">
                            <Users className="h-4 w-4 text-emerald-500" />
                            <span className={s.availableSeats === 0 ? 'text-red-500' : 'text-emerald-600'}>
                              {s.capacity - (s.availableSeats ?? s.capacity)}/{s.capacity || 15}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Actions Area */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                    <Button
                      variant={activeTrackingId === (s._id || s.id) ? "default" : "outline"}
                      className="rounded-xl font-black h-10 md:h-11 gap-2 text-sm transition-all active:scale-[0.98] shadow-md"
                      onClick={() => setActiveTrackingId(activeTrackingId === (s._id || s.id) ? null : (s._id || s.id))}
                    >
                      <MapIcon className="h-4 w-4" />
                      {activeTrackingId === (s._id || s.id) ? "Hide Live Demand" : "View Live Demand"}
                    </Button>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <RouteDialog editData={s} onSuccess={() => refetch()} />
                      </div>
                      <Button
                        onClick={() => handleDelete(s._id || s.id)}
                        variant="destructive"
                        className="h-10 md:h-11 w-10 md:w-11 rounded-xl shadow-lg shadow-red-900/10 active:scale-95 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {activeTrackingId === (s._id || s.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800"
                      >
                        <div className="h-[280px] md:h-[350px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl">
                          <PassengerDemandMap scheduleId={s._id || s.id} className="h-full w-full" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))
            ) : (
              <div className="py-16 md:py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bus className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-white mb-1">No Active Routes</h3>
                <p className="text-slate-400 font-bold text-sm max-w-sm mx-auto">Create your first journey to begin broadcasting.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ====================== PASSENGER DASHBOARD ======================
function PassengerDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState({
    from: "",
    to: "",
    date: "",
    seats: 1,
    departureTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    query: "" // Global search query
  });
  const [hasSearched, setHasSearched] = useState(false);

  // Only fetch filtered schedules when there's search criteria
  const hasSearchCriteria = search.from || search.to || search.query;
  const { data: schedules = [], isLoading, refetch } = useSchedules(
    hasSearchCriteria ? { from: search.from, to: search.to, date: search.date, query: search.query } : undefined
  );

  // Always fetch all schedules for Live Routes section (unfiltered)
  const { data: allSchedules = [], isLoading: allSchedulesLoading } = useSchedules();
  // IMPORTANT: Only show routes where the DRIVER is currently live (real-time status)
  // s.isLive on the schedule can be stale, so we check driver.isLive for actual live status
  const liveRoutes = allSchedules.filter((s: any) => s.driver?.isLive === true);

  const { data: allBookings = [], isLoading: bookingsLoading } = useBookings();
  const createBooking = useCreateBooking();
  const [bookingScheduleId, setBookingScheduleId] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);

  const [pickupStop, setPickupStop] = useState<string>("");
  const [dropoffStop, setDropoffStop] = useState<string>("");
  const [segmentPrice, setSegmentPrice] = useState<number | null>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);
  const [isNotifyingDrivers, setIsNotifyingDrivers] = useState(false);

  // Fare preview for ride request
  const [rideRequestFarePreview, setRideRequestFarePreview] = useState<{ price: number; distance: number } | null>(null);
  const [isCalculatingRideRequestFare, setIsCalculatingRideRequestFare] = useState(false);

  useEffect(() => {
    if (bookingScheduleId && pickupStop && dropoffStop) {
      const fetchFare = async () => {
        setIsCalculatingFare(true);
        try {
          const schedule = schedules.find((s: any) => String(s._id || s.id) === String(bookingScheduleId));
          const res = await authFetch("/api/fare/calculate", {
            method: "POST",
            body: JSON.stringify({
              startLocation: pickupStop,
              endLocation: dropoffStop,
              vehicleParams: schedule?.driver?.vehicle,
              capacity: schedule?.capacity
            })
          });
          if (res.ok) {
            const data = await res.json();
            setSegmentPrice(data.pricePerSeat);
          }
        } catch (err) {
          console.error("Fare calc error:", err);
        } finally {
          setIsCalculatingFare(false);
        }
      };
      fetchFare();
    }
  }, [bookingScheduleId, pickupStop, dropoffStop, schedules]);

  useEffect(() => {
    if (bookingScheduleId) {
      const s = schedules.find((s: any) => String(s._id || s.id) === String(bookingScheduleId));
      if (s) {
        const stopsList = Array.isArray(s.stops) ? s.stops : [];
        const hasPickup = stopsList.some((st: any) => st.name === search.from);
        const hasDropoff = stopsList.some((st: any) => st.name === search.to);
        setPickupStop(hasPickup ? search.from : (s.startLocation || s.route?.startLocation));
        setDropoffStop(hasDropoff ? search.to : (s.endLocation || s.route?.endLocation));
        setSegmentPrice(null);
      }
    } else {
      setPickupStop("");
      setDropoffStop("");
      setSegmentPrice(null);
    }
  }, [bookingScheduleId, search, schedules]);

  // Fetch fare preview when from/to locations change (for ride request)
  useEffect(() => {
    const fetchRideRequestFare = async () => {
      if (!search.from || !search.to) {
        setRideRequestFarePreview(null);
        return;
      }

      setIsCalculatingRideRequestFare(true);
      try {
        const res = await authFetch("/api/fare/estimate", {
          method: "POST",
          body: JSON.stringify({
            startLocation: search.from,
            endLocation: search.to
          })
        });

        if (res.ok) {
          const data = await res.json();
          setRideRequestFarePreview({ price: data.pricePerSeat, distance: data.distance });
        }
      } catch (error) {
        console.error("Failed to fetch fare preview:", error);
      } finally {
        setIsCalculatingRideRequestFare(false);
      }
    };

    const timeoutId = setTimeout(fetchRideRequestFare, 500);
    return () => clearTimeout(timeoutId);
  }, [search.from, search.to]);

  const handleSearch = () => {
    setHasSearched(true);
    refetch();
  };

  const handleBooking = async (scheduleId: string) => {
    try {
      await createBooking.mutateAsync({
        scheduleId,
        seatNumber: 0,
        pickup: pickupStop,
        dropoff: dropoffStop,
        price: segmentPrice,
        status: "confirmed",
      });
      toast({ title: "Booking Confirmed!", description: `Your seat has been reserved.`, duration: 5000 });
      setBookingScheduleId(null);
      refetch();
    } catch (e: any) {
      toast({ title: "Booking Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleTrack = (schedule: any) => {
    // Toggle tracking - if already tracking this schedule, stop tracking
    const currentId = selectedSchedule?._id || selectedSchedule?.id;
    const newId = schedule._id || schedule.id;

    if (currentId && String(currentId) === String(newId)) {
      // Already tracking this schedule, stop tracking
      setSelectedSchedule(null);
    } else {
      // Start tracking new schedule
      setSelectedSchedule(schedule);
      setTimeout(() => {
        const mapElement = document.getElementById("live-map-section");
        if (mapElement) mapElement.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleNotifyDrivers = async () => {
    if (!search.from || !search.to) {
      toast({ title: "Please enter from and to locations", variant: "destructive" });
      return;
    }
    setIsNotifyingDrivers(true);
    try {
      const res = await authFetch("/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          from: search.from,
          to: search.to,
          seats: search.seats,
          departureTime: search.departureTime
        })
      });
      if (res.ok) {
        const data = await res.json();
        const count = data.notifiedCount || 0;
        const fare = data.estimatedFare ? `GHS ${Number(data.estimatedFare).toFixed(2)}/seat` : '';
        const distance = data.estimatedDistance ? `${data.estimatedDistance}km` : '';
        const fareInfo = fare ? ` • Est. fare: ${fare}${distance ? ` (${distance})` : ''}` : '';

        if (count > 0) {
          toast({
            title: "Request Sent!",
            description: `Notified ${count} driver${count > 1 ? 's' : ''} on this route.${fareInfo}`
          });
        } else {
          toast({
            title: "Request Saved",
            description: `No drivers currently on this route. Your request has been saved.${fareInfo}`,
          });
        }
      } else {
        // Parse the actual error message from the server
        const errorData = await res.json().catch(() => ({ message: "Failed to send request" }));
        throw new Error(errorData.message || errorData.error || "Failed to send request");
      }
    } catch (err: any) {
      console.error("Ride request error:", err);
      toast({ title: "Error", description: err.message || "Could not send request", variant: "destructive" });
    } finally {
      setIsNotifyingDrivers(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pt-16 px-3 pb-20 md:pt-20 md:px-4 md:pb-12 transition-colors">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* PASSENGER HEADER */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl md:rounded-[2rem] shadow-xl text-white p-4 md:p-8">
          <div className="text-center md:text-left mb-4">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Find Your Ride</h1>
            <p className="text-blue-200 mt-1 text-sm md:text-base">
              Welcome back, <span className="text-white font-bold">{user?.firstName}</span>
            </p>
          </div>

          {/* QUICK GLOBAL SEARCH - Inline, no search button */}
          <div className="w-full relative group mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-blue-300 group-focus-within:text-white transition-colors" />
            </div>
            <Input
              placeholder="Quick find by bus or stop..."
              value={search.query}
              onChange={(e) => {
                setSearch({ ...search, query: e.target.value });
                setHasSearched(true);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-10 md:h-12 pl-10 rounded-xl bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-blue-200/60 focus:bg-white/20 focus:ring-2 focus:ring-white/30 transition-all font-medium text-sm"
            />
          </div>

          {/* TRIP & BROADCAST SECTION */}
          <div className="bg-emerald-500/10 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-6 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-4 border-b border-emerald-500/10 pb-3">
              <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-900/40">
                <Navigation className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-wider text-xs text-emerald-100">Trip & Notify</h3>
                <p className="text-emerald-200/60 text-[10px] font-bold hidden md:block">Find rides or broadcast demand</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              {/* From -> To */}
              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase text-emerald-200/60 ml-2">From</label>
                  <LocationAutocomplete
                    placeholder="Starting point"
                    value={search.from}
                    onChange={(val: string) => setSearch({ ...search, from: val })}
                    className="h-11 md:h-12 rounded-xl bg-white border-none text-slate-800 placeholder:text-slate-400 font-bold shadow-lg text-sm"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase text-emerald-200/60 ml-2">To</label>
                  <LocationAutocomplete
                    placeholder="Destination"
                    value={search.to}
                    onChange={(val: string) => setSearch({ ...search, to: val })}
                    className="h-11 md:h-12 rounded-xl bg-white border-none text-slate-800 placeholder:text-slate-400 font-bold shadow-lg text-sm"
                  />
                </div>
              </div>

              {/* Seats & Time */}
              <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase text-emerald-200/60 ml-2">Seats</label>
                  <Input
                    type="number"
                    min="1"
                    value={search.seats}
                    onChange={(e) => setSearch({ ...search, seats: parseInt(e.target.value) || 1 })}
                    className="h-11 md:h-12 rounded-xl bg-white border-none text-slate-800 font-bold shadow-lg text-center text-base"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase text-emerald-200/60 ml-2">Time</label>
                  <Input
                    type="datetime-local"
                    value={search.departureTime}
                    onChange={(e) => setSearch({ ...search, departureTime: e.target.value })}
                    className="h-11 md:h-12 rounded-xl bg-white border-none text-slate-800 font-bold shadow-lg text-sm pr-2"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="lg:col-span-3 flex flex-col gap-2">
                {/* Fare Preview */}
                {(search.from && search.to) && (
                  <div className="bg-white/90 backdrop-blur rounded-xl p-2 text-center">
                    {isCalculatingRideRequestFare ? (
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs font-medium">Calculating...</span>
                      </div>
                    ) : rideRequestFarePreview ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-black text-emerald-700">
                          GHS {rideRequestFarePreview.price.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400">{rideRequestFarePreview.distance}km</span>
                      </div>
                    ) : null}
                  </div>
                )}
                <Button
                  onClick={handleNotifyDrivers}
                  disabled={isNotifyingDrivers}
                  className="w-full h-11 md:h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-xl shadow-emerald-900/40 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  {isNotifyingDrivers ? <Loader2 className="animate-spin h-4 w-4" /> : (
                    <><Send className="mr-1.5 h-4 w-4" /> Notify Drivers</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVE TICKETS SECTION */}
        {allBookings.filter((b: any) => b.status === 'confirmed').length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-blue-600" />
                Active Tickets
              </h2>
              <Link href="/my-rides" className="text-xs font-bold text-blue-600 hover:underline">View History</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allBookings.filter((b: any) => b.status === 'confirmed').slice(0, 3).map((booking: any) => {
                const s = booking.schedule;
                const isLive = s?.isLive || s?.driver?.isLive;

                return (
                  <Card key={booking._id} className="rounded-xl md:rounded-2xl p-4 border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden relative group">
                    {isLive && (
                      <div className="absolute top-0 right-0 px-3 py-0.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl">
                        Live Now
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={`p-2.5 rounded-lg ${isLive ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Bus className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                          {booking.pickup || s?.route?.startLocation} → {booking.dropoff || s?.route?.endLocation}
                        </div>
                        <div className="text-[9px] font-black text-slate-400 uppercase">Seat #{booking.seatNumber}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Time</span>
                        <div className="text-xs font-black text-slate-700 dark:text-slate-200">
                          {formatDateSafe(s?.departureTime, "p")}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Driver</span>
                        <div className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">
                          {s?.driver?.firstName || "Assigning..."}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleTrack(s)}
                      disabled={!isLive}
                      size="sm"
                      className={`w-full h-9 rounded-lg font-bold text-xs ${isLive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-100 text-slate-400'}`}
                    >
                      <MapIcon className="mr-1.5 h-3.5 w-3.5" />
                      {isLive ? 'Track Live' : 'Not Started'}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* LIVE TRACKING MAP SECTION */}
        <AnimatePresence>
          {selectedSchedule && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              id="live-map-section"
              className="scroll-mt-20 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100">Live Tracking</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full animate-pulse line-clamp-1 max-w-[200px]">
                    {selectedSchedule.route?.startLocation} → {selectedSchedule.route?.endLocation}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedSchedule(null)}
                    className="h-7 w-7 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="h-[280px] md:h-[350px] w-full">
                <Suspense fallback={<div className="h-full w-full bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
                  <LiveMap key={selectedSchedule._id || selectedSchedule.id} scheduleId={selectedSchedule._id || selectedSchedule.id} />
                </Suspense>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LIVE ROUTES SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100">Live Routes Near You</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {liveRoutes.length} active
            </span>
          </div>

          {allSchedulesLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="animate-spin h-6 w-6 text-emerald-600" />
            </div>
          ) : liveRoutes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveRoutes.map((schedule: any) => (
                <RideCard
                  key={schedule._id || schedule.id}
                  schedule={schedule}
                  selected={String(selectedSchedule?._id || selectedSchedule?.id) === String(schedule._id || schedule.id)}
                  bookingActive={String(bookingScheduleId) === String(schedule._id || schedule.id)}
                  onTrack={handleTrack}
                  onBookInitiate={() => setBookingScheduleId(schedule._id || schedule.id)}
                  onBookCancel={() => setBookingScheduleId(null)}
                  pickupStop={pickupStop}
                  setPickupStop={setPickupStop}
                  dropoffStop={dropoffStop}
                  setDropoffStop={setDropoffStop}
                  segmentPrice={segmentPrice}
                  isCalculatingFare={isCalculatingFare}
                  handleBooking={() => handleBooking(schedule._id || schedule.id)}
                  bookingPending={createBooking.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="text-center bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-800 p-5 md:p-6 shadow-sm">
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Navigation className="h-6 w-6 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">No drivers are currently live.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Use "Notify Drivers" above to request a ride.</p>
            </div>
          )}
        </div>

        {/* SEARCH RESULTS - Only shown when user has search criteria */}
        {hasSearchCriteria && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                Search Results
              </h2>
              {(search.from || search.to || search.query) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch({ ...search, from: "", to: "", query: "" });
                    setHasSearched(false);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-red-500"
                >
                  <XCircle className="h-4 w-4 mr-1" /> Clear Search
                </Button>
              )}
            </div>

            {/* Search criteria summary */}
            <div className="flex flex-wrap gap-1.5 px-1 -mt-2">
              {search.from && (
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                  From: {search.from}
                </span>
              )}
              {search.to && (
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                  To: {search.to}
                </span>
              )}
              {search.query && (
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                  "{search.query}"
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
              </div>
            ) : Array.isArray(schedules) && schedules.length > 0 ? (
              <>
                {/* LIVE RIDES FROM SEARCH - Only drivers who are currently live */}
                {schedules.some((s: any) => s.driver?.isLive === true) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      <h3 className="text-base font-black text-slate-700 dark:text-slate-200">Matching Live Routes</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {schedules.filter((s: any) => s.driver?.isLive === true).map((schedule: any) => (
                        <RideCard
                          key={schedule._id || schedule.id}
                          schedule={schedule}
                          selected={String(selectedSchedule?._id || selectedSchedule?.id) === String(schedule._id || schedule.id)}
                          bookingActive={String(bookingScheduleId) === String(schedule._id || schedule.id)}
                          onTrack={handleTrack}
                          onBookInitiate={() => setBookingScheduleId(schedule._id || schedule.id)}
                          onBookCancel={() => setBookingScheduleId(null)}
                          pickupStop={pickupStop}
                          setPickupStop={setPickupStop}
                          dropoffStop={dropoffStop}
                          setDropoffStop={setDropoffStop}
                          segmentPrice={segmentPrice}
                          isCalculatingFare={isCalculatingFare}
                          handleBooking={() => handleBooking(schedule._id || schedule.id)}
                          bookingPending={createBooking.isPending}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* UPCOMING SCHEDULES FROM SEARCH - Drivers not currently live */}
                {schedules.some((s: any) => s.driver?.isLive !== true) && (
                  <div className="space-y-3">
                    <h3 className="text-base font-black text-slate-700 dark:text-slate-200 px-1">Matching Upcoming Schedules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {schedules.filter((s: any) => s.driver?.isLive !== true).map((schedule: any) => (
                        <RideCard
                          key={schedule._id || schedule.id}
                          schedule={schedule}
                          selected={String(selectedSchedule?._id || selectedSchedule?.id) === String(schedule._id || schedule.id)}
                          bookingActive={String(bookingScheduleId) === String(schedule._id || schedule.id)}
                          onTrack={handleTrack}
                          onBookInitiate={() => setBookingScheduleId(schedule._id || schedule.id)}
                          onBookCancel={() => setBookingScheduleId(null)}
                          pickupStop={pickupStop}
                          setPickupStop={setPickupStop}
                          dropoffStop={dropoffStop}
                          setDropoffStop={setDropoffStop}
                          segmentPrice={segmentPrice}
                          isCalculatingFare={isCalculatingFare}
                          handleBooking={() => handleBooking(schedule._id || schedule.id)}
                          bookingPending={createBooking.isPending}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 md:p-8">
                <Bus className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-bold text-base">No rides found matching your search.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try a different route or use "Notify Drivers" to request a ride.</p>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch({ ...search, from: "", to: "", query: "" });
                      setHasSearched(false);
                    }}
                    className="rounded-xl font-bold border-2 border-slate-200 dark:border-slate-700"
                  >
                    Clear Filters
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                    onClick={handleNotifyDrivers}
                    disabled={!search.from || !search.to}
                  >
                    <Send className="mr-2 h-4 w-4" /> Notify Drivers
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ====================== RIDE CARD COMPONENT ======================
function RideCard({
  schedule,
  selected,
  bookingActive,
  onTrack,
  onBookInitiate,
  onBookCancel,
  pickupStop,
  setPickupStop,
  dropoffStop,
  setDropoffStop,
  segmentPrice,
  isCalculatingFare,
  handleBooking,
  bookingPending
}: any) {
  const isLive = schedule.isLive || schedule.driver?.isLive;

  return (
    <Card className={`rounded-xl md:rounded-2xl p-4 md:p-5 border-none shadow-sm dark:shadow-slate-900 hover:shadow-lg dark:hover:shadow-slate-800 transition-all bg-white dark:bg-slate-900 ${selected ? 'ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-1 dark:ring-offset-slate-950' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isLive ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
            <Bus className="h-5 w-5" />
          </div>
          <div className={`font-black text-lg md:text-xl ${isLive ? 'text-emerald-600' : 'text-blue-600'}`}>
            GHS {schedule.price?.toFixed(2) || '0.00'}
          </div>
        </div>
        {isLive ? (
          <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Live
          </span>
        ) : (
          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider rounded-full">
            Scheduled
          </span>
        )}
      </div>

      <div className="space-y-2 mb-3">
        <div className="font-bold text-sm md:text-base text-slate-700 dark:text-slate-200 flex items-center gap-2">
          {schedule.startLocation || schedule.route?.startLocation}
          <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
          {schedule.endLocation || schedule.route?.endLocation}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Clock className="h-3.5 w-3.5" />
            {formatDateSafe(schedule.departureTime, "PPp")}
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Wallet className="h-3.5 w-3.5" />
            {schedule.availableSeats ?? schedule.capacity ?? 15} seats
          </span>
        </div>

        {/* DRIVER & BUS DETAILS */}
        <div className="pt-3 border-t border-slate-50 dark:border-slate-800 mt-1">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm">
              {schedule.driver?.firstName?.[0] || 'D'}
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Driver</div>
              <div className="text-xs font-black text-slate-800 dark:text-white">
                {schedule.driver?.firstName} {schedule.driver?.lastName || 'Driver'}
              </div>
            </div>
          </div>

          {schedule.driver?.vehicle && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase">Vehicle</div>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {schedule.driver.vehicle.make} {schedule.driver.vehicle.model}
                </div>
              </div>
              <div className="px-2 py-0.5 bg-yellow-100 border border-yellow-200 rounded text-[9px] font-mono font-bold text-yellow-800">
                {schedule.driver.vehicle.plateNumber}
              </div>
            </div>
          )}
        </div>

        {/* FULL ROUTE STOPS */}
        {Array.isArray(schedule.stops) && schedule.stops.length > 0 && (
          <div className="pt-2">
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Route Stops</div>
            <div className="flex flex-wrap gap-1.5">
              {schedule.stops.map((stop: any, idx: number) => (
                <div key={idx} className="flex items-center">
                  <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-[9px] font-bold text-blue-600 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800/50">
                    {stop.name}
                  </span>
                  {idx < schedule.stops.length - 1 && (
                    <ArrowRight className="h-2.5 w-2.5 mx-0.5 text-slate-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {bookingActive ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Pick-up From</label>
              <select
                value={pickupStop}
                onChange={(e) => setPickupStop(e.target.value)}
                className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                {(Array.isArray(schedule.stops) ? schedule.stops : []).map((stop: any) => (
                  <option key={stop.name} value={stop.name} className="bg-white dark:bg-slate-900">{stop.name}</option>
                ))}
              </select>
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Drop-off At</label>
              <select
                value={dropoffStop}
                onChange={(e) => setDropoffStop(e.target.value)}
                className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                {(Array.isArray(schedule.stops) ? schedule.stops : []).map((stop: any) => (
                  <option key={stop.name} value={stop.name} className="bg-white dark:bg-slate-900">{stop.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500">Segment Price</span>
            <div className="text-base font-black text-emerald-600">
              {isCalculatingFare ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `GHS ${segmentPrice?.toFixed(2) || schedule.price?.toFixed(2)}`
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleBooking}
              disabled={bookingPending || isCalculatingFare}
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-sm shadow-md shadow-emerald-100 dark:shadow-none"
            >
              {bookingPending ? "Assigning Seat..." : "Confirm Booking"}
            </Button>
            <Button
              onClick={onBookCancel}
              variant="ghost"
              className="h-10 rounded-lg text-slate-500 hover:bg-slate-100 text-sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onTrack(schedule)}
            disabled={!isLive}
            variant={selected ? "destructive" : "secondary"}
            className={`h-10 md:h-11 rounded-xl font-bold text-sm ${!isLive ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
          >
            {selected ? (
              <>
                <XCircle className="mr-1.5 h-4 w-4" /> Stop
              </>
            ) : (
              <>
                <Navigation className={`mr-1.5 h-4 w-4 ${isLive ? 'text-blue-600' : 'text-slate-400'}`} />
                {isLive ? "Track" : "Not Live"}
              </>
            )}
          </Button>
          <Button
            onClick={onBookInitiate}
            disabled={(schedule.availableSeats ?? schedule.capacity ?? 15) <= 0}
            className={`h-10 md:h-11 rounded-xl font-bold text-sm shadow-md ${(schedule.availableSeats ?? schedule.capacity ?? 15) <= 0
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100"
              }`}
          >
            {(schedule.availableSeats ?? schedule.capacity ?? 15) <= 0 ? "Full" : (isLive ? "Join Bus" : "Book")}
          </Button>
        </div>
      )}
    </Card>
  );
}


// ====================== STATS CARD COMPONENT ======================
function StatsCard({ label, value, active, variant }: { label: string, value: string, active?: boolean, variant?: 'emerald' | 'default' }) {
  const getBgColor = () => {
    if (active) return 'bg-emerald-500 text-white';
    if (variant === 'emerald') return 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20';
    return 'bg-slate-800 text-slate-300';
  };

  return (
    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl flex flex-col justify-center min-h-[70px] md:min-h-[80px] shadow-sm transition-all ${getBgColor()}`}>
      <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${active ? 'text-white/80' : (variant === 'emerald' ? 'text-emerald-400/70' : 'text-slate-500')}`}>{label}</p>
      <p className={`text-lg md:text-xl font-black text-white`}>{value}</p>
    </div>
  );
}