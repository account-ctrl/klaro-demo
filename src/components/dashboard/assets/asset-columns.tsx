
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FixedAsset } from "@/lib/types"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

export const columns = ({ onEdit, onDelete, onGenerateQR, onBook, onOpenMaintenance }: any): ColumnDef<FixedAsset>[] => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "name",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
    },
    {
        accessorKey: "type",
        header: "Type",
    },
    {
        accessorKey: "status",
        header: "Status",
    },
    {
        accessorKey: "custodianName",
        header: "Custodian",
    },
     {
        accessorKey: "serialNumber",
        header: "Serial No.",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const asset = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(asset)}>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onGenerateQR(asset)}>Generate QR</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onBook()}>Book Asset</DropdownMenuItem>
                        {asset.type === 'Vehicle' && <DropdownMenuItem onClick={() => onOpenMaintenance(asset)}>Log Maintenance</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => onDelete(asset.assetId)}>Delete Asset</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
