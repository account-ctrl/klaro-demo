# Provisioning System Guide

## Overview
The system uses a "Logical Vault" architecture where each tenant lives at:
`provinces/{provinceSlug}/cities/{citySlug}/barangays/{barangaySlug}`

## API: /api/admin/provision

This atomic endpoint handles:
1.  **Directory Entry**: `tenant_directory/{slug}`
2.  **Vault Creation**: The root document and initial metadata.
3.  **Settings Hydration**: `settings/general` is pre-filled with the Captain's info.
4.  **Auth**: Creates the user and sets Custom Claims (`tenantPath`, `role`).

## Testing

You can test the provisioning flow directly from your browser console or Postman.

### Browser Console Test Script

1.  Log in to the Admin Dashboard.
2.  Open Chrome DevTools (F12) -> Console.
3.  Paste and run this script:

```javascript
// Test Data
const payload = {
  province: "Cavite",
  city: "Bacoor",
  barangayName: "Barangay Molino III",
  adminName: "Capt. Test User",
  adminEmail: `molino.admin.${Date.now()}@test.gov.ph`,
  password: "SecurePassword123!"
};

// Get Current Token (if logged in as Super Admin)
// Note: If you aren't logged in, this part fails.
// For dev, you might need to grab a token manually or disable auth on the route temporarily.
async function runTest() {
    console.log("🚀 Starting Provisioning Test...");
    
    // Assuming Firebase Auth is initialized on window or you have a way to get token
    // For this test, we assume you are hitting the endpoint which validates Admin Token.
    // If testing public onboarding, use /api/public/provision
    
    const res = await fetch('/api/admin/provision', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer YOUR_TOKEN_HERE' // Uncomment and add if testing secure route
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Response:", data);
    
    if (res.ok) {
        console.log("✅ Success! Tenant created at:", data.vaultPath);
        console.log("👉 Login Email:", payload.adminEmail);
    } else {
        console.error("❌ Failed:", data.error);
    }
}

runTest();
```

## Security Rules

The database is secured using Custom Claims.
*   **Path**: `/provinces/{p}/cities/{c}/barangays/{b}`
*   **Rule**: `request.auth.token.tenantPath == path`

This ensures strictly isolated access.
