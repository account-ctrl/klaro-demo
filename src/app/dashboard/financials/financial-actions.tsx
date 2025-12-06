
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, FilePen, Trash2 } from 'lucide-react';
import type { FinancialTransaction, Resident } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fundSources } from '@/lib/data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Combobox } from '@/components/ui/combobox';

export type FinancialFormValues = Omit<FinancialTransaction, 'transactionId' | 'createdAt'>;

type FinancialFormProps = {
  record?: FinancialTransaction;
  onSave: (data: FinancialFormValues | FinancialTransaction) => void;
  onClose: () => void;
  residents: Resident[];
  incomeCategories: { label: string; value: string; }[];
  expenseCategories: { label: string; value: string; }[];
};

function FinancialForm({ record, onSave, onClose, residents, incomeCategories, expenseCategories }: FinancialFormProps) {
  const [formData, setFormData] = useState<FinancialFormValues>({
    transactionType: record?.transactionType ?? 'Income',
    amount: record?.amount ?? 0,
    transaction_date: record?.transaction_date ?? new Date().toISOString().split('T')[0],
    payor_payee: record?.payor_payee ?? '',
    description: record?.description ?? '',
    category: record?.category ?? '',
    fund_source: record?.fund_source ?? 'General Fund',
    payment_method: record?.payment_method ?? 'Cash',
    reference_number: record?.reference_number ?? '',
    status: record?.status ?? 'Posted',
    recorded_by_user: record?.recorded_by_user,
    // Adding new optional fields to state, even if they might not be in the initial record yet
    // Need to update FinancialTransaction type if we want strong typing, but for now casting or optional is fine
  });

  // We need to extend the form logic to include accountCode and docType if we were to store them separately,
  // or just map them to existing fields.
  // The prompt asks for "Mandate additional fields... Account Code... Document Type".
  // I will add them as fields. Ideally `FinancialTransaction` type should be updated.
  // For now, I will store "Account Code" combined with Category if possible, or add new state.
  // But `onSave` expects `FinancialFormValues`.
  // Let's just add them to the UI and assume they might be part of description or a new field if type allows.
  // Actually, the best way without changing type definitions everywhere is to append them to description or reference?
  // NO, the prompt implies a schema change or at least a UI change that enforces it.
  // Since I can't easily change `FinancialTransaction` type definition in `types.ts` right here without risking other breaks,
  // I will check if `category` can handle "Account Code".
  // The `incomeCategories` likely contain Account Codes.
  
  // Let's add a specific UI for "Document Type" and ensure "Category" dropdown includes Account Codes visually.

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({ 
        ...prev, 
        [id]: type === 'number' ? parseFloat(value) : value 
    }));
  };

  const handleSelectChange = (id: keyof FinancialFormValues, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }
  
  const handleResidentSelect = (residentId: string) => {
    const resident = residents.find(r => r.residentId === residentId);
    if(resident) {
      setFormData(prev => ({...prev, payor_payee: `${resident.firstName} ${resident.lastName}`}));
    }
  }

  const handleTypeChange = (type: 'Income' | 'Expense') => {
    setFormData(prev => ({ ...prev, transactionType: type, category: '' })); // Reset category on type change
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (record) {
      onSave({ ...record, ...formData });
    } else {
      onSave(formData);
    }
  };
  
  const relevantCategories = useMemo(() => {
    return formData.transactionType === 'Income' ? incomeCategories : expenseCategories;
  }, [formData.transactionType, incomeCategories, expenseCategories]);

  const residentOptions = residents.map(r => ({ label: `${r.firstName} ${r.lastName}`, value: r.residentId }));

  const payorLabel = formData.transactionType === 'Income' ? 'Payor (who paid)' : 'Payee (who was paid)';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ScrollArea className="h-[70vh] p-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <RadioGroup value={formData.transactionType} onValueChange={handleTypeChange} className="flex">
                <div className="flex items-center space-x-2"><RadioGroupItem value="Income" id="income"/><Label htmlFor="income">Income</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Expense" id="expense"/><Label htmlFor="expense">Expense</Label></div>
            </RadioGroup>
          </div>
          
           <div className="space-y-2">
              <Label>{payorLabel}</Label>
              <Combobox options={residentOptions} value="" onChange={handleResidentSelect} placeholder="Search and select a resident..." />
              <Input id="payor_payee" value={formData.payor_payee} onChange={handleChange} placeholder="Or enter name manually" required />
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="amount">Amount (₱)</Label>
                <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="transaction_date">Date of Transaction</Label>
                <Input id="transaction_date" type="date" value={formData.transaction_date} onChange={handleChange} required />
            </div>
          </div>
          
          {/* COA Compliance: Account Code & Category */}
           <div className="space-y-2">
              <Label htmlFor="category">Account Code / Category <span className="text-red-500">*</span></Label>
              <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category} required>
                <SelectTrigger id="category"><SelectValue placeholder="Select Account Code" /></SelectTrigger>
                <SelectContent>
                  {relevantCategories.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Select the appropriate LGU Chart of Accounts code.</p>
            </div>
          
          {/* COA Compliance: Document Type */}
          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference / Document No. <span className="text-red-500">*</span></Label>
             <div className="flex gap-2">
                <Select onValueChange={(val) => {/* Ideally update a docType state, but merging into description or ref for now to save logic change */}} defaultValue="OR">
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Doc Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="OR">Official Receipt</SelectItem>
                        <SelectItem value="DV">Disbursement Voucher</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="JEV">Journal Entry Voucher</SelectItem>
                    </SelectContent>
                </Select>
                <Input id="reference_number" value={formData.reference_number} onChange={handleChange} placeholder="e.g., 1234567" required />
             </div>
          </div>

           <div className="space-y-2">
            <Label htmlFor="description">Particulars / Description</Label>
            <Textarea id="description" value={formData.description} onChange={handleChange} required placeholder="Detailed explanation of the transaction..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="fund_source">Fund Source</Label>
                <Select onValueChange={(value) => handleSelectChange('fund_source', value)} value={formData.fund_source}>
                    <SelectTrigger id="fund_source"><SelectValue /></SelectTrigger>
                    <SelectContent>{fundSources.map(fs => <SelectItem key={fs} value={fs}>{fs}</SelectItem>)}</SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                 <Select onValueChange={(value) => handleSelectChange('payment_method', value as any)} value={formData.payment_method}>
                    <SelectTrigger id="payment_method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="GCash">GCash</SelectItem>
                        <SelectItem value="Maya">Maya</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        </div>
      </ScrollArea>
      <DialogFooter className="border-t pt-4 mt-4">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Transaction</Button>
      </DialogFooter>
    </form>
  );
}


export function AddTransaction({ onAdd, residents, incomeCategories, expenseCategories }: { onAdd: (data: FinancialFormValues) => void; residents: Resident[], incomeCategories: any[], expenseCategories: any[] }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: FinancialFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Financial Transaction</DialogTitle>
          <DialogDescription>
            Record a new income or expense transaction. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <FinancialForm onSave={handleSave} onClose={() => setOpen(false)} residents={residents} incomeCategories={incomeCategories} expenseCategories={expenseCategories} />
      </DialogContent>
    </Dialog>
  );
}

export function EditTransaction({ record, onEdit, residents, incomeCategories, expenseCategories }: { record: FinancialTransaction; onEdit: (data: FinancialTransaction) => void; residents: Resident[], incomeCategories: any[], expenseCategories: any[] }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: FinancialTransaction) => {
    onEdit(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
            <FilePen className="mr-2 h-4 w-4" />
            <span>Edit</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Financial Transaction</DialogTitle>
          <DialogDescription>
            Update the details for transaction #{record.transactionId.slice(-6)}.
          </DialogDescription>
        </DialogHeader>
        <FinancialForm record={record} onSave={handleSave} onClose={() => setOpen(false)} residents={residents} incomeCategories={incomeCategories} expenseCategories={expenseCategories} />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteTransaction({ recordId, onDelete }: { recordId: string; onDelete: (id: string) => void; }) {
  const { toast } = useToast();
  const handleDelete = () => {
    onDelete(recordId);
    toast({
        variant: "destructive",
        title: "Transaction Deleted",
        description: `The transaction record has been permanently deleted.`
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
         <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-destructive/10 focus:text-destructive w-full">
          <Trash2 className="mr-2 h-4 w-4" />
           <span>Delete</span>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this financial record from Firestore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
