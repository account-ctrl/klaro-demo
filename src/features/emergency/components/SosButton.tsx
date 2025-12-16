
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Siren, Loader2, MapPinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentCoordinates, checkGeolocationPermission } from '../hooks/useGeolocation';
import { useFirestore } from '@/firebase/provider';
import { useTenant } from '@/providers/tenant-provider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '@/firebase';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function SOSButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [permStatus, setPermStatus] = useState<string>('unknown');
    const { toast } = useToast();
    const firestore = useFirestore();
    const { tenantPath } = useTenant();
    const { user } = useUser();

    // Check permission status on mount
    useEffect(() => {
        checkGeolocationPermission().then(status => setPermStatus(status));
    }, []);

    const handleSOS = async () => {
        setIsLoading(true);
        try {
            console.log("SOS Button Clicked. Requesting location...");
            
            // Explicitly call getCurrentCoordinates which triggers the browser prompt if not granted
            const coords = await getCurrentCoordinates();
            
            console.log("SOS GPS Coordinates captured:", coords);

            if (!firestore || !tenantPath) throw new Error("Connection error");

            const incidentsRef = collection(firestore, `${tenantPath}/emergency_alerts`);
            
            await addDoc(incidentsRef, {
                residentId: user?.uid || 'anonymous',
                residentName: user?.displayName || 'Unknown User',
                timestamp: serverTimestamp(),
                latitude: coords.lat,
                longitude: coords.lng,
                accuracy_m: coords.accuracy,
                status: 'New',
                category: 'Unspecified',
                description: 'SOS Button Triggered',
                contactNumber: user?.phoneNumber || '', 
                location_source: 'GPS'
            });

            toast({
                title: "SOS SENT!",
                description: `Help is on the way. Location sent (Accuracy: ±${Math.round(coords.accuracy)}m).`,
                className: "bg-red-600 text-white border-red-800"
            });

        } catch (error: any) {
            console.error("SOS Error:", error);
            
            if (error.message.includes("Secure Context")) {
                 toast({
                    title: "Security Error",
                    description: "Location requires HTTPS or Localhost.",
                    variant: "destructive"
                });
            } else if (error.code === 1) { // PERMISSION_DENIED
                setPermStatus('denied');
                toast({
                    title: "Permission Denied",
                    description: "You blocked location access. Please enable it in your browser address bar.",
                    variant: "destructive"
                });
            } else if (error.message === "Geolocation not supported") {
                 toast({
                    title: "Not Supported",
                    description: "Your device does not support GPS tracking.",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "SOS Failed",
                    description: "Could not acquire GPS lock. Try moving to an open area.",
                    variant: "destructive"
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TooltipProvider>
            <Tooltip open={permStatus === 'denied'}>
                <TooltipTrigger asChild>
                    <Button 
                        className={`rounded-full w-24 h-24 shadow-[0_0_50px_-10px_rgba(220,38,38,0.8)] border-4 animate-pulse hover:animate-none transition-all scale-100 hover:scale-110 flex flex-col gap-1 items-center justify-center z-[100] ${
                            permStatus === 'denied' 
                            ? 'bg-zinc-700 border-zinc-500 cursor-not-allowed hover:bg-zinc-700' 
                            : 'bg-red-600 border-red-800 hover:bg-red-700'
                        }`}
                        onClick={handleSOS}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-8 w-8 animate-spin" />
                        ) : permStatus === 'denied' ? (
                            <MapPinOff className="h-10 w-10 text-zinc-400" />
                        ) : (
                            <Siren className="h-10 w-10" />
                        )}
                        <span className="font-bold text-lg">SOS</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-red-900 border-red-800 text-white max-w-[200px] text-center">
                    <p>Location access is blocked. Click the lock icon in your URL bar to enable.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
