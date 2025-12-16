
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useGeolocationTracker } from '../hooks/useGeolocation';
import { useState } from 'react';
import { Radio } from 'lucide-react';

export function OnDutyToggle() {
    const [isOnDuty, setIsOnDuty] = useState(false);
    const { location, error } = useGeolocationTracker(isOnDuty);

    return (
        <div className="flex items-center space-x-4 bg-zinc-900/80 backdrop-blur-md p-3 rounded-lg border border-zinc-800">
            <div className="flex items-center space-x-2">
                <Switch 
                    id="duty-mode" 
                    checked={isOnDuty}
                    onCheckedChange={setIsOnDuty}
                />
                <Label htmlFor="duty-mode" className="text-zinc-200 font-medium cursor-pointer">
                    Responder Mode
                </Label>
            </div>
            
            {isOnDuty && (
                <div className="flex items-center gap-2">
                    <Badge variant={location ? "default" : "outline"} className={location ? "bg-emerald-600 animate-pulse" : "text-zinc-500 border-zinc-600"}>
                        <Radio className="h-3 w-3 mr-1" />
                        {location ? "Broadcasting Location" : "Acquiring GPS..."}
                    </Badge>
                </div>
            )}
            
            {error && isOnDuty && (
                <span className="text-xs text-red-400 max-w-[150px] leading-tight">{error}</span>
            )}
        </div>
    );
}
