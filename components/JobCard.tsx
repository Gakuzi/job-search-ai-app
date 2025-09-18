import React from 'react';
import type { Job } from '../types';

interface JobCardProps {
    job: Job;
    onClick: () => void; // To open the detail modal
}

const JobCard: React.FC<JobCardProps> = ({ job, onClick }) => {
    return (
        <div 
             className="bg-white dark:bg-slate-800 rounded-md shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden cursor-pointer border-l-4 border-primary-500"
             onClick={onClick}
             role="button"
             tabIndex={0}
             onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
        >
            <div className="p-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate">{job.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{job.company}</p>
                <div className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">{job.salary}</div>
            </div>
        </div>
    );
};

export default JobCard;