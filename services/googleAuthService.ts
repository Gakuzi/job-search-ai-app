import { GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth } from './firebase';

// These scopes are required to read the user's Gmail messages.
// Using 'gmail.readonly' is best practice for security.
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

const provider = new GoogleAuthProvider();

// Add the required Gmail scope to the provider.
GMAIL_SCOPES.forEach(scope => provider.addScope(scope));

/**
 * Initiates the Google Sign-In process with scopes for Gmail.
 * This will trigger a popup for the user to grant permissions.
 * @returns A promise that resolves with the user credential, including the access token.
 */
export const signInWithGoogleForGmail = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential) {
            const accessToken = credential.accessToken;
            const user = result.user;
            return { user, accessToken };
        }
        throw new Error('Could not get credential from result.');
    } catch (error: any) {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        const email = error.customData?.email;
        // The AuthCredential type that was used.
        const credential = GoogleAuthProvider.credentialFromError(error);
        console.error("Google Sign-In Error:", { errorCode, errorMessage, email, credential });
        throw error;
    }
};

/**
 * Signs out the current user.
 */
export const signOutFromGoogle = async (): Promise<void> => {
    return await signOut(auth);
};
