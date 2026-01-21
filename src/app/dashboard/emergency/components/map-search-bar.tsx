'use client';

import { useState, useMemo } from 'react';
import { Search, User, Home, Box, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MapSearchBarProps {
    residents: any[];
    assets: any[];
    households: any[]; 
    onSelectLocation: (lat: number, lng: number, label?: string, householdId?: string) => void;
}

export function MapSearchBar({ residents, assets, households, onSelectLocation }: MapSearchBarProps) {
    const [searchMode, setSearchMode] = useState<'general' | 'residents'>('general');
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");

    // Create a lookup for household coordinates
    const householdMap = useMemo(() => {
        const map = new Map<string, {lat: number, lng: number}>();
        households.forEach(h => {
            if (h.latitude && h.longitude) {
                map.set(h.householdId, { lat: h.latitude, lng: h.longitude });
            }
        });
        return map;
    }, [households]);

    const filteredItems = useMemo(() => {
        if (!value || value.length < 2) return [];
        const lower = value.toLowerCase();

        if (searchMode === 'residents') {
            return residents
                .filter(r => `${r.firstName} ${r.lastName}`.toLowerCase().includes(lower))
                .slice(0, 10)
                .map(r => {
                    const coords = r.householdId ? householdMap.get(r.householdId) : null;
                    const lat = r.latitude || coords?.lat;
                    const lng = r.longitude || coords?.lng;
                    
                    return {
                        id: r.residentId,
                        label: `${r.firstName} ${r.lastName}`,
                        sub: typeof r.address === 'string' ? r.address : (r.address?.mapAddress?.street || 'No Address'),
                        type: 'resident',
                        lat,
                        lng,
                        householdId: r.householdId 
                    };
                });
        }

        // GENERAL MODE: Includes Assets, Households, AND Residents
        const assetResults = assets
            .filter(a => (a.name || '').toLowerCase().includes(lower))
            .slice(0, 5)
            .map(a => ({
                id: a.assetId,
                label: a.name,
                sub: a.type,
                type: 'asset',
                lat: a.latitude,
                lng: a.longitude,
                householdId: undefined
            }));

        const houseResults = households
            .filter(h => (h.name || h.householdId || '').toLowerCase().includes(lower) || (h.address || '').toLowerCase().includes(lower))
            .slice(0, 5)
            .map(h => ({
                id: h.householdId,
                label: h.name || 'Household',
                sub: h.address,
                type: 'household',
                lat: h.latitude,
                lng: h.longitude,
                householdId: h.householdId
            }));
            
        const residentResults = residents
            .filter(r => `${r.firstName} ${r.lastName}`.toLowerCase().includes(lower))
            .slice(0, 5)
            .map(r => {
                const coords = r.householdId ? householdMap.get(r.householdId) : null;
                return {
                    id: r.residentId,
                    label: `${r.firstName} ${r.lastName}`,
                    sub: "Resident",
                    type: 'resident',
                    lat: r.latitude || coords?.lat,
                    lng: r.longitude || coords?.lng,
                    householdId: r.householdId
                };
            });

        return [...assetResults, ...houseResults, ...residentResults];

    }, [value, searchMode, residents, assets, households, householdMap]);

    return (
        <div className="absolute top-4 left-4 z-[400] flex gap-2 w-[400px] font-sans">
            <div className="w-[130px] shrink-0">
                <Select value={searchMode} onValueChange={(v: any) => setSearchMode(v)}>
                    <SelectTrigger className="h-10 bg-zinc-950/90 border-zinc-800 text-zinc-200 backdrop-blur shadow-xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="residents">Residents</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex-1">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-start text-left font-normal h-10 bg-zinc-950/90 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 backdrop-blur shadow-xl px-3"
                        >
                            <Search className="mr-2 h-4 w-4 opacity-50" />
                            <span className="truncate">{value ? value : `Search...`}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0 bg-zinc-950 border-zinc-800 text-zinc-200 shadow-2xl" align="start">
                        <Command className="bg-transparent" shouldFilter={false}>
                            <CommandInput 
                                placeholder={`Search ${searchMode === 'residents' ? 'Residents' : 'Everything'}...`} 
                                value={value}
                                onValueChange={setValue}
                                className="border-none focus:ring-0 text-zinc-200 h-9"
                            />
                            <CommandList className="max-h-[300px]">
                                {filteredItems.length === 0 && value.length >= 2 && (
                                    <div className="py-6 text-center text-sm text-zinc-500">No results found.</div>
                                )}
                                {value.length < 2 && value.length > 0 && (
                                    <div className="py-2 text-center text-[10px] text-zinc-500 uppercase tracking-widest">Type at least 2 characters...</div>
                                )}
                                <CommandGroup>
                                    {filteredItems.map((item) => (
                                        <CommandItem
                                            key={item.id}
                                            value={item.id} 
                                            onSelect={() => {
                                                if (item.lat && item.lng) {
                                                    onSelectLocation(item.lat, item.lng, item.label, item.householdId);
                                                    setOpen(false);
                                                    setValue("");
                                                } else {
                                                    console.warn("Item has no location");
                                                }
                                            }}
                                            className="cursor-pointer aria-selected:bg-zinc-900 aria-selected:text-white flex items-center gap-2 py-2 px-3 transition-colors"
                                        >
                                            <div className="shrink-0">
                                                {item.type === 'resident' && <User className="h-4 w-4 text-emerald-500" />}
                                                {item.type === 'asset' && <Box className="h-4 w-4 text-blue-500" />}
                                                {item.type === 'household' && <Home className="h-4 w-4 text-orange-500" />}
                                            </div>
                                            
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="truncate text-sm font-medium">{item.label}</span>
                                                <span className="truncate text-[10px] text-zinc-500">{item.sub}</span>
                                            </div>
                                            {!item.lat && <span className="ml-auto text-[9px] text-red-500 uppercase tracking-tighter font-bold">No Map</span>}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
