import { useState, lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import RouteSearch from "@/components/RouteSearch";
import { type SearchedRoute } from "@/hooks/use-route-search";
import { MapPin, Route, Loader2 } from "lucide-react";

// Lazy load map component for better performance
const RouteMapView = lazy(() => import("@/components/RouteMapView"));

export default function RoutesPage() {
    const [selectedRoute, setSelectedRoute] = useState<SearchedRoute | null>(null);

    return (
        <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Route className="h-6 w-6 text-blue-600" />
                        </div>
                        Browse Routes
                    </h1>
                    <p className="text-slate-500 mt-2 ml-14">
                        Search and explore all available bus routes
                    </p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Route Search List */}
                    <div className="order-2 lg:order-1">
                        <Card className="p-6 rounded-[2rem] border-none shadow-sm">
                            <RouteSearch
                                onRouteSelect={(route) => setSelectedRoute(route)}
                                selectedRouteId={selectedRoute?._id}
                            />
                        </Card>
                    </div>

                    {/* Right: Map View */}
                    <div className="order-1 lg:order-2 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
                        <Card className="h-full min-h-[400px] rounded-[2rem] border-none shadow-sm overflow-hidden">
                            <Suspense
                                fallback={
                                    <div className="h-full flex items-center justify-center bg-slate-100">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    </div>
                                }
                            >
                                <RouteMapView route={selectedRoute} />
                            </Suspense>
                        </Card>

                        {/* Selected Route Info */}
                        {selectedRoute && (
                            <Card className="mt-4 p-5 rounded-2xl border-none shadow-sm bg-gradient-to-r from-blue-50 to-emerald-50">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <MapPin className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800">{selectedRoute.name}</h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {selectedRoute.startLocation} → {selectedRoute.endLocation}
                                        </p>
                                        <div className="flex gap-3 mt-2 text-xs text-slate-500">
                                            {selectedRoute.distance && (
                                                <span className="bg-white px-2 py-1 rounded-full">
                                                    {selectedRoute.distance} km
                                                </span>
                                            )}
                                            {selectedRoute.estimatedDuration && (
                                                <span className="bg-white px-2 py-1 rounded-full">
                                                    ~{selectedRoute.estimatedDuration} min
                                                </span>
                                            )}
                                            {selectedRoute.stops?.length > 0 && (
                                                <span className="bg-white px-2 py-1 rounded-full">
                                                    {selectedRoute.stops.length} stops
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
