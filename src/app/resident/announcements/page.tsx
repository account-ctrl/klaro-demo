'use client';

import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';
import { Announcement, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin, User as UserIcon, AlertTriangle, Megaphone, Info, Clock, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function AnnouncementsPage() {
    const firestore = useFirestore();
    const { user } = useUser();

    // Get Tenant ID
    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [firestore, user]);
    const { data: userProfile } = useDoc<User>(userDocRef);
    const tenantId = userProfile?.tenantId;

    const announcementsQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return query(
            collection(firestore, `/barangays/${tenantId}/announcements`),
            orderBy('datePosted', 'desc')
        );
    }, [firestore, tenantId]);

    const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'Emergency': return 'bg-red-100 text-red-700 border-red-200';
            case 'Health': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'Event': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Ordinance': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Emergency': return <AlertTriangle className="h-4 w-4 mr-1" />;
            case 'Health': return <Info className="h-4 w-4 mr-1" />;
            case 'Event': return <Calendar className="h-4 w-4 mr-1" />;
            case 'Ordinance': return <Info className="h-4 w-4 mr-1" />;
            default: return <Megaphone className="h-4 w-4 mr-1" />;
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Announcements</h1>
                <p className="text-muted-foreground">Stay updated with the latest news and events in your barangay.</p>
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <Skeleton className="h-48 w-full" />
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-2/3" />
                            </CardContent>
                        </Card>
                    ))
                ) : announcements && announcements.length > 0 ? (
                    announcements.map((item) => (
                        <Card key={item.announcementId} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            {item.imageUrl && (
                                <div className="relative h-48 w-full bg-slate-100">
                                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className={`${getCategoryColor(item.category)} border font-medium flex items-center w-fit`}>
                                        {getCategoryIcon(item.category)}
                                        {item.category}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {item.datePosted ? formatDistanceToNow(item.datePosted.toDate(), { addSuffix: true }) : 'Just now'}
                                    </span>
                                </div>
                                <CardTitle className="text-xl leading-tight text-slate-900">{item.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {item.content}
                                </p>
                                
                                {(item.eventDate || item.eventLocation || item.contactPerson) && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 text-sm text-slate-700">
                                        {item.eventDate && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                <span className="font-medium">Date:</span>
                                                <span>{item.eventDate} {item.eventTime && `at ${item.eventTime}`}</span>
                                            </div>
                                        )}
                                        {item.eventLocation && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-slate-400" />
                                                <span className="font-medium">Venue:</span>
                                                <span>{item.eventLocation}</span>
                                            </div>
                                        )}
                                        {(item.contactPerson || item.contactNumber) && (
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="h-4 w-4 text-slate-400" />
                                                <span className="font-medium">Contact:</span>
                                                <span>{item.contactPerson} {item.contactNumber && `(${item.contactNumber})`}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                            {item.registrationLink && (
                                <CardFooter className="bg-slate-50 border-t border-slate-100 py-3">
                                    <Button size="sm" className="w-full sm:w-auto" asChild>
                                        <a href={item.registrationLink} target="_blank" rel="noopener noreferrer">
                                            Register Now <ExternalLink className="ml-2 h-3 w-3" />
                                        </a>
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                        <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No announcements at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
