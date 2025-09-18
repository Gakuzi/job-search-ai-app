import React from 'react';
import type { Job } from '../types';

interface ApplicationCardProps {
    job: Job;
    onViewDetails: (job: Job) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ job, onViewDetails }) => {
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('jobId', job.id);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onClick={() => onViewDetails(job)}
            className="p-3 bg-white dark:bg-slate-700 rounded-md shadow-sm cursor-pointer hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-all border-l-4 border-primary-500"
        >
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{job.title}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">{job.company}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{job.salary || 'З/П не указана'}</p>
        </div>
    );
};

export default ApplicationCard;
