import React from 'react';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { User } from 'firebase/auth';

interface HeaderProps {
    theme: string;
    setTheme: (theme: string) => void;
    user: User | null;
    onLogout: () => void;
    onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, setTheme, user, onLogout, onOpenSettings }) => {
    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-10">
            <div className="container mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-8 h-8 text-primary-500" />
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
                        Поиск Работы <span className="text-primary-500">с ИИ</span>
                    </h1>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4">
                    {user && (
                        <div className="hidden lg:flex items-center gap-2">
                             <span className="text-sm text-slate-500 dark:text-slate-400">{user.email}</span>
                             <button onClick={onLogout} className="text-sm font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400">
                                 Выйти
                             </button>
                        </div>
                    )}
                     <button
                        onClick={onOpenSettings}
                        className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        aria-label="Настройки"
                    >
                        <Cog6ToothIcon className="w-6 h-6" />
                    </button>
                     <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        aria-label="Переключить тему"
                    >
                        {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>
             {user && (
                <div className="lg:hidden flex items-center justify-center gap-2 p-2 bg-slate-100 dark:bg-slate-900/50 text-sm">
                     <span className="text-slate-500 dark:text-slate-400">{user.email}</span>
                     <button onClick={onLogout} className="font-semibold text-red-500">
                         Выйти
                     </button>
                </div>
            )}
        </header>
    );
};

export default Header;