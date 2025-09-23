import React, { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

import Sidebar from './components/Sidebar';
import MainHeader from './components/MainHeader';
import StatusBar from './components/StatusBar';
import ScanResults from './components/ScanResults';
import ApplicationTracker from './components/ApplicationTracker';
import JobDetailModal from './components/JobDetailModal';
import Modal from './components/Modal';
import SettingsModal from './components/SettingsModal';
import SetupWizardModal from './components/SetupWizardModal';
import JobComparisonModal from './components/JobComparisonModal';
import HrAnalysisModal from './components/HrAnalysisModal';
import GmailScannerModal from './components/GmailScannerModal';
import PromptEditorModal from './components/PromptEditorModal';
import ConfigurationError from './components/ConfigurationError';
import AuthGuard from './components/AuthGuard';

import { useTheme } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';

import { auth, isConfigured as isFirebaseConfigured } from './services/firebase';
import * as firestore from './services/firestoreService';
import * as gemini from './services/geminiService';
// hhService is not provided, so we're using a mock for now.
// import { findJobsOnHH } from './services/hhService';
import { findJobsOnAvitoAPI } from './services/avitoService';
import * as gAuth from './services/googleAuthService';
import * as gMail from './services/gmailService';

import type { Job, Profile, KanbanStatus, Email, PromptTemplate, SearchSettings } from './types';
import { AppStatus } from './constants';

// Mocking hhService as it's not provided in the file list.
const findJobsOnHH = async (settings: SearchSettings): Promise<Omit<Job, 'id' | 'userId' | 'profileId' | 'kanbanStatus'>[]> => {
    console.warn("`hhService` is not implemented. Returning empty array for hh.ru jobs.");
    return Promise.resolve([]);
};

const DEFAULT_PROMPTS: PromptTemplate[] = [
    { id: 'adapt_resume', name: 'Адаптация резюме', description: 'Изменяет резюме под конкретную вакансию', template: "Адаптируй следующее резюме, чтобы оно максимально соответствовало требованиям вакансии. Сделай акцент на ключевых навыках и опыте, которые релевантны для этой должности. Не выдумывай опыт, которого нет в исходном резюме. Просто переформулируй и расставь акценты. Ответ должен быть только текстом адаптированного резюме, без лишних вступлений и заключений.\n\nИсходное резюме:\n---\n{{profile.resume}}\n---\n\nВакансия:\n---\nДолжность: {{job.title}} в {{job.company}}\nОписание: {{job.description}}\n---" },
    { id: 'cover_letter', name: 'Сопроводительное письмо', description: 'Генерирует сопроводительное письмо для отклика', template: "Напиши сопроводительное письмо для отклика на вакансию. Письмо должно быть профессиональным, вежливым и кратким (3-4 абзаца). Используй информацию из резюме кандидата, чтобы показать его релевантность. Обращайся к HR-менеджеру компании. Если имя неизвестно, используй 'Уважаемый HR-менеджер'. В конце вырази готовность пройти собеседование. Ответ должен быть только текстом письма.\n\nРезюме кандидата:\n---\n{{profile.resume}}\n---\n\nВакансия:\n---\nДолжность: {{job.title}}\nКомпания: {{job.company}}\nОписание: {{job.description}}\n---" },
];


// This component contains the main application logic and is only rendered when Firebase is configured.
// This prevents hooks like useAuthState from being called with a null `auth` object.
const MainApplication: React.FC = () => {
    const [theme, setTheme] = useTheme();
    // This hook is now safe because MainApplication is only rendered when auth is initialized.
    const [user, loadingAuth] = useAuthState(auth!);

    const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
    const [statusMessage, setStatusMessage] = useState('');
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [activeProfileId, setActiveProfileId] = useLocalStorage<string | null>('activeProfileId', null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [scannedJobs, setScannedJobs] = useState<Job[]>([]);

    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [jobsToCompare, setJobsToCompare] = useState<Job[]>([]);
    const [scannedEmails, setScannedEmails] = useState<Email[]>([]);
    const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
    const [templateToEdit, setTemplateToEdit] = useState<PromptTemplate | null>(null);
    const [aiResult, setAiResult] = useState('');
    
    const [googleAccessToken, setGoogleAccessToken] = useLocalStorage<string | null>('googleAccessToken', null);
    
    const [promptTemplates, setPromptTemplates] = useLocalStorage<PromptTemplate[]>('promptTemplates', DEFAULT_PROMPTS);

    const activeProfile = profiles.find(p => p.id === activeProfileId) || null;
    const isGoogleConnected = !!googleAccessToken;

    useEffect(() => {
        if (!user) return;

        // When user logs in, check if a token was just stored from the Auth component
        const storedToken = sessionStorage.getItem('googleAccessToken');
        if (storedToken) {
            setGoogleAccessToken(storedToken);
            sessionStorage.removeItem('googleAccessToken');
        }

        const unsubscribe = firestore.getProfiles(user.uid, setProfiles);
        return () => unsubscribe();
    }, [user, setGoogleAccessToken]);

    useEffect(() => {
        if (profiles.length > 0 && (!activeProfileId || !profiles.some(p => p.id === activeProfileId))) {
            setActiveProfileId(profiles[0].id);
        }
    }, [profiles, activeProfileId, setActiveProfileId]);

    useEffect(() => {
        if (user && activeProfileId) {
            const unsubscribe = firestore.getJobs(user.uid, activeProfileId, setJobs);
            return () => unsubscribe();
        } else {
            setJobs([]);
        }
    }, [user, activeProfileId]);

    const runAIAction = useCallback(async (action: Promise<string>) => {
        setActiveModal('loading-ai');
        try {
            const result = await action;
            setAiResult(result);
            setActiveModal('ai-result');
        } catch (error) {
            console.error("AI Action Error:", error);
            const message = error instanceof Error ? error.message : "Unknown AI error";
            setAiResult(`Произошла ошибка: ${message}`);
            setActiveModal('ai-result');
        }
    }, []);

    const handleLogout = () => {
        gAuth.signOut();
        setGoogleAccessToken(null);
        setActiveProfileId(null);
    };

    const handleSearch = async () => {
        if (!activeProfile) return;
        setStatus(AppStatus.Loading);
        setStatusMessage('Ищем вакансии...');
        setScannedJobs([]);
        setActiveModal('scanResults');

        try {
            let foundJobs: Omit<Job, 'id' | 'userId' | 'profileId' | 'kanbanStatus'>[] = [];
            const settings = activeProfile.searchSettings;

            if (settings.platforms.hh) {
                const hhJobs = await findJobsOnHH(settings);
                foundJobs = [...foundJobs, ...hhJobs];
            }
            if (settings.platforms.avito) {
                const avitoJobs = await findJobsOnAvitoAPI(settings);
                foundJobs = [...foundJobs, ...avitoJobs];
            }

            setStatusMessage(`Найдено ${foundJobs.length} вакансий. Анализируем с помощью ИИ...`);
            const analyzedJobs = await Promise.all(foundJobs.map(async job => {
                const matchAnalysis = await gemini.analyzeJobWithResume(job, activeProfile.resume);
                return { ...job, id: uuidv4(), matchAnalysis } as Job;
            }));

            setScannedJobs(analyzedJobs);
            setStatus(AppStatus.Success);
            setStatusMessage(`Готово! Найдено и проанализировано ${analyzedJobs.length} вакансий.`);

        } catch (error) {
            console.error(error);
            setStatus(AppStatus.Error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            setStatusMessage(`Ошибка при поиске: ${message}`);
        }
    };
    
    const handleSaveJobs = (jobsToSave: Job[]) => {
        if (!user || !activeProfileId) return;
        jobsToSave.forEach(job => {
            const jobData: Omit<Job, 'id'> = {
                ...job,
                userId: user.uid,
                profileId: activeProfileId,
                kanbanStatus: 'new'
            };
            firestore.addJob(user.uid, activeProfileId, jobData);
        });
        setScannedJobs(prev => prev.filter(j => !jobsToSave.find(s => s.id === j.id)));
    };
    
    const handleAdaptResume = (job: Job) => {
        if (!activeProfile) return;
        setSelectedJob(job);
        runAIAction(gemini.adaptResumeForJob(job, activeProfile.resume));
    };

    const handleGenerateEmail = (job: Job) => {
        if (!activeProfile) return;
        setSelectedJob(job);
        runAIAction(gemini.generateCoverLetter(job, activeProfile.resume));
    }
    
    const handlePrepareForInterview = (job: Job) => {
        if (!activeProfile) return;
        setSelectedJob(job);
        runAIAction(gemini.prepareForInterview(job, activeProfile.resume));
    }
    
    const handleAnalyzeResponse = async (emailText: string) => {
        if (!activeProfile) return;
        setActiveModal('loading-ai');
        try {
            const result = await gemini.analyzeHrResponse(emailText, jobs);
            await firestore.updateJob(result.jobId, { kanbanStatus: result.newStatus });
            setStatus(AppStatus.Success);
            setStatusMessage(`Статус вакансии обновлен на "${result.newStatus}"`);
        } catch (error) {
            console.error(error);
            setStatus(AppStatus.Error);
            setStatusMessage("Не удалось проанализировать ответ.");
        } finally {
            setActiveModal(null);
        }
    };
    
    const handleCompareJobs = (jobsToCompare: Job[]) => {
        if (!activeProfile) return;
        setJobsToCompare(jobsToCompare);
        runAIAction(gemini.compareJobs(jobsToCompare, activeProfile.resume));
    };
    
    const handleScanReplies = async () => {
        if (!googleAccessToken) {
            setStatus(AppStatus.Error);
            setStatusMessage("Аккаунт Google не подключен. Подключите его в настройках.");
            return;
        }
        setActiveModal('gmail-scanner');
        setScannedEmails([]);
        setAnalysisJobId(null);
        try {
            const emails = await gMail.listMessages(googleAccessToken, 30);
            setScannedEmails(emails);
        } catch (error) {
            console.error(error);
            setActiveModal(null);
            setStatus(AppStatus.Error);
            setStatusMessage(error instanceof Error ? error.message : "Ошибка при сканировании почты.");
        }
    };

    const handleAnalyzeScannedReply = async (emailText: string) => {
        setAnalysisJobId('loading');
        try {
            const result = await gemini.analyzeHrResponse(emailText, jobs);
            await firestore.updateJob(result.jobId, { kanbanStatus: result.newStatus });
            setAnalysisJobId(result.jobId);
        } catch (error) {
            console.error("Failed to match email to job:", error);
            setAnalysisJobId('not_found');
        }
    };
    
    const handleFinishSetup = async (profileData: Omit<Profile, 'id' | 'userId'>) => {
        if (user) {
            await firestore.addProfile(user.uid, profileData);
            setActiveModal(null);
        }
    };
    
    const handleUpdateProfile = (updates: Partial<Profile>) => {
        if (activeProfile) {
            firestore.updateProfile(activeProfile.id, updates);
        }
    };

    const handleUpdatePrompt = (id: string, newTemplate: string) => {
        setPromptTemplates(prev => prev.map(p => p.id === id ? { ...p, template: newTemplate } : p));
    };
    
    return (
        <AuthGuard user={user} loading={loadingAuth}>
            <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200">
                <Sidebar 
                    theme={theme} 
                    setTheme={setTheme} 
                    user={user} 
                    onLogout={handleLogout}
                    onOpenSettings={() => setActiveModal('settings')}
                    profiles={profiles}
                    activeProfile={activeProfile}
                    onSwitchProfile={setActiveProfileId}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <main className="flex-1 p-6 overflow-y-auto">
                        <MainHeader onSearch={handleSearch} status={status} />
                        {(status === AppStatus.Error || status === AppStatus.Success) && <StatusBar status={status} message={statusMessage} />}
                        <ApplicationTracker 
                            jobs={jobs}
                            profiles={profiles}
                            onUpdateJobStatus={(jobId, newStatus) => firestore.updateJob(jobId, { kanbanStatus: newStatus })}
                            onViewDetails={(job) => { setSelectedJob(job); setActiveModal('job-details'); }}
                            onAdaptResume={handleAdaptResume}
                            onGenerateEmail={handleGenerateEmail}
                            onQuickApplyEmail={async () => {}} // Placeholder
                            isGoogleConnected={isGoogleConnected}
                            onScanReplies={handleScanReplies}
                            onRefreshStatuses={async () => {}} // Placeholder
                            onCompareJobs={handleCompareJobs}
                        />
                    </main>
                </div>
                
                {/* Modals */}
                {user && profiles.length === 0 && <SetupWizardModal onFinish={handleFinishSetup} />}

                {activeModal === 'scanResults' && (
                    <ScanResults
                        jobs={scannedJobs}
                        onSaveJobs={handleSaveJobs}
                        onDismissJob={(jobId) => setScannedJobs(prev => prev.filter(j => j.id !== jobId))}
                        onViewDetails={(job) => { setSelectedJob(job); setActiveModal('job-details'); }}
                        onCompareJobs={handleCompareJobs}
                    />
                )}
                
                {activeModal === 'job-details' && selectedJob && (
                    <JobDetailModal
                        job={selectedJob}
                        onClose={() => setActiveModal(null)}
                        onUpdateJob={(jobId, updates) => firestore.updateJob(jobId, updates)}
                        onAdaptResume={handleAdaptResume}
                        onGenerateEmail={handleGenerateEmail}
                        onPrepareForInterview={handlePrepareForInterview}
                        onAnalyzeResponse={(job) => { setSelectedJob(job); setActiveModal('hr-analysis'); }}
                        onQuickApplyEmail={async () => {}}
                        onQuickApplyWhatsapp={async () => {}}
                        onQuickApplyTelegram={async () => {}}
                        isGoogleConnected={isGoogleConnected}
                    />
                )}
                
                {activeModal === 'hr-analysis' && selectedJob && (
                    <HrAnalysisModal 
                        job={selectedJob} 
                        onClose={() => setActiveModal(null)} 
                        onAnalyze={handleAnalyzeResponse} 
                    />
                )}
                
                {activeModal === 'gmail-scanner' && (
                    <GmailScannerModal 
                        isLoading={!scannedEmails.length}
                        emails={scannedEmails}
                        jobs={jobs}
                        analysisJobId={analysisJobId}
                        onClose={() => setActiveModal(null)}
                        onAnalyzeReply={handleAnalyzeScannedReply}
                    />
                )}

                {activeModal === 'settings' && activeProfile && user && (
                     <SettingsModal
                        user={user}
                        profile={activeProfile}
                        onClose={() => setActiveModal(null)}
                        onUpdateProfile={handleUpdateProfile}
                        onDeleteProfile={() => {}}
                        onAddProfile={(name) => {}}
                        isGoogleConnected={isGoogleConnected}
                        onGoogleConnect={async () => {
                            try {
                                const credential = await gAuth.linkGoogleAccount(user);
                                const token = gAuth.getAccessTokenFromCredential(credential);
                                setGoogleAccessToken(token);
                            } catch (error) {
                                console.error("Failed to link Google Account", error);
                                setStatus(AppStatus.Error);
                                setStatusMessage("Не удалось подключить аккаунт Google.");
                            }
                        }}
                        onGoogleDisconnect={() => {
                            // This just disconnects the Gmail API access, doesn't sign the user out.
                            setGoogleAccessToken(null);
                        }}
                        promptTemplates={promptTemplates}
                        onUpdatePrompt={handleUpdatePrompt}
                        onEditPrompt={(template) => { setTemplateToEdit(template); setSelectedJob(jobs[0]); }}
                    />
                )}
                
                {(activeModal === 'ai-result' || activeModal === 'loading-ai') && (
                    <Modal 
                        title="Результат от ИИ" 
                        onClose={() => setActiveModal(null)} 
                        isLoading={activeModal === 'loading-ai'}
                    >
                        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{aiResult}</div>
                    </Modal>
                )}

                {templateToEdit && activeProfile && selectedJob && (
                    <PromptEditorModal
                        template={templateToEdit}
                        job={selectedJob}
                        profile={activeProfile}
                        onClose={() => setTemplateToEdit(null)}
                        onSave={handleUpdatePrompt}
                    />
                )}

            </div>
        </AuthGuard>
    );
}

const App: React.FC = () => {
    // All configuration is now checked within the isFirebaseConfigured flag,
    // which reads from localStorage. If it's not configured, we show the error screen.
    if (!isFirebaseConfigured) {
        return <ConfigurationError />;
    }
    
    return <MainApplication />;
};

export default App;