
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

type ComboboxProps = {
    options: { value: string, label: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    noResultsMessage?: string;
    className?: string;
}

export function Combobox({ options, value, onChange, placeholder = "Select option...", searchPlaceholder = "Search...", noResultsMessage = "No results found.", className }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate flex-1 text-left">
            {value
                ? options.find((option) => option.value === value)?.label
                : placeholder}
          </span>
          
          {value ? (
             <div 
                role="button"
                tabIndex={0}
                className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100 z-10 cursor-pointer flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                onClick={handleClear}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        handleClear(e as any);
                    }
                }}
             >
                <X className="h-3 w-3" />
             </div>
          ) : (
             <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[300px] p-0 pointer-events-auto" align="start">
        <Command filter={(value, search) => {
             const option = options.find(o => o.value === value);
             if (option?.label.toLowerCase().includes(search.toLowerCase())) return 1;
             return 0;
        }}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{noResultsMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                  keywords={[option.label]} 
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
