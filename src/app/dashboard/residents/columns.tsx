"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Resident, Household, ResidentAddress } from "@/lib/types";
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

const formatAddress = (addr: string | ResidentAddress | undefined) => {
    if (!addr) return 'N/A';
    if (typeof addr === 'string') return addr;
    const { mapAddress, purok } = addr;
    
    const parts = [];
    if (mapAddress?.unit) parts.push(mapAddress.unit);
    if (mapAddress?.blockLot) parts.push(mapAddress.blockLot);
    if (mapAddress?.street) parts.push(mapAddress.street);
    if (purok) parts.push(purok);
    
    return parts.join(', ');
};

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
    size: 40, // Fixed width
  },
  {
      accessorKey: "residentId",
      header: "ID",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.residentId.substring(0,6)}...</span>,
      size: 80,
  },
  {
    accessorKey: "lastName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Resident Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
        const resident = row.original;
        const fullName = `${resident.firstName} ${resident.lastName} ${resident.suffix || ''}`;
        return (
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`} alt={fullName} />
                    <AvatarFallback className="bg-slate-100 text-slate-500 font-bold">{resident.firstName[0]}{resident.lastName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-800">{fullName}</span>
                    <span className="text-xs text-muted-foreground">{resident.email || 'No email'}</span>
                </div>
            </div>
        );
    }
  },
   {
    accessorKey: "dateOfBirth",
    header: "Age",
    cell: ({ row }) => {
        const dob = row.original.dateOfBirth;
        if (!dob) return <span className="text-muted-foreground">-</span>;
        const age = getAge(dob);
        return (
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">{age} yo</Badge>
            </div>
        );
    },
    size: 100,
  },
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) => {
       const gender = row.original.gender;
       return (
           <span className={`text-xs font-medium px-2 py-1 rounded-full ${gender === 'Male' ? 'bg-blue-50 text-blue-700' : gender === 'Female' ? 'bg-pink-50 text-pink-700' : 'bg-slate-50 text-slate-600'}`}>
               {gender}
           </span>
       )
    },
    size: 100,
  },
  {
    accessorKey: "address",
    header: "Address / Purok",
    cell: ({ row }) => {
        const displayAddr = formatAddress(row.original.address);
        return <div className="truncate max-w-[250px] text-sm text-slate-600" title={displayAddr}>{displayAddr}</div>
    }
  },
  {
    accessorKey: "civilStatus",
    header: "Civil Status",
    // This column is hidden by default but needed for filtering
    enableHiding: true, 
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.civilStatus}</span>
  },
   {
    accessorKey: "vulnerability_tags",
    header: "Tags",
    // This column is hidden by default but needed for filtering
    enableHiding: true, 
    filterFn: 'arrayFilter' as any,
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
    size: 80,
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
     size: 80,
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
     size: 80,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return <Badge className="text-[10px]" variant={status === 'Active' ? 'default' : 'secondary'}>{status}</Badge>
    },
     size: 100,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const resident = row.original as ResidentWithId;
      return <ResidentsTableActions resident={resident} onEdit={onEdit} onDelete={onDelete} households={households} />
    },
    size: 50,
  },
];
