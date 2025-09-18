import React, { useState, useEffect, useCallback } from 'react';
import type { Profile, GoogleUser } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { XCircleIcon } from './icons/XCircleIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { LinkIcon } from './icons/LinkIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import GmailConnect from './GmailConnect';

type SettingsTab = 'profiles' | 'search' | 'resume' | 'integrations';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: Profile[];
    activeProfile: Profile | null;
    onAddProfile: () => void;
    onDeleteProfile: (id: string) => void;
    onSwitchProfile: (id: string) => void;
    onUpdateProfile: (updater: (draft: Profile) => void) => void;
    googleUser: GoogleUser | null;
    isGoogleConnected: boolean;
    onGoogleSignIn: () => void;
    onGoogleSignOut: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    profiles,
    activeProfile,
    onAddProfile,
    onDeleteProfile,
    onSwitchProfile,
    onUpdateProfile,
    googleUser,
    isGoogleConnected,
    onGoogleSignIn,
    onGoogleSignOut,
}) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profiles');
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

    const handleSettingsChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let parsedValue: any = value;
        if (type === 'number') parsedValue = parseInt(value, 10) || 0;
        if (type === 'checkbox') parsedValue = (e.target as HTMLInputElement).checked;
        
        onUpdateProfile(draft => {
            draft.settings = { ...draft.settings, [name]: parsedValue };
        });
    }, [onUpdateProfile]);

    const handleResumeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = e.target;
        onUpdateProfile(draft => { draft.resume = value; });
    }, [onUpdateProfile]);

    const handleDelete = () => {
        if (activeProfile) {
            onDeleteProfile(activeProfile.id);
        }
    };

    if (!isOpen || !activeProfile) return null;

    const TabButton: React.FC<{tabId: SettingsTab, label: string, icon: React.ReactNode}> = ({tabId, label, icon}) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${activeTab === tabId ? 'bg-primary-500 text-white' : 'text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transition-transform transform scale-95 animate-scale-in" 
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="modal-title"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 id="modal-title" className="text-lg font-semibold">Настройки</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Закрыть модальное окно">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                    <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
                        <TabButton tabId="profiles" label="Профили" icon={<UserGroupIcon className="w-4 h-4" />}/>
                        <TabButton tabId="search" label="Параметры" icon={<BriefcaseIcon className="w-4 h-4" />}/>
                        <TabButton tabId="resume" label="Резюме" icon={<PencilSquareIcon className="w-4 h-4" />}/>
                        <TabButton tabId="integrations" label="Интеграции" icon={<LinkIcon className="w-4 h-4" />}/>
                    </div>
                    
                    <div className="space-y-6">
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
                    </div>
                </main>
                
                <footer className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                        Закрыть
                    </button>
                </footer>
            </div>
             <style>{`
                @keyframes scale-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in {
                    animation: scale-in 0.2s ease-out forwards;
                }
                .input-style {
                    padding: 0.5rem 0.75rem;
                    background-color: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    border-radius: 0.375rem;
                    outline: none;
                    color: #0f172a;
                }
                .dark .input-style {
                    background-color: #334155;
                    border-color: #475569;
                    color: #e2e8f0;
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

export default SettingsModal;
