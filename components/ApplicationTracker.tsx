import React from 'react';
import type { Job, Profile } from '../types';
import KanbanBoard from './KanbanBoard';

interface ApplicationTrackerProps {
    jobs: Job[];
    profiles: Profile[];
    onUpdateJob: (jobId: string, updates: Partial<Job>) => void;
    onJobClick: (job: Job) => void;
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ jobs, profiles, onUpdateJob, onJobClick }) => {
    return (
        <div>
            <div className="mb-6">
                 <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Мои Отклики</h1>
                 <p className="text-slate-500 dark:text-slate-400">Отслеживайте свой прогресс по каждой вакансии.</p>
            </div>
            <KanbanBoard 
                jobs={jobs}
                profiles={profiles}
                onUpdateJob={onUpdateJob}
                onJobClick={onJobClick}
            />
        </div>
    );
};

export default ApplicationTracker;