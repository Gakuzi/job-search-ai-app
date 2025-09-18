import React from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { WarningIcon } from './icons/WarningIcon';

const FirebaseConfigError: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4">
            <div className="w-full max-w-6xl bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Последние шаги: Настройка Firebase & Vercel</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                        Вы почти у цели! Чтобы приложение заработало, нужно выполнить три простых шага в Firebase и Vercel.
                    </p>
                </div>
                
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* --- Step 1: Config Keys --- */}
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-red-400 dark:border-red-500">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 rounded-lg flex items-center justify-center">
                                <KeyIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Шаг 1: Ключи в Vercel</h2>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                           Добавьте ваши ключи из Firebase и Gemini в переменные окружения на Vercel.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300 pt-2">
                             <li>Скопируйте ключи из вашего проекта в <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">консоли Firebase</a>.</li>
                            <li>В настройках проекта на Vercel перейдите в раздел **"Environment Variables"**.</li>
                             <li>Создайте переменные (например, `VITE_FIREBASE_API_KEY`) и вставьте туда ваши ключи.</li>
                        </ol>
                        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-800 dark:text-red-300">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <WarningIcon className="w-5 h-5" />
                                <span>Проблема найдена здесь!</span>
                            </div>
                            <p className="text-xs mt-2">Приложение не нашло ваши ключи Firebase. Убедитесь, что переменные правильно названы и сохранены в Vercel.</p>
                        </div>
                    </div>

                    {/* --- Step 2: Create Database --- */}
                     <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                             <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300 rounded-lg flex items-center justify-center">
                                <DatabaseIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Шаг 2: База Данных</h2>
                        </div>
                         <p className="text-sm text-slate-600 dark:text-slate-400">
                            Вам нужно создать базу данных, где будут храниться вакансии и профили.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300 pt-2">
                            <li>В <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">консоли Firebase</a> перейдите в <strong className="font-semibold">Build &rarr; Firestore Database</strong>.</li>
                            <li>Нажмите <strong className="font-semibold">"Создать базу данных"</strong>.</li>
                            <li>Выберите <strong className="font-semibold">"Запустить в тестовом режиме"</strong> (позже можно будет изменить).</li>
                            <li>Выберите регион и нажмите "Включить".</li>
                        </ol>
                    </div>
                    
                    {/* --- Step 3: Authentication --- */}
                     <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                             <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-lg flex items-center justify-center">
                                <ShieldCheckIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Шаг 3: Вход в систему</h2>
                        </div>
                         <p className="text-sm text-slate-600 dark:text-slate-400">
                           Включите возможность входа по Email, чтобы вы могли создавать аккаунты.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300 pt-2">
                            <li>В <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">консоли Firebase</a> перейдите в <strong className="font-semibold">Build &rarr; Authentication</strong>.</li>
                            <li>Перейдите на вкладку <strong className="font-semibold">"Sign-in method"</strong>.</li>
                             <li>В списке провайдеров выберите <strong className="font-semibold">"Email/пароль"</strong> и включите его.</li>
                        </ol>
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

export default FirebaseConfigError;