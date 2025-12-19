
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, MapPinOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useSmartGeolocation } from '../hooks/useSmartGeolocation'; // Updated Import
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
    const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');
    const { toast } = useToast();
    const firestore = useFirestore();
    const { tenantPath } = useTenant();
    const { user } = useUser();
    
    // New Smart Geolocation Hook
    const { startLocating, location, loading, error, status, stopWatching } = useSmartGeolocation();

    useEffect(() => {
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionState(result.state);
                result.onchange = () => setPermissionState(result.state);
            });
        }
    }, []);

    // Effect: Trigger Database Write ONLY when location is "Final"
    useEffect(() => {
        if (status === 'final' && location && location.isFinal) {
            submitSOS(location);
        }
    }, [status, location]);

    // Effect: Handle Errors
    useEffect(() => {
        if (error) {
            toast({
                title: "SOS Failed",
                description: error,
                variant: "destructive"
            });
        }
    }, [error]);

    const submitSOS = async (locData: any) => {
        if (!firestore || !tenantPath || !user) {
            toast({ title: "System Error", description: "Service not available.", variant: "destructive" });
            return;
        }

        try {
            const incidentsRef = collection(
                firestore,
                `${tenantPath}/emergency_alerts`
            );

            await addDoc(incidentsRef, {
                residentId: user?.uid || 'anonymous',
                residentName: user?.displayName || 'Unknown User',
                timestamp: serverTimestamp(),
                location: {
                    lat: locData.lat,
                    lng: locData.lng,
                    accuracy: locData.accuracy,
                    provider: locData.provider
                },
                // Backward compatibility
                latitude: locData.lat,
                longitude: locData.lng,
                accuracy_m: locData.accuracy,
                
                status: 'New',
                category: 'Unspecified',
                description: 'SOS Button Triggered',
                contactNumber: user?.phoneNumber || '', 
            });

            toast({
                title: "SOS SENT!",
                description: `Help is on the way. Location pinned (Accuracy: ${Math.round(locData.accuracy)}m).`,
                className: "bg-red-600 text-white border-none"
            });

        } catch (err: any) {
            console.error("SOS DB Error:", err);
            toast({
                title: "Connection Error",
                description: "Could not send SOS to server. Check internet.",
                variant: "destructive"
            });
        }
    };

    const handleSosClick = () => {
        startLocating();
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

    // Dynamic Indicator Color based on current accuracy
    const getIndicatorColor = () => {
        if (!location) return 'bg-gray-300';
        if (location.accuracy <= 20) return 'bg-green-500'; // Precise
        if (location.accuracy <= 100) return 'bg-yellow-500'; // Approximate
        return 'bg-red-500'; // Weak
    };

    return (
        <div className="relative flex flex-col items-center gap-2">
            {/* Confidence Dot (Only visible when locating or recently finished) */}
            {(loading || location) && (
                <div className={`absolute -top-2 right-0 w-3 h-3 rounded-full border border-white ${getIndicatorColor()} shadow-sm z-10`} />
            )}

            <Button 
                variant="destructive" 
                size="lg" 
                className={`h-16 w-16 rounded-full shadow-xl ${loading ? '' : 'animate-pulse hover:animate-none'}`}
                onClick={handleSosClick}
                disabled={loading}
            >
                {loading ? (
                    <div className="flex flex-col items-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-[8px] font-medium mt-1">
                            {status === 'improving' ? 'REFINING...' : 'LOCATING...'}
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <AlertCircle className="h-6 w-6" />
                        <span className="text-[10px] font-bold">SOS</span>
                    </div>
                )}
            </Button>
            
            {/* Live Accuracy Feedback */}
            {loading && location && (
                <span className="text-[10px] text-zinc-500 bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    ±{Math.round(location.accuracy)}m
                </span>
            )}
        </div>
    );
};
