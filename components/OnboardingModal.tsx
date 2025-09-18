import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { UploadIcon } from './icons/UploadIcon';
import { SendIcon } from './icons/SendIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { analyzeResumeAndAskQuestions, generateProfileFromChat } from '../services/geminiService';
import type { SearchSettings } from '../types';

interface OnboardingModalProps {
    onFinish: (result: { resume: string, settings: SearchSettings, profileName: string }) => void;
    onClose: () => void;
}

interface ChatMessage {
    sender: 'ai' | 'user';
    text: string;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onFinish, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { sender: 'ai', text: 'Здравствуйте! Я ваш AI-ассистент. Давайте настроим ваш профиль для поиска работы. Вы можете загрузить ваше резюме (.txt, .md) или просто рассказать о себе.' }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasProvidedResume, setHasProvidedResume] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    const addMessage = (sender: 'ai' | 'user', text: string) => {
        setMessages(prev => [...prev, { sender, text }]);
    };

    const processAiResponse = useCallback(async (text: string) => {
        setIsLoading(true);
        const fullChatHistory = [...messages, { sender: 'user', text }].map(m => `${m.sender}: ${m.text}`).join('\n');

        try {
            if (!hasProvidedResume) {
                const responseText = await analyzeResumeAndAskQuestions(text);
                if (responseText.trim().toUpperCase() === 'READY') {
                    addMessage('ai', 'Отлично, вся необходимая информация есть! Создаю ваш профиль...');
                    const profile = await generateProfileFromChat(fullChatHistory);
                    onFinish(profile);
                } else {
                    addMessage('ai', responseText);
                    setHasProvidedResume(true);
                }
            } else {
                 addMessage('ai', 'Спасибо за уточнение! Создаю ваш профиль на основе всей информации...');
                 const profile = await generateProfileFromChat(fullChatHistory);
                 onFinish(profile);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка.';
            addMessage('ai', `К сожалению, произошла ошибка: ${errorMessage} Пожалуйста, проверьте ваш API ключ и попробуйте снова.`);
        } finally {
            setIsLoading(false);
        }
    }, [messages, hasProvidedResume, onFinish]);

    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;
        
        addMessage('user', userInput);
        setUserInput('');
        await processAiResponse(userInput);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target?.result as string;
                addMessage('user', `Загрузил(а) резюме: ${file.name}`);
                await processAiResponse(text);
            };
            reader.readAsText(file);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" role="dialog">
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-primary-500"/> AI-Профилировщик</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <main className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-800">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white flex-shrink-0"><SparklesIcon className="w-5 h-5"/></div>}
                                <div className={`max-w-md px-4 py-2 rounded-xl ${msg.sender === 'ai' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-primary-500 text-white'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-end gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white flex-shrink-0"><SparklesIcon className="w-5 h-5"/></div>
                                <div className="max-w-md px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700">
                                   <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                                   </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </main>

                <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                         <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.md" className="hidden" />
                         <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
                            <UploadIcon className="w-6 h-6"/>
                         </button>
                         <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Ваш ответ..."
                            disabled={isLoading}
                            className="flex-1 w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                        />
                         <button onClick={handleSendMessage} disabled={isLoading || !userInput.trim()} className="p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:bg-slate-400 disabled:cursor-not-allowed">
                             <SendIcon className="w-6 h-6"/>
                         </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default OnboardingModal;