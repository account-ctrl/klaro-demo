'use client';

import React, { useState, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';

import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { completeOnboarding, saveOfficials, saveProfile } from '@/lib/actions';
import { Loader2, PlusCircle, Trash2, CheckCircle, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

const steps = [
  { id: 1, title: 'Barangay Profile', description: 'Tell us about your Barangay.' },
  { id: 2, title: 'Barangay Officials', description: 'List your key officials.' },
  { id: 3, title: 'Ready to Go!', description: 'Confirmation and final step.' },
];

const profileSchema = z.object({
  barangayName: z.string().min(3, "Barangay name is required."),
  city: z.string().min(3, "City/Municipality is required."),
  province: z.string().min(3, "Province is required."),
});

const officialsSchema = z.object({
  officials: z.array(z.object({
    name: z.string().min(2, "Name is required."),
    role: z.enum(['Captain', 'Secretary', 'Treasurer', 'Councilor']),
  })).min(1, "Please add at least one official."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type OfficialsFormValues = z.infer<typeof officialsSchema>;

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const heroImage = PlaceHolderImages.find(p => p.id === 'onboarding-hero');

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { barangayName: '', city: '', province: '' },
  });

  const officialsForm = useForm<OfficialsFormValues>({
    resolver: zodResolver(officialsSchema),
    defaultValues: { officials: [{ name: '', role: 'Captain' }] },
  });

  const { fields, append, remove } = useFieldArray({
    control: officialsForm.control,
    name: "officials",
  });

  const handleProfileSubmit = async (data: ProfileFormValues) => {
    startTransition(async () => {
      // In a real app, formData would be used
      const formData = new FormData();
      formData.append('barangayName', data.barangayName);
      formData.append('city', data.city);
      formData.append('province', data.province);
      const result = await saveProfile({} as any, formData); // Pass empty initial state
      if (result.success) {
        toast({ title: 'Profile Saved!', description: 'Proceeding to the next step.' });
        setCurrentStep(2);
      } else {
        toast({ variant: "destructive", title: 'Error', description: result.message });
      }
    });
  };

  const handleOfficialsSubmit = async (data: OfficialsFormValues) => {
    startTransition(async () => {
      const result = await saveOfficials(data.officials);
      if (result.success) {
        toast({ title: 'Officials Saved!', description: 'One last step to go!' });
        setCurrentStep(3);
      } else {
        toast({ variant: "destructive", title: 'Error', description: result.message });
      }
    });
  };

  const handleFinish = () => {
    startTransition(async () => {
      await completeOnboarding();
    });
  };

  const StepIndicator = () => (
    <ol className="flex w-full items-center">
      {steps.map((step, index) => (
        <li key={step.id} className="flex w-full items-center">
          <div className="flex items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${step.id <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {step.id < currentStep ? <CheckCircle className="h-5 w-5" /> : step.id}
            </div>
            <div className="ml-4 hidden sm:block">
              <h3 className="font-medium leading-tight">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
          {index < steps.length - 1 && <div className={`h-1 w-full flex-1 ${step.id < currentStep ? 'bg-primary' : 'bg-muted'}`}></div>}
        </li>
      ))}
    </ol>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="text-center border-b p-6">
          <div className="flex justify-center mb-4">
             <Logo />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to KlaroBarangay</CardTitle>
          <CardDescription>Let's get your Barangay set up for transparent governance.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="mb-8">
            <StepIndicator />
          </div>

          {currentStep === 1 && (
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                <FormField name="barangayName" control={profileForm.control} render={({ field }) => (
                  <FormItem><FormLabel>Barangay Name</FormLabel><FormControl><Input placeholder="e.g., San Isidro" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="city" control={profileForm.control} render={({ field }) => (
                  <FormItem><FormLabel>City / Municipality</FormLabel><FormControl><Input placeholder="e.g., Quezon City" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="province" control={profileForm.control} render={({ field }) => (
                  <FormItem><FormLabel>Province</FormLabel><FormControl><Input placeholder="e.g., Metro Manila" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save & Continue
                </Button>
              </form>
            </Form>
          )}

          {currentStep === 2 && (
            <Form {...officialsForm}>
              <form onSubmit={officialsForm.handleSubmit(handleOfficialsSubmit)} className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-4">
                    <FormField name={`officials.${index}.name`} control={officialsForm.control} render={({ field }) => (
                      <FormItem className="flex-grow"><FormLabel>Official's Full Name</FormLabel><FormControl><Input placeholder="e.g., Juan Dela Cruz" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name={`officials.${index}.role`} control={officialsForm.control} render={({ field }) => (
                      <FormItem className="w-1/3"><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Captain">Captain</SelectItem>
                          <SelectItem value="Secretary">Secretary</SelectItem>
                          <SelectItem value="Treasurer">Treasurer</SelectItem>
                          <SelectItem value="Councilor">Councilor</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ name: '', role: 'Councilor' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Official</Button>
                <div className="flex gap-4">
                  <Button type="button" variant="secondary" onClick={() => setCurrentStep(1)} className="w-full">Back</Button>
                  <Button type="submit" disabled={isPending} className="w-full">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Continue
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {currentStep === 3 && (
            <div className="text-center space-y-6">
              <ShieldCheck className="mx-auto h-24 w-24 text-green-500" />
              <h2 className="text-2xl font-bold">Setup Complete!</h2>
              <p className="text-muted-foreground">Your Barangay profile is now set up. You are ready to explore the KlaroBarangay platform and begin a new era of transparent and efficient governance.</p>
              <Button onClick={handleFinish} disabled={isPending} className="w-full max-w-sm mx-auto">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Go to Dashboard'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
