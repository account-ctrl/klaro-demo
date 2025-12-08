
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import React, { useEffect } from 'react';
import OfficialsList from './officials-management/officials-list';
import { Separator } from '@/components/ui/separator';
import PurokList from './puroks/purok-list';
import DocumentTypeList from './documents/document-type-list';
import TemplateList from './templates/template-list';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProgramsList from './programs/programs-list';
import { useTenantProfile } from '@/hooks/use-tenant-profile';
import { updateDoc } from 'firebase/firestore';
import { getRegionName } from '@/lib/data/psgc'; // Use Region Utility
import TerritoryEditor from '@/components/settings/TerritoryEditor';

const profileFormSchema = z.object({
  barangayName: z.string().min(1, "Barangay name is required"),
  city: z.string().min(1, "City/Municipality is required"),
  province: z.string().min(1, "Province is required"),
  region: z.string().optional(),
  zipCode: z.string().optional(),
  barangayHallAddress: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  logoUrl: z.string().optional(), // simplified for now (base64 or url)
  cityLogoUrl: z.string().optional(),
});

const financialFormSchema = z.object({
    orSeriesStart: z.string().min(1, "Starting OR number is required."),
    orSeriesEnd: z.string().min(1, "Ending OR number is required."),
});

const systemFormSchema = z.object({
    paperSize: z.enum(['A4', 'Letter']),
    pickupSmsTemplate: z.string().min(10, "Template is too short."),
    sosSmsTemplate: z.string().min(10, "Template is too short."),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type FinancialFormValues = z.infer<typeof financialFormSchema>;
type SystemFormValues = z.infer<typeof systemFormSchema>;

export default function SettingsPage() {
    const { toast } = useToast();
    const { profile, isLoading, docRef } = useTenantProfile();
    
    const [isProfilePending, startProfileTransition] = React.useTransition();
    const [isFinancialPending, startFinancialTransition] = React.useTransition();
    const [isSystemPending, startSystemTransition] = React.useTransition();

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            barangayName: "",
            city: "",
            province: "",
            region: "",
            zipCode: "",
            barangayHallAddress: "",
            contactNumber: "",
            email: "",
            logoUrl: "",
            cityLogoUrl: "",
        },
    });

     const financialForm = useForm<FinancialFormValues>({
        resolver: zodResolver(financialFormSchema),
        defaultValues: {
            orSeriesStart: "10500",
            orSeriesEnd: "11000",
        },
    });

     const systemForm = useForm<SystemFormValues>({
        resolver: zodResolver(systemFormSchema),
        defaultValues: {
            paperSize: "A4",
            pickupSmsTemplate: "KlaroBarangay: Your {DOC_TYPE} is now ready for pickup. Please bring a valid ID. Thank you!",
            sosSmsTemplate: "KLARO-SOS: Emergency alert from {RESIDENT_NAME} at {LOCATION}. Assigned tanod, please respond immediately.",
        },
    });

    // Hydrate forms when profile loads
    useEffect(() => {
        if (profile) {
            // NOTE: The provisioning API logic puts data in `profile.settings` or `profile` root?
            // The `api/admin/provision` puts basic data in `vault/settings/general`
            // Let's ensure we map it correctly.
            // Some old logic might put data in root of vault.
            
            // If Region is missing in settings, try to infer it if we have province code logic,
            // or rely on what was saved during onboarding.
            
            profileForm.reset({
                barangayName: profile.barangayName || profile.name || "",
                city: profile.location?.city || profile.city || "",
                province: profile.location?.province || profile.province || "",
                region: profile.location?.region || profile.region || "", // Ensure this maps
                zipCode: profile.location?.zipCode || profile.zipCode || "",
                barangayHallAddress: profile.barangayHallAddress || "",
                contactNumber: profile.contactNumber || "",
                email: profile.email || "",
                logoUrl: profile.logoUrl || "",
                cityLogoUrl: profile.cityLogoUrl || "",
            });

            if (profile.settings) {
                systemForm.reset({
                    paperSize: profile.settings.paperSize || "A4",
                    pickupSmsTemplate: profile.settings.pickupSmsTemplate || "KlaroBarangay: Your {DOC_TYPE} is now ready for pickup. Please bring a valid ID. Thank you!",
                    sosSmsTemplate: profile.settings.sosSmsTemplate || "KLARO-SOS: Emergency alert from {RESIDENT_NAME} at {LOCATION}. Assigned tanod, please respond immediately."
                });
            }
        }
    }, [profile, profileForm, systemForm]);

    function onProfileSubmit(data: ProfileFormValues) {
        if (!docRef) return;
        startProfileTransition(async () => {
            try {
                // Update both root metadata and structured location for compatibility
                await updateDoc(docRef, {
                    barangayName: data.barangayName,
                    'location.city': data.city,
                    'location.province': data.province,
                    'location.region': data.region,
                    'location.zipCode': data.zipCode,
                    // Legacy/Root fallbacks
                    name: data.barangayName,
                    city: data.city,
                    province: data.province,
                    region: data.region,
                    // Other fields
                    barangayHallAddress: data.barangayHallAddress,
                    contactNumber: data.contactNumber,
                    email: data.email,
                    logoUrl: data.logoUrl,
                    cityLogoUrl: data.cityLogoUrl
                });
                toast({ title: "Settings Saved", description: "Your barangay profile has been updated." });
            } catch (error) {
                console.error(error);
                toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
            }
        });
    }

    function onFinancialSubmit(data: FinancialFormValues) {
        startFinancialTransition(() => {
            setTimeout(() => {
                console.log(data);
                toast({ title: "Financial Settings Saved", description: "Your treasury settings have been updated." });
            }, 1000);
        });
    }

     function onSystemSubmit(data: SystemFormValues) {
        if (!docRef) return;
        startSystemTransition(async () => {
            try {
                // Merge with existing settings
                await updateDoc(docRef, {
                    'settings.paperSize': data.paperSize,
                    'settings.pickupSmsTemplate': data.pickupSmsTemplate,
                    'settings.sosSmsTemplate': data.sosSmsTemplate
                });
                toast({ title: "System Settings Saved", description: "Your system and notification settings have been updated." });
            } catch (error) {
                console.error(error);
                toast({ title: "Error", description: "Failed to update system settings.", variant: "destructive" });
            }
        });
    }
    
    async function onTerritorySave(boundary: {lat: number, lng: number}[]) {
        if (!docRef) return;
        
        try {
            await updateDoc(docRef, {
                'territory.boundary': boundary
            });
            toast({ title: "Boundary Saved", description: "Your jurisdiction boundary has been updated." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save boundary.", variant: "destructive" });
        }
    }

  if (isLoading) {
      return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your barangay's profile, officials, and system settings.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="profile">Barangay Profile</TabsTrigger>
          <TabsTrigger value="puroks">Puroks</TabsTrigger>
          <TabsTrigger value="territory">Territory</TabsTrigger>
          <TabsTrigger value="officials">Officials &amp; Staff</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Barangay Identity &amp; Letterhead</CardTitle>
              <CardDescription>
                This information populates the header and footer of all generated documents and reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                  
                  <div className="space-y-4">
                     <h4 className="font-semibold text-primary">Official Details</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={profileForm.control}
                          name="barangayName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Barangay Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Barangay San Antonio" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City / Municipality</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Pasig City"/>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                         <FormField
                          control={profileForm.control}
                          name="province"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Province</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Metro Manila"/>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={profileForm.control}
                          name="region"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Region</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., NCR"/>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                          control={profileForm.control}
                          name="barangayHallAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Barangay Hall Address</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="The specific street address used on official forms."/>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      <div className="grid gap-4 sm:grid-cols-2">
                         <FormField
                          control={profileForm.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip Code</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                            control={profileForm.control}
                            name="contactNumber"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Official Contact Number</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Hotline/Landline for public display"/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                      </div>
                       <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Official Email Address</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Used for system notifications and public inquiries"/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                     <h4 className="font-semibold text-primary">Branding &amp; Logos</h4>
                     <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={profileForm.control}
                            name="logoUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Barangay Logo URL (or Base64)</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="https://... or data:image/..." />
                                </FormControl>
                                <FormDescription>URL to a high-resolution PNG/JPG of the barangay logo.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={profileForm.control}
                            name="cityLogoUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>City/Municipal Logo URL</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                 <FormDescription>URL to a high-resolution PNG/JPG of the city/municipal logo.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                     </div>
                  </div>
                  
                  <Button type="submit" disabled={isProfilePending}>
                    {isProfilePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="puroks">
           <Card>
            <CardHeader>
                <CardTitle>Geographic Divisions</CardTitle>
                <CardDescription>Manage the Puroks, Sitios, or Zones within your barangay.</CardDescription>
            </CardHeader>
            <CardContent>
                <PurokList />
            </CardContent>
           </Card>
        </TabsContent>
        <TabsContent value="territory">
            <Card>
                <CardHeader>
                    <CardTitle>Territorial Jurisdiction</CardTitle>
                    <CardDescription>Define the official map boundary of your barangay.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TerritoryEditor 
                        initialBoundary={profile?.territory?.boundary} 
                        onSave={onTerritorySave}
                    />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="officials">
           <Card>
            <CardHeader>
                <CardTitle>Officials &amp; Staff</CardTitle>
                <CardDescription>Manage user accounts, positions, and system permissions.</CardDescription>
            </CardHeader>
            <CardContent>
                <OfficialsList />
            </CardContent>
           </Card>
        </TabsContent>
         <TabsContent value="documents">
            <Card>
                <CardHeader>
                    <CardTitle>Document &amp; Certificate Configuration</CardTitle>
                    <CardDescription>Define the types of documents residents can request.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DocumentTypeList />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="programs">
            <Card>
                <CardHeader>
                    <CardTitle>Programs, Projects, and Activities (PPAs)</CardTitle>
                    <CardDescription>Manage the list of official PPAs for budgeting and obligations.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProgramsList />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="templates">
            <Card>
                <CardHeader>
                    <CardTitle>Document Templates</CardTitle>
                    <CardDescription>Manage the HTML layouts for your certificates and documents.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TemplateList />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="system">
             <Card>
                <CardHeader>
                    <CardTitle>System &amp; Notifications</CardTitle>
                    <CardDescription>Configure system-wide preferences for printing and messaging.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Form {...systemForm}>
                        <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="space-y-8">
                            <div className="space-y-4">
                                <h4 className="font-semibold text-primary">Printing</h4>
                                <FormField
                                    control={systemForm.control}
                                    name="paperSize"
                                    render={({ field }) => (
                                        <FormItem className="max-w-xs">
                                            <FormLabel>Default Paper Size</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="A4">A4</SelectItem>
                                                        <SelectItem value="Letter">Letter (8.5" x 11")</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            <FormDescription>Set the default paper size for all printable documents.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator />
                            
                            <div className="space-y-4">
                                <h4 className="font-semibold text-primary">Notification Templates</h4>
                                <FormField
                                    control={systemForm.control}
                                    name="pickupSmsTemplate"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Document Pickup SMS Template</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Use placeholders like `'{'{DOC_TYPE}'}'`.
                                        </FormDescription>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={systemForm.control}
                                    name="sosSmsTemplate"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Emergency "SOS" Alert Template</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} />
                                        </FormControl>
                                         <FormDescription>
                                            Use placeholders like `'{'{RESIDENT_NAME}'}'` and `'{'{LOCATION}'}'`.
                                        </FormDescription>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                             <Button type="submit" disabled={isSystemPending}>
                                {isSystemPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save System Settings
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
