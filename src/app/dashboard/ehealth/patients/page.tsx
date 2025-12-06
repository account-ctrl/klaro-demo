
'use client';

import { useState, useMemo } from 'react';
import { useResidents } from '@/hooks/use-barangay-data';
import { useHealthProfiles, useDispensingLogs, useEHealthRef } from '@/hooks/use-ehealth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, History, Activity, Edit2, User, HeartPulse, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Separator } from '@/components/ui/separator';
import { WithId } from '@/firebase/firestore/use-collection';
import { Resident } from '@/lib/types';

export default function PatientRecordsPage() {
    const { data: residents } = useResidents();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);

    const filteredResidents = useMemo(() => {
        if (!residents) return [];
        return residents.filter(r => 
            r.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            r.lastName.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 15);
    }, [residents, searchTerm]);

    // Use r.id for robust selection
    const selectedResident = useMemo(() => residents?.find(r => r.id === selectedResidentId), [residents, selectedResidentId]);

    return (
        <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Patient Health Records</h1>
                <p className="text-muted-foreground">View medical history and health profiles.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
                {/* List Panel */}
                <Card className="flex flex-col h-full border-r-0 lg:border-r">
                    <CardHeader className="pb-3 border-b bg-muted/10">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search patients..." className="pl-8 bg-background" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto p-0">
                        {filteredResidents.map(r => (
                            <div 
                                key={r.id} // Use .id from useCollection
                                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors flex justify-between items-center ${selectedResidentId === r.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                onClick={() => setSelectedResidentId(r.id)} // Use .id
                            >
                                <div>
                                    <p className="font-semibold text-sm">{r.firstName} {r.lastName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {r.gender} • {new Date().getFullYear() - new Date(r.dateOfBirth).getFullYear()} y/o
                                    </p>
                                </div>
                                <User className="h-4 w-4 text-muted-foreground opacity-50" />
                            </div>
                        ))}
                        {filteredResidents.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No patients found.</div>}
                    </CardContent>
                </Card>

                {/* Detail Panel */}
                <Card className="lg:col-span-2 h-full flex flex-col shadow-none border-0 lg:border">
                    {selectedResident ? (
                        <PatientDetailView resident={selectedResident} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                            <div className="p-6 bg-muted/20 rounded-full">
                                <Activity className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <p>Select a patient from the list to view their records.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function PatientDetailView({ resident }: { resident: WithId<Resident> }) {
    const { data: profiles } = useHealthProfiles();
    const { data: logs } = useDispensingLogs();
    const firestore = useFirestore();
    const profilesRef = useEHealthRef('ehealth_profiles');

    // Match profile using resident.id
    const profile = useMemo(() => profiles?.find(p => p.residentId === resident.id), [profiles, resident]);
    
    // Match logs using resident.id
    const patientLogs = useMemo(() => logs?.filter(l => l.residentId === resident.id).sort((a,b) => b.dateDispensed?.toMillis() - a.dateDispensed?.toMillis()), [logs, resident]);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ allergies: '', conditions: '', notes: '', bloodType: '' });

    const handleEdit = () => {
        setEditForm({
            allergies: profile?.allergies?.join(', ') || '',
            conditions: profile?.conditions?.join(', ') || '',
            notes: profile?.notes || '',
            bloodType: profile?.bloodType || ''
        });
        setIsEditing(true);
    }

    const handleSave = () => {
        if (!firestore || !profilesRef) return;
        
        const data = {
            residentId: resident.id, // Use resident.id
            allergies: editForm.allergies.split(',').map(s => s.trim()).filter(Boolean),
            conditions: editForm.conditions.split(',').map(s => s.trim()).filter(Boolean),
            notes: editForm.notes,
            bloodType: editForm.bloodType,
            updatedAt: serverTimestamp()
        };

        if (profile) {
             const docRef = doc(firestore, profilesRef.path, profile.profileId);
             updateDocumentNonBlocking(docRef, data);
        } else {
             addDocumentNonBlocking(profilesRef, data);
        }
        setIsEditing(false);
    }

    return (
        <>
            <CardHeader className="border-b bg-muted/10 pb-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-2 border-background shadow-sm">
                            {resident.firstName.charAt(0)}
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-2xl">{resident.firstName} {resident.lastName}</CardTitle>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Badge variant="outline">{resident.gender}</Badge>
                                <span>{resident.dateOfBirth} ({new Date().getFullYear() - new Date(resident.dateOfBirth).getFullYear()} yrs)</span>
                                {profile?.bloodType && <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">{profile.bloodType}</Badge>}
                            </div>
                        </div>
                    </div>
                    
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={handleEdit} className="gap-2">
                                <Edit2 className="h-4 w-4"/> {profile ? 'Edit Profile' : 'Create Profile'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Clinical Profile</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Blood Type</Label>
                                    <Input value={editForm.bloodType} onChange={e => setEditForm({...editForm, bloodType: e.target.value})} placeholder="e.g. O+, A-" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Allergies</Label>
                                    <Textarea 
                                        value={editForm.allergies} 
                                        onChange={e => setEditForm({...editForm, allergies: e.target.value})} 
                                        placeholder="Comma separated (e.g. Penicillin, Peanuts)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Medical Conditions</Label>
                                    <Textarea 
                                        value={editForm.conditions} 
                                        onChange={e => setEditForm({...editForm, conditions: e.target.value})} 
                                        placeholder="Comma separated (e.g. Hypertension, Diabetes)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Clinical Notes</Label>
                                    <Textarea 
                                        value={editForm.notes} 
                                        onChange={e => setEditForm({...editForm, notes: e.target.value})} 
                                        placeholder="General health notes..."
                                        className="h-24"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleSave}>Save Profile</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <div className="flex-grow overflow-hidden flex flex-col">
                <Tabs defaultValue="profile" className="h-full flex flex-col">
                    <div className="px-6 pt-2 border-b">
                        <TabsList className="bg-transparent p-0 h-auto">
                            <TabsTrigger 
                                value="profile" 
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                            >
                                Health Profile
                            </TabsTrigger>
                            <TabsTrigger 
                                value="history" 
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                            >
                                Dispensing History
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50">
                        <TabsContent value="profile" className="mt-0 space-y-6">
                            {profile ? (
                                <div className="grid gap-6">
                                    {/* Alerts Section */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <Card className="border-l-4 border-l-red-500 shadow-sm">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                                                    <AlertTriangle className="h-4 w-4"/> Allergies
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {profile.allergies && profile.allergies.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {profile.allergies.map((a: string) => <Badge key={a} variant="destructive" className="font-normal">{a}</Badge>)}
                                                    </div>
                                                ) : <span className="text-sm text-muted-foreground italic">No known allergies.</span>}
                                            </CardContent>
                                        </Card>

                                        <Card className="border-l-4 border-l-blue-500 shadow-sm">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700">
                                                    <HeartPulse className="h-4 w-4"/> Conditions
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {profile.conditions && profile.conditions.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {profile.conditions.map((c: string) => <Badge key={c} variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">{c}</Badge>)}
                                                    </div>
                                                ) : <span className="text-sm text-muted-foreground italic">No chronic conditions recorded.</span>}
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Notes Section */}
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground"/> Clinical Notes
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm whitespace-pre-wrap text-slate-600 leading-relaxed">
                                                {profile.notes || "No additional notes available."}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                                    <h3 className="font-medium text-slate-900">No Health Profile</h3>
                                    <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                                        Create a profile to track allergies, conditions, and blood type.
                                    </p>
                                    <Button variant="outline" onClick={handleEdit}>Create Profile</Button>
                                </div>
                            )}
                        </TabsContent>
                        
                        <TabsContent value="history" className="mt-0">
                            {patientLogs && patientLogs.length > 0 ? (
                                <div className="space-y-6">
                                    {patientLogs.map((log, i) => (
                                        <div key={log.logId} className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0 last:border-0">
                                            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 bg-white p-4 rounded-lg border shadow-sm">
                                                <div>
                                                    <p className="font-bold text-slate-900">{log.itemName}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="font-mono text-xs">Batch #{log.batchNumber}</Badge>
                                                        <span className="text-sm text-muted-foreground">Qty: <strong>{log.quantity}</strong></span>
                                                    </div>
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <div className="flex items-center justify-end gap-1 mb-1">
                                                        <Clock className="h-3 w-3" />
                                                        {log.dateDispensed ? formatDistanceToNow(log.dateDispensed.toDate(), { addSuffix: true }) : 'Unknown date'}
                                                    </div>
                                                    <p>Dispensed by {log.dispensedByUserName}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                                    <History className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                                    <p className="text-muted-foreground">No dispensing history found for this patient.</p>
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </>
    )
}
