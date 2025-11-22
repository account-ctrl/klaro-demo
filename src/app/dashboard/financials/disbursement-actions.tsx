
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
import { PlusCircle, FilePen, Trash2, Sprout } from 'lucide-react';
import type { DisbursementVoucher, Obligation, Resident } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fundSources } from '@/lib/data';
import { Combobox } from '@/components/ui/combobox';
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';

const BARANGAY_ID = 'barangay_san_isidro';

export type DisbursementFormValues = Omit<DisbursementVoucher, 'dvId' | 'dvNumber' | 'netAmount'>;

type DisbursementFormProps = {
  record?: DisbursementVoucher;
  onSave: (data: DisbursementFormValues | DisbursementVoucher) => void;
  onClose: () => void;
  residents: Resident[];
};

function DisbursementForm({ record, onSave, onClose, residents }: DisbursementFormProps) {
  const [formData, setFormData] = useState<DisbursementFormValues>({
    obrId: record?.obrId ?? '',
    payee: record?.payee ?? '',
    grossAmount: record?.grossAmount ?? 0,
    taxAmount: record?.taxAmount ?? 0,
    status: record?.status ?? 'Draft',
    checkNumber: record?.checkNumber ?? '',
    bankAccountId: record?.bankAccountId ?? '',
    releasedAt: record?.releasedAt ?? undefined,
    receivedBy: record?.receivedBy ?? '',
    description: record?.description ?? '',
    fundSource: record?.fundSource ?? 'General Fund',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({ 
        ...prev, 
        [id]: type === 'number' ? parseFloat(value) : value 
    }));
  };

  const handleSelectChange = (id: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }
  
  const handleResidentSelect = (residentId: string) => {
    const resident = residents.find(r => r.residentId === residentId);
    if(resident) {
      setFormData(prev => ({...prev, payee: `${resident.firstName} ${resident.lastName}`}));
    }
  }


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const netAmount = formData.grossAmount - (formData.taxAmount ?? 0);
    const dataToSave = { ...formData, netAmount };
    
    if (record) {
      onSave({ ...record, ...dataToSave });
    } else {
      onSave(dataToSave);
    }
  };
  
  const residentOptions = residents.map(r => ({ label: `${r.firstName} ${r.lastName}`, value: r.residentId }));


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ScrollArea className="h-[70vh] p-4">
        <div className="space-y-6">
           <div className="space-y-2">
              <Label>Search Payee</Label>
              <Combobox options={residentOptions} value="" onChange={handleResidentSelect} placeholder="Search and select a resident..." />
            </div>

          <div className="space-y-2">
            <Label htmlFor="payee">Payee</Label>
            <Input id="payee" value={formData.payee} onChange={handleChange} required />
          </div>

           <div className="space-y-2">
            <Label htmlFor="obrId">Obligation Request (OBR) No.</Label>
            <Input id="obrId" value={formData.obrId} onChange={handleChange} placeholder="e.g., OBR-2024-01-001" required />
          </div>

          <div className="grid grid-cols-3 gap-4">
             <div className="space-y-2">
                <Label htmlFor="grossAmount">Gross Amount (₱)</Label>
                <Input id="grossAmount" type="number" step="0.01" value={formData.grossAmount} onChange={handleChange} required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="taxAmount">Withholding Tax (₱)</Label>
                <Input id="taxAmount" type="number" step="0.01" value={formData.taxAmount} onChange={handleChange} />
            </div>
             <div className="space-y-2">
                <Label>Net Amount</Label>
                <Input value={(formData.grossAmount - (formData.taxAmount ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })} readOnly />
            </div>
          </div>
          
           <div className="space-y-2">
              <Label htmlFor="status">Voucher Status</Label>
              <Select onValueChange={(value) => handleSelectChange('status', value as any)} value={formData.status}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="For Budget Certification">For Budget Certification</SelectItem>
                  <SelectItem value="For Approval">For Approval</SelectItem>
                  <SelectItem value="Ready for Payment">Ready for Payment</SelectItem>
                  <SelectItem value="Released">Released</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
        </div>
      </ScrollArea>
      <DialogFooter className="border-t pt-4 mt-4">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Voucher</Button>
      </DialogFooter>
    </form>
  );
}


export function AddDisbursement({ onAdd, residents }: { onAdd: (data: DisbursementFormValues) => void; residents: Resident[] }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: DisbursementFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Disbursement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Disbursement Voucher</DialogTitle>
          <DialogDescription>
            Prepare a new payment voucher. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <DisbursementForm onSave={handleSave} onClose={() => setOpen(false)} residents={residents} />
      </DialogContent>
    </Dialog>
  );
}

export function EditDisbursement({ record, onEdit, residents }: { record: DisbursementVoucher; onEdit: (data: DisbursementVoucher) => void; residents: Resident[]}) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: DisbursementVoucher) => {
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
          <DialogTitle>Edit Disbursement Voucher</DialogTitle>
          <DialogDescription>
            Update the details for voucher #{record.dvNumber}.
          </DialogDescription>
        </DialogHeader>
        <DisbursementForm record={record} onSave={handleSave} onClose={() => setOpen(false)} residents={residents} />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDisbursement({ recordId, onDelete }: { recordId: string; onDelete: (id: string) => void; }) {
  const { toast } = useToast();
  const handleDelete = () => {
    onDelete(recordId);
    toast({
        variant: "destructive",
        title: "Voucher Deleted",
        description: `The disbursement voucher has been permanently deleted.`
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
            This action cannot be undone. This will permanently delete this voucher from Firestore.
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

const getAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};


export function BulkCreateVouchers({ residents }: { residents: Resident[] }) {
    const [open, setOpen] = useState(false);
    const [bulkType, setBulkType] = useState('senior_birthday');
    const [amount, setAmount] = useState(500);
    const [fundSource, setFundSource] = useState('General Fund');
    const [eligibleSeniors, setEligibleSeniors] = useState<Resident[]>([]);
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    useMemo(() => {
        if (bulkType === 'senior_birthday') {
            const currentMonth = new Date().getMonth();
            const seniors = residents.filter(r => {
                const age = getAge(r.dateOfBirth);
                const birthMonth = new Date(r.dateOfBirth).getMonth();
                return age >= 60 && birthMonth === currentMonth;
            });
            setEligibleSeniors(seniors);
        } else {
            setEligibleSeniors([]);
        }
    }, [residents, bulkType]);

    const handleBulkCreate = async () => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated' });
            return;
        }

        const totalAmount = eligibleSeniors.length * amount;
        if (totalAmount === 0) {
            toast({ variant: 'destructive', title: 'No Eligible Residents', description: 'No eligible residents found for this bulk action.' });
            return;
        }

        // 1. Create a single Obligation Request for the whole batch
        const obligationsRef = collection(firestore, `/barangays/${BARANGAY_ID}/obligations`);
        const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const obrDescription = `Senior Citizen Birthday Ayuda for ${monthYear}`;
        
        const newObr: Partial<Obligation> = {
            obrNumber: `OBR-BULK-${Date.now()}`,
            payee: 'Various Senior Citizens',
            fundSource: fundSource,
            description: obrDescription,
            amount: totalAmount,
            status: 'Active',
            certifiedBy: user.uid,
            certifiedAt: new Date() as any, // Not a timestamp, but ok for demo
        };
        const obrDocRef = await addDocumentNonBlocking(obligationsRef, newObr);
        if (obrDocRef) {
            await updateDocumentNonBlocking(obrDocRef, { obrId: obrDocRef.id });
        }
        
        // 2. Create individual Disbursement Vouchers
        const vouchersRef = collection(firestore, `/barangays/${BARANGAY_ID}/disbursement_vouchers`);
        const voucherPromises = eligibleSeniors.map(senior => {
            const newDv: Partial<DisbursementVoucher> = {
                dvNumber: `DV-${Date.now()}-${senior.residentId.slice(-4)}`,
                obrId: obrDocRef?.id ?? `OBR-BULK-${Date.now()}`,
                payee: `${senior.firstName} ${senior.lastName}`,
                grossAmount: amount,
                netAmount: amount, // Assuming no tax for social assistance
                taxAmount: 0,
                status: 'For Approval',
                description: `Birthday Ayuda for ${monthYear}`,
                fundSource: fundSource,
            };
             return addDocumentNonBlocking(vouchersRef, newDv).then(dvDocRef => {
                if(dvDocRef) updateDocumentNonBlocking(dvDocRef, { dvId: dvDocRef.id });
             });
        });

        await Promise.all(voucherPromises);

        toast({
            title: 'Bulk Creation Successful!',
            description: `${eligibleSeniors.length} vouchers have been created and are ready for approval.`
        });
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary"><Sprout className="mr-2 h-4 w-4"/> Bulk Create</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bulk Voucher Creation</DialogTitle>
                    <DialogDescription>
                        Generate multiple disbursement vouchers for social programs.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Program / Action</Label>
                        <Select value={bulkType} onValueChange={setBulkType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="senior_birthday">Senior Citizen Birthday Ayuda</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Fund Source</Label>
                        <Select value={fundSource} onValueChange={setFundSource}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {fundSources.map(fs => <SelectItem key={fs} value={fs}>{fs}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Amount per Resident (₱)</Label>
                        <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                    </div>
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                        Based on the current criteria, <span className="font-bold text-primary">{eligibleSeniors.length}</span> residents are eligible.
                        This will create a total obligation of <span className="font-bold text-primary">₱{(eligibleSeniors.length * amount).toLocaleString()}</span>.
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleBulkCreate}>Create {eligibleSeniors.length} Vouchers</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
