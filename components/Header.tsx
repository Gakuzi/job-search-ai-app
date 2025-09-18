import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import type { Profile } from '../types';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CheckIcon } from './icons/CheckIcon';

interface HeaderProps {
    theme: string;
    setTheme: (theme: string) => void;
    user: User | null;
    profiles: Profile[];
    activeProfile: Profile | null;
    onSwitchProfile: (id: string) => void;
    onAddProfile: () => void;
    onLogout: () => void;
    onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    theme, 
    setTheme, 
    user, 
    profiles,
    activeProfile,
    onSwitchProfile,
    onAddProfile,
    onLogout, 
    onOpenSettings 
}) => {
    const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
                setIsProfileSwitcherOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-20">
            <div className="container mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Profile Switcher */}
                    {activeProfile && (
                        <div className="relative" ref={switcherRef}>
                            <button 
                                onClick={() => setIsProfileSwitcherOpen(!isProfileSwitcherOpen)} 
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 max-w-[150px] sm:max-w-[250px] truncate" title={activeProfile.name}>
                                    {activeProfile.name}
                                </span>
                                <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${isProfileSwitcherOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isProfileSwitcherOpen && (
                                <div className="absolute left-0 mt-2 w-72 origin-top-left rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    <div className="py-1">
                                        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase">Профили</div>
                                        {profiles.map(profile => (
                                            <a 
                                                href="#" 
                                                key={profile.id} 
                                                onClick={(e) => { 
                                                    e.preventDefault(); 
                                                    onSwitchProfile(profile.id); 
                                                    setIsProfileSwitcherOpen(false); 
                                                }} 
                                                className="flex justify-between items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                            >
                                                <span className="truncate">{profile.name}</span>
                                                {profile.id === activeProfile.id && <CheckIcon className="w-4 h-4 text-primary-500" />}
                                            </a>
                                        ))}
                                        <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                                        <a 
                                            href="#" 
                                            onClick={(e) => { 
                                                e.preventDefault(); 
                                                onAddProfile(); 
                                                setIsProfileSwitcherOpen(false); 
                                            }} 
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        >
                                            <PlusCircleIcon className="w-5 h-5 text-primary-500"/>
                                            Создать новый профиль
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* App Title */}
                    <div className="hidden sm:flex items-center gap-2">
                        <SparklesIcon className="w-8 h-8 text-primary-500" />
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
                            Поиск <span className="text-primary-500">с ИИ</span>
                        </h1>
                    </div>
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