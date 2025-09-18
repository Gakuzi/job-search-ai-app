// A simple service to store API keys in localStorage.
// This is not secure for production apps with sensitive keys,
// but acceptable for client-side keys like Avito's public API credentials.

export const saveApiKey = (keyName: string, keyValue: string): void => {
    try {
        window.localStorage.setItem(`api_key_${keyName}`, keyValue);
    } catch (error) {
        console.error(`Error saving API key "${keyName}":`, error);
    }
};

export const getApiKey = async (keyName: string): Promise<string> => {
    try {
        return window.localStorage.getItem(`api_key_${keyName}`) || '';
    } catch (error) {
        console.error(`Error getting API key "${keyName}":`, error);
        return '';
    }
};

export const removeApiKey = (keyName: string): void => {
    try {
        window.localStorage.removeItem(`api_key_${keyName}`);
    } catch (error) {
        console.error(`Error removing API key "${keyName}":`, error);
    }
};
