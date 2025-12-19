
'use client';

import React from 'react';
import { useHouseholds, useResidents } from '@/hooks/use-barangay-data';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { User, Baby, BriefcaseMedical, Accessibility, MapPin, Zap, Droplets, Home as HomeIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-xl">{household.name || 'Household Details'}</SheetTitle>
                        <Badge variant={household.status === 'Verified' ? 'default' : 'secondary'}>
                            {household.status || 'Unverified'}
                        </Badge>
                    </div>
                    <SheetDescription className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3.5 w-3.5" />
                        {household.address}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Demographics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="col-span-2 sm:col-span-1 border-none shadow-none bg-muted/30">
                            <CardContent className="flex flex-col items-center justify-center p-4">
                                <span className="text-3xl font-bold text-primary">{stats.total}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium mt-1">
                                    Total Members
                                </span>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                            <StatBox icon={<Baby className="h-3 w-3" />} label="Children" value={stats.children} />
                            <StatBox icon={<User className="h-3 w-3" />} label="Seniors" value={stats.seniors} />
                            <StatBox icon={<Accessibility className="h-3 w-3" />} label="PWD" value={stats.pwd} />
                            <StatBox icon={<BriefcaseMedical className="h-3 w-3" />} label="Pregnant" value={stats.pregnant} />
                        </div>
                    </div>

                    <Separator />

                    {/* Housing Info */}
                    <div className="space-y-3">
                         <h3 className="font-semibold text-sm flex items-center gap-2">
                            <HomeIcon className="h-4 w-4 text-muted-foreground"/> Housing & Utilities
                         </h3>
                         <div className="grid grid-cols-2 gap-y-2 text-sm">
                             <InfoRow label="Material" value={household.housing_material} />
                             <InfoRow label="Tenure" value={household.tenure_status} />
                             <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                                 <Droplets className="h-3.5 w-3.5 text-blue-500" />
                                 <span className="text-muted-foreground">Water:</span>
                                 <span className="font-medium">{household.water_source || 'N/A'}</span>
                             </div>
                             <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                                 <Zap className="h-3.5 w-3.5 text-yellow-500" />
                                 <span className="text-muted-foreground">Power:</span>
                                 <span className="font-medium">{household.electricity || 'N/A'}</span>
                             </div>
                         </div>
                    </div>

                    <Separator />

                    {/* Members List */}
                    <div>
                        <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                             <User className="h-4 w-4 text-muted-foreground"/> Household Members
                        </h3>
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-3">
                                {members.map(member => (
                                    <div key={member.residentId} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {member.firstName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm flex items-center gap-2">
                                                    {member.firstName} {member.lastName}
                                                    {member.is_head_of_family && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Head</Badge>}
                                                </div>
                                                <div className="text-xs text-muted-foreground capitalize">
                                                    {member.gender} • {calculateAge(member.dateOfBirth)} yrs
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 flex-wrap justify-end max-w-[100px]">
                                            {member.isPwd && <Badge variant="outline" className="text-[10px] border-orange-200 text-orange-700 bg-orange-50">PWD</Badge>}
                                            {member.vulnerability_tags?.includes('Pregnant') && <Badge variant="outline" className="text-[10px] border-pink-200 text-pink-700 bg-pink-50">Pregnant</Badge>}
                                            {calculateAge(member.dateOfBirth) >= 60 && <Badge variant="outline" className="text-[10px] border-slate-200 bg-slate-100">Senior</Badge>}
                                        </div>
                                    </div>
                                ))}
                                {members.length === 0 && (
                                    <div className="text-center text-muted-foreground text-sm py-8 border-2 border-dashed rounded-lg">
                                        No members assigned to this household.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
    return (
        <div className="bg-muted/40 p-2 rounded-md flex flex-col items-center justify-center border">
            <span className="font-bold text-lg text-foreground">{value}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                {icon} {label}
            </span>
        </div>
    )
}

function InfoRow({ label, value }: { label: string, value?: string }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium">{value || 'N/A'}</span>
        </div>
    )
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
