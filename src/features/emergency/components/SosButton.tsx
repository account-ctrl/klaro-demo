
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Siren, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentCoordinates } from '../hooks/useGeolocation';
import { useFirestore } from '@/firebase/client-provider';
import { useTenant } from '@/providers/tenant-provider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '@/firebase';

export function SOSButton() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();
    const { tenantPath } = useTenant();
    const { user } = useUser();

    const handleSOS = async () => {
        setIsLoading(true);
        try {
            const coords = await getCurrentCoordinates();
            
            if (!firestore || !tenantPath) throw new Error("Connection error");

            const incidentsRef = collection(firestore, `${tenantPath}/emergency_alerts`);
            
            await addDoc(incidentsRef, {
                residentId: user?.uid || 'anonymous',
                residentName: user?.displayName || 'Unknown User',
                timestamp: serverTimestamp(),
                latitude: coords.lat,
                longitude: coords.lng,
                accuracy_m: coords.accuracy, // Added accuracy
                status: 'New',
                category: 'Unspecified',
                description: 'SOS Button Triggered',
                contactNumber: user?.phoneNumber || '', 
                location_source: 'GPS' // Added source
            });

            toast({
                title: "SOS SENT!",
                description: "Help is on the way. Your location has been shared.",
                className: "bg-red-600 text-white border-red-800"
            });

        } catch (error: any) {
            console.error("SOS Error:", error);
            if (error.code === 1) { // PERMISSION_DENIED
                toast({
                    title: "Location Access Denied",
                    description: "Please enable location services to use SOS.",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "SOS Failed",
                    description: "Could not send alert. Please call emergency hotline directly.",
                    variant: "destructive"
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button 
            className="rounded-full w-24 h-24 bg-red-600 hover:bg-red-700 shadow-[0_0_50px_-10px_rgba(220,38,38,0.8)] border-4 border-red-800 animate-pulse hover:animate-none transition-all scale-100 hover:scale-110 flex flex-col gap-1 items-center justify-center z-[100]"
            onClick={handleSOS}
            disabled={isLoading}
        >
            {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Siren className="h-10 w-10" />}
            <span className="font-bold text-lg">SOS</span>
        </Button>
    );
}
