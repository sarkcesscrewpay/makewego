import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { log } from "./index";

interface TrackingMessage {
    type: "LOCATION_UPDATE" | "TRACKING_SUBSCRIBE" | "PASSENGER_LOCATION_UPDATE" | "RIDE_REQUEST_SUBSCRIBE";
    scheduleId: string;
    payload?: {
        lat: number;
        lng: number;
        userId?: string;
        userName?: string;
    };
}

// Store for ride request subscriptions (driverId -> WebSocket)
const rideRequestSubscriptions = new Map<string, WebSocket>();

// Broadcast ride request update to specific drivers
export function broadcastRideRequestUpdate(driverIds: string[], message: any) {
    driverIds.forEach(driverId => {
        const ws = rideRequestSubscriptions.get(driverId);
        if (ws && ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify(message));
        }
    });
}

// Broadcast to all subscribed drivers
export function broadcastToAllDrivers(message: any) {
    rideRequestSubscriptions.forEach((ws, driverId) => {
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify(message));
        }
    });
}

export function setupWebSocket(server: Server) {
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
        const { pathname } = new URL(request.url!, `http://${request.headers.host}`);
        if (pathname === "/ws/tracking") {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, request);
            });
        }
        // Non-matching paths are left alone so Vite HMR can handle them
    });

    // scheduleId -> Set of WebSockets
    const subscriptions = new Map<string, Set<WebSocket>>();

    // scheduleId -> Last known location payload
    const lastBusLocations = new Map<string, any>();

    // scheduleId -> Map of userId -> passenger location (cache passenger locations)
    const passengerLocations = new Map<string, Map<string, any>>();

    wss.on("connection", (ws) => {
        log("New WebSocket connection for tracking", "websocket");

        ws.on("message", (data) => {
            try {
                const message: TrackingMessage = JSON.parse(data.toString());

                if (message.type === "RIDE_REQUEST_SUBSCRIBE") {
                    // Driver subscribing to ride request updates
                    const driverId = message.payload?.userId;
                    if (driverId) {
                        rideRequestSubscriptions.set(driverId, ws);
                        log(`Driver ${driverId} subscribed to ride request updates`, "websocket");
                    }
                }

                if (message.type === "TRACKING_SUBSCRIBE") {
                    if (!subscriptions.has(message.scheduleId)) {
                        subscriptions.set(message.scheduleId, new Set());
                    }
                    subscriptions.get(message.scheduleId)?.add(ws);
                    log(`Client subscribed to schedule: ${message.scheduleId}`, "websocket");

                    // IMMEDIATE UPDATE: If we have a cached bus location, send it to the new subscriber instantly
                    const cachedLocation = lastBusLocations.get(message.scheduleId);
                    if (cachedLocation) {
                        ws.send(JSON.stringify({
                            type: "BUS_LOCATION",
                            scheduleId: message.scheduleId,
                            location: cachedLocation
                        }));
                        log(`Sent cached bus location for schedule: ${message.scheduleId}`, "websocket");
                    }

                    // IMMEDIATE UPDATE: Send all cached passenger locations to the new subscriber
                    const cachedPassengers = passengerLocations.get(message.scheduleId);
                    if (cachedPassengers && cachedPassengers.size > 0) {
                        cachedPassengers.forEach((passengerData, passengerId) => {
                            ws.send(JSON.stringify({
                                type: "PASSENGER_LOCATION",
                                scheduleId: message.scheduleId,
                                userId: passengerId,
                                userName: passengerData.userName,
                                location: passengerData.location
                            }));
                        });
                        log(`Sent ${cachedPassengers.size} cached passenger locations for schedule: ${message.scheduleId}`, "websocket");
                    }
                }

                if (message.type === "LOCATION_UPDATE") {
                    // Cache the latest location
                    lastBusLocations.set(message.scheduleId, message.payload);

                    // Broadcast to all subscribers for this schedule
                    const subscribers = subscriptions.get(message.scheduleId);
                    if (subscribers) {
                        const payload = JSON.stringify({
                            type: "BUS_LOCATION",
                            scheduleId: message.scheduleId,
                            location: message.payload
                        });

                        subscribers.forEach((client) => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(payload);
                            }
                        });
                    }
                }

                if (message.type === "PASSENGER_LOCATION_UPDATE") {
                    const userId = message.payload?.userId;
                    const userName = message.payload?.userName || "Passenger";
                    const location = { lat: message.payload?.lat, lng: message.payload?.lng };

                    log(`Passenger location update: ${userName} (${userId}) for schedule ${message.scheduleId}`, "websocket");

                    // Cache passenger location so new subscribers can see existing passengers
                    if (userId) {
                        if (!passengerLocations.has(message.scheduleId)) {
                            passengerLocations.set(message.scheduleId, new Map());
                        }
                        passengerLocations.get(message.scheduleId)?.set(userId, {
                            userName,
                            location,
                            lastUpdate: Date.now()
                        });
                    }

                    // Broadcast to all subscribers (driver)
                    const subscribers = subscriptions.get(message.scheduleId);
                    if (subscribers && subscribers.size > 0) {
                        const payload = JSON.stringify({
                            type: "PASSENGER_LOCATION",
                            scheduleId: message.scheduleId,
                            userId,
                            userName,
                            location
                        });

                        let sentCount = 0;
                        subscribers.forEach((client) => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(payload);
                                sentCount++;
                            }
                        });
                        log(`Broadcast passenger location to ${sentCount} subscriber(s)`, "websocket");
                    } else {
                        log(`No active subscribers for schedule ${message.scheduleId} - location cached for later`, "websocket");
                    }
                }
            } catch (err) {
                console.error("WebSocket message error:", err);
            }
        });

        ws.on("close", () => {
            // Cleanup schedule subscriptions
            subscriptions.forEach((subscribers, scheduleId) => {
                if (subscribers.has(ws)) {
                    subscribers.delete(ws);
                    if (subscribers.size === 0) {
                        subscriptions.delete(scheduleId);
                    }
                }
            });

            // Cleanup ride request subscriptions
            rideRequestSubscriptions.forEach((socket, driverId) => {
                if (socket === ws) {
                    rideRequestSubscriptions.delete(driverId);
                    log(`Driver ${driverId} unsubscribed from ride requests`, "websocket");
                }
            });

            log("WebSocket connection closed", "websocket");
        });
    });

    return wss;
}
