import React, { useState, useRef, useEffect } from 'react';
import type { Profile, GoogleUser } from '../types';
import { AppStatus } from '../constants';
import { useDebounce } from '../hooks/useDebounce';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { LinkIcon } from './icons/LinkIcon';
import GmailConnect from './GmailConnect';

type SettingsTab = 'search' | 'resume' | 'profiles' | 'integrations';

interface SettingsPanelProps {
    profiles: Profile[];
    activeProfile: Profile | null;
    onAddProfile: () => void;
    onDeleteProfile: (id: string) => void;
    onSwitchProfile: (id: string) => void;
    onUpdateProfile: (updater: (draft: Profile) => void) => void;
    onSearch: () => void;
    status: AppStatus;
    isSettingsExpanded: boolean;
    setIsSettingsExpanded: (isExpanded: boolean) => void;
    googleUser: GoogleUser | null;
    isGoogleConnected: boolean;
    onGoogleSignIn: () => void;
    onGoogleSignOut: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    profiles,
    activeProfile,
    onAddProfile,
    onDeleteProfile,
    onSwitchProfile,
    onUpdateProfile,
    onSearch,
    status,
    isSettingsExpanded,
    setIsSettingsExpanded,
    googleUser,
    isGoogleConnected,
    onGoogleSignIn,
    onGoogleSignOut,
}) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('search');
    const [profileName, setProfileName] = useState(activeProfile?.name || '');
    const debouncedProfileName = useDebounce(profileName, 500);

    useEffect(() => {
        if (activeProfile) {
            setProfileName(activeProfile.name);
        }
    }, [activeProfile]);

    useEffect(() => {
        if (debouncedProfileName && activeProfile && debouncedProfileName !== activeProfile.name) {
            onUpdateProfile(draft => {
                draft.name = debouncedProfileName;
            });
        }
    }, [debouncedProfileName, activeProfile, onUpdateProfile]);

    if (!activeProfile) {
        return (
             <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md mb-6 p-4 text-center">
                <p className="text-slate-600 dark:text-slate-300">Профиль не выбран. Создайте новый профиль, чтобы начать.</p>
                 {profiles.length === 0 && <button onClick={onAddProfile} className="mt-4 px-4 py-2 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700">
                    Создать профиль
                </button>}
            </div>
        );
    }

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let parsedValue: any = value;
        if (type === 'number') parsedValue = parseInt(value, 10) || 0;
        if (type === 'checkbox') parsedValue = (e.target as HTMLInputElement).checked;
        
        onUpdateProfile(draft => {
            draft.settings = { ...draft.settings, [name]: parsedValue };
        });
    };

    const handleResumeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = e.target;
        onUpdateProfile(draft => { draft.resume = value; });
    };

    const handleDelete = () => {
        if (activeProfile) {
            onDeleteProfile(activeProfile.id);
        }
    };
    
    const TabButton: React.FC<{tabId: SettingsTab, label: string, icon: React.ReactNode}> = ({tabId, label, icon}) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${activeTab === tabId ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md mb-6">
            <button
                className="w-full p-4 flex justify-between items-center text-left"
                onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
            >
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Панель Управления</h2>
                    {activeProfile && <span className="px-2 py-1 text-xs font-semibold text-primary-800 bg-primary-100 dark:text-primary-200 dark:bg-primary-500/20 rounded-full">{activeProfile.name}</span>}
                </div>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isSettingsExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isSettingsExpanded && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
                        <TabButton tabId="search" label="Параметры" icon={<BriefcaseIcon className="w-4 h-4" />}/>
                        <TabButton tabId="resume" label="Резюме" icon={<PencilSquareIcon className="w-4 h-4" />}/>
                        <TabButton tabId="integrations" label="Интеграции" icon={<LinkIcon className="w-4 h-4" />}/>
                        <TabButton tabId="profiles" label="Профили" icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>}/>
                    </div>
                    
                    <div className="space-y-6">
                        {activeTab === 'search' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="positions" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Желаемые должности</label>
                                    <input id="positions" name="positions" type="text" value={activeProfile.settings.positions} onChange={handleSettingsChange} className="mt-1 w-full input-style"/>
                                </div>
                                 <div>
                                    <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Локация</label>
                                    <input id="location" name="location" type="text" value={activeProfile.settings.location} onChange={handleSettingsChange} className="mt-1 w-full input-style"/>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label htmlFor="salary" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Зарплата (от)</label>
                                        <input id="salary" name="salary" type="number" value={activeProfile.settings.salary} onChange={handleSettingsChange} className="mt-1 w-full input-style"/>
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor="currency" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Валюта</label>
                                        <select id="currency" name="currency" value={activeProfile.settings.currency} onChange={handleSettingsChange} className="mt-1 w-full input-style">
                                            <option value="RUB">RUB</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <input id="remote" name="remote" type="checkbox" checked={activeProfile.settings.remote} onChange={handleSettingsChange} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                                    <label htmlFor="remote" className="text-sm font-medium text-slate-700 dark:text-slate-300">Рассматриваю удаленную работу</label>
                                </div>
                                 <div className="md:col-span-2">
                                    <label htmlFor="skills" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ключевые навыки (через запятую)</label>
                                    <textarea id="skills" name="skills" rows={3} value={activeProfile.settings.skills} onChange={handleSettingsChange} className="mt-1 w-full input-style"/>
                                </div>
                            </div>
                        )}
                        {activeTab === 'resume' && (
                             <div>
                                <label htmlFor="resume" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Базовое резюме (Markdown)</label>
                                <textarea id="resume" name="resume" value={activeProfile.resume} onChange={handleResumeChange} rows={15} className="mt-1 w-full input-style font-mono text-xs"/>
                            </div>
                        )}
                        {activeTab === 'integrations' && (
                            <GmailConnect 
                                isConnected={isGoogleConnected}
                                user={googleUser}
                                onConnect={onGoogleSignIn}
                                onDisconnect={onGoogleSignOut}
                            />
                        )}
                         {activeTab === 'profiles' && (
                             <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4">
                                <div>
                                    <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Имя активного профиля</label>
                                    <input 
                                        id="profile-name"
                                        type="text"
                                        value={profileName}
                                        onChange={(e) => setProfileName(e.target.value)}
                                        className="w-full input-style"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="profile-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Переключить/Удалить профиль</label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <select id="profile-select" value={activeProfile.id || ''} onChange={(e) => onSwitchProfile(e.target.value)} className="flex-grow w-full input-style">
                                            {profiles.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                        </select>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button onClick={onAddProfile} className="flex-1 sm:flex-none btn-secondary">Новый</button>
                                            <button onClick={handleDelete} disabled={profiles.length <= 1} className="flex-1 sm:flex-none btn-danger">Удалить</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
             <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-b-lg">
                <button
                    onClick={onSearch}
                    disabled={status === AppStatus.Loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    {status === AppStatus.Loading ? (
                        <>
                         <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                         Поиск...
                        </>
                    ) : (
                        <>
                        <SparklesIcon className="w-5 h-5" />
                        Найти вакансии с ИИ
                        </>
                    )}
                </button>
            </div>
             <style>{`
                .input-style {
                    padding: 0.5rem 0.75rem;
                    background-color: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    border-radius: 0.375rem;
                    outline: none;
                }
                .dark .input-style {
                    background-color: #334155;
                    border-color: #475569;
                }
                .input-style:focus {
                    ring: 2px;
                    border-color: #3b82f6;
                }
                .btn-secondary {
                    padding: 0.5rem 1rem;
                     font-size: 0.875rem;
                    background-color: #e2e8f0;
                    color: #1e293b;
                    border-radius: 0.375rem;
                }
                .dark .btn-secondary {
                    background-color: #475569;
                    color: #e2e8f0;
                }
                .btn-danger {
                     padding: 0.5rem 1rem;
                     font-size: 0.875rem;
                     background-color: #ef4444;
                     color: white;
                     border-radius: 0.375rem;
                }
                .btn-danger:disabled {
                    background-color: #94a3b8;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
};

export default SettingsPanel;