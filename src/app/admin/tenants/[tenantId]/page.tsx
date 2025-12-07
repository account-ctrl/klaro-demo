
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, limit, getDoc, orderBy } from 'firebase/firestore';
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
  Calendar
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

    // 1. Resolve Tenant Path
    // We can't use useTenant() here because we are NOT "inside" the tenant.
    // We are looking AT the tenant from the outside.
    const [path, setPath] = React.useState<string | null>(null);
    const [isLoadingPath, setIsLoadingPath] = React.useState(true);

    React.useEffect(() => {
        async function resolve() {
            if (!firestore || !tenantId) return;
            const p = await getTenantPath(firestore, tenantId);
            setPath(p);
            setIsLoadingPath(false);
        }
        resolve();
    }, [firestore, tenantId]);

    // 2. Fetch Vault Data (Once path is known)
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

    // 3. Fetch Recent Residents (Preview)
    const residentsQuery = useMemoFirebase(() => {
        if (!firestore || !path) return null;
        return query(collection(firestore, `${path}/residents`), orderBy('createdAt', 'desc'), limit(5));
    }, [firestore, path]);

    const { data: recentResidents } = useCollection(residentsQuery);

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
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        {settingsData?.barangayName || vaultData?.name || 'Unknown Tenant'}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="h-4 w-4" />
                        {settingsData?.location?.city || vaultData?.city}, {settingsData?.location?.province || vaultData?.province}
                        <span className="text-slate-300">|</span>
                        <Badge variant="outline" className="font-mono text-xs">{tenantId}</Badge>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
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
                            <DropdownMenuItem disabled>
                                <Activity className="mr-2 h-4 w-4" /> View Audit Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                                <ShieldCheck className="mr-2 h-4 w-4" /> Suspend Tenant
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
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
            <Tabs defaultValue="overview" className="space-y-6">
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
                        <CardHeader>
                            <CardTitle>Vault Configuration</CardTitle>
                            <CardDescription>Read-only view of the tenant's system settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                             <div className="space-y-2">
                                <h4 className="font-medium text-sm">Geography</h4>
                                <div className="p-4 bg-slate-100 rounded-lg text-sm space-y-1">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Region:</span> <span>IV-A (CALABARZON)</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Province:</span> <span>{settingsData?.location?.province}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">City:</span> <span>{settingsData?.location?.city}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Barangay:</span> <span>{settingsData?.barangayName}</span></div>
                                </div>
                             </div>
                             <div className="space-y-2">
                                <h4 className="font-medium text-sm">Primary Contact</h4>
                                <div className="p-4 bg-slate-100 rounded-lg text-sm space-y-1">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span>{settingsData?.captainProfile?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Email:</span> <span>{settingsData?.captainProfile?.email}</span></div>
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
