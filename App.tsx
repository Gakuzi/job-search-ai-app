import React, { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { signInWithGoogleForGmail } from './services/googleAuthService';
import { fetchRecruiterReplies } from './services/gmailService';
import { useTheme } from './hooks/useTheme';
import {
    subscribeToProfiles,
    subscribeToJobs,
    addProfile as addProfileToDb,
    updateProfile as updateProfileInDb,
    addJobsBatch,
    updateJob,
    deleteJob as deleteJobFromDb,
} from './services/firestoreService';
import {
    findJobsOnRealWebsite,
    adaptResume as adaptResumeWithAI,
    generateCoverLetter,
    getInterviewQuestions,
    analyzeHrResponse,
    generateShortMessage,
    matchEmailToJob,
} from './services/geminiService';
import type { Job, Profile, SearchSettings, KanbanStatus } from './types';
import { AppStatus, DEFAULT_PROMPTS } from './constants';

import AuthGuard from './components/AuthGuard';
import Header from './components/Header';
import SettingsPanel from './components/SettingsPanel';
import JobList from './components/JobList';
import StatusBar from './components/StatusBar';
import ApplicationTracker from './components/ApplicationTracker';
import Modal from './components/Modal';
import JobDetailModal from './components/JobDetailModal';
import OnboardingModal from './components/OnboardingModal';
import HrAnalysisModal from './components/HrAnalysisModal';
import ConfigurationError from './components/ConfigurationError';
import ReplyScannerModal from './components/ReplyScannerModal';
import { useLocalStorage } from './hooks/useLocalStorage';

const App: React.FC = () => {
    // UI State
    const [theme, setTheme] = useTheme();
    const [view, setView] = useLocalStorage<'search' | 'applications'>('view', 'search');
    const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
    const [message, setMessage] = useState('Добро пожаловать! Настройте параметры и начните поиск.');

    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [googleAccessToken, setGoogleAccessToken] = useLocalStorage<string | null>('googleAccessToken', null);
    const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);
    const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

    // Data State
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [activeProfileId, setActiveProfileId] = useLocalStorage<string | null>('activeProfileId', null);
    const [foundJobs, setFoundJobs] = useState<Job[]>([]);
    const [trackedJobs, setTrackedJobs] = useState<Job[]>([]);

    // Modal State
    const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [jobForHrAnalysis, setJobForHrAnalysis] = useState<Job | null>(null);
    const [scannerModalState, setScannerModalState] = useState<{
        isOpen: boolean;
        status: 'scanning' | 'analyzing' | 'complete';
        foundCount: number;
        updatedCount: number;
    } | null>(null);


    // Derived State
    const activeProfile = profiles.find(p => p.id === activeProfileId) || null;
    
    // Config error detection
    const missingKeys: ('gemini' | 'firebase')[] = [];
    if (!process.env.API_KEY) {
      missingKeys.push('gemini');
    }
    if (!import.meta.env.VITE_FIREBASE_API_KEY) {
      missingKeys.push('firebase');
    }

    // --- Effects ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setAuthLoading(false);
            if (!user) {
                // Clear google token if firebase user logs out
                setGoogleAccessToken(null);
            }
        });
        return () => unsubscribe();
    }, [setGoogleAccessToken]);

    useEffect(() => {
        if (user) {
            const unsubscribeProfiles = subscribeToProfiles(user.uid, (loadedProfiles) => {
                setProfiles(loadedProfiles);
                if (loadedProfiles.length > 0 && !activeProfileId) {
                    setActiveProfileId(loadedProfiles[0].id);
                } else if (loadedProfiles.length === 0) {
                     setIsOnboardingOpen(true);
                }
            });
            const unsubscribeJobs = subscribeToJobs(user.uid, setTrackedJobs);
            return () => {
                unsubscribeProfiles();
                unsubscribeJobs();
            };
        } else {
            setProfiles([]);
            setTrackedJobs([]);
        }
    }, [user, activeProfileId, setActiveProfileId]);

    // --- Helper Functions ---
    const updateStatus = (newStatus: AppStatus, newMessage: string) => {
        setStatus(newStatus);
        setMessage(newMessage);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setActiveProfileId(null);
            setGoogleAccessToken(null);
        } catch (error) {
            console.error("Error signing out: ", error);
            updateStatus(AppStatus.Error, 'Не удалось выйти из аккаунта.');
        }
    };
    
    // --- Google Auth & Scan Handlers ---
    const handleGoogleConnect = async () => {
        setIsGoogleAuthLoading(true);
        setGoogleAuthError(null);
        try {
            const { accessToken } = await signInWithGoogleForGmail();
            if (accessToken) {
                setGoogleAccessToken(accessToken);
                updateStatus(AppStatus.Success, 'Gmail успешно подключен. Теперь вы можете сканировать почту.');
            } else {
                throw new Error("Access token not received.");
            }
        } catch (error) {
            console.error("Google connect error:", error);
            setGoogleAuthError('Не удалось подключиться к Google. Убедитесь, что всплывающие окна разрешены.');
            updateStatus(AppStatus.Error, 'Ошибка подключения к Gmail.');
        } finally {
            setIsGoogleAuthLoading(false);
        }
    };

    const handleGoogleDisconnect = () => {
        setGoogleAccessToken(null);
        updateStatus(AppStatus.Idle, 'Вы отключились от Gmail.');
    };

    const handleScanReplies = async () => {
        if (!googleAccessToken || !activeProfile) {
            updateStatus(AppStatus.Error, 'Сначала подключите Gmail в настройках и выберите профиль.');
            return;
        }
        setScannerModalState({ isOpen: true, status: 'scanning', foundCount: 0, updatedCount: 0 });
        try {
            const replies = await fetchRecruiterReplies(googleAccessToken);
            setScannerModalState(s => ({ ...s!, status: 'analyzing', foundCount: replies.length }));
            
            let updatedCount = 0;
            for (const email of replies) {
                const matchedJobId = await matchEmailToJob(activeProfile.prompts.emailJobMatch, email, trackedJobs);
                
                if (matchedJobId && matchedJobId !== 'NO_MATCH') {
                    const emailBodyForAnalysis = `Тема: ${email.subject}\nОт: ${email.from}\n\n${email.body}`;
                    const newStatus = await analyzeHrResponse(activeProfile.prompts.hrResponseAnalysis, emailBodyForAnalysis);
                    await handleUpdateJobStatus(matchedJobId, newStatus);
                    updatedCount++;
                }
            }

            setScannerModalState(s => ({ ...s!, status: 'complete', updatedCount }));
        } catch (error) {
            console.error("Error scanning replies:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (errorMessage.includes('401') || errorMessage.includes('403')) {
                handleGoogleDisconnect();
                updateStatus(AppStatus.Error, 'Сессия Google истекла. Пожалуйста, подключитесь снова.');
            } else {
                updateStatus(AppStatus.Error, 'Произошла ошибка при сканировании почты.');
            }
            setScannerModalState(null);
        }
    };

    // --- Core Logic Handlers ---
    const handleSearch = async () => {
        if (!activeProfile) {
            updateStatus(AppStatus.Error, 'Пожалуйста, выберите или создайте профиль для поиска.');
            return;
        }
        updateStatus(AppStatus.Loading, 'ИИ анализирует сайт с вакансиями... Это может занять до минуты.');
        setFoundJobs([]);
        try {
            const jobs = await findJobsOnRealWebsite(activeProfile.prompts.jobSearch, activeProfile.resume, activeProfile.settings);
            const newJobs = jobs.map(job => ({
                ...job,
                id: job.url,
                userId: user!.uid,
                profileId: activeProfile.id,
                kanbanStatus: 'new' as KanbanStatus
            }));
            setFoundJobs(newJobs);
            updateStatus(AppStatus.Success, `Найдено ${newJobs.length} релевантных вакансий.`);
        } catch (error) {
            console.error("Job search error:", error);
            const errorMessage = error instanceof Error ? error.message : "Произошла неизвестная ошибка";
            updateStatus(AppStatus.Error, `Ошибка поиска: ${errorMessage}`);
        }
    };

    const handleSaveJobs = useCallback(async (jobsToSave: Job[]) => {
        if (!user || !activeProfile) return;
        const jobsWithMetadata = jobsToSave.map(j => ({ ...j, userId: user.uid, profileId: activeProfile.id }));
        try {
            await addJobsBatch(jobsWithMetadata);
            setFoundJobs(prev => prev.filter(job => !jobsToSave.find(j => j.id === job.id)));
            setView('applications');
        } catch (error) {
             console.error("Error saving jobs:", error);
             updateStatus(AppStatus.Error, 'Не удалось сохранить вакансии.');
        }
    }, [user, activeProfile, setView]);
    
    const handleDismissJob = (jobId: string) => {
        setFoundJobs(prev => prev.filter(job => job.id !== jobId));
    };

    const handleUpdateJobStatus = async (jobId: string, newStatus: KanbanStatus) => {
        try {
            await updateJob(jobId, { kanbanStatus: newStatus });
        } catch (error) {
            console.error("Error updating job status:", error);
            updateStatus(AppStatus.Error, 'Не удалось обновить статус вакансии.');
        }
    };
    
    const handleUpdateJobDetails = async (jobId: string, updates: Partial<Job>) => {
        await updateJob(jobId, updates);
    };

    // --- Profile Handlers ---
     const handleAddProfile = async (name: string, resume: string, settings: SearchSettings) => {
        if (!user) return;
        const newProfile: Omit<Profile, 'id'> = {
            userId: user.uid,
            name,
            resume,
            settings,
            prompts: DEFAULT_PROMPTS,
        };
        const createdProfile = await addProfileToDb(newProfile);
        setActiveProfileId(createdProfile.id);
    };
    
    const handleFinishOnboarding = async ({ resume, settings }: { resume: string, settings: SearchSettings }) => {
        if (!user) return;
         const profileName = settings.positions.split(',')[0].trim() || 'Новый Профиль';
         await handleAddProfile(profileName, resume, settings);
         setIsOnboardingOpen(false);
    };

    const handleUpdateProfile = async (profile: Profile) => {
       await updateProfileInDb(profile);
    };

    // --- AI Tool Handlers for Modals ---
    const runAIAction = async (title: string, action: () => Promise<string>) => {
        setModalContent(null);
        setIsModalLoading(true);
        try {
            const result = await action();
            setModalContent(result);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Произошла ошибка";
            setModalContent(`**Ошибка:**\n\n${errorMessage}`);
        } finally {
            setIsModalLoading(false);
        }
    };

    const handleAdaptResume = (job: Job) => {
        if (!activeProfile) return;
        setModalContent(null);
        setIsModalLoading(true);
        const action = () => adaptResumeWithAI(activeProfile.prompts.resumeAdapt, activeProfile.resume, job);
        runAIAction(`Адаптированное резюме для "${job.title}"`, action);
    };

    const handleGenerateEmail = (job: Job) => {
        if (!activeProfile) return;
        setModalContent(null);
        setIsModalLoading(true);
        const action = async () => {
            const result = await generateCoverLetter(activeProfile.prompts.coverLetter, job, user?.displayName || 'Кандидат');
            return `**Тема:** ${result.subject}\n\n---\n\n${result.body}`;
        };
        runAIAction(`Сопроводительное письмо для "${job.title}"`, action);
    };
    
    const handlePrepareForInterview = (job: Job) => {
        if (!activeProfile) return;
        setModalContent(null);
        setIsModalLoading(true);
        const action = () => getInterviewQuestions(job, activeProfile.resume);
        runAIAction(`Подготовка к интервью для "${job.title}"`, action);
    };

    const handleAnalyzeResponse = (job: Job) => {
        setJobForHrAnalysis(job);
    };

    const handlePerformHrAnalysis = async (emailText: string) => {
        if (!jobForHrAnalysis || !activeProfile) return;
        try {
            const newStatus = await analyzeHrResponse(activeProfile.prompts.hrResponseAnalysis, emailText);
            await updateJob(jobForHrAnalysis.id, { kanbanStatus: newStatus });
            updateStatus(AppStatus.Success, `Статус вакансии "${jobForHrAnalysis.title}" обновлен на "${newStatus}".`);
        } catch(error) {
            const errorMessage = error instanceof Error ? error.message : "Произошла ошибка";
            updateStatus(AppStatus.Error, `Ошибка анализа: ${errorMessage}`);
        } finally {
            setJobForHrAnalysis(null);
        }
    };
    
    const handleQuickApply = (job: Job, type: 'email' | 'whatsapp' | 'telegram') => {
        return new Promise<void>(async (resolve, reject) => {
            if (!activeProfile) return reject(new Error("No active profile"));
            try {
                const message = await generateShortMessage(activeProfile.prompts.shortMessage, job, user?.displayName || 'Кандидат');
                let url = '';
                if (type === 'email' && job.contacts?.email) {
                    url = `mailto:${job.contacts.email}?subject=Отклик на вакансию ${job.title}&body=${encodeURIComponent(message)}`;
                } else if (type === 'whatsapp' && job.contacts?.phone) {
                    url = `https://wa.me/${job.contacts.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                } else if (type === 'telegram' && job.contacts?.telegram) {
                    url = `https://t.me/${job.contacts.telegram.replace('@', '')}`;
                    // For telegram, we copy the message as we can't prefill it.
                    await navigator.clipboard.writeText(message);
                    alert('Сообщение скопировано в буфер обмена. Откроется чат в Telegram.');
                }
                if (url) window.open(url, '_blank');
                resolve();
            } catch (error) {
                console.error(`Quick apply error (${type}):`, error);
                reject(error);
            }
        });
    }

    const handleViewDetails = (job: Job) => {
        setModalContent(
            <JobDetailModal 
                job={job}
                onClose={() => setModalContent(null)}
                onUpdateJob={handleUpdateJobDetails}
                onAdaptResume={handleAdaptResume}
                onGenerateEmail={handleGenerateEmail}
                onPrepareForInterview={handlePrepareForInterview}
                onAnalyzeResponse={handleAnalyzeResponse}
                onQuickApplyEmail={(j) => handleQuickApply(j, 'email')}
                onQuickApplyWhatsapp={(j) => handleQuickApply(j, 'whatsapp')}
                onQuickApplyTelegram={(j) => handleQuickApply(j, 'telegram')}
            />
        );
    };

     if (missingKeys.length > 0) {
        return <ConfigurationError missingKeys={missingKeys} />;
    }

    return (
        <AuthGuard user={user} loading={authLoading}>
            <div className={`min-h-screen bg-slate-100 dark:bg-slate-900 font-sans ${theme}`}>
                <Header 
                    theme={theme} 
                    setTheme={setTheme} 
                    view={view}
                    setView={setView}
                    user={user}
                    onLogout={handleLogout}
                />
                <main className="container mx-auto p-4 md:p-6">
                    {view === 'search' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            <div className="lg:col-span-1 lg:sticky top-20">
                                <SettingsPanel
                                    profiles={profiles}
                                    activeProfile={activeProfile}
                                    onProfileChange={setActiveProfileId}
                                    onProfileUpdate={handleUpdateProfile}
                                    onSearch={handleSearch}
                                    status={status}
                                    user={user}
                                    googleAccessToken={googleAccessToken}
                                    onGoogleConnect={handleGoogleConnect}
                                    onGoogleDisconnect={handleGoogleDisconnect}
                                    isGoogleAuthLoading={isGoogleAuthLoading}
                                    googleAuthError={googleAuthError}
                                />
                                 <div className="mt-4">
                                     <StatusBar status={status} message={message} />
                                 </div>
                            </div>
                            <div className="lg:col-span-2">
                                <JobList 
                                    jobs={foundJobs}
                                    onSaveJobs={handleSaveJobs}
                                    onDismissJob={handleDismissJob}
                                    onViewDetails={handleViewDetails}
                                    onAdaptResume={handleAdaptResume}
                                    onGenerateEmail={handleGenerateEmail}
                                />
                            </div>
                        </div>
                    )}
                    {view === 'applications' && (
                        <ApplicationTracker 
                            jobs={trackedJobs}
                            profiles={profiles}
                            onUpdateJobStatus={handleUpdateJobStatus}
                            onViewDetails={handleViewDetails}
                            onAdaptResume={handleAdaptResume}
                            onGenerateEmail={handleGenerateEmail}
                            onScanReplies={handleScanReplies}
                            isGmailConnected={!!googleAccessToken}
                        />
                    )}
                </main>

                {modalContent && !React.isValidElement(modalContent) && (
                     <Modal title="Результат от ИИ" onClose={() => setModalContent(null)} isLoading={isModalLoading}>
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                           <pre className="whitespace-pre-wrap font-sans text-sm">{modalContent}</pre>
                        </div>
                    </Modal>
                )}
                 {modalContent && React.isValidElement(modalContent) && modalContent}


                {isOnboardingOpen && user && (
                    <OnboardingModal 
                        onFinish={handleFinishOnboarding}
                        onClose={() => setIsOnboardingOpen(false)}
                    />
                )}
                
                {jobForHrAnalysis && (
                    <HrAnalysisModal 
                        job={jobForHrAnalysis}
                        onClose={() => setJobForHrAnalysis(null)}
                        onAnalyze={handlePerformHrAnalysis}
                    />
                )}

                {scannerModalState?.isOpen && (
                    <ReplyScannerModal
                        onClose={() => setScannerModalState(null)}
                        scanStatus={scannerModalState.status}
                        foundEmailsCount={scannerModalState.foundCount}
                        updatedJobsCount={scannerModalState.updatedCount}
                    />
                )}
            </div>
        </AuthGuard>
    );
};

export default App;