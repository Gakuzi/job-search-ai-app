import React from 'react';
import type { Job, Profile } from '../types';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { MailIcon } from './icons/MailIcon';

interface ApplicationCardProps {
    job: Job;
    profiles: Profile[];
    onViewDetails: (job: Job) => void;
    onAdaptResume: (job: Job) => void;
    onGenerateEmail: (job: Job) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ job, profiles, onViewDetails, onAdaptResume, onGenerateEmail }) => {
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('jobId', job.id);
    };

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };
    
    const profileName = profiles.find(p => p.id === job.profileId)?.name;

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onClick={() => onViewDetails(job)}
            className="p-3 bg-white dark:bg-slate-700 rounded-md shadow-sm cursor-pointer hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-all border-l-4 border-primary-500 group relative"
        >
             <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => handleActionClick(e, () => onAdaptResume(job))}
                    className="p-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-full text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-primary-500"
                    title="Адаптировать резюме"
                >
                    <PencilSquareIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => handleActionClick(e, () => onGenerateEmail(job))}
                    className="p-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-full text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-primary-500"
                    title="Создать сопроводительное письмо"
                >
                    <MailIcon className="w-4 h-4" />
                </button>
            </div>
            
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate pr-10">{job.title}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">{job.company}</p>
            <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">{job.salary || 'З/П не указана'}</p>
                {profileName && (
                     <span className="px-1.5 py-0.5 text-xs font-medium text-primary-800 bg-primary-100 dark:text-primary-200 dark:bg-primary-500/20 rounded-full">
                        {profileName}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ApplicationCard;