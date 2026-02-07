// client/src/components/GroupBookingDialog.tsx
import { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { X, Users, Building2, Phone, User, FileText, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGroupBooking } from "@/hooks/use-bookings";
import { useToast } from "@/hooks/use-toast";

interface GroupBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: {
    _id: string;
    route: {
      startLocation: string;
      endLocation: string;
    };
    departureTime: string;
    price: number;
    availableSeats: number;
  };
}

const organizationTypes = [
  { value: "private", label: "Private Group" },
  { value: "church", label: "Church" },
  { value: "corporate", label: "Corporate" },
  { value: "government", label: "Government" },
  { value: "ngo", label: "NGO" },
  { value: "school", label: "School" },
];

export default function GroupBookingDialog({ isOpen, onClose, schedule }: GroupBookingDialogProps) {
  const { toast } = useToast();
  const groupBooking = useGroupBooking();

  const [formData, setFormData] = useState({
    numberOfSeats: 2,
    organizationName: "",
    organizationType: "private" as const,
    contactName: "",
    contactPhone: "",
    notes: "",
  });

  const maxSeats = Math.min(schedule.availableSeats, 50); // Cap at 50 for UI
  const totalPrice = formData.numberOfSeats * schedule.price;

  const handleSubmit = async () => {
    if (!formData.contactName || !formData.contactPhone) {
      toast({
        title: "Missing Information",
        description: "Please provide contact name and phone number",
        variant: "destructive",
      });
      return;
    }

    if (formData.numberOfSeats > schedule.availableSeats) {
      toast({
        title: "Not Enough Seats",
        description: `Only ${schedule.availableSeats} seats available`,
        variant: "destructive",
      });
      return;
    }

    try {
      await groupBooking.mutateAsync({
        scheduleId: schedule._id,
        numberOfSeats: formData.numberOfSeats,
        organizationName: formData.organizationName || undefined,
        organizationType: formData.organizationType,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        notes: formData.notes || undefined,
      });

      toast({
        title: "Group Booking Confirmed!",
        description: `${formData.numberOfSeats} seats booked successfully`,
      });

      onClose();
      // Reset form
      setFormData({
        numberOfSeats: 2,
        organizationName: "",
        organizationType: "private",
        contactName: "",
        contactPhone: "",
        notes: "",
      });
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Could not complete group booking",
        variant: "destructive",
      });
    }
  };

  const adjustSeats = (delta: number) => {
    const newValue = formData.numberOfSeats + delta;
    if (newValue >= 2 && newValue <= maxSeats) {
      setFormData({ ...formData, numberOfSeats: newValue });
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="h-6 w-6 text-blue-600" />
                    Group Booking
                  </Dialog.Title>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Route Info */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                  <p className="font-semibold text-slate-800">
                    {schedule.route.startLocation} → {schedule.route.endLocation}
                  </p>
                  <p className="text-sm text-slate-600">
                    {new Date(schedule.departureTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-emerald-600 font-medium mt-1">
                    GH₵ {schedule.price} per seat • {schedule.availableSeats} seats available
                  </p>
                </div>

                {/* Number of Seats */}
                <div className="mb-4">
                  <Label className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4" />
                    Number of Seats
                  </Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => adjustSeats(-1)}
                      disabled={formData.numberOfSeats <= 2}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-2xl font-bold text-slate-800 w-16 text-center">
                      {formData.numberOfSeats}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => adjustSeats(1)}
                      disabled={formData.numberOfSeats >= maxSeats}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Organization Type */}
                <div className="mb-4">
                  <Label className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4" />
                    Organization Type
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {organizationTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, organizationType: type.value as any })}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          formData.organizationType === type.value
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Organization Name (optional) */}
                {formData.organizationType !== "private" && (
                  <div className="mb-4">
                    <Label className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4" />
                      Organization Name
                    </Label>
                    <Input
                      placeholder="e.g. Grace Community Church"
                      value={formData.organizationName}
                      onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    />
                  </div>
                )}

                {/* Contact Name */}
                <div className="mb-4">
                  <Label className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    Contact Name *
                  </Label>
                  <Input
                    placeholder="Full name of contact person"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    required
                  />
                </div>

                {/* Contact Phone */}
                <div className="mb-4">
                  <Label className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4" />
                    Contact Phone *
                  </Label>
                  <Input
                    placeholder="e.g. 024 123 4567"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    required
                  />
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <Label className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    Special Requests (Optional)
                  </Label>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any special requirements..."
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* Total Price */}
                <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Total Price</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      GH₵ {totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.numberOfSeats} seats × GH₵ {schedule.price}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={groupBooking.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {groupBooking.isPending ? "Booking..." : "Confirm Booking"}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
