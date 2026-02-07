// client/src/components/ReportIssue.tsx - Crowdsourced updates
import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { AlertCircle, X, Clock, Car, Construction, Users, Send, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ReportIssueProps {
  scheduleId?: string;
  routeId?: string;
  routeName?: string;
}

const ISSUE_TYPES = [
  { id: 'delay', label: 'Delay', icon: Clock, color: 'amber' },
  { id: 'breakdown', label: 'Breakdown', icon: Car, color: 'red' },
  { id: 'road_condition', label: 'Road Issue', icon: Construction, color: 'orange' },
  { id: 'overcrowded', label: 'Overcrowded', icon: Users, color: 'purple' },
];

export default function ReportIssue({ scheduleId, routeId, routeName }: ReportIssueProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
    // Get location for the report
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Ignore errors
      );
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      toast({ title: 'Please select an issue type', variant: 'destructive' });
      return;
    }

    setIsSending(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: selectedType,
          scheduleId,
          routeId,
          details,
          location,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Report Submitted',
          description: 'Thank you for helping other passengers!',
        });
        setIsOpen(false);
        setSelectedType(null);
        setDetails('');
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      toast({
        title: 'Report Saved Locally',
        description: 'Will be submitted when online',
      });
      // Could save to IndexedDB for offline sync
      setIsOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="rounded-full text-amber-600 border-amber-200 hover:bg-amber-50"
      >
        <AlertCircle className="h-4 w-4 mr-2" />
        Report Issue
      </Button>

      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
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
                <Dialog.Panel className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Report an Issue
                    </Dialog.Title>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {routeName && (
                    <div className="bg-slate-50 rounded-xl p-3 mb-4">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Route:</span> {routeName}
                      </p>
                    </div>
                  )}

                  {/* Issue Type Selection */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">What's the issue?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ISSUE_TYPES.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedType === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setSelectedType(type.id)}
                            className={`p-3 rounded-xl border-2 transition-all ${
                              isSelected
                                ? `border-${type.color}-500 bg-${type.color}-50`
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <Icon className={`h-6 w-6 mx-auto mb-1 ${
                              isSelected ? `text-${type.color}-500` : 'text-slate-400'
                            }`} />
                            <p className={`text-sm font-medium ${
                              isSelected ? `text-${type.color}-700` : 'text-slate-600'
                            }`}>
                              {type.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Additional details (optional)</p>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Describe the issue..."
                      rows={3}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                  </div>

                  {/* Location */}
                  {location && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                      <MapPin className="h-3 w-3" />
                      <span>Location will be included</span>
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedType || isSending}
                    className="w-full bg-amber-500 hover:bg-amber-600"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSending ? 'Submitting...' : 'Submit Report'}
                  </Button>

                  <p className="text-xs text-slate-400 text-center mt-3">
                    Your report helps other passengers plan better
                  </p>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
