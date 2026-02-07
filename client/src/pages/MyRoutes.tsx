import { useAuth } from "@/hooks/use-auth";
import { useSchedules } from "@/hooks/use-schedules";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Bus, Clock, LayoutDashboard, Loader2, Navigation, Trash2, User } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns"; // Keep for other uses if any, or remove if unused.
import { formatDateSafe } from "@/lib/utils";
import RouteDialog from "./RouteDialog";
import TrackingToggle from "@/components/TrackingToggle";
import { useToast } from "@/hooks/use-toast";

export default function MyRoutes() {
    const { user } = useAuth();
    const { toast } = useToast();
    // Fetch only schedules for this driver
    const { data: mySchedules = [], isLoading, refetch } = useSchedules({ driverId: user?._id });

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this route forever?")) return;
        console.log("Attempting to delete schedule:", id);
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
            } else {
                const err = await res.json();
                console.error("Delete failed:", err);
                toast({ title: "Error", description: err.message, variant: "destructive" });
            }
        } catch (e) {
            console.error("Delete exception:", e);
            toast({ title: "Error", variant: "destructive" });
        }
    };

    // DEBUG: Log user status
    if (user) {
        console.log("Current Driver ID:", user._id);
    } else {
        console.log("No user logged in or user loading");
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-12">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER */}
                <div className="bg-slate-900 rounded-[2.5rem] shadow-xl overflow-hidden text-white p-8 md:p-12">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                                <Link href="/dashboard">
                                    <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
                                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                                    </span>
                                </Link>
                                <span>/</span>
                                <span className="text-white">My Routes</span>
                            </div>
                            <h1 className="text-4xl font-black tracking-tight">My Routes</h1>
                            <p className="text-slate-400 mt-2 text-lg">
                                Manage your active schedules and pricing
                            </p>
                        </div>
                        <div>
                            <RouteDialog onSuccess={() => refetch()} />
                        </div>
                    </div>
                </div>

                {/* ROUTES GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mySchedules.length > 0 ? (
                        mySchedules.map((s: any) => (
                            <Card key={s._id || s.id} className="rounded-[2.5rem] p-8 border-none shadow-sm hover:shadow-xl transition-all group bg-white relative">

                                {/* EDIT & DELETE BUTTONS (Visible on hover) */}
                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <RouteDialog editData={s} onSuccess={() => refetch()} />
                                    <Button
                                        onClick={() => handleDelete(s._id || s.id)}
                                        size="icon"
                                        variant="ghost"
                                        className="h-10 w-10 rounded-full bg-slate-50 hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                                            <Bus className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="font-black text-2xl text-blue-600">GHS {s.price?.toFixed(2) || '0.00'}</div>
                                            {user?.driverDetails?.vehicleParams && (
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {user.driverDetails.vehicleParams.make} {user.driverDetails.vehicleParams.model}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <TrackingToggle scheduleId={s._id || s.id} />
                                </div>

                                <div className="space-y-3">
                                    <div className="font-bold text-xl text-slate-700 flex items-center gap-3">
                                        {s.startLocation || s.route?.startLocation}
                                        <ArrowRight className="h-5 w-5 text-slate-300" />
                                        {s.endLocation || s.route?.endLocation}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                                        <Clock className="h-4 w-4" />
                                        {formatDateSafe(s.departureTime, "p")}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium pt-2 border-t border-slate-50">
                                        <User className="h-4 w-4" />
                                        <span className={s.availableSeats === 0 ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>
                                            {s.capacity - (s.availableSeats ?? s.capacity)}/{s.capacity || 15}
                                        </span>
                                        <span className="text-slate-400">seats booked</span>
                                    </div>
                                    {user?.driverDetails?.vehicleParams?.plateNumber && (
                                        <div className="pt-2">
                                            <span className="px-2 py-0.5 bg-yellow-100 border border-yellow-200 rounded text-[10px] font-mono font-bold text-yellow-800 uppercase">
                                                {user.driverDetails.vehicleParams.plateNumber}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                            <Bus className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-bold">No schedules found. Create your first route to begin.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
