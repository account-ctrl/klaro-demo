
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { EmergencyAlert } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Siren } from "lucide-react";

interface ActiveAlertsPanelProps {
    alerts: EmergencyAlert[];
    onSelect: (id: string) => void;
}

export function ActiveAlertsPanel({ alerts, onSelect }: ActiveAlertsPanelProps) {
    if (alerts.length === 0) {
        return (
            <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-lg p-4 text-center text-zinc-500 text-sm">
                No active incidents.
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg overflow-hidden flex flex-col max-h-[40vh]">
            <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-red-900/20">
                <h3 className="font-semibold text-red-200 flex items-center gap-2">
                    <Siren className="h-4 w-4 animate-pulse" />
                    Active Incidents
                </h3>
                <Badge variant="destructive">{alerts.length}</Badge>
            </div>
            <ScrollArea className="flex-1">
                <div className="divide-y divide-zinc-800">
                    {alerts.map(alert => (
                        <div 
                            key={alert.alertId}
                            onClick={() => onSelect(alert.alertId)}
                            className="p-3 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-white">{alert.category || 'Emergency'}</span>
                                <span className="text-xs text-zinc-400">
                                    {alert.timestamp ? formatDistanceToNow(alert.timestamp.toDate(), {addSuffix: true}) : 'Just now'}
                                </span>
                            </div>
                            <div className="text-sm text-zinc-400 truncate">
                                {alert.description || alert.message || 'No details provided'}
                            </div>
                            <div className="mt-2 flex gap-2">
                                <Badge variant="outline" className={`text-xs ${
                                    alert.status === 'New' ? 'border-red-500 text-red-500' : 
                                    alert.status === 'Acknowledged' ? 'border-yellow-500 text-yellow-500' : 
                                    'border-blue-500 text-blue-500'
                                }`}>
                                    {alert.status}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
