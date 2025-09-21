import React from 'react';
// FIX: Corrected import path for constants
import { AppStatus } from '../constants';
import { SparklesIcon } from '@/components/icons/SparklesIcon';

interface MainHeaderProps {
    onSearch: () => void;
    status: AppStatus;
}

const MainHeader: React.FC<MainHeaderProps> = ({ onSearch, status }) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Мои Отклики
            </h1>
            <button
                onClick={onSearch}
                disabled={status === AppStatus.Loading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-900 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
            >
                {status === AppStatus.Loading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        <span>Поиск...</span>
                    </>
                ) : (
                    <>
                        <SparklesIcon className="w-5 h-5" />
                        <span>Найти вакансии</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default MainHeader;