import React from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { WarningIcon } from './icons/WarningIcon';
import { GoogleIcon } from './icons/GoogleIcon';

interface ConfigurationErrorProps {
    isFirebaseOk: boolean;
    isGoogleOk: boolean;
}

const ConfigurationError: React.FC<ConfigurationErrorProps> = ({ isFirebaseOk, isGoogleOk }) => {
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4">
            <div className="w-full max-w-6xl bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Последние шаги: Настройка API Ключей</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                        Вы почти у цели! Чтобы приложение заработало, нужно добавить ключи от Firebase и Google Cloud в ваш проект на Vercel.
                    </p>
                </div>
                
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* --- Step 1: Firebase --- */}
                    <div className={`space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 ${isFirebaseOk ? 'border-green-400 dark:border-green-500' : 'border-red-400 dark:border-red-500'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`flex-shrink-0 w-10 h-10 ${isFirebaseOk ? 'bg-green-100 dark:bg-green-500/20 text-green-600' : 'bg-red-100 dark:bg-red-500/20 text-red-600'} rounded-lg flex items-center justify-center`}>
                                <KeyIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Шаг 1: Firebase & Gemini</h2>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                           Добавьте ключи из Firebase и Gemini в переменные окружения на Vercel.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300 pt-2">
                             <li>Скопируйте ключи из <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">консоли Firebase</a> и <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">Google AI Studio</a>.</li>
                            <li>В настройках проекта на Vercel перейдите в **"Environment Variables"**.</li>
                             <li>Создайте переменные (`VITE_FIREBASE_API_KEY`, `VITE_GEMINI_API_KEY` и др.) и вставьте ключи.</li>
                        </ol>
                        {!isFirebaseOk && (
                            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-800 dark:text-red-300">
                                <div className="flex items-center gap-2 font-semibold text-sm">
                                    <WarningIcon className="w-5 h-5" />
                                    <span>Проблема найдена здесь!</span>
                                </div>
                                <p className="text-xs mt-2">Приложение не нашло ваши ключи Firebase или Gemini. Убедитесь, что переменные правильно названы и сохранены в Vercel.</p>
                            </div>
                        )}
                    </div>

                    {/* --- Step 2: Google --- */}
                     <div className={`space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 ${isGoogleOk ? 'border-green-400 dark:border-green-500' : 'border-red-400 dark:border-red-500'}`}>
                        <div className="flex items-center gap-3">
                             <div className={`flex-shrink-0 w-10 h-10 ${isGoogleOk ? 'bg-green-100 dark:bg-green-500/20 text-green-600' : 'bg-red-100 dark:bg-red-500/20 text-red-600'} rounded-lg flex items-center justify-center`}>
                                <GoogleIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Шаг 2: Google Client ID</h2>
                        </div>
                         <p className="text-sm text-slate-600 dark:text-slate-400">
                            Чтобы сканировать почту и отправлять письма, нужен Client ID.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300 pt-2">
                            <li>В <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">Google Cloud Console</a>, в разделе **APIs & Services &rarr; Credentials**.</li>
                            <li>Нажмите **"Create Credentials"** &rarr; **"OAuth client ID"**.</li>
                            <li>Выберите **"Web application"** и добавьте URL вашего Vercel-приложения в "Authorized JavaScript origins".</li>
                             <li>Скопируйте "Client ID" и добавьте его как `VITE_GOOGLE_CLIENT_ID` в Vercel.</li>
                        </ol>
                         {!isGoogleOk && (
                            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-800 dark:text-red-300">
                                <div className="flex items-center gap-2 font-semibold text-sm">
                                    <WarningIcon className="w-5 h-5" />
                                    <span>Проблема найдена здесь!</span>
                                </div>
                                <p className="text-xs mt-2">Приложение не нашло ваш Google Client ID. Без него интеграция с Gmail не будет работать.</p>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="mt-8 text-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800"
                    >
                        Я выполнил все шаги, обновить страницу
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationError;