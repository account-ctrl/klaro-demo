'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, Info, AlertTriangle, Clock } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

type Notification = {
    id: string;
    recipientId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isRead: boolean;
    createdAt: Timestamp;
    link?: string;
};

export default function NotificationsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    
    // Get Tenant ID
    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [firestore, user]);
    const { data: userProfile } = useDoc<User>(userDocRef);
    const tenantId = userProfile?.tenantId;

    const notifsQuery = useMemoFirebase(() => {
        if (!firestore || !user || !tenantId) return null;
        // Query resident-specific notifications within tenant scope
        // Assuming notifications are stored in `barangays/{tenantId}/notifications`
        return query(
            collection(firestore, `/barangays/${tenantId}/notifications`),
            where('recipientId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, user, tenantId]);

    const { data: notifications, isLoading } = useCollection<Notification>(notifsQuery);

    const handleMarkAsRead = (notifId: string) => {
        if (!firestore || !tenantId) return;
        const notifRef = doc(firestore, `/barangays/${tenantId}/notifications/${notifId}`);
        updateDocumentNonBlocking(notifRef, { isRead: true });
    };

    const handleMarkAllRead = () => {
        if (!notifications || !firestore || !tenantId) return;
        notifications.forEach(n => {
            if (!n.isRead) {
                const notifRef = doc(firestore, `/barangays/${tenantId}/notifications/${n.id}`);
                updateDocumentNonBlocking(notifRef, { isRead: true });
            }
        });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case 'error': return <AlertTriangle className="h-5 w-5 text-red-500" />;
            default: return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Notifications</h1>
                    <p className="text-muted-foreground">Updates on your requests and community alerts.</p>
                </div>
                {notifications && notifications.some(n => !n.isRead) && (
                    <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                        Mark all as read
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" /> Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="flex gap-4 p-4 border rounded-lg">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))
                    ) : notifications && notifications.length > 0 ? (
                        notifications.map((notif) => (
                            <div 
                                key={notif.id} 
                                className={`flex gap-4 p-4 rounded-lg border transition-colors ${!notif.isRead ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                                onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                            >
                                <div className="mt-1 flex-shrink-0">
                                    {getIcon(notif.type)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`text-sm font-semibold ${!notif.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                                            {notif.title}
                                            {!notif.isRead && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 h-5 px-1.5 text-[10px]">NEW</Badge>}
                                        </h4>
                                        <span className="text-xs text-slate-400 whitespace-nowrap ml-2 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {notif.message}
                                    </p>
                                    {notif.link && (
                                        <Button variant="link" className="h-auto p-0 text-xs text-blue-600" onClick={(e) => {
                                            e.stopPropagation();
                                            // Handle navigation logic here if needed, or simple href
                                        }}>
                                            View Details &rarr;
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No notifications yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
