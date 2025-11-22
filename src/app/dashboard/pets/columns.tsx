
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Pet, Resident, Household } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Dog, Cat, Rabbit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditPet, DeletePet } from "./pet-actions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PetsTableActionsProps = {
  pet: Pet;
  onEdit: (pet: Pet) => void;
  onDelete: (id: string) => void;
  residents: Resident[];
  households: Household[];
}

function PetsTableActions({ pet, onEdit, onDelete, residents, households }: PetsTableActionsProps) {
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
          <EditPet record={pet} onEdit={onEdit} residents={residents} households={households} />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <DeletePet recordId={pet.petId} onDelete={onDelete} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export const getColumns = (
    onEdit: (pet: Pet) => void, 
    onDelete: (id: string) => void, 
    residents: Resident[], 
    households: Household[]
): ColumnDef<Pet>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Pet Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const pet = row.original;
        const Icon = pet.species === 'Dog' ? Dog : pet.species === 'Cat' ? Cat : Rabbit;
        return (
            <div className="flex items-center gap-3 pl-4">
                <Avatar>
                    <AvatarImage src={pet.photoUrl} alt={pet.name} />
                    <AvatarFallback><Icon /></AvatarFallback>
                </Avatar>
                 <div className="font-medium">{pet.name}</div>
            </div>
           
        )
      }
  },
  {
    accessorKey: "ownerResidentId",
    header: "Owner",
    cell: ({ row }) => {
        const ownerId = row.original.ownerResidentId;
        const owner = residents.find(r => r.residentId === ownerId);
        return owner ? `${owner.firstName} ${owner.lastName}` : 'N/A';
    }
  },
  {
    accessorKey: "species",
    header: "Species",
  },
  {
    accessorKey: "breed",
    header: "Breed",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant={row.original.status === 'Active' ? 'default' : 'outline'}>{row.original.status}</Badge>
  },
  {
    accessorKey: "isNeutered",
    header: "Spayed/Neutered",
    cell: ({ row }) => row.original.isNeutered ? 'Yes' : 'No'
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const pet = row.original;
      return <PetsTableActions pet={pet} onEdit={onEdit} onDelete={onDelete} residents={residents} households={households} />
    },
  },
];
