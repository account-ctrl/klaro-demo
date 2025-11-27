
'use client';

import * as React from "react";
import { Check, ChevronsUpDown, Search, User as UserIcon, Home, Loader2 } from "lucide-react";

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

      const query = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      // Search Residents
      if (residents) {
          residents.forEach(r => {
              const fullName = `${r.firstName} ${r.lastName}`.toLowerCase();
              if (fullName.includes(query)) {
                  // Find household for resident to get location if resident location is missing
                  // Assuming resident has householdId, and we can look it up in households array
                  // For now, let's assume resident might have lat/lng or we look up household.
                  
                  // Optimization: Create a map for households if needed, but for now find is okay for small datasets.
                  // Realistically we need the location.
                  // Checking if we can find the household location for this resident.
                  const hh = households?.find(h => h.householdId === r.householdId);

                  if (hh?.latitude && hh?.longitude) {
                      results.push({
                          id: r.residentId,
                          label: `${r.firstName} ${r.lastName}`,
                          subLabel: 'Resident',
                          type: 'resident',
                          lat: hh.latitude,
                          lng: hh.longitude
                      });
                  }
              }
          });
      }

      // Search Households
      if (households) {
          households.forEach(h => {
              const name = (h.name || h.householdNumber).toLowerCase();
              if (name.includes(query)) {
                  if (h.latitude && h.longitude) {
                       results.push({
                          id: h.householdId,
                          label: h.name || `Household #${h.householdNumber}`,
                          subLabel: h.address || 'Household',
                          type: 'household',
                          lat: h.latitude,
                          lng: h.longitude
                      });
                  }
              }
          });
      }

      return results.slice(0, 10); // Limit results
  }, [searchQuery, residents, households]);

  const handleSelect = (item: SearchResult) => {
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
                 <Search className="h-4 w-4" /> Search resident or household...
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
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {!isLoading && filteredData.length > 0 && (
                <CommandGroup heading="Suggestions">
                {filteredData.map((item) => (
                    <CommandItem
                        key={item.id}
                        value={item.id} // We use ID as value for uniqueness, but we handle selection manually
                        onSelect={() => handleSelect(item)}
                        className="aria-selected:bg-zinc-800 aria-selected:text-white"
                    >
                        <div className="flex items-center gap-2 w-full">
                            {item.type === 'resident' ? <UserIcon className="h-4 w-4 text-blue-400" /> : <Home className="h-4 w-4 text-emerald-400" />}
                            <div className="flex flex-col overflow-hidden">
                                <span className="truncate font-medium">{item.label}</span>
                                <span className="text-xs text-zinc-500 truncate">{item.subLabel}</span>
                            </div>
                        </div>
                        {value === item.label && (
                            <Check className="ml-auto h-4 w-4 opacity-100 text-blue-500" />
                        )}
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
