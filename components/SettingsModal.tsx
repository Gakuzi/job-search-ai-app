import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Profile, PromptTemplate, GoogleUser, SearchSettings } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import GmailConnect from './GmailConnect';
import { getApiKey, saveApiKey } from '../services/apiKeyService';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SparklesIcon } from './icons/SparklesIcon'; // Using a nice icon for the wizard

interface SettingsModalProps {
    profile: Profile;
    onClose: () => void;
    onUpdateProfile: (updates: Partial<Profile>) => void;
    onDeleteProfile: () => void;
    onAddProfile: (name: string) => void;
    onRerunWizard: () => void; // Function to restart the setup wizard for the current profile
    
    isGoogleConnected: boolean;
    googleUser: GoogleUser | null;
    onGoogleConnect: () => void;
    onGoogleDisconnect: () => void;

    promptTemplates: PromptTemplate[];
    onUpdatePrompt: (id: string, newTemplate: string) => void;
    onEditPrompt: (template: PromptTemplate) => void;
}

const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
    positions: '',
    location: '',
    salary: 0,
    limit: 20,
    platforms: { hh: true, habr: false, avito: true },
};

const SettingsModal: React.FC<SettingsModalProps> = ({
    profile,
    onClose,
    onUpdateProfile,
    onDeleteProfile,
    onAddProfile,
    onRerunWizard,
    isGoogleConnected,
    googleUser,
    onGoogleConnect,
    onGoogleDisconnect,
    promptTemplates,
    onEditPrompt
}) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [resume, setResume] = useState(profile.resume);
    const [searchSettings, setSearchSettings] = useState<SearchSettings>(profile.searchSettings || DEFAULT_SEARCH_SETTINGS);
    const [avitoClientId, setAvitoClientId] = useState('');
    const [avitoClientSecret, setAvitoClientSecret] = useState('');

    const debouncedResume = useDebounce(resume, 500);
    const debouncedSettings = useDebounce(searchSettings, 500);

    useEffect(() => {
        setResume(profile.resume);
        setSearchSettings(profile.searchSettings || DEFAULT_SEARCH_SETTINGS);
    }, [profile]);

    useEffect(() => {
        if (debouncedResume !== profile.resume) {
            onUpdateProfile({ resume: debouncedResume });
        }
    }, [debouncedResume, profile.resume, onUpdateProfile]);

    useEffect(() => {
        if (debouncedSettings && JSON.stringify(debouncedSettings) !== JSON.stringify(profile.searchSettings)) {
            if (profile.searchSettings || Object.values(debouncedSettings).some(v => v)) {
                onUpdateProfile({ searchSettings: debouncedSettings });
            }
        }
    }, [debouncedSettings, profile.searchSettings, onUpdateProfile]);

    useEffect(() => {
        getApiKey('avito_client_id').then(id => setAvitoClientId(id || ''));
        getApiKey('avito_client_secret').then(secret => setAvitoClientSecret(secret || ''));
    }, []);

    const handleSaveApiKeys = () => {
        saveApiKey('avito_client_id', avitoClientId);
        saveApiKey('avito_client_secret', avitoClientSecret);
        alert('Ключи API Avito сохранены!');
    };
    
    const handleAddProfile = () => {
        const name = prompt('Введите название нового профиля:');
        if (name) {
            onAddProfile(name);
        }
    };
    
    const handleDeleteProfile = () => {
        if (confirm(`Вы уверены, что хотите удалить профиль "${profile.name}"?`)) {
            onDeleteProfile();
        }
    };

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const type = e.target.type;

        setSearchSettings(prev => {
            if (!prev) return DEFAULT_SEARCH_SETTINGS;
            if (name.startsWith('platforms.')) {
                const platform = name.split('.')[1] as keyof SearchSettings['platforms'];
                return {
                    ...prev,
                    platforms: { ...prev.platforms, [platform]: (e.target as HTMLInputElement).checked }
                };
            } else {
                return {
                    ...prev,
                    [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
                };
            }
        });
    };

    const tabs = [
        { id: 'profile', label: 'Профиль и Поиск' },
        { id: 'integrations', label: 'Интеграции' },
        { id: 'prompts', label: 'Промпты' },
    ];

    const currentSettings = searchSettings || DEFAULT_SEARCH_SETTINGS;

    return (
        <Modal title="Настройки" onClose={onClose} footer={<button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">Закрыть</button>}>
            <div className="flex flex-col sm:flex-row -m-6 min-h-[60vh]">
                <aside className="w-full sm:w-52 p-4 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <nav className="flex sm:flex-col gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <h4 className="px-3 text-xs font-semibold uppercase text-slate-400">Управление</h4>
                        <button onClick={onRerunWizard} className="w-full flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                            <SparklesIcon className="w-5 h-5" />
                            Настроить с ИИ
                        </button>
                         <button onClick={handleAddProfile} className="w-full flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                            <PlusCircleIcon className="w-5 h-5" />
                            Добавить профиль
                        </button>
                        <button onClick={handleDeleteProfile} className="w-full flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30">
                            <TrashIcon className="w-5 h-5" />
                            Удалить профиль
                        </button>
                    </div>
                </aside>

                <main className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Резюме для профиля "{profile.name}"</h3>
                                <p className="text-sm text-slate-500 mb-2">Это резюме будет использоваться AI для анализа вакансий и генерации откликов.</p>
                                <textarea
                                    value={resume || ''}
                                    onChange={(e) => setResume(e.target.value)}
                                    rows={10}
                                    className="w-full p-2 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Параметры поиска</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <input name="positions" value={currentSettings.positions} onChange={handleSettingsChange} placeholder="Должность (напр., React Developer)" className="settings-input" />
                                    <input name="location" value={currentSettings.location} onChange={handleSettingsChange} placeholder="Локация" className="settings-input" />
                                    <input name="salary" type="number" value={currentSettings.salary || ''} onChange={handleSettingsChange} placeholder="Зарплата от" className="settings-input" />
                                    <input name="limit" type="number" value={currentSettings.limit || ''} onChange={handleSettingsChange} placeholder="Лимит вакансий" className="settings-input" />
                                    <div className="md:col-span-2">
                                        <h4 className="text-sm font-medium mb-1">Платформы:</h4>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2"><input type="checkbox" name="platforms.hh" checked={currentSettings.platforms.hh} onChange={handleSettingsChange}/> hh.ru</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" name="platforms.habr" disabled checked={currentSettings.platforms.habr} onChange={handleSettingsChange}/> Habr Карьера (скоро)</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" name="platforms.avito" checked={currentSettings.platforms.avito} onChange={handleSettingsChange}/> Avito Работа</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                     {activeTab === 'integrations' && (
                        <div className="space-y-6">
                            <GmailConnect 
                                isConnected={isGoogleConnected}
                                user={googleUser}
                                onConnect={onGoogleConnect}
                                onDisconnect={onGoogleDisconnect}
                            />
                             <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Интеграция с Avito</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    Для поиска по Avito необходимо получить Client ID и Client Secret. <a href="https://developers.avito.ru/api-catalog/job-search/documentation" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">Инструкция</a>.
                                </p>
                                <div className="mt-4 space-y-3">
                                    <input value={avitoClientId} onChange={e => setAvitoClientId(e.target.value)} placeholder="Avito Client ID" className="settings-input" />
                                    <input type="password" value={avitoClientSecret} onChange={e => setAvitoClientSecret(e.target.value)} placeholder="Avito Client Secret" className="settings-input" />
                                    <div className="flex justify-end">
                                        <button onClick={handleSaveApiKeys} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700">Сохранить ключи Avito</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                     {activeTab === 'prompts' && (
                        <div className="space-y-4">
                             <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Редактор AI Промптов</h3>
                             <p className="text-sm text-slate-500">Настройте шаблоны, которые AI использует для генерации контента. Это позволяет тонко адаптировать ответы под ваш стиль.</p>
                             <div className="space-y-3">
                                {promptTemplates.map(template => (
                                    <div key={template.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between items-center">
                                        <div>
                                            <h4 className="font-semibold">{template.name}</h4>
                                            <p className="text-xs text-slate-500">{template.description}</p>
                                        </div>
                                        <button onClick={() => onEditPrompt(template)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" title="Редактировать">
                                            <PencilSquareIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
             <style>{`
                .settings-input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    background-color: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    border-radius: 0.375rem;
                    outline: none;
                    color: #0f172a;
                }
                .dark .settings-input {
                    background-color: #334155;
                    border-color: #475569;
                    color: #e2e8f0;
                }
                .settings-input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
                }
            `}</style>
        </Modal>
    );
};

export default SettingsModal;
