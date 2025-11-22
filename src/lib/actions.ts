'use server';

import { getBarangayInsights } from '@/ai/flows/barangay-data-insights';
import { barangayDataForAI } from '@/lib/data';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const profileSchema = z.object({
  barangayName: z.string().min(3, "Barangay name must be at least 3 characters."),
  city: z.string().min(3, "City/Municipality must be at least 3 characters."),
  province: z.string().min(3, "Province must be at least 3 characters."),
});

// Mock action. In a real app, this would save to a Firestore document.
export async function saveProfile(prevState: any, formData: FormData) {
  const validatedFields = profileSchema.safeParse({
    barangayName: formData.get('barangayName'),
    city: formData.get('city'),
    province: formData.get('province'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Please correct the errors below.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  console.log('Saved Profile:', validatedFields.data);
  // In a real app, update the user's onboarding step in Firestore here.
  return { success: true, message: 'Profile saved!' };
}

// Mock action for saving officials list
export async function saveOfficials(officials: { name: string; role: string }[]) {
  // Add basic validation
  if (!officials || officials.length === 0 || officials.some(o => !o.name || !o.role)) {
    return { success: false, message: 'Please add at least one official with a name and role.' };
  }
  console.log('Saved Officials:', officials);
  // In a real app, save to Firestore and update onboarding step.
  return { success: true, message: 'Officials saved!' };
}

// Mock action to finalize onboarding
export async function completeOnboarding() {
  console.log('Onboarding complete!');
  // In a real app, update user's status to 'complete' in Firestore.
  // Then, revalidate the root path to trigger the redirect logic on the homepage.
  revalidatePath('/');
  redirect('/dashboard');
}


export async function generateInsightsAction() {
  try {
    const result = await getBarangayInsights(barangayDataForAI);
    return { success: true, insights: result.insights };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to generate insights. Please try again later.' };
  }
}
