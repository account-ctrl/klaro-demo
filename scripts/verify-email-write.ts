
import { adminDb } from '../src/lib/firebase/admin';

async function testEmailWrite() {
    console.log("Attempting to write to 'mail' collection...");
    try {
        const res = await adminDb.collection('mail').add({
            to: ['test@example.com'],
            message: {
                subject: 'Test Email from Script',
                text: 'This is a test email to verify Firestore write permissions.',
                html: '<p>This is a test email to verify Firestore write permissions.</p>'
            },
            createdAt: new Date()
        });
        console.log("Successfully wrote document with ID:", res.id);
        console.log("Check your Firebase Console > Firestore > 'mail' collection.");
        console.log("If the document exists but the email didn't arrive, check the 'delivery' field on the document or the Extension logs.");
    } catch (e) {
        console.error("Failed to write to Firestore:", e);
    }
}

testEmailWrite();
