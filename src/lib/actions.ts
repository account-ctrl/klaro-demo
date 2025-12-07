'use server';

import { adminDb } from '@/lib/firebase/admin'; // Corrected import path and variable

interface SendInviteArgs {
  to: string;
  link: string;
  barangay: string;
  inviter: string;
}

/**
 * Creates an email document in the 'mail' collection
 * which is then processed by the Firebase Email Trigger extension.
 */
export async function sendInvite(
  { to, link, barangay, inviter }: SendInviteArgs
): Promise<{ success: boolean; error?: string }> {
  if (!to || !link || !barangay) {
    return { success: false, error: "Missing required fields for sending invite." };
  }

  try {
    // Use the already initialized adminDb instance
    const mailRef = adminDb.collection('mail');
    
    await mailRef.add({
      to: [to],
      message: {
        subject: `Invitation to Onboard Barangay ${barangay}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Hello!</h2>
            <p>You have been invited by <strong>${inviter}</strong> to set up the digital vault for <strong>Barangay ${barangay}</strong> on the KlaroGov platform.</p>
            <p>Please click the secure link below to begin the onboarding process:</p>
            <p style="text-align: center;">
              <a 
                href="${link}" 
                style="background-color: #f59e0b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;"
              >
                Start Onboarding
              </a>
            </p>
            <p>If you are not the intended recipient or did not expect this invitation, please disregard this email.</p>
            <hr style="border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 0.8em; color: #777;">
              This is an automated message from the KlaroGov Super Administration Panel.
            </p>
          </div>
        `,
      },
      createdAt: new Date(), // Helpful for sorting
    });

    console.log(`Successfully queued invitation email for ${to}`);
    return { success: true };

  } catch (error) {
    console.error("Error queuing email in Firestore:", error);
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "An unknown error occurred while sending the invite." };
  }
}
