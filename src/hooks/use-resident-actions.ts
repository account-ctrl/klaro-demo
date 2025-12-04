import { useState, useCallback } from 'react';
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    Timestamp 
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const BARANGAY_ID = 'barangay_san_isidro'; // Hardcoded for demo simplicity

export const useResidentActions = () => {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // A. Emergency Response (SOS)
    const createAlert = useCallback(async (latitude: number, longitude: number, category: string = 'Unspecified', message: string = '') => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'System not ready.' });
            return null;
        }

        setLoading(true);
        try {
            const alertsRef = collection(firestore, `/barangays/${BARANGAY_ID}/emergency_alerts`);
            const payload = {
                status: 'New', // Matches Admin "Active SOS Alerts" filter
                residentId: user.uid,
                residentName: user.displayName || 'Anonymous Resident',
                latitude,
                longitude,
                category,
                message,
                timestamp: serverTimestamp(),
                // Additional fields for admin view compatibility
                contactNumber: '09123456789', // Demo dummy data if not in profile
            };

            const docRef = await addDoc(alertsRef, payload);
            toast({ 
                title: "SOS SENT!", 
                description: "Alert received by Command Center.", 
                className: "bg-red-600 text-white border-none"
            });
            return docRef.id;
        } catch (error: any) {
            console.error("SOS Error:", error);
            toast({ variant: 'destructive', title: 'Failed to send SOS', description: error.message });
            return null;
        } finally {
            setLoading(false);
        }
    }, [firestore, user, toast]);

    // B. Blotter/Incidents (File Complaint)
    const fileComplaint = useCallback(async (type: string, description: string, isConfidential: boolean = false) => {
        if (!firestore || !user) return null;
        setLoading(true);
        try {
            const blotterRef = collection(firestore, `/barangays/${BARANGAY_ID}/blotter_cases`);
            const payload = {
                status: 'Open', // Matches Admin "Pending" filters
                caseType: type, // Field name expected by Admin (check case-types.ts or admin view)
                narrative: description, // Admin likely uses 'narrative' or 'details'
                complainantId: user.uid,
                complainantName: user.displayName || 'Resident',
                incidentDate: serverTimestamp(), // Default to now for filing
                isConfidential,
                dateFiled: serverTimestamp(),
                // Demo Defaults
                respondent: 'Unknown', 
                location: 'Barangay Vicinity'
            };

            await addDoc(blotterRef, payload);
            toast({ title: "Complaint Filed", description: "Case forwarded to Peace & Order committee." });
            return true;
        } catch (error: any) {
            console.error("Blotter Error:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            return false;
        } finally {
            setLoading(false);
        }
    }, [firestore, user, toast]);

    // C. Document Operations (Request)
    const requestDocument = useCallback(async (docType: string, purpose: string) => {
        if (!firestore || !user) return null;
        setLoading(true);
        try {
            const docsRef = collection(firestore, `/barangays/${BARANGAY_ID}/certificate_requests`);
            const payload = {
                status: 'Pending', // Matches Admin "To Process"
                certificateName: docType, // Admin uses this or certTypeId
                certTypeId: docType.toLowerCase().replace(/\s+/g, '_'), // quick ID generation
                purpose,
                residentId: user.uid,
                residentName: user.displayName || 'Resident',
                dateRequested: serverTimestamp(),
                paymentStatus: 'Unpaid',
                requestNumber: `REQ-${Date.now().toString().slice(-6)}`
            };

            await addDoc(docsRef, payload);
            toast({ title: "Request Submitted", description: "Track status in 'My Requests'." });
            return true;
        } catch (error: any) {
            console.error("Doc Request Error:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            return false;
        } finally {
            setLoading(false);
        }
    }, [firestore, user, toast]);

    // D. Fetching (Client-Side Filtering for Demo)
    // We return the query object so the component can use useCollection() hook on it for real-time updates
    const getMyRequestsQuery = useCallback(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/certificate_requests`),
            where('residentId', '==', user.uid),
            orderBy('dateRequested', 'desc')
        );
    }, [firestore, user]);

    // E. Health & Legislative Queries
    const getOrdinancesQuery = useCallback(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/ordinances`),
            orderBy('dateEnacted', 'desc') // Assuming 'dateEnacted' exists, otherwise sort client-side
        );
    }, [firestore]);

    const getHealthSchedulesQuery = useCallback(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/health_schedules`),
            orderBy('date', 'asc') // Upcoming first
        );
    }, [firestore]);

    return {
        createAlert,
        fileComplaint,
        requestDocument,
        getMyRequestsQuery,
        getOrdinancesQuery,
        getHealthSchedulesQuery,
        loading
    };
};
