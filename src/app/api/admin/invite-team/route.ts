
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const { email, role } = await req.json();

        // 1. Create User
        const userRecord = await adminAuth.createUser({ email });

        // 2. Set Claims
        await adminAuth.setCustomUserClaims(userRecord.uid, {
        role: 'super_admin',
        accessLevel: role // 'full' or 'read_only'
        });

        // 3. Generate Invite Link
        const link = await adminAuth.generatePasswordResetLink(email);

        // 4. Send Email (Mocked)
        // await sendEmail(email, link); 
        console.log(`Invite link for ${email}: ${link}`);

        return NextResponse.json({ success: true, inviteLink: link });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
