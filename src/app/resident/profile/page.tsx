
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Resident, Household, ResidentAddress, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User as UserIcon, Home, Phone, Mail, BadgeInfo, Calendar, Briefcase, Users, ShieldCheck, FilePen, X, MapPin } from 'lucide-react';
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
import { useSmartGeolocation } from '@/lib/services/smart-geolocation';

// Updated Schema with Structured Address
const profileSchema = z.object({
  contactNumber: z.string().optional(),
  email: z.string().email({ message: 'Please enter a valid email.' }).optional().or(z.literal('')),
  occupation: z.string().optional(),
  civilStatus: z.enum(['Single', 'Married', 'Widowed', 'Separated']).optional(),
  
  // Structured Address Fields
  purok: z.string().min(1, { message: "Purok is required" }),
  street: z.string().min(1, { message: "Street is required" }),
  blockLot: z.string().optional(),
  unit: z.string().optional(),
  landmark: z.string().optional(),
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
    const [pinnedLocation, setPinnedLocation] = useState<{lat: number, lng: number, acc: number} | null>(null);

    // Get Tenant ID from User Profile first
    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [firestore, user]);
    const { data: userProfile } = useDoc<User>(userDocRef);
    const tenantId = userProfile?.tenantId;

    // Use Smart Geolocation Hook
    const { startLocating, location: smartLocation, loading: locating, error: geoError, status: geoStatus, stopWatching } = useSmartGeolocation();

    const residentDocRef = useMemoFirebase(() => {
        if (!firestore || !user || !tenantId) return null;
        // Construct path based on tenant logic: barangays/{tenantId}/residents/{uid}
        return doc(firestore, `/barangays/${tenantId}/residents/${user.uid}`);
    }, [firestore, user, tenantId]);

    const { data: resident, isLoading: isLoadingResident } = useDoc<Resident>(residentDocRef);
    
    const householdDocRef = useMemoFirebase(() => {
        if (!firestore || !resident?.householdId || !tenantId) return null;
        return doc(firestore, `/barangays/${tenantId}/households/${resident.householdId}`);
    }, [firestore, resident?.householdId, tenantId]);

    const { data: household, isLoading: isLoadingHousehold } = useDoc<Household>(householdDocRef);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            contactNumber: '',
            email: '',
            occupation: '',
            civilStatus: 'Single',
            purok: '',
            street: '',
            blockLot: '',
            unit: '',
            landmark: '',
        }
    });

    useEffect(() => {
        if (resident) {
            // Check if address is the new structured format
            const addr = resident.address;
            const isStructured = typeof addr === 'object' && addr !== null && 'purok' in addr;
            const structuredAddr = isStructured ? (addr as ResidentAddress) : null;

            form.reset({
                contactNumber: resident.contactNumber || '',
                email: resident.email || '',
                occupation: resident.occupation || '',
                civilStatus: resident.civilStatus || 'Single',
                purok: structuredAddr?.purok || '',
                street: structuredAddr?.mapAddress?.street || (typeof addr === 'string' ? addr : ''),
                blockLot: structuredAddr?.mapAddress?.blockLot || '',
                unit: structuredAddr?.mapAddress?.unit || '',
                landmark: structuredAddr?.mapAddress?.landmark || '',
            });

            if(structuredAddr?.coordinates) {
                setPinnedLocation({
                    lat: structuredAddr.coordinates.lat,
                    lng: structuredAddr.coordinates.lng,
                    acc: structuredAddr.coordinates.accuracy_meters
                });
            }
        }
    }, [resident, form]);

    // Handle Smart Geolocation updates
    useEffect(() => {
        if (smartLocation) {
             setPinnedLocation({
                lat: smartLocation.lat,
                lng: smartLocation.lng,
                acc: smartLocation.accuracy
            });

            if (smartLocation.isFinal) {
                toast({ 
                    title: "Location Pinned", 
                    description: `Accuracy: ±${Math.round(smartLocation.accuracy)} meters` 
                });
            }
        }
    }, [smartLocation]);

    useEffect(() => {
        if (geoError) {
             toast({ variant: "destructive", title: "Location Failed", description: geoError });
        }
    }, [geoError]);


    const handlePinLocation = () => {
        toast({ title: "Locating...", description: "Please wait while we get your precise location." });
        startLocating();
    };

    const onSubmit = (data: ProfileFormValues) => {
        if (!residentDocRef) return;
        
        // Construct the new ResidentAddress object
        const newAddress: ResidentAddress = {
            purok: data.purok,
            mapAddress: {
                street: data.street,
                blockLot: data.blockLot || '',
                unit: data.unit || '',
                landmark: data.landmark || ''
            },
            coordinates: {
                lat: pinnedLocation?.lat || 0,
                lng: pinnedLocation?.lng || 0,
                accuracy_meters: pinnedLocation?.acc || 0
            }
        };

        startTransition(() => {
            updateDocumentNonBlocking(residentDocRef, {
                contactNumber: data.contactNumber,
                email: data.email,
                occupation: data.occupation,
                civilStatus: data.civilStatus,
                address: newAddress // Save structured object
            });
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

    // Helper to display address
    const displayAddress = () => {
        if (!resident?.address) return 'Not specified';
        if (typeof resident.address === 'string') return resident.address;
        const a = resident.address as ResidentAddress;
        return `${a.mapAddress.unit ? a.mapAddress.unit + ', ' : ''}${a.mapAddress.blockLot ? a.mapAddress.blockLot + ', ' : ''}${a.mapAddress.street}, ${a.purok}`;
    }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">My Profile</h1>
        <p className="text-muted-foreground">
          Your personal information as recorded in the barangay.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-slate-100">
                            <AvatarFallback className="text-xl md:text-2xl bg-slate-100 text-slate-600">{avatarFallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-xl md:text-2xl">{fullName}</CardTitle>
                            <CardDescription>{user?.email || 'No email on record'}</CardDescription>
                        </div>
                    </div>
                     {!isEditMode ? (
                        <Button type="button" variant="outline" onClick={() => setIsEditMode(true)}>
                            <FilePen className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    ) : (
                         <div className="flex gap-2">
                             <Button type="button" variant="ghost" onClick={() => {
                                 setIsEditMode(false);
                                 form.reset(); // Revert changes
                                 stopWatching(); // Ensure geo watch is stopped if cancelled
                             }}>
                                <X className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                            </Button>
                         </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                
                {/* 1. PERSONAL INFO */}
                <div>
                    <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Personal Information</h4>
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

                {/* 2. RESIDENCY & LOCATION (New Structured Form) */}
                <div>
                    <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Residency &amp; Location</h4>
                    
                    {!isEditMode ? (
                        <div className="grid gap-6 md:grid-cols-2">
                             <ProfileDetail icon={Home} label="Address" value={displayAddress()} />
                             <ProfileDetail icon={MapPin} label="Pinned Location">
                                {pinnedLocation ? (
                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                        GPS Pinned (±{Math.round(pinnedLocation.acc)}m)
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-slate-500">No GPS Pin</Badge>
                                )}
                             </ProfileDetail>
                             <ProfileDetail icon={Users} label="Household" value={household?.name} />
                             <ProfileDetail icon={Phone} label="Contact" value={resident?.contactNumber} />
                        </div>
                    ) : (
                        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                             {/* Purok Selector */}
                             <FormField control={form.control} name="purok" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Purok / Zone</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select Purok" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Purok 1">Purok 1</SelectItem>
                                            <SelectItem value="Purok 2">Purok 2</SelectItem>
                                            <SelectItem value="Purok 3">Purok 3</SelectItem>
                                            <SelectItem value="Purok 4">Purok 4</SelectItem>
                                            <SelectItem value="Purok 5">Purok 5</SelectItem>
                                            <SelectItem value="Purok 6">Purok 6</SelectItem>
                                            <SelectItem value="Purok 7">Purok 7</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Map Address Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="street" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Street Name</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. Rizal St." className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="blockLot" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Block &amp; Lot (Optional)</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. Blk 5 Lot 2" className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="unit" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unit / Apt / Room (Optional)</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. Apt 4B" className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="landmark" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nearest Landmark</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. Near Bakery" className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            {/* GPS Pin */}
                            <div className="pt-2">
                                <FormLabel className="block mb-2">GPS Location</FormLabel>
                                <div className="flex items-center gap-3">
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        onClick={handlePinLocation} 
                                        size="sm" 
                                        className="bg-white border border-slate-200 hover:bg-slate-100"
                                        disabled={locating}
                                    >
                                        {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4 text-red-500" />}
                                        {locating ? (geoStatus === 'improving' ? "Refining..." : "Locating...") : (pinnedLocation ? "Update GPS Pin" : "Pin My Location")}
                                    </Button>
                                    {pinnedLocation && (
                                        <div className="flex flex-col">
                                             <span className="text-xs text-green-600 font-medium">
                                                ✓ Lat: {pinnedLocation.lat.toFixed(6)}, Lng: {pinnedLocation.lng.toFixed(6)}
                                            </span>
                                            {locating && (
                                                <span className="text-[10px] text-muted-foreground animate-pulse">
                                                    Improving accuracy... (±{Math.round(pinnedLocation.acc)}m)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">This helps responders find you during emergencies.</p>
                            </div>

                            <Separator className="my-2" />
                            
                            {/* Contact Info */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="contactNumber" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Number</FormLabel>
                                        <FormControl><Input {...field} placeholder="09xxxxxxxxx" className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl><Input type="email" {...field} placeholder="email@example.com" className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                             </div>
                        </div>
                    )}
                </div>

                <Separator />

                {/* 3. SOCIAL STATUS */}
                <div>
                    <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Social Status</h4>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <ProfileDetail icon={ShieldCheck} label="Registered Voter?">
                        <Badge variant={resident?.isVoter ? "default" : "outline"} className={resident?.isVoter ? "bg-blue-600" : ""}>{resident?.isVoter ? "Yes" : "No"}</Badge>
                        </ProfileDetail>
                        <ProfileDetail icon={ShieldCheck} label="4Ps Member?">
                        <Badge variant={resident?.is4ps ? "default" : "outline"} className={resident?.is4ps ? "bg-amber-600" : ""}>{resident?.is4ps ? "Yes" : "No"}</Badge>
                        </ProfileDetail>
                        <ProfileDetail icon={ShieldCheck} label="PWD?">
                        <Badge variant={resident?.isPwd ? "destructive" : "outline"}>{resident?.isPwd ? "Yes" : "No"}</Badge>
                        </ProfileDetail>
                    </div>
                </div>

            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">To update critical data like Name or Birthdate, please visit the Barangay Hall.</p>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
