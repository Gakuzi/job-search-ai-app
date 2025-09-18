import React from 'react';
import type { Job } from '../types';
import JobCard from './JobCard';

interface JobListProps {
    jobs: Job[];
    onSaveJobs: (jobs: Job[]) => void;
    onDismissJob: (jobId: string) => void;
}

const JobList: React.FC<JobListProps> = ({ jobs, onSaveJobs, onDismissJob }) => {
    
    if (jobs.length === 0) {
        return (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold">Вакансии не найдены</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Попробуйте изменить параметры поиска или нажмите "Найти вакансии с ИИ", чтобы начать новый поиск.</p>
            </div>
        );
    }
    
    const handleSave = (job: Job) => {
        onSaveJobs([job]);
    }

    return (
        <div>
             <div className="mb-4 text-right">
                <button
                    onClick={() => onSaveJobs(jobs)}
                    className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                    Отслеживать все ({jobs.length})
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map(job => (
                    <JobCard 
                        key={job.id} 
                        job={job}
                        onSave={handleSave}
                        onDismiss={onDismissJob}
                    />
                ))}
            </div>
        </div>
    );
};

export default JobList;
