import React from 'react';
import type { Job, Profile, KanbanStatus } from '../types';
import KanbanBoard from './KanbanBoard';
import { InboxArrowDownIcon } from './icons/InboxArrowDownIcon';

interface ApplicationTrackerProps {
    jobs: Job[];
    profiles: Profile[];
    onUpdateJobStatus: (jobId: string, newStatus: KanbanStatus) => void;
    onViewDetails: (job: Job) => void;
    onAdaptResume: (job: Job) => void;
    onGenerateEmail: (job: Job) => void;
    onScanReplies: () => void;
    isGmailConnected: boolean;
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ 
    jobs, 
    profiles, 
    onUpdateJobStatus, 
    onViewDetails, 
    onAdaptResume, 
    onGenerateEmail,
    onScanReplies,
    isGmailConnected
}) => {
    
    if (jobs.length === 0) {
        return (
             <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold">У вас пока нет откликов</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Найдите вакансии на вкладке "Поиск" и сохраните их, чтобы начать отслеживать.
                </p>
            </div>
        )
    }
    
    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Отклики</h1>
                    <p className="text-slate-500 dark:text-slate-400">Перетаскивайте карточки для смены статуса.</p>
                </div>
                <button
                    onClick={onScanReplies}
                    disabled={!isGmailConnected}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                    title={!isGmailConnected ? "Подключите Gmail в Настройках -> Интеграции" : "Проверить почту на наличие ответов"}
                >
                    <InboxArrowDownIcon className="w-5 h-5" />
                    Сканировать Gmail
                </button>
            </header>
            <KanbanBoard 
                jobs={jobs}
                profiles={profiles}
                onUpdateJobStatus={onUpdateJobStatus}
                onViewDetails={onViewDetails}
                onAdaptResume={onAdaptResume}
                onGenerateEmail={onGenerateEmail}
            />
        </div>
    );
};

export default ApplicationTracker;