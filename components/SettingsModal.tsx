import React, { useState, useEffect, useCallback } from 'react';
import type { Profile, GoogleUser, Platform } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { v4 as uuidv4 } from 'uuid';
import { XCircleIcon } from './icons/XCircleIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { LinkIcon } from './icons/LinkIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { KeyIcon } from './icons/KeyIcon';
import GmailConnect from './GmailConnect';
import { testApiKey } from '../services/geminiService';
import { GlobeAltIcon } from './icons/GlobeAltIcon';

type SettingsTab = 'profiles' | 'apiKeys' | 'platforms' | 'search' | 'resume' | 'integrations';
type KeyTestStatus = 'testing' | 'valid' | 'invalid' | 'idle';


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
    const [keyTestStatus, setKeyTestStatus] = useState<Record<number, KeyTestStatus>>({});

    // Sync local state when active profile changes
    useEffect(() => {
        if (activeProfile) {
            setProfileName(activeProfile.name);
        }
    }, [activeProfile]);
    
    // Persist profile name change after debounce
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
    
    const handlePlatformChange = (id: string, field: keyof Platform, value: string | boolean) => {
        onUpdateProfile(draft => {
            const platform = draft.settings.platforms.find(p => p.id === id);
            if(platform) {
                (platform[field] as any) = value;
            }
        });
    };
    
    const handleAddPlatform = () => {
        const newPlatform: Platform = { id: uuidv4(), name: 'Новая площадка', url: 'https://example.com/vacancies', enabled: false, type: 'scrape' };
        onUpdateProfile(draft => {
            draft.settings.platforms.push(newPlatform);
        });
    };
    
    const handleRemovePlatform = (id: string) => {
        onUpdateProfile(draft => {
            draft.settings.platforms = draft.settings.platforms.filter(p => p.id !== id);
        });
    };

    const handleResumeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = e.target;
        onUpdateProfile(draft => { draft.resume = value; });
    }, [onUpdateProfile]);

    // --- API Key Handlers ---
    const handleKeyChange = (index: number, value: string) => {
        onUpdateProfile(draft => {
            if (draft.geminiApiKeys) {
                draft.geminiApiKeys[index] = value;
            }
        });
        setKeyTestStatus(s => ({...s, [index]: 'idle'}));
    };

    const handleAddKey = () => {
        onUpdateProfile(draft => {
            draft.geminiApiKeys = [...(draft.geminiApiKeys || []), ''];
        });
    };

    const handleRemoveKey = (indexToRemove: number) => {
        onUpdateProfile(draft => {
            draft.geminiApiKeys = (draft.geminiApiKeys || []).filter((_, i) => i !== indexToRemove);
            if (draft.activeGeminiApiKeyIndex && (draft.activeGeminiApiKeyIndex >= (draft.geminiApiKeys?.length || 0) || draft.activeGeminiApiKeyIndex === indexToRemove)) {
                draft.activeGeminiApiKeyIndex = 0;
            }
        });
        setKeyTestStatus(s => {
            const newStatus = {...s};
            delete newStatus[indexToRemove];
            return newStatus;
        })
    };
    
    const handleTestKey = async (index: number) => {
        const key = activeProfile?.geminiApiKeys?.[index];
        if (!key) return;
        setKeyTestStatus(s => ({ ...s, [index]: 'testing' }));
        const isValid = await testApiKey(key);
        setKeyTestStatus(s => ({ ...s, [index]: isValid ? 'valid' : 'invalid' }));
    };
    
    const handleAvitoCredentialsChange = (field: 'avitoClientId' | 'avitoClientSecret', value: string) => {
        onUpdateProfile(draft => {
            draft[field] = value;
        });
    };
    
    const getStatusIndicator = (status: KeyTestStatus) => {
        switch(status) {
            case 'testing': return <div className="w-4 h-4 rounded-full bg-yellow-400 animate-pulse" title="Тестирование..."></div>;
            case 'valid': return <div className="w-4 h-4 rounded-full bg-green-500" title="Ключ действителен"></div>;
            case 'invalid': return <div className="w-4 h-4 rounded-full bg-red-500" title="Ключ недействителен"></div>;
            default: return <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600" title="Статус неизвестен"></div>;
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
                        <TabButton tabId="apiKeys" label="API Ключи" icon={<KeyIcon className="w-4 h-4" />}/>
                        <TabButton tabId="platforms" label="Платформы" icon={<GlobeAltIcon className="w-4 h-4" />}/>
                        <TabButton tabId="search" label="Параметры" icon={<BriefcaseIcon className="w-4 h-4" />}/>
                        <TabButton tabId="resume" label="Резюме" icon={<PencilSquareIcon className="w-4 h-4" />}/>
                        <TabButton tabId="integrations" label="Интеграции" icon={<LinkIcon className="w-4 h-4" />}/>
                    </div>
                    
                    <div className="space-y-6">
                        {activeTab === 'profiles' && (
                             <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold">Управление профилями</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Здесь вы можете переименовывать и удалять свои профили. Переключение активного профиля происходит в боковой панели.</p>
                                </div>
                                <div className="space-y-3">
                                    {profiles.map(p => (
                                        <div key={p.id} className={`p-3 rounded-lg flex items-center justify-between ${p.id === activeProfile.id ? 'bg-primary-50 dark:bg-slate-800 border border-primary-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                            {p.id === activeProfile.id ? (
                                                <input 
                                                    type="text"
                                                    value={profileName}
                                                    onChange={(e) => setProfileName(e.target.value)}
                                                    className="w-full bg-transparent font-semibold focus:outline-none focus:ring-0 border-0 p-0"
                                                    aria-label="Имя активного профиля"
                                                />
                                            ) : (
                                                <span className="font-semibold">{p.name}</span>
                                            )}
                                            <button 
                                                onClick={() => onDeleteProfile(p.id)} 
                                                disabled={profiles.length <= 1} 
                                                className="text-sm font-medium text-red-500 hover:text-red-700 disabled:text-slate-400 disabled:cursor-not-allowed ml-4 flex-shrink-0"
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={onAddProfile} className="btn-secondary w-full justify-center flex items-center gap-2">
                                    <PlusCircleIcon className="w-5 h-5"/>
                                    Создать новый профиль
                                </button>
                            </div>
                        )}
                         {activeTab === 'apiKeys' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">Интеграция с Avito</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Вставьте ваши ключи для прямого доступа к API Avito. Это обеспечит самый быстрый и точный поиск по этой платформе.</p>
                                    </div>
                                    <div className="p-3 rounded-lg flex flex-col gap-3 bg-slate-100 dark:bg-slate-700">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Avito Client ID</label>
                                            <input 
                                                type="text"
                                                value={activeProfile.avitoClientId || ''}
                                                onChange={(e) => handleAvitoCredentialsChange('avitoClientId', e.target.value)}
                                                placeholder="Вставьте ваш Avito Client ID"
                                                className="w-full input-style font-mono text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Avito Client Secret</label>
                                             <input 
                                                type="password"
                                                value={activeProfile.avitoClientSecret || ''}
                                                onChange={(e) => handleAvitoCredentialsChange('avitoClientSecret', e.target.value)}
                                                placeholder="Вставьте ваш Avito Client Secret"
                                                className="w-full input-style font-mono text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <div>
                                        <h3 className="text-lg font-semibold">Пул API ключей Gemini</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Добавьте несколько API ключей. Если один из них исчерпает дневной лимит, система автоматически переключится на следующий. Активный ключ отмечен радио-кнопкой.</p>
                                    </div>
                                    <div className="space-y-3">
                                        {(activeProfile.geminiApiKeys || []).map((key, index) => (
                                            <div key={index} className="p-3 rounded-lg flex items-center gap-3 bg-slate-100 dark:bg-slate-700">
                                                <input 
                                                    type="radio"
                                                    name="activeApiKey"
                                                    checked={index === activeProfile.activeGeminiApiKeyIndex}
                                                    onChange={() => onUpdateProfile(draft => { draft.activeGeminiApiKeyIndex = index; })}
                                                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <input 
                                                    type="text"
                                                    value={key}
                                                    onChange={(e) => handleKeyChange(index, e.target.value)}
                                                    placeholder="Вставьте ваш Gemini API ключ"
                                                    className="w-full input-style font-mono text-sm"
                                                />
                                                {getStatusIndicator(keyTestStatus[index] || 'idle')}
                                                <button onClick={() => handleTestKey(index)} className="btn-secondary text-sm" disabled={keyTestStatus[index] === 'testing'}>
                                                    {keyTestStatus[index] === 'testing' ? '...' : 'Тест'}
                                                </button>
                                                <button onClick={() => handleRemoveKey(index)} className="btn-danger text-sm">
                                                    Удалить
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleAddKey} className="btn-secondary flex items-center gap-2">
                                        <PlusCircleIcon className="w-5 h-5"/>
                                        Добавить ключ
                                    </button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'platforms' && (
                            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4">
                                <h3 className="text-lg font-semibold">Площадки для поиска</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Укажите URL страниц поиска вакансий и активируйте те, по которым ИИ должен проводить поиск.</p>
                                {activeProfile.settings.platforms.map((platform) => (
                                    <div key={platform.id} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-12 sm:col-span-3">
                                            <input type="text" value={platform.name} onChange={(e) => handlePlatformChange(platform.id, 'name', e.target.value)} placeholder="Название (напр. Habr)" className="w-full input-style"/>
                                        </div>
                                        <div className="col-span-12 sm:col-span-6">
                                            <input type="text" value={platform.url} onChange={(e) => handlePlatformChange(platform.id, 'url', e.target.value)} placeholder="URL поиска" className="w-full input-style"/>
                                        </div>
                                        <div className="col-span-6 sm:col-span-1 flex items-center justify-center">
                                             <input type="checkbox" checked={platform.enabled} onChange={(e) => handlePlatformChange(platform.id, 'enabled', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                                        </div>
                                        <div className="col-span-6 sm:col-span-2">
                                            <button onClick={() => handleRemovePlatform(platform.id)} className="w-full btn-danger text-sm">Удалить</button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={handleAddPlatform} className="btn-secondary flex items-center gap-2">
                                    <PlusCircleIcon className="w-5 h-5"/>
                                    Добавить площадку
                                </button>
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