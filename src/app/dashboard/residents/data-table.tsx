
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
import { Filter, Search, Columns, SlidersHorizontal, Check } from "lucide-react";
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

export function DataTable<TData extends Resident, TValue>({
  columns,
  data,
  isLoading,
  onAdd,
  households
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const filterValue = (table.getColumn("lastName")?.getFilterValue() as string) ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center flex-1 gap-2">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Search residents..."
                value={filterValue}
                onChange={(event) =>
                    table.getColumn("lastName")?.setFilterValue(event.target.value)
                }
                className="pl-9"
                />
            </div>
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="border-dashed">
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px]" align="start">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filter Residents</h4>
                            <p className="text-sm text-muted-foreground">
                                Refine the list by specific criteria.
                            </p>
                        </div>
                        <div className="grid gap-4">
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

                            <div className="space-y-2">
                                <Label htmlFor="residencyStatus">Residency Status</Label>
                                <Select
                                    value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
                                    onValueChange={(value) => 
                                        table.getColumn("status")?.setFilterValue(value === "all" ? "" : value)
                                    }
                                >
                                    <SelectTrigger id="residencyStatus" className="h-8 w-full">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Moved Out">Moved Out</SelectItem>
                                        <SelectItem value="Deceased">Deceased</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sectors & Tags</Label>
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
                                     <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="isSenior" 
                                            disabled // Placeholder for computed senior logic
                                        />
                                        <Label htmlFor="isSenior" className="font-normal text-muted-foreground">Senior Citizen</Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>

        <div className="flex items-center gap-2">
            <AddResident onAdd={onAdd} households={households} />
            
            {/* Column Management: Moved to far right as requested */}
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
