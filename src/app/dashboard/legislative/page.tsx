
'use client';

import { useState } from 'react';
import { useOrdinances, useLegislativeRef, BARANGAY_ID } from '@/hooks/use-legislative';
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
import { Scale, Plus, FileText, Download, Gavel, Trash2, PenLine, Search, Filter, List, LayoutGrid } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Ordinance, WithId } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { caseTypes } from '../blotter/case-types';

type OrdinanceFormValues = Omit<Ordinance, 'ordinanceId' | 'createdAt' | 'status'> & {
    relatedViolation?: string;
};

const initialFormValues: OrdinanceFormValues = {
    ordinanceNumber: '',
    title: '',
    description: '',
    category: 'General',
    penaltyAmount: 0,
    pdfUrl: '',
    dateEnacted: '',
    relatedViolation: ''
};

export default function LegislativePage() {
    const firestore = useFirestore();
    const { data: ordinances, isLoading } = useOrdinances();
    const ordinancesRef = useLegislativeRef('ordinances');
    const { toast } = useToast();
    
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentOrdinanceId, setCurrentOrdinanceId] = useState<string | null>(null);
    const [formData, setFormData] = useState<OrdinanceFormValues>(initialFormValues);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const handleOpenAdd = () => {
        setFormData(initialFormValues);
        setIsEditMode(false);
        setCurrentOrdinanceId(null);
        setIsSheetOpen(true);
    };

    const handleOpenEdit = (ordinance: WithId<Ordinance> & { relatedViolation?: string }) => {
        const id = ordinance.ordinanceId || ordinance.id;
        
        setFormData({
            ordinanceNumber: ordinance.ordinanceNumber,
            title: ordinance.title,
            description: ordinance.description,
            category: ordinance.category,
            penaltyAmount: ordinance.penaltyAmount,
            pdfUrl: ordinance.pdfUrl || '',
            dateEnacted: ordinance.dateEnacted,
            relatedViolation: ordinance.relatedViolation || ''
        });
        setCurrentOrdinanceId(id);
        setIsEditMode(true);
        setIsSheetOpen(true);
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
        };

        if (isEditMode && currentOrdinanceId && firestore) {
            // Edit Mode
            const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/ordinances/${currentOrdinanceId}`);
            setDocumentNonBlocking(docRef, dataToSave, { merge: true });
            
            toast({
                title: "Ordinance Updated",
                description: "The ordinance has been successfully updated."
            });
        } else if (ordinancesRef) {
            // Create Mode
            addDocumentNonBlocking(ordinancesRef, {
                ...dataToSave,
                status: 'Active',
                createdAt: serverTimestamp()
            });

            toast({
                title: "Ordinance Created",
                description: "New ordinance has been added to the records."
            });
        }

        setIsSheetOpen(false);
    };

    const handleDelete = (id: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, `/barangays/${BARANGAY_ID}/ordinances/${id}`);
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Legislative & Ordinances</h1>
                    <p className="text-muted-foreground">Manage barangay ordinances, resolutions, and penalties.</p>
                </div>
                <Button onClick={handleOpenAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4"/> New Ordinance
                </Button>
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
                                            <Badge variant={ord.status === 'Active' ? 'default' : 'secondary'} className={ord.status === 'Active' ? 'bg-green-600 hover:bg-green-700' : ''}>
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
                                                <Badge variant={ord.status === 'Active' ? 'default' : 'secondary'} className={ord.status === 'Active' ? 'bg-green-600' : ''}>
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
                        <SheetTitle>{isEditMode ? 'Edit Ordinance' : 'Add New Ordinance'}</SheetTitle>
                        <SheetDescription>
                            {isEditMode ? 'Update the details of the existing ordinance.' : 'Fill in the details to create a new barangay ordinance.'}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 py-6">
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
                        <Button onClick={handleSubmit}>{isEditMode ? 'Update' : 'Create'}</Button>
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
