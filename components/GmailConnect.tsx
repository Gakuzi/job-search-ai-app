import React from 'react';
import { GoogleIcon } from './icons/GoogleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface GmailConnectProps {
    onConnect: () => void;
    isLoading: boolean;
    error: string | null;
}

const GmailConnect: React.FC<GmailConnectProps> = ({ onConnect, isLoading, error }) => {
    return (
        <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
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
                <span>Запрашивается доступ только для чтения. Ваши данные в безопасности.</span>
            </div>
        </div>
    );
};

export default GmailConnect;
