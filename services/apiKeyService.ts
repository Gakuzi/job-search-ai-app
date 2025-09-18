

/**
 * Retrieves the list of user-provided API keys from local storage.
 * It filters out any empty or invalid entries.
 * As a fallback, it will use the key from the environment variables if no user keys are present.
 * @returns An array of API key strings.
 */
export const getApiKeys = (): string[] => {
    try {
        const keysJson = localStorage.getItem('gemini-api-keys');
        const keys = keysJson ? JSON.parse(keysJson) : [];
        // FIX: Cast import.meta to any to access env properties without TypeScript errors.
        const envKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

        // User-provided keys from localStorage take precedence.
        if (Array.isArray(keys) && keys.length > 0) {
            const userKeys = keys.filter(k => typeof k === 'string' && k.trim() !== '');
            if (userKeys.length > 0) return userKeys;
        }

        // Fallback to environment variable key if it exists.
        if (envKey) {
            return [envKey];
        }

        return [];
    } catch {
        // In case of parsing errors, fallback gracefully.
        // FIX: Cast import.meta to any to access env properties without TypeScript errors.
        const envKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        return envKey ? [envKey] : [];
    }
};

/**
 * Gets the currently active API key from the pool based on the stored index.
 * @returns The active API key string, or null if no keys are configured.
 */
export const getActiveApiKey = (): string | null => {
    const keys = getApiKeys();
    if (keys.length === 0) return null;

    try {
        const indexJson = localStorage.getItem('active-api-key-index');
        const index = indexJson ? JSON.parse(indexJson) : 0;
        // Ensure the index is always within the bounds of the array.
        return keys[index % keys.length];
    } catch {
        // Fallback to the first key if localStorage is corrupt.
        return keys[0];
    }
};

/**
 * Rotates to the next API key in the pool by incrementing the active index.
 * This is typically called after an API error like a quota limit.
 */
export const rotateApiKey = (): void => {
    const keys = getApiKeys();
    if (keys.length <= 1) return; // No need to rotate if there's only one key.

    try {
        const indexJson = localStorage.getItem('active-api-key-index');
        const currentIndex = indexJson ? JSON.parse(indexJson) : 0;
        const nextIndex = (currentIndex + 1) % keys.length;
        localStorage.setItem('active-api-key-index', JSON.stringify(nextIndex));
        console.log(`Rotated API key to index: ${nextIndex}`);
    } catch (error) {
        console.error('Failed to rotate API key:', error);
        // Fallback to resetting to the first key.
        localStorage.setItem('active-api-key-index', '0');
    }
};