// Simplified and improved configuration error screen.
import React, { useState } from 'react';
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
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_GEMINI_API_KEY="..."
VITE_GOOGLE_CLIENT_ID="..."
`.trim();

const ConfigurationError: React.FC<ConfigurationErrorProps> = ({ isFirebaseOk, isGoogleOk }) => {
    const [activeTab, setActiveTab] = useState(isDevEnvironment ? 'local' : 'vercel');

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4">
            <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
                <div className="text-center mb-6">
                     <div className="inline-block p-3 bg-red-100 dark:bg-red-900/40 rounded-full mb-4">
                        <WarningIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Требуется настройка</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                        Приложение не может запуститься без ключей API. Пожалуйста, следуйте инструкциям ниже.
                    </p>
                </div>
                
                <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                    <div className="flex -mb-px">
                         <button
                            onClick={() => setActiveTab('local')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                                activeTab === 'local'
                                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <CodeBracketIcon className="w-5 h-5" />
                            Локальная разработка
                        </button>
                         <button
                            onClick={() => setActiveTab('vercel')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                                activeTab === 'vercel'
                                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <GlobeAltIcon className="w-5 h-5" />
                            Развертывание на Vercel
                        </button>
                    </div>
                </div>

                {activeTab === 'local' && (
                    <div className="space-y-4">
                        <p className="text-lg font-semibold">Настройка для локального запуска:</p>
                        <ol className="list-decimal list-inside space-y-3 text-slate-700 dark:text-slate-300">
                           <li>Создайте файл `.env.local` в корне проекта.</li>
                           <li>Скопируйте и вставьте в него следующий код:
                               <pre className="mt-2 p-4 bg-slate-900 text-slate-200 rounded-lg text-xs overflow-x-auto">
                                   <code>{envFileContent}</code>
                               </pre>
                           </li>
                           <li>Замените значения `...` вашими реальными ключами.</li>
                           <li>Перезапустите сервер разработки (`npm run dev`).</li>
                        </ol>
                    </div>
                )}
                
                {activeTab === 'vercel' && (
                    <div className="space-y-4">
                        <p className="text-lg font-semibold">Настройка для Vercel:</p>
                        <ol className="list-decimal list-inside space-y-3 text-slate-700 dark:text-slate-300">
                            <li>Перейдите в настройки вашего проекта на Vercel: `Settings` &rarr; `Environment Variables`.</li>
                            <li>Добавьте переменные, указанные ниже. Для ключей `VITE_...` они будут доступны на фронтенде, для `AVITO_...` - на бэкенде.</li>
                            <li className="font-mono text-xs">
                                VITE_FIREBASE_API_KEY<br/>
                                VITE_FIREBASE_AUTH_DOMAIN<br/>
                                VITE_FIREBASE_PROJECT_ID<br/>
                                VITE_FIREBASE_STORAGE_BUCKET<br/>
                                VITE_FIREBASE_MESSAGING_SENDER_ID<br/>
                                VITE_FIREBASE_APP_ID<br/>
                                VITE_GEMINI_API_KEY<br/>
                                VITE_GOOGLE_CLIENT_ID<br/>
                                AVITO_CLIENT_ID<br/>
                                AVITO_CLIENT_SECRET (выберите тип "Secret")
                            </li>
                            <li>Запустите переразвертывание (Redeploy) вашего проекта, чтобы применить переменные.</li>
                        </ol>
                    </div>
                )}

                 <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700"
                    >
                        Я все настроил, обновить страницу
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationError;
