import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import type { Job, Interaction } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import {
    XCircleIcon,
    ClipboardDocumentListIcon,
    EnvelopeOpenIcon,
    PencilSquareIcon,
    ChatBubbleLeftRightIcon,
    EnvelopeIcon,
    ChatBubbleOvalLeftEllipsisIcon,
    PaperAirplaneIcon,
    PlusCircleIcon,
    ArrowPathIcon,
    PencilIcon,
    PhoneIcon,
    EllipsisHorizontalCircleIcon
} from '@heroicons/react/24/outline';

interface JobDetailModalProps {
    job: Job;
    onClose: () => void;
    onUpdateJob: (jobId: string, updates: Partial<Job>) => void;
    onAdaptResume: (job: Job) => void;
    onGenerateEmail: (job: Job) => void;
    onPrepareForInterview: (job: Job) => void;
    onAnalyzeResponse: (job: Job) => void;
    onQuickApplyEmail: (job: Job) => Promise<void>;
    onQuickApplyWhatsapp: (job: Job) => Promise<void>;
    onQuickApplyTelegram: (job: Job) => Promise<void>;
    isGoogleConnected: boolean;
    isGapiReady: boolean;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ 
    job, 
    onClose, 
    onUpdateJob,
    onAdaptResume,
    onGenerateEmail,
    onPrepareForInterview,
    onAnalyzeResponse,
    onQuickApplyEmail,
    onQuickApplyWhatsapp,
    onQuickApplyTelegram,
    isGoogleConnected,
    isGapiReady,
}) => {
    const [notes, setNotes] = useState(job.notes || '');
    const [newInteraction, setNewInteraction] = useState('');
    const debouncedNotes = useDebounce(notes, 500);
    const [quickApplyLoading, setQuickApplyLoading] = useState<'email' | 'whatsapp' | 'telegram' | null>(null);

    useEffect(() => {
        if (debouncedNotes !== (job.notes || '')) {
            onUpdateJob(job.id, { notes: debouncedNotes });
        }
    }, [debouncedNotes, job.id, job.notes, onUpdateJob]);
    
     const handleQuickApply = async (type: 'email' | 'whatsapp' | 'telegram') => {
        setQuickApplyLoading(type);
        try {
            if (type === 'email') await onQuickApplyEmail(job);
            if (type === 'whatsapp') await onQuickApplyWhatsapp(job);
            if (type === 'telegram') await onQuickApplyTelegram(job);
        } finally {
            setQuickApplyLoading(null);
        }
    }

    const handleAddInteraction = () => {
        if(!newInteraction.trim()) return;
        const interaction: Interaction = {
            id: uuidv4(),
            type: 'note',
            content: newInteraction,
            timestamp: new Date().toISOString()
        };
        const updatedHistory = [...(job.history || []), interaction];
        onUpdateJob(job.id, { history: updatedHistory });
        setNewInteraction('');
    };

    const getInteractionIcon = (type: Interaction['type']) => {
        switch (type) {
            case 'email_sent': return <EnvelopeIcon className="w-4 h-4 inline mr-1" />;
            case 'status_change': return <ArrowPathIcon className="w-4 h-4 inline mr-1" />;
            case 'note': return <PencilIcon className="w-4 h-4 inline mr-1" />;
            case 'call': return <PhoneIcon className="w-4 h-4 inline mr-1" />;
            default: return <EllipsisHorizontalCircleIcon className="w-4 h-4 inline mr-1" />;
        }
    };
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300" 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transition-transform transform scale-95 animate-scale-in" 
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="modal-title"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-start justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 id="modal-title" className="text-xl font-bold text-primary-600 dark:text-primary-400">{job.title}</h2>
                        <p className="text-md font-semibold text-slate-700 dark:text-slate-300">{job.company}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{job.location} ({job.sourcePlatform})</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Закрыть модальное окно">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6 p-6 overflow-y-auto">
                    {/* Left Column: Job Details */}
                    <div className="md:col-span-3 prose prose-slate dark:prose-invert max-w-none">
                        <div className="p-4 bg-primary-50 dark:bg-slate-800 rounded-lg">
                            <h4 className="font-semibold text-primary-800 dark:text-primary-200">Анализ от ИИ</h4>
                            <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">{job.matchAnalysis}</p>
                        </div>
                        <h3>Описание</h3>
                        <ReactMarkdown>{job.description}</ReactMarkdown>
                        <h3>Обязанности</h3>
                        <ul>
                            {job.responsibilities.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                        <h3>Требования</h3>
                        <ul>
                            {job.requirements.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                        <p><strong>Рейтинг компании:</strong> ⭐ {job.companyRating}/5 - <em>{job.companyReviewSummary}</em></p>
                        <a href={job.url} target="_blank" rel="noopener noreferrer">Открыть вакансию на {job.sourcePlatform}</a>
                    </div>

                    {/* Right Column: Actions & Notes */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2">Инструменты ИИ</h3>
                            <div className="space-y-2">
                                <button onClick={() => onAdaptResume(job)} className="w-full btn-tool">
                                    <ClipboardDocumentListIcon className="w-4 h-4" /> Адаптировать резюме
                                </button>
                                <button onClick={() => onGenerateEmail(job)} className="w-full btn-tool">
                                    <EnvelopeOpenIcon className="w-4 h-4" /> Сопроводительное
                                </button>
                                <button onClick={() => onPrepareForInterview(job)} className="w-full btn-tool">
                                    <PencilSquareIcon className="w-4 h-4" /> К интервью
                                </button>
                                 <button onClick={() => onAnalyzeResponse(job)} className="w-full btn-tool border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
                                    <ChatBubbleLeftRightIcon className="w-4 h-4" /> Анализировать ответ HR
                                </button>
                            </div>
                        </div>
                        
                         <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <h3 className="text-lg font-semibold mb-3">Быстрый отклик</h3>
                            <div className="space-y-2">
                                <button 
                                    onClick={() => handleQuickApply('email')} 
                                    disabled={!job.contacts?.email || !!quickApplyLoading || !isGoogleConnected || !isGapiReady} 
                                    className="w-full btn-tool-contact disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={!isGoogleConnected ? "Подключите Gmail в настройках" : !isGapiReady ? "API Google еще инициализируется..." : !job.contacts?.email ? "Email не указан в вакансии" : "Отправить через Gmail"}
                                >
                                    {quickApplyLoading === 'email' ? 'Генерация...' : <><EnvelopeIcon className="w-5 h-5" /> Email</>}
                                </button>
                                <button onClick={() => handleQuickApply('whatsapp')} disabled={!job.contacts?.phone || !!quickApplyLoading} className="w-full btn-tool-contact disabled:opacity-50 disabled:cursor-not-allowed">
                                    {quickApplyLoading === 'whatsapp' ? 'Генерация...' : <><ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" /> WhatsApp</>}
                                </button>
                                <button onClick={() => handleQuickApply('telegram')} disabled={!job.contacts?.telegram || !!quickApplyLoading} className="w-full btn-tool-contact disabled:opacity-50 disabled:cursor-not-allowed">
                                    {quickApplyLoading === 'telegram' ? 'Генерация...' : <><PaperAirplaneIcon className="w-5 h-5" /> Telegram</>}
                                </button>
                            </div>
                        </div>
                        
                         <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2">История взаимодействия</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto mb-3 pr-2">
                                {job.history && [...job.history].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(item => (
                                    <div key={item.id} className="text-xs p-2 bg-white dark:bg-slate-700 rounded">
                                        <p className="font-semibold">{getInteractionIcon(item.type)} {new Date(item.timestamp).toLocaleString()}</p>
                                        <p className="text-slate-600 dark:text-slate-300">{item.content}</p>
                                    </div>
                                ))}
                                {!job.history?.length && <p className="text-xs text-slate-500">Здесь будет история ваших действий...</p>}
                            </div>
                             <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newInteraction}
                                    onChange={(e) => setNewInteraction(e.target.value)}
                                    placeholder="Добавить заметку или лог звонка..."
                                    className="flex-grow w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                                <button onClick={handleAddInteraction} className="p-2 text-primary-600 hover:text-primary-800 disabled:text-slate-400" disabled={!newInteraction.trim()}>
                                    <PlusCircleIcon className="w-6 h-6"/>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
                 <footer className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                        Закрыть
                    </button>
                </footer>
            </div>
            <style>{`
                @keyframes scale-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in {
                    animation: scale-in 0.2s ease-out forwards;
                }
                .btn-tool, .btn-tool-contact {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    background-color: #fff;
                    border: 1px solid #cbd5e1;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .dark .btn-tool, .dark .btn-tool-contact {
                    background-color: #475569;
                    border-color: #64748b;
                    color: #e2e8f0;
                }
                .btn-tool:hover, .btn-tool-contact:hover:not(:disabled) {
                    background-color: #f1f5f9;
                    border-color: #94a3b8;
                }
                .dark .btn-tool:hover, .dark .btn-tool-contact:hover:not(:disabled) {
                    background-color: #64748b;
                    border-color: #94a3b8;
                }
            `}</style>
        </div>
    );
};

export default JobDetailModal;