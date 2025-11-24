
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Household, Resident, Purok } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditHousehold, DeleteHousehold } from "./household-actions";

// Mock Purok data. In a real app, this would be fetched from Firestore.
const puroks: Purok[] = [
    { purokId: 'purok-1', name: 'Purok 1' },
    { purokId: 'purok-2', name: 'Purok 2' },
    { purokId: 'purok-3', name: 'Purok 3' },
    { purokId: 'purok-4', name: 'Purok 4' },
];

type HouseholdWithId = Household & { id?: string };

type HouseholdsTableActionsProps = {
  household: HouseholdWithId;
  onEdit: (household: HouseholdWithId) => void;
  onDelete: (id: string) => void;
  residents: Resident[];
  onMemberChange: (residentId: string, householdId: string | null) => void;
}

function HouseholdsTableActions({ household, onEdit, onDelete, residents, onMemberChange }: HouseholdsTableActionsProps) {
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
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <EditHousehold record={household} onEdit={onEdit} residents={residents} onMemberChange={onMemberChange} />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <DeleteHousehold recordId={household.id || household.householdId} onDelete={onDelete} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const getColumns = (onEdit: (household: HouseholdWithId) => void, onDelete: (id: string) => void, residents: Resident[], onMemberChange: (residentId: string, householdId: string | null) => void): ColumnDef<Household>[] => [
  {
    accessorKey: "householdNumber",
    header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Household No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="pl-4 font-mono text-xs">{row.original.householdNumber}</div>
  },
  {
    accessorKey: "name",
     header: "Household Name",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>
  },
  {
    accessorKey: "address",
    header: "Address",
  },
  {
    accessorKey: "household_head_id",
    header: "Head of Household",
    cell: ({ row }) => {
        const headId = row.original.household_head_id;
        const head = residents.find(r => r.residentId === headId);
        return head ? `${head.firstName} ${head.lastName}` : 'N/A'
    }
  },
   {
    accessorKey: "purokId",
    header: "Purok",
     cell: ({ row }) => {
        const purokId = row.original.purokId;
        const purok = puroks.find(p => p.purokId === purokId);
        return purok ? purok.name : 'N/A';
    },
    enableHiding: true,
  },
  {
    accessorKey: "housing_material",
    header: "Housing Material",
    enableHiding: true,
  },
  {
    accessorKey: "tenure_status",
    header: "Tenure Status",
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const household = row.original as HouseholdWithId;
      return <HouseholdsTableActions household={household} onEdit={onEdit} onDelete={onDelete} residents={residents} onMemberChange={onMemberChange} />
    },
  },
];
