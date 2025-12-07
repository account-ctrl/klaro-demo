
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Verify caller is Super Admin
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.role !== 'super_admin' && decoded.email !== 'superadmin@klaro.gov.ph') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { province, city, barangay } = await req.json();

    // 1. Provision the Tenant (Ideally reuse provisioning logic, but for now we generate the slug)
    const slugify = (text: string) => text.toLowerCase().replace(/[\s\.]+/g, '-').replace(/[^\w-]+/g, '');
    const provinceSlug = slugify(province);
    const citySlug = slugify(city);
    const barangaySlug = slugify(barangay);
    
    // Pre-calculate the Tenant Slug (even if not provisioned yet, the onboarding will use this)
    // Or we could enforce provisioning here. Let's pre-generate a "Token" for the onboarding.
    
    // Generate a secure, single-use token for the onboarding link
    const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store this invite in Firestore
    await adminDb.collection('onboarding_invites').doc(inviteToken).set({
        province,
        city,
        barangay,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    // 2. Generate the Link
    // The onboarding page will need to read ?token=...
    const onboardingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding?token=${inviteToken}`;

    return NextResponse.json({ success: true, link: onboardingLink });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
