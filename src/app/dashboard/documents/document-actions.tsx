
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
import type { CertificateRequest, Resident, CertificateType, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { DEFAULT_BARANGAY_CLEARANCE, DEFAULT_INDIGENCY, DEFAULT_RESIDENCY } from '@/app/dashboard/settings/templates/default-templates';
import { useOfficials } from '@/hooks/use-barangay-data';

const BARANGAY_ID = 'barangay_san_isidro';

const getAge = (dateString: string) => {
    if (!dateString) return 'N/A';
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age.toString();
};

const formatDate = (date: Date, formatStr: string) => {
    if (formatStr === 'long') {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (formatStr === 'day') return date.getDate().toString();
    if (formatStr === 'month') return date.toLocaleString('default', { month: 'long' });
    if (formatStr === 'year') return date.getFullYear().toString();
    return date.toLocaleDateString();
}

const fillTemplate = (template: string, request: CertificateRequest, resident?: Resident, officials?: User[]) => {
    let content = template;
    const now = new Date();

    // Resident Details
    content = content.replace(/{{ resident.firstName }}/g, resident?.firstName || 'N/A');
    content = content.replace(/{{ resident.lastName }}/g, resident?.lastName || 'N/A');
    content = content.replace(/{{ resident.middleName }}/g, resident?.middleName || '');
    content = content.replace(/{{ resident.suffix }}/g, resident?.suffix || '');
    content = content.replace(/{{ resident.address }}/g, resident?.address || 'Barangay San Isidro, Quezon City');
    content = content.replace(/{{ resident.age }}/g, resident?.dateOfBirth ? getAge(resident.dateOfBirth) : 'N/A');
    content = content.replace(/{{ resident.civilStatus }}/g, resident?.civilStatus || 'Single');
    
    // Request Details
    content = content.replace(/{{ request.purpose }}/g, request.purpose);
    content = content.replace(/{{ document.name }}/g, request.certificateName);

    // Date Logic (Basic Liquid-like syntax support)
    content = content.replace(/{{ 'now' \| date: 'long' }}/g, formatDate(now, 'long'));
    content = content.replace(/{{ 'now' \| date: 'day' }}/g, formatDate(now, 'day'));
    content = content.replace(/{{ 'now' \| date: 'month' }}/g, formatDate(now, 'month'));
    content = content.replace(/{{ 'now' \| date: 'year' }}/g, formatDate(now, 'year'));
    
    // Fallback for simple now
    content = content.replace(/{{ now }}/g, formatDate(now, 'long'));

    return content;
}

// Deprecated: generateCertificateHtml.
export const generateCertificateHtml = (request: CertificateRequest, resident?: Resident) => {
    return fillTemplate(DEFAULT_BARANGAY_CLEARANCE, request, resident);
};

type CertificateRequestWithId = CertificateRequest & { id?: string };

export type DocumentFormValues = Omit<CertificateRequest, 'requestId' | 'requestNumber' | 'dateRequested' | 'residentName' | 'certificateName'>;

type DocumentFormProps = {
  record?: CertificateRequestWithId;
  onSave: (data: DocumentFormValues | CertificateRequestWithId) => void;
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
  const { data: officials } = useOfficials();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleSelectChange = (id: 'certTypeId' | 'residentId' | 'status' | 'purpose' | 'processedByUserId', value: string) => {
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

  const officialOptions = officials?.map(o => ({
      value: o.userId,
      label: `${o.fullName} (${o.position})`
  })) || [];

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
            
            <div className="space-y-2">
                <Label htmlFor="processedByUserId">Issued By (Official)</Label>
                 <Combobox
                    options={officialOptions}
                    value={formData.processedByUserId || ''}
                    onChange={(value) => handleSelectChange('processedByUserId', value)}
                    placeholder="Select issuing official..."
                    searchPlaceholder="Search official..."
                  />
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

export function EditDocument({ record, onEdit, residents, certificateTypes }: { record: CertificateRequestWithId; onEdit: (data: CertificateRequestWithId) => void; residents: Resident[]; certificateTypes: CertificateType[] }) {
  const [open, setOpen] = useState(false);
  
  const handleSave = (data: CertificateRequestWithId) => {
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

export function PrintDocument({ record, onPrint, residents, certificateTypes }: { record: CertificateRequest; onPrint: (record: CertificateRequest) => void; residents: Resident[]; certificateTypes: CertificateType[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: officials } = useOfficials();

    const handlePrintClick = async () => {
        const resident = residents.find(r => r.residentId === record.residentId);
        const certType = certificateTypes.find(c => c.certTypeId === record.certTypeId);
        
        let templateContent = '';

        // Try to load template from Firestore if ID exists
        if (certType?.templateId && firestore) {
             try {
                const templateRef = doc(firestore, `/barangays/${BARANGAY_ID}/document_templates/${certType.templateId}`);
                const templateSnap = await getDoc(templateRef);
                if (templateSnap.exists()) {
                    templateContent = templateSnap.data().content;
                } else {
                     console.warn("Template not found in Firestore, checking defaults...");
                }
             } catch (e) {
                 console.error("Error fetching template:", e);
                 toast({ variant: 'destructive', title: 'Error', description: 'Failed to load document template. Using default.' });
             }
        }
        
        // Use smart defaults ONLY if no custom template was found
        if (!templateContent) {
             const lowerName = record.certificateName.toLowerCase();
             if (lowerName.includes('indigency')) {
                 templateContent = DEFAULT_INDIGENCY;
             } else if (lowerName.includes('residency') || lowerName.includes('resident')) {
                 templateContent = DEFAULT_RESIDENCY;
             } else {
                 templateContent = DEFAULT_BARANGAY_CLEARANCE;
             }
        }

        const htmlContent = fillTemplate(templateContent, record, resident, officials || []);
        const printWindow = window.open('', '_blank');
        printWindow?.document.write(htmlContent);
        printWindow?.document.close();
        
        setTimeout(() => {
            printWindow?.print();
        }, 500);
        
        onPrint(record);
    }
    return (
        <div onClick={handlePrintClick} className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
            <Printer className="mr-2 h-4 w-4" />
            <span>Print Document</span>
        </div>
    )
}
