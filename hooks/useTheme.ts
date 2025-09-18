
import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const useTheme = (): [string, (theme: string) => void] => {
    const [theme, setTheme] = useLocalStorage('theme', 'light');

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    return [theme, setTheme];
};
