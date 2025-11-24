
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CertificateRequest, Resident, CertificateType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditDocument, DeleteDocument, PrintDocument } from "./document-actions";
import { Badge } from "@/components/ui/badge";

type CertificateRequestWithId = CertificateRequest & { id?: string };

type DocumentsTableActionsProps = {
  doc: CertificateRequestWithId;
  onEdit: (doc: CertificateRequestWithId) => void;
  onDelete: (id: string) => void;
  onPrint: (doc: CertificateRequestWithId) => void;
  residents: Resident[];
  certificateTypes: CertificateType[];
}

function DocumentsTableActions({ doc, onEdit, onDelete, onPrint, residents, certificateTypes }: DocumentsTableActionsProps) {
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
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={doc.status !== 'Approved'}>
            <PrintDocument record={doc} onPrint={onPrint} residents={residents} certificateTypes={certificateTypes} />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <EditDocument record={doc} onEdit={onEdit} residents={residents} certificateTypes={certificateTypes} />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <DeleteDocument recordId={doc.id || doc.requestId} onDelete={onDelete} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const getStatusBadgeVariant = (status: CertificateRequest['status']) => {
    switch (status) {
        case 'Claimed':
        case 'Approved':
            return 'default';
        case 'Ready for Pickup':
            return 'secondary';
        case 'Denied':
            return 'destructive';
        default:
            return 'outline';
    }
}

export const getColumns = (
  onEdit: (doc: CertificateRequestWithId) => void,
  onDelete: (id: string) => void,
  onPrint: (doc: CertificateRequestWithId) => void,
  residents: Resident[],
  certificateTypes: CertificateType[]
): ColumnDef<CertificateRequest>[] => [
  {
    accessorKey: "requestNumber",
    header: "Request No.",
  },
  {
    accessorKey: "residentName",
    header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Resident Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="pl-4">{row.original.residentName}</div>
  },
  {
    accessorKey: "certificateName",
    header: "Document Type",
  },
  {
    accessorKey: "purpose",
    header: "Purpose",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant={getStatusBadgeVariant(row.original.status)}>{row.original.status}</Badge>
  },
   {
    accessorKey: "dateRequested",
    header: "Date Requested",
     cell: ({ row }) => {
      const date = row.original.dateRequested?.toDate();
      return date ? date.toLocaleDateString() : 'N/A';
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const doc = row.original as CertificateRequestWithId;
      return <DocumentsTableActions doc={doc} onEdit={onEdit} onDelete={onDelete} onPrint={onPrint} residents={residents} certificateTypes={certificateTypes} />
    },
  },
];
