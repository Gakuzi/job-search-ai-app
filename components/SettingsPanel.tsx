import React, { useState, useEffect } from 'react';
import type { Profile, SearchSettings, Prompts } from '../types';
import { AppStatus } from '../constants';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface SettingsPanelProps {
    profiles: Profile[];
    activeProfile: Profile | null;
    onProfileChange: (profileId: string) => void;
    onProfileUpdate: (profile: Profile) => void;
    onSearch: () => void;
    status: AppStatus;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ profiles, activeProfile, onProfileChange, onProfileUpdate, onSearch, status }) => {
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(activeProfile);
    const [expandedSections, setExpandedSections] = useState({
        resume: false,
        settings: true,
        prompts: false,
    });

    useEffect(() => {
        setCurrentProfile(activeProfile);
    }, [activeProfile]);

    const handleInputChange = <K extends keyof SearchSettings>(key: K, value: SearchSettings[K]) => {
        if (!currentProfile) return;
        const newSettings = { ...currentProfile.settings, [key]: value };
        const updatedProfile = { ...currentProfile, settings: newSettings };
        setCurrentProfile(updatedProfile);
        onProfileUpdate(updatedProfile); // Debounce could be added here
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

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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

    return (
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-lg shadow-md space-y-6">
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

            <div className="space-y-4">
                <Section title="Резюме" isExpanded={expandedSections.resume} onToggle={() => toggleSection('resume')}>
                     <textarea
                        value={currentProfile.resume}
                        onChange={handleResumeChange}
                        rows={10}
                        className="w-full input-field text-sm"
                        placeholder="Вставьте сюда ваше резюме..."
                    />
                </Section>
                
                <Section title="Параметры поиска" isExpanded={expandedSections.settings} onToggle={() => toggleSection('settings')}>
                     <div className="space-y-4">
                        <InputField label="Должности" value={currentProfile.settings.positions} onChange={e => handleInputChange('positions', e.target.value)} />
                        <InputField label="Зарплата от" type="number" value={currentProfile.settings.salary} onChange={e => handleInputChange('salary', parseInt(e.target.value, 10))} />
                        <InputField label="Локация" value={currentProfile.settings.location} onChange={e => handleInputChange('location', e.target.value)} />
                         <InputField label="Ключевые навыки" value={currentProfile.settings.skills} onChange={e => handleInputChange('skills', e.target.value)} />
                    </div>
                </Section>

                <Section title="Промпты для ИИ (Advanced)" isExpanded={expandedSections.prompts} onToggle={() => toggleSection('prompts')}>
                    <div className="space-y-4">
                         <label className="block text-xs text-slate-500 dark:text-slate-400">Здесь можно тонко настроить поведение ИИ. Редактируйте с осторожностью.</label>
                         <InputField label="Парсинг вакансий" type="textarea" value={currentProfile.prompts.jobSearch} onChange={e => handlePromptChange('jobSearch', e.target.value)} />
                         <InputField label="Адаптация резюме" type="textarea" value={currentProfile.prompts.resumeAdapt} onChange={e => handlePromptChange('resumeAdapt', e.target.value)} />
                         <InputField label="Сопроводительное" type="textarea" value={currentProfile.prompts.coverLetter} onChange={e => handlePromptChange('coverLetter', e.target.value)} />
                    </div>
                </Section>
            </div>
            
            <button
                onClick={onSearch}
                disabled={status === AppStatus.Loading}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-slate-400"
            >
                <SparklesIcon className="w-5 h-5" />
                {status === AppStatus.Loading ? 'Поиск...' : 'Найти вакансии с ИИ'}
            </button>
        </div>
    );
};


interface SectionProps {
    title: string;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, isExpanded, onToggle, children }) => (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
        <button onClick={onToggle} className="w-full flex justify-between items-center p-3 text-left">
            <h3 className="font-semibold">{title}</h3>
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && <div className="p-3 border-t border-slate-200 dark:border-slate-700">{children}</div>}
    </div>
);


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
            <textarea value={value} onChange={onChange} rows={5} className="w-full input-field text-xs" />
        ) : (
            <input type={type} value={value} onChange={onChange} className="w-full input-field" />
        )}
    </div>
);

export default SettingsPanel;
