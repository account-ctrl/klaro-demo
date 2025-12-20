
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, MapPinOff, Send } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useSOSLocation, SOSLocationData } from '../hooks/useSOSLocation'; 
import { useFirestore } from '@/firebase/client-provider';
import { useTenant } from '@/providers/tenant-provider';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '@/firebase';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { EMERGENCY_STATUS, EMERGENCY_CATEGORY } from '@/utils/constants';

export const SOSButton = () => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { tenantPath } = useTenant();
    const { user } = useUser();
    
    const { 
        status, 
        location, 
        error, 
        permissionState, 
        getImmediateFix, 
        startTracking, 
        stopTracking,
        checkPermission 
    } = useSOSLocation();

    const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    // Initial permission check
    useEffect(() => {
        checkPermission();
    }, []);

    // Effect: Handle Errors
    useEffect(() => {
        if (error) {
            toast({
                title: "Location Error",
                description: error,
                variant: "destructive"
            });
        }
    }, [error]);

    const createSOSEvent = async (initialLoc?: SOSLocationData) => {
        if (!firestore || !tenantPath || !user) {
            toast({ title: "System Error", description: "Service not available.", variant: "destructive" });
            return null;
        }

        try {
            const incidentsRef = collection(
                firestore,
                `${tenantPath}/emergency_alerts`
            );

            // Basic payload (always create immediately even if location is pending)
            const payload: any = {
                residentId: user.uid || 'anonymous',
                residentName: user.displayName || 'Unknown User',
                timestamp: serverTimestamp(),
                status: EMERGENCY_STATUS.NEW,
                category: EMERGENCY_CATEGORY.UNSPECIFIED,
                message: 'SOS Button Triggered',
                contactNumber: user.phoneNumber || '',
                // Initialize location fields with null or initial fix
                latitude: initialLoc?.lat || null,
                longitude: initialLoc?.lng || null,
                accuracy_m: initialLoc?.accuracy || null,
                location: initialLoc ? {
                    lat: initialLoc.lat,
                    lng: initialLoc.lng,
                    accuracy: initialLoc.accuracy,
                    source: initialLoc.source,
                    timestamp: initialLoc.timestamp
                } : null
            };

            const docRef = await addDoc(incidentsRef, payload);
            console.log("SOS Created:", docRef.id);
            setActiveIncidentId(docRef.id);
            return docRef.id;

        } catch (err) {
            console.error("SOS Creation Error:", err);
            toast({
                title: "Connection Error",
                description: "Could not initiate SOS. Check connection.",
                variant: "destructive"
            });
            return null;
        }
    };

    const updateSOSLocation = async (incidentId: string, loc: SOSLocationData) => {
        if (!firestore || !tenantPath || !incidentId) return;
        
        try {
            const docRef = doc(firestore, `${tenantPath}/emergency_alerts/${incidentId}`);
            await updateDoc(docRef, {
                latitude: loc.lat,
                longitude: loc.lng,
                accuracy_m: loc.accuracy,
                // Update full location object for history/details
                location: {
                    lat: loc.lat,
                    lng: loc.lng,
                    accuracy: loc.accuracy,
                    heading: loc.heading,
                    speed: loc.speed,
                    timestamp: loc.timestamp,
                    source: loc.source
                },
                updatedAt: serverTimestamp() // Heartbeat
            });
        } catch (err) {
            console.error("Failed to update SOS location:", err);
        }
    };

    const handleSosClick = async () => {
        if (isSending || status === 'tracking') return;
        setIsSending(true);

        // 1. Create Event Immediately (Optimistic)
        let incidentId = await createSOSEvent(); // Created with null location initially
        
        if (!incidentId) {
            setIsSending(false);
            return;
        }

        toast({
            title: "SOS ACTIVATED",
            description: "Alert sent! acquiring precise location...",
            className: "bg-red-600 text-white border-none"
        });

        // 2. Try Immediate Fix (High Accuracy)
        try {
            const fix = await getImmediateFix();
            // Update the event with the first fix
            await updateSOSLocation(incidentId, fix);
        } catch (e) {
            console.warn("Immediate fix failed, relying on watcher...");
        }

        // 3. Start Live Tracking
        startTracking((newLoc) => {
            if (incidentId) {
                updateSOSLocation(incidentId, newLoc);
            }
        });

        setIsSending(false);
    };

    const handleStopTracking = () => {
        stopTracking();
        setActiveIncidentId(null);
        toast({
            title: "Tracking Stopped",
            description: "Location updates paused.",
        });
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
            {/* Confidence Dot */}
            {(status === 'tracking' || location) && (
                <div className={`absolute -top-2 right-0 w-3 h-3 rounded-full border border-white ${getIndicatorColor()} shadow-sm z-10`} />
            )}

            {status === 'tracking' ? (
                 <Button 
                    variant="default" 
                    size="lg" 
                    className="h-16 w-16 rounded-full shadow-xl bg-green-600 hover:bg-green-700 animate-pulse"
                    onClick={handleStopTracking}
                >
                    <div className="flex flex-col items-center">
                        <Send className="h-6 w-6" />
                        <span className="text-[8px] font-bold mt-1">SENDING</span>
                    </div>
                </Button>
            ) : (
                <Button 
                    variant="destructive" 
                    size="lg" 
                    className={`h-16 w-16 rounded-full shadow-xl ${isSending ? '' : 'animate-pulse hover:animate-none'}`}
                    onClick={handleSosClick}
                    disabled={isSending}
                >
                    {isSending ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="text-[8px] font-medium mt-1">INIT...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <AlertCircle className="h-6 w-6" />
                            <span className="text-[10px] font-bold">SOS</span>
                        </div>
                    )}
                </Button>
            )}
            
            {/* Live Status Feedback */}
            {status === 'tracking' && location && (
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] text-zinc-500 bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm mb-1">
                        ±{Math.round(location.accuracy)}m
                    </span>
                    <span className="text-[9px] text-green-600 font-medium">Live Tracking Active</span>
                 </div>
            )}
        </div>
    );
};
