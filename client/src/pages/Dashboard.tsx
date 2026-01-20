import { useState } from "react";
import { useSchedules, useCreateBooking } from "@/hooks/use-schedules"; // We'll fix export in hooks
import { useCreateBooking as useBookingMutation } from "@/hooks/use-bookings"; 
import { RouteMap } from "@/components/RouteMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Search, MapPin, Calendar, Clock, ArrowRight, Bus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [search, setSearch] = useState({ from: "", to: "", date: "" });
  const { data: schedules, isLoading } = useSchedules(search);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // React Query automatically refetches when search state changes if passed as dependency
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Search Header */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8 bg-primary">
            <h1 className="text-3xl font-display font-bold text-white mb-2">We Go: Find your next trip</h1>
            <p className="text-blue-100">Compare prices, schedules, and book in seconds across Ghana.</p>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input 
                  placeholder="From (Accra, Circle, etc.)" 
                  className="pl-10 h-12 text-lg" 
                  value={search.from}
                  onChange={(e) => setSearch({ ...search, from: e.target.value })}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input 
                  placeholder="To (Kumasi, Kejetia, etc.)" 
                  className="pl-10 h-12 text-lg" 
                  value={search.to}
                  onChange={(e) => setSearch({ ...search, to: e.target.value })}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input 
                  type="date" 
                  className="pl-10 h-12 text-lg" 
                  value={search.date}
                  onChange={(e) => setSearch({ ...search, date: e.target.value })}
                />
              </div>
              <Button type="submit" className="h-12 text-lg btn-primary">
                <Search className="mr-2 h-5 w-5" /> Search
              </Button>
            </form>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Bus className="mr-2 text-primary" /> Available Routes
            </h2>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-white rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : schedules?.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <Bus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No buses found</h3>
                <p className="text-gray-500">Try adjusting your search criteria.</p>
              </div>
            ) : (
              schedules?.map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))
            )}
          </div>

          <div className="hidden lg:block">
            <div className="bg-white p-6 rounded-2xl shadow-sm sticky top-24">
              <h3 className="font-semibold text-gray-800 mb-4">Popular Routes</h3>
              <div className="space-y-4">
                {/* Static map preview of a popular route */}
                <RouteMap 
                  startLocation="Accra" 
                  endLocation="Kumasi" 
                  stops={["Linda Dor"]} 
                  className="h-64 w-full rounded-xl"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Most travelers are heading to Kumasi today.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ schedule }: { schedule: any }) {
  const { toast } = useToast();
  const createBooking = useBookingMutation();
  const [open, setOpen] = useState(false);

  const handleBook = () => {
    createBooking.mutate({
      scheduleId: schedule.id,
      userId: "temp-user-id", // Backend handles user from session, this is for schema satisfaction if needed, but schema says userId is from auth usually.
      seatNumber: Math.floor(Math.random() * 40) + 1, // Simple random seat for demo
      status: "confirmed"
    }, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: "Booking Confirmed!", description: "Your ticket has been sent to your email." });
      },
      onError: (err) => {
        toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
              <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {schedule.bus.plateNumber}
              </span>
              <span>•</span>
              <span>{schedule.bus.driverName}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              {schedule.route.startLocation} 
              <ArrowRight className="mx-2 h-5 w-5 text-gray-400" />
              {schedule.route.endLocation}
            </h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">GHS {schedule.price}</div>
            <div className="text-sm text-gray-500">per person</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex space-x-6 text-gray-600">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              <div>
                <div className="font-semibold">{format(new Date(schedule.departureTime), "HH:mm")}</div>
                <div className="text-xs text-gray-500">Departure</div>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              <div>
                <div className="font-semibold">{format(new Date(schedule.arrivalTime), "HH:mm")}</div>
                <div className="text-xs text-gray-500">Arrival</div>
              </div>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary">Book Now</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Booking</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Route</span>
                    <span className="font-medium">{schedule.route.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium">{format(new Date(schedule.departureTime), "PPP")}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium">{format(new Date(schedule.departureTime), "HH:mm")}</span>
                  </div>
                  <div className="border-t border-gray-200 my-2 pt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total Price</span>
                    <span className="font-bold text-primary text-xl">GHS {schedule.price}</span>
                  </div>
                </div>
                
                <div className="h-32 rounded-lg overflow-hidden border border-gray-200">
                  <RouteMap 
                    startLocation={schedule.route.startLocation}
                    endLocation={schedule.route.endLocation}
                    stops={schedule.route.stops as string[]}
                    className="h-full w-full"
                  />
                </div>
              </div>
              <Button onClick={handleBook} disabled={createBooking.isPending} className="w-full btn-primary">
                {createBooking.isPending ? "Processing..." : "Confirm & Pay"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </motion.div>
  );
}
