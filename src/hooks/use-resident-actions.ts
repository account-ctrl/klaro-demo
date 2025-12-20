'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, query, where, orderBy, doc, serverTimestamp, DocumentData } from 'firebase/firestore';
import { useToast } from './use-toast';
import { format } from 'date-fns';

// We no longer hardcode BARANGAY_ID. We get it from the user's profile.

export const useResidentActions = () => {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    // 0. Fetch User Profile to get Tenant ID
    // In a real app, this should probably come from a global Context to avoid refetching.
    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [firestore, user]);
    
    const { data: userProfile } = useDoc(userDocRef);
    
    // Fallback for legacy/dev mode if tenantId isn't set yet
    const tenantId = userProfile?.tenantId || 'barangay_san_isidro';

    // Helper to get collection ref dynamically
    const getTenantCollection = (collectionName: string) => {
        // If we have a robust tenant structure: `tenants/${tenantId}/${collectionName}`
        // BUT for the current legacy path structure support: `barangays/${tenantId}/${collectionName}`
        // We will assume the `tenantId` stored in user profile matches the root collection doc ID.
        return collection(firestore!, `barangays/${tenantId}/${collectionName}`);
    };

    // 1. SOS (Emergency Alert)
    const createAlert = async (lat: number, lng: number, category: string, message: string, address?: any, accuracy?: number) => {
        if (!firestore || !user || !tenantId) return false;
        setLoading(true);
        try {
            await addDoc(getTenantCollection('sos_alerts'), {
                residentId: user.uid,
                residentName: user.displayName || 'Anonymous Resident',
                timestamp: serverTimestamp(),
                latitude: lat,
                longitude: lng,
                accuracy_m: accuracy || 0,
                status: 'New',
                category: category,
                message: message || 'Emergency Assistance Needed',
                address: address || null,
                location_source: 'GPS',
                contactNumber: '' 
            });
            toast({
                title: "SOS SENT!",
                description: "Help is on the way. Stay where you are.",
                variant: "destructive"
            });
            return true;
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send alert.' });
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 2. File Blotter
    const fileComplaint = async (type: string, narrative: string) => {
         if (!firestore || !user || !tenantId) return false;
         setLoading(true);
         try {
             await addDoc(getTenantCollection('blotter_cases'), {
                 caseType: type,
                 narrative: narrative,
                 dateReported: serverTimestamp(),
                 status: 'Open',
                 complainantIds: [user.uid],
                 respondentIds: [], 
                 filedByUserId: user.uid 
             });
             toast({
                 title: "Report Submitted",
                 description: "Your report has been filed confidentially.",
             });
             return true;
         } catch (error: any) {
             console.error(error);
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to file report.' });
             return false;
         } finally {
             setLoading(false);
         }
    };

    // 3. Request Document
    const requestDocument = async (docType: string, purpose: string) => {
         if (!firestore || !user || !tenantId) return false;
         setLoading(true);
         try {
             await addDoc(getTenantCollection('document_requests'), {
                 residentId: user.uid,
                 residentName: user.displayName || 'Resident',
                 certificateName: docType,
                 certTypeId: 'manual_entry', 
                 purpose: purpose,
                 status: 'Pending',
                 dateRequested: serverTimestamp(),
                 requestNumber: `REQ-${Date.now().toString().slice(-6)}`
             });
             toast({
                 title: "Request Sent",
                 description: "You will be notified when it's ready.",
             });
             return true;
         } catch (error: any) {
             console.error(error);
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to send request.' });
             return false;
         } finally {
             setLoading(false);
         }
    };

    // 4. Queries (Memoized)
    
    const myRequestsQuery = useMemoFirebase(() => {
         if (!firestore || !user || !tenantId) return null;
         return query(
             getTenantCollection('document_requests'),
             orderBy('dateRequested', 'desc')
         );
    }, [firestore, user, tenantId]);

    const ordinancesQuery = useMemoFirebase(() => {
         if(!firestore || !tenantId) return null;
         return query(
             getTenantCollection('ordinances'),
             where('status', '==', 'Active'),
             orderBy('dateEnacted', 'desc')
         );
    }, [firestore, tenantId]);

    const healthSchedulesQuery = useMemoFirebase(() => {
         if(!firestore || !tenantId) return null;
         return query(
             getTenantCollection('schedules'),
             where('category', '==', 'Health'),
             orderBy('start', 'asc')
         );
    }, [firestore, tenantId]);

    const announcementsQuery = useMemoFirebase(() => {
        if(!firestore || !tenantId) return null;
        return query(
            getTenantCollection('announcements'),
            orderBy('datePosted', 'desc')
        );
    }, [firestore, tenantId]);


    return {
        createAlert,
        fileComplaint,
        requestDocument,
        myRequestsQuery,
        ordinancesQuery,
        healthSchedulesQuery,
        announcementsQuery,
        loading,
        tenantId // Expose if needed
    };
};
