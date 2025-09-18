import React from 'react';
import { GoogleIcon } from './icons/GoogleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface GmailConnectionManagerProps {
    isConnected: boolean;
    userEmail: string | null | undefined;
    onConnect: () => void;
    onDisconnect: () => void;
    isLoading: boolean;
    error: string | null;
}

const GmailConnect: React.FC<GmailConnectionManagerProps> = ({ isConnected, userEmail, onConnect, onDisconnect, isLoading, error }) => {
    
    if (isConnected) {
        return (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center border border-green-200 dark:border-green-700">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-1">Gmail подключен</h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    Вы вошли как <span className="font-semibold">{userEmail}</span>.
                </p>
                <button
                    onClick={onDisconnect}
                    className="w-full max-w-xs mx-auto px-4 py-2 text-sm font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900"
                >
                    Отключить
                </button>
            </div>
        )
    }

    return (
        <div className="p-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-center border border-slate-200 dark:border-slate-600">
            <h3 className="text-lg font-semibold mb-2">Авто-обновление статусов</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Подключите ваш Gmail, и ИИ сможет автоматически сканировать ответы от HR, обновляя статусы вакансий на вашей доске.
            </p>
            <button
                onClick={onConnect}
                disabled={isLoading}
                className="w-full max-w-xs mx-auto flex justify-center items-center gap-3 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-400"
            >
                <GoogleIcon className="w-5 h-5" />
                {isLoading ? 'Подключение...' : 'Подключить Gmail'}
            </button>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheckIcon className="w-4 h-4 text-green-600" />
                <span>Запрашивается доступ только для чтения.</span>
            </div>
        </div>
    );
};

export default GmailConnect;
