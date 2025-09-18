import React, { useState, useRef } from 'react';
import { useImmer } from 'use-immer';
import { v4 as uuidv4 } from 'uuid';

import type { SearchSettings, Platform } from '../types';
import { DEFAULT_SEARCH_SETTINGS } from '../constants';
import { extractProfileDataFromResume, suggestPlatforms } from '../services/geminiService';

import { XCircleIcon } from './icons/XCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { UploadIcon } from './icons/UploadIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';

interface SetupWizardModalProps {
    onFinish: (result: { resume: string, settings: SearchSettings, profileName: string }) => void;
    onClose: () => void;
}

const steps = [
    { id: 1, name: 'Резюме', icon: PencilSquareIcon },
    { id: 2, name: 'Предпочтения', icon: BriefcaseIcon },
    { id: 3, name: 'Платформы', icon: GlobeAltIcon },
    { id: 4, name: 'Завершение', icon: ShieldCheckIcon },
];

const SetupWizardModal: React.FC<SetupWizardModalProps> = ({ onFinish, onClose }) => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [resume, setResume] = useState('');
    const [profileName, setProfileName] = useState('');
    const [settings, updateSettings] = useImmer<SearchSettings>(DEFAULT_SEARCH_SETTINGS);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBack = () => setStep(s => Math.max(1, s - 1));

    const handleAnalyzeResume = async () => {
        if (!resume.trim()) {
            setError('Пожалуйста, вставьте или загрузите ваше резюме.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            const { settings: extractedSettings, profileName: extractedName } = await extractProfileDataFromResume(resume);
            updateSettings(draft => {
                draft.positions = extractedSettings.positions || '';
                draft.salary = extractedSettings.salary || 0;
                draft.currency = extractedSettings.currency || 'RUB';
                draft.location = extractedSettings.location || '';
                draft.skills = extractedSettings.skills || '';
            });
            setProfileName(extractedName);
            setStep(2);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось проанализировать резюме.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestPlatforms = async () => {
        setError('');
        setIsLoading(true);
        try {
            const suggested = await suggestPlatforms(settings.positions, settings.location);
            const newPlatforms = suggested.map(p => ({
                id: uuidv4(),
                name: p.name,
                url: p.url,
                enabled: true, // Enable by default
            }));
            updateSettings(draft => {
                draft.platforms = newPlatforms;
            });
            setStep(3);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось подобрать платформы.');
             // Fallback to default if AI fails
            updateSettings(draft => {
                draft.platforms = DEFAULT_SEARCH_SETTINGS.platforms;
            });
            setStep(3);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setResume(text);
                setError('');
            };
            reader.readAsText(file);
        }
    };

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        updateSettings(draft => {
            if (type === 'number') {
                (draft as any)[name] = parseInt(value, 10) || 0;
            } else if (type === 'checkbox') {
                (draft as any)[name] = (e.target as HTMLInputElement).checked;
            } else {
                (draft as any)[name] = value;
            }
        });
    };
    
    const handlePlatformChange = (id: string, field: keyof Platform, value: string | boolean) => {
        updateSettings(draft => {
            const platform = draft.platforms.find(p => p.id === id);
            if(platform) {
                (platform[field] as any) = value;
            }
        });
    };

    const handleFinish = () => {
        if (!profileName.trim()) {
            setError('Пожалуйста, укажите имя профиля.');
            setStep(4); // Go back to the final step to fix it
            return;
        }
        onFinish({ resume, settings, profileName });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" role="dialog">
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-primary-500" /> Мастер Настройки Профиля
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <nav className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <ol className="flex items-center w-full">
                        {steps.map((s, index) => (
                            <li key={s.id} className={`flex w-full items-center ${index < steps.length - 1 ? "after:content-[''] after:w-full after:h-1 after:border-b after:border-slate-300 dark:after:border-slate-600 after:inline-block" : ""}`}>
                                <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${step >= s.id ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    <s.icon className="w-5 h-5" />
                                </span>
                            </li>
                        ))}
                    </ol>
                </nav>

                <main className="flex-1 p-6 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold">Шаг 1: Расскажите о себе</h3>
                            <p className="text-slate-600 dark:text-slate-400">Вставьте текст вашего резюме или загрузите его в формате .txt или .md. Наш ИИ проанализирует его, чтобы автоматически заполнить ваш профиль.</p>
                            <textarea
                                value={resume}
                                onChange={(e) => { setResume(e.target.value); setError(''); }}
                                rows={12}
                                placeholder="Вставьте сюда ваше резюме..."
                                className="w-full p-2 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                            />
                             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.md" className="hidden" />
                             <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">
                                <UploadIcon className="w-5 h-5"/>
                                Загрузить файл
                             </button>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold">Шаг 2: Ваши карьерные предпочтения</h3>
                            <p className="text-slate-600 dark:text-slate-400">ИИ проанализировал ваше резюме. Проверьте и при необходимости скорректируйте данные.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="positions" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Желаемые должности</label>
                                    <input id="positions" name="positions" type="text" value={settings.positions} onChange={handleSettingsChange} className="mt-1 w-full input-style"/>
                                </div>
                                 <div>
                                    <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Локация</label>
                                    <input id="location" name="location" type="text" value={settings.location} onChange={handleSettingsChange} className="mt-1 w-full input-style"/>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label htmlFor="salary" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Зарплата (от)</label>
                                        <input id="salary" name="salary" type="number" value={settings.salary} onChange={handleSettingsChange} className="mt-1 w-full input-style"/>
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor="currency" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Валюта</label>
                                        <select id="currency" name="currency" value={settings.currency} onChange={handleSettingsChange} className="mt-1 w-full input-style">
                                            <option value="RUB">RUB</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <input id="remote" name="remote" type="checkbox" checked={settings.remote} onChange={handleSettingsChange} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                                    <label htmlFor="remote" className="text-sm font-medium text-slate-700 dark:text-slate-300">Рассматриваю удаленную работу</label>
                                </div>
                                 <div className="md:col-span-2">
                                    <label htmlFor="skills" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ключевые навыки (через запятую)</label>
                                    <input id="skills" name="skills" value={settings.skills} onChange={handleSettingsChange} className="mt-1 w-full input-style"/>
                                </div>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold">Шаг 3: Платформы для поиска</h3>
                             {isLoading ? (
                                <div className="text-center p-8">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                                    <p className="mt-4 text-slate-600 dark:text-slate-400">ИИ подбирает лучшие площадки для вас...</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-slate-600 dark:text-slate-400">На основе ваших данных, ИИ рекомендует искать вакансии на этих сайтах. Выберите те, что вам подходят.</p>
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg text-sm flex items-start gap-2">
                                        <QuestionMarkCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5"/>
                                        <div>
                                            <span className="font-semibold">Как это работает?</span> ИИ использует продвинутые методы публичного поиска на выбранных сайтах. Это безопасно и не требует ввода ваших логинов и паролей.
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {settings.platforms.map(platform => (
                                            <div key={platform.id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-semibold">{platform.name}</h4>
                                                    <p className="text-xs text-slate-500">{platform.url}</p>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={platform.enabled} 
                                                    onChange={(e) => handlePlatformChange(platform.id, 'enabled', e.target.checked)} 
                                                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                     {step === 4 && (
                        <div className="space-y-4 text-center">
                            <ShieldCheckIcon className="w-16 h-16 text-green-500 mx-auto"/>
                            <h3 className="text-xl font-bold">Шаг 4: Все готово!</h3>
                            <p className="text-slate-600 dark:text-slate-400">Проверьте настройки вашего нового профиля. Вы всегда сможете изменить их позже.</p>
                            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-left space-y-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Имя профиля</label>
                                    <input type="text" value={profileName} onChange={(e) => { setProfileName(e.target.value); setError(''); }} className="w-full input-style font-semibold" />
                                </div>
                                <p className="text-sm"><strong className="text-slate-600 dark:text-slate-400">Должности:</strong> {settings.positions}</p>
                                <p className="text-sm"><strong className="text-slate-600 dark:text-slate-400">Локация:</strong> {settings.location} {settings.remote && "(удаленно)"}</p>
                                <p className="text-sm"><strong className="text-slate-600 dark:text-slate-400">Зарплата от:</strong> {settings.salary} {settings.currency}</p>
                                <p className="text-sm"><strong className="text-slate-600 dark:text-slate-400">Платформы:</strong> {settings.platforms.filter(p=>p.enabled).map(p=>p.name).join(', ') || 'Не выбраны'}</p>
                            </div>
                        </div>
                    )}
                    {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}
                </main>

                <footer className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <button onClick={handleBack} disabled={step === 1 || isLoading} className="btn-secondary disabled:opacity-50">
                        Назад
                    </button>
                    {step === 1 && (
                        <button onClick={handleAnalyzeResume} disabled={isLoading || !resume.trim()} className="btn-primary disabled:opacity-50">
                            {isLoading ? 'Анализ...' : 'Далее'}
                        </button>
                    )}
                     {step === 2 && (
                        <button onClick={handleSuggestPlatforms} disabled={isLoading} className="btn-primary disabled:opacity-50">
                            {isLoading ? 'Подбор...' : 'Подобрать платформы'}
                        </button>
                    )}
                     {step === 3 && (
                        <button onClick={() => setStep(4)} className="btn-primary">
                            Далее
                        </button>
                    )}
                    {step === 4 && (
                        <button onClick={handleFinish} disabled={isLoading} className="btn-primary bg-green-600 hover:bg-green-700">
                            Завершить и Создать Профиль
                        </button>
                    )}
                </footer>
                 <style>{`
                    .input-style {
                        padding: 0.5rem 0.75rem; background-color: #f1f5f9; border: 1px solid #cbd5e1;
                        border-radius: 0.375rem; outline: none; color: #0f172a;
                    }
                    .dark .input-style {
                        background-color: #334155; border-color: #475569; color: #e2e8f0;
                    }
                    .input-style:focus { border-color: #3b82f6; }
                    .btn-primary {
                        padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 600; color: white;
                        background-color: #2563eb; border-radius: 0.375rem; transition: background-color 0.2s;
                    }
                    .btn-primary:hover { background-color: #1d4ed8; }
                    .btn-primary:disabled { background-color: #94a3b8; cursor: not-allowed; }
                    .btn-secondary {
                        padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 600;
                        background-color: #e2e8f0; color: #1e293b; border-radius: 0.375rem;
                    }
                    .dark .btn-secondary { background-color: #475569; color: #e2e8f0; }
                    .btn-secondary:disabled { background-color: #cbd5e1; cursor: not-allowed; }
                `}</style>
            </div>
        </div>
    );
};

export default SetupWizardModal;
