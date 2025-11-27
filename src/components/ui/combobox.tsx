
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

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
}

export function Combobox({ options, value, onChange, placeholder = "Select option...", searchPlaceholder = "Search...", noResultsMessage = "No results found." }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  // Memoize filtered options to avoid performance issues on large lists, although Command handles this internally, 
  // sometimes passing `value` to CommandItem that doesn't match the label can be tricky if not handled right.
  // The Shadcn implementation usually relies on the `value` prop of CommandItem being the search key.
  // BUT: CommandItem value usually defaults to the text content if not provided, or it lowercases it.
  // The issue here is likely that `option.value` (the ID) is being passed as the `value` prop to `CommandItem`, 
  // but the USER searches for the `label` (the Name). 
  // cmdk filters based on the `value` prop by default.
  // So if value="res_123" and label="John Doe", searching "John" fails because "res_123" doesn't contain "John".
  
  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto" align="start">
        <Command filter={(value, search) => {
             // Custom filter to allow searching by label even if value is an ID
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
                  value={option.value} // This is the ID
                  onSelect={(currentValue) => {
                    // currentValue here comes from the CommandItem value prop (or text content if not set)
                    // Since we set value={option.value}, currentValue will be the ID.
                    onChange(currentValue)
                    setOpen(false)
                  }}
                  keywords={[option.label]} // Add keywords to help with search if default filter is used (though we use custom filter above)
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
