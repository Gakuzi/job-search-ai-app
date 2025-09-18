import React from 'react';
import { WarningIcon } from './icons/WarningIcon';
import { KeyIcon } from './icons/KeyIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';

interface ConfigurationErrorProps {
    missingKeys: ('gemini' | 'firebase')[];
}

const ConfigurationError: React.FC<ConfigurationErrorProps> = ({ missingKeys }) => {
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 text-center">
                <WarningIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Ошибка конфигурации</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    Приложение не может запуститься, так как отсутствуют необходимые ключи API в переменных окружения.
                </p>
                <div className="text-left space-y-4">
                    {missingKeys.includes('firebase') && (
                        <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <DatabaseIcon className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold text-red-800 dark:text-red-200">Firebase API Keys</h3>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    Ключи для подключения к базе данных Firebase не найдены. Пожалуйста, добавьте переменные <code>VITE_FIREBASE_*</code> в ваш <code>.env.local</code> файл или в настройки вашего хостинг-провайдера (Vercel, Netlify).
                                </p>
                            </div>
                        </div>
                    )}
                    {missingKeys.includes('gemini') && (
                        <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <KeyIcon className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold text-red-800 dark:text-red-200">Gemini API Key</h3>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    Ключ для Gemini API не найден. Пожалуйста, убедитесь, что переменная окружения <code>API_KEY</code> установлена.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
                    Это сообщение видно только в режиме разработки. На продакшене приложение не запустится без этих ключей.
                </p>
            </div>
        </div>
    );
};

export default ConfigurationError;
