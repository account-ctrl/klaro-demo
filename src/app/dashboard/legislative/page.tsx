
'use client';

import { useState } from 'react';
import { useOrdinances, useLegislativeRef } from '@/hooks/use-legislative';
import { addDocumentNonBlocking } from '@/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Scale, Plus, FileText, Download, Gavel } from 'lucide-react';
import { format } from 'date-fns';

export default function LegislativePage() {
    const { data: ordinances, isLoading } = useOrdinances();
    const ordinancesRef = useLegislativeRef('ordinances');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newOrdinance, setNewOrdinance] = useState({
        ordinanceNumber: '',
        title: '',
        description: '',
        category: 'General',
        penaltyAmount: '',
        pdfUrl: '',
        dateEnacted: ''
    });

    const handleCreateOrdinance = () => {
        if (!ordinancesRef) return;
        
        addDocumentNonBlocking(ordinancesRef, {
            ordinanceNumber: newOrdinance.ordinanceNumber,
            title: newOrdinance.title,
            description: newOrdinance.description,
            category: newOrdinance.category,
            penaltyAmount: parseFloat(newOrdinance.penaltyAmount),
            pdfUrl: newOrdinance.pdfUrl,
            dateEnacted: newOrdinance.dateEnacted,
            status: 'Active',
            createdAt: serverTimestamp()
        });
        
        setIsAddOpen(false);
        setNewOrdinance({
            ordinanceNumber: '',
            title: '',
            description: '',
            category: 'General',
            penaltyAmount: '',
            pdfUrl: '',
            dateEnacted: ''
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Legislative & Ordinances</h1>
                    <p className="text-muted-foreground">Manage barangay ordinances, resolutions, and penalties.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4"/> New Ordinance</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>Add New Ordinance</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Ordinance No.</Label><Input value={newOrdinance.ordinanceNumber} onChange={e => setNewOrdinance({...newOrdinance, ordinanceNumber: e.target.value})} placeholder="Ord-2024-001" /></div>
                                <div className="space-y-2"><Label>Category</Label>
                                    <Select onValueChange={(val) => setNewOrdinance({...newOrdinance, category: val})} defaultValue="General">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                            <div className="space-y-2"><Label>Title</Label><Input value={newOrdinance.title} onChange={e => setNewOrdinance({...newOrdinance, title: e.target.value})} /></div>
                            <div className="space-y-2"><Label>Description/Key Provisions</Label><Textarea value={newOrdinance.description} onChange={e => setNewOrdinance({...newOrdinance, description: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Penalty Amount (₱)</Label><Input type="number" value={newOrdinance.penaltyAmount} onChange={e => setNewOrdinance({...newOrdinance, penaltyAmount: e.target.value})} /></div>
                                <div className="space-y-2"><Label>Date Enacted</Label><Input type="date" value={newOrdinance.dateEnacted} onChange={e => setNewOrdinance({...newOrdinance, dateEnacted: e.target.value})} /></div>
                            </div>
                            <div className="space-y-2"><Label>PDF Link (Optional)</Label><Input value={newOrdinance.pdfUrl} onChange={e => setNewOrdinance({...newOrdinance, pdfUrl: e.target.value})} placeholder="https://..." /></div>
                        </div>
                        <DialogFooter><Button onClick={handleCreateOrdinance}>Save Ordinance</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading && <div className="col-span-full text-center py-10">Loading ordinances...</div>}
                {!isLoading && ordinances?.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <Scale className="h-12 w-12 mb-4 opacity-20" />
                        <p>No ordinances found.</p>
                        <Button variant="link" onClick={() => setIsAddOpen(true)}>Add your first ordinance</Button>
                    </div>
                )}
                {ordinances?.map(ord => (
                    <Card key={ord.ordinanceId} className="flex flex-col hover:shadow-md transition-all">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline">{ord.ordinanceNumber}</Badge>
                                <Badge variant={ord.status === 'Active' ? 'default' : 'secondary'}>{ord.status}</Badge>
                            </div>
                            <CardTitle className="mt-2 text-lg leading-tight">{ord.title}</CardTitle>
                            <CardDescription>Enacted: {ord.dateEnacted}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow text-sm text-muted-foreground">
                            <p className="line-clamp-3">{ord.description}</p>
                            <div className="mt-4 flex items-center gap-2 font-medium text-foreground">
                                <Gavel className="h-4 w-4" />
                                Penalty: ₱ {ord.penaltyAmount?.toLocaleString()}
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4 flex justify-between">
                            <Badge variant="secondary">{ord.category}</Badge>
                            {ord.pdfUrl && (
                                <Button variant="ghost" size="sm" asChild>
                                    <a href={ord.pdfUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" /> Download PDF
                                    </a>
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
