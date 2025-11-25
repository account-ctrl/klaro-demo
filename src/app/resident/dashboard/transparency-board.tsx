'use client';

import React, { useMemo } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Landmark, TrendingUp, CalendarDays } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';

const BARANGAY_ID = 'barangay_san_isidro';

interface Project {
    id: string;
    title: string;
    description: string;
    status: string;
    startDate: any;
    endDate?: any;
    budget: number;
    budgetSpent?: number;
    completionPercentage?: number;
}

export function TransparencyBoard() {
    const firestore = useFirestore();
    
    // Fetch Active Projects
    const projectsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, `/barangays/${BARANGAY_ID}/projects`),
            where('status', 'in', ['Ongoing', 'Planning', 'Completed']),
            orderBy('startDate', 'desc'),
            limit(3)
        );
    }, [firestore]);

    const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-green-500';
            case 'Ongoing': return 'bg-blue-500';
            case 'Planning': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5" /> Transparency Board
                </CardTitle>
                <CardDescription>Updates on barangay projects and initiatives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading && [...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-2 w-full" />
                    </div>
                ))}
                
                {!isLoading && projects && projects.length > 0 ? projects.map(project => (
                    <div key={project.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold text-sm">{project.title}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] h-5">{project.status}</Badge>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span>{project.completionPercentage || 0}%</span>
                            </div>
                            <Progress value={project.completionPercentage || 0} className="h-2" />
                        </div>
                        
                        <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {project.startDate ? format(project.startDate.toDate(), 'MMM yyyy') : 'TBD'}
                            </span>
                            {/* Only show budget if we want full transparency, maybe optional? */}
                            {/* <span className="font-mono">₱{project.budget?.toLocaleString()}</span> */}
                        </div>
                    </div>
                )) : (
                    !isLoading && <div className="text-center text-muted-foreground py-8">No active projects to display.</div>
                )}
            </CardContent>
        </Card>
    );
}
