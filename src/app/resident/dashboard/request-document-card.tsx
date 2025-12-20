
'use client';

import React, { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, Info } from 'lucide-react';
import type { CertificateRequest, CertificateType } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const BARANGAY_ID = 'barangay_san_isidro';

const purposeCategories = [
    "Employment",
    "School Requirement",
    "Bank Account Opening",
    "ID Application",
    "Travel",
    "Medical Assistance",
    "Other"
];

export function RequestDocumentCard() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [certTypeId, setCertTypeId] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [selectedCert, setSelectedCert] = useState<CertificateType | null>(null);

  const certTypesCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `/barangays/${BARANGAY_ID}/certificate_types`);
  }, [firestore]);

  const { data: certificateTypes, isLoading: isLoadingCertTypes } = useCollection<CertificateType>(certTypesCollectionRef);


  const handleCertTypeChange = (value: string) => {
    setCertTypeId(value);
    const cert = certificateTypes?.find(c => c.certTypeId === value);
    setSelectedCert(cert || null);
  }

  const handleRequest = () => {
    if (!certTypeId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a document type.' });
      return;
    }
    if (!purpose) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a purpose for your request.' });
      return;
    }
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not submit request. User not logged in.' });
        return;
    }
    if (!selectedCert) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected certificate type is invalid.' });
        return;
    }

    startTransition(() => {
        const documentsCollectionRef = collection(firestore, `/barangays/${BARANGAY_ID}/certificate_requests`);
        const docToAdd: Omit<CertificateRequest, 'requestId' | 'requestNumber'> = {
            residentId: user.uid,
            residentName: user.displayName || 'Resident',
            certTypeId: certTypeId,
            certificateName: selectedCert.name,
            purpose: purpose,
            status: 'Pending',
            dateRequested: serverTimestamp() as any,
        };

        addDocumentNonBlocking(documentsCollectionRef, docToAdd).then(docRef => {
            if(docRef) {
                const generatedId = `REQ-${Date.now()}`;
                updateDocumentNonBlocking(docRef, { 
                    requestId: docRef.id,
                    requestNumber: generatedId
                });
            }
        });

        toast({
            title: "Request Submitted!",
            description: `Your request for a ${selectedCert.name} has been sent.`,
        });

        // Reset form
        setCertTypeId('');
        setPurpose('');
        setSelectedCert(null);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a Document</CardTitle>
        <CardDescription>
          Apply for barangay certificates online.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="documentType">Document Type</Label>
          <Select onValueChange={handleCertTypeChange} value={certTypeId} disabled={isLoadingCertTypes}>
            <SelectTrigger id="documentType">
              <SelectValue placeholder={isLoadingCertTypes ? "Loading types..." : "Select a document"} />
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
      </CardContent>
      <CardFooter>
        <Button onClick={handleRequest} disabled={isPending || isLoadingCertTypes || !purpose} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Request
        </Button>
      </CardFooter>
    </Card>
  );
}
