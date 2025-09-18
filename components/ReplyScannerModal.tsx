import React from 'react';
import Modal from './Modal';
import { SparklesIcon } from './icons/SparklesIcon';
import type { GmailThread, Job } from '../types';

interface ReplyScannerModalProps {
    replies: GmailThread[];
    jobs: Job[];
    analysisJobId: string | null; // 'loading', or a job ID
    onClose: () => void;
    onAnalyzeReply: (emailText: string) => void;
}

const ReplyScannerModal: React.FC<ReplyScannerModalProps> = ({ replies, jobs, analysisJobId, onClose, onAnalyzeReply }) => {
    
    const getDecodedBody = (thread: GmailThread): string => {
        try {
            const data = thread.messages[0]?.payload?.parts?.[0]?.body?.data;
            if (data) {
                const decoded = decodeURIComponent(escape(atob(data.replace(/-/g, '+').replace(/_/g, '/'))));
                return decoded;
            }
        } catch (e) {
            console.error("Error decoding email body:", e);
        }
        return thread.snippet; // Fallback to snippet
    };

    const matchedJob = jobs.find(j => j.id === analysisJobId);

    return (
        <Modal title="Результаты сканирования Gmail" onClose={onClose}>
            {replies.length === 0 && analysisJobId === null && (
                <div className="flex justify-center items-center h-32 text-center">
                    <div className="space-y-2">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                        <p className="text-slate-600 dark:text-slate-400">Ищем письма от компаний, на которые вы откликались...</p>
                    </div>
                </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {replies.map(reply => {
                    const fullText = getDecodedBody(reply);
                    return (
                        <div key={reply.id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{reply.snippet}</p>
                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: fullText.replace(/\n/g, '<br>') }} />
                            <div className="mt-3 text-right">
                                <button
                                    onClick={() => onAnalyzeReply(fullText)}
                                    disabled={!!analysisJobId}
                                    className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-slate-400 flex items-center gap-1 ml-auto"
                                >
                                    <SparklesIcon className="w-4 h-4"/>
                                    Анализировать и обновить статус
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            
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

export default ReplyScannerModal;
