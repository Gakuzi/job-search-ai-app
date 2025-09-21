import {
    getAuth,
    signInWithPopup,
    linkWithPopup,
    GoogleAuthProvider,
    UserCredential,
    User,
    signOut as firebaseSignOut
} from "firebase/auth";
import { auth } from "./firebase";

const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
];

const provider = new GoogleAuthProvider();
GMAIL_SCOPES.forEach(scope => provider.addScope(scope));


/**
 * Initiates the Google Sign-In process using Firebase Authentication.
 * It requests the necessary Gmail scopes so the access token can be used
 * for API calls later.
 * @returns A promise that resolves with the UserCredential on successful authentication.
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    try {
        const result = await signInWithPopup(auth, provider);
        return result;
    } catch (error) {
        console.error("Error during Google sign-in:", error);
        throw error;
    }
};


export const getToken = (tokenClient: any) => {
    if (!tokenClient) {
        console.error("Google token client is not initialized.");
        return;
    }
    tokenClient.requestAccessToken({ prompt: 'consent' });
};

/**
 * Signs the current user out using Firebase Authentication.
 * @returns A promise that resolves when the sign-out is complete.
 */
export const signOut = async (): Promise<void> => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    await firebaseSignOut(auth);
};

/**
 * Extracts the OAuth access token from a UserCredential object.
 * This token is required to make calls to Google APIs like Gmail.
 * @param credential The UserCredential object from a successful sign-in.
 * @returns The access token string, or null if not found.
 */
export const getAccessTokenFromCredential = (credential: UserCredential): string | null => {
    const credentialWithToken = credential.credential as any;
    return credentialWithToken?.accessToken || null;
};
