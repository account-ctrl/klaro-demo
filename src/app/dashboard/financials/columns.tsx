
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { DisbursementVoucher as DV, Resident } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditTransaction, DeleteTransaction } from "./financial-actions";
import { Badge } from "@/components/ui/badge";
import { incomeCategories, expenseCategories } from "@/lib/data";

type FinancialsTableActionsProps = {
  record: DV;
  onEdit: (record: DV) => void;
  onDelete: (id: string) => void;
  residents: Resident[];
}

function FinancialsTableActions({ record, onEdit, onDelete, residents }: FinancialsTableActionsProps) {
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
          <EditTransaction record={record as any} onEdit={onEdit as any} residents={residents} incomeCategories={incomeCategories} expenseCategories={expenseCategories}/>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <DeleteTransaction recordId={record.dvId} onDelete={onDelete} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const getStatusBadgeVariant = (status: DV['status']) => {
    switch (status) {
        case 'Draft': return 'outline';
        case 'For Budget Certification': return 'secondary';
        case 'For Approval': return 'secondary';
        case 'Ready for Payment': return 'default';
        case 'Released': return 'default';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
};


export const getColumns = (onEdit: (record: DV) => void, onDelete: (id: string) => void, residents: Resident[]): ColumnDef<DV>[] => [
  {
    accessorKey: "dvNumber",
    header: "DV No.",
  },
  {
    accessorKey: "obrId",
    header: "OBR No.",
  },
  {
    accessorKey: "payee",
     header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Payee
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    cell: ({ row }) => <div className="pl-4 font-medium">{row.original.payee}</div>
  },
  {
    accessorKey: "grossAmount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => <div className="text-right font-mono">{formatCurrency(row.original.grossAmount)}</div>
  },
  {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={getStatusBadgeVariant(row.original.status)}>{row.original.status}</Badge>
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const record = row.original;
      return <FinancialsTableActions record={record} onEdit={onEdit} onDelete={onDelete} residents={residents} />
    },
  },
];
