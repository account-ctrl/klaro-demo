
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { FinancialTransaction, Resident } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
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
  record: FinancialTransaction;
  onEdit: (record: FinancialTransaction) => void;
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
          <DeleteTransaction recordId={record.transactionId} onDelete={onDelete} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


export const getFinancialsColumns = (onEdit: (record: FinancialTransaction) => void, onDelete: (id: string) => void, residents: Resident[]): ColumnDef<FinancialTransaction>[] => [
  {
    accessorKey: "transactionType",
    header: "Type",
    cell: ({ row }) => {
        const isIncome = row.original.transactionType === 'Income';
        return (
            <Badge variant={isIncome ? 'default' : 'secondary'} className="w-24 justify-center">
                {isIncome ? <ArrowUpCircle className="mr-2 h-4 w-4" /> : <ArrowDownCircle className="mr-2 h-4 w-4"/>}
                {row.original.transactionType}
            </Badge>
        )
    }
  },
  {
    accessorKey: "transaction_date",
    header: "Date",
    cell: ({row}) => new Date(row.original.transaction_date).toLocaleDateString()
  },
  {
    accessorKey: "payor_payee",
     header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Payor/Payee
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    cell: ({ row }) => <div className="pl-4 font-medium">{row.original.payor_payee}</div>
  },
   {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
        const isIncome = row.original.transactionType === 'Income';
        return <div className={`text-right font-mono ${isIncome ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(row.original.amount)}</div>
    }
  },
  {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={row.original.status === 'Posted' ? 'default' : 'outline'}>{row.original.status}</Badge>
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const record = row.original;
      return <FinancialsTableActions record={record} onEdit={onEdit} onDelete={onDelete} residents={residents} />
    },
  },
];
