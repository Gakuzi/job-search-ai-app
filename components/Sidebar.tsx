import React from 'react';
import type { User } from 'firebase/auth';
// FIX: Corrected import path for types
import type { Profile } from '../types';
import {
    SunIcon,
    MoonIcon,
    SparklesIcon,
    Cog6ToothIcon,
    ChevronDownIcon,
    UserGroupIcon,
    BriefcaseIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
    theme: string;
    setTheme: (theme: string) => void;
    user: User | null;
    onLogout: () => void;
    onOpenSettings: () => void;
    profiles: Profile[];
    activeProfile: Profile | null;
    onSwitchProfile: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    theme,
    setTheme,
    user,
    onLogout,
    onOpenSettings,
    profiles,
    activeProfile,
    onSwitchProfile,
}) => {
    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const NavLink: React.FC<{
        label: string;
        icon: React.ReactNode;
        isActive: boolean;
    }> = ({ label, icon, isActive }) => (
        <button
            disabled
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive
                    ? 'bg-primary-500 text-white cursor-default'
                    : 'text-slate-600 dark:text-slate-300'
            }`}
        >
            {icon}
            <span className="flex-grow text-left">{label}</span>
        </button>
    );

    return (
        <aside className="w-64 bg-white dark:bg-slate-800 p-4 flex flex-col flex-shrink-0 border-r border-slate-200 dark:border-slate-700">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 pb-4 border-b border-slate-200 dark:border-slate-700">
                <SparklesIcon className="w-8 h-8 text-primary-500" />
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                    Job AI
                </h1>
            </div>

            {/* Profile Switcher */}
            {activeProfile && profiles.length > 0 && (
                <div className="relative group mt-4">
                    <button className="w-full flex items-center justify-between text-left gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <UserGroupIcon className="w-5 h-5 text-slate-600 dark:text-slate-300 flex-shrink-0" />
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate" title={activeProfile.name}>
                                {activeProfile.name}
                            </span>
                        </div>
                        {profiles.length > 1 && <ChevronDownIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                    </button>
                    {profiles.length > 1 && (
                        <div className="absolute top-full mt-1 w-full bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-20 hidden group-hover:block ring-1 ring-black ring-opacity-5">
                            {profiles.map(profile => (
                                <a
                                    key={profile.id}
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); onSwitchProfile(profile.id); }}
                                    className={`block px-4 py-2 text-sm truncate ${profile.id === activeProfile.id ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    title={profile.name}
                                >
                                    {profile.name}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* Navigation */}
            <nav className="mt-4 space-y-2 flex-grow">
                 <NavLink 
                    label="Мои Отклики" 
                    icon={<BriefcaseIcon className="w-5 h-5"/>}
                    isActive={true}
                />
            </nav>

            {/* Footer Controls */}
            <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                {user && (
                    <div className="text-center px-2 py-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        <button onClick={onLogout} className="text-xs font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400">
                            Выйти
                        </button>
                    </div>
                )}
                 <div className="flex items-center justify-center gap-2">
                     <button
                        onClick={onOpenSettings}
                        disabled={!activeProfile}
                        className="flex-1 flex justify-center p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Настройки"
                    >
                        <Cog6ToothIcon className="w-6 h-6" />
                    </button>
                     <button
                        onClick={toggleTheme}
                        className="flex-1 flex justify-center p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        aria-label="Переключить тему"
                    >
                        {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;