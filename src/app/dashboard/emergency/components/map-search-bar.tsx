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
                        sub: r.address?.mapAddress?.street || (typeof r.address === 'string' ? r.address : 'Unknown Address'),
                        type: 'resident',
                        lat,
                        lng,
                        householdId: r.householdId // Pass household ID
                    };
                });
        }

        const assetResults = assets
            .filter(a => a.name.toLowerCase().includes(lower))
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
            .filter(h => (h.name || h.householdId).toLowerCase().includes(lower))
            .slice(0, 5)
            .map(h => ({
                id: h.householdId,
                label: h.name || 'Household',
                sub: h.address,
                type: 'household',
                lat: h.latitude,
                lng: h.longitude,
                householdId: h.householdId // Self is the household
            }));

        return [...assetResults, ...houseResults];

    }, [value, searchMode, residents, assets, households, householdMap]);

    return (
        <div className="absolute top-4 left-4 z-[400] flex gap-2 w-[400px] font-sans">
            <div className="w-[130px] shrink-0">
                <Select value={searchMode} onValueChange={(v: any) => setSearchMode(v)}>
                    <SelectTrigger className="h-10 bg-zinc-950/90 border-zinc-800 text-zinc-200 backdrop-blur shadow-xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                            <span className="truncate">{value ? value : `Search ${searchMode === 'residents' ? 'Residents' : 'Everything'}...`}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0 bg-zinc-950 border-zinc-800 text-zinc-200 shadow-2xl" align="start">
                        <Command className="bg-transparent">
                            <CommandInput 
                                placeholder={`Type to search...`} 
                                value={value}
                                onValueChange={setValue}
                                className="border-none focus:ring-0 text-zinc-200 h-9"
                            />
                            <CommandList>
                                <CommandEmpty className="py-2 text-center text-xs text-zinc-500">No results found.</CommandEmpty>
                                <CommandGroup>
                                    {filteredItems.map((item) => (
                                        <CommandItem
                                            key={item.id}
                                            value={item.label} 
                                            onSelect={() => {
                                                if (item.lat && item.lng) {
                                                    onSelectLocation(item.lat, item.lng, item.label, item.householdId);
                                                    setOpen(false);
                                                    setValue(item.label);
                                                } else {
                                                    console.warn("Item has no location");
                                                }
                                            }}
                                            className="cursor-pointer aria-selected:bg-zinc-900 aria-selected:text-white flex items-center gap-2 py-2"
                                        >
                                            {item.type === 'resident' && <User className="h-4 w-4 text-emerald-500 shrink-0" />}
                                            {item.type === 'asset' && <Box className="h-4 w-4 text-blue-500 shrink-0" />}
                                            {item.type === 'household' && <Home className="h-4 w-4 text-orange-500 shrink-0" />}
                                            
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="truncate text-sm font-medium">{item.label}</span>
                                                <span className="truncate text-[10px] text-zinc-500">{item.sub}</span>
                                            </div>
                                            {!item.lat && <span className="ml-auto text-[9px] text-red-500 uppercase tracking-tighter">No Map</span>}
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
