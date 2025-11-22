
'use client';
import React from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Announcement } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const BARANGAY_ID = 'barangay_san_isidro';


export default function AnnouncementsPage() {
  const firestore = useFirestore();
    
  const announcementsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(
          collection(firestore, `/barangays/${BARANGAY_ID}/announcements`),
          orderBy('datePosted', 'desc')
      );
  }, [firestore]);

  const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Announcements</h1>
        <p className="text-muted-foreground">
          Stay informed with the latest news and updates from the barangay.
        </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Megaphone /> Public Bulletin Board</CardTitle>
            <CardDescription>All official announcements will be posted here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {isLoading && [...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
            {!isLoading && announcements && announcements.length > 0 ? (
              announcements.map((item, index) => (
                <div key={item.announcementId}>
                  <article className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                          <h3 className="text-xl font-semibold">{item.title}</h3>
                          <Badge variant="outline">{item.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                          Posted on {item.datePosted ? format(item.datePosted.toDate(), 'MMMM d, yyyy') : 'N/A'}
                      </p>
                    </div>

                    {item.imageUrl && (
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                         <Image 
                            src={item.imageUrl} 
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                      </div>
                    )}

                    {item.content && (
                      <p className="text-foreground/90 whitespace-pre-wrap">{item.content}</p>
                    )}
                  </article>
                  {index < announcements.length - 1 && <Separator className="my-8" />}
                </div>
              ))
            ) : (
              !isLoading && (
                <div className="text-center text-muted-foreground py-16">
                  <Megaphone className="mx-auto h-12 w-12" />
                  <p className="mt-4">There are no announcements at this time.</p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
