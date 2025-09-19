import React from 'react';
import Modal from './Modal';
import { SparklesIcon } from '@heroicons/react/24/outline';
// FIX: Corrected import path for types
import type { Email, Job } from '../types';

interface GmailScannerModalProps {
    emails: Email[];
    jobs: Job[];
    analysisJobId: string | null; // 'loading', or a job ID
    isLoading: boolean;
    onClose: () => void;
    onAnalyzeReply: (emailText: string) => void;
}

const GmailScannerModal: React.FC<GmailScannerModalProps> = ({ emails, jobs, analysisJobId, isLoading, onClose, onAnalyzeReply }) => {
    
    const matchedJob = jobs.find(j => j.id === analysisJobId);

    const parseFromHeader = (from: string) => {
        const match = from.match(/(.*)<.*>/);
        return match ? match[1].replace(/"/g, '').trim() : from;
    }

    return (
        <Modal title="Последние письма из Gmail" onClose={onClose}>
            {isLoading && (
                <div className="flex justify-center items-center h-48 text-center">
                    <div className="space-y-2">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                        <p className="text-slate-600 dark:text-slate-400">Загружаем ваши последние письма...</p>
                    </div>
                </div>
            )}

            {!isLoading && emails.length === 0 && (
                 <div className="flex justify-center items-center h-48 text-center">
                    <p className="text-slate-600 dark:text-slate-400">Не удалось найти письма в вашем ящике "Входящие".</p>
                </div>
            )}

            {!isLoading && emails.length > 0 && (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto -mr-3 pr-3">
                    {emails.map(email => (
                        <div key={email.id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-l-4 border-slate-300 dark:border-slate-600">
                            <div className="flex justify-between items-start">
                                <div className='flex-1 min-w-0'>
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate" title={parseFromHeader(email.from)}>
                                        {parseFromHeader(email.from)}
                                    </p>
                                    <p className="font-semibold text-xs text-slate-600 dark:text-slate-300 truncate" title={email.subject}>
                                        {email.subject}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onAnalyzeReply(email.body || email.snippet)}
                                    disabled={!!analysisJobId}
                                    className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-slate-400 flex items-center gap-1 ml-4 flex-shrink-0"
                                >
                                    <SparklesIcon className="w-4 h-4"/>
                                    Анализ
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{email.snippet}</p>
                        </div>
                    ))}
                </div>
            )}
            
            {analysisJobId && (
                 <div className="mt-4 p-3 border-t border-slate-200 dark:border-slate-700 text-center">
                     {analysisJobId === 'loading' ? (
                         <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                             <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-500"></div>
                             <span>ИИ сопоставляет письмо с вакансией...</span>
                         </div>
                     ) : matchedJob ? (
                         <p className="font-semibold text-green-600 dark:text-green-400">
                             Статус для вакансии "{matchedJob.title}" в "{matchedJob.company}" был успешно обновлен!
                         </p>
                     ) : (
                         <p className="font-semibold text-red-600 dark:text-red-400">
                            Не удалось найти подходящую вакансию для этого письма.
                         </p>
                     )}
                 </div>
            )}
        </Modal>
    );
};

export default GmailScannerModal;