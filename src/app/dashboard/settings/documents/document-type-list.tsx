
'use client';

import React from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { CertificateType } from '@/lib/types';
import { AddDocumentType, EditDocumentType, DeleteDocumentType, DocumentTypeFormValues } from './document-type-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Tag, CircleDollarSign, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// In a real multi-tenant app, this would come from the user's session/claims or route.
const BARANGAY_ID = 'barangay_san_isidro';

type CertificateTypeWithId = CertificateType & { id?: string };

export default function DocumentTypeList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const docTypesCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `/barangays/${BARANGAY_ID}/certificate_types`);
    }, [firestore]);
    
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
        if (!firestore || !docId) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/certificate_types/${docId}`);
        const { certTypeId, id, ...dataToUpdate } = updatedDocType;
        updateDocumentNonBlocking(docRef, { ...dataToUpdate });
        toast({ title: "Document Type Updated", description: `The record for ${updatedDocType.name} has been updated.`});
    };

    const handleDelete = (id: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/certificate_types/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: "destructive", title: "Document Type Deleted", description: "The document type has been permanently deleted." });
    };
    
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
        <div className="flex justify-end">
            <AddDocumentType onAdd={handleAdd} />
        </div>
        
        {!documentTypes || documentTypes.length === 0 ? (
             <div className="text-muted-foreground col-span-full text-center py-10">
                No document types found. Click "New Document Type" to get started.
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
