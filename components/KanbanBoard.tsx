import React, { useState, useMemo } from 'react';
import type { Job, KanbanStatus, Profile } from '../types';
import { kanbanStatusMap } from '../types';
import ApplicationCard from './ApplicationCard';

interface KanbanBoardProps {
    jobs: Job[];
    profiles: Profile[];
    onUpdateJob: (jobId: string, updates: Partial<Job>) => void;
    onJobClick: (job: Job) => void;
}

const KanbanColumn: React.FC<{
    status: KanbanStatus;
    title: string;
    jobs: Job[];
    profiles: Profile[];
    onJobClick: (job: Job) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, jobId: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, status: KanbanStatus) => void;
    isDraggingOver: boolean;
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
}> = ({ status, title, jobs, profiles, onJobClick, onDragStart, onDrop, isDraggingOver, onDragEnter, onDragLeave }) => {
    return (
        <div
            className={`flex-1 min-w-[280px] bg-slate-200/70 dark:bg-slate-800/70 rounded-lg p-3 transition-colors ${isDraggingOver ? 'bg-primary-100 dark:bg-primary-900/50' : ''}`}
            onDrop={(e) => onDrop(e, status)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
        >
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4 px-1">{title} ({jobs.length})</h3>
            <div className="space-y-3 h-full">
                {jobs.map(job => (
                    <ApplicationCard
                        key={job.id}
                        job={job}
                        profiles={profiles}
                        onClick={() => onJobClick(job)}
                        onDragStart={(e) => onDragStart(e, job.id)}
                    />
                ))}
            </div>
        </div>
    );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ jobs, profiles, onUpdateJob, onJobClick }) => {
    const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<KanbanStatus | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, jobId: string) => {
        setDraggedJobId(jobId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: KanbanStatus) => {
        e.preventDefault();
        if (draggedJobId) {
            const job = jobs.find(j => j.id === draggedJobId);
            if (job && job.kanbanStatus !== newStatus) {
                onUpdateJob(draggedJobId, { kanbanStatus: newStatus });
            }
        }
        setDraggedJobId(null);
        setDragOverStatus(null);
    };

    const handleDragEnter = (status: KanbanStatus) => {
        setDragOverStatus(status);
    }
    
    const handleDragLeave = () => {
        setDragOverStatus(null);
    }

    const groupedJobs = useMemo(() => {
        // Now grouping all jobs, not just for the active profile
        return (Object.keys(kanbanStatusMap) as KanbanStatus[]).reduce((acc, status) => {
            acc[status] = jobs.filter(job => job.kanbanStatus === status).sort((a,b) => a.title.localeCompare(b.title));
            return acc;
        }, {} as Record<KanbanStatus, Job[]>);
    }, [jobs]);

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {(Object.keys(kanbanStatusMap) as KanbanStatus[]).map(status => (
                <KanbanColumn
                    key={status}
                    status={status}
                    title={kanbanStatusMap[status]}
                    jobs={groupedJobs[status]}
                    profiles={profiles}
                    onJobClick={onJobClick}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    isDraggingOver={dragOverStatus === status}
                    onDragEnter={() => handleDragEnter(status)}
                    onDragLeave={handleDragLeave}
                />
            ))}
        </div>
    );
};

export default KanbanBoard;