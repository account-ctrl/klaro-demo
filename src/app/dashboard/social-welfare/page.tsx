
'use client';

import { useState } from 'react';
import { useAidPrograms, useSocialWelfareRef } from '@/hooks/use-social-welfare';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HandHeart, Plus, Calendar as CalendarIcon, Users, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function SocialWelfarePage() {
    const { data: programs, isLoading } = useAidPrograms();
    const programsRef = useSocialWelfareRef('aid_programs');
    const { toast } = useToast();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newProgram, setNewProgram] = useState({
        title: '',
        type: 'Cash',
        budgetAllocated: '',
        startDate: '',
        endDate: '',
        eligibilityCriteria: ''
    });

    const handleCreateProgram = async () => {
        if (!programsRef) {
            console.error("Programs reference is null!");
            return;
        }

        console.log("Attempting to write to:", programsRef.path);

        // Validation
        if (!newProgram.title || !newProgram.budgetAllocated || !newProgram.startDate || !newProgram.endDate) {
            toast({ variant: "destructive", title: "Missing Fields", description: "Please fill in all required fields." });
            return;
        }

        const budget = parseFloat(newProgram.budgetAllocated);
        if (isNaN(budget)) {
             toast({ variant: "destructive", title: "Invalid Budget", description: "Budget must be a number." });
             return;
        }
        
        const start = new Date(newProgram.startDate);
        const end = new Date(newProgram.endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
             toast({ variant: "destructive", title: "Invalid Date", description: "Please provide valid start and end dates." });
             return;
        }
        
        try {
            const docRef = await addDocumentNonBlocking(programsRef, {
                title: newProgram.title,
                type: newProgram.type,
                budgetAllocated: budget,
                startDate: Timestamp.fromDate(start),
                endDate: Timestamp.fromDate(end),
                eligibilityCriteria: newProgram.eligibilityCriteria.split(',').map(s => s.trim()).filter(s => s !== ''),
                status: 'Active',
                createdAt: serverTimestamp()
            });
            
            if (docRef) {
                updateDocumentNonBlocking(docRef, { programId: docRef.id });
                toast({ title: "Program Created", description: "New aid program has been added." });
                setIsAddOpen(false);
                setNewProgram({ title: '', type: 'Cash', budgetAllocated: '', startDate: '', endDate: '', eligibilityCriteria: '' });
            }
        } catch (error) {
             console.error("Failed to create program:", error);
             toast({ variant: "destructive", title: "Error", description: "Failed to create program. Please try again." });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Social Welfare & Development</h1>
                    <p className="text-muted-foreground">Manage aid programs, relief operations, and beneficiary claims.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4"/> New Aid Program</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create Aid Program</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2"><Label>Program Title</Label><Input value={newProgram.title} onChange={e => setNewProgram({...newProgram, title: e.target.value})} placeholder="e.g. Typhoon Relief 2024" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Type</Label>
                                    <Select onValueChange={(val) => setNewProgram({...newProgram, type: val})} defaultValue="Cash">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cash">Cash Assistance</SelectItem>
                                            <SelectItem value="Goods">Relief Goods</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Budget / Value</Label><Input type="number" value={newProgram.budgetAllocated} onChange={e => setNewProgram({...newProgram, budgetAllocated: e.target.value})} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={newProgram.startDate} onChange={e => setNewProgram({...newProgram, startDate: e.target.value})} /></div>
                                <div className="space-y-2"><Label>End Date</Label><Input type="date" value={newProgram.endDate} onChange={e => setNewProgram({...newProgram, endDate: e.target.value})} /></div>
                            </div>
                            <div className="space-y-2"><Label>Criteria (comma separated tags)</Label><Input value={newProgram.eligibilityCriteria} onChange={e => setNewProgram({...newProgram, eligibilityCriteria: e.target.value})} placeholder="PWD, Senior, Indigent" /></div>
                        </div>
                        <DialogFooter><Button onClick={handleCreateProgram}>Create Program</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading && <div className="col-span-full text-center py-10">Loading programs...</div>}
                {!isLoading && programs?.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <HandHeart className="h-12 w-12 mb-4 opacity-20" />
                        <p>No active aid programs found.</p>
                        <Button variant="link" onClick={() => setIsAddOpen(true)}>Create your first program</Button>
                    </div>
                )}
                {programs?.map(program => (
                    <Card key={program.programId} className="flex flex-col hover:shadow-md transition-all">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <Badge variant={program.status === 'Active' ? 'default' : 'secondary'}>{program.status}</Badge>
                                <Badge variant="outline">{program.type}</Badge>
                            </div>
                            <CardTitle className="mt-2">{program.title}</CardTitle>
                            <CardDescription className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" /> 
                                {program.startDate ? format(program.startDate.toDate(), 'MMM d, yyyy') : 'TBD'} - {program.endDate ? format(program.endDate.toDate(), 'MMM d, yyyy') : 'TBD'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="text-sm font-medium mb-2">Budget Allocation</div>
                            <div className="text-2xl font-bold text-primary">₱ {program.budgetAllocated.toLocaleString()}</div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {program.eligibilityCriteria?.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4">
                            <Button className="w-full" variant="outline">Manage Claims</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
