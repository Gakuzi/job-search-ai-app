import React, { useState } from 'react';
import Modal from './Modal';
import type { Profile } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';

interface SetupWizardModalProps {
    onFinish: (profileData: Omit<Profile, 'id' | 'userId'>) => void;
}

const SetupWizardModal: React.FC<SetupWizardModalProps> = ({ onFinish }) => {
    const [step, setStep] = useState(1);
    const [profileName, setProfileName] = useState('Основной профиль');
    const [resume, setResume] = useState('');
    const [position, setPosition] = useState('');

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            // Finish
            const newProfile: Omit<Profile, 'id' | 'userId'> = {
                name: profileName.trim(),
                resume: resume.trim(),
                searchSettings: {
                    platforms: { hh: true, habr: false, avito: false },
                    positions: position.trim(),
                    location: 'Москва', // Default value
                    salary: 100000, // Default value
                    limit: 20,
                    additional_requirements: ''
                }
            };
            onFinish(newProfile);
        }
    };

    const isNextDisabled = () => {
        if (step === 1 && !profileName.trim()) return true;
        if (step === 2 && resume.trim().length < 50) return true;
        if (step === 3 && !position.trim()) return true;
        return false;
    };

    const wizardFooter = (
        <button
            onClick={handleNext}
            disabled={isNextDisabled()}
            className="px-6 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-slate-400"
        >
            {step === 3 ? 'Завершить настройку' : 'Далее'}
        </button>
    );

    return (
        <Modal
            title="Добро пожаловать!"
            onClose={() => {}} // Can't close wizard
            footer={wizardFooter}
        >
            <div className="space-y-4">
                <div className="text-center">
                    <SparklesIcon className="w-12 h-12 text-primary-500 mx-auto" />
                    <p className="mt-2 text-slate-600 dark:text-slate-400">Давайте настроим вашего AI-ассистента для поиска работы.</p>
                </div>
                
                {/* Progress Bar */}
                <div className="flex justify-center items-center gap-2">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`w-1/3 h-2 rounded-full ${s <= step ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    ))}
                </div>

                {step === 1 && (
                    <div>
                        <h3 className="font-semibold text-lg text-center">Шаг 1: Название профиля</h3>
                        <p className="text-sm text-slate-500 text-center mt-1 mb-4">Вы можете создать несколько профилей для поиска разных должностей.</p>
                        <input
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Например, 'Frontend разработчик' или 'Основной'"
                            className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                        />
                    </div>
                )}

                {step === 2 && (
                     <div>
                        <h3 className="font-semibold text-lg text-center">Шаг 2: Ваше резюме</h3>
                        <p className="text-sm text-slate-500 text-center mt-1 mb-4">Вставьте сюда полный текст вашего резюме. AI будет использовать его для анализа вакансий.</p>
                        <textarea
                            value={resume}
                            onChange={(e) => setResume(e.target.value)}
                            rows={10}
                            placeholder="Опыт работы, навыки, образование..."
                            className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                        />
                         {resume.trim().length > 0 && resume.trim().length < 50 && <p className="text-xs text-red-500 mt-1">Пожалуйста, вставьте более полное резюме.</p>}
                    </div>
                )}

                 {step === 3 && (
                     <div>
                        <h3 className="font-semibold text-lg text-center">Шаг 3: Какую работу ищем?</h3>
                        <p className="text-sm text-slate-500 text-center mt-1 mb-4">Укажите ключевую должность для первого поиска.</p>
                        <input
                            type="text"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            placeholder="Например, 'React Developer' или 'Product Manager'"
                            className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default SetupWizardModal;
