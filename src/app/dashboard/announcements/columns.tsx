
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Announcement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditAnnouncement, DeleteAnnouncement } from "./announcement-actions";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type AnnouncementsTableActionsProps = {
  record: Announcement;
  onEdit: (record: Announcement) => void;
  onDelete: (id: string) => void;
}

function AnnouncementsTableActions({ record, onEdit, onDelete }: AnnouncementsTableActionsProps) {
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
          <EditAnnouncement record={record} onEdit={onEdit} />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <DeleteAnnouncement recordId={record.announcementId} onDelete={onDelete} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const getColumns = (
  onEdit: (record: Announcement) => void,
  onDelete: (id: string) => void,
): ColumnDef<Announcement>[] => [
  {
    accessorKey: "title",
    header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="pl-4 font-medium">{row.original.title}</div>
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>
  },
  {
    accessorKey: "datePosted",
    header: "Date Posted",
    cell: ({ row }) => {
      const date = row.original.datePosted?.toDate();
      return date ? format(date, 'PP') : 'N/A';
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const record = row.original;
      return <AnnouncementsTableActions record={record} onEdit={onEdit} onDelete={onDelete} />
    },
  },
];
