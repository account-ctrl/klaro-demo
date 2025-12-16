
import { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGeolocation } from '../hooks/useGeolocation';
import { useFirestore } from '@/firebase/client-provider'; 
import { useTenant } from '@/providers/tenant-provider';
import { useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

export function OnDutyToggle() {
    const [isOnDuty, setIsOnDuty] = useState(false);
    const { location, startWatching, stopWatching, error } = useGeolocation();
    const firestore = useFirestore(); // Corrected usage: useFirestore returns the instance now, or we check imports
    const { tenantPath } = useTenant();
    const { user } = useUser();

    // Toggle Handler
    const handleToggle = (checked: boolean) => {
        setIsOnDuty(checked);
        if (checked) {
            startWatching();
        } else {
            stopWatching();
            // Mark as offline
            if (firestore && tenantPath && user) {
                const ref = doc(firestore, `${tenantPath}/responder_locations/${user.uid}`);
                updateDoc(ref, { status: "Offline" }).catch(console.error);
            }
        }
    };

    // Effect to write location to Firestore when it changes
    useEffect(() => {
        if (isOnDuty && location.lat && location.lng && firestore && tenantPath && user) {
            const writeLocation = async () => {
                const ref = doc(firestore, `${tenantPath}/responder_locations/${user.uid}`);
                await setDoc(ref, {
                    userId: user.uid,
                    // role: role || "barangay_official", // Should fetch actual role
                    availability: "ON_DUTY",
                    status: "On Duty", // Add status field for consistency
                    last_active: serverTimestamp(),
                    latitude: location.lat,
                    longitude: location.lng,
                    accuracy: location.accuracy
                }, { merge: true });
            };
            writeLocation();
        }
    }, [location, isOnDuty, firestore, tenantPath, user]);

    return (
        <div className="flex items-center space-x-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800">
            <Switch id="responder-mode" checked={isOnDuty} onCheckedChange={handleToggle} />
            <div className="flex flex-col">
                <Label htmlFor="responder-mode" className="text-white text-xs font-semibold">Responder Mode</Label>
                <span className="text-[10px] text-zinc-400">
                    {isOnDuty ? (error ? "Locating Error" : "Broadcasting Location") : "Offline"}
                </span>
            </div>
        </div>
    );
}
