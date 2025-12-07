
'use client';

import React from 'react';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { CertificateType } from '@/lib/types';
import { AddDocumentType, EditDocumentType, DeleteDocumentType, DocumentTypeFormValues } from './document-type-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Tag, CircleDollarSign, CheckSquare, RefreshCcw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenantContext } from '@/lib/hooks/useTenant';

type CertificateTypeWithId = CertificateType & { id?: string };

export default function DocumentTypeList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const { tenantPath } = useTenantContext();

    const docTypesCollectionRef = useMemoFirebase(() => {
        if (!firestore || !tenantPath) return null;
        return collection(firestore, `${tenantPath}/certificate_types`);
    }, [firestore, tenantPath]);
    
    const { data: documentTypes, isLoading } = useCollection<CertificateType>(docTypesCollectionRef);

    const handleAdd = (newDocType: DocumentTypeFormValues) => {
        if (!docTypesCollectionRef || !user) return;
        
        addDocumentNonBlocking(docTypesCollectionRef, newDocType)
            .then(docRef => {
                if (docRef) {
                    updateDocumentNonBlocking(docRef, { certTypeId: docRef.id });
                }
            });

        toast({ title: "Document Type Added", description: `${newDocType.name} has been created.`});
    };

    const handleEdit = (updatedDocType: CertificateTypeWithId) => {
        const docId = updatedDocType.id || updatedDocType.certTypeId;
        if (!firestore || !docId || !tenantPath) return;
        const docRef = doc(firestore, `${tenantPath}/certificate_types/${docId}`);
        const { certTypeId, id, ...dataToUpdate } = updatedDocType;
        updateDocumentNonBlocking(docRef, { ...dataToUpdate });
        toast({ title: "Document Type Updated", description: `The record for ${updatedDocType.name} has been updated.`});
    };

    const handleDelete = (id: string) => {
        if (!firestore || !tenantPath) return;
        const docRef = doc(firestore, `${tenantPath}/certificate_types/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: "destructive", title: "Document Type Deleted", description: "The document type has been permanently deleted." });
    };

    const handleLoadDefaults = async () => {
        if (!firestore || !tenantPath) return;

        const sampleDocTypes = [
            { name: 'Barangay Clearance', code: 'BC-001', fee: 100, validityInMonths: 6, requirements: ['Valid ID', 'Community Tax Certificate (Cedula)'] },
            { name: 'Certificate of Indigency', code: 'IND-001', fee: 0, validityInMonths: 6, requirements: ['Valid ID', 'Proof of Income (Optional)'] },
            { name: 'Certificate of Residency', code: 'RES-001', fee: 50, validityInMonths: 6, requirements: ['Valid ID'] },
            { name: 'Business Clearance', code: 'BUS-001', fee: 500, validityInMonths: 12, requirements: ['DTI/SEC Registration', 'Contract of Lease'] },
        ];

        try {
            const batch = writeBatch(firestore);
            sampleDocTypes.forEach((docType) => {
                const newDocRef = doc(collection(firestore, `${tenantPath}/certificate_types`));
                batch.set(newDocRef, {
                    ...docType,
                    certTypeId: newDocRef.id,
                });
            });
            await batch.commit();
            toast({ title: "Sample Data Loaded", description: "Default document types have been added." });
        } catch (error) {
            console.error("Error loading defaults:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load sample data." });
        }
    };

    const handleClearAll = async () => {
        if (!firestore || !documentTypes || !tenantPath) return;
        
        try {
            const batch = writeBatch(firestore);
            documentTypes.forEach((docType) => {
                const docId = (docType as CertificateTypeWithId).id || docType.certTypeId;
                if (docId) {
                    const docRef = doc(firestore, `${tenantPath}/certificate_types/${docId}`);
                    batch.delete(docRef);
                }
            });
            await batch.commit();
            toast({ variant: "destructive", title: "Data Cleared", description: "All document types have been removed." });
        } catch (error) {
             console.error("Error clearing data:", error);
             toast({ variant: "destructive", title: "Error", description: "Failed to clear data." });
        }
    }
    
    if (isLoading) {
        return (
             <div className="space-y-4">
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
                    ))}
                </div>
             </div>
        )
    }

  return (
    <div className="space-y-6">
        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleLoadDefaults}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Load Samples
            </Button>
            <Button variant="destructive" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleClearAll} disabled={!documentTypes || documentTypes.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
            </Button>
            <AddDocumentType onAdd={handleAdd} />
        </div>
        
        {!documentTypes || documentTypes.length === 0 ? (
             <div className="text-muted-foreground col-span-full text-center py-10">
                No document types found. Click "New Document Type" or "Load Samples" to get started.
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {documentTypes.map((docType) => {
                    const docWithId = docType as CertificateTypeWithId;
                    return (
                        <Card key={docType.certTypeId}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{docType.name}</CardTitle>
                                    {docType.code && <Badge variant="outline">{docType.code}</Badge>}
                                </div>
                                <CardDescription>Fee: ₱{docType.fee?.toFixed(2) ?? '0.00'} | Valid for {docType.validityInMonths ?? 12} months</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm flex items-center gap-2"><CheckSquare className="h-4 w-4 text-primary" /> Requirements</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {docType.requirements?.map(req => (
                                            <Badge key={req} variant="secondary" className="font-normal">{req}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2 items-stretch">
                                <EditDocumentType record={docWithId} onEdit={handleEdit} />
                                <DeleteDocumentType recordId={docWithId.id || docWithId.certTypeId} onDelete={handleDelete} />
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        )}
    </div>
  );
}
