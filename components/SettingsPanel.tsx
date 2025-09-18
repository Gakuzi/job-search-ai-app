import React, { useState, useEffect } from 'react';
import type { Profile, SearchSettings, Prompts } from '../types';
import { AppStatus } from '../constants';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import GmailConnect from './GmailConnect';

interface SettingsPanelProps {
    profiles: Profile[];
    activeProfile: Profile | null;
    onProfileChange: (profileId: string) => void;
    onProfileUpdate: (profile: Profile) => void;
    onSearch: () => void;
    status: AppStatus;
    // Gmail props
    user: { email?: string | null } | null;
    googleAccessToken: string | null;
    onGoogleConnect: () => void;
    onGoogleDisconnect: () => void;
    isGoogleAuthLoading: boolean;
    googleAuthError: string | null;
}

const SettingsPanel: React.FC<SettingsPanelProps> = (props) => {
    const { 
        profiles, activeProfile, onProfileChange, onProfileUpdate, onSearch, status,
        user, googleAccessToken, onGoogleConnect, onGoogleDisconnect, isGoogleAuthLoading, googleAuthError
    } = props;
    
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(activeProfile);
    const [activeTab, setActiveTab] = useState('settings');

    useEffect(() => {
        setCurrentProfile(activeProfile);
    }, [activeProfile]);

    const handleInputChange = <K extends keyof SearchSettings>(key: K, value: SearchSettings[K]) => {
        if (!currentProfile) return;
        const newSettings = { ...currentProfile.settings, [key]: value };
        const updatedProfile = { ...currentProfile, settings: newSettings };
        setCurrentProfile(updatedProfile);
        onProfileUpdate(updatedProfile);
    };
    
    const handleResumeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!currentProfile) return;
        const updatedProfile = { ...currentProfile, resume: e.target.value };
        setCurrentProfile(updatedProfile);
        onProfileUpdate(updatedProfile);
    }
    
     const handlePromptChange = <K extends keyof Prompts>(key: K, value: Prompts[K]) => {
        if (!currentProfile) return;
        const newPrompts = { ...currentProfile.prompts, [key]: value };
        const updatedProfile = { ...currentProfile, prompts: newPrompts };
        setCurrentProfile(updatedProfile);
        onProfileUpdate(updatedProfile);
    };

    if (!currentProfile) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                 <h2 className="text-lg font-bold mb-4">Профиль поиска</h2>
                <div className="text-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                    <p className="text-slate-500 dark:text-slate-400">Профиль не найден.</p>
                    <button className="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-500 flex items-center gap-1 mx-auto">
                        <PlusCircleIcon className="w-5 h-5" />
                        Создать новый профиль
                    </button>
                </div>
            </div>
        )
    }
    
    const TabButton = ({ id, label }: { id: string, label: string }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === id ? 'bg-primary-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
            {label}
        </button>
    )

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <div className="p-4 md:p-6 space-y-4">
                <div>
                    <label htmlFor="profile-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Профиль поиска</label>
                    <select 
                        id="profile-select" 
                        value={activeProfile?.id || ''} 
                        onChange={e => onProfileChange(e.target.value)}
                        className="w-full input-field"
                    >
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="flex gap-2 -mb-px">
                       <TabButton id="settings" label="Параметры" />
                       <TabButton id="resume" label="Резюме" />
                       <TabButton id="integrations" label="Интеграции" />
                       <TabButton id="prompts" label="Промпты" />
                    </nav>
                </div>
                
                <div className="pt-4">
                     {activeTab === 'settings' && (
                         <div className="space-y-4 animate-fade-in">
                            <InputField label="Должности" value={currentProfile.settings.positions} onChange={e => handleInputChange('positions', e.target.value)} />
                            <InputField label="Зарплата от" type="number" value={currentProfile.settings.salary} onChange={e => handleInputChange('salary', parseInt(e.target.value, 10))} />
                            <InputField label="Локация" value={currentProfile.settings.location} onChange={e => handleInputChange('location', e.target.value)} />
                             <InputField label="Ключевые навыки" value={currentProfile.settings.skills} onChange={e => handleInputChange('skills', e.target.value)} />
                        </div>
                     )}
                     {activeTab === 'resume' && (
                         <div className="animate-fade-in">
                            <textarea
                                value={currentProfile.resume}
                                onChange={handleResumeChange}
                                rows={15}
                                className="w-full input-field text-sm"
                                placeholder="Вставьте сюда ваше резюме..."
                            />
                         </div>
                     )}
                     {activeTab === 'integrations' && (
                         <div className="animate-fade-in">
                             <GmailConnect
                                isConnected={!!googleAccessToken}
                                userEmail={user?.email}
                                onConnect={onGoogleConnect}
                                onDisconnect={onGoogleDisconnect}
                                isLoading={isGoogleAuthLoading}
                                error={googleAuthError}
                             />
                         </div>
                     )}
                     {activeTab === 'prompts' && (
                        <div className="space-y-4 animate-fade-in">
                             <p className="text-xs text-slate-500 dark:text-slate-400">Здесь можно тонко настроить поведение ИИ. Редактируйте с осторожностью.</p>
                             <InputField label="Парсинг вакансий" type="textarea" value={currentProfile.prompts.jobSearch} onChange={e => handlePromptChange('jobSearch', e.target.value)} />
                             <InputField label="Адаптация резюме" type="textarea" value={currentProfile.prompts.resumeAdapt} onChange={e => handlePromptChange('resumeAdapt', e.target.value)} />
                             <InputField label="Сопроводительное" type="textarea" value={currentProfile.prompts.coverLetter} onChange={e => handlePromptChange('coverLetter', e.target.value)} />
                             <InputField label="Анализ ответа HR" type="textarea" value={currentProfile.prompts.hrResponseAnalysis} onChange={e => handlePromptChange('hrResponseAnalysis', e.target.value)} />
                             <InputField label="Сопоставление Email" type="textarea" value={currentProfile.prompts.emailJobMatch} onChange={e => handlePromptChange('emailJobMatch', e.target.value)} />
                        </div>
                     )}
                </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                <button
                    onClick={onSearch}
                    disabled={status === AppStatus.Loading}
                    className="w-full flex justify-center items-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-slate-400"
                >
                    <SparklesIcon className="w-5 h-5" />
                    {status === AppStatus.Loading ? 'Поиск...' : 'Найти вакансии с ИИ'}
                </button>
            </div>
             <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

interface InputFieldProps {
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    type?: 'text' | 'number' | 'textarea';
}

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, type = 'text' }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        {type === 'textarea' ? (
            <textarea value={value} onChange={onChange} rows={8} className="w-full input-field text-xs" />
        ) : (
            <input type={type} value={value} onChange={onChange} className="w-full input-field" />
        )}
    </div>
);

export default SettingsPanel;
