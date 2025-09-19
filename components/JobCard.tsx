import React from 'react';
import type { Job } from '../types';
import {
    SparklesIcon,
    PencilSquareIcon,
    EnvelopeIcon,
    MapPinIcon,
    CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface JobCardProps {
    job: Job;
    onSave: (job: Job) => void;
    onDismiss: (jobId: string) => void;
    onViewDetails: (job: Job) => void;
    onAdaptResume: (job: Job) => void;
    onGenerateEmail: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onSave, onDismiss, onViewDetails, onAdaptResume, onGenerateEmail }) => {
    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    return (
        <div
            onClick={() => onViewDetails(job)}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col group relative cursor-pointer"
        >
             <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => handleActionClick(e, () => onAdaptResume(job))}
                    className="p-1.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-full text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-primary-500"
                    title="Адаптировать резюме"
                >
                    <PencilSquareIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => handleActionClick(e, () => onGenerateEmail(job))}
                    className="p-1.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-full text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-primary-500"
                    title="Создать сопроводительное письмо"
                >
                    <EnvelopeIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg text-primary-600 dark:text-primary-400">{job.title}</h3>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{job.company}</p>
                    </div>
                </div>

                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <MapPinIcon className="w-4 h-4 text-slate-500" />
                        <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CurrencyDollarIcon className="w-4 h-4 text-slate-500" />
                        <span>{job.salary || 'Не указана'}</span>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-primary-50 dark:bg-slate-700/50 rounded-lg">
                    <h4 className="font-semibold text-sm flex items-center gap-1 text-primary-800 dark:text-primary-200">
                        <SparklesIcon className="w-4 h-4" />
                        Анализ от ИИ
                    </h4>
                    <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">{job.matchAnalysis}</p>
                </div>
                
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 line-clamp-3">{job.description}</p>
                <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-primary-500 hover:underline mt-2 inline-block"
                >
                    Подробнее на hh.ru
                </a>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button
                    onClick={(e) => handleActionClick(e, () => onDismiss(job.id))}
                    className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500"
                >
                    Скрыть
                </button>
                <button
                    onClick={(e) => handleActionClick(e, () => onSave(job))}
                    className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                    Отслеживать
                </button>
            </div>
        </div>
    );
};

export default JobCard;
