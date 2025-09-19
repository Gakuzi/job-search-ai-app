import React from 'react';
import type { User } from 'firebase/auth';
import type { Profile } from '../types';
import {
    SunIcon,
    MoonIcon,
    Cog6ToothIcon,
    SparklesIcon,
    ChevronDownIcon,
    UserGroupIcon,
    BriefcaseIcon,
    ArrowLeftOnRectangleIcon
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
        onClick?: () => void;
        disabled?: boolean;
    }> = ({ label, icon, isActive, onClick, disabled }) => (
        <button
            onClick={onClick}
            disabled={disabled || isActive}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive
                    ? 'bg-primary-500 text-white cursor-default'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'
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
                    JobSphere AI
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
                        {profiles.length > 1 && <ChevronDownIcon className="w-4 h-4 text-slate-500 flex-shrink-0 group-hover:rotate-180 transition-transform" />}
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
            <div className="space-y-1 pt-4 border-t border-slate-200 dark:border-slate-700">
                {user && (
                    <div className="px-3 py-2 text-left">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={user.email || 'User'}>{user.displayName || user.email}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    </div>
                )}
                <NavLink 
                    label="Настройки"
                    icon={<Cog6ToothIcon className="w-5 h-5" />}
                    isActive={false}
                    onClick={onOpenSettings}
                />
                <NavLink 
                    label={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
                    icon={theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                    isActive={false}
                    onClick={toggleTheme}
                />
                <NavLink 
                    label="Выйти"
                    icon={<ArrowLeftOnRectangleIcon className="w-5 h-5 text-red-500 dark:text-red-400" />}
                    isActive={false}
                    onClick={onLogout}
                />
            </div>
        </aside>
    );
};

export default Sidebar;
