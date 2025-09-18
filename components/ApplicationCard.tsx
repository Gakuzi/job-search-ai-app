import React from 'react';
import type { Job, Profile } from '../types';
import { StarIcon } from './icons/StarIcon';

interface ApplicationCardProps {
    job: Job;
    profiles: Profile[];
    onClick: () => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ job, profiles, onClick, onDragStart }) => {
    const profileName = profiles.find(p => p.id === job.profileId)?.name;
    
    return (
        <div
            className="bg-white dark:bg-slate-900 rounded-md shadow-sm hover:shadow-lg transition-shadow duration-200 p-3 cursor-pointer flex flex-col gap-2"
            onClick={onClick}
            draggable="true"
            onDragStart={onDragStart}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
        >
            <div>
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 leading-tight">{job.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{job.company}</p>
            </div>
            
            <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-green-600 dark:text-green-400">{job.salary}</p>
                <div className="flex items-center gap-1 text-xs text-yellow-500">
                    <StarIcon className="w-3 h-3"/>
                    <span>{job.companyRating.toFixed(1)}</span>
                </div>
            </div>

            {profileName && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">{profileName}</span>
                </div>
            )}
        </div>
    );
};

export default ApplicationCard;