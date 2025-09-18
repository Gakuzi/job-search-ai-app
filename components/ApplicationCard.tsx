import React from 'react';
// FIX: Corrected import path for types
import type { Job } from '../types';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { MailIcon } from './icons/MailIcon';

interface ApplicationCardProps {
    job: Job;
    isSelected: boolean;
    onSelect: (jobId: string) => void;
    onViewDetails: (job: Job) => void;
    onAdaptResume: (job: Job) => void;
    onGenerateEmail: (job: Job) => void;
    onQuickApplyEmail: (job: Job) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ job, isSelected, onSelect, onViewDetails, onAdaptResume, onGenerateEmail, onQuickApplyEmail }) => {
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('jobId', job.id);
    };

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Allow clicking details unless the click was on the checkbox input itself
        if ((e.target as HTMLElement).tagName.toLowerCase() !== 'input') {
            onViewDetails(job);
        }
    };
    
    const handleCheckboxClick = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation(); // Prevent card click event
        onSelect(job.id);
    }

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onClick={handleCardClick}
            className={`p-3 bg-white dark:bg-slate-700 rounded-md shadow-sm cursor-pointer hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-all border-l-4 group relative ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-300 dark:border-slate-600'}`}
        >
             <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button
                    onClick={(e) => handleActionClick(e, () => onQuickApplyEmail(job))}
                    className="p-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-full text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-blue-500 disabled:opacity-50"
                    title="Быстрый отклик по Email"
                    disabled={!job.contacts?.email}
                >
                    <MailIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => handleActionClick(e, () => onAdaptResume(job))}
                    className="p-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-full text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-primary-500"
                    title="Адаптировать резюме"
                >
                    <PencilSquareIcon className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex items-start gap-2">
                 <input 
                    type="checkbox" 
                    checked={isSelected}
                    onClick={handleCheckboxClick}
                    onChange={() => {}} // onChange is handled by onClick to avoid double triggers
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                 />
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate pr-10">{job.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{job.company}</p>
                </div>
            </div>

             <div className="flex justify-between items-center mt-2 pl-6">
                <p className="text-xs text-slate-500 dark:text-slate-400">{job.salary || 'З/П не указана'}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate">{job.sourcePlatform}</p>
            </div>
        </div>
    );
};

export default ApplicationCard;