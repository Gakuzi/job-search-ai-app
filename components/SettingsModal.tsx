import React, { useState, useEffect } from 'react';
import type { Profile, GoogleUser, SearchSettings, Platform, Prompts } from '../types';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { KeyIcon } from './icons/KeyIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import GmailConnect from './GmailConnect';
import { testApiKey } from '../services/geminiService';
import { useImmer } from 'use-immer';

type SettingsTab = 'profiles' | 'search' | 'prompts' | 'integrations';

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
    onGoogleSignOut
}) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('search');
    const [localProfile, setLocalProfile] = useImmer<Profile | null>(null);
    const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, 'unknown' | 'valid' | 'invalid'>>({});

    useEffect(() => {
        if (activeProfile) {
            setLocalProfile(JSON.parse(JSON.stringify(activeProfile)));
        }
    }, [activeProfile, setLocalProfile]);

    useEffect(() => {
        if (!isOpen) {
            setApiKeyStatus({});
        }
    }, [isOpen]);

    const handleSave = () => {
        if (localProfile) {
            onUpdateProfile(draft => {
                Object.assign(draft, localProfile);
            });
        }
        onClose();
    };

    const handlePlatformChange = <K extends keyof Platform>(id: string, key: K, value: Platform[K]) => {
        setLocalProfile(draft => {
            if (!draft) return;
            const platform = draft.settings.platforms.find(p => p.id === id);
            if (platform) {
                platform[key] = value;
            }
        });
    };
    
    const handleAddApiKey = () => {
        setLocalProfile(draft => {
            if(draft) {
                draft.geminiApiKeys = [...(draft.geminiApiKeys || []), ''];
            }
        });
    };

    const handleApiKeyChange = (index: number, value: string) => {
        setLocalProfile(draft => {
            if(draft && draft.geminiApiKeys) {
                draft.geminiApiKeys[index] = value;
            }
        });
        setApiKeyStatus(prev => ({...prev, [value]: 'unknown'}));
    };

    const handleRemoveApiKey = (index: number) => {
        setLocalProfile(draft => {
            if(draft && draft.geminiApiKeys) {
                draft.geminiApiKeys.splice(index, 1);
            }
        });
    };

    const handleTestApiKey = async (apiKey: string) => {
        if (!apiKey) return;
        setApiKeyStatus(prev => ({...prev, [apiKey]: 'testing' as any}));
        const isValid = await testApiKey(apiKey);
        setApiKeyStatus(prev => ({...prev, [apiKey]: isValid ? 'valid' : 'invalid'}));
    };

    if (!isOpen || !localProfile) return null;

    const TabButton: React.FC<{ tab: SettingsTab; label: string; }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tab ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
        >
            {label}
        </button>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'profiles':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Управление профилями</h3>
                        {profiles.map(p => (
                            <div key={p.id} className={`flex justify-between items-center p-3 rounded-lg ${p.id === activeProfile?.id ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                <button onClick={() => onSwitchProfile(p.id)} className="font-semibold">{p.name}</button>
                                <button onClick={() => onDeleteProfile(p.id)} disabled={profiles.length <= 1} className="text-red-500 hover:text-red-700 disabled:opacity-50">Удалить</button>
                            </div>
                        ))}
                        <button onClick={onAddProfile} className="w-full btn-secondary mt-4 flex items-center justify-center gap-2">
                            <PlusCircleIcon className="w-5 h-5"/> Создать новый профиль
                        </button>
                    </div>
                );
            case 'search':
                return (
                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Параметры поиска</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Должности</label>
                                <input type="text" value={localProfile.settings.positions} onChange={e => setLocalProfile(draft => { if (draft) draft.settings.positions = e.target.value; })} className="input-field" placeholder="Frontend Developer, React Engineer" />
                            </div>
                            <div>
                                <label className="label">Локация</label>
                                <input type="text" value={localProfile.settings.location} onChange={e => setLocalProfile(draft => { if (draft) draft.settings.location = e.target.value; })} className="input-field" placeholder="Москва, Россия"/>
                            </div>
                            <div>
                                <label className="label">Зарплата (от)</label>
                                <input type="number" value={localProfile.settings.salary} onChange={e => setLocalProfile(draft => { if (draft) draft.settings.salary = parseInt(e.target.value, 10); })} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Ключевые навыки</label>
                                <input type="text" value={localProfile.settings.skills} onChange={e => setLocalProfile(draft => { if (draft) draft.settings.skills = e.target.value; })} className="input-field" placeholder="React, TypeScript, Redux..."/>
                            </div>
                        </div>
                        <div>
                           <label className="label">Площадки для поиска</label>
                           <div className="space-y-2 mt-2">
                               {localProfile.settings.platforms.map(p => (
                                   <div key={p.id} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                                       <input type="checkbox" checked={p.enabled} onChange={e => handlePlatformChange(p.id, 'enabled', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                                       <span className="font-medium flex-1">{p.name}</span>
                                   </div>
                               ))}
                           </div>
                        </div>
                    </div>
                );
             case 'prompts':
                return (
                    <div className="space-y-4">
                         <h3 className="text-lg font-semibold">Настройка Промптов ИИ</h3>
                         {Object.keys(localProfile.prompts).map(key => (
                             <div key={key}>
                                 <label className="label capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                                 <textarea
                                     rows={4}
                                     value={localProfile.prompts[key as keyof Prompts]}
                                     onChange={e => setLocalProfile(draft => { if (draft) draft.prompts[key as keyof Prompts] = e.target.value; })}
                                     className="input-field w-full text-xs"
                                 />
                             </div>
                         ))}
                    </div>
                );
            case 'integrations':
                 return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Интеграции и API Ключи</h3>
                        {/* Gemini API Keys */}
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200">Gemini API Keys</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-3">Добавьте один или несколько ключей. Система будет автоматически переключаться между ними при исчерпании лимитов.</p>
                            <div className="space-y-2">
                                {(localProfile.geminiApiKeys || []).map((key, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input type="password" value={key} onChange={e => handleApiKeyChange(index, e.target.value)} className="input-field flex-grow" placeholder="AIzaSy..."/>
                                        <button onClick={() => handleTestApiKey(key)} className="btn-secondary p-2" title="Test Key">
                                            {apiKeyStatus[key] === 'testing' ? '...' : apiKeyStatus[key] === 'valid' ? '✅' : apiKeyStatus[key] === 'invalid' ? '❌' : '🧪' }
                                        </button>
                                        <button onClick={() => handleRemoveApiKey(index)} className="text-red-500 hover:text-red-700 p-1"><XCircleIcon className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                <button onClick={handleAddApiKey} className="text-sm font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1">
                                    <PlusCircleIcon className="w-4 h-4" /> Добавить ключ
                                </button>
                            </div>
                        </div>
                        {/* Avito API Keys */}
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                             <h4 className="font-semibold text-slate-800 dark:text-slate-200">Avito API</h4>
                             <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-3">Добавьте ключи для поиска через API Avito.</p>
                             <div className="space-y-3">
                                <div>
                                    <label className="label text-xs">Client ID</label>
                                    <input type="text" value={localProfile.avitoClientId} onChange={e => setLocalProfile(draft => { if (draft) draft.avitoClientId = e.target.value; })} className="input-field"/>
                                </div>
                                 <div>
                                    <label className="label text-xs">Client Secret</label>
                                    <input type="password" value={localProfile.avitoClientSecret} onChange={e => setLocalProfile(draft => { if (draft) draft.avitoClientSecret = e.target.value; })} className="input-field"/>
                                </div>
                             </div>
                        </div>
                        {/* Gmail Connection */}
                        <GmailConnect 
                            isConnected={isGoogleConnected}
                            user={googleUser}
                            onConnect={onGoogleSignIn}
                            onDisconnect={onGoogleSignOut}
                        />
                    </div>
                );
            default: return null;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start p-4 transition-opacity duration-300 overflow-y-auto" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-3xl my-8 flex flex-col transition-transform transform scale-95 animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Cog6ToothIcon className="w-6 h-6"/> Настройки</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><XCircleIcon className="w-6 h-6" /></button>
                </header>

                <main className="p-6 flex-1 flex flex-col md:flex-row gap-6">
                    <div className="flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 pb-4 md:pb-0 md:pr-4">
                        <TabButton tab="search" label="Поиск" />
                        <TabButton tab="prompts" label="Промпты" />
                        <TabButton tab="integrations" label="Интеграции" />
                        <TabButton tab="profiles" label="Профили" />
                    </div>
                    <div className="flex-1 min-w-0">
                        {renderContent()}
                    </div>
                </main>
                 <footer className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary">Отмена</button>
                    <button onClick={handleSave} className="btn-primary">Сохранить и закрыть</button>
                </footer>
            </div>
             <style>{`
                .label { display: block; font-size: 0.875rem; font-weight: 500; color: #334155; }
                .dark .label { color: #cbd5e1; }
                .input-field { width: 100%; margin-top: 0.25rem; padding: 0.5rem; font-size: 0.875rem; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 0.375rem; }
                .dark .input-field { background-color: #1e293b; border-color: #475569; }
                .btn-primary { padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; background-color: #2563eb; color: white; border-radius: 0.375rem; }
                .btn-secondary { padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; background-color: #e2e8f0; color: #1e293b; border-radius: 0.375rem; }
                .dark .btn-secondary { background-color: #475569; color: #e2e8f0; }
                @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default SettingsModal;
