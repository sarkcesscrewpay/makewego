// client/src/components/SOSButton.tsx
import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { AlertTriangle, Phone, MapPin, X, Shield, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SOSButtonProps {
  scheduleId?: string;
  routeInfo?: {
    startLocation: string;
    endLocation: string;
  };
}

const EMERGENCY_CONTACTS = [
  { name: 'Ghana Police', number: '191', icon: Shield },
  { name: 'Ambulance', number: '193', icon: AlertTriangle },
  { name: 'Fire Service', number: '192', icon: AlertTriangle },
];

export default function SOSButton({ scheduleId, routeInfo }: SOSButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleOpenSOS = () => {
    setIsOpen(true);
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.error('Location error:', err);
        }
      );
    }
  };

  const handleCallEmergency = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleShareLocation = async () => {
    if (!location) {
      toast({
        title: 'Location not available',
        description: 'Please enable location services',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // Create shareable message
      const message = `EMERGENCY: I need help!\n\nLocation: https://maps.google.com/?q=${location.lat},${location.lng}\n\nRoute: ${routeInfo?.startLocation || 'Unknown'} → ${routeInfo?.endLocation || 'Unknown'}`;

      // Try native share API first
      if (navigator.share) {
        await navigator.share({
          title: 'Emergency Alert',
          text: message,
        });
        toast({ title: 'Location shared successfully' });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(message);
        toast({ title: 'Location copied to clipboard', description: 'Paste and send to your emergency contact' });
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: 'Could not share location',
        description: 'Please call emergency services directly',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAlertToDriver = async () => {
    if (!scheduleId) return;

    setIsSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/sos/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scheduleId,
          location,
          message: 'Passenger needs assistance',
        }),
      });

      if (res.ok) {
        toast({ title: 'Alert sent to driver', description: 'The driver has been notified' });
      }
    } catch (error) {
      // Silently fail - emergency calls are more important
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* SOS Button */}
      <button
        onClick={handleOpenSOS}
        className="fixed bottom-24 md:bottom-6 right-4 z-40 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
      >
        <AlertTriangle className="h-6 w-6" />
      </button>

      {/* SOS Dialog */}
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
            <div className="fixed inset-0 bg-black/50" />
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
                <Dialog.Panel className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-red-600 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <Dialog.Title className="text-xl font-bold flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6" />
                        Emergency SOS
                      </Dialog.Title>
                      <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-red-500 rounded">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-red-100 text-sm mt-1">
                      Call emergency services or share your location
                    </p>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Emergency Numbers */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                        Emergency Services
                      </p>
                      <div className="space-y-2">
                        {EMERGENCY_CONTACTS.map((contact) => (
                          <button
                            key={contact.number}
                            onClick={() => handleCallEmergency(contact.number)}
                            className="w-full flex items-center gap-3 p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                          >
                            <div className="p-2 bg-red-100 rounded-lg">
                              <Phone className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-semibold text-slate-800">{contact.name}</p>
                              <p className="text-sm text-red-600 font-mono">{contact.number}</p>
                            </div>
                            <Phone className="h-5 w-5 text-red-500" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Location */}
                    {location && (
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                          <MapPin className="h-4 w-4" />
                          <span className="text-xs font-medium">Your Location</span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        onClick={handleShareLocation}
                        disabled={isSending || !location}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Share Location with Contact
                      </Button>

                      {scheduleId && (
                        <Button
                          onClick={handleSendAlertToDriver}
                          disabled={isSending}
                          variant="outline"
                          className="w-full"
                        >
                          Alert Driver
                        </Button>
                      )}
                    </div>

                    {/* Disclaimer */}
                    <p className="text-xs text-slate-400 text-center">
                      In case of emergency, always call emergency services first
                    </p>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
