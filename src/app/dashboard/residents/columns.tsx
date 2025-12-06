"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Resident, Household } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, CheckCircle, XCircle, FilePen, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditResident, DeleteResident } from "./resident-actions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ResidentWithId = Resident & { id?: string };

type ResidentsTableActionsProps = {
  resident: ResidentWithId;
  onEdit: (resident: ResidentWithId) => void;
  onDelete: (id: string) => void;
  households: Household[];
}

function ResidentsTableActions({ resident, onEdit, onDelete, households }: ResidentsTableActionsProps) {
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
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(resident.residentId)}
        >
          Copy resident ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <EditResident record={resident} onEdit={onEdit} households={households}>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <FilePen className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
        </EditResident>
        <DeleteResident recordId={resident.id || resident.residentId} onDelete={onDelete}>
           <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DeleteResident>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const getAge = (dateString: string) => {
    if (!dateString) return '';
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

const BooleanCell = ({ value, onClick, colorClass = "text-green-600" }: { value: boolean | undefined, onClick: () => void, colorClass?: string }) => {
    return (
        <div 
            className="flex justify-center items-center cursor-pointer hover:bg-muted/50 p-1 rounded-md transition-colors" 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            title="Click to toggle"
        >
            {value ? (
                <CheckCircle className={`h-4 w-4 ${colorClass}`} />
            ) : (
                <XCircle className="h-4 w-4 text-muted-foreground/30" />
            )}
        </div>
    )
}

export const getColumns = (onEdit: (resident: ResidentWithId) => void, onDelete: (id: string) => void, households: Household[]): ColumnDef<Resident>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
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
      accessorKey: "residentId",
      header: "Resident ID",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.residentId}</span>,
  },
  {
    accessorKey: "lastName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
        const resident = row.original;
        const fullName = `${resident.firstName} ${resident.lastName} ${resident.suffix || ''}`;
        return (
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`} alt={fullName} />
                    <AvatarFallback>{resident.firstName[0]}{resident.lastName[0]}</AvatarFallback>
                </Avatar>
                <div className="font-medium">{fullName}</div>
            </div>
        );
    }
  },
   {
    accessorKey: "dateOfBirth",
    header: "Birth Date / Age",
    cell: ({ row }) => {
        const dob = row.original.dateOfBirth;
        if (!dob) return 'N/A';
        return (
            <div className="flex flex-col">
                <span className="text-sm">{dob}</span>
                <span className="text-xs text-muted-foreground">{getAge(dob)} yrs</span>
            </div>
        );
    }
  },
  {
    accessorKey: "gender",
    header: "Gender",
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => <div className="truncate max-w-[200px]" title={row.original.address}>{row.original.address}</div>
  },
  {
    accessorKey: "isVoter",
    header: "Voter",
    cell: ({ row }) => (
        <BooleanCell 
            value={row.original.isVoter} 
            onClick={() => onEdit({...row.original, isVoter: !row.original.isVoter})} 
        />
    ),
  },
  {
    accessorKey: "isPwd",
    header: "PWD",
    cell: ({ row }) => (
        <BooleanCell 
            value={row.original.isPwd} 
            onClick={() => onEdit({...row.original, isPwd: !row.original.isPwd})} 
            colorClass="text-blue-600"
        />
    ),
  },
  {
    accessorKey: "is4ps",
    header: "4Ps",
    cell: ({ row }) => (
        <BooleanCell 
            value={row.original.is4ps} 
            onClick={() => onEdit({...row.original, is4ps: !row.original.is4ps})} 
            colorClass="text-amber-600"
        />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return <Badge variant={status === 'Active' ? 'secondary' : 'outline'}>{status}</Badge>
    }
  },
  {
    accessorKey: "vulnerability_tags", // Ensure this exists in your type or custom filter accessor
    header: "Tags",
    cell: ({ row }) => {
       const tags = row.original.vulnerability_tags;
       if (!tags || tags.length === 0) return null;
       return (
           <div className="flex gap-1 flex-wrap">
               {tags.map(t => <Badge key={t} variant="outline" className="text-[10px] h-5 px-1">{t}</Badge>)}
           </div>
       )
    },
    filterFn: 'arrayFilter' as any, // Tell react-table to use custom array filter
  },
  {
    // Hidden columns for filtering but available
    accessorKey: "civilStatus",
    header: "Civil Status",
    enableHiding: true, 
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const resident = row.original as ResidentWithId;
      return <ResidentsTableActions resident={resident} onEdit={onEdit} onDelete={onDelete} households={households} />
    },
  },
];
