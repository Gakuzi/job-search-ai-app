import { useState, useCallback } from 'react';

// This hook is now correctly typed and implemented to support both direct value setting
// and functional updates (e.g., `setValue(prev => ...)`), which is crucial for React's state management.
// The returned setter function is now stable, preventing infinite loops in useEffect hooks.
export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
      (value) => {
        try {
          // Use the functional update form of useState's setter.
          // This allows us to get the latest state value without depending on it in the useCallback dependency array,
          // thus making the returned setValue function stable.
          setStoredValue((currentStoredValue) => {
            const valueToStore = value instanceof Function ? value(currentStoredValue) : value;
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
            return valueToStore;
          });
        } catch (error) {
          console.error(`Error setting localStorage key “${key}”:`, error);
        }
      },
      [key]
    );


    return [storedValue, setValue];
}