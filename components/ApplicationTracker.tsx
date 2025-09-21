import React, { useState } from 'react';
// FIX: Corrected import path for types
import type { Job, KanbanStatus, Profile } from '../types';
import KanbanBoard from './KanbanBoard';
import { GoogleIcon } from '@/components/icons/GoogleIcon.tsx';
import { ArrowPathIcon } from '@/components/icons/ArrowPathIcon.tsx';
interface ApplicationTrackerProps {
    jobs: Job[];
    profiles: Profile[];
    onUpdateJobStatus: (jobId: string, newStatus: KanbanStatus) => void;
    onViewDetails: (job: Job) => void;
    onAdaptResume: (job: Job) => void;
    onGenerateEmail: (job: Job) => void;
    onQuickApplyEmail: (job: Job) => void;
    isGoogleConnected: boolean;
    onScanReplies: () => void;
    onRefreshStatuses: () => void;
    onCompareJobs: (jobs: Job[]) => void;
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ 
    jobs, 
    onUpdateJobStatus, 
    onViewDetails, 
    onAdaptResume, 
    onGenerateEmail, 
    onQuickApplyEmail,
    isGoogleConnected, 
    onScanReplies,
    onRefreshStatuses,
    onCompareJobs,
}) => {
    const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

    const handleCompareSelected = () => {
        const jobsToCompare = jobs.filter(j => selectedJobIds.has(j.id));
        onCompareJobs(jobsToCompare);
    };

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
            <div className="mb-4 flex flex-col sm:flex-row justify-end gap-2">
                 <button
                    onClick={handleCompareSelected}
                    disabled={selectedJobIds.size < 2 || selectedJobIds.size > 3}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Выберите от 2 до 3 вакансий для сравнения"
                >
                    Сравнить ({selectedJobIds.size})
                </button>
                 <button
                    onClick={onRefreshStatuses}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Проверить, активны ли отслеживаемые вакансии"
                >
                    <ArrowPathIcon className="w-5 h-5"/>
                    Обновить статусы
                </button>
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
                selectedJobIds={selectedJobIds}
                setSelectedJobIds={setSelectedJobIds}
                onUpdateJobStatus={onUpdateJobStatus}
                onViewDetails={onViewDetails}
                onAdaptResume={onAdaptResume}
                onGenerateEmail={onGenerateEmail}
                onQuickApplyEmail={onQuickApplyEmail}
            />
        </div>
    );
};

export default ApplicationTracker;