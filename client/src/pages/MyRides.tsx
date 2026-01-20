import { useBookings, useCancelBooking } from "@/hooks/use-bookings";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Ticket, Calendar, Clock, MapPin, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

export default function MyRides() {
  const { data: bookings, isLoading } = useBookings();
  const cancelBooking = useCancelBooking();
  const { toast } = useToast();

  const handleCancel = (id: number) => {
    cancelBooking.mutate(id, {
      onSuccess: () => {
        toast({ title: "Booking Cancelled", description: "Your refund has been processed." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to cancel booking.", variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

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
            bookings?.map((booking) => (
              <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 md:flex md:justify-between md:items-center">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4 md:hidden">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Route</div>
                        <div className="font-bold text-lg text-gray-900 flex items-center">
                          {booking.route.startLocation}
                          <span className="mx-2 text-gray-300">→</span>
                          {booking.route.endLocation}
                        </div>
                      </div>
                      
                      <div className="flex space-x-6">
                        <div>
                          <div className="text-sm text-gray-500 mb-1 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" /> Date
                          </div>
                          <div className="font-medium">
                            {format(new Date(booking.schedule.departureTime), "MMM d, yyyy")}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1 flex items-center">
                            <Clock className="w-3 h-3 mr-1" /> Time
                          </div>
                          <div className="font-medium">
                            {format(new Date(booking.schedule.departureTime), "HH:mm")}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Seat</div>
                          <div className="font-medium text-primary">#{booking.seatNumber}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 md:mt-0 md:ml-6 flex items-center space-x-4 border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="hidden md:block">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>
                    
                    {booking.status === 'confirmed' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 border-red-200">
                            Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel this trip? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Ride</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleCancel(booking.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Yes, Cancel
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
