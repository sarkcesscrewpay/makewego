import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useBusStops } from "@/hooks/use-bus-stops"
import { useLocations } from "@/hooks/use-locations"
import { Input } from "@/components/ui/input"
import { MapPin, Bus } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface LocationAutocompleteProps {
    value: string
    onChange: (value: string) => void
    onLocationSelect?: (location: { name: string, lat?: number, lng?: number }) => void
    placeholder?: string
    className?: string

}

export function LocationAutocomplete({
    value,
    onChange,
    onLocationSelect,
    placeholder = "Select location...",
    className,
}: LocationAutocompleteProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState(value)
    const [justSelected, setJustSelected] = React.useState(false)

    // Debounce input for searching to avoid rapid-fire API calls while typing
    const debouncedSearchTerm = useDebounce(inputValue, 400)
    const shouldSearch = debouncedSearchTerm.length >= 2;

    // Search both local bus stops and Mapbox geocoding
    const { data: busStops = [], isLoading: loadingStops } = useBusStops(debouncedSearchTerm, shouldSearch)
    const { data: locations = [], isLoading: loadingLocations } = useLocations(shouldSearch ? debouncedSearchTerm : "")

    const isLoading = loadingStops || loadingLocations;

    // Update local input when prop changes (e.g. initial load or external update)
    React.useEffect(() => {
        setInputValue(value)
    }, [value])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        onChange(val); // Update parent immediately allows "free typing"
        setJustSelected(false); // User is typing, allow dropdown to open
        setOpen(true);
    };

    const handleFocus = () => {
        // Only open dropdown if user didn't just select a location
        if (!justSelected) {
            setOpen(true);
        }
    };

    return (
        <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen} modal={false}>
                <PopoverTrigger asChild>
                    <Input
                        type="text"
                        autoComplete="off"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={() => setJustSelected(false)} // Reset after blur so next focus can open dropdown
                        placeholder={placeholder}
                        className={cn(
                            "w-full transition-all font-medium rounded-xl h-14",
                            // Default neutral styling (can be overridden by className)
                            !className && "bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500",
                            className
                        )}
                    />
                </PopoverTrigger>
                <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width] border-none rounded-2xl shadow-2xl overflow-hidden z-[9999]"
                    align="start"
                    sideOffset={8}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <Command shouldFilter={false} className="bg-white">
                        <CommandList className="max-h-[350px] overflow-y-auto custom-scrollbar">
                            {isLoading && (
                                <div className="py-6 flex items-center justify-center text-slate-400 gap-3">
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Searching...</span>
                                </div>
                            )}

                            {!isLoading && (busStops.length > 0 || locations.length > 0) === false && debouncedSearchTerm.length >= 2 && (
                                <div className="py-10 text-center text-slate-500 px-6">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <MapPin className="w-6 h-6 text-slate-200" />
                                    </div>
                                    <p className="text-sm font-black text-slate-800">No matching places found</p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight font-bold">
                                        Try typing a city name or landmark
                                    </p>
                                </div>
                            )}

                            {/* Hub Suggestions */}
                            {busStops.length > 0 && (
                                <CommandGroup heading="Terminals & Stations" className="px-2 pt-2">
                                    {busStops.map((stop) => (
                                        <CommandItem
                                            key={`stop-${stop._id}`}
                                            value={stop.name}
                                            onSelect={() => {
                                                const finalValue = stop.name;
                                                setInputValue(finalValue)
                                                onChange(finalValue)
                                                if (onLocationSelect) {
                                                    onLocationSelect({
                                                        name: finalValue,
                                                        lat: stop.location?.lat,
                                                        lng: stop.location?.lng
                                                    })
                                                }
                                                setJustSelected(true) // Prevent dropdown from reopening
                                                setOpen(false)
                                            }}
                                            className="cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 hover:bg-slate-50 rounded-xl p-3 flex items-center transition-all border-b border-slate-50 last:border-0 group"
                                        >
                                            <div className="flex flex-col flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-slate-800 group-hover:text-blue-700 transition-colors">{stop.name}</span>
                                                    <Bus className="h-4 w-4 text-blue-500" />
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase tracking-wider">
                                                        {stop.city || "Ghana"}
                                                    </div>
                                                </div>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {/* Mapbox Location Suggestions */}
                            {locations.length > 0 && (
                                <CommandGroup heading="Nearby Places" className="p-2">
                                    {locations.map((loc, idx) => (
                                        <CommandItem
                                            key={`loc-${idx}`}
                                            value={loc.address}
                                            onSelect={() => {
                                                const cleanName = loc.title;
                                                setInputValue(cleanName)
                                                onChange(cleanName)
                                                if (onLocationSelect) {
                                                    onLocationSelect({
                                                        name: cleanName,
                                                        lat: loc.coordinates.lat,
                                                        lng: loc.coordinates.lng
                                                    })
                                                }
                                                setJustSelected(true) // Prevent dropdown from reopening
                                                setOpen(false)
                                            }}
                                            className="cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 hover:bg-slate-50 rounded-xl p-3 flex items-center transition-all group"
                                        >
                                            <div className="flex flex-col flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{loc.title}</span>
                                                    <MapPin className="h-4 w-4 text-slate-300" />
                                                </div>
                                                <span className="text-[10px] text-slate-400 line-clamp-1">{loc.address}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}

