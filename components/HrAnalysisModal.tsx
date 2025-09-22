import React, { useState } from 'react';
// FIX: Corrected import path for types
import type { Job } from '../types';
import Modal from './Modal';
import { SparklesIcon } from '@components/icons/SparklesIcon.tsx';

interface HrAnalysisModalProps {
    job: Job;
    onClose: () => void;
    onAnalyze: (emailText: string) => void;
}

const HrAnalysisModal: React.FC<HrAnalysisModalProps> = ({ job, onClose, onAnalyze }) => {
    const [emailText, setEmailText] = useState('');

    const handleSubmit = () => {
        if (emailText.trim()) {
            onAnalyze(emailText);
        }
    };

    const modalFooter = (
        <>
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                Отмена
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={!emailText.trim()}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-slate-400 flex items-center gap-2"
            >
                <SparklesIcon className="w-4 h-4"/>
                Анализировать
            </button>
        </>
    );

    return (
        <Modal
            title={`Анализ ответа для "${job.title}"`}
            onClose={onClose}
            footer={modalFooter}
        >
            <div className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Вставьте сюда полный текст письма от HR-менеджера. ИИ проанализирует его и автоматически обновит статус этой вакансии на вашей Kanban-доске.
                </p>
                <textarea
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    rows={10}
                    placeholder="Например: 'Здравствуйте! Спасибо за отклик. Хотим пригласить вас на собеседование...'"
                    className="w-full p-2 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>
        </Modal>
    );
};

export default HrAnalysisModal;