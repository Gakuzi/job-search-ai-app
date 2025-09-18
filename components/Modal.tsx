import React, { useEffect, useCallback, useRef } from 'react';
import { XCircleIcon } from './icons/XCircleIcon';

interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    isLoading?: boolean;
    footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children, isLoading, footer }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
    
    const handleCopy = () => {
        const content = contentRef.current?.innerText;
        if(content) {
            navigator.clipboard.writeText(content).then(() => {
                alert('Содержимое скопировано в буфер обмена!');
            }, (err) => {
                console.error('Не удалось скопировать текст: ', err);
                alert('Ошибка при копировании.');
            });
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transition-transform transform scale-95 animate-scale-in" 
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="modal-title"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Закрыть модальное окно">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="p-6 overflow-y-auto" ref={contentRef}>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
                        </div>
                    ) : (
                        children
                    )}
                </main>
                 <footer className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    {footer ? footer : (
                        <>
                            <button onClick={handleCopy} disabled={isLoading} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-slate-400">
                                Скопировать
                            </button>
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                                Закрыть
                            </button>
                        </>
                    )}
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
            `}</style>
        </div>
    );
};

export default Modal;