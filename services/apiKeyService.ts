// A simple service to store API keys in localStorage.
// This is not secure for production apps with sensitive keys,
// but acceptable for client-side keys in a demo/prototyping context.

export interface ApiConfig {
    firebase_api_key: string;
    firebase_auth_domain: string;
    firebase_project_id: string;
    firebase_storage_bucket: string;
    firebase_messaging_sender_id: string;
    firebase_app_id: string;
    gemini_api_key: string;
    google_client_id: string;
}

export const saveApiKey = (keyName: keyof ApiConfig, keyValue: string): void => {
    try {
        window.localStorage.setItem(`api_key_${keyName}`, keyValue);
    } catch (error) {
        console.error(`Error saving API key "${keyName}":`, error);
    }
};

export const getApiKey = (keyName: keyof ApiConfig): string => {
    try {
        return window.localStorage.getItem(`api_key_${keyName}`) || '';
    } catch (error) {
        console.error(`Error getting API key "${keyName}":`, error);
        return '';
    }
};

export const saveApiConfig = (config: ApiConfig): void => {
    for (const key in config) {
        saveApiKey(key as keyof ApiConfig, config[key as keyof ApiConfig]);
    }
};

export const getApiConfig = (): ApiConfig => {
    return {
        firebase_api_key: getApiKey('firebase_api_key'),
        firebase_auth_domain: getApiKey('firebase_auth_domain'),
        firebase_project_id: getApiKey('firebase_project_id'),
        firebase_storage_bucket: getApiKey('firebase_storage_bucket'),
        firebase_messaging_sender_id: getApiKey('firebase_messaging_sender_id'),
        firebase_app_id: getApiKey('firebase_app_id'),
        gemini_api_key: getApiKey('gemini_api_key'),
        google_client_id: getApiKey('google_client_id'),
    };
};

export const removeApiKey = (keyName: keyof ApiConfig): void => {
    try {
        window.localStorage.removeItem(`api_key_${keyName}`);
    } catch (error) {
        console.error(`Error removing API key "${keyName}":`, error);
    }
};
