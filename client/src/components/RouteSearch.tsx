import { useState, useMemo } from "react";
import { useRouteSearch, useAllRoutes, type SearchedRoute } from "@/hooks/use-route-search";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, ArrowRight, Route, Clock, Ruler, Filter, X, Loader2, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RouteSearchProps {
    onRouteSelect?: (route: SearchedRoute) => void;
    selectedRouteId?: string;
    className?: string;
}

const BUS_TYPES = [
    { value: "all", label: "All Types" },
    { value: "standard", label: "Standard Bus" },
    { value: "minibus", label: "Minibus" },
    { value: "luxury", label: "Luxury Coach" },
    { value: "shuttle", label: "Shuttle" },
];

export default function RouteSearch({ onRouteSelect, selectedRouteId, className = "" }: RouteSearchProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [startLocation, setStartLocation] = useState("");
    const [endLocation, setEndLocation] = useState("");
    const [busType, setBusType] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Use search when filters are active, otherwise show all routes
    const hasFilters = !!(searchQuery || startLocation || endLocation || (busType && busType !== "all"));

    const { data: searchResults, isLoading: searchLoading } = useRouteSearch(
        {
            query: searchQuery,
            startLocation,
            endLocation,
            busType: busType !== "all" ? busType : undefined,
        },
        isSearching && hasFilters
    );

    const { data: allRoutes, isLoading: allLoading } = useAllRoutes();

    const routes = useMemo(() => {
        if (isSearching && hasFilters && searchResults) {
            return searchResults;
        }
        // Client-side filter for immediate feedback
        if (!allRoutes) return [];

        return allRoutes.filter((route) => {
            const matchesQuery = !searchQuery ||
                route.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                route.startLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                route.endLocation?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStart = !startLocation ||
                route.startLocation?.toLowerCase().includes(startLocation.toLowerCase());

            const matchesEnd = !endLocation ||
                route.endLocation?.toLowerCase().includes(endLocation.toLowerCase());

            const matchesType = busType === "all" || route.busType === busType;

            return matchesQuery && matchesStart && matchesEnd && matchesType;
        });
    }, [allRoutes, searchResults, searchQuery, startLocation, endLocation, busType, isSearching, hasFilters]);

    const isLoading = searchLoading || allLoading;

    const handleSearch = () => {
        setIsSearching(true);
    };

    const clearFilters = () => {
        setSearchQuery("");
        setStartLocation("");
        setEndLocation("");
        setBusType("all");
        setIsSearching(false);
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Search Header */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Search routes, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-12 h-12 rounded-xl bg-white border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <Button
                    onClick={() => setShowFilters(!showFilters)}
                    variant={showFilters ? "default" : "outline"}
                    size="icon"
                    className="h-12 w-12 rounded-xl"
                >
                    <Filter className="h-5 w-5" />
                </Button>
                <Button
                    onClick={handleSearch}
                    className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold"
                >
                    <Search className="h-5 w-5 mr-2" />
                    Search
                </Button>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <Card className="p-4 rounded-2xl border-slate-200 bg-slate-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600">From Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                        <Input
                                            placeholder="Start location"
                                            value={startLocation}
                                            onChange={(e) => setStartLocation(e.target.value)}
                                            className="pl-10 h-11 rounded-lg"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600">To Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                                        <Input
                                            placeholder="Destination"
                                            value={endLocation}
                                            onChange={(e) => setEndLocation(e.target.value)}
                                            className="pl-10 h-11 rounded-lg"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600">Bus Type</label>
                                    <Select value={busType} onValueChange={setBusType}>
                                        <SelectTrigger className="h-11 rounded-lg">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BUS_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {hasFilters && (
                                <div className="mt-4 flex justify-end">
                                    <Button
                                        onClick={clearFilters}
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-500 hover:text-slate-700"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Clear Filters
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results Count */}
            <div className="flex items-center justify-between px-1">
                <p className="text-sm font-medium text-slate-500">
                    {isLoading ? "Searching..." : `${routes.length} route${routes.length !== 1 ? "s" : ""} found`}
                </p>
                {hasFilters && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        Filtered
                    </span>
                )}
            </div>

            {/* Route List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {isLoading ? (
                    <div className="py-12 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : routes.length > 0 ? (
                    routes.map((route) => (
                        <motion.div
                            key={route._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card
                                onClick={() => onRouteSelect?.(route)}
                                className={`p-5 rounded-2xl cursor-pointer transition-all border-2 ${selectedRouteId === route._id
                                    ? "border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-100"
                                    : "border-transparent hover:border-slate-200 hover:shadow-md"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        {/* Route Name */}
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Route className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <h3 className="font-bold text-slate-800">{route.name}</h3>
                                        </div>

                                        {/* From -> To */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-medium text-emerald-600 flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {route.startLocation}
                                            </span>
                                            <ArrowRight className="h-4 w-4 text-slate-300" />
                                            <span className="font-medium text-red-600 flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {route.endLocation}
                                            </span>
                                        </div>

                                        {/* Stops */}
                                        {route.stops && route.stops.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {route.stops.slice(0, 4).map((stop, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"
                                                    >
                                                        {typeof stop === 'string' ? stop : stop.name}
                                                    </span>
                                                ))}
                                                {route.stops.length > 4 && (
                                                    <span className="text-xs font-medium text-slate-400">
                                                        +{route.stops.length - 4} more
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Stats */}
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            {route.distance && (
                                                <span className="flex items-center gap-1">
                                                    <Ruler className="h-3 w-3" />
                                                    {route.distance} km
                                                </span>
                                            )}
                                            {route.estimatedDuration && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {route.estimatedDuration} min
                                                </span>
                                            )}
                                            {route.busType && (
                                                <span className="px-2 py-0.5 bg-slate-100 rounded-full capitalize">
                                                    {route.busType}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* View on Map Button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-10 w-10 rounded-xl ${selectedRouteId === route._id
                                            ? "bg-blue-600 text-white hover:bg-blue-700"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRouteSelect?.(route);
                                        }}
                                    >
                                        <Navigation className="h-5 w-5" />
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))
                ) : (
                    <div className="py-12 text-center">
                        <Route className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No routes found</p>
                        <p className="text-slate-400 text-sm mt-1">Try adjusting your search filters</p>
                    </div>
                )}
            </div>
        </div>
    );
}
