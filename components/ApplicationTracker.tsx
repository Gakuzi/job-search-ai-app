import React from 'react';
import type { Job, KanbanStatus } from '../types';
import KanbanBoard from './KanbanBoard';

interface ApplicationTrackerProps {
    jobs: Job[];
    onUpdateJobStatus: (jobId: string, newStatus: KanbanStatus) => void;
    onViewDetails: (job: Job) => void;
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ jobs, onUpdateJobStatus, onViewDetails }) => {
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
            <KanbanBoard 
                jobs={jobs}
                onUpdateJobStatus={onUpdateJobStatus}
                onViewDetails={onViewDetails}
            />
        </div>
    );
};

export default ApplicationTracker;
