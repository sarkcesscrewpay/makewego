import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, MapPinOff } from "lucide-react";

interface ShareLocationToggleProps {
    scheduleId: string;
    userId: string;
    userName: string;
}

export default function ShareLocationToggle({ scheduleId, userId, userName }: ShareLocationToggleProps) {
    const [isSharing, setIsSharing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const watchId = useRef<number | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        // Restore state persistence
        const shouldBeSharing = localStorage.getItem(`share_location_${scheduleId}`) === "true";
        if (shouldBeSharing) {
            startSharing();
        }

        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const startSharing = () => {
        if (!navigator.geolocation) {
            toast({ title: "Error", description: "Geolocation is not supported by your browser", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/tracking`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            ws.current = socket;
            watchId.current = navigator.geolocation.watchPosition(
                (position) => {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify({
                            type: "PASSENGER_LOCATION_UPDATE",
                            scheduleId,
                            payload: {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                                userId,
                                userName
                            }
                        }));
                    }
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    stopSharing();
                    toast({ title: "Sharing Failed", description: "Could not access your location.", variant: "destructive" });
                },
                { enableHighAccuracy: true, maximumAge: 10000 }
            );
            setIsSharing(true);
            setIsLoading(false);
            if (!localStorage.getItem(`share_location_${scheduleId}`)) {
                toast({ title: "Location Shared", description: "The driver can now see your live position." });
            }
            localStorage.setItem(`share_location_${scheduleId}`, "true");
        };

        socket.onerror = () => {
            stopSharing();
            setIsLoading(false);
            toast({ title: "Connection Error", description: "Could not connect to tracking server.", variant: "destructive" });
        };
    };

    const stopSharing = () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        setIsSharing(false);
        localStorage.removeItem(`share_location_${scheduleId}`);
        toast({ title: "Sharing Stopped", description: "Your location is no longer visible to the driver." });
    };

    const handleToggle = (checked: boolean) => {
        if (checked) {
            startSharing();
        } else {
            stopSharing();
        }
    };

    return (
        <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            {isSharing ? (
                <MapPin className="h-4 w-4 text-green-500 animate-pulse" />
            ) : (
                <MapPinOff className="h-4 w-4 text-slate-400" />
            )}
            <div className="flex flex-col">
                <Label htmlFor="share-location" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Share Location
                </Label>
                <span className="text-[9px] text-slate-400 leading-none">with driver</span>
            </div>
            <Switch
                id="share-location"
                checked={isSharing}
                onCheckedChange={handleToggle}
                disabled={isLoading}
            />
        </div>
    );
}
