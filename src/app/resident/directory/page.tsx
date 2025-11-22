
'use client';
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users as DirectoryIcon, Briefcase, Users2 } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { User as Official } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DirectoryPage() {
  const firestore = useFirestore();

  const officialsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, `/users`),
        where('status', '==', 'Active'),
        orderBy('fullName', 'asc')
    );
  }, [firestore]);

  const { data: officials, isLoading } = useCollection<Official>(officialsQuery);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Barangay Directory</h1>
        <p className="text-muted-foreground">
          Contact information for barangay officials and offices.
        </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><DirectoryIcon /> Officials and Staff</CardTitle>
            <CardDescription>A directory of all active public servants in the barangay.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {isLoading && [...Array(6)].map((_, i) => (
                <Card key={i} className="p-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="space-y-2">
                             <Skeleton className="h-5 w-32" />
                             <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                </Card>
            ))}

            {!isLoading && officials && officials.length > 0 && officials.map(official => (
                 <Card key={official.userId} className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={`https://i.pravatar.cc/150?u=${official.userId}`} />
                            <AvatarFallback>{official.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold text-lg">{official.fullName}</p>
                            <p className="text-sm text-primary">{official.position}</p>
                        </div>
                    </div>
                    {official.committee && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2 border-t pt-2">
                           <Users2 className="h-4 w-4" />
                           <span>{official.committee}</span>
                        </div>
                    )}
                </Card>
            ))}

             {!isLoading && (!officials || officials.length === 0) && (
                <div className="col-span-full text-center text-muted-foreground py-16">
                    <DirectoryIcon className="mx-auto h-12 w-12" />
                    <p className="mt-4">The directory is currently empty.</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
