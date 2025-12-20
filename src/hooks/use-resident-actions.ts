
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from './use-toast';
import { format } from 'date-fns';

const BARANGAY_ID = 'barangay_san_isidro';

export const useResidentActions = () => {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // 1. SOS (Emergency Alert)
    const createAlert = async (lat: number, lng: number, category: string, message: string, address?: any, accuracy?: number) => {
        if (!firestore || !user) return false;
        setLoading(true);
        try {
            await addDoc(collection(firestore, `/barangays/${BARANGAY_ID}/sos_alerts`), {
                residentId: user.uid,
                residentName: user.displayName || 'Anonymous Resident',
                timestamp: serverTimestamp(), // Admin will see server time
                latitude: lat,
                longitude: lng,
                accuracy_m: accuracy || 0, // Added accuracy
                status: 'New',
                category: category,
                message: message || 'Emergency Assistance Needed',
                address: address || null, // Added structured address
                location_source: 'GPS',
                contactNumber: '' // Ideally fetched from profile
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
         if (!firestore || !user) return false;
         setLoading(true);
         try {
             await addDoc(collection(firestore, `/barangays/${BARANGAY_ID}/blotter_cases`), {
                 caseType: type,
                 narrative: narrative,
                 dateReported: serverTimestamp(),
                 status: 'Open',
                 complainantIds: [user.uid],
                 respondentIds: [], // To be filled by Admin later if known
                 filedByUserId: user.uid // Self-filed
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
         if (!firestore || !user) return false;
         setLoading(true);
         try {
             await addDoc(collection(firestore, `/barangays/${BARANGAY_ID}/document_requests`), {
                 residentId: user.uid,
                 residentName: user.displayName || 'Resident',
                 certificateName: docType,
                 certTypeId: 'manual_entry', // In a real app, fetch ID from config
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

    // 4. Queries (Memoized at Top Level)
    
    const myRequestsQuery = useMemoFirebase(() => {
         if (!firestore || !user) return null;
         // Removed 'where' clause for demo safety
         return query(
             collection(firestore, `/barangays/${BARANGAY_ID}/document_requests`),
             orderBy('dateRequested', 'desc')
         );
    }, [firestore, user]);

    const ordinancesQuery = useMemoFirebase(() => {
         if(!firestore) return null;
         return query(
             collection(firestore, `/barangays/${BARANGAY_ID}/ordinances`),
             where('status', '==', 'Active'),
             orderBy('dateEnacted', 'desc')
         );
    }, [firestore]);

    const healthSchedulesQuery = useMemoFirebase(() => {
         if(!firestore) return null;
         // Ideally filter by date >= today
         return query(
             collection(firestore, `/barangays/${BARANGAY_ID}/schedules`),
             where('category', '==', 'Health'),
             orderBy('start', 'asc')
         );
    }, [firestore]);

    const announcementsQuery = useMemoFirebase(() => {
        if(!firestore) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/announcements`),
            orderBy('datePosted', 'desc')
        );
    }, [firestore]);


    return {
        createAlert,
        fileComplaint,
        requestDocument,
        myRequestsQuery, // Returned directly
        ordinancesQuery, // Returned directly
        healthSchedulesQuery, // Returned directly
        announcementsQuery, // Returned directly
        loading
    };
};
