import React, { useState } from 'react';
import { KeyIcon } from './icons/KeyIcon.tsx';
import { WarningIcon } from './icons/WarningIcon.tsx';
import { CodeBracketIcon } from './icons/CodeBracketIcon.tsx';
import { GlobeAltIcon } from './icons/GlobeAltIcon.tsx';

interface ConfigurationErrorProps {
    isFirebaseOk: boolean;
    isGoogleOk: boolean;
}

const isDevEnvironment = (import.meta as any).env.DEV;

const envFileContent = `
# Скопируйте это содержимое в файл .env.local в корне вашего проекта
# Затем замените ... вашими реальными ключами

# Ключи Firebase (получить в консоли Firebase > Настройки проекта)
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."

# Ключ Gemini API (получить в Google AI Studio)
VITE_GEMINI_API_KEY="..."

# Ключ Google Client ID (получить в Google Cloud Console)
VITE_GOOGLE_CLIENT_ID="..."
`.trim();

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

const ConfigurationError: React.FC<ConfigurationErrorProps> = ({ isFirebaseOk, isGoogleOk }) => {
    const [activeTab, setActiveTab] = useState(isDevEnvironment ? 'local' : 'vercel');

    const TabButton: React.FC<{ tabName: string; label: string; icon: React.ReactNode; }> = ({ tabName, label, icon }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === tabName
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4">
            <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
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
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800"
                    >
                        Я все настроил, обновить страницу
                    </button>
                </div>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default ConfigurationError;
