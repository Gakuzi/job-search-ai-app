import React from 'react';
import type { Job } from '../types';
import { StarIcon } from './icons/StarIcon';

interface ApplicationCardProps {
    job: Job;
    onClick: () => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ job, onClick, onDragStart }) => {
    return (
        <div
            className="bg-white dark:bg-slate-900 rounded-md shadow-sm hover:shadow-lg transition-shadow duration-200 p-3 cursor-pointer"
            onClick={onClick}
            draggable="true"
            onDragStart={onDragStart}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
        >
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 leading-tight">{job.title}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{job.company}</p>
            <div className="flex justify-between items-center mt-3">
                <p className="text-xs font-bold text-green-600 dark:text-green-400">{job.salary}</p>
                <div className="flex items-center gap-1 text-xs text-yellow-500">
                    <StarIcon className="w-3 h-3"/>
                    <span>{job.companyRating.toFixed(1)}</span>
                </div>
            </div>
        </div>
    );
};

export default ApplicationCard;
