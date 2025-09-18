import React from 'react';
import type { Job } from '../types';
import JobCard from './JobCard';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

interface JobListProps {
    jobs: Job[];
    onJobClick: (job: Job) => void;
}

const JobList: React.FC<JobListProps> = ({ jobs, onJobClick }) => {
    if (jobs.length === 0) {
        return (
            <div className="text-center py-10 px-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <BriefcaseIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
                <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">Новых вакансий пока нет</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Используйте панель управления, чтобы начать поиск с помощью ИИ.
                </p>
            </div>
        );
    }
    
    return (
        <div>
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Найденные вакансии</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {jobs.map((job) => (
                    <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} />
                ))}
            </div>
        </div>
    );
};

export default JobList;
