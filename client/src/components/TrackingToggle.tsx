import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, NavigationOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TrackingToggleProps {
    scheduleId: string;
}

export default function TrackingToggle({ scheduleId }: TrackingToggleProps) {
    const [isTracking, setIsTracking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const watchId = useRef<number | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const retryCount = useRef(0);
    const MAX_RETRIES = 5;
    const wakeLock = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { toast } = useToast();

    const stopTracking = () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
        retryCount.current = 0;

        const token = localStorage.getItem("token");
        // Sync visibility with backend
        fetch(`/api/schedules/${scheduleId}/toggle-live`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ isLive: false })
        }).catch(err => console.error("Visibility sync failed:", err));

        setIsTracking(false);
        localStorage.removeItem(`tracking_active_${scheduleId}`);

        // Release Wake Lock
        if (wakeLock.current) {
            wakeLock.current.release().then(() => {
                wakeLock.current = null;
            });
        }

        // Stop Audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        toast({ title: "Tracking Stopped", description: "You are now offline." });
    };

    const startTracking = () => {
        if (!navigator.geolocation) {
            toast({ title: "Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        const token = localStorage.getItem("token");
        // Sync visibility with backend
        fetch(`/api/schedules/${scheduleId}/toggle-live`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ isLive: true })
        }).catch(err => console.error("Visibility sync failed:", err));

        // IMMEDIATE LOCATION SEND: Send current location as soon as tracking starts
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // We'll send this as soon as the socket opens in startTracking
                console.log("[TrackingToggle] Got initial location burst:", latitude, longitude);
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({
                        type: "LOCATION_UPDATE",
                        scheduleId,
                        payload: { lat: latitude, lng: longitude }
                    }));
                }
            },
            (error) => console.warn("[TrackingToggle] Initial location burst failed:", error),
            { enableHighAccuracy: true, timeout: 5000 }
        );

        // Connect to WebSocket
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/tracking`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            ws.current = socket;

            // Start watching position
            watchId.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: "LOCATION_UPDATE",
                            scheduleId,
                            payload: { lat: latitude, lng: longitude }
                        }));
                    }
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    toast({ title: "Tracking Error", description: "Failed to get location. Please check permissions.", variant: "destructive" });
                    stopTracking();
                },
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );

            setIsTracking(true);
            setIsLoading(false);
            if (!localStorage.getItem(`tracking_active_${scheduleId}`)) {
                toast({ title: "Tracking Active", description: "Passengers can now see your live location." });
            }
            localStorage.setItem(`tracking_active_${scheduleId}`, "true");
        };

        socket.onerror = (err) => {
            console.error("WebSocket error:", err);
            // Don't setIsLoading(false) here, let onclose handle reconnection
        };

        socket.onclose = () => {
            console.log("[TrackingToggle] WebSocket closed");
            if (isTracking && retryCount.current < MAX_RETRIES) {
                const delay = Math.min(1000 * Math.pow(2, retryCount.current), 10000);
                console.log(`[TrackingToggle] Reconnecting in ${delay}ms... (Attempt ${retryCount.current + 1})`);
                reconnectTimeout.current = setTimeout(() => {
                    retryCount.current++;
                    startTracking();
                }, delay);
            } else if (retryCount.current >= MAX_RETRIES) {
                toast({ title: "Connection Lost", description: "Tracking stopped after multiple reconnection attempts.", variant: "destructive" });
                stopTracking();
            }
        };

        // REQUEST WAKE LOCK
        if ('wakeLock' in navigator) {
            try {
                (navigator as any).wakeLock.request('screen').then((lock: any) => {
                    wakeLock.current = lock;
                    console.log("[TrackingToggle] Wake Lock acquired");
                });
            } catch (err) {
                console.warn("[TrackingToggle] Wake Lock request failed:", err);
            }
        }

        // START SILENT AUDIO (Background Persistence)
        if (!audioRef.current) {
            const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
            audio.loop = true;
            audio.play().catch(e => console.warn("[TrackingToggle] Audio play failed (needs interaction):", e));
            audioRef.current = audio;
        }
    };

    const toggleTracking = () => {
        if (isTracking) {
            stopTracking();
        } else {
            startTracking();
        }
    };

    useEffect(() => {
        // Build resilient re-connection attempt on mount if persisted
        const shouldBeLive = localStorage.getItem(`tracking_active_${scheduleId}`) === "true";
        if (shouldBeLive) {
            startTracking();
        }

        // AGGRESSIVE 1-SECOND SANITY CHECK: Ensure tracking is ALWAYS running in background
        const sanityInterval = setInterval(() => {
            const isPersisted = localStorage.getItem(`tracking_active_${scheduleId}`) === "true";
            if (isPersisted) {
                const hasSocket = ws.current && ws.current.readyState === WebSocket.OPEN;
                const hasWatch = watchId.current !== null;

                if (!hasSocket || !hasWatch) {
                    console.log("[TrackingToggle] Background self-healing triggered. Restarting tracking...");
                    startTracking();
                }
            }
        }, 1000); // Check every second as requested

        // RE-ACQUIRE WAKE LOCK ON VISIBILITY CHANGE
        const handleVisibilityChange = async () => {
            if (wakeLock.current !== null && document.visibilityState === 'visible') {
                try {
                    wakeLock.current = await (navigator as any).wakeLock.request('screen');
                    console.log("[TrackingToggle] Wake Lock re-acquired");
                } catch (err) {
                    console.warn("[TrackingToggle] Wake Lock re-acquisition failed:", err);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
            if (ws.current) ws.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            clearInterval(sanityInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [scheduleId]);

    return (
        <Button
            onClick={toggleTracking}
            disabled={isLoading}
            variant={isTracking ? "destructive" : "outline"}
            size="sm"
            className={`rounded-full gap-2 transition-all ${isTracking ? 'animate-pulse' : ''}`}
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isTracking ? (
                <>
                    <NavigationOff className="h-4 w-4" /> Stop Live
                </>
            ) : (
                <>
                    <Navigation className="h-4 w-4" /> Go Live
                </>
            )}
        </Button>
    );
}
