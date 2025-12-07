
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
  : undefined;

if (!serviceAccount) {
    console.error("❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local");
    process.exit(1);
}

// Only initialize if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();

async function seedRecovery() {
    // 1. Define the Emergency Super Admin
    const superAdminEmail = 'superadmin@klaro.gov.ph';
    const tempPassword = 'RecoveryPassword123!';

    console.log(`🛡️  Initiating Super Admin Recovery for: ${superAdminEmail}`);

    try {
        let uid;
        
        // 2. Check if user exists
        try {
            const userRecord = await auth.getUserByEmail(superAdminEmail);
            console.log(`✅ Found existing user [${userRecord.uid}]. Updating credentials...`);
            uid = userRecord.uid;
            
            // Update password
            await auth.updateUser(uid, {
                password: tempPassword,
                displayName: 'System Overseer'
            });
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.log(`⚠️  User not found. Creating new Super Admin...`);
                const userRecord = await auth.createUser({
                    email: superAdminEmail,
                    password: tempPassword,
                    displayName: 'System Overseer'
                });
                uid = userRecord.uid;
            } else {
                throw error;
            }
        }

        // 3. FORCE SET CUSTOM CLAIMS
        console.log(`⚡ Setting Custom Claims (role: 'super_admin')...`);
        await auth.setCustomUserClaims(uid, {
            role: 'super_admin',
            accessLevel: 5
        });

        // 4. Verify Claims
        const user = await auth.getUser(uid);
        console.log(`🔍 Verification:`, user.customClaims);

        console.log(`
        =============================================
        🎉 RECOVERY COMPLETE
        =============================================
        Login URL: http://localhost:3000/secure-superadmin-login
        Email:     ${superAdminEmail}
        Password:  ${tempPassword}
        =============================================
        `);
        process.exit(0);

    } catch (error) {
        console.error("❌ Recovery Failed:", error);
        process.exit(1);
    }
}

seedRecovery();
