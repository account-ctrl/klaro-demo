
'use client';

import React, { useState } from 'react';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { DocumentTemplate } from '@/lib/types';
import { AddTemplate, EditTemplate, DeleteTemplate, TemplateFormValues } from './template-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCode, RefreshCcw, LayoutGrid, List, FilePen, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
    DEFAULT_BARANGAY_CLEARANCE,
    DEFAULT_INDIGENCY,
    DEFAULT_RESIDENCY,
    DEFAULT_BUSINESS_CLEARANCE,
    DEFAULT_SUMMONS
} from './default-templates';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import { useTenantContext } from '@/lib/hooks/useTenant';

type DocumentTemplateWithId = DocumentTemplate & { id?: string };

export default function TemplateList() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const { tenantPath } = useTenantContext();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

    const templatesCollectionRef = useMemoFirebase(() => {
        if (!firestore || !tenantPath) return null;
        return collection(firestore, `${tenantPath}/document_templates`);
    }, [firestore, tenantPath]);
    
    const { data: templates, isLoading } = useCollection<DocumentTemplate>(templatesCollectionRef);

    const handleAdd = (newTemplate: TemplateFormValues) => {
        if (!templatesCollectionRef || !user) return;
        
        const docToAdd = {
            ...newTemplate,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }

        addDocumentNonBlocking(templatesCollectionRef, docToAdd)
            .then(docRef => {
                if (docRef) {
                    updateDocumentNonBlocking(docRef, { templateId: docRef.id });
                }
            });

        toast({ title: "Template Added", description: `${newTemplate.name} has been created.`});
    };

    const handleEdit = (updatedTemplate: DocumentTemplateWithId) => {
        const docId = updatedTemplate.id || updatedTemplate.templateId;
        if (!firestore || !docId || !tenantPath) return;
        const docRef = doc(firestore, `${tenantPath}/document_templates/${docId}`);
        const { templateId, id, createdAt, ...dataToUpdate } = updatedTemplate;
        
        const finalData = {
            ...dataToUpdate,
            updatedAt: serverTimestamp(),
        }

        updateDocumentNonBlocking(docRef, finalData);
        toast({ title: "Template Updated", description: `The template ${updatedTemplate.name} has been updated.`});
    };

    const handleDelete = (id: string) => {
        if (!firestore || !tenantPath) return;
        const docRef = doc(firestore, `${tenantPath}/document_templates/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: "destructive", title: "Template Deleted", description: "The document template has been permanently deleted." });
    };

    const handleResetDefaults = async () => {
        if (!firestore || !user || !tenantPath) return;

        const defaultTemplatesList = [
            { name: 'Barangay Clearance', description: 'Standard clearance for general purposes.', content: DEFAULT_BARANGAY_CLEARANCE },
            { name: 'Certificate of Indigency', description: 'Proof of indigent status for assistance.', content: DEFAULT_INDIGENCY },
            { name: 'Certificate of Residency', description: 'Proof of residence in the barangay.', content: DEFAULT_RESIDENCY },
            { name: 'Business Clearance', description: 'Clearance for business permit applications.', content: DEFAULT_BUSINESS_CLEARANCE },
            { name: 'Summons (Patawag)', description: 'Standard summons template for lupon hearings.', content: DEFAULT_SUMMONS },
        ];

        try {
            const batch = writeBatch(firestore);
            
            // We iterate and create new docs. In a more complex app, we might check for duplicates first.
            // Here we just add them as new templates.
            defaultTemplatesList.forEach(tpl => {
                const newDocRef = doc(collection(firestore, `${tenantPath}/document_templates`));
                batch.set(newDocRef, {
                    templateId: newDocRef.id,
                    name: tpl.name,
                    description: tpl.description,
                    content: tpl.content,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            });

            await batch.commit();
            toast({ 
                title: "Defaults Restored", 
                description: "Standard document templates have been added to your list." 
            });
        } catch (error) {
            console.error("Error restoring defaults:", error);
            toast({ 
                variant: 'destructive', 
                title: "Error", 
                description: "Failed to restore default templates." 
            });
        }
    };
    
    if (isLoading) {
        return (
             <div className="space-y-4">
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-[220px] w-full rounded-xl" />
                    ))}
                </div>
             </div>
        )
    }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <div className="flex items-center bg-muted p-1 rounded-lg border">
                <Button 
                    variant={viewMode === 'card' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('card')}
                    className="px-3"
                >
                    <LayoutGrid className="h-4 w-4 mr-2" /> Card
                </Button>
                <Button 
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('list')}
                    className="px-3"
                >
                    <List className="h-4 w-4 mr-2" /> List
                </Button>
            </div>

            <div className="flex gap-2">
                <Button variant="outline" onClick={handleResetDefaults}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Load Defaults
                </Button>
                <AddTemplate onAdd={handleAdd} />
            </div>
        </div>
        
        {!templates || templates.length === 0 ? (
             <div className="text-muted-foreground col-span-full text-center py-10">
                No document templates found. You can add one manually or click "Load Defaults" to start with standard templates.
            </div>
        ) : (
            viewMode === 'card' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => {
                        const templateWithId = template as DocumentTemplateWithId;
                        return (
                        <Card key={template.templateId}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileCode className="h-5 w-5 text-primary"/>
                                    {template.name}
                                </CardTitle>
                                <CardDescription>{template.description || 'No description provided.'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">ID: <span className="font-mono text-xs">{template.templateId}</span></p>
                                <p className="text-sm text-muted-foreground">Last updated: {template.updatedAt ? format(template.updatedAt.toDate(), 'PPp') : 'N/A'}</p>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2 items-stretch">
                                <EditTemplate record={templateWithId} onEdit={handleEdit} />
                                <DeleteTemplate recordId={templateWithId.id || templateWithId.templateId} onDelete={handleDelete} />
                            </CardFooter>
                        </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Template Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map((template) => {
                                const templateWithId = template as DocumentTemplateWithId;
                                return (
                                    <TableRow key={template.templateId}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <FileCode className="h-4 w-4 text-primary" />
                                            {template.name}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">{template.description}</TableCell>
                                        <TableCell>{template.updatedAt ? format(template.updatedAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <EditTemplate 
                                                    record={templateWithId} 
                                                    onEdit={handleEdit}
                                                    trigger={<Button variant="ghost" size="icon"><FilePen className="h-4 w-4"/></Button>}
                                                />
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete {template.name}.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction onClick={() => handleDelete(templateWithId.id || templateWithId.templateId)} className="bg-destructive">
                                                        Delete
                                                      </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )
        )}
    </div>
  );
}
