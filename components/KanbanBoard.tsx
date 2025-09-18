import React, { useState } from 'react';
import type { Job, KanbanStatus } from '../types';
import { kanbanStatusMap } from '../types';
import ApplicationCard from './ApplicationCard';

interface KanbanBoardProps {
    jobs: Job[];
    selectedJobIds: Set<string>;
    setSelectedJobIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    onUpdateJobStatus: (jobId: string, newStatus: KanbanStatus) => void;
    onViewDetails: (job: Job) => void;
    onAdaptResume: (job: Job) => void;
    onGenerateEmail: (job: Job) => void;
    onQuickApplyEmail: (job: Job) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
    jobs, 
    selectedJobIds, 
    setSelectedJobIds, 
    onUpdateJobStatus, 
    onViewDetails, 
    onAdaptResume, 
    onGenerateEmail, 
    onQuickApplyEmail 
}) => {
    const [draggedOverColumn, setDraggedOverColumn] = useState<KanbanStatus | null>(null);
    
    const columns: KanbanStatus[] = ['new', 'tracking', 'interview', 'offer', 'archive'];

    const jobsByStatus = columns.reduce((acc, status) => {
        acc[status] = jobs.filter(job => job.kanbanStatus === status);
        return acc;
    }, {} as Record<KanbanStatus, Job[]>);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: KanbanStatus) => {
        e.preventDefault();
        const jobId = e.dataTransfer.getData('jobId');
        if (jobId) {
            onUpdateJobStatus(jobId, status);
        }
        setDraggedOverColumn(null);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: KanbanStatus) => {
        e.preventDefault();
        setDraggedOverColumn(status);
    };

    const handleDragLeave = () => {
        setDraggedOverColumn(null);
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {columns.map(status => (
                <div 
                    key={status}
                    onDrop={(e) => handleDrop(e, status)}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={handleDragLeave}
                    className={`w-72 flex-shrink-0 bg-slate-200/70 dark:bg-slate-800/70 rounded-lg p-2 transition-colors duration-200 ${draggedOverColumn === status ? 'bg-primary-100 dark:bg-primary-900/50' : ''}`}
                >
                    <div className="flex justify-between items-center p-2 mb-2">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            {kanbanStatusMap[status]}
                        </h3>
                        <span className="px-2 py-0.5 text-xs font-semibold text-slate-500 bg-slate-300 dark:text-slate-300 dark:bg-slate-700 rounded-full">
                            {jobsByStatus[status].length}
                        </span>
                    </div>
                    <div className="space-y-2 h-full min-h-[100px]">
                        {jobsByStatus[status]
                            .sort((a, b) => a.title.localeCompare(b.title)) // Consistent ordering
                            .map(job => (
                                <ApplicationCard 
                                    key={job.id} 
                                    job={job}
                                    isSelected={selectedJobIds.has(job.id)}
                                    onSelect={(jobId) => setSelectedJobIds(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(jobId)) {
                                            newSet.delete(jobId);
                                        } else {
                                            newSet.add(jobId);
                                        }
                                        return newSet;
                                    })}
                                    onViewDetails={onViewDetails}
                                    onAdaptResume={onAdaptResume}
                                    onGenerateEmail={onGenerateEmail}
                                    onQuickApplyEmail={onQuickApplyEmail}
                                />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KanbanBoard;