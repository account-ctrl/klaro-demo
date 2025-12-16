
import { User, EmergencyAlert } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Radio, Truck, Boxes, AlertTriangle, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useFixedAssets } from "@/hooks/use-assets";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

// Roles considered as Responders
const RESPONDER_ROLES = [
    'Barangay Tanod (BPSO - Barangay Public Safety Officer)',
    'Chief Tanod (Executive Officer)',
    'Lupon Member (Pangkat Tagapagkasundo)',
    'Driver / Ambulance Operator',
    'VAWC Desk Officer',
    'Barangay Health Worker (BHW)',
    'Eco-Aide / Street Sweeper',
    'Utility Worker'
];

export const ResponderStatusList = ({ responders }: { responders: User[] }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Correctly filter responders based on user prompt
    // 1. Must have a defined role (position or systemRole)
    // 2. Filter logic:
    //    - Has a position that is in the RESPONDER_ROLES list
    //    - OR has 'Responder' in their systemRole
    //    - OR has 'Tanod', 'Kagawad', or 'Responder' (case-insensitive) in their position string
    
    const responderList = useMemo(() => {
        if (!responders) return [];
        return responders.filter(u => {
            const position = u.position || '';
            const systemRole = u.systemRole || '';
            
            // Check direct match in predefined list
            const isPredefinedResponder = RESPONDER_ROLES.includes(position);
            
            // Check for keywords in position (flexible matching)
            const positionLower = position.toLowerCase();
            const hasResponderKeyword = positionLower.includes('tanod') || 
                                        positionLower.includes('kagawad') || 
                                        positionLower.includes('responder') ||
                                        positionLower.includes('driver') ||
                                        positionLower.includes('ambulance') ||
                                        positionLower.includes('health worker') ||
                                        positionLower.includes('bhw');

            // Check system role
            const isSystemResponder = systemRole === 'Responder';

            // Must satisfy at least one condition AND generally be an active user (optional but good practice)
            // Assuming we list all regardless of 'status' for visibility, but badge shows status.
            return isPredefinedResponder || hasResponderKeyword || isSystemResponder;
        });
    }, [responders]);

    if (isCollapsed) {
        return (
            <div className="flex justify-end w-full mb-4">
                <Button
                    variant="outline"
                    className="h-12 px-4 rounded-full bg-zinc-900 border-zinc-800 text-blue-400 hover:bg-zinc-800 hover:text-blue-300 shadow-xl flex items-center gap-3 transition-all duration-300"
                    onClick={() => setIsCollapsed(false)}
                    title="Available Responders"
                >
                    <Radio className="h-5 w-5 animate-pulse" />
                    <span className="font-semibold text-sm">Responders</span>
                    <Badge variant="secondary" className="ml-1 bg-blue-900/50 text-blue-300 hover:bg-blue-900/50">
                        {responderList.length}
                    </Badge>
                </Button>
            </div>
        );
    }

    return (
        <Card className="w-80 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-2xl rounded-xl overflow-hidden mb-4 pointer-events-auto flex-shrink-0 transition-all duration-300">
            <CardHeader className="py-3 px-4 bg-zinc-950/50 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2 text-blue-400">
                    <Radio className="h-4 w-4 animate-pulse" />
                    <h3 className="font-semibold text-sm text-zinc-100">Available Responders</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300 bg-blue-500/10">
                        {responderList.length}
                    </Badge>
                     <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-300" onClick={() => setIsCollapsed(true)}>
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                    <div className="p-2 space-y-1">
                        {responderList.length === 0 ? (
                            <div className="text-xs text-zinc-500 text-center py-4">No responders found.</div>
                        ) : (
                            responderList.map(responder => (
                                <div key={responder.userId} className="flex items-center justify-between text-sm p-2 hover:bg-zinc-800/50 rounded-lg transition-colors group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <Avatar className="h-8 w-8 ring-1 ring-zinc-700">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${responder.fullName}`} />
                                            <AvatarFallback className="bg-zinc-800 text-zinc-400">{responder.fullName?.substring(0, 1)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium text-xs text-zinc-200 truncate">{responder.fullName}</span>
                                            <span className="text-[10px] text-zinc-500 truncate">{responder.position || responder.systemRole}</span>
                                        </div>
                                    </div>
                                    <Badge
                                        className={`text-[10px] px-2 py-0.5 h-5 border-0 font-medium whitespace-nowrap ${
                                            responder.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                                            responder.status === 'Busy' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                                            'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                        }`}
                                    >
                                        {responder.status === 'Active' ? 'On Duty' : responder.status || 'Offline'}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

export const AssetList = () => {
    const { data: assets, isLoading } = useFixedAssets();
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (isCollapsed) {
        return (
             <div className="flex justify-end w-full mb-4">
                <Button
                    variant="outline"
                    className="h-12 px-4 rounded-full bg-zinc-900 border-zinc-800 text-emerald-400 hover:bg-zinc-800 hover:text-emerald-300 shadow-xl flex items-center gap-3 transition-all duration-300"
                    onClick={() => setIsCollapsed(false)}
                    title="Resources & Assets"
                >
                    <Boxes className="h-5 w-5" />
                    <span className="font-semibold text-sm">Assets</span>
                    <Badge variant="secondary" className="ml-1 bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900/50">
                        {assets ? assets.length : 0}
                    </Badge>
                </Button>
            </div>
        );
    }

    return (
        <Card className="w-80 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-2xl rounded-xl overflow-hidden pointer-events-auto flex-shrink-0 transition-all duration-300">
            <CardHeader className="py-3 px-4 bg-zinc-950/50 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2 text-emerald-400">
                    <Boxes className="h-4 w-4" />
                    <h3 className="font-semibold text-sm text-zinc-100">Resources & Assets</h3>
                </div>
                 <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
                        {assets ? assets.length : 0}
                    </Badge>
                     <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-300" onClick={() => setIsCollapsed(true)}>
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                    <div className="p-2 space-y-1">
                        {isLoading ? (
                             <div className="text-xs text-zinc-500 text-center py-4">Loading resources...</div>
                        ) : !assets || assets.length === 0 ? (
                            <div className="text-xs text-zinc-500 text-center py-4">No assets found.</div>
                        ) : (
                            assets.map(asset => (
                                <div key={asset.id} className="flex items-center justify-between text-sm p-2 hover:bg-zinc-800/50 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="h-8 w-8 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700 shrink-0">
                                            <Truck className="h-4 w-4 text-zinc-400" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium text-xs text-zinc-200 truncate">{asset.name}</span>
                                            <span className="text-[10px] text-zinc-500 truncate">{asset.category || 'Asset'}</span>
                                        </div>
                                    </div>
                                    <Badge
                                        className={`text-[10px] px-2 py-0.5 h-5 border-0 font-medium whitespace-nowrap ${
                                            asset.status === 'Available' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                                            asset.status === 'In Use' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                                            'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                        }`}
                                    >
                                        {asset.status}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

export const ActiveAlertFeed = ({ alerts, onSelectAlert, selectedAlertId }: { alerts: EmergencyAlert[], onSelectAlert: (id: string) => void, selectedAlertId: string | null }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (isCollapsed) {
        return (
             <div className="flex justify-end w-full mb-4">
                <Button
                    variant="outline"
                    className="h-12 px-4 rounded-full bg-zinc-900 border-zinc-800 text-red-400 hover:bg-zinc-800 hover:text-red-300 shadow-xl flex items-center gap-3 transition-all duration-300 relative overflow-hidden"
                    onClick={() => setIsCollapsed(false)}
                    title="Active Alerts"
                >
                    {alerts.length > 0 && <div className="absolute inset-0 bg-red-500/10 animate-pulse" />}
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold text-sm">Active Alerts</span>
                    <Badge variant="secondary" className="ml-1 bg-red-900/50 text-red-300 hover:bg-red-900/50">
                        {alerts.length}
                    </Badge>
                </Button>
            </div>
        );
    }

    return (
        <Card className="w-80 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-2xl rounded-xl overflow-hidden pointer-events-auto flex-shrink-0 transition-all duration-300">
            <CardHeader className="py-3 px-4 bg-zinc-950/50 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center justify-between gap-4 w-full">
                     <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="h-4 w-4 animate-pulse" />
                        <h3 className="font-semibold text-sm text-zinc-100">Active Alerts</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-red-500/30 text-red-300 bg-red-500/10">
                            {alerts.length} Active
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-300" onClick={() => setIsCollapsed(true)}>
                            <ChevronUp className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
             <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                    <div className="p-2 space-y-1">
                        {alerts.length === 0 ? (
                             <div className="text-xs text-zinc-500 text-center py-4">No active alerts.</div>
                        ) : (
                            alerts.map(alert => {
                                 const timeAgo = alert.timestamp ? formatDistanceToNow(alert.timestamp.toDate(), { addSuffix: true }) : 'Just now';
                                 const isSelected = selectedAlertId === alert.alertId;
                                 // Simplify Category Display
                                 const category = alert.category && alert.category !== 'Unspecified' ? alert.category : null;

                                return (
                                    <button 
                                        key={alert.alertId} 
                                        onClick={() => onSelectAlert(alert.alertId)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                                            isSelected 
                                            ? 'bg-red-900/20 border-red-500/30' 
                                            : 'bg-transparent border-transparent hover:bg-zinc-800/50'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-sm text-zinc-100 truncate max-w-[160px]">{alert.residentName}</span>
                                             <Badge variant={alert.status === 'New' ? 'destructive' : 'secondary'} className="text-[10px] h-5 px-1.5">
                                                {alert.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-zinc-400 truncate mb-2 line-clamp-1">{alert.message || 'No message provided.'}</p>
                                        
                                        <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                            <div className="flex items-center gap-1.5">
                                                {category && (
                                                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                        {category}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-zinc-500 font-medium">{timeAgo}</span>
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
             </CardContent>
        </Card>
    )
}
