import React from 'react';
import type { Job } from '../types';
import Modal from './Modal';
import { SparklesIcon } from './icons/SparklesIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { MailIcon } from './icons/MailIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

const LocationMarkerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>);
const CurrencyDollarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182.553-.44 1.282-.659 2.003-.659c.725 0 1.45.22 2.003.659.879.659 2.298.659 3.182 0l.879-.659m-9.456 12.456-1.09-1.09a2.25 2.25 0 0 1 0-3.182l.995-.995a2.25 2.25 0 0 1 3.182 0l.995.995a2.25 2.25 0 0 1 0 3.182l-1.09 1.09a2.25 2.25 0 0 1-3.182 0Z" /></svg>);

interface JobDetailModalProps {
    job: Job;
    onClose: () => void;
    onAdaptResume: (job: Job) => void;
    onGenerateEmail: (job: Job) => void;
    onGenerateQuestions: (job: Job) => void;
    onDelete?: (jobId: string) => void; // Optional for found vs tracked jobs
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, onAdaptResume, onGenerateEmail, onGenerateQuestions, onDelete }) => {

    const renderList = (title: string, items: string[]) => {
        if (!items || items.length === 0) return null;
        return (
            <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-2">{title}</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    {items.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
        );
    };

    const footer = (
        <div className="flex justify-between w-full">
            <div>
                {onDelete && (
                    <button onClick={() => onDelete(job.id)} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700">
                        Удалить
                    </button>
                )}
            </div>
            <div className="flex gap-2">
                 <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                    Закрыть
                </button>
                 <a href={job.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700">
                    Перейти
                </a>
            </div>
        </div>
    );

    return (
        <Modal title="Детали вакансии" onClose={onClose} footer={footer}>
            <div className="space-y-4">
                <div>
                    <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400">{job.title}</h3>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{job.company}</p>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <LocationMarkerIcon className="w-4 h-4 text-slate-500" />
                        <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CurrencyDollarIcon className="w-4 h-4 text-slate-500" />
                        <span>{job.salary || 'Не указана'}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                    <button onClick={() => onAdaptResume(job)} className="btn-action">
                        <PencilSquareIcon className="w-4 h-4" /> Адаптировать резюме
                    </button>
                     <button onClick={() => onGenerateEmail(job)} className="btn-action">
                        <MailIcon className="w-4 h-4" /> Сопроводительное
                    </button>
                     <button onClick={() => onGenerateQuestions(job)} className="btn-action">
                        <ChatBubbleIcon className="w-4 h-4" /> Вопросы к собеседованию
                    </button>
                </div>
                
                 <div className="mt-4 p-3 bg-primary-50 dark:bg-slate-700/50 rounded-lg">
                    <h4 className="font-semibold text-sm flex items-center gap-1 text-primary-800 dark:text-primary-200">
                        <SparklesIcon className="w-4 h-4" />
                        Анализ от ИИ
                    </h4>
                    <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">{job.matchAnalysis}</p>
                </div>

                <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-2">Описание</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{job.description}</p>
                </div>
                
                {renderList('Обязанности', job.responsibilities)}
                {renderList('Требования', job.requirements)}

            </div>
             <style>{`
                .btn-action {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    background-color: #e2e8f0;
                    color: #1e293b;
                    border-radius: 0.375rem;
                    transition: background-color 0.2s;
                }
                .btn-action:hover {
                    background-color: #cbd5e1;
                }
                .dark .btn-action {
                    background-color: #475569;
                    color: #e2e8f0;
                }
                 .dark .btn-action:hover {
                    background-color: #64748b;
                }
            `}</style>
        </Modal>
    );
};

export default JobDetailModal;
