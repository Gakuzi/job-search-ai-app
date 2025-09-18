import React from 'react';
import { AppStatus } from '../constants';
import { SparklesIcon } from './icons/SparklesIcon';

type View = 'scanResults' | 'applications';

interface MainHeaderProps {
    view: View;
    onSearch: () => void;
    status: AppStatus;
}

const viewTitles: Record<View, string> = {
    applications: 'Мои Отклики',
    scanResults: 'Результаты Поиска',
};

const MainHeader: React.FC<MainHeaderProps> = ({ view, onSearch, status }) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {viewTitles[view]}
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
