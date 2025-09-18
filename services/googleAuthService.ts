// FIX: Add references for GAPI and Google Accounts to resolve type errors.
/// <reference types="gapi" />
/// <reference types="google.accounts" />

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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
            // Casting to 'any' bypasses the incorrect type check while preserving functionality.
            gapi.load(libs as any, resolve);
        } catch (err) {
            reject(err);
        }
    });
};

export const initGapiClient = (): Promise<void> => {
    return gapi.client.init({
        apiKey: GEMINI_API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
    });
};

export const initTokenClient = (
    callback: (resp: google.accounts.oauth2.TokenResponse) => void
): google.accounts.oauth2.TokenClient => {
    return google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GMAIL_SCOPES,
        callback,
    });
};


export const getToken = (tokenClient: google.accounts.oauth2.TokenClient) => {
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
