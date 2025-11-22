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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  email: z.string().email(),
  contactNumber: z.string().optional(),
  position: z.string().optional(),
  digitalSignatureUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useUser(); // Using the central user hook
  const [isPending, startTransition] = React.useTransition();

  // Initialize form with user data once it's loaded
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    // Set default values, which will be updated by useEffect
    defaultValues: {
      fullName: '',
      email: '',
      contactNumber: '',
      position: '',
      digitalSignatureUrl: '',
    },
  });
  
  React.useEffect(() => {
    if (user) {
      // Mock data for display, in a real app this would come from a user profile document
      form.reset({
        fullName: user.displayName || 'B. Secretary',
        email: user.email || 'sec@brgy.gov.ph',
        contactNumber: '(+63) 917 123 4567',
        position: 'Barangay Secretary',
        digitalSignatureUrl: 'https://via.placeholder.com/200x100.png?text=E-Signature',
      });
    }
  }, [user, form]);


  function onSubmit(data: ProfileFormValues) {
    startTransition(() => {
      // Simulate API call
      setTimeout(() => {
        console.log(data);
        toast({ title: "Profile Updated", description: "Your profile details have been successfully saved." });
      }, 1000);
    });
  }

  const { fullName, email, digitalSignatureUrl } = form.getValues();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and system preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
                <AvatarImage src="/placeholder.svg" alt={fullName} />
                <AvatarFallback>{fullName?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle>{fullName}</CardTitle>
                <CardDescription>{email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <h4 className="font-semibold text-primary">Personal Information</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Your full name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="your.email@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="contactNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contact Number</FormLabel>
                            <FormControl>
                            <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Position</FormLabel>
                            <FormControl>
                            <Input {...field} readOnly />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold text-primary">Signature</h4>
                <FormField
                  control={form.control}
                  name="digitalSignatureUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Digital Signature Image URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                       <FormDescription>
                        This signature will be used on all documents you process. Please provide a URL to a transparent PNG image.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {digitalSignatureUrl && (
                    <div>
                        <Label>Current Signature Preview</Label>
                        <div className="mt-2 p-4 border rounded-md bg-muted flex justify-center items-center">
                            <img src={digitalSignatureUrl} alt="Digital signature preview" className="max-h-20"/>
                        </div>
                    </div>
                )}
              </div>
              
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
