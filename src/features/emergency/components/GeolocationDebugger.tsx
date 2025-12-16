
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "../hooks/useGeolocation";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, MapPin, AlertTriangle, User as UserIcon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@/lib/types";

interface GeolocationDebuggerProps {
    currentUser?: User | null;
}

export function GeolocationDebugger({ currentUser }: GeolocationDebuggerProps) {
    const { location, error, getCurrentCoordinates } = useGeolocation();
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await getCurrentCoordinates();
            setLastUpdated(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch on mount
    useEffect(() => {
        handleRefresh();
    }, []);

    // Helper to determine status color
    const getAccuracyColor = (acc: number | null) => {
        if (!acc) return "text-gray-500";
        if (acc < 20) return "text-green-500";
        if (acc < 100) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <Card className="w-80 bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl">
            <CardHeader className="pb-2 border-b border-zinc-800">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-400" />
                        Geo Debugger
                    </span>
                    {currentUser && (
                         <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400 max-w-[80px] truncate">{currentUser.displayName || 'Admin'}</span>
                            <Avatar className="h-6 w-6 border border-zinc-700">
                                <AvatarImage src={currentUser.photoURL || undefined} />
                                <AvatarFallback className="text-[10px] bg-zinc-800">{currentUser.displayName?.substring(0,2).toUpperCase() || 'AD'}</AvatarFallback>
                            </Avatar>
                         </div>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                {/* Coordinates Display */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                        <span>Latitude:</span>
                        <span className="font-mono text-zinc-100">{location.lat?.toFixed(6) || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                        <span>Longitude:</span>
                        <span className="font-mono text-zinc-100">{location.lng?.toFixed(6) || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                        <span>Accuracy:</span>
                        <span className={`font-mono ${getAccuracyColor(location.accuracy)}`}>
                            {location.accuracy ? `±${Math.round(location.accuracy)}m` : '---'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                        <span>Source:</span>
                        <span className={`font-mono ${location.source === 'high-accuracy' ? 'text-green-400' : 'text-orange-400'}`}>
                            {location.source === 'high-accuracy' ? 'GPS/High' : location.source === 'low-accuracy' ? 'IP/Cell' : '---'}
                        </span>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-200 leading-tight">{error}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-zinc-500">
                        {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'No data'}
                    </span>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRefresh}
                        disabled={loading}
                        className="h-7 text-xs border-zinc-700 hover:bg-zinc-800 bg-transparent text-zinc-300"
                    >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Refresh
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
