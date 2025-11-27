'use client';

import React from 'react';
import { useHouseholds, useResidents } from '@/hooks/use-barangay-data';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { User, Baby, BriefcaseMedical, Accessibility } from 'lucide-react';

interface HouseholdMembersSheetProps {
    householdId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function HouseholdMembersSheet({ householdId, open, onOpenChange }: HouseholdMembersSheetProps) {
    const { data: households } = useHouseholds();
    const { data: residents } = useResidents();

    const household = households?.find(h => h.householdId === householdId);
    
    const members = React.useMemo(() => {
        if (!residents || !householdId) return [];
        return residents.filter(r => r.householdId === householdId);
    }, [residents, householdId]);

    const stats = React.useMemo(() => {
        const result = {
            total: members.length,
            pwd: 0,
            pregnant: 0,
            children: 0,
            seniors: 0,
        };

        const today = new Date();

        members.forEach(member => {
            if (member.isPwd || member.vulnerability_tags?.includes('PWD')) result.pwd++;
            if (member.vulnerability_tags?.includes('Pregnant')) result.pregnant++;
            
            if (member.dateOfBirth) {
                const birthDate = new Date(member.dateOfBirth);
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                if (age < 18) result.children++;
                if (age >= 60) result.seniors++;
            }
        });

        return result;
    }, [members]);

    if (!household) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader className="pb-4">
                    <SheetTitle>{household.name || 'Household Details'}</SheetTitle>
                    <SheetDescription>{household.address}</SheetDescription>
                </SheetHeader>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center p-4">
                            <span className="text-2xl font-bold">{stats.total}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> Total Members
                            </span>
                        </CardContent>
                    </Card>
                    <div className="grid grid-cols-2 gap-2">
                         <div className="bg-muted p-2 rounded-md flex flex-col items-center justify-center">
                            <span className="font-bold text-lg">{stats.children}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Baby className="h-3 w-3" /> Children
                            </span>
                         </div>
                         <div className="bg-muted p-2 rounded-md flex flex-col items-center justify-center">
                            <span className="font-bold text-lg">{stats.seniors}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> Seniors
                            </span>
                         </div>
                         <div className="bg-muted p-2 rounded-md flex flex-col items-center justify-center">
                            <span className="font-bold text-lg">{stats.pwd}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Accessibility className="h-3 w-3" /> PWD
                            </span>
                         </div>
                         <div className="bg-muted p-2 rounded-md flex flex-col items-center justify-center">
                            <span className="font-bold text-lg">{stats.pregnant}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <BriefcaseMedical className="h-3 w-3" /> Pregnant
                            </span>
                         </div>
                    </div>
                </div>

                <h3 className="font-semibold mb-2 text-sm">Members</h3>
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                        {members.map(member => (
                            <div key={member.residentId} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <div className="font-medium text-sm">
                                        {member.firstName} {member.lastName}
                                        {member.is_head_of_family && <Badge variant="secondary" className="ml-2 text-[10px]">Head</Badge>}
                                    </div>
                                    <div className="text-xs text-muted-foreground capitalize">
                                        {member.gender} • {calculateAge(member.dateOfBirth)} years old
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {member.isPwd && <Badge variant="outline" className="text-[10px]">PWD</Badge>}
                                    {member.vulnerability_tags?.includes('Pregnant') && <Badge variant="outline" className="text-[10px]">Pregnant</Badge>}
                                    {calculateAge(member.dateOfBirth) >= 60 && <Badge variant="outline" className="text-[10px]">Senior</Badge>}
                                </div>
                            </div>
                        ))}
                        {members.length === 0 && (
                            <div className="text-center text-muted-foreground text-sm py-4">
                                No members assigned to this household.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

function calculateAge(dobString?: string): number {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
