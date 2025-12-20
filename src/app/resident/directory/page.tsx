'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Phone, Mail, MapPin, User, Building2, ShieldCheck, Ambulance } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User as UserType } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

// Emergency Hotlines (Usually static per Tenant, but can be dynamic later)
const HOTLINES = [
    { name: 'Barangay Emergency Response Team', number: '0917-123-4567', icon: Ambulance, color: 'text-red-500' },
    { name: 'Police Assistance (PCP 1)', number: '0918-123-4567', icon: ShieldCheck, color: 'text-blue-500' },
    { name: 'Fire Station', number: '(02) 8123-4567', icon: Phone, color: 'text-orange-500' },
    { name: 'Health Center', number: '0917-987-6543', icon: Building2, color: 'text-green-500' },
];

export default function DirectoryPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [searchTerm, setSearchTerm] = useState('');

    // Get Tenant ID
    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [firestore, user]);
    const { data: userProfile } = useDoc<UserType>(userDocRef);
    const tenantId = userProfile?.tenantId;

    // Fetch Officials
    const officialsQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        // Query users in the tenant who have official roles
        // Assuming we store officials in a subcollection or filter users by tenantId + role
        // For simplicity/security, we might duplicate public official profiles to `barangays/{tenantId}/officials`
        return query(
            collection(firestore, `/barangays/${tenantId}/officials`), // Using a dedicated public collection
            orderBy('rank', 'asc') // Assuming rank field for ordering (Captain -> Kagawad -> Staff)
        );
    }, [firestore, tenantId]);

    const { data: officials, isLoading } = useCollection<any>(officialsQuery);

    const filteredOfficials = officials?.filter(off => 
        off.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        off.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        off.committee?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Community Directory</h1>
                <p className="text-muted-foreground">Contact information for barangay officials and emergency services.</p>
            </div>

            {/* Emergency Hotlines */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {HOTLINES.map((hotline, idx) => (
                    <Card key={idx} className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex items-start justify-between mb-2">
                                <hotline.icon className={`h-6 w-6 ${hotline.color}`} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-foreground">{hotline.name}</h3>
                                <p className="text-lg font-bold text-foreground/80 mt-1">{hotline.number}</p>
                            </div>
                            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                                <a href={`tel:${hotline.number}`}>Call Now</a>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Officials Search */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search officials by name, position, or committee..." 
                    className="pl-9 h-11 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Officials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </CardContent>
                        </Card>
                    ))
                ) : filteredOfficials && filteredOfficials.length > 0 ? (
                    filteredOfficials.map((official) => (
                        <Card key={official.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                            <CardHeader className="p-5 flex flex-row items-start gap-4 space-y-0 pb-2">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                    <AvatarImage src={official.photoUrl} alt={official.fullName} />
                                    <AvatarFallback>{official.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-base truncate" title={official.fullName}>
                                        {official.fullName}
                                    </h3>
                                    <p className="text-xs font-medium text-primary uppercase tracking-wide truncate" title={official.position}>
                                        {official.position}
                                    </p>
                                    {official.committee && (
                                        <Badge variant="secondary" className="mt-1 text-[10px] h-5 px-1.5 font-normal truncate max-w-full">
                                            {official.committee}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 pt-2 space-y-3 text-sm">
                                {official.contactNumber && (
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        <span>{official.contactNumber}</span>
                                    </div>
                                )}
                                {official.email && (
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        <span className="truncate">{official.email}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>Barangay Hall Office</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No officials found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
