import React from 'react';
import type { User } from 'firebase/auth';
import type { Profile } from '../types';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';

type View = 'scanResults' | 'applications';

interface SidebarProps {
    view: View;
    setView: (view: View) => void;
    foundJobsCount: number;
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
    view,
    setView,
    foundJobsCount,
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
        targetView: View;
        label: string;
        icon: React.ReactNode;
        count?: number;
    }> = ({ targetView, label, icon, count }) => (
        <button
            onClick={() => setView(targetView)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                view === targetView
                    ? 'bg-primary-500 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
        >
            {icon}
            <span className="flex-grow text-left">{label}</span>
            {typeof count !== 'undefined' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                     view === targetView
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                    {count}
                </span>
            )}
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
                    targetView="applications" 
                    label="Мои Отклики" 
                    icon={<BriefcaseIcon className="w-5 h-5"/>}
                />
                <NavLink 
                    targetView="scanResults" 
                    label="Результаты Поиска" 
                    icon={<MagnifyingGlassIcon className="w-5 h-5" />}
                    count={foundJobsCount}
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
                        className="flex-1 flex justify-center p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
