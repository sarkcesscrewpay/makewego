import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Edit3, Calculator, Info, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { authFetch, AuthError } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";



interface RouteDialogProps {
    editData?: any;
    onSuccess?: () => void;
}

export default function RouteDialog({ editData, onSuccess }: RouteDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);


    const [formData, setFormData] = useState({
        startLocation: "",
        endLocation: "",
        startCoords: null as { lat: number, lng: number } | null,
        endCoords: null as { lat: number, lng: number } | null,
        departureTime: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fareEstimate, setFareEstimate] = useState<{ price: number; distance: number; duration: number } | null>(null);
    const [isCalculatingFare, setIsCalculatingFare] = useState(false);
    useEffect(() => {
        if (open) {
            if (editData) {
                // Handle potentially nested data structure or flat structure
                const start = editData.startLocation || editData.route?.startLocation || "";
                const end = editData.endLocation || editData.route?.endLocation || "";

                let timeStr = "";
                if (editData.departureTime) {
                    try {
                        // date-fns format is safer for preserving local input time expectation than toISOString
                        timeStr = format(new Date(editData.departureTime), "yyyy-MM-dd'T'HH:mm");
                    } catch (e) {
                        console.error("Invalid date in editData", editData.departureTime);
                    }
                }

                setFormData({
                    startLocation: start,
                    endLocation: end,
                    startCoords: editData.route?.coordinates?.start || null,
                    endCoords: editData.route?.coordinates?.end || null,
                    departureTime: timeStr,
                });

                // Set existing fare if editing
                if (editData.price) {
                    setFareEstimate({
                        price: editData.price,
                        distance: editData.distance || 0,
                        duration: editData.duration || 0
                    });
                }
            } else {
                // Reset for new entry
                setFormData({
                    startLocation: "", endLocation: "", startCoords: null, endCoords: null, departureTime: ""
                });
                setFareEstimate(null);
            }
        }
    }, [open, editData]);

    // Fetch fare estimate when locations change
    useEffect(() => {
        const fetchFareEstimate = async () => {
            if (!formData.startLocation || !formData.endLocation) {
                setFareEstimate(null);
                return;
            }

            setIsCalculatingFare(true);
            try {
                const res = await authFetch("/api/fare/estimate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        startLocation: formData.startLocation,
                        endLocation: formData.endLocation,
                        startCoords: formData.startCoords,
                        endCoords: formData.endCoords
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    setFareEstimate({
                        price: data.pricePerSeat,
                        distance: data.distance,
                        duration: data.duration
                    });
                }
            } catch (error) {
                if (error instanceof AuthError) {
                    toast({ title: "Session Expired", description: "Please log in again to continue.", variant: "destructive" });
                    setOpen(false);
                } else {
                    console.error("Failed to fetch fare estimate:", error);
                }
            } finally {
                setIsCalculatingFare(false);
            }
        };

        // Debounce the API call
        const timeoutId = setTimeout(fetchFareEstimate, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.startLocation, formData.endLocation, formData.startCoords, formData.endCoords, toast]);

    const handleAction = async () => {
        // Basic validation
        if (!formData.startLocation || !formData.endLocation || !formData.departureTime) {
            toast({ title: "Validation Error", description: "Please fill all fields", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const isEdit = !!editData;
            const id = editData?._id || editData?.id;
            const url = isEdit ? `/api/schedules/${id}` : "/api/schedules";

            const res = await authFetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    startLocation: formData.startLocation,
                    endLocation: formData.endLocation,
                    startCoords: formData.startCoords,
                    endCoords: formData.endCoords,
                    departureTime: new Date(formData.departureTime).toISOString(),
                    driverId: user?._id
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to save route");
            }

            const data = await res.json();
            toast({
                title: isEdit ? "Route Updated" : "Route Created Successfully",
                description: `Fare: GHS ${data.price?.toFixed(2) || fareEstimate?.price?.toFixed(2) || 'calculated'} per seat`
            });
            setOpen(false);
            onSuccess?.();
        } catch (e: any) {
            if (e instanceof AuthError) {
                toast({ title: "Session Expired", description: "Please log in again to continue.", variant: "destructive" });
            } else {
                toast({ title: "Error", description: e.message, variant: "destructive" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {editData ? (
                    <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black text-lg text-white shadow-lg shadow-blue-900/10 active:scale-[0.98] transition-all gap-3">
                        <Edit3 className="h-5 w-5" />
                        Edit
                    </Button>
                ) : (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-full px-6 font-bold text-white shadow-md">
                        <Plus className="mr-2 h-5 w-5" /> Add New Route
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] bg-white p-8 sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900">
                        {editData ? "Update Route" : "Add New Route"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        {editData ? "Update your route details below" : "Create a new route by filling out the details below"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-6">
                    {/* From Location */}
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-black">1</span>
                            From (Departure)
                        </Label>
                        <LocationAutocomplete
                            placeholder="e.g. Accra Mall, Circle Station..."
                            value={formData.startLocation}
                            onChange={val => setFormData({ ...formData, startLocation: val, startCoords: null })}
                            onLocationSelect={loc => {
                                if (loc.lat && loc.lng) {
                                    setFormData(prev => ({ ...prev, startLocation: loc.name, startCoords: { lat: loc.lat!, lng: loc.lng! } }));
                                } else {
                                    setFormData(prev => ({ ...prev, startLocation: loc.name }));
                                }
                            }}
                            className="h-14 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                    </div>

                    {/* To Location */}
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-black">2</span>
                            To (Destination)
                        </Label>
                        <LocationAutocomplete
                            placeholder="e.g. Kumasi, Tema Station..."
                            value={formData.endLocation}
                            onChange={val => setFormData({ ...formData, endLocation: val, endCoords: null })}
                            onLocationSelect={loc => {
                                if (loc.lat && loc.lng) {
                                    setFormData(prev => ({ ...prev, endLocation: loc.name, endCoords: { lat: loc.lat!, lng: loc.lng! } }));
                                } else {
                                    setFormData(prev => ({ ...prev, endLocation: loc.name }));
                                }
                            }}
                            className="h-14 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Departure Time */}
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-black">3</span>
                            Departure Time
                        </Label>
                        <Input
                            type="datetime-local"
                            value={formData.departureTime}
                            onChange={e => setFormData({ ...formData, departureTime: e.target.value })}
                            className="rounded-xl h-14 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all font-medium text-slate-800"
                        />
                    </div>



                    {/* Auto-calculated fare display */}
                    {(formData.startLocation && formData.endLocation) && (
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Calculator className="h-5 w-5 text-emerald-600" />
                                <span className="font-bold text-slate-700">Calculated Fare</span>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-4 w-4 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        <p>Fare is automatically calculated based on distance, vehicle type, fuel costs, maintenance, and platform fees.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            {isCalculatingFare ? (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
                                    <span>Calculating...</span>
                                </div>
                            ) : fareEstimate ? (
                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-emerald-700">
                                            GHS {fareEstimate.price.toFixed(2)}
                                        </span>
                                        <span className="text-slate-500">per seat</span>
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        Est. {fareEstimate.distance} km | ~{fareEstimate.duration} min
                                    </div>
                                </div>
                            ) : (
                                <span className="text-slate-500">Enter locations to see fare</span>
                            )}
                        </div>
                    )}

                    <Button
                        onClick={handleAction}
                        disabled={isSubmitting}
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all rounded-2xl font-bold text-lg mt-6 shadow-lg shadow-emerald-100 disabled:opacity-70 disabled:cursor-not-allowed text-white"
                    >
                        {isSubmitting ? (
                            <>Saving...</>
                        ) : (
                            <><Save className="mr-2 h-5 w-5" /> {editData ? "Update Schedule" : "Save Schedule"}</>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog >
    );
}
