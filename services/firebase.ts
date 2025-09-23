import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getApiConfig } from './apiKeyService';

const apiConfig = getApiConfig();

// Reconstruct the firebaseConfig object from the values retrieved from localStorage
export const firebaseConfig = {
  apiKey: apiConfig.firebase_api_key,
  authDomain: apiConfig.firebase_auth_domain,
  projectId: apiConfig.firebase_project_id,
  storageBucket: apiConfig.firebase_storage_bucket,
  messagingSenderId: apiConfig.firebase_messaging_sender_id,
  appId: apiConfig.firebase_app_id
};

// Check if the essential Firebase keys are present.
// A placeholder key for Firebase often starts with "AIzaSy...".
export const isConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('AIzaSy') && firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.error("Firebase initialization failed. Check your API keys in the configuration screen.", error);
    }
} else {
    console.warn("Firebase configuration is missing or invalid. The application will display the setup screen.");
}

export { app, auth, db };
