// client/src/components/TripShare.tsx
import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Share2, X, Copy, MessageCircle, Mail, Check, MapPin, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface TripShareProps {
  booking: {
    _id: string;
    schedule: {
      departureTime: string;
      driver?: {
        firstName: string;
        lastName: string;
        vehicle?: {
          plateNumber?: string;
          make?: string;
          model?: string;
        };
      };
    };
    route: {
      startLocation: string;
      endLocation: string;
    };
  };
}

export default function TripShare({ booking }: TripShareProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tripDetails = `
🚌 Trip Details
━━━━━━━━━━━━━━━
📍 From: ${booking.route.startLocation}
📍 To: ${booking.route.endLocation}
🕐 Time: ${new Date(booking.schedule.departureTime).toLocaleString()}
${booking.schedule.driver ? `
👤 Driver: ${booking.schedule.driver.firstName} ${booking.schedule.driver.lastName}
🚗 Vehicle: ${booking.schedule.driver.vehicle?.make || ''} ${booking.schedule.driver.vehicle?.model || ''}
🔢 Plate: ${booking.schedule.driver.vehicle?.plateNumber || 'N/A'}
` : ''}
━━━━━━━━━━━━━━━
Shared via Make We Go 🚌
  `.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tripDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied to clipboard' });
    } catch (error) {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Trip Details',
          text: tripDetails,
        });
      } catch (error) {
        // User cancelled
      }
    }
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(tripDetails);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleSMS = () => {
    const encoded = encodeURIComponent(tripDetails);
    window.location.href = `sms:?body=${encoded}`;
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('My Trip Details - Make We Go');
    const body = encodeURIComponent(tripDetails);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="rounded-full"
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share Trip
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
                      <Share2 className="h-5 w-5 text-blue-600" />
                      Share Trip
                    </Dialog.Title>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Trip Preview */}
                  <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-emerald-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">From</p>
                          <p className="font-medium text-slate-800">{booking.route.startLocation}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">To</p>
                          <p className="font-medium text-slate-800">{booking.route.endLocation}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Departure</p>
                          <p className="font-medium text-slate-800">
                            {new Date(booking.schedule.departureTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {booking.schedule.driver && (
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-purple-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-slate-500">Driver</p>
                            <p className="font-medium text-slate-800">
                              {booking.schedule.driver.firstName} {booking.schedule.driver.lastName}
                            </p>
                            {booking.schedule.driver.vehicle?.plateNumber && (
                              <p className="text-xs text-slate-500">
                                {booking.schedule.driver.vehicle.plateNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Share Options */}
                  <div className="space-y-2">
                    {'share' in navigator && (
                      <button
                        onClick={handleNativeShare}
                        className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                      >
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Share2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-slate-800">Share via...</span>
                      </button>
                    )}

                    <button
                      onClick={handleWhatsApp}
                      className="w-full flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                    >
                      <div className="p-2 bg-green-100 rounded-lg">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <span className="font-medium text-slate-800">WhatsApp</span>
                    </button>

                    <button
                      onClick={handleSMS}
                      className="w-full flex items-center gap-3 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                    >
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MessageCircle className="h-5 w-5 text-purple-600" />
                      </div>
                      <span className="font-medium text-slate-800">SMS</span>
                    </button>

                    <button
                      onClick={handleEmail}
                      className="w-full flex items-center gap-3 p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Mail className="h-5 w-5 text-amber-600" />
                      </div>
                      <span className="font-medium text-slate-800">Email</span>
                    </button>

                    <button
                      onClick={handleCopy}
                      className="w-full flex items-center gap-3 p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      <div className="p-2 bg-slate-200 rounded-lg">
                        {copied ? (
                          <Check className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Copy className="h-5 w-5 text-slate-600" />
                        )}
                      </div>
                      <span className="font-medium text-slate-800">
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                      </span>
                    </button>
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
