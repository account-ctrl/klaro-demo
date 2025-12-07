'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, limit, getDoc, orderBy, updateDoc } from 'firebase/firestore'; // Import updateDoc
import { getTenantPath } from '@/lib/firebase/db-client';
import {
  ArrowLeft,
  Users,
  MapPin,
  ShieldCheck,
  Activity,
  Server,
  AlertTriangle,
  FileText,
  Settings,
  MoreVertical,
  Calendar,
  Pencil,
  Save,
  X,
  UserPlus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

export default function TenantOversightPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const tenantId = params?.tenantId as string;

    const [path, setPath] = React.useState<string | null>(null);
    const [isLoadingPath, setIsLoadingPath] = React.useState(true);
    const [isEditing, setIsEditing] = React.useState(false); // Edit Mode State
    
    // Editable Fields State
    const [editForm, setEditForm] = React.useState({
        barangayName: '',
        city: '',
        province: '',
        region: '', // Added Region
        captainName: '',
        captainEmail: ''
    });

    React.useEffect(() => {
        async function resolve() {
            if (!firestore || !tenantId) return;
            const p = await getTenantPath(firestore, tenantId);
            setPath(p);
            setIsLoadingPath(false);
        }
        resolve();
    }, [firestore, tenantId]);

    const vaultRef = useMemoFirebase(() => {
        if (!firestore || !path) return null;
        return doc(firestore, path);
    }, [firestore, path]);
    
    const settingsRef = useMemoFirebase(() => {
        if (!firestore || !path) return null;
        return doc(firestore, `${path}/settings/general`);
    }, [firestore, path]);

    const { data: vaultData, isLoading: isVaultLoading } = useDoc(vaultRef);
    const { data: settingsData } = useDoc(settingsRef);

    // Initialize form when data loads
    React.useEffect(() => {
        if (settingsData) {
            setEditForm({
                barangayName: settingsData.barangayName || '',
                city: settingsData.location?.city || '',
                province: settingsData.location?.province || '',
                region: settingsData.location?.region || settingsData.region || '', // Load region
                captainName: settingsData.captainProfile?.name || '',
                captainEmail: settingsData.captainProfile?.email || ''
            });
        }
    }, [settingsData]);

    const residentsQuery = useMemoFirebase(() => {
        if (!firestore || !path) return null;
        return query(collection(firestore, `${path}/residents`), orderBy('createdAt', 'desc'), limit(5));
    }, [firestore, path]);

    const { data: recentResidents } = useCollection(residentsQuery);

    // Handle Save Changes
    const handleSaveChanges = async () => {
        if (!settingsRef || !vaultRef) return;
        
        try {
            // Update Settings Doc
            await updateDoc(settingsRef, {
                barangayName: editForm.barangayName,
                'location.city': editForm.city,
                'location.province': editForm.province,
                'location.region': editForm.region, // Save Region
                'captainProfile.name': editForm.captainName,
                'captainProfile.email': editForm.captainEmail
            });

            // Update Root Vault Meta (for consistency)
            await updateDoc(vaultRef, {
                name: editForm.barangayName,
                city: editForm.city,
                province: editForm.province,
                region: editForm.region, // Save Region
                'location.region': editForm.region
            });

            toast({ title: "Tenant Updated", description: "Configuration changes saved successfully." });
            setIsEditing(false);
        } catch (error) {
            console.error("Update failed", error);
            toast({ variant: "destructive", title: "Update Failed", description: "Could not save changes." });
        }
    };

    const isLoading = isLoadingPath || isVaultLoading;

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid gap-6 md:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            </div>
        );
    }

    if (!path || (!isVaultLoading && !vaultData)) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <AlertTriangle className="h-12 w-12 text-yellow-500" />
                <h2 className="text-xl font-semibold">Tenant Vault Not Found</h2>
                <p className="text-muted-foreground">The directory entry exists, but the vault data is missing or inaccessible.</p>
                <Button variant="outline" onClick={() => router.push('/admin')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground mb-2" onClick={() => router.push('/admin')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Command Center
                    </Button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            {isEditing ? (
                                <Input 
                                    value={editForm.barangayName} 
                                    onChange={(e) => setEditForm({...editForm, barangayName: e.target.value})} 
                                    className="text-2xl font-bold h-10 w-[400px]"
                                />
                            ) : (
                                settingsData?.barangayName || vaultData?.name || 'Unknown Tenant'
                            )}
                        </h1>
                        {!isEditing && (
                            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                                <Pencil className="h-4 w-4 text-slate-400 hover:text-slate-700" />
                            </Button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="h-4 w-4" />
                        {isEditing ? (
                            <div className="flex gap-2">
                                <Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="h-7 w-32 text-xs" placeholder="City" />
                                <Input value={editForm.province} onChange={e => setEditForm({...editForm, province: e.target.value})} className="h-7 w-32 text-xs" placeholder="Province" />
                            </div>
                        ) : (
                            <>{settingsData?.location?.city || vaultData?.city}, {settingsData?.location?.province || vaultData?.province}</>
                        )}
                        <span className="text-slate-300">|</span>
                        <Badge variant="outline" className="font-mono text-xs">{tenantId}</Badge>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                     {isEditing ? (
                         <div className="flex gap-2">
                             <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                                 <X className="h-4 w-4 mr-2" /> Cancel
                             </Button>
                             <Button size="sm" onClick={handleSaveChanges}>
                                 <Save className="h-4 w-4 mr-2" /> Save Changes
                             </Button>
                         </div>
                     ) : (
                         <>
                             <Badge className={vaultData?.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-700'}>
                                {vaultData?.status === 'active' ? '● Operational' : '● Inactive'}
                             </Badge>
                             
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Admin Controls</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">
                                        <ShieldCheck className="mr-2 h-4 w-4" /> Suspend Tenant
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                         </>
                     )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Population</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vaultData?.population || 0}</div>
                        <p className="text-xs text-muted-foreground">Registered Residents</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Households</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vaultData?.households || 0}</div>
                        <p className="text-xs text-muted-foreground">Mapped Units</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">~0 MB</div>
                        <p className="text-xs text-muted-foreground">Documents & Assets</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{vaultData?.plan || 'Free'}</div>
                        <p className="text-xs text-muted-foreground">Current Tier</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Views */}
            <Tabs defaultValue="config" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="officials">Officials</TabsTrigger>
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest data entries and system events.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {recentResidents && recentResidents.length > 0 ? (
                                <div className="space-y-4">
                                    {recentResidents.map((resident: any) => (
                                        <div key={resident.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <UserPlus className="h-5 w-5 text-slate-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">New Resident Registered</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {resident.firstName} {resident.lastName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {resident.createdAt?.toDate ? resident.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             ) : (
                                 <div className="text-center py-8 text-muted-foreground text-sm">
                                    No recent activity found in this vault.
                                 </div>
                             )}
                        </CardContent>
                     </Card>
                </TabsContent>

                <TabsContent value="config">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Vault Configuration</CardTitle>
                                <CardDescription>System settings and contact information.</CardDescription>
                            </div>
                            {!isEditing && (
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                    <Pencil className="h-4 w-4 mr-2" /> Edit Config
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                             <div className="space-y-2">
                                <h4 className="font-medium text-sm">Geography</h4>
                                <div className="p-4 bg-slate-100 rounded-lg text-sm space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Region:</span>
                                        {isEditing ? <Input value={editForm.region} onChange={e => setEditForm({...editForm, region: e.target.value})} className="h-6 w-48 text-xs" /> : <span>{settingsData?.location?.region || vaultData?.region || '—'}</span>}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Province:</span> 
                                        {isEditing ? <Input value={editForm.province} onChange={e => setEditForm({...editForm, province: e.target.value})} className="h-6 w-32 text-xs" /> : <span>{settingsData?.location?.province}</span>}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">City:</span> 
                                        {isEditing ? <Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="h-6 w-32 text-xs" /> : <span>{settingsData?.location?.city}</span>}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Barangay:</span> 
                                        {isEditing ? <Input value={editForm.barangayName} onChange={e => setEditForm({...editForm, barangayName: e.target.value})} className="h-6 w-32 text-xs" /> : <span>{settingsData?.barangayName}</span>}
                                    </div>
                                </div>
                             </div>
                             <div className="space-y-2">
                                <h4 className="font-medium text-sm">Primary Contact</h4>
                                <div className="p-4 bg-slate-100 rounded-lg text-sm space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Name:</span> 
                                        {isEditing ? <Input value={editForm.captainName} onChange={e => setEditForm({...editForm, captainName: e.target.value})} className="h-6 w-40 text-xs" /> : <span>{settingsData?.captainProfile?.name}</span>}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Email:</span> 
                                        {isEditing ? <Input value={editForm.captainEmail} onChange={e => setEditForm({...editForm, captainEmail: e.target.value})} className="h-6 w-40 text-xs" /> : <span>{settingsData?.captainProfile?.email}</span>}
                                    </div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Role:</span> <span>Punong Barangay</span></div>
                                </div>
                             </div>
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
