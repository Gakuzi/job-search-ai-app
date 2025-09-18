import React from 'react';
import type { Job, Profile, KanbanStatus } from '../types';
import KanbanBoard from './KanbanBoard';

interface ApplicationTrackerProps {
    jobs: Job[];
    profiles: Profile[];
    onUpdateJobStatus: (jobId: string, newStatus: KanbanStatus) => void;
    onViewDetails: (job: Job) => void;
    onAdaptResume: (job: Job) => void;
    onGenerateEmail: (job: Job) => void;
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ jobs, profiles, onUpdateJobStatus, onViewDetails, onAdaptResume, onGenerateEmail }) => {
    
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
            <header>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Отклики</h1>
                <p className="text-slate-500 dark:text-slate-400">Перетаскивайте карточки для смены статуса.</p>
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
