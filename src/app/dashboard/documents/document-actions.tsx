
'use client';

import { useState } from 'react';
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
import { PlusCircle, FilePen, Trash2, Printer } from 'lucide-react';
import type { CertificateRequest, Resident, CertificateType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';

export const generateCertificateHtml = (request: CertificateRequest, resident?: Resident) => {
    const css = `
        body { font-family: 'Times New Roman', serif; margin: 2in; }
        .header { text-align: center; line-height: 1.2; }
        .header img { width: 80px; height: 80px; }
        .header h1 { font-size: 16px; margin: 0; }
        .header h2 { font-size: 20px; font-weight: bold; margin: 5px 0; }
        .title { text-align: center; margin-top: 2rem; }
        .title h1 { font-size: 28px; font-weight: bold; letter-spacing: 5px; }
        .content { text-indent: 4em; margin-top: 2rem; text-align: justify; line-height: 1.8; font-size: 14px; }
        .signature-area { margin-top: 4rem; text-align: right; }
        .signature-area .official-name { font-weight: bold; font-size: 14px; text-transform: uppercase; }
        .signature-area .official-title { font-size: 12px; }
        .not-valid { margin-top: 5rem; text-align: center; font-size: 10px; font-style: italic; }
    `;
    const getAge = (dateString: string) => {
        if (!dateString) return 'N/A';
        const birthDate = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };
    const residentAge = resident ? getAge(resident.dateOfBirth) : 'N/A';

    return `
        <html>
        <head><title>${request.certificateName}</title><style>${css}</style></head>
        <body>
            <div class="header">
                <p>Republic of the Philippines<br>Province of Metro Manila<br>City of Quezon</p>
                <h2>Barangay San Isidro</h2>
                <p>Tel No. 123-4567</p>
            </div>
            <div class="title"><h1>BARANGAY CLEARANCE</h1></div>
            <div class="content">
                <p>This is to certify that <strong>${request.residentName.toUpperCase()}</strong>, ${residentAge} years old, Filipino, and a bona fide resident of this Barangay, is a person of good moral character and has no pending case filed against him/her in this office.</p>
                <p>This clearance is being issued upon the request of the above-named person for the purpose of <strong>${request.purpose}</strong>.</p>
                <p>Issued this ${new Date().getDate()}th day of ${new Date().toLocaleString('default', { month: 'long' })}, ${new Date().getFullYear()} at Barangay San Isidro, Quezon City.</p>
            </div>
            <div class="signature-area">
                <p class="official-name">JUAN L. TAMAD</p>
                <p class="official-title">Punong Barangay</p>
            </div>
            <div class="not-valid">Not valid without official barangay seal.</div>
        </body>
        </html>
    `;
};

export type DocumentFormValues = Omit<CertificateRequest, 'requestId' | 'requestNumber' | 'dateRequested' | 'residentName' | 'certificateName'>;

type DocumentFormProps = {
  record?: CertificateRequest;
  onSave: (data: DocumentFormValues | CertificateRequest) => void;
  onClose: () => void;
  residents: Resident[];
  certificateTypes: CertificateType[];
};

const purposeCategories = [
    "Employment",
    "School Requirement",
    "Bank Account Opening",
    "ID Application",
    "Travel",
    "Medical Assistance",
    "Other"
];


function DocumentForm({ record, onSave, onClose, residents, certificateTypes }: DocumentFormProps) {
  const [formData, setFormData] = useState<DocumentFormValues>({
    residentId: record?.residentId ?? '',
    certTypeId: record?.certTypeId ?? '',
    purpose: record?.purpose ?? '',
    status: record?.status ?? 'Pending',
    dateProcessed: record?.dateProcessed,
    processedByUserId: record?.processedByUserId,
    denialReason: record?.denialReason,
  });
  const [purposeDetail, setPurposeDetail] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleSelectChange = (id: 'certTypeId' | 'residentId' | 'status' | 'purpose', value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
     if (!formData.residentId) {
      alert("Please select a resident.");
      return;
    }
     if (!formData.certTypeId) {
      alert("Please select a certificate type.");
      return;
    }
    const fullPurpose = purposeDetail ? `${formData.purpose} - ${purposeDetail}` : formData.purpose;

    if (record) {
      onSave({ ...record, ...formData, purpose: fullPurpose });
    } else {
      onSave({...formData, purpose: fullPurpose});
    }
  };

  const residentOptions = residents.map(r => ({
    value: r.residentId,
    label: `${r.firstName} ${r.lastName}`
  }));

  return (
    <>
      <form id="doc-request-form" onSubmit={handleSubmit} className="space-y-4">
        <ScrollArea className="h-[60vh] p-4">
          <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="residentId">Resident Name</Label>
                <Combobox
                    options={residentOptions}
                    value={formData.residentId}
                    onChange={(value) => handleSelectChange('residentId', value)}
                    placeholder="Select a resident..."
                    searchPlaceholder="Search resident..."
                  />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="certTypeId">Document Type</Label>
                    <Select onValueChange={(value) => handleSelectChange('certTypeId', value)} value={formData.certTypeId} required>
                        <SelectTrigger id="certTypeId">
                            <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                            {certificateTypes.map(type => (
                                <SelectItem key={type.certTypeId} value={type.certTypeId}>
                                    {type.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select onValueChange={(value) => handleSelectChange('status', value as CertificateRequest['status'])} value={formData.status}>
                        <SelectTrigger id="status">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Processing">Processing</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                            <SelectItem value="Claimed">Claimed</SelectItem>
                            <SelectItem value="Denied">Denied</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Select onValueChange={(value) => handleSelectChange('purpose', value)} value={formData.purpose} required>
                        <SelectTrigger id="purpose">
                            <SelectValue placeholder="Select a purpose" />
                        </SelectTrigger>
                        <SelectContent>
                            {purposeCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="purposeDetail">Specific Detail (Optional)</Label>
                    <Input id="purposeDetail" value={purposeDetail} onChange={(e) => setPurposeDetail(e.target.value)} placeholder="e.g., ABC Company" />
                </div>
            </div>
            
            {formData.status === 'Denied' && (
                <div className="space-y-2">
                    <Label htmlFor="denialReason" className="text-destructive">Reason for Denial</Label>
                    <Textarea id="denialReason" value={formData.denialReason} onChange={handleChange} placeholder="Explain why the request was denied." required />
                </div>
            )}
          </div>
        </ScrollArea>
      </form>
       <DialogFooter className="border-t pt-4">
        <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" form="doc-request-form">Save Document</Button>
      </DialogFooter>
    </>
  );
}


export function AddDocument({ onAdd, residents, certificateTypes }: { onAdd: (data: DocumentFormValues) => void; residents: Resident[]; certificateTypes: CertificateType[] }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: DocumentFormValues) => {
    onAdd(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Create New Document Request</DialogTitle>
          <DialogDescription>
            Select a resident and fill in the document details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <DocumentForm onSave={handleSave} onClose={() => setOpen(false)} residents={residents} certificateTypes={certificateTypes} />
      </DialogContent>
    </Dialog>
  );
}

export function EditDocument({ record, onEdit, residents, certificateTypes }: { record: CertificateRequest; onEdit: (data: CertificateRequest) => void; residents: Resident[]; certificateTypes: CertificateType[] }) {
  const [open, setOpen] = useState(false);
  
  const handleSave = (data: CertificateRequest) => {
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
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Edit Document Request</DialogTitle>
          <DialogDescription>
            Update the details for request #{record.requestNumber}.
          </DialogDescription>
        </DialogHeader>
        <DocumentForm record={record} onSave={handleSave} onClose={() => setOpen(false)} residents={residents} certificateTypes={certificateTypes} />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDocument({ recordId, onDelete }: { recordId: string; onDelete: (id: string) => void; }) {
   const { toast } = useToast();
   const handleDelete = () => {
        onDelete(recordId);
        toast({
            variant: "destructive",
            title: "Document Request Deleted",
            description: "The record has been permanently deleted."
        });
   }
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
            This action cannot be undone. This will permanently delete the document request from Firestore.
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

export function PrintDocument({ record, onPrint, residents }: { record: CertificateRequest; onPrint: (record: CertificateRequest) => void; residents: Resident[] }) {
    const handlePrintClick = () => {
        const resident = residents.find(r => r.residentId === record.residentId);
        const htmlContent = generateCertificateHtml(record, resident);
        const printWindow = window.open('', '_blank');
        printWindow?.document.write(htmlContent);
        printWindow?.document.close();
        printWindow?.print();
        onPrint(record);
    }
    return (
        <div onClick={handlePrintClick} className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
            <Printer className="mr-2 h-4 w-4" />
            <span>Print Document</span>
        </div>
    )
}
