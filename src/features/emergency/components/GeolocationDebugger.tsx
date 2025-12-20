
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSOSLocation } from "../hooks/useSOSLocation";
import { useEffect, useState, useRef } from "react";
import { Loader2, RefreshCw, MapPin, AlertTriangle, User as UserIcon, Terminal } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GeolocationDebuggerProps {
    currentUser?: User | null;
}

export function GeolocationDebugger({ currentUser }: GeolocationDebuggerProps) {
    const { location, error, getImmediateFix } = useSOSLocation();
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await getImmediateFix();
            setLastUpdated(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Intercept console.log to display in the debugger
    useEffect(() => {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const logToState = (type: string, args: any[]) => {
             const message = args.map(arg => {
                if (typeof arg === 'object') {
                    return JSON.stringify(arg, null, 2);
                }
                return String(arg);
            }).join(' ');
            
            // Only capture relevant logs for MapAutoFocus and Geolocation
            if (message.includes('[MapAutoFocus]') || message.includes('Geolocation')) {
                 setLogs(prev => [...prev, `[${type.toUpperCase()}] ${message}`]);
            }
        };

        console.log = (...args) => {
            logToState('info', args);
            originalLog(...args);
        };
        
        console.warn = (...args) => {
             logToState('warn', args);
             originalWarn(...args);
        }

        console.error = (...args) => {
             logToState('error', args);
             originalError(...args);
        }

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, []);

    // Auto-scroll to bottom of logs
    useEffect(() => {
        if (scrollAreaRef.current) {
             const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
             if (scrollContainer) {
                 scrollContainer.scrollTop = scrollContainer.scrollHeight;
             }
        }
    }, [logs]);


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
        <Card className="w-96 bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl max-h-[80vh] flex flex-col">
            <CardHeader className="pb-2 border-b border-zinc-800 shrink-0">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-400" />
                        Geo Debugger
                    </span>
                    {currentUser && (
                         <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400 max-w-[140px] truncate">{currentUser.displayName || 'Admin'}</span>
                            <Avatar className="h-6 w-6 border border-zinc-700">
                                <AvatarImage src={currentUser.photoURL || undefined} />
                                <AvatarFallback className="text-[10px] bg-zinc-800">{currentUser.displayName?.substring(0,2).toUpperCase() || 'AD'}</AvatarFallback>
                            </Avatar>
                         </div>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 overflow-hidden flex flex-col">
                {/* Coordinates Display */}
                <div className="space-y-2 shrink-0">
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                        <span>Latitude:</span>
                        <span className="font-mono text-zinc-100">{location?.lat?.toFixed(6) || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                        <span>Longitude:</span>
                        <span className="font-mono text-zinc-100">{location?.lng?.toFixed(6) || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                        <span>Accuracy:</span>
                        <span className={`font-mono ${getAccuracyColor(location?.accuracy || null)}`}>
                            {location?.accuracy ? `±${Math.round(location.accuracy)}m` : '---'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                        <span>Source:</span>
                        <span className={`font-mono ${location?.source === 'gps' ? 'text-green-400' : 'text-orange-400'}`}>
                            {location?.source === 'gps' ? 'GPS/High' : location?.source === 'network' ? 'IP/Cell' : '---'}
                        </span>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2 flex items-start gap-2 shrink-0">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-200 leading-tight">{error}</p>
                    </div>
                )}
                
                {/* Console Logs Display */}
                <div className="flex flex-col gap-1 flex-1 min-h-[150px] border-t border-zinc-800 pt-2">
                     <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                        <Terminal className="h-3 w-3" />
                        <span>Console Logs</span>
                     </div>
                     <ScrollArea className="h-40 w-full rounded border border-zinc-800 bg-black/50 p-2" ref={scrollAreaRef}>
                        <div className="space-y-1">
                            {logs.length === 0 ? (
                                <span className="text-xs text-zinc-600 italic">No logs captured yet...</span>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="text-[10px] font-mono whitespace-pre-wrap break-words text-zinc-300 border-b border-zinc-800/50 pb-1 last:border-0">
                                        {log}
                                    </div>
                                ))
                            )}
                        </div>
                     </ScrollArea>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 shrink-0">
                    <span className="text-[10px] text-zinc-500">
                        {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'No data'}
                    </span>
                    <div className="flex gap-2">
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLogs([])}
                            className="h-7 text-xs text-zinc-500 hover:text-zinc-300"
                        >
                            Clear Logs
                        </Button>
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
                </div>
            </CardContent>
        </Card>
    );
}
