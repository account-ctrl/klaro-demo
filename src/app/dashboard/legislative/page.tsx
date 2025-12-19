
'use client';

import { useState, useEffect } from 'react';
import { useOrdinances, useLegislativeRef } from '@/hooks/use-legislative';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useFirestore } from '@/firebase';
import { serverTimestamp, doc } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Scale, Plus, FileText, Download, Gavel, Trash2, PenLine, Search, Filter, List, LayoutGrid, ArrowLeft, FileDown, ChevronDown, ChevronUp, Eye, EyeOff, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Ordinance, WithId } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { caseTypes } from '../blotter/case-types';
import OrdinanceEditor from './editor/ordinance-editor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Editor } from '@tiptap/react';
import { DraftTools } from './editor/draft-tools';
import { useTenant } from '@/providers/tenant-provider';
import { withRoleGuard } from '@/components/auth/role-guard';
import { PERMISSIONS } from '@/lib/config/roles';

type OrdinanceFormValues = Omit<Ordinance, 'ordinanceId' | 'createdAt' | 'status'> & {
    relatedViolation?: string;
};

const initialFormValues: OrdinanceFormValues = {
    ordinanceNumber: '',
    title: '',
    description: '',
    contentHtml: '',
    category: 'General',
    penaltyAmount: 0,
    pdfUrl: '',
    dateEnacted: '',
    relatedViolation: ''
};

function LegislativePage() {
    const firestore = useFirestore();
    const { data: ordinances, isLoading } = useOrdinances();
    const ordinancesRef = useLegislativeRef('ordinances');
    const { toast } = useToast();
    const { tenantPath } = useTenant();
    
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentOrdinanceId, setCurrentOrdinanceId] = useState<string | null>(null);
    const [formData, setFormData] = useState<OrdinanceFormValues>(initialFormValues);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    
    // Draft Mode States
    const [isDraftMode, setIsDraftMode] = useState(false);
    const [draftContent, setDraftContent] = useState('');
    const [isDraftMetadataOpen, setIsDraftMetadataOpen] = useState(true); 
    const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false); // Toggle between Form+Editor vs Print Preview

    const handleOpenAdd = () => {
        setFormData(initialFormValues);
        setIsEditMode(false);
        setCurrentOrdinanceId(null);
        setIsSheetOpen(true);
    };

    const handleOpenEdit = (ordinance: WithId<Ordinance> & { relatedViolation?: string }) => {
        const id = ordinance.ordinanceId || ordinance.id;
        
        const loadedData = {
            ordinanceNumber: ordinance.ordinanceNumber || '',
            title: ordinance.title,
            description: ordinance.description || '',
            contentHtml: ordinance.contentHtml || '',
            category: ordinance.category,
            penaltyAmount: ordinance.penaltyAmount || 0,
            pdfUrl: ordinance.pdfUrl || '',
            dateEnacted: ordinance.dateEnacted || '',
            relatedViolation: ordinance.relatedViolation || ''
        };

        setFormData(loadedData);
        setCurrentOrdinanceId(id);

        if (ordinance.status === 'Draft') {
            setDraftContent(loadedData.contentHtml);
            setIsDraftMode(true);
        } else {
            setIsEditMode(true);
            setIsSheetOpen(true);
        }
    };

    const handleSelectDraft = (draftId: string) => {
        const draft = ordinances?.find(o => (o.ordinanceId || (o as any).id) === draftId);
        if (draft) {
            setFormData({
                ordinanceNumber: draft.ordinanceNumber || '',
                title: draft.title,
                description: draft.description || '',
                contentHtml: draft.contentHtml || '',
                category: draft.category,
                penaltyAmount: draft.penaltyAmount || 0,
                pdfUrl: draft.pdfUrl || '',
                dateEnacted: draft.dateEnacted || '',
                relatedViolation: draft.relatedViolation || ''
            });
            setCurrentOrdinanceId(draft.ordinanceId || (draft as any).id);
            setIsEditMode(true); 
        }
    };

    const handleSubmit = () => {
        if (!formData.ordinanceNumber || !formData.title) {
            toast({
                title: "Validation Error",
                description: "Ordinance Number and Title are required.",
                variant: "destructive"
            });
            return;
        }

        const dataToSave = {
            ...formData,
            penaltyAmount: Number(formData.penaltyAmount) || 0,
            status: 'Active' as const, 
        };

        if (isEditMode && currentOrdinanceId && firestore && tenantPath) {
            const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
            const docRef = doc(firestore, `${safePath}/ordinances/${currentOrdinanceId}`);
            setDocumentNonBlocking(docRef, dataToSave, { merge: true });
            
            toast({
                title: "Ordinance Published",
                description: "The ordinance has been successfully updated and published."
            });
        } else if (ordinancesRef) {
            addDocumentNonBlocking(ordinancesRef, {
                ...dataToSave,
                createdAt: serverTimestamp()
            });

            toast({
                title: "Ordinance Published",
                description: "New ordinance has been added to the records."
            });
        }

        setIsSheetOpen(false);
    };
    
    const handleSaveDraft = () => {
        if (!ordinancesRef) return;
        
        const draftData = {
            ...formData,
            title: formData.title || 'Untitled Draft',
            description: formData.description || 'Drafted content via Editor',
            contentHtml: draftContent,
            status: 'Draft' as const,
            ordinanceNumber: formData.ordinanceNumber || 'DRAFT-' + Date.now().toString().slice(-6), 
            penaltyAmount: Number(formData.penaltyAmount) || 0,
        };

        if (currentOrdinanceId && firestore && tenantPath) {
             const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
             const docRef = doc(firestore, `${safePath}/ordinances/${currentOrdinanceId}`);
             setDocumentNonBlocking(docRef, draftData, { merge: true });
             toast({ title: "Draft Updated", description: "Your draft has been updated." });
        } else {
             addDocumentNonBlocking(ordinancesRef, {
                 ...draftData,
                 createdAt: serverTimestamp()
             });
             toast({ title: "Draft Saved", description: "Your draft has been saved to the list." });
        }
        
        setIsDraftMode(false);
        setFormData(initialFormValues);
        setDraftContent('');
        setCurrentOrdinanceId(null);
    }

    const handleDelete = (id: string) => {
        if (!firestore || !tenantPath) return;
        
        const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
        const docRef = doc(firestore, `${safePath}/ordinances/${id}`);
        deleteDocumentNonBlocking(docRef);
        toast({
            title: "Ordinance Deleted",
            description: "The ordinance has been removed."
        });
    };

    const filteredOrdinances = ordinances?.filter(ord => {
        const matchesSearch = ord.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              ord.ordinanceNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || ord.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    
    const availableDrafts = ordinances?.filter(o => o.status === 'Draft') || [];

    if (isDraftMode) {
        return (
            <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-1">
                        <Button variant="ghost" size="icon" onClick={() => setIsDraftMode(false)}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex-1 mr-4">
                             <div className="flex items-center gap-2">
                                 <h1 className="text-xl font-bold tracking-tight truncate">
                                     {formData.title || 'Drafting: Untitled Ordinance'}
                                 </h1>
                                 <Badge variant="outline">
                                     {formData.ordinanceNumber || 'No Number'}
                                 </Badge>
                             </div>
                            <p className="text-sm text-muted-foreground">
                                {isPreviewMode ? 'Review Mode' : 'Drafting Mode'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* Mode Switch */}
                        <Button 
                            variant={isPreviewMode ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => setIsPreviewMode(!isPreviewMode)}
                        >
                            {isPreviewMode ? <EyeOff className="mr-2 h-4 w-4"/> : <Eye className="mr-2 h-4 w-4"/>}
                            {isPreviewMode ? 'Edit' : 'Preview'}
                        </Button>

                        <Button variant="outline" size="sm" onClick={handleSaveDraft}>Save Draft</Button>
                        
                        {/* Submit for Approval Stub */}
                         <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                             toast({ title: "Submitted", description: "Ordinance submitted for review (Stub)." });
                             handleSaveDraft();
                         }}>
                            <Send className="mr-2 h-4 w-4"/> Submit
                        </Button>
                    </div>
                </div>
                
                {/* Layout */}
                <div className="flex-1 min-h-0 flex gap-4">
                     {/* Left Column: Editor / Preview */}
                     <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                        {!isPreviewMode && (
                            <Collapsible open={isDraftMetadataOpen} onOpenChange={setIsDraftMetadataOpen} className="border rounded-md bg-muted/30 flex-shrink-0">
                                <div className="flex items-center justify-between px-4 py-2">
                                    <h3 className="text-sm font-semibold">Ordinance Details</h3>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            {isDraftMetadataOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>
                                    </CollapsibleTrigger>
                                </div>
                                <CollapsibleContent className="px-4 pb-4 space-y-4">
                                    {/* Metadata Inputs (Same as before) */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="draft-ordNo">Ordinance No.</Label>
                                            <Input 
                                                id="draft-ordNo"
                                                value={formData.ordinanceNumber} 
                                                onChange={e => setFormData({...formData, ordinanceNumber: e.target.value})} 
                                                placeholder="e.g., Ord-2024-001" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="draft-category">Category</Label>
                                            <Select 
                                                onValueChange={(val) => setFormData({...formData, category: val as any})} 
                                                value={formData.category}
                                            >
                                                <SelectTrigger id="draft-category"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="General">General</SelectItem>
                                                    <SelectItem value="Curfew">Curfew</SelectItem>
                                                    <SelectItem value="Noise">Noise Control</SelectItem>
                                                    <SelectItem value="Sanitation">Sanitation/Waste</SelectItem>
                                                    <SelectItem value="Traffic">Traffic/Parking</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="draft-title">Title</Label>
                                        <Input 
                                            id="draft-title"
                                            value={formData.title} 
                                            onChange={e => setFormData({...formData, title: e.target.value})} 
                                            placeholder="Title of the ordinance"
                                        />
                                    </div>
                                     {/* ... other fields could go here if space allows ... */}
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        <div className="flex-1 border rounded-md overflow-hidden bg-background shadow-sm">
                            {isPreviewMode ? (
                                <ScrollArea className="h-full p-8">
                                    <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto">
                                        {/* Render HTML safely? Assuming trusted content or sanitize in real app */}
                                        <div dangerouslySetInnerHTML={{ __html: draftContent }} />
                                    </div>
                                </ScrollArea>
                            ) : (
                                <OrdinanceEditor 
                                    onChange={(html) => setDraftContent(html)} 
                                    content={draftContent} 
                                    onEditorReady={setEditorInstance}
                                />
                            )}
                        </div>
                     </div>

                     {/* Right Column: Draft Tools (Only in Edit Mode) */}
                     {!isPreviewMode && (
                         <div className="w-80 flex-shrink-0 border-l pl-4 hidden xl:block">
                             <DraftTools editor={editorInstance} />
                         </div>
                     )}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Legislative & Ordinances</h1>
                    <p className="text-muted-foreground">Manage barangay ordinances, resolutions, and penalties.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                        setFormData(initialFormValues); 
                        setDraftContent('');
                        setCurrentOrdinanceId(null);
                        setIsDraftMode(true);
                    }}>
                        <FileText className="mr-2 h-4 w-4"/> Draft Ordinance
                    </Button>
                    <Button onClick={handleOpenAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4"/> Publish Ordinance
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/40 p-4 rounded-lg border">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by title or ordinance number..." 
                        className="pl-9 bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-background">
                            <SelectValue placeholder="Filter by Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Curfew">Curfew</SelectItem>
                            <SelectItem value="Noise">Noise Control</SelectItem>
                            <SelectItem value="Sanitation">Sanitation/Waste</SelectItem>
                            <SelectItem value="Traffic">Traffic/Parking</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="border-l pl-2 flex gap-1">
                        <Button 
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isLoading && <div className="text-center py-10 text-muted-foreground">Loading ordinances...</div>}
            
            {!isLoading && filteredOrdinances?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                    <Scale className="h-12 w-12 mb-4 opacity-20" />
                    <p className="font-medium">No ordinances found.</p>
                    <p className="text-sm">Try adjusting your filters or add a new one.</p>
                </div>
            )}

            {!isLoading && filteredOrdinances && filteredOrdinances.length > 0 && (
                viewMode === 'grid' ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-6">
                        {filteredOrdinances.map((ord: WithId<Ordinance> & { relatedViolation?: string }) => {
                            const docId = ord.id || ord.ordinanceId;
                            return (
                                <Card key={docId} className="flex flex-col hover:shadow-md transition-all group relative">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline" className="font-mono">{ord.ordinanceNumber}</Badge>
                                            <Badge variant={ord.status === 'Active' ? 'default' : (ord.status === 'Draft' ? 'outline' : 'secondary')} className={ord.status === 'Active' ? 'bg-green-600 hover:bg-green-700' : (ord.status === 'Draft' ? 'border-dashed border-foreground/50' : '')}>
                                                {ord.status}
                                            </Badge>
                                        </div>
                                        <CardTitle className="mt-2 text-lg leading-tight line-clamp-2" title={ord.title}>{ord.title}</CardTitle>
                                        <CardDescription>Enacted: {ord.dateEnacted ? format(new Date(ord.dateEnacted), 'MMM d, yyyy') : 'N/A'}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow text-sm text-muted-foreground">
                                        <p className="line-clamp-3 mb-4">{ord.description}</p>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 font-medium text-foreground bg-muted/50 p-2 rounded-md">
                                                <Gavel className="h-4 w-4 text-orange-600" />
                                                <span>Penalty: ₱ {ord.penaltyAmount?.toLocaleString() || '0'}</span>
                                            </div>
                                            {ord.relatedViolation && (
                                                <div className="text-xs bg-red-50 text-red-700 p-2 rounded border border-red-100">
                                                    <strong>Related Violation:</strong> {ord.relatedViolation}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="border-t pt-4 flex justify-between items-center gap-2">
                                        <div className="flex gap-2">
                                            <Badge variant="secondary" className="text-xs">{ord.category}</Badge>
                                        </div>
                                        <div className="flex gap-1">
                                            {ord.pdfUrl && (
                                                <Button variant="ghost" size="icon" asChild title="Download PDF">
                                                    <a href={ord.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(ord)} title="Edit">
                                                <PenLine className="h-4 w-4 text-blue-600" />
                                            </Button>
                                            <DeleteAction docId={docId} ordNo={ord.ordinanceNumber} onDelete={handleDelete} />
                                        </div>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ordinance No.</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Penalty</TableHead>
                                    <TableHead>Enacted</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrdinances.map((ord: WithId<Ordinance> & { relatedViolation?: string }) => {
                                    const docId = ord.id || ord.ordinanceId;
                                    return (
                                        <TableRow key={docId}>
                                            <TableCell className="font-mono font-medium">{ord.ordinanceNumber}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{ord.title}</div>
                                                {ord.relatedViolation && <div className="text-xs text-muted-foreground text-red-600">Re: {ord.relatedViolation}</div>}
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{ord.category}</Badge></TableCell>
                                            <TableCell>₱ {ord.penaltyAmount?.toLocaleString()}</TableCell>
                                            <TableCell>{ord.dateEnacted ? format(new Date(ord.dateEnacted), 'MMM d, yyyy') : '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={ord.status === 'Active' ? 'default' : (ord.status === 'Draft' ? 'outline' : 'secondary')} className={ord.status === 'Active' ? 'bg-green-600' : (ord.status === 'Draft' ? 'border-dashed' : '')}>
                                                    {ord.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {ord.pdfUrl && (
                                                        <Button variant="ghost" size="icon" asChild title="Download PDF">
                                                            <a href={ord.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(ord)} title="Edit">
                                                        <PenLine className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                    <DeleteAction docId={docId} ordNo={ord.ordinanceNumber} onDelete={handleDelete} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                )
            )}

            {/* Add/Edit Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{isEditMode ? 'Edit Ordinance' : 'Publish Ordinance'}</SheetTitle>
                        <SheetDescription>
                            {isEditMode ? 'Update the details of the existing ordinance.' : 'Fill in the details to publish a new barangay ordinance.'}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 py-6">
                        
                        {/* Pull Down Drafts */}
                        {!isEditMode && availableDrafts.length > 0 && (
                             <div className="space-y-2 p-3 bg-muted/50 border border-dashed rounded-md">
                                <Label className="text-muted-foreground flex items-center gap-2"><FileDown className="h-4 w-4"/> Load from Draft</Label>
                                <Select onValueChange={handleSelectDraft}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a draft to publish..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableDrafts.map((draft: WithId<Ordinance>) => {
                                            const draftId = draft.id || draft.ordinanceId;
                                            return (
                                                <SelectItem key={draftId} value={draftId}>
                                                    {draft.title} ({draft.ordinanceNumber})
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        
                        {/* Create Draft Option */}
                        {!isEditMode && (
                            <div className="text-center">
                                <Button variant="link" size="sm" onClick={() => { setIsSheetOpen(false); setFormData(initialFormValues); setIsDraftMode(true); }}>
                                    Need to write a draft first? Open Editor
                                </Button>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ordNo">Ordinance No. <span className="text-destructive">*</span></Label>
                                <Input 
                                    id="ordNo"
                                    value={formData.ordinanceNumber} 
                                    onChange={e => setFormData({...formData, ordinanceNumber: e.target.value})} 
                                    placeholder="e.g., Ord-2024-001" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select 
                                    onValueChange={(val) => setFormData({...formData, category: val as any})} 
                                    value={formData.category}
                                >
                                    <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Curfew">Curfew</SelectItem>
                                        <SelectItem value="Noise">Noise Control</SelectItem>
                                        <SelectItem value="Sanitation">Sanitation/Waste</SelectItem>
                                        <SelectItem value="Traffic">Traffic/Parking</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                            <Input 
                                id="title"
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})} 
                                placeholder="Title of the ordinance"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="desc">Description / Key Provisions</Label>
                            <Textarea 
                                id="desc"
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})} 
                                placeholder="Brief summary or full text..."
                                rows={5}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="penalty">Penalty Amount (₱)</Label>
                                <Input 
                                    id="penalty"
                                    type="number" 
                                    value={formData.penaltyAmount} 
                                    onChange={e => setFormData({...formData, penaltyAmount: parseFloat(e.target.value) || 0})} 
                                    min={0}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date">Date Enacted</Label>
                                <Input 
                                    id="date"
                                    type="date" 
                                    value={formData.dateEnacted} 
                                    onChange={e => setFormData({...formData, dateEnacted: e.target.value})} 
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="relatedViolation">Related Blotter Violation (Optional)</Label>
                            <Select 
                                onValueChange={(val) => setFormData({...formData, relatedViolation: val === 'none' ? '' : val})} 
                                value={formData.relatedViolation || 'none'}
                            >
                                <SelectTrigger id="relatedViolation"><SelectValue placeholder="Select related violation..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- None --</SelectItem>
                                    {Object.entries(caseTypes).map(([group, types]) => (
                                        <SelectGroup key={group}>
                                            <SelectLabel className="capitalize">{group}</SelectLabel>
                                            {types.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Link this ordinance to specific case types for auto-suggestions in blotter.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pdf">PDF Link (Optional)</Label>
                            <Input 
                                id="pdf"
                                value={formData.pdfUrl} 
                                onChange={e => setFormData({...formData, pdfUrl: e.target.value})} 
                                placeholder="https://example.com/document.pdf" 
                            />
                        </div>
                    </div>
                    <SheetFooter>
                        <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{isEditMode ? 'Update' : 'Publish'}</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}

function DeleteAction({ docId, ordNo, onDelete }: { docId: string, ordNo: string, onDelete: (id: string) => void }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/10" title="Delete">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Ordinance?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently remove <strong>{ordNo}</strong> from the records.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(docId)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default withRoleGuard(LegislativePage, [PERMISSIONS.VIEW_LEGISLATIVE]);
