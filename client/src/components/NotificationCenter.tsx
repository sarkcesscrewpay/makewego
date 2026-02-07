// client/src/components/NotificationCenter.tsx
import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Bell, BellOff, Clock, AlertTriangle, MapPin, CheckCircle, Trash2, Check, Car, UserCheck, Phone, Loader2, XCircle, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useAcceptRideRequest,
  useDeclineRideRequest,
  isSoundEnabled,
  setSoundEnabled,
  type Notification,
  type NotificationType,
} from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  arrival: <MapPin className="h-5 w-5 text-emerald-500" />,
  delay: <Clock className="h-5 w-5 text-amber-500" />,
  congestion: <AlertTriangle className="h-5 w-5 text-red-500" />,
  route_change: <MapPin className="h-5 w-5 text-blue-500" />,
  booking: <CheckCircle className="h-5 w-5 text-blue-500" />,
  general: <Bell className="h-5 w-5 text-slate-500" />,
  ride_request: <Car className="h-5 w-5 text-orange-500" />,
  ride_request_accepted: <UserCheck className="h-5 w-5 text-green-500" />,
};

const notificationColors: Record<NotificationType, string> = {
  arrival: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
  delay: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
  congestion: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
  route_change: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
  booking: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
  general: "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700",
  ride_request: "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800",
  ride_request_accepted: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
};

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(50, false, user?.role);
  const { toast } = useToast();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const acceptRideRequest = useAcceptRideRequest();
  const declineRideRequest = useDeclineRideRequest();

  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Load sound preference on mount
  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
  }, []);

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabledState(newValue);
    setSoundEnabled(newValue);
    toast({
      title: newValue ? "Sound enabled" : "Sound muted",
      description: newValue ? "You'll hear a chime for new notifications" : "Notification sounds are now muted",
    });
  };

  // Support both `read` and `isRead` field names (DB returns isRead, interface expects read)
  const isRead = (n: Notification) => (n as any).read ?? (n as any).isRead ?? false;
  const unreadNotifications = notifications.filter((n) => !isRead(n));

  const isDriver = user?.role === "driver";

  const handleMarkAsRead = (notification: Notification) => {
    if (!isRead(notification)) {
      markAsRead.mutate(notification._id);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  const handleAcceptRideRequest = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    const requestId = notification.data?.requestId;
    if (!requestId) return;

    setProcessingRequests((prev) => new Set(prev).add(requestId));

    try {
      const result = await acceptRideRequest.mutateAsync({ requestId, scheduleId: notification.data?.scheduleId });
      toast({
        title: "Booking Confirmed!",
        description: `Seat reserved for ${notification.data?.passengerName || "passenger"}. They have been notified.`,
      });
      // Auto-delete the notification after successful acceptance
      deleteNotification.mutate(notification._id);
    } catch (error: any) {
      toast({
        title: "Failed to confirm",
        description: error.message || "Could not confirm the booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleDeclineRideRequest = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    const requestId = notification.data?.requestId;
    if (!requestId) return;

    setProcessingRequests((prev) => new Set(prev).add(requestId));

    try {
      await declineRideRequest.mutateAsync(requestId);
      toast({
        title: "Request declined",
        description: "The ride request has been dismissed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not decline the request.",
        variant: "destructive",
      });
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        {/* Slide-out panel */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="ease-in duration-200"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <Dialog.Panel className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <Dialog.Title className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </Dialog.Title>
              <div className="flex items-center gap-1">
                {unreadNotifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSound}
                  title={soundEnabled ? "Mute notifications" : "Enable notification sound"}
                  className={soundEnabled ? "text-blue-600" : "text-slate-400"}
                >
                  {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BellOff className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No notifications yet</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                    You'll see bus alerts and updates here
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <Card
                    key={notification._id}
                    onClick={() => handleMarkAsRead(notification)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                      isRead(notification)
                        ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-70"
                        : notificationColors[notification.type]
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {notificationIcons[notification.type]}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-semibold text-slate-800 dark:text-white ${!isRead(notification) ? "font-bold" : ""}`}>
                            {notification.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0 text-slate-400 hover:text-red-500"
                            onClick={(e) => handleDelete(notification._id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{notification.body}</p>

                        {/* Extra data */}
                        {notification.data?.delayMinutes && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                            {notification.data.delayMinutes} min delay
                          </span>
                        )}

                        {notification.data?.severity && notification.data.severity !== "low" && (
                          <span
                            className={`inline-block mt-2 ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                              notification.data.severity === "high"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {notification.data.severity} priority
                          </span>
                        )}

                        {/* Ride request details and actions */}
                        {notification.type === "ride_request" && (
                          <div className="mt-3 space-y-3">
                            {/* Route info */}
                            {(notification.data?.from || notification.data?.to) && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <MapPin className="h-4 w-4 text-orange-500" />
                                <span className="font-medium">{notification.data?.from}</span>
                                <span className="text-slate-400 dark:text-slate-500">→</span>
                                <span className="font-medium">{notification.data?.to}</span>
                                {notification.data?.seats && notification.data.seats > 1 && (
                                  <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                                    {notification.data.seats} seats
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Fare estimate */}
                            {notification.data?.estimatedFare && (
                              <div className="flex items-center gap-3 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                <div className="flex-1">
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Estimated Fare</span>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                                      GHS {Number(notification.data.estimatedFare).toFixed(2)}
                                    </span>
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400">per seat</span>
                                  </div>
                                </div>
                                {notification.data.estimatedDistance && (
                                  <div className="text-right">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Distance</span>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                      {notification.data.estimatedDistance} km
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Phone call button */}
                            {notification.data?.passengerPhone ? (
                              <a
                                href={`tel:${notification.data.passengerPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                              >
                                <Phone className="h-4 w-4" />
                                <span>Call Passenger: {notification.data.passengerPhone}</span>
                              </a>
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm rounded-xl">
                                <Phone className="h-4 w-4" />
                                <span>No phone number provided</span>
                              </div>
                            )}

                            {/* Confirm / Decline buttons for drivers */}
                            {isDriver && notification.data?.requestId && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => handleAcceptRideRequest(notification, e)}
                                  disabled={processingRequests.has(notification.data.requestId)}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10"
                                >
                                  {processingRequests.has(notification.data.requestId) ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Confirm Seat
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => handleDeclineRideRequest(notification, e)}
                                  disabled={processingRequests.has(notification.data.requestId)}
                                  className="px-4 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl h-10"
                                >
                                  {processingRequests.has(notification.data.requestId) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!isRead(notification) && (
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 bg-blue-500 rounded-full" />
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
}
