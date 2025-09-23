import React, { useState } from 'react';
import { KeyIcon } from './icons/KeyIcon.tsx';
import { WarningIcon } from './icons/WarningIcon.tsx';
import { CodeBracketIcon } from './icons/CodeBracketIcon.tsx';
import { GlobeAltIcon } from './icons/GlobeAltIcon.tsx';

const InputField: React.FC<{
    label: string;
    name: keyof ApiConfig;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isSecret?: boolean;
}> = ({ label, name, value, onChange, isSecret = false }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
        </label>
        <input
            type={isSecret ? "password" : "text"}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
    </div>
);

const ConfigurationError: React.FC<{}> = () => {
    const [config, setConfig] = useState<ApiConfig>(getApiConfig());

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="flex gap-4">
        <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-500 text-white font-bold">{number}</div>
            <div className="flex-1 w-px bg-slate-300 dark:bg-slate-600 my-2"></div>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{children}</div>
        </div>
    </div>
);

const ExternalLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
        {children}
    </a>
);

    const handleSave = () => {
        saveApiConfig(config);
        // Add a small delay to ensure localStorage is updated before reload
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    const firebaseFields: (keyof ApiConfig)[] = [
        'firebase_api_key', 'firebase_auth_domain', 'firebase_project_id',
        'firebase_storage_bucket', 'firebase_messaging_sender_id', 'firebase_app_id'
    ];

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
                <div className="text-center mb-6">
                     <div className="inline-block p-3 bg-red-100 dark:bg-red-900/40 rounded-full mb-4">
                        <WarningIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Требуется настройка</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                        Приложение не может запуститься, так как не хватает ключей API. Пожалуйста, следуйте инструкциям ниже для вашей среды.
                    </p>
                </div>
                
                <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                    <div className="flex -mb-px">
                        <TabButton tabName="local" label="Локальная разработка" icon={<CodeBracketIcon className="w-5 h-5" />} />
                        <TabButton tabName="vercel" label="Развертывание на Vercel" icon={<GlobeAltIcon className="w-5 h-5" />} />
                    </div>
                </div>

                {activeTab === 'local' && (
                    <div className="space-y-4 animate-fade-in">
                        <Step number={1} title="Создайте файл .env.local">
                            В корневой папке вашего проекта (рядом с `index.html`) создайте файл с именем `.env.local`.
                        </Step>
                        <Step number={2} title="Скопируйте и вставьте переменные">
                            <p>Скопируйте приведенный ниже текст и вставьте его в созданный файл `.env.local`.</p>
                            <div className="mt-2">
                                <pre className="p-4 bg-slate-900 text-slate-200 rounded-lg text-xs overflow-x-auto">
                                    <code>{envFileContent}</code>
                                </pre>
                                <button onClick={() => navigator.clipboard.writeText(envFileContent)} className="mt-2 px-3 py-1 text-xs bg-slate-200 dark:bg-slate-600 rounded hover:bg-slate-300 dark:hover:bg-slate-500">
                                    Скопировать
                                </button>
                            </div>
                        </Step>
                        <Step number={3} title="Замените значения вашими ключами">
                           <p>Получите ключи из следующих сервисов и вставьте их вместо многоточий (`...`):</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li><b>Firebase:</b> <ExternalLink href="https://console.firebase.google.com/">Консоль Firebase</ExternalLink> &rarr; Настройки проекта &rarr; Общие.</li>
                                <li><b>Gemini API:</b> <ExternalLink href="https://aistudio.google.com/app/apikey">Google AI Studio</ExternalLink>.</li>
                                <li><b>Google Client ID:</b> <ExternalLink href="https://console.cloud.google.com/apis/credentials">Google Cloud Console</ExternalLink>.</li>
                            </ul>
                        </Step>
                         <Step number={4} title="Перезапустите сервер">
                            Остановите ваш сервер разработки (обычно `Ctrl+C` в терминале) и запустите его снова командой `npm run dev`.
                        </Step>
                    </div>
                )}
                
                {activeTab === 'vercel' && (
                    <div className="space-y-6 animate-fade-in">
                        <Step number={1} title="Откройте настройки проекта Vercel">
                           Перейдите в ваш проект на Vercel и откройте раздел `Settings` &rarr; `Environment Variables`.
                           <br />
                           <ExternalLink href="https://vercel.com/dashboard">Перейти в панель управления Vercel</ExternalLink>
                        </Step>

                        <Step number={2} title="Добавьте переменные окружения">
                            <p>Вам нужно добавить переменные для работы фронтенда (Firebase, Google) и бэкенда (Avito). Добавьте каждую переменную из списка ниже.</p>
                             <div className="mt-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                <h4 className="font-semibold text-md text-slate-700 dark:text-slate-300">Ключи для Фронтенда (VITE)</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm font-mono mt-2 text-slate-700 dark:text-slate-300">
                                    <li>VITE_FIREBASE_API_KEY &mdash; <ExternalLink href="https://console.firebase.google.com/">получить</ExternalLink></li>
                                    <li>VITE_FIREBASE_AUTH_DOMAIN</li>
                                    <li>VITE_FIREBASE_PROJECT_ID</li>
                                    <li>VITE_FIREBASE_STORAGE_BUCKET</li>
                                    <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
                                    <li>VITE_FIREBASE_APP_ID</li>
                                    <li>VITE_GEMINI_API_KEY &mdash; <ExternalLink href="https://aistudio.google.com/app/apikey">получить</ExternalLink></li>
                                    <li>VITE_GOOGLE_CLIENT_ID &mdash; <ExternalLink href="https://console.cloud.google.com/apis/credentials">получить</ExternalLink></li>
                                </ul>
                            </div>
                            <div className="mt-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                <h4 className="font-semibold text-md text-slate-700 dark:text-slate-300">Ключи для Бэкенда (Avito API)</h4>
                                 <p className="text-xs text-slate-500 mb-2">Эти ключи нужны для поиска вакансий. Получить их можно в <ExternalLink href="https://www.avito.ru/profile/settings/api">настройках профиля Avito</ExternalLink>.</p>
                                <ul className="list-disc list-inside space-y-1 text-sm font-mono mt-2 text-slate-700 dark:text-slate-300">
                                    <li>AVITO_CLIENT_ID</li>
                                    <li>AVITO_CLIENT_SECRET (важно: выберите тип "Secret" в Vercel)</li>
                                </ul>
                            </div>
                        </Step>

                        <Step number={3} title="Переразверните приложение">
                            После сохранения всех переменных Vercel должен автоматически запустить новое развертывание (deployment). Если нет, запустите его вручную, чтобы изменения вступили в силу.
                        </Step>
                    </div>
                )}

                 <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">

                    <button
                        onClick={handleSave}
                        className="w-full px-8 py-3 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800"
                    >
                        Сохранить конфигурацию и перезагрузить
                    </button>
                     <p className="text-xs text-slate-500 mt-4">
                        Ваши ключи хранятся только в `localStorage` вашего браузера и никуда не отправляются.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationError;
