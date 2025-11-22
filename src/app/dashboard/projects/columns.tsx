
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditProject, DeleteProject } from "./project-actions";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";


const ProjectStatusBadge = ({ status }: { status: Project["status"] }) => {
    const variant: "default" | "secondary" | "outline" | "destructive" = {
      Completed: "default",
      Ongoing: "secondary",
      Planned: "outline",
      Suspended: "outline",
      Procurement: 'outline',
      Cancelled: "destructive"
    }[status];
  
    return <Badge variant={variant}>{status}</Badge>;
};

type ProjectsTableActionsProps = {
  record: Project;
  onEdit: (record: Project) => void;
  onDelete: (id: string) => void;
}

function ProjectsTableActions({ record, onEdit, onDelete }: ProjectsTableActionsProps) {
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
            <EditProject record={record} onEdit={onEdit} useIcon={false} />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
            <DeleteProject recordId={record.projectId} onDelete={onDelete} useIcon={false} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const getColumns = (onEdit: (record: Project) => void, onDelete: (id: string) => void): ColumnDef<Project>[] => [
  {
    accessorKey: "projectName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Project Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="pl-4 font-medium">{row.original.projectName}</div>
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "budget_amount",
    header: () => <div className="text-right">Budget</div>,
    cell: ({ row }) => <div className="text-right font-mono">{formatCurrency(row.original.budget_amount)}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <ProjectStatusBadge status={row.original.status} />
  },
  {
    accessorKey: "percentComplete",
    header: "Progress",
    cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Progress value={row.original.percentComplete ?? 0} className="h-2 w-[80px]" />
            <span className="text-muted-foreground text-xs">{row.original.percentComplete ?? 0}%</span>
        </div>
    )
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const record = row.original;
      return <ProjectsTableActions record={record} onEdit={onEdit} onDelete={onDelete} />
    },
  },
];
