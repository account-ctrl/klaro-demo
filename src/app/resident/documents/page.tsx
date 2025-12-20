'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useFirestore, useStorage } from '@/firebase';
import { collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download, Lock, Search, FolderOpen, AlertCircle } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Type definition
interface ResidentDocument {
    id: string;
    name: string;
    type: string; // 'barangay-clearance', 'indigency', etc.
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any; // Firestore Timestamp
    path: string; // Storage path
    downloadUrl?: string; // We'll fetch this dynamically
}

export default function MyDocumentsPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();

    const [documents, setDocuments] = useState<ResidentDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userKycStatus, setUserKycStatus] = useState<string>('unknown');

    useEffect(() => {
        if (!auth?.currentUser || !firestore) return;

        const fetchDocuments = async () => {
            setIsLoading(true);
            try {
                const user = auth.currentUser;
                if (!user) return;

                // 1. Check KYC Status first
                // Assuming we have this in custom claims or user profile. 
                // For now, let's fetch user profile to be sure
                // (In a real app, use a context or hook for user profile)
                 const userDoc = await getDoc(doc(firestore, 'users', user.uid));
                 const userData = userDoc.data();
                 setUserKycStatus(userData?.kycStatus || 'unverified');

                // 2. Fetch Documents
                // Query: tenants/{tenantId}/users/{userId}/documents 
                // BUT wait, our security rules rely on `tenants/{province}/{city}/{barangay}/users/{userId}/documents`
                // AND we also have a rule: match /users/{userId}/documents/{documentId}
                // Let's stick to the user-centric subcollection for the Resident View: `users/{userId}/documents`
                // This simplifies the query for the resident (they don't need to know their tenant path to list their own docs)
                
                // However, our REQUIREMENT #4 said:
                // "A resident can ONLY see files stored in tenants/{their_tenant_id}/users/{their_uid}/documents"
                
                // So we need to know the Tenant ID first.
                // Let's assume we store tenant path in user profile or use the user-centric path if we mirrored it.
                // IF we follow strict isolation, we must query the Tenant Path.
                
                // Strategy: Query the user profile first to get the `tenantId` (which we saved as province-city-barangay slug or path)
                // Then construct the path.
                
                // SIMPLIFICATION for this specific component:
                // Since `users/{userId}/documents` is also secured by `isOwner(userId)`, 
                // we can just query that if we duplicate/link references there.
                
                // BUT, to strictly follow the "Tenant Isolation" requirement where files physically live in the tenant folder:
                // We likely need to know the tenant params.
                // Let's try to list from `users/{userId}/documents` assuming we are using that as the main reference point for the user interface,
                // while the actual storage backing is in the tenant bucket path.
                
                const docsRef = collection(firestore, `users/${user.uid}/documents`);
                const q = query(docsRef, orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);

                const docsData: ResidentDocument[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as ResidentDocument));

                setDocuments(docsData);

            } catch (error) {
                console.error("Error fetching docs:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load documents." });
            } finally {
                setIsLoading(false);
            }
        };

        fetchDocuments();
    }, [auth, firestore, toast]);

    const handleDownload = async (docPath: string, docName: string) => {
        if (!storage) return;
        try {
            // The docPath stored in Firestore should be the full storage path
            // e.g., tenants/p/c/b/users/uid/documents/file.pdf
            const fileRef = ref(storage, docPath);
            const url = await getDownloadURL(fileRef);
            window.open(url, '_blank');
        } catch (error) {
            console.error("Download error:", error);
            toast({ variant: "destructive", title: "Download Failed", description: "File not found or access denied." });
        }
    };

    const filteredDocs = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        doc.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">My Documents</h1>
                    <p className="text-white/50">Access your issued certificates and uploaded files.</p>
                </div>
                {/* Request Button - Disable if KYC pending */}
                {/* We'll handle this logic in the parent or verify here */}
            </div>

            <Card className="bg-black/40 border-white/10 backdrop-blur-md">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-orange-500" />
                            File Repository
                        </CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-white/30" />
                            <Input 
                                placeholder="Search documents..." 
                                className="pl-8 bg-white/5 border-white/10 text-white h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 text-white/30">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p>Loading secure files...</p>
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-white/30 border-2 border-dashed border-white/5 rounded-lg">
                            <FileText className="w-10 h-10 mb-2 opacity-50" />
                            <p>No documents found.</p>
                            <p className="text-xs mt-1">Request a document from the dashboard.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredDocs.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded bg-blue-500/20 text-blue-400">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white text-sm">{doc.name}</div>
                                            <div className="flex items-center gap-2 text-xs text-white/40">
                                                <span>{format(doc.createdAt?.toDate() || new Date(), 'MMM d, yyyy')}</span>
                                                <span>•</span>
                                                <span className="capitalize">{doc.type.replace('-', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {doc.status === 'pending' && <Badge variant="outline" className="text-yellow-500 border-yellow-500/20">Processing</Badge>}
                                        {doc.status === 'rejected' && <Badge variant="destructive" className="bg-red-900/20 text-red-400 border-0">Rejected</Badge>}
                                        {doc.status === 'approved' && <Badge variant="default" className="bg-green-900/20 text-green-400 hover:bg-green-900/30 border-0">Issued</Badge>}
                                        
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="text-white/30 hover:text-white"
                                            onClick={() => handleDownload(doc.path, doc.name)}
                                            disabled={doc.status !== 'approved'} // Only allow download if issued
                                        >
                                            {doc.status === 'approved' ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
