
'use client';

import React, { useMemo } from 'react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Announcement, BlotterCase, CertificateRequest, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Megaphone, Gavel, FileText, User as UserIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const BARANGAY_ID = 'barangay_san_isidro';

const ICONS: { [key: string]: React.ReactNode } = {
    announcement: <Megaphone className="h-5 w-5" />,
    blotter: <Gavel className="h-5 w-5" />,
    request: <FileText className="h-5 w-5" />,
};

type UnifiedActivity = {
    id: string;
    type: 'announcement' | 'blotter' | 'request';
    title: string;
    description: string;
    timestamp: Date;
    userId: string;
};

const ActivityItem = ({ activity, user }: { activity: UnifiedActivity, user?: User }) => {
    return (
        <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
                {ICONS[activity.type]}
            </div>
            <div className="flex-1">
                <p className="text-sm">
                    <span className="font-semibold text-foreground">{user?.fullName ?? 'System'}</span> {activity.title}
                </p>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                 <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
            </div>
        </div>
    );
};


export function ActivityFeed() {
    const firestore = useFirestore();

    // Fetch last 5 of each type
    const announcementsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `/barangays/${BARANGAY_ID}/announcements`), orderBy('datePosted', 'desc'), limit(5)) : null, [firestore]);
    const blotterQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `/barangays/${BARANGAY_ID}/blotter_cases`), orderBy('dateReported', 'desc'), limit(5)) : null, [firestore]);
    const requestsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `/barangays/${BARANGAY_ID}/certificate_requests`), orderBy('dateRequested', 'desc'), limit(5)) : null, [firestore]);
    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `/users`)) : null, [firestore]);

    const { data: announcements, isLoading: loadingAnnouncements } = useCollection<Announcement>(announcementsQuery);
    const { data: blotterCases, isLoading: loadingBlotter } = useCollection<BlotterCase>(blotterQuery);
    const { data: requests, isLoading: loadingRequests } = useCollection<CertificateRequest>(requestsQuery);
    const { data: users, isLoading: loadingUsers } = useCollection<User>(usersQuery);

    const isLoading = loadingAnnouncements || loadingBlotter || loadingRequests || loadingUsers;

    const combinedActivity = useMemo((): UnifiedActivity[] => {
        const activities: UnifiedActivity[] = [];

        announcements?.forEach(item => activities.push({
            id: item.announcementId,
            type: 'announcement',
            title: `published a new announcement: "${item.title}"`,
            description: item.content?.substring(0, 100) + '...' || 'No content',
            timestamp: item.datePosted.toDate(),
            userId: item.postedByUserId,
        }));
        
        blotterCases?.forEach(item => activities.push({
            id: item.caseId,
            type: 'blotter',
            title: `filed a new blotter case: "${item.caseType}"`,
            description: `Case #${item.caseId}`,
            timestamp: item.dateReported.toDate(),
            userId: item.filedByUserId || 'system',
        }));

        requests?.forEach(item => activities.push({
            id: item.requestId,
            type: 'request',
            title: `received a document request from ${item.residentName}`,
            description: `Document: ${item.certificateName}`,
            timestamp: item.dateRequested.toDate(),
            userId: item.processedByUserId || 'system',
        }));

        return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    }, [announcements, blotterCases, requests]);


    if (isLoading) {
        return (
            <div className="space-y-8">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {combinedActivity.map((activity) => {
                const user = users?.find(u => u.userId === activity.userId);
                return <ActivityItem key={activity.id} activity={activity} user={user} />
            })}
             {combinedActivity.length === 0 && (
                <div className="text-center text-muted-foreground py-16">
                    <p>No recent activity found.</p>
                </div>
             )}
        </div>
    )
}
