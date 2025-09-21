import React, { useState, useMemo } from 'react';
// FIX: Corrected import path for types
import type { Job } from '../types';
import { SparklesIcon } from '@/components/icons/SparklesIcon';
import { StarIcon } from '@/components/icons/StarIcon';

interface ScanResultsProps {
    jobs: Job[];
    onSaveJobs: (jobs: Job[]) => void;
    onDismissJob: (jobId: string) => void;
    onViewDetails: (job: Job) => void;
    onCompareJobs: (jobs: Job[]) => void;
}

const ScanResults: React.FC<ScanResultsProps> = ({ jobs, onSaveJobs, onDismissJob, onViewDetails, onCompareJobs }) => {
    const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: keyof Job | 'match'; direction: 'asc' | 'desc' } | null>(null);

    const handleSelectJob = (jobId: string) => {
        setSelectedJobIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) {
                newSet.delete(jobId);
            } else {
                newSet.add(jobId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedJobIds(new Set(sortedJobs.map(j => j.id)));
        } else {
            setSelectedJobIds(new Set());
        }
    };

    const handleSaveSelected = () => {
        const jobsToSave = jobs.filter(j => selectedJobIds.has(j.id));
        onSaveJobs(jobsToSave);
        setSelectedJobIds(new Set());
    };

    const handleCompareSelected = () => {
        const jobsToCompare = jobs.filter(j => selectedJobIds.has(j.id));
        onCompareJobs(jobsToCompare);
    };
    
    const sortedJobs = useMemo(() => {
        let sortableJobs = [...jobs];
        if (sortConfig !== null) {
            sortableJobs.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                if (sortConfig.key === 'match') {
                    aValue = a.matchAnalysis ? 1 : 0;
                    bValue = b.matchAnalysis ? 1 : 0;
                } else {
                    aValue = a[sortConfig.key];
                    bValue = b[sortConfig.key];
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableJobs;
    }, [jobs, sortConfig]);

    const requestSort = (key: keyof Job | 'match') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    if (jobs.length === 0) {
        return (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold">Результаты сканирования</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Здесь появятся вакансии после завершения поиска. Запустите поиск, чтобы начать.</p>
            </div>
        );
    }
    
    const SortableHeader: React.FC<{ sortKey: keyof Job | 'match', children: React.ReactNode }> = ({ sortKey, children }) => {
        const isSorted = sortConfig?.key === sortKey;
        const icon = isSorted ? (sortConfig?.direction === 'asc' ? '▲' : '▼') : '';
        return (
            <th onClick={() => requestSort(sortKey)} className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                {children} {icon}
            </th>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold">Найдено вакансий: {jobs.length}</h3>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <button
                        onClick={handleCompareSelected}
                        disabled={selectedJobIds.size < 2 || selectedJobIds.size > 3}
                        className="px-4 py-2 text-sm font-medium bg-slate-600 text-white rounded-md hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                        title="Выберите от 2 до 3 вакансий для сравнения"
                    >
                        Сравнить ({selectedJobIds.size})
                    </button>
                    <button
                        onClick={handleSaveSelected}
                        disabled={selectedJobIds.size === 0}
                        className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        Отслеживать ({selectedJobIds.size})
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="p-3 w-10">
                                <input type="checkbox" onChange={handleSelectAll} checked={selectedJobIds.size === sortedJobs.length && sortedJobs.length > 0} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/>
                            </th>
                            <SortableHeader sortKey="match">
                                <StarIcon className="w-4 h-4 inline-block" title="Рекомендация ИИ" />
                            </SortableHeader>
                            <SortableHeader sortKey="title">Должность</SortableHeader>
                            <SortableHeader sortKey="company">Компания</SortableHeader>
                            <SortableHeader sortKey="location">Локация</SortableHeader>
                            <SortableHeader sortKey="salary">Зарплата</SortableHeader>
                            <SortableHeader sortKey="sourcePlatform">Источник</SortableHeader>
                            <th className="p-3">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {sortedJobs.map(job => (
                            <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="p-3">
                                    <input type="checkbox" checked={selectedJobIds.has(job.id)} onChange={() => handleSelectJob(job.id)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                </td>
                                <td className="p-3 text-center">
                                    {job.matchAnalysis && (
                                        <SparklesIcon className="w-5 h-5 text-yellow-500 mx-auto" title={job.matchAnalysis} />
                                    )}
                                </td>
                                <td className="p-3 max-w-xs">
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate" title={job.title}>{job.title}</p>
                                </td>
                                <td className="p-3">
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{job.company}</p>
                                </td>
                                <td className="p-3">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{job.location}</p>
                                </td>
                                <td className="p-3">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{job.salary || 'Не указана'}</p>
                                </td>
                                <td className="p-3">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{job.sourcePlatform}</p>
                                </td>
                                <td className="p-3 text-sm font-medium space-x-2 whitespace-nowrap">
                                    <button onClick={() => onViewDetails(job)} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">
                                        Детали
                                    </button>
                                    <button onClick={() => onDismissJob(job.id)} className="text-red-500 hover:text-red-700">
                                        Скрыть
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ScanResults;