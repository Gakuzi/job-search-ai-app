import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { SparklesIcon } from './icons/SparklesIcon';
import { UploadIcon } from './icons/UploadIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { extractProfileDataFromResume, suggestPlatforms } from '../services/geminiService';
import type { SearchSettings, Platform } from '../types';
import { DEFAULT_SEARCH_SETTINGS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

interface SetupWizardModalProps {
    onClose: () => void;
    onFinish: (data: { resume: string; settings: SearchSettings; profileName: string; }) => void;
    getApiKey: () => string | null;
    rotateApiKey: () => void;
}

const SetupWizardModal: React.FC<SetupWizardModalProps> = ({ onClose, onFinish, getApiKey, rotateApiKey }) => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [resume, setResume] = useState('');
    const [profileName, setProfileName] = useState('');
    const [settings, setSettings] = useState<Partial<SearchSettings>>({});
    const [platforms, setPlatforms] = useState<Platform[]>(DEFAULT_SEARCH_SETTINGS.platforms);
    
    const handleNext = async () => {
        setError('');
        if (step === 1) {
            if (!resume.trim()) {
                setError('Пожалуйста, вставьте текст вашего резюме.');
                return;
            }
            setIsLoading(true);
            try {
                const apiKey = getApiKey();
                if (!apiKey) throw new Error("API ключ не найден.");
                const data = await extractProfileDataFromResume(resume, apiKey, rotateApiKey);
                setProfileName(data.profileName);
                setSettings(data.settings);
                
                const suggested = await suggestPlatforms(data.settings.positions || 'developer', data.settings.location || 'russia', apiKey, rotateApiKey);
                const newPlatforms: Platform[] = suggested.map(p => ({
                    id: uuidv4(),
                    name: p.name,
                    url: p.url,
                    enabled: true,
                    type: 'scrape',
                }));
                 // Add defaults if they are not present
                DEFAULT_SEARCH_SETTINGS.platforms.forEach(dp => {
                    if (!newPlatforms.some(np => np.name.toLowerCase() === dp.name.toLowerCase())) {
                        newPlatforms.push({...dp, enabled: false});
                    }
                });
                setPlatforms(newPlatforms);
                setStep(2);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Произошла ошибка при анализе резюме.');
            } finally {
                setIsLoading(false);
            }
        } else if (step === 2) {
            const finalSettings: SearchSettings = {
                ...DEFAULT_SEARCH_SETTINGS,
                ...settings,
                platforms,
            };
            onFinish({ resume, settings: finalSettings, profileName });
        }
    };
    
    const togglePlatform = (id: string) => {
        setPlatforms(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-center">Добро пожаловать! Давайте создадим ваш профиль.</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 mb-4">
                            Вставьте текст вашего резюме. Наш ИИ проанализирует его, чтобы автоматически настроить параметры поиска.
                        </p>
                        <textarea
                            value={resume}
                            onChange={(e) => setResume(e.target.value)}
                            rows={15}
                            placeholder="Вставьте сюда полный текст вашего резюме..."
                            className="w-full p-2 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                );
            case 2:
                return (
                    <div>
                         <h3 className="text-lg font-semibold text-center">Проверьте настройки и выберите площадки</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 mb-4">
                            ИИ предлагает следующие параметры на основе вашего резюме. Вы можете их отредактировать позже.
                        </p>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Название профиля</label>
                                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="mt-1 input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Желаемые должности</label>
                                <input type="text" value={settings.positions} onChange={(e) => setSettings(s => ({...s, positions: e.target.value}))} className="mt-1 input-field" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Город</label>
                                <input type="text" value={settings.location} onChange={(e) => setSettings(s => ({...s, location: e.target.value}))} className="mt-1 input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Площадки для поиска</label>
                                 <div className="mt-2 space-y-2">
                                    {platforms.map(p => (
                                        <label key={p.id} className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-700 rounded-md cursor-pointer">
                                            <input type="checkbox" checked={p.enabled} onChange={() => togglePlatform(p.id)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                                            <span className="font-medium">{p.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            default:
                return null;
        }
    };

    const modalFooter = (
        <>
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                {step === 1 ? 'Пропустить' : 'Отмена'}
            </button>
            <button 
                onClick={handleNext} 
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-slate-400 flex items-center gap-2"
            >
                <SparklesIcon className="w-4 h-4"/>
                {step === 1 ? 'Проанализировать' : 'Завершить настройку'}
            </button>
        </>
    );

    return (
        <Modal
            title="Мастер настройки"
            onClose={onClose}
            isLoading={isLoading}
            footer={modalFooter}
        >
            <style>{`.input-field { width: 100%; padding: 0.5rem; font-size: 0.875rem; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 0.375rem; } .dark .input-field { background-color: #334155; border-color: #475569; }`}</style>
            {error && <p className="mb-4 p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-sm">{error}</p>}
            {renderStepContent()}
        </Modal>
    );
};

export default SetupWizardModal;
