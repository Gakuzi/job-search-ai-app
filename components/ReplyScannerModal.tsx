import React from 'react';
import Modal from './Modal';
import { SparklesIcon } from './icons/SparklesIcon';
import { InboxArrowDownIcon } from './icons/InboxArrowDownIcon';

interface ReplyScannerModalProps {
    onClose: () => void;
    scanStatus: 'scanning' | 'analyzing' | 'complete';
    foundEmailsCount: number;
    updatedJobsCount: number;
}

const ReplyScannerModal: React.FC<ReplyScannerModalProps> = ({ onClose, scanStatus, foundEmailsCount, updatedJobsCount }) => {

    const getContent = () => {
        switch (scanStatus) {
            case 'scanning':
                return {
                    icon: <InboxArrowDownIcon className="w-12 h-12 text-primary-500 animate-bounce" />,
                    title: 'Поиск писем...',
                    description: 'Сканируем ваш почтовый ящик в поиске ответов от рекрутеров. Это может занять немного времени.',
                };
            case 'analyzing':
                return {
                    icon: <SparklesIcon className="w-12 h-12 text-primary-500 animate-pulse" />,
                    title: 'Анализ ответов...',
                    description: `Найдено ${foundEmailsCount} потенциальных писем. ИИ анализирует их содержание для обновления статусов.`,
                };
            case 'complete':
                 return {
                    icon: <SparklesIcon className="w-12 h-12 text-green-500" />,
                    title: 'Анализ завершен!',
                    description: `Проверено ${foundEmailsCount} писем. Обновлено ${updatedJobsCount} вакансий на вашей доске.`,
                };
        }
    }

    const { icon, title, description } = getContent();

    const modalFooter = (
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700">
            Отлично!
        </button>
    );

    return (
        <Modal
            title="Сканер ответов"
            onClose={onClose}
            footer={scanStatus === 'complete' ? modalFooter : undefined}
        >
            <div className="text-center p-4">
                <div className="flex justify-center items-center mb-4">
                    {icon}
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">{description}</p>
                 {(scanStatus === 'scanning' || scanStatus === 'analyzing') && (
                    <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700 mt-6">
                        <div className="bg-primary-600 h-2.5 rounded-full w-full animate-pulse"></div>
                    </div>
                 )}
            </div>
        </Modal>
    );
};

export default ReplyScannerModal;
