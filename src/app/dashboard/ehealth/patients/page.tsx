
'use client';

import { useState, useMemo } from 'react';
import { useResidents } from '@/hooks/use-barangay-data';
import { useHealthProfiles, useDispensingLogs, useEHealthRef } from '@/hooks/use-ehealth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, History, Activity, Edit2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export default function PatientRecordsPage() {
    const { data: residents } = useResidents();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);

    const filteredResidents = useMemo(() => {
        if (!residents) return [];
        return residents.filter(r => 
            r.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            r.lastName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [residents, searchTerm]);

    const selectedResident = useMemo(() => residents?.find(r => r.residentId === selectedResidentId), [residents, selectedResidentId]);

    return (
        <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Patient Health Records</h1>
                <p className="text-muted-foreground">View medical history and health profiles.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow min-h-0">
                {/* List Panel */}
                <Card className="flex flex-col h-full">
                    <CardHeader className="pb-3">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search patients..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto p-0">
                        {filteredResidents.map(r => (
                            <div 
                                key={r.residentId}
                                className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${selectedResidentId === r.residentId ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                onClick={() => setSelectedResidentId(r.residentId)}
                            >
                                <p className="font-semibold">{r.firstName} {r.lastName}</p>
                                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                    <Badge variant="outline">{r.gender}</Badge>
                                    <span>{r.dateOfBirth}</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Detail Panel */}
                <Card className="md:col-span-2 h-full flex flex-col">
                    {selectedResident ? (
                        <PatientDetailView resident={selectedResident} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            Select a patient to view records.
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function PatientDetailView({ resident }: { resident: any }) {
    const { data: profiles } = useHealthProfiles();
    const { data: logs } = useDispensingLogs();
    const firestore = useFirestore();
    const profilesRef = useEHealthRef('ehealth_profiles');

    const profile = useMemo(() => profiles?.find(p => p.residentId === resident.residentId), [profiles, resident]);
    const patientLogs = useMemo(() => logs?.filter(l => l.residentId === resident.residentId), [logs, resident]);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ allergies: '', conditions: '', notes: '', bloodType: '' });

    const handleEdit = () => {
        setEditForm({
            allergies: profile?.allergies.join(', ') || '',
            conditions: profile?.conditions.join(', ') || '',
            notes: profile?.notes || '',
            bloodType: profile?.bloodType || ''
        });
        setIsEditing(true);
    }

    const handleSave = () => {
        if (!firestore || !profilesRef) return;
        
        const data = {
            residentId: resident.residentId,
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
            <CardHeader className="border-b bg-muted/20">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">{resident.firstName} {resident.lastName}</CardTitle>
                        <p className="text-sm text-muted-foreground">ID: {resident.residentId}</p>
                    </div>
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={handleEdit}><Edit2 className="h-4 w-4 mr-2"/> Update Profile</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Update Health Profile</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label>Blood Type</Label><Input value={editForm.bloodType} onChange={e => setEditForm({...editForm, bloodType: e.target.value})} placeholder="e.g. O+" /></div>
                                <div className="space-y-2"><Label>Allergies (comma separated)</Label><Textarea value={editForm.allergies} onChange={e => setEditForm({...editForm, allergies: e.target.value})} /></div>
                                <div className="space-y-2"><Label>Conditions (comma separated)</Label><Textarea value={editForm.conditions} onChange={e => setEditForm({...editForm, conditions: e.target.value})} /></div>
                                <div className="space-y-2"><Label>Clinical Notes</Label><Textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} /></div>
                            </div>
                            <Button onClick={handleSave}>Save Changes</Button>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-grow overflow-hidden">
                <Tabs defaultValue="history" className="h-full flex flex-col">
                    <div className="px-6 pt-4">
                        <TabsList>
                            <TabsTrigger value="history">Dispensing History</TabsTrigger>
                            <TabsTrigger value="profile">Clinical Profile</TabsTrigger>
                        </TabsList>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto p-6">
                        <TabsContent value="history" className="mt-0">
                            {patientLogs && patientLogs.length > 0 ? (
                                <div className="space-y-4">
                                    {patientLogs.map(log => (
                                        <div key={log.logId} className="flex items-start justify-between border-b pb-4 last:border-0">
                                            <div>
                                                <p className="font-semibold text-primary">{log.itemName}</p>
                                                <p className="text-sm text-muted-foreground">Batch #{log.batchNumber} • Qty: {log.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">{log.dateDispensed ? formatDistanceToNow(log.dateDispensed.toDate(), { addSuffix: true }) : ''}</p>
                                                <p className="text-xs text-muted-foreground">by {log.dispensedByUserName}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-10">No dispensing history found.</div>
                            )}
                        </TabsContent>
                        
                        <TabsContent value="profile" className="mt-0 space-y-6">
                            {profile ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 border rounded bg-red-50 dark:bg-red-900/10">
                                            <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4"/> Allergies</h4>
                                            {profile.allergies.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {profile.allergies.map(a => <Badge key={a} variant="destructive">{a}</Badge>)}
                                                </div>
                                            ) : <span className="text-sm text-muted-foreground">None recorded</span>}
                                        </div>
                                        <div className="p-4 border rounded bg-blue-50 dark:bg-blue-900/10">
                                            <h4 className="font-semibold text-blue-700 flex items-center gap-2 mb-2"><Activity className="h-4 w-4"/> Conditions</h4>
                                            {profile.conditions.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {profile.conditions.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
                                                </div>
                                            ) : <span className="text-sm text-muted-foreground">None recorded</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4"/> Clinical Notes</h4>
                                        <p className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted p-4 rounded-md">
                                            {profile.notes || "No notes available."}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-muted-foreground mb-4">No health profile created yet.</p>
                                    <Button variant="outline" onClick={handleEdit}>Create Profile</Button>
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>
        </>
    )
}

function AlertTriangle(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    )
  }
