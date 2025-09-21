import React, { useState } from 'react';
import Modal from './Modal';
import type { PromptTemplate, Job, Profile } from '../types';
import { SparklesIcon } from '@/components/icons/SparklesIcon.tsx';
import { executeCustomPrompt } from '../services/geminiService';
import { InformationCircleIcon } from '@/components/icons/InformationCircleIcon.tsx';

interface PromptEditorModalProps {
    template: PromptTemplate;
    job: Job;
    profile: Profile;
    onClose: () => void;
    onSave: (templateId: string, newTemplate: string) => void;
}

const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ template, job, profile, onClose, onSave }) => {
    const [editedTemplate, setEditedTemplate] = useState(template.template);
    const [preview, setPreview] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = () => {
        onSave(template.id, editedTemplate);
        onClose();
    };

    const handlePreview = async () => {
        setIsLoading(true);
        setPreview('');
        try {
            const result = await executeCustomPrompt(editedTemplate, job, profile);
            setPreview(result);
        } catch (error) {
            console.error("Error generating preview:", error);
            setPreview("Ошибка при генерации предпросмотра.");
        } finally {
            setIsLoading(false);
        }
    };

    const modalFooter = (
        <>
            <button onClick={onClose} className="btn-secondary">
                Отмена
            </button>
            <button onClick={handleSave} className="btn-primary">
                Сохранить и закрыть
            </button>
        </>
    );

    return (
        <Modal title={`Редактор промпта: ${template.name}`} onClose={onClose} footer={modalFooter}>
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                    <div className="flex items-start gap-2">
                        <InformationCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Как это работает?</p>
                            <p>Вы можете использовать переменные <code className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded-sm">{'{{job.title}}'}</code>, <code className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded-sm">{'{{job.company}}'}</code>, <code className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded-sm">{'{{job.description}}'}</code> и <code className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded-sm">{'{{profile.resume}}'}</code>. Они будут автоматически заменены данными из текущей вакансии и вашего профиля.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="template-editor" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Текст промпта
                    </label>
                    <textarea
                        id="template-editor"
                        value={editedTemplate}
                        onChange={(e) => setEditedTemplate(e.target.value)}
                        rows={10}
                        className="w-full p-2 text-sm font-mono bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                
                <div className="flex justify-end">
                    <button onClick={handlePreview} disabled={isLoading} className="btn-primary flex items-center gap-2">
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <SparklesIcon className="w-4 h-4" />
                        )}
                        <span>{isLoading ? 'Генерация...' : 'Предпросмотр'}</span>
                    </button>
                </div>

                {preview && (
                    <div>
                        <h4 className="font-semibold mb-2">Результат предпросмотра:</h4>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg max-h-48 overflow-y-auto whitespace-pre-wrap text-sm">
                            {preview}
                        </div>
                    </div>
                )}
            </div>
             <style>{`
                .btn-primary {
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: white;
                    background-color: #2563eb;
                    border-radius: 0.375rem;
                    transition: background-color 0.2s;
                }
                .btn-primary:hover {
                    background-color: #1d4ed8;
                }
                .btn-primary:disabled {
                    background-color: #9ca3af;
                    cursor: not-allowed;
                }
                .btn-secondary {
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #1f2937;
                    background-color: #e5e7eb;
                    border-radius: 0.375rem;
                    transition: background-color 0.2s;
                }
                 .dark .btn-secondary {
                    color: #e5e7eb;
                    background-color: #4b5563;
                }
                .btn-secondary:hover {
                     background-color: #d1d5db;
                }
                 .dark .btn-secondary:hover {
                    background-color: #6b7280;
                }
            `}</style>
        </Modal>
    );
};

export default PromptEditorModal;
