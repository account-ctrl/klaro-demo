'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTenant } from '@/providers/tenant-provider';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Clock } from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

interface TimelineEvent {
    id: string;
    message: string;
    type: 'system' | 'manual';
    timestamp: any;
    authorName?: string;
}

export function IncidentTimeline({ alertId }: { alertId: string }) {
    const { tenantPath } = useTenant();
    const firestore = useFirestore();
    const { user } = useUser();
    const [newMessage, setNewMessage] = useState('');
    const scrollBottomRef = useRef<HTMLDivElement>(null); // Ref for the bottom anchor

    // Dynamic path for subcollection
    const timelineRef = useMemo(() => {
        if (!firestore || !tenantPath || !alertId) return null;
        const safePath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
        return collection(firestore, `${safePath}/emergency_alerts/${alertId}/timeline`);
    }, [firestore, tenantPath, alertId]);

    const q = useMemo(() => {
        return timelineRef ? query(timelineRef, orderBy('timestamp', 'asc')) : null;
    }, [timelineRef]);

    const { data: logs } = useCollection<TimelineEvent>(q);

    // Auto-scroll to bottom whenever logs update
    useEffect(() => {
        if (scrollBottomRef.current) {
            scrollBottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const handleSend = async () => {
        if (!newMessage.trim() || !timelineRef) return;
        
        try {
            await addDoc(timelineRef, {
                message: newMessage,
                type: 'manual',
                authorName: user?.displayName || 'Operator',
                timestamp: serverTimestamp()
            });
            setNewMessage('');
        } catch (e) {
            console.error("Failed to add note", e);
        }
    };

    return (
        <div className="flex flex-col h-64 border border-zinc-800 rounded-md bg-zinc-900/30">
            <div className="p-2 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3 h-3" /> Mission Log
            </div>
            
            <ScrollArea className="flex-1 p-3">
                <div className="space-y-3 pb-2">
                    {logs?.map((log) => (
                        <div key={log.id} className={cn(
                            "flex flex-col text-sm",
                            log.type === 'system' ? "items-center text-center my-4" : "items-start"
                        )}>
                            {log.type === 'system' ? (
                                <span className="text-[10px] text-zinc-500 italic bg-zinc-900/80 px-2 py-1 rounded-full border border-zinc-800/50">
                                    {log.message} • {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm') : ''}
                                </span>
                            ) : (
                                <div className="bg-zinc-800 text-zinc-200 px-3 py-2 rounded-lg rounded-tl-none max-w-[90%] border border-zinc-700/50">
                                    <p className="leading-tight">{log.message}</p>
                                    <div className="flex justify-between items-center mt-1 gap-2">
                                        <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">{log.authorName}</span>
                                        <span className="text-[9px] text-zinc-600">
                                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm') : '...'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {logs?.length === 0 && (
                        <div className="text-center text-zinc-600 text-xs py-10 italic">
                            No activity recorded yet.
                        </div>
                    )}
                    {/* Scroll Anchor */}
                    <div ref={scrollBottomRef} />
                </div>
            </ScrollArea>

            <div className="p-2 border-t border-zinc-800 flex gap-2">
                <Input 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    placeholder="Add operational note..." 
                    className="h-8 bg-zinc-950 border-zinc-800 text-xs focus-visible:ring-emerald-500/50"
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <Button size="sm" onClick={handleSend} className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">
                    <Send className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
}
