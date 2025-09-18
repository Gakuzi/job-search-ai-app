import React from 'react';
import type { Job, KanbanStatus, Profile } from '../types';
import KanbanBoard from './KanbanBoard';
import { GoogleIcon } from './icons/GoogleIcon';

interface ApplicationTrackerProps {
    jobs: Job[];
    profiles: Profile[];
    onUpdateJobStatus: (jobId: string, newStatus: KanbanStatus) => void;
    onViewDetails: (job: Job) => void;
    onAdaptResume: (job: Job) => void;
    onGenerateEmail: (job: Job) => void;
    isGoogleConnected: boolean;
    onScanReplies: () => void;
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ jobs, onUpdateJobStatus, onViewDetails, onAdaptResume, onGenerateEmail, isGoogleConnected, onScanReplies }) => {
    if (jobs.length === 0) {
        return (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold">У вас пока нет откликов</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Начните поиск, чтобы найти и сохранить интересные вакансии. Они появятся здесь.
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4 flex justify-end">
                <button
                    onClick={onScanReplies}
                    disabled={!isGoogleConnected}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!isGoogleConnected ? "Подключите Gmail в Настройках -> Интеграции" : "Проверить почту на наличие ответов"}
                >
                    <GoogleIcon className="w-5 h-5"/>
                    Сканировать Gmail
                </button>
            </div>
            <KanbanBoard 
                jobs={jobs}
                onUpdateJobStatus={onUpdateJobStatus}
                onViewDetails={onViewDetails}
                onAdaptResume={onAdaptResume}
                onGenerateEmail={onGenerateEmail}
            />
        </div>
    );
};

export default ApplicationTracker;