// FIX: Remove reference types that cause errors when @types are not installed.
// The global declarations below are sufficient for type checking.

// FIX: Add global declarations for Google APIs to resolve type errors when @types are not available.
declare const gapi: any;
declare const google: any;

// FIX: Cast import.meta to any to access env properties without TypeScript errors.
const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;

const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export const gapiLoad = (libs: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            // FIX: The type definition for gapi.load is overly restrictive in some environments.
            // With `gapi` declared as `any`, the cast is no longer needed.
            gapi.load(libs, resolve);
        } catch (err) {
            reject(err);
        }
    });
};

export const initGapiClient = (): Promise<void> => {
    return gapi.client.init({
        // The Gmail API uses OAuth 2.0 for authorization and does not require an API key
        // for this client initialization. Providing an unrelated key (like for Gemini)
        // could cause the GAPI client to initialize but fail to load the Gmail API surface correctly.
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
    });
};

export const initTokenClient = (
    callback: (resp: any) => void
): any => {
    return google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GMAIL_SCOPES,
        callback,
    });
};


export const getToken = (tokenClient: any) => {
    tokenClient.requestAccessToken({ prompt: 'consent' });
};

export const revokeToken = () => {
    const token = gapi.client.getToken();
    if (token) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            console.log('Access token revoked.');
            gapi.client.setToken(null);
        });
    }
};