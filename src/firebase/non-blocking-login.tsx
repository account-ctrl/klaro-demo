'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance).catch(error => {
    // Although we don't block, we should still handle potential errors,
    // like network issues or disabled anonymous auth.
    console.error("Anonymous sign-in failed:", error);
  });
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<void> {
  // NOTE: Changed to Promise to allow awaiting if needed, though originally designed as non-blocking
  // Keeping Promise return type for compatibility with callers who might await it
  return createUserWithEmailAndPassword(authInstance, email, password)
    .then(() => {}) // Return void
    .catch(error => {
        console.error("Email sign-up failed:", error);
        throw error; // Re-throw to let caller handle if they await it
    });
}

/** Initiate email/password sign-in (non-blocking pattern, but returns Promise for error handling). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<void> {
  // NOTE: Changed to Promise to specificially handle the 'auth/user-disabled' case cleanly
  // in the calling component (LoginPage).
  return signInWithEmailAndPassword(authInstance, email, password)
    .then(() => {}) // Return void
    .catch(error => {
       // Auto-signup logic (Optional - usually for dev/demos only)
       // Warning: In production, auto-signup on failed login is bad UX/Security.
       // However, preserving original logic flow:
       if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
           // CAUTION: This might hide real login errors.
           // Ideally, we should just throw the error.
           // But for now, check if we really want to auto-create:
           // return initiateEmailSignUp(authInstance, email, password);
           
           // Better: Just throw the error so the UI can say "Wrong password"
           throw error;
       } else {
            console.error("Email sign-in failed:", error);
            throw error; // RE-THROW so the UI can catch it!
       }
  });
}
