
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Info } from 'lucide-react';
import type { CertificateType } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';


export type RequestFormValues = {
  certTypeId: string;
  purpose: string;
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


type RequestFormProps = {
  onSave: (data: RequestFormValues) => void;
  onClose: () => void;
  certificateTypes: CertificateType[];
};

function RequestForm({ onSave, onClose, certificateTypes }: RequestFormProps) {
    const [certTypeId, setCertTypeId] = useState('');
    const [purpose, setPurpose] = useState('');
    const [selectedCert, setSelectedCert] = useState<CertificateType | null>(null);

    const handleCertTypeChange = (value: string) => {
        setCertTypeId(value);
        const cert = certificateTypes?.find(c => c.certTypeId === value);
        setSelectedCert(cert || null);
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ certTypeId, purpose });
    };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select onValueChange={handleCertTypeChange} value={certTypeId}>
                <SelectTrigger id="documentType">
                    <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                {certificateTypes?.map(type => (
                    <SelectItem key={type.certTypeId} value={type.certTypeId}>
                    {type.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>

        {selectedCert && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    The fee for this document is <span className="font-bold text-primary">₱{selectedCert.fee?.toFixed(2) ?? '0.00'}</span>.
                    {selectedCert.requirements && selectedCert.requirements.length > 0 && (
                        <div className="mt-2 text-xs">
                            <span className="font-semibold">Requirements:</span> {selectedCert.requirements.join(', ')}
                        </div>
                    )}
                </AlertDescription>
            </Alert>
        )}

        <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Select onValueChange={setPurpose} value={purpose} disabled={!certTypeId}>
                <SelectTrigger id="purpose">
                <SelectValue placeholder="Select the purpose of your request" />
                </SelectTrigger>
                <SelectContent>
                {purposeCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                    {cat}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={!purpose || !certTypeId}>Submit Request</Button>
      </DialogFooter>
    </form>
  );
}


export function AddRequest({ onAdd, certificateTypes }: { onAdd: (data: RequestFormValues) => void; certificateTypes: CertificateType[] }) {
  const [open, setOpen] = useState(false);

  const handleSave = (data: RequestFormValues) => {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request New Document</DialogTitle>
          <DialogDescription>
            Select a document type and specify the purpose for your request.
          </DialogDescription>
        </DialogHeader>
        <RequestForm onSave={handleSave} onClose={() => setOpen(false)} certificateTypes={certificateTypes} />
      </DialogContent>
    </Dialog>
  );
}
