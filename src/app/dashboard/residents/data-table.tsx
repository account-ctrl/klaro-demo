"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { AddResident, ResidentFormValues } from "./resident-actions";
import { Resident, Household } from "@/lib/types";
import { Filter, Search, Columns, SlidersHorizontal, Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading: boolean;
  onAdd: (data: ResidentFormValues) => void;
  households: Household[];
}

// Define custom filter functions
const globalFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
    const value = row.getValue(columnId);
    return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
};

const arrayFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
    const value = row.getValue(columnId) as string[] | undefined;
    if (!filterValue || !value) return false;
    // Check if the array includes the filter value
    return value.includes(filterValue);
}

export function DataTable<TData extends Resident, TValue>({
  columns,
  data,
  isLoading,
  onAdd,
  households
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    civilStatus: false, // Default hidden based on columns definition, but explicitly managing state here helps
    vulnerability_tags: false, // Default hidden
  });
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: globalFilterFn,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
     filterFns: {
        arrayFilter: arrayFilterFn,
    },
  });
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center flex-1 gap-2">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Search by name..."
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-9"
                />
            </div>
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="border-dashed">
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Filters
                        {columnFilters.length > 0 && (
                             <span className="ml-2 rounded-full bg-primary text-[10px] text-primary-foreground px-1.5 py-0.5">
                                {columnFilters.length}
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px]" align="start">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filter Residents</h4>
                            <p className="text-sm text-muted-foreground">
                                Refine the list by specific criteria.
                            </p>
                        </div>
                        <div className="grid gap-4">
                            {/* Primary Demographics */}
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="residentId">Resident ID</Label>
                                    <Input 
                                        id="residentId" 
                                        placeholder="RES-..." 
                                        className="h-8"
                                        value={(table.getColumn("residentId")?.getFilterValue() as string) ?? ""}
                                        onChange={(event) =>
                                            table.getColumn("residentId")?.setFilterValue(event.target.value)
                                        }
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="birthYear">Birth Year</Label>
                                    <Input 
                                        id="birthYear" 
                                        type="number" 
                                        placeholder="YYYY" 
                                        className="h-8"
                                        onChange={(event) => {
                                            table.getColumn("dateOfBirth")?.setFilterValue(event.target.value)
                                        }}
                                         value={(table.getColumn("dateOfBirth")?.getFilterValue() as string) ?? ""}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="purok">Purok / Address</Label>
                                    <Select
                                        value={(table.getColumn("address")?.getFilterValue() as string) ?? "all"}
                                        onValueChange={(value) => 
                                            table.getColumn("address")?.setFilterValue(value === "all" ? "" : value)
                                        }
                                    >
                                        <SelectTrigger id="purok" className="h-8">
                                            <SelectValue placeholder="All Puroks" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Puroks</SelectItem>
                                            <SelectItem value="Purok 1">Purok 1</SelectItem>
                                            <SelectItem value="Purok 2">Purok 2</SelectItem>
                                            <SelectItem value="Purok 3">Purok 3</SelectItem>
                                            <SelectItem value="Purok 4">Purok 4</SelectItem>
                                            <SelectItem value="Purok 5">Purok 5</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="civilStatus">Civil Status</Label>
                                    <Select
                                        value={(table.getColumn("civilStatus")?.getFilterValue() as string) ?? "all"}
                                        onValueChange={(value) => 
                                            table.getColumn("civilStatus")?.setFilterValue(value === "all" ? "" : value)
                                        }
                                    >
                                        <SelectTrigger id="civilStatus" className="h-8">
                                            <SelectValue placeholder="Any" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Any Status</SelectItem>
                                            <SelectItem value="Single">Single</SelectItem>
                                            <SelectItem value="Married">Married</SelectItem>
                                            <SelectItem value="Widowed">Widowed</SelectItem>
                                            <SelectItem value="Separated">Separated</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            {/* Sectors & Tags */}
                            <div className="space-y-3">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sectors & Vulnerability</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="isVoter" 
                                            checked={(table.getColumn("isVoter")?.getFilterValue() as boolean) ?? false}
                                            onCheckedChange={(checked) => 
                                                table.getColumn("isVoter")?.setFilterValue(checked === true ? true : undefined)
                                            }
                                        />
                                        <Label htmlFor="isVoter" className="font-normal cursor-pointer">Registered Voter</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="isPwd" 
                                            checked={(table.getColumn("isPwd")?.getFilterValue() as boolean) ?? false}
                                            onCheckedChange={(checked) => 
                                                table.getColumn("isPwd")?.setFilterValue(checked === true ? true : undefined)
                                            }
                                        />
                                        <Label htmlFor="isPwd" className="font-normal cursor-pointer">PWD</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="is4ps" 
                                            checked={(table.getColumn("is4ps")?.getFilterValue() as boolean) ?? false}
                                            onCheckedChange={(checked) => 
                                                table.getColumn("is4ps")?.setFilterValue(checked === true ? true : undefined)
                                            }
                                        />
                                        <Label htmlFor="is4ps" className="font-normal cursor-pointer">4Ps Beneficiary</Label>
                                    </div>
                                    
                                     {/* Filter for Pregnant via vulnerability_tags */}
                                     <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="isPregnant"
                                            checked={(table.getColumn("vulnerability_tags")?.getFilterValue() as string) === 'Pregnant'}
                                            onCheckedChange={(checked) => {
                                                table.getColumn("vulnerability_tags")?.setFilterValue(checked ? 'Pregnant' : undefined)
                                            }}
                                        />
                                        <Label htmlFor="isPregnant" className="font-normal cursor-pointer">Pregnant</Label>
                                    </div>
                                </div>
                            </div>
                            
                            {columnFilters.length > 0 && (
                                <Button 
                                    variant="ghost" 
                                    className="w-full justify-center text-destructive hover:text-destructive" 
                                    onClick={() => table.resetColumnFilters()}
                                >
                                    <X className="mr-2 h-4 w-4" /> Clear All Filters
                                </Button>
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>

        <div className="flex items-center gap-2">
            <AddResident onAdd={onAdd} households={households} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="ml-auto">
                  <Columns className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id === 'purok' ? 'Purok' : column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
                [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={columns.length}>
                            <Skeleton className="h-4 w-full" />
                        </TableCell>
                    </TableRow>
                ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-2">
            <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-input hover:bg-accent hover:text-accent-foreground"
            >
            Previous
            </Button>
            <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
             className="border-input hover:bg-accent hover:text-accent-foreground"
            >
            Next
            </Button>
        </div>
      </div>
    </div>
  );
}
