'use client';

import React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Dog, ChevronRight } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';

const BARANGAY_ID = 'barangay_san_isidro';

export function MyHousehold() {
    const { user } = useUser();
    const firestore = useFirestore();

    // 1. Fetch current user's resident profile to get their householdId
    const residentQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
             collection(firestore, `/barangays/${BARANGAY_ID}/residents`),
             where('residentId', '==', user.uid)
        );
    }, [firestore, user]);

    const { data: residentData, isLoading: isLoadingResident } = useCollection(residentQuery);
    const currentUser = residentData?.[0];
    const householdId = currentUser?.householdId;

    // 2. Fetch all members of that household (if ID exists)
    const householdMembersQuery = useMemoFirebase(() => {
        if (!firestore || !householdId) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/residents`),
            where('householdId', '==', householdId)
        );
    }, [firestore, householdId]);

    const { data: members, isLoading: isLoadingMembers } = useCollection(householdMembersQuery);
    
    // 3. Fetch pets for this household (assuming pets are linked to householdId or ownerId - let's assume householdId for simplicity if schema allows, or just owner for now)
    // Checking pet schema... usually linked to ownerId. If we want "Household Pets", we might need to query for pets owned by ANY member of the household.
    // For simplicity in this widget, let's just show "My Pets" (owned by current user).
    const petsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/pets`),
            where('ownerId', '==', user.uid)
        );
    }, [firestore, user]);

    const { data: pets, isLoading: isLoadingPets } = useCollection(petsQuery);

    const isLoading = isLoadingResident || isLoadingMembers || isLoadingPets;

    return (
        <div className="grid grid-cols-2 gap-4 h-full">
            {/* Household Card */}
            <Card className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" /> My Household
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="space-y-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ) : (
                        <div>
                            <div className="text-2xl font-bold">{members ? members.length : 0}</div>
                            <p className="text-xs text-muted-foreground">Registered Members</p>
                        </div>
                    )}
                </CardContent>
                 {/* Footer / Link */}
                 <div className="p-4 pt-0">
                    <Button variant="ghost" className="w-full text-xs h-8 justify-between px-0 hover:bg-transparent hover:text-blue-600" asChild>
                        <Link href="/resident/profile">
                            Manage Family <ChevronRight className="h-3 w-3" />
                        </Link>
                    </Button>
                 </div>
            </Card>

            {/* Pets Card */}
            <Card className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Dog className="h-4 w-4 text-orange-500" /> My Pets
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ) : (
                        <div>
                             <div className="text-2xl font-bold">{pets ? pets.length : 0}</div>
                             <p className="text-xs text-muted-foreground">Registered Pets</p>
                        </div>
                    )}
                </CardContent>
                 <div className="p-4 pt-0">
                     <Button variant="ghost" className="w-full text-xs h-8 justify-between px-0 hover:bg-transparent hover:text-orange-600" asChild>
                         <Link href="/resident/profile#pets">
                            Manage Pets <ChevronRight className="h-3 w-3" />
                         </Link>
                    </Button>
                </div>
            </Card>
        </div>
    );
}
