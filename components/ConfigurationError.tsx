import React, { useState } from 'react';
import { KeyIcon } from '@/components/icons/KeyIcon';
import { WarningIcon } from '@/components/icons/WarningIcon';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { CodeBracketIcon } from '@/components/icons/CodeBracketIcon';
import { GlobeAltIcon } from '@/components/icons/GlobeAltIcon';

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
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Требуется настройка</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                        Приложение не может запуститься без ключей API. Пожалуйста, следуйте инструкциям ниже для вашей среды.
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
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Настройка для локального запуска</h2>
                         <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300">
                           <li>Создайте файл с именем `.env.local` в корневой папке вашего проекта (рядом с `index.html`).</li>
                           <li>Скопируйте приведенный ниже текст и вставьте его в файл `.env.local`.</li>
                           <li>Замените значения-заполнители (`...`) вашими реальными ключами API от Firebase, Google AI Studio и Google Cloud.</li>
                           <li>**Перезапустите ваш сервер разработки** (например, остановите и снова выполните `npm run dev`).</li>
                        </ol>
                        <div>
                            <pre className="p-4 bg-slate-900 text-slate-200 rounded-lg text-xs overflow-x-auto">
                                <code>{envFileContent}</code>
                            </pre>
                             <button onClick={() => navigator.clipboard.writeText(envFileContent)} className="mt-2 px-3 py-1 text-xs bg-slate-200 dark:bg-slate-600 rounded hover:bg-slate-300 dark:hover:bg-slate-500">
                                Скопировать
                            </button>
                        </div>
                    </div>
                )}
                
                {activeTab === 'vercel' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className={`p-4 rounded-lg border-2 ${isFirebaseOk && isGoogleOk ? 'border-green-400' : 'border-red-400'}`}>
                             <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Настройка для Vercel</h2>
                             <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                               Добавьте следующие переменные окружения в настройках вашего проекта на Vercel (`Settings` &rarr; `Environment Variables`).
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm font-mono text-slate-700 dark:text-slate-300">
                                 <li>VITE_FIREBASE_API_KEY</li>
                                <li>VITE_FIREBASE_AUTH_DOMAIN</li>
                                <li>VITE_FIREBASE_PROJECT_ID</li>
                                <li>VITE_FIREBASE_STORAGE_BUCKET</li>
                                <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
                                <li>VITE_FIREBASE_APP_ID</li>
                                <li>VITE_GEMINI_API_KEY</li>
                                <li>VITE_GOOGLE_CLIENT_ID</li>
                            </ul>
                        </div>
                        {(!isFirebaseOk || !isGoogleOk) && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-800 dark:text-red-300">
                                <div className="flex items-center gap-2 font-semibold text-sm">
                                    <WarningIcon className="w-5 h-5" />
                                    <span>Проблема с конфигурацией!</span>
                                </div>
                                <p className="text-xs mt-2">Приложение не нашло необходимые ключи API. Убедитесь, что все переменные окружения правильно названы и сохранены в Vercel.</p>
                            </div>
                        )}
                    </div>
                )}


                 <div className="mt-8 text-center">
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
