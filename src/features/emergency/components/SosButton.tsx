
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, MapPinOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useHighPrecisionLocation } from '../hooks/useHighPrecisionLocation';
import { useFirestore } from '@/firebase/client-provider';
import { useTenant } from '@/providers/tenant-provider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '@/firebase';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export const SOSButton = () => {
    const [loading, setLoading] = useState(false);
    const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');
    const { toast } = useToast();
    const firestore = useFirestore();
    const { tenantPath } = useTenant();
    const { user } = useUser();
    
    // New High Precision Hook
    const { getCurrentCoordinates, loading: locationLoading } = useHighPrecisionLocation();

    useEffect(() => {
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionState(result.state);
                result.onchange = () => setPermissionState(result.state);
            });
        }
    }, []);

    const handleSosClick = async () => {
        if (!firestore || !tenantPath || !user) {
            toast({ title: "System Error", description: "Service not available.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            // 1. Get High Precision Location
            const { lat, lng, accuracy, provider } = await getCurrentCoordinates();

            // 2. Create Incident Payload
            const incidentsRef = collection(
                firestore,
                `${tenantPath}/emergency_alerts`
            );

            await addDoc(incidentsRef, {
                residentId: user?.uid || 'anonymous',
                residentName: user?.displayName || 'Unknown User',
                timestamp: serverTimestamp(),
                // Use the new structured location payload
                location: {
                    lat: lat,
                    lng: lng,
                    accuracy: accuracy,
                    provider: provider
                },
                // Keep flat fields for backward compatibility if needed, but prefer 'location' object
                latitude: lat,
                longitude: lng,
                accuracy_m: accuracy, 
                
                status: 'New',
                category: 'Unspecified',
                description: 'SOS Button Triggered',
                contactNumber: user?.phoneNumber || '', 
            });

            toast({
                title: "SOS SENT!",
                description: `Help is on the way. Location pinned (Accuracy: ${Math.round(accuracy)}m).`,
                className: "bg-red-600 text-white border-none"
            });

        } catch (error: any) {
            console.error("SOS Error:", error);
            let msg = "Could not get location.";
            if (error.message && error.message.includes("denied")) msg = "Location permission denied. Please enable it in browser settings.";
            else if (error.message && error.message.includes("timed out")) msg = "GPS timed out. Ensure you have a clear signal.";

            toast({
                title: "SOS Failed",
                description: msg,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (permissionState === 'denied') {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="destructive" 
                            size="lg" 
                            className="h-16 w-16 rounded-full shadow-xl animate-none bg-gray-400 hover:bg-gray-500"
                            onClick={() => alert("Location is blocked. Click the lock icon in your address bar to reset permissions.")}
                        >
                            <MapPinOff className="h-8 w-8" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Location permission blocked. Click to see how to enable.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    const isProcessing = loading || locationLoading;

    return (
        <Button 
            variant="destructive" 
            size="lg" 
            className={`h-16 w-16 rounded-full shadow-xl ${isProcessing ? '' : 'animate-pulse hover:animate-none'}`}
            onClick={handleSosClick}
            disabled={isProcessing}
        >
            {isProcessing ? (
                <div className="flex flex-col items-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-[8px] font-medium mt-1">LOCATING...</span>
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    <AlertCircle className="h-6 w-6" />
                    <span className="text-[10px] font-bold">SOS</span>
                </div>
            )}
        </Button>
    );
};
