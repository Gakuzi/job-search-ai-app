import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { analyzeResumeWithAI } from '../services/geminiService';
import type { Profile, SearchSettings } from '../types';

interface SetupWizardModalProps {
    onFinish: (profile: Omit<Profile, 'id' | 'userId'>) => void;
    initialProfile?: Profile | null; // Accept an optional profile to edit
}

const SetupWizardModal: React.FC<SetupWizardModalProps> = ({ onFinish, initialProfile }) => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    // FIX: Initialize state with initialProfile data if it exists, otherwise use defaults.
    const [profileName, setProfileName] = useState(initialProfile?.name || 'Основной');
    const [resume, setResume] = useState(initialProfile?.resume || '');
    const [searchSettings, setSearchSettings] = useState<SearchSettings>(initialProfile?.searchSettings || {
        positions: '',
        location: '',
        salary: 0,
        limit: 20,
        platforms: { hh: true, avito: true, habr: false }
    });
    
    // If we are editing, we might want to start on a different step, e.g., step 2.
    useEffect(() => {
        if (initialProfile) {
            setStep(2); 
        }
    }, [initialProfile]);


    const handleResumeAnalysis = async () => {
        if (!resume.trim()) {
            alert('Пожалуйста, вставьте текст вашего резюме.');
            return;
        }
        setIsLoading(true);
        try {
            const analysis = await analyzeResumeWithAI(resume);
            setSearchSettings(prev => ({ 
                ...prev,
                positions: analysis.positions, 
                location: analysis.location 
            }));
            setStep(3);
        } catch (error) {
            console.error("Resume analysis failed:", error);
            alert('Не удалось проанализировать резюме. Пожалуйста, попробуйте еще раз.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalSubmit = () => {
        if (!profileName.trim()) {
            alert('Пожалуйста, введите название профиля.');
            return;
        }
        onFinish({ name: profileName, resume, searchSettings });
    };
    
    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith('platforms.')) {
            const platform = name.split('.')[1] as keyof SearchSettings['platforms'];
             setSearchSettings(prev => ({...prev, platforms: {...prev.platforms, [platform]: checked}}));
        } else {
             setSearchSettings(prev => ({...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
        }
    }

    const renderStep = () => {
        switch (step) {
            case 1: // Welcome Step (only for new profiles)
                return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">Добро пожаловать!</h2>
                        <p className="text-slate-600 dark:text-slate-300">Давайте настроим ваш первый профиль для поиска работы. Это займет всего минуту.</p>
                        <button onClick={() => setStep(2)} className="mt-6 btn btn-primary">
                            Начать настройку
                        </button>
                    </div>
                );
            case 2: // Resume Input Step
                return (
                    <div>
                        <h2 className="text-xl font-bold mb-3">Шаг 1: Ваше резюме</h2>
                        <p className="text-sm text-slate-500 mb-3">Вставьте полный текст вашего резюме. Наш ИИ проанализирует его, чтобы автоматически заполнить параметры поиска.</p>
                        <textarea
                            value={resume}
                            onChange={(e) => setResume(e.target.value)}
                            rows={12}
                            placeholder="Вставьте сюда текст вашего резюме..."
                            className="w-full p-2 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <div className="flex justify-end mt-4">
                            <button onClick={handleResumeAnalysis} disabled={isLoading || !resume.trim()} className="btn btn-primary">
                                {isLoading ? 'Анализируем...' : 'Проанализировать резюме'}
                            </button>
                        </div>
                    </div>
                );
            case 3: // Settings Confirmation Step
                return (
                    <div>
                        <h2 className="text-xl font-bold mb-3">Шаг 2: Параметры поиска</h2>
                        <p className="text-sm text-slate-500 mb-4">Наш ИИ проанализировал ваше резюме и предлагает следующие параметры. Вы можете их изменить.</p>
                        <div className="space-y-4">
                             <input type="text" name="profileName" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Название профиля" className="settings-input" />
                             <input type="text" name="positions" value={searchSettings.positions} onChange={handleSettingsChange} placeholder="Должность" className="settings-input" />
                             <input type="text" name="location" value={searchSettings.location} onChange={handleSettingsChange} placeholder="Локация" className="settings-input" />
                             <input type="number" name="salary" value={searchSettings.salary || ''} onChange={handleSettingsChange} placeholder="Желаемая зарплата" className="settings-input" />
                        </div>
                         <div className="mt-6">
                            <h4 className="text-sm font-medium mb-2">Платформы для поиска:</h4>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2"><input type="checkbox" name="platforms.hh" checked={searchSettings.platforms.hh} onChange={handleSettingsChange}/> hh.ru</label>
                                <label className="flex items-center gap-2"><input type="checkbox" name="platforms.habr" disabled checked={searchSettings.platforms.habr} onChange={handleSettingsChange}/> Habr Карьера (скоро)</label>
                                <label className="flex items-center gap-2"><input type="checkbox" name="platforms.avito" checked={searchSettings.platforms.avito} onChange={handleSettingsChange}/> Avito Работа</label>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-6">
                            <button onClick={() => setStep(2)} className="text-sm text-slate-600 hover:underline">Назад</button>
                            <button onClick={handleFinalSubmit} className="btn btn-primary">
                                {initialProfile ? 'Сохранить изменения' : 'Завершить и сохранить'}
                            </button>
                        </div>
                    </div>
                );
            default:
                return <div>Что-то пошло не так.</div>;
        }
    };

    return (
        <Modal 
            title={initialProfile ? `Редактирование профиля` : 'Мастер настройки профиля'} 
            onClose={() => {}}
            showCloseButton={false}
        >
            <div className="p-4">
                 <div className="flex items-center justify-center mb-6">
                    <SparklesIcon className="w-8 h-8 text-primary-500 mr-2" />
                    <h1 className="text-xl font-bold">
                        {initialProfile ? `Обновление "${profileName}"` : 'AI-помощник настройки'}
                    </h1>
                </div>
                {renderStep()}
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
                    .btn { padding: 8px 16px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                    .btn-primary { background-color: #4f46e5; color: white; }
                    .btn-primary:hover { background-color: #4338ca; }
                    .btn-primary:disabled { background-color: #a5b4fc; cursor: not-allowed; }
                `}</style>
            </div>
        </Modal>
    );
};

export default SetupWizardModal;
