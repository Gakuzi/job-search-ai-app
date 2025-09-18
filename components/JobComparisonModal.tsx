import React from 'react';
import Modal from './Modal';
// FIX: Corrected import path for types
import type { Job } from '../types';

const JobComparisonModal: React.FC<{ jobs: Job[]; onClose: () => void }> = ({ jobs, onClose }) => {
    
    // Helper to render different types of job data
    const renderField = (job: Job, field: keyof Job) => {
        switch(field) {
            case 'matchAnalysis':
                return (
                    <div className="p-2 bg-primary-50 dark:bg-slate-800/50 rounded-md text-primary-700 dark:text-primary-300">
                        {job.matchAnalysis || 'Нет анализа'}
                    </div>
                );
            case 'requirements':
                return (
                     <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                        {job.requirements.slice(0, 5).map((req, index) => <li key={index}>{req}</li>)}
                        {job.requirements.length > 5 && <li className="text-slate-500">...и еще {job.requirements.length - 5}</li>}
                    </ul>
                );
            default:
                const value = job[field];
                return <>{value?.toString() || 'Не указано'}</>;
        }
    };

    return (
        <Modal title="Сравнение вакансий" onClose={onClose}>
            <div className="overflow-x-auto p-1">
                <table className="w-full border-collapse min-w-[700px]">
                    <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                            <th className="p-3 text-left text-sm font-semibold uppercase text-slate-500 w-[150px]">Характеристика</th>
                            {jobs.map(job => (
                                <th key={job.id} className="p-3 text-left text-sm font-semibold">
                                    <p className="text-base text-primary-600 dark:text-primary-400">{job.title}</p>
                                    <p className="font-normal text-slate-600 dark:text-slate-400">{job.company}</p>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 align-top">Зарплата</td>
                            {jobs.map(job => <td key={job.id} className="p-3 align-top">{renderField(job, 'salary')}</td>)}
                        </tr>
                         <tr className="border-b border-slate-200 dark:border-slate-700">
                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 align-top">Локация</td>
                            {jobs.map(job => <td key={job.id} className="p-3 align-top">{renderField(job, 'location')}</td>)}
                        </tr>
                         <tr className="border-b border-slate-200 dark:border-slate-700">
                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 align-top">Анализ ИИ</td>
                            {jobs.map(job => <td key={job.id} className="p-3 align-top">{renderField(job, 'matchAnalysis')}</td>)}
                        </tr>
                        <tr>
                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 align-top">Требования</td>
                            {jobs.map(job => <td key={job.id} className="p-3 align-top">{renderField(job, 'requirements')}</td>)}
                        </tr>
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};

export default JobComparisonModal;