
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Resident, Household } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User as UserIcon, Home, Phone, Mail, BadgeInfo, Calendar, Briefcase, Users, ShieldCheck, FilePen, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const BARANGAY_ID = 'barangay_san_isidro';

const profileSchema = z.object({
  contactNumber: z.string().optional(),
  email: z.string().email({ message: 'Please enter a valid email.' }).optional().or(z.literal('')),
  occupation: z.string().optional(),
  civilStatus: z.enum(['Single', 'Married', 'Widowed', 'Separated']).optional(),
  address: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;


const getAge = (dateString: string) => {
    if (!dateString) return '';
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function ProfileDetail({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string | null, children?: React.ReactNode }) {
    return (
        <div className="flex items-start gap-4">
            <Icon className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                {children ? (
                    <div className="text-base font-semibold">{children}</div>
                ) : (
                    <p className="text-base font-semibold">{value || 'Not specified'}</p>
                )}
            </div>
        </div>
    );
}

export default function ResidentProfilePage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const [isEditMode, setIsEditMode] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const residentDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `/barangays/${BARANGAY_ID}/residents/${user.uid}`);
    }, [firestore, user]);

    const { data: resident, isLoading: isLoadingResident } = useDoc<Resident>(residentDocRef);
    
    const householdDocRef = useMemoFirebase(() => {
        if (!firestore || !resident?.householdId) return null;
        return doc(firestore, `/barangays/${BARANGAY_ID}/households/${resident.householdId}`);
    }, [firestore, resident?.householdId]);

    const { data: household, isLoading: isLoadingHousehold } = useDoc<Household>(householdDocRef);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            contactNumber: '',
            email: '',
            occupation: '',
            civilStatus: 'Single',
            address: '',
        }
    });

    useEffect(() => {
        if (resident) {
            form.reset({
                contactNumber: resident.contactNumber || '',
                email: resident.email || '',
                occupation: resident.occupation || '',
                civilStatus: resident.civilStatus || 'Single',
                address: resident.address || '',
            });
        }
    }, [resident, form]);

    const onSubmit = (data: ProfileFormValues) => {
        if (!residentDocRef) return;
        startTransition(() => {
            updateDocumentNonBlocking(residentDocRef, data);
            toast({
                title: "Profile Updated",
                description: "Your information has been successfully saved."
            });
            setIsEditMode(false);
        });
    }

    const isLoading = isUserLoading || isLoadingResident || isLoadingHousehold;

    if (isLoading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <div className="space-y-2">
                             <Skeleton className="h-6 w-48" />
                             <Skeleton className="h-4 w-64" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const fullName = resident ? `${resident.firstName} ${resident.middleName || ''} ${resident.lastName} ${resident.suffix || ''}`.replace(/\s+/g, ' ').trim() : (user?.displayName || 'Valued Resident');
    const avatarFallback = fullName.split(' ').map(n => n[0]).join('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">My Profile</h1>
        <p className="text-muted-foreground">
          Your personal information as recorded in the barangay.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarFallback className="text-2xl">{avatarFallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl">{fullName}</CardTitle>
                            <CardDescription>{user?.email || 'No email on record'}</CardDescription>
                        </div>
                    </div>
                     {!isEditMode ? (
                        <Button type="button" variant="outline" onClick={() => setIsEditMode(true)}>
                            <FilePen className="mr-2" /> Edit Profile
                        </Button>
                    ) : (
                         <div className="flex gap-2">
                             <Button type="button" variant="ghost" onClick={() => {
                                 setIsEditMode(false);
                                 form.reset(); // Revert changes
                             }}>
                                <X className="mr-2" /> Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 animate-spin" />} Save Changes
                            </Button>
                         </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <div>
                    <h4 className="mb-4 text-lg font-semibold text-primary">Personal Information</h4>
                    <div className="grid gap-6 md:grid-cols-2">
                        <ProfileDetail icon={UserIcon} label="Gender" value={resident?.gender} />
                        
                        {!isEditMode ? (
                            <ProfileDetail icon={BadgeInfo} label="Civil Status" value={resident?.civilStatus} />
                        ) : (
                            <FormField control={form.control} name="civilStatus" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Civil Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Single">Single</SelectItem>
                                            <SelectItem value="Married">Married</SelectItem>
                                            <SelectItem value="Widowed">Widowed</SelectItem>
                                            <SelectItem value="Separated">Separated</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}

                        <ProfileDetail icon={Calendar} label="Date of Birth" value={resident?.dateOfBirth ? `${new Date(resident.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (${getAge(resident.dateOfBirth)} y/o)` : 'N/A'} />
                        <ProfileDetail icon={UserIcon} label="Nationality" value={resident?.nationality} />
                        
                        {!isEditMode ? (
                             <ProfileDetail icon={Briefcase} label="Occupation" value={resident?.occupation} />
                        ) : (
                             <FormField control={form.control} name="occupation" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Occupation</FormLabel>
                                    <FormControl><Input {...field} placeholder="Your occupation" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}
                    </div>
                </div>

                <Separator />

                <div>
                    <h4 className="mb-4 text-lg font-semibold text-primary">Contact &amp; Residency</h4>
                    <div className="grid gap-6 md:grid-cols-2">
                         {!isEditMode ? (
                            <ProfileDetail icon={Home} label="Full Address" value={resident?.address} />
                         ) : (
                             <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Address</FormLabel>
                                    <FormControl><Input {...field} placeholder="Your full address" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                         )}
                        <ProfileDetail icon={Users} label="Household" value={household?.name} />
                         {!isEditMode ? (
                            <ProfileDetail icon={Phone} label="Contact Number" value={resident?.contactNumber} />
                         ) : (
                             <FormField control={form.control} name="contactNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Number</FormLabel>
                                    <FormControl><Input {...field} placeholder="Your mobile or landline number" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                         )}
                         {!isEditMode ? (
                            <ProfileDetail icon={Mail} label="Email Address" value={resident?.email} />
                         ) : (
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl><Input type="email" {...field} placeholder="your.email@example.com" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                         )}
                    </div>
                </div>
                <Separator />
                <div>
                    <h4 className="mb-4 text-lg font-semibold text-primary">Social Status</h4>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <ProfileDetail icon={ShieldCheck} label="Registered Voter?">
                        <Badge variant={resident?.isVoter ? "default" : "outline"}>{resident?.isVoter ? "Yes" : "No"}</Badge>
                        </ProfileDetail>
                        <ProfileDetail icon={ShieldCheck} label="4Ps Member?">
                        <Badge variant={resident?.is4ps ? "default" : "outline"}>{resident?.is4ps ? "Yes" : "No"}</Badge>
                        </ProfileDetail>
                        <ProfileDetail icon={ShieldCheck} label="PWD?">
                        <Badge variant={resident?.isPwd ? "destructive" : "outline"}>{resident?.isPwd ? "Yes" : "No"}</Badge>
                        </ProfileDetail>
                    </div>
                </div>

            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">To update your name or date of birth, please visit the barangay hall with a valid ID.</p>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
