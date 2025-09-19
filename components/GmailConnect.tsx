import React from 'react';
// FIX: Corrected import path for types
import type { GoogleUser } from '../types';
import { Google } from 'devicons-react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface GmailConnectProps {
    isConnected: boolean;
    user: GoogleUser | null;
    onConnect: () => void;
    onDisconnect: () => void;
}

const GmailConnect: React.FC<GmailConnectProps> = ({ isConnected, user, onConnect, onDisconnect }) => {
    return (
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Интеграция с Gmail</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Подключите ваш Google аккаунт, чтобы отправлять письма и сканировать почту на наличие ответов от HR прямо из приложения.
            </p>

            <div className="mt-4">
                {isConnected && user ? (
                    <div>
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex items-center gap-3">
                                <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <p className="font-semibold text-green-800 dark:text-green-200">{user.name}</p>
                                    <p className="text-sm text-green-600 dark:text-green-400">{user.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={onDisconnect}
                                className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
                            >
                                Отключить
                            </button>
                        </div>
                        
                        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                            <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <QuestionMarkCircleIcon className="w-4 h-4" />
                                <span>Как проверить разрешения?</span>
                            </h4>
                            <p>
                                Если у вас возникли проблемы с доступом к почте, убедитесь, что вы предоставили приложению необходимые права.
                            </p>
                            <ol className="list-decimal list-inside mt-2 space-y-1">
                                <li>
                                    Перейдите на страницу{" "}
                                    <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline font-semibold">
                                        управления доступом приложений
                                    </a>{" "}
                                    в вашем аккаунте Google.
                                </li>
                                <li>Найдите в списке приложение <strong>"Поиск Работы с ИИ"</strong>.</li>
                                <li>Убедитесь, что у него есть доступ к <strong>"Gmail"</strong>.</li>
                                <li>Если доступа нет, удалите его на странице Google, а затем здесь нажмите "Отключить" и "Подключить Google" снова.</li>
                            </ol>
                        </div>

                    </div>

                ) : (
                    <button
                        onClick={onConnect}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                        <Google className="w-5 h-5" />
                        Подключить Google
                    </button>
                )}
            </div>
        </div>
    );
};

export default GmailConnect;