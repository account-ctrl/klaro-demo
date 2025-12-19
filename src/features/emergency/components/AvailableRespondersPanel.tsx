
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ResponderLocation, User } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, User as UserIcon } from "lucide-react";

interface AvailableRespondersPanelProps {
    responders: ResponderLocation[];
    users: User[];
}

export function AvailableRespondersPanel({ responders, users }: AvailableRespondersPanelProps) {
    // Threshold: 10 minutes in milliseconds
    // If a responder hasn't pinged in 10 mins, they are likely offline/stale.
    const STALE_THRESHOLD_MS = 10 * 60 * 1000;
    const now = Date.now();

    // 1. Map & Filter
    const activeResponders = responders
        .map(r => {
            const userProfile = users.find(u => u.userId === r.userId);
            return {
                ...r,
                userProfile, // Keep the profile for checking
                name: userProfile?.fullName || 'Unknown Officer',
                role: userProfile?.position || userProfile?.systemRole || 'Responder'
            };
        })
        // 2. Strict Tenant Scope Check: 
        // If userProfile is missing, it means this responder ID does NOT belong to the current tenant's user list.
        .filter(r => r.userProfile !== undefined)
        // 3. Stale Check: 
        // Filter out if last_active is older than threshold.
        .filter(r => {
            if (!r.last_active) return false;
            // Convert Firestore Timestamp to millis
            // Check if last_active is a valid Timestamp object
            if (typeof r.last_active.toMillis === 'function') {
                const lastActiveMs = r.last_active.toMillis();
                return (now - lastActiveMs) < STALE_THRESHOLD_MS;
            }
            return false;
        });

    return (
        <div className="bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg overflow-hidden flex flex-col max-h-[30vh]">
            <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-blue-900/20">
                <h3 className="font-semibold text-blue-200 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Responders On Duty
                </h3>
                <Badge className="bg-blue-600 hover:bg-blue-700">{activeResponders.length}</Badge>
            </div>
            <ScrollArea className="flex-1">
                {activeResponders.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500 text-sm">
                        No active responders online.
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800">
                        {activeResponders.map(responder => (
                            <div key={responder.userId} className="p-3 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                    <UserIcon className="h-4 w-4 text-zinc-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-medium text-white truncate">{responder.name}</p>
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    </div>
                                    <p className="text-xs text-zinc-400 truncate">{responder.role}</p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                        Active {responder.last_active && typeof responder.last_active.toDate === 'function' ? formatDistanceToNow(responder.last_active.toDate()) : 'recently'} ago
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
