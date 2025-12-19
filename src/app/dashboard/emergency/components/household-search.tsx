
'use client';

import * as React from "react";
import { Check, ChevronsUpDown, Search, User as UserIcon, Home, Loader2, MapPinOff } from "lucide-react";

import { cn } from "@/lib/utils";
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
import { useResidents, useHouseholds } from "@/hooks/use-barangay-data";
import { Resident, Household } from "@/lib/types";

export type SearchResult = {
    id: string;
    label: string;
    subLabel?: string;
    type: 'resident' | 'household';
    lat?: number;
    lng?: number;
    hasLocation: boolean;
};

interface HouseholdSearchProps {
    onSelectLocation: (location: { lat: number; lng: number; label: string; type: 'resident' | 'household' }) => void;
}

export function HouseholdSearch({ onSelectLocation }: HouseholdSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: residents, isLoading: isLoadingResidents } = useResidents();
  const { data: households, isLoading: isLoadingHouseholds } = useHouseholds();

  const filteredData = React.useMemo(() => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const query = searchQuery.toLowerCase().trim();
      const results: SearchResult[] = [];

      // Search Residents
      if (residents) {
          residents.forEach(r => {
              const fullName = `${r.firstName} ${r.lastName}`.toLowerCase();
              if (fullName.includes(query)) {
                  // Try to find location from linked household
                  const hh = households?.find(h => h.householdId === r.householdId);
                  
                  // Try to find location from resident record itself (fallback)
                  // @ts-ignore - Some legacy records might have direct lat/lng
                  const lat = hh?.latitude || r.latitude || (r.address && typeof r.address === 'object' ? r.address.coordinates?.lat : undefined);
                  // @ts-ignore
                  const lng = hh?.longitude || r.longitude || (r.address && typeof r.address === 'object' ? r.address.coordinates?.lng : undefined);

                  const hasLocation = !!(lat && lng);

                  // Only show if we found a location? Or show with warning?
                  // Better to show it so user knows the resident exists, but maybe can't map them.
                  if (hasLocation) {
                      results.push({
                          id: r.residentId,
                          label: `${r.firstName} ${r.lastName}`,
                          subLabel: hh ? `Household: ${hh.name || hh.householdId}` : 'Individual Record',
                          type: 'resident',
                          lat,
                          lng,
                          hasLocation: true
                      });
                  }
              }
          });
      }

      // Search Households
      if (households) {
          households.forEach(h => {
              const name = (h.name || h.householdNumber || '').toLowerCase();
              if (name.includes(query)) {
                  if (h.latitude && h.longitude) {
                       results.push({
                          id: h.householdId,
                          label: h.name || `Household #${h.householdNumber}`,
                          subLabel: h.address || 'Household',
                          type: 'household',
                          lat: h.latitude,
                          lng: h.longitude,
                          hasLocation: true
                      });
                  }
              }
          });
      }

      return results.slice(0, 15);
  }, [searchQuery, residents, households]);

  const handleSelect = (item: SearchResult) => {
      if (!item.hasLocation) return;
      
      setValue(item.label);
      setOpen(false);
      if (item.lat && item.lng) {
          onSelectLocation({
              lat: item.lat,
              lng: item.lng,
              label: item.label,
              type: item.type
          });
      }
  };

  const isLoading = isLoadingResidents || isLoadingHouseholds;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between bg-zinc-900/90 border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white backdrop-blur-sm shadow-lg"
        >
          {value ? (
             <span className="truncate">{value}</span>
          ) : (
             <span className="text-zinc-400 flex items-center gap-2">
                 <Search className="h-4 w-4" /> Search resident location...
             </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-zinc-900 border-zinc-700 text-zinc-100 mb-2">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Type name to search..." 
            className="border-none focus:ring-0 text-zinc-100 placeholder:text-zinc-500"
            onValueChange={setSearchQuery} 
          />
          <CommandList>
            {isLoading && (
                 <div className="py-6 text-center text-sm text-zinc-500 flex items-center justify-center gap-2">
                     <Loader2 className="h-4 w-4 animate-spin" /> Loading data...
                 </div>
            )}
            {!isLoading && filteredData.length === 0 && searchQuery.length > 1 && (
              <CommandEmpty>No mapped residents found matching "{searchQuery}".</CommandEmpty>
            )}
            {!isLoading && filteredData.length > 0 && (
                <CommandGroup heading="Results">
                {filteredData.map((item) => (
                    <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item)}
                        className="aria-selected:bg-zinc-800 aria-selected:text-white cursor-pointer"
                    >
                        <div className="flex items-center gap-2 w-full">
                            {item.type === 'resident' ? <UserIcon className="h-4 w-4 text-blue-400" /> : <Home className="h-4 w-4 text-emerald-400" />}
                            <div className="flex flex-col overflow-hidden">
                                <span className="truncate font-medium">{item.label}</span>
                                <span className="text-xs text-zinc-500 truncate flex items-center gap-1">
                                    {item.subLabel}
                                </span>
                            </div>
                        </div>
                    </CommandItem>
                ))}
                </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
