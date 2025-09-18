import React from 'react';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { User } from 'firebase/auth';

interface HeaderProps {
    theme: string;
    setTheme: (theme: string) => void;
    view: 'search' | 'applications';
    setView: (view: 'search' | 'applications') => void;
    user: User | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, setTheme, view, setView, user, onLogout }) => {
    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const navButtonClasses = (buttonView: 'search' | 'applications') => 
        `px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            view === buttonView 
            ? 'bg-primary-500 text-white' 
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`;

    return (
        <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-10">
            <div className="container mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-8 h-8 text-primary-500" />
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
                        Поиск Работы <span className="text-primary-500">с ИИ</span>
                    </h1>
                </div>
                
                <div className="hidden sm:flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <button onClick={() => setView('search')} className={navButtonClasses('search')}>
                        Поиск
                    </button>
                    <button onClick={() => setView('applications')} className={navButtonClasses('applications')}>
                        Отклики
                    </button>
                </div>
                
                <div className="flex items-center gap-4">
                    {user && (
                        <div className="hidden lg:flex items-center gap-2">
                             <span className="text-sm text-slate-500 dark:text-slate-400">{user.email}</span>
                             <button onClick={onLogout} className="text-sm font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400">
                                 Выйти
                             </button>
                        </div>
                    )}
                     <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        aria-label="Переключить тему"
                    >
                        {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>
            <div className="sm:hidden p-2 bg-slate-100 dark:bg-slate-900/50">
                 <div className="flex items-center gap-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg justify-center">
                    <button onClick={() => setView('search')} className={navButtonClasses('search')}>
                        Поиск
                    </button>
                    <button onClick={() => setView('applications')} className={navButtonClasses('applications')}>
                        Отклики
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
