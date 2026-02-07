import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Edit3, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DriverRoutesProps {
  editData?: any;
  onSuccess?: () => void;
}

export default function DriverRoutes({ editData, onSuccess }: DriverRoutesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    startLocation: "", endLocation: "", departureTime: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fareEstimate, setFareEstimate] = useState<{ price: number; distance: number } | null>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);

  // Reset form when dialog opens for new route
  useEffect(() => {
    if (open && !editData) {
      setFormData({
        startLocation: "", endLocation: "", departureTime: ""
      });
      setFareEstimate(null);
    }
  }, [open, editData]);

  // Populate form when editing - handle both nested and flat route fields
  useEffect(() => {
    if (editData && open) {
      setFormData({
        startLocation: editData.startLocation || editData.route?.startLocation || "",
        endLocation: editData.endLocation || editData.route?.endLocation || "",
        departureTime: editData.departureTime ? new Date(editData.departureTime).toISOString().slice(0, 16) : ""
      });
      if (editData.price) {
        setFareEstimate({ price: editData.price, distance: editData.distance || 0 });
      }
    }
  }, [editData, open]);

  // Fetch fare estimate when locations change
  useEffect(() => {
    const fetchFareEstimate = async () => {
      if (!formData.startLocation || !formData.endLocation) {
        setFareEstimate(null);
        return;
      }

      setIsCalculatingFare(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/fare/estimate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            startLocation: formData.startLocation,
            endLocation: formData.endLocation
          })
        });

        if (res.ok) {
          const data = await res.json();
          setFareEstimate({ price: data.pricePerSeat, distance: data.distance });
        }
      } catch (error) {
        console.error("Failed to fetch fare estimate:", error);
      } finally {
        setIsCalculatingFare(false);
      }
    };

    const timeoutId = setTimeout(fetchFareEstimate, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.startLocation, formData.endLocation]);

  const handleAction = async () => {
    // Validate form
    if (!formData.startLocation || !formData.endLocation || !formData.departureTime) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const isEdit = !!editData;
      const url = isEdit ? `/api/schedules/${editData._id || editData.id}` : "/api/schedules";

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          startLocation: formData.startLocation,
          endLocation: formData.endLocation,
          departureTime: formData.departureTime,
          driverId: user?._id
          // Note: price is auto-calculated on the server
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save");
      }

      const data = await res.json();
      toast({
        title: isEdit ? "Route Updated" : "Route Created",
        description: `Fare: GHS ${data.price?.toFixed(2) || fareEstimate?.price?.toFixed(2) || 'calculated'} per seat`
      });
      setOpen(false);
      // Reset form after successful create
      if (!isEdit) {
        setFormData({ startLocation: "", endLocation: "", departureTime: "" });
        setFareEstimate(null);
      }
      onSuccess?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editData ? (
          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full hover:bg-blue-50 text-blue-600">
            <Edit3 className="h-5 w-5" />
          </Button>
        ) : (
          <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-full px-6 font-bold text-white shadow-md">
            <Plus className="mr-2 h-5 w-5" /> Add New Route
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-[2.5rem] bg-white p-8">
        <DialogHeader><DialogTitle className="text-2xl font-black">{editData ? "Update Route" : "Add Route"}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1"><Label className="font-bold">From</Label><Input value={formData.startLocation} onChange={e => setFormData({...formData, startLocation: e.target.value})} className="rounded-xl h-12 bg-slate-50 border-none" /></div>
          <div className="space-y-1"><Label className="font-bold">To</Label><Input value={formData.endLocation} onChange={e => setFormData({...formData, endLocation: e.target.value})} className="rounded-xl h-12 bg-slate-50 border-none" /></div>
          <div className="space-y-1"><Label className="font-bold">Time</Label><Input type="datetime-local" value={formData.departureTime} onChange={e => setFormData({...formData, departureTime: e.target.value})} className="rounded-xl h-12 bg-slate-50 border-none" /></div>

          {/* Auto-calculated fare display */}
          {(formData.startLocation && formData.endLocation) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-slate-700">Auto-calculated Fare</span>
              </div>
              {isCalculatingFare ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <span>Calculating...</span>
                </div>
              ) : fareEstimate ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-blue-700">GHS {fareEstimate.price.toFixed(2)}</span>
                  <span className="text-slate-500">per seat | {fareEstimate.distance} km</span>
                </div>
              ) : (
                <span className="text-slate-500">Enter locations to see fare</span>
              )}
            </div>
          )}

          <Button onClick={handleAction} disabled={isSubmitting} className="w-full h-14 bg-blue-600 rounded-2xl font-bold text-lg mt-4 shadow-lg shadow-blue-100 disabled:opacity-50">
            <Save className="mr-2 h-5 w-5" /> {isSubmitting ? "Saving..." : (editData ? "Update Schedule" : "Save Schedule")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}