import React, { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';

import { auth } from './services/firebase';
import * as firestoreService from './services/firestoreService';
import * as geminiService from './services/geminiService';
import * as avitoService from './services/avitoService';
import * as googleAuth from './services/googleAuthService';
import * as gmailService from './services/gmailService';

import type { User } from 'firebase/auth';
import type { Job, Profile, KanbanStatus, SearchSettings, GoogleUser, Email } from './types';
import { AppStatus } from './constants';
import { useTheme } from './hooks/useTheme';

import AuthGuard from './components/AuthGuard';
import Sidebar from './components/Sidebar';
import MainHeader from './components/MainHeader';
import StatusBar from './components/StatusBar';
import ScanResults from './components/ScanResults';
import ApplicationTracker from './components/ApplicationTracker';
import Modal from './components/Modal';
import JobDetailModal from './components/JobDetailModal';
import SettingsModal from './components/SettingsModal';
import SetupWizardModal from './components/SetupWizardModal';
import HrAnalysisModal from './components/HrAnalysisModal';
import JobComparisonModal from './components/JobComparisonModal';
import GmailScannerModal from './components/GmailScannerModal';
import ConfigurationError from './components/ConfigurationError';

// Placeholder service for hh.ru, in a real scenario this would be a fleshed-out module.
const hhServicePlaceholder = {
    findJobs: async (settings: SearchSettings): Promise<Partial<Job>[]> => {
        console.warn("hh.ru API is not implemented. Returning mock data.");
        // This would call the hh.ru API
        return [
            { title: `Mock HH Job for ${settings.positions}`, company: 'Mock Company', location: settings.location, salary: `${settings.salary}+`, description: 'This is a mock job description from a placeholder service.', url: '#', sourcePlatform: 'hh.ru' }
        ];
    }
};

const App: React.FC = () => {
    const [user, authLoading] = useAuthState(auth);
    const [theme, setTheme] = useTheme();

    // App State
    const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
    const [statusMessage, setStatusMessage] = useState('');
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [scannedJobs, setScannedJobs] = useState<Job[]>([]);

    // Modals State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [viewingJob, setViewingJob] = useState<Job | null>(null);
    const [adaptingJob, setAdaptingJob] = useState<Job | null>(null);
    const [generatingEmailJob, setGeneratingEmailJob] = useState<Job | null>(null);
    const [preparingInterviewJob, setPreparingInterviewJob] = useState<Job | null>(null);
    const [analyzingResponseJob, setAnalyzingResponseJob] = useState<Job | null>(null);
    const [comparingJobs, setComparingJobs] = useState<Job[]>([]);
    const [isGmailScannerOpen, setIsGmailScannerOpen] = useState(false);

    // AI-generated content state
    const [modalContent, setModalContent] = useState('');
    const [isModalLoading, setIsModalLoading] = useState(false);

    // Gmail/Google State
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [gmailEmails, setGmailEmails] = useState<Email[]>([]);
    const [gmailAnalysisJobId, setGmailAnalysisJobId] = useState<string | null>(null);
    
    // Config check state
    const [isFirebaseOk, setIsFirebaseOk] = useState(false);
    const [isGoogleOk, setIsGoogleOk] = useState(false);
    const [isConfigChecked, setIsConfigChecked] = useState(false);
    
    // ---- Effects ----
    
    // Check configuration on startup
    useEffect(() => {
        const firebaseApiKey = (import.meta as any).env.VITE_FIREBASE_API_KEY;
        const geminiApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        const googleClientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
        
        setIsFirebaseOk(!!firebaseApiKey && !!geminiApiKey && !firebaseApiKey.includes('...'));
        setIsGoogleOk(!!googleClientId && !googleClientId.includes('...'));
        setIsConfigChecked(true);
    }, []);

    // Initialize Google API Client
    useEffect(() => {
        const initGoogle = async () => {
            try {
                await googleAuth.gapiLoad('client:oauth2');
                await googleAuth.initGapiClient();
                setIsGapiReady(true);
                const client = googleAuth.initTokenClient(async (resp: any) => {
                    if (resp.error) {
                        console.error('Google Auth Error:', resp.error);
                        setIsGoogleConnected(false);
                        return;
                    }
                    setIsGoogleConnected(true);
                    // Fetch user info
                    const userInfoResp = await gapi.client.oauth2.userinfo.get();
                    setGoogleUser(userInfoResp.result);
                });
                setTokenClient(client);
            } catch (error) {
                console.error("Error initializing Google API", error);
                setStatus(AppStatus.Error);
                setStatusMessage('Не удалось инициализировать Google API.');
            }
        };
        if(isConfigChecked && isGoogleOk) {
            initGoogle();
        }
    }, [isConfigChecked, isGoogleOk]);
    

    // Subscribe to profiles
    useEffect(() => {
        if (user) {
            const unsubscribe = firestoreService.getProfiles(user.uid, (loadedProfiles) => {
                setProfiles(loadedProfiles);
                if (loadedProfiles.length > 0) {
                    // If no active profile or active is deleted, set to first
                    if (!activeProfile || !loadedProfiles.find(p => p.id === activeProfile.id)) {
                        setActiveProfile(loadedProfiles[0]);
                    }
                } else {
                    setActiveProfile(null);
                }
            });
            return () => unsubscribe();
        } else {
            setProfiles([]);
            setActiveProfile(null);
        }
    }, [user]);

    // Subscribe to jobs for active profile
    useEffect(() => {
        if (user && activeProfile) {
            const unsubscribe = firestoreService.getJobs(user.uid, activeProfile.id, setJobs);
            return () => unsubscribe();
        } else {
            setJobs([]);
        }
    }, [user, activeProfile]);


    // ---- Handlers ----
    
    const showStatus = (status: AppStatus, message: string, duration = 3000) => {
        setStatus(status);
        setStatusMessage(message);
        if(status !== AppStatus.Loading) {
            setTimeout(() => {
                setStatus(AppStatus.Idle);
                setStatusMessage('');
            }, duration);
        }
    };

    const handleSearch = useCallback(async () => {
        if (!activeProfile) {
            showStatus(AppStatus.Error, "Сначала создайте и выберите профиль в настройках.");
            return;
        }

        showStatus(AppStatus.Loading, "Ищем вакансии на платформах...");
        setScannedJobs([]); // Clear previous results

        try {
            // This is a simplified search. A real app would run these in parallel.
            const rawJobs = await hhServicePlaceholder.findJobs(activeProfile.searchSettings);

            if (activeProfile.searchSettings.platforms.avito && activeProfile.avitoClientId && activeProfile.avitoClientSecret) {
                const avitoRawJobs = await avitoService.findJobsOnAvitoAPI(activeProfile.searchSettings, activeProfile.avitoClientId, activeProfile.avitoClientSecret);
                rawJobs.push(...avitoRawJobs);
            }

            if(rawJobs.length === 0) {
                showStatus(AppStatus.Success, "Новых вакансий не найдено.");
                return;
            }

            showStatus(AppStatus.Loading, `Анализируем ${rawJobs.length} вакансий с помощью ИИ...`);

            const enrichedJobsPromises = rawJobs.map(rawJob =>
                geminiService.analyzeAndEnrichJob(rawJob, activeProfile)
            );
            
            const settledJobs = await Promise.allSettled(enrichedJobsPromises);
            
            const newJobs = settledJobs
                .filter(result => result.status === 'fulfilled')
                .map(result => (result as PromiseFulfilledResult<Job>).value);

            // Filter out jobs that are already being tracked
            const existingUrls = new Set(jobs.map(j => j.url));
            const uniqueNewJobs = newJobs.filter(j => !existingUrls.has(j.url));

            setScannedJobs(uniqueNewJobs.map(j => ({...j, id: `temp-${Math.random()}`, kanbanStatus: 'new' })));
            showStatus(AppStatus.Success, `Найдено ${uniqueNewJobs.length} новых вакансий.`);

        } catch (error: any) {
            showStatus(AppStatus.Error, error.message || "Произошла ошибка при поиске.");
        }
    }, [activeProfile, jobs]);
    
    const handleSaveJobs = useCallback(async (jobsToSave: Job[]) => {
        if (!user || !activeProfile) return;
        
        const jobsToAdd = jobsToSave.map(({ id, ...rest }) => ({...rest, userId: user.uid, profileId: activeProfile.id, kanbanStatus: 'new'}) as Omit<Job, 'id'>) ;
        await firestoreService.addJobsBatch(user.uid, activeProfile.id, jobsToAdd);
        
        // Remove saved jobs from scanned list
        const savedIds = new Set(jobsToSave.map(j => j.id));
        setScannedJobs(prev => prev.filter(j => !savedIds.has(j.id)));
        showStatus(AppStatus.Success, `${jobsToSave.length} вакансий добавлено в трекер.`);
    }, [user, activeProfile]);

    const handleDismissScannedJob = (jobId: string) => {
        setScannedJobs(prev => prev.filter(j => j.id !== jobId));
    };
    
    const handleUpdateJobStatus = useCallback((jobId: string, newStatus: KanbanStatus) => {
        firestoreService.updateJob(jobId, { kanbanStatus: newStatus });
    }, []);
    
    // --- AI Action Handlers ---
    const handleAdaptResume = async (job: Job) => {
        if (!activeProfile) return;
        setAdaptingJob(job);
        setIsModalLoading(true);
        try {
            const content = await geminiService.adaptResumeForJob(job, activeProfile);
            setModalContent(content);
        } catch (error: any) {
            setModalContent(`Ошибка: ${error.message}`);
        } finally {
            setIsModalLoading(false);
        }
    };

    const handleGenerateEmail = async (job: Job) => {
        if (!activeProfile) return;
        setGeneratingEmailJob(job);
        setIsModalLoading(true);
        try {
            const content = await geminiService.generateCoverLetter(job, activeProfile);
            setModalContent(content);
        } catch (error: any) {
            setModalContent(`Ошибка: ${error.message}`);
        } finally {
            setIsModalLoading(false);
        }
    };
    
    const handlePrepareForInterview = async (job: Job) => {
        if (!activeProfile) return;
        setPreparingInterviewJob(job);
        setIsModalLoading(true);
        try {
            const content = await geminiService.prepareForInterview(job, activeProfile);
            setModalContent(content);
        } catch (error: any) {
            setModalContent(`Ошибка: ${error.message}`);
        } finally {
            setIsModalLoading(false);
        }
    };
    
    const handleAnalyzeResponse = (job: Job) => {
        setAnalyzingResponseJob(job);
    };
    
    const executeResponseAnalysis = async (emailText: string) => {
        if (!analyzingResponseJob) return;
        
        setIsModalLoading(true);
        try {
            const { newStatus, analysis } = await geminiService.analyzeHrResponse(emailText, analyzingResponseJob);
            firestoreService.updateJob(analyzingResponseJob.id, { kanbanStatus: newStatus });
            showStatus(AppStatus.Success, `Статус вакансии обновлен на "${newStatus}" на основе анализа.`);
        } catch (error: any) {
            showStatus(AppStatus.Error, error.message);
        } finally {
            setIsModalLoading(false);
            setAnalyzingResponseJob(null);
        }
    }

    const handleCompareJobs = async (jobsToCompare: Job[]) => {
        if (!activeProfile) return;
        setComparingJobs(jobsToCompare);
        setIsModalLoading(true);
        try {
            const content = await geminiService.compareJobs(jobsToCompare, activeProfile);
            setModalContent(content);
        } catch(error: any) {
            setModalContent(`Ошибка: ${error.message}`);
        } finally {
            setIsModalLoading(false);
        }
    };
    
    // --- Profile Handlers ---
    
    const handleFinishWizard = async (profileData: Omit<Profile, 'id' | 'userId'>) => {
        if (!user) return;
        await firestoreService.addProfile(user.uid, profileData);
        // The useEffect will pick up the new profile and set it as active.
    };
    
    const handleAddProfile = async (profileData: Omit<Profile, 'id' | 'userId'>) => {
        if (!user) return;
        await firestoreService.addProfile(user.uid, profileData);
    };

    const handleUpdateProfile = (profileId: string, updates: Partial<Profile>) => {
        firestoreService.updateProfile(profileId, updates);
    };

    const handleDeleteProfile = async (profileId: string) => {
        await firestoreService.deleteProfile(profileId);
        // Dependent jobs should be cleaned up via a Firebase Function in a real app.
    };

    // --- Gmail Handlers ---
    
    const handleGoogleConnect = () => tokenClient?.requestAccessToken({ prompt: '' });
    const handleGoogleDisconnect = () => {
        googleAuth.revokeToken();
        setIsGoogleConnected(false);
        setGoogleUser(null);
    };

    const handleScanReplies = async () => {
        setIsGmailScannerOpen(true);
        setIsModalLoading(true);
        setGmailAnalysisJobId(null);
        try {
            const emails = await gmailService.listMessages(25);
            setGmailEmails(emails);
        } catch (error: any) {
            showStatus(AppStatus.Error, error.message);
            setGmailEmails([]);
        } finally {
            setIsModalLoading(false);
        }
    };

    const handleAnalyzeGmailReply = async (emailText: string) => {
        if (!activeProfile) return;
        setGmailAnalysisJobId('loading');
        try {
            const trackedJobs = jobs.filter(j => ['tracking', 'interview'].includes(j.kanbanStatus));
            const result = await geminiService.findJobReplyInEmails([{ body: emailText, from: '', subject: '' }], trackedJobs);

            if (result) {
                await firestoreService.updateJob(result.jobToUpdate.id, { kanbanStatus: result.newStatus });
                setGmailAnalysisJobId(result.jobToUpdate.id);
                 showStatus(AppStatus.Success, `Статус для "${result.jobToUpdate.title}" обновлен!`);
            } else {
                setGmailAnalysisJobId('not_found');
            }
        } catch (error: any) {
            showStatus(AppStatus.Error, error.message);
            setGmailAnalysisJobId(null);
        }
    };
    
    const handleQuickApplyEmail = async (job: Job) => {
        if (!googleUser?.email || !job.contacts?.email || !activeProfile) return;
        setIsModalLoading(true);
        try {
            const letter = await geminiService.generateCoverLetter(job, activeProfile);
            await gmailService.sendEmail({
                to: job.contacts.email,
                from: googleUser.email,
                fromName: googleUser.name,
                subject: `Отклик на вакансию: ${job.title}`,
                body: `${letter}\n\n---Резюме---\n${activeProfile.resume}`,
            });
            showStatus(AppStatus.Success, `Письмо на вакансию "${job.title}" успешно отправлено!`);
        } catch (error: any) {
            showStatus(AppStatus.Error, `Не удалось отправить письмо: ${error.message}`);
        } finally {
            setIsModalLoading(false);
        }
    };

    // --- Render Logic ---
    
    if (isConfigChecked && (!isFirebaseOk || !isGoogleOk)) {
        return <ConfigurationError isFirebaseOk={isFirebaseOk} isGoogleOk={isGoogleOk} />;
    }

    const closeModal = () => {
        setAdaptingJob(null);
        setGeneratingEmailJob(null);
        setPreparingInterviewJob(null);
        setComparingJobs([]);
        setModalContent('');
        setIsModalLoading(false);
    };

    const renderModal = () => {
        const job = adaptingJob || generatingEmailJob || preparingInterviewJob;
        if (job) {
            let title = '';
            if (adaptingJob) title = `Резюме для "${job.title}"`;
            if (generatingEmailJob) title = `Сопроводительное письмо для "${job.title}"`;
            if (preparingInterviewJob) title = `Подготовка к интервью для "${job.title}"`;

            return (
                <Modal title={title} onClose={closeModal} isLoading={isModalLoading}>
                    <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap">
                        {modalContent}
                    </div>
                </Modal>
            );
        }
        if (comparingJobs.length > 0) {
            return isModalLoading ? (
                 <Modal title="Сравнение вакансий" onClose={closeModal} isLoading={true}><div/></Modal>
            ) : (
                <JobComparisonModal jobs={comparingJobs} onClose={closeModal} />
            )
        }
        return null;
    };


    return (
        <AuthGuard user={user} loading={authLoading}>
            <div className={`flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans`}>
                <Sidebar
                    theme={theme}
                    setTheme={setTheme}
                    user={user}
                    onLogout={() => auth.signOut()}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    profiles={profiles}
                    activeProfile={activeProfile}
                    onSwitchProfile={(id) => setActiveProfile(profiles.find(p => p.id === id) || null)}
                />

                <main className="flex-1 flex flex-col p-6 overflow-y-auto">
                    {user && !authLoading && profiles.length === 0 && (
                        <SetupWizardModal onFinish={handleFinishWizard} />
                    )}

                    {activeProfile ? (
                        <>
                            <MainHeader onSearch={handleSearch} status={status} />
                            {statusMessage && <StatusBar status={status} message={statusMessage} />}
                            
                            <div className="space-y-8">
                                <ScanResults
                                    jobs={scannedJobs}
                                    onSaveJobs={handleSaveJobs}
                                    onDismissJob={handleDismissScannedJob}
                                    onViewDetails={setViewingJob}
                                    onCompareJobs={handleCompareJobs}
                                />
                                <ApplicationTracker
                                    jobs={jobs}
                                    profiles={profiles}
                                    onUpdateJobStatus={handleUpdateJobStatus}
                                    onViewDetails={setViewingJob}
                                    onAdaptResume={handleAdaptResume}
                                    onGenerateEmail={handleGenerateEmail}
                                    onQuickApplyEmail={handleQuickApplyEmail}
                                    isGoogleConnected={isGoogleConnected}
                                    isGapiReady={isGapiReady}
                                    onScanReplies={handleScanReplies}
                                    onRefreshStatuses={() => showStatus(AppStatus.Idle, "Функция в разработке")}
                                    onCompareJobs={handleCompareJobs}
                                />
                            </div>
                        </>
                    ) : (
                        !authLoading && profiles.length > 0 && (
                           <div className="text-center p-8 m-auto bg-white dark:bg-slate-800 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold">Профиль не выбран</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">
                                    Выберите профиль в боковой панели, чтобы начать работу.
                                </p>
                           </div>
                        )
                    )}
                </main>

                {/* Modals */}
                {isSettingsOpen && activeProfile && (
                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        profiles={profiles}
                        activeProfile={activeProfile}
                        onUpdateProfile={handleUpdateProfile}
                        onAddProfile={handleAddProfile}
                        onSwitchProfile={(id) => setActiveProfile(profiles.find(p => p.id === id) || null)}
                        onDeleteProfile={handleDeleteProfile}
                        isGoogleConnected={isGoogleConnected}
                        googleUser={googleUser}
                        onGoogleConnect={handleGoogleConnect}
                        onGoogleDisconnect={handleGoogleDisconnect}
                    />
                )}
                
                {viewingJob && activeProfile && (
                    <JobDetailModal
                        job={viewingJob}
                        onClose={() => setViewingJob(null)}
                        onUpdateJob={firestoreService.updateJob}
                        onAdaptResume={handleAdaptResume}
                        onGenerateEmail={handleGenerateEmail}
                        onPrepareForInterview={handlePrepareForInterview}
                        onAnalyzeResponse={handleAnalyzeResponse}
                        onQuickApplyEmail={handleQuickApplyEmail}
                        onQuickApplyWhatsapp={async () => showStatus(AppStatus.Idle, "Функция в разработке")}
                        onQuickApplyTelegram={async () => showStatus(AppStatus.Idle, "Функция в разработке")}
                        isGoogleConnected={isGoogleConnected}
                        isGapiReady={isGapiReady}
                    />
                )}
                
                {analyzingResponseJob && (
                    <HrAnalysisModal
                        job={analyzingResponseJob}
                        onClose={() => setAnalyzingResponseJob(null)}
                        onAnalyze={executeResponseAnalysis}
                    />
                )}

                {isGmailScannerOpen && (
                    <GmailScannerModal
                        emails={gmailEmails}
                        jobs={jobs}
                        analysisJobId={gmailAnalysisJobId}
                        isLoading={isModalLoading}
                        onClose={() => setIsGmailScannerOpen(false)}
                        onAnalyzeReply={handleAnalyzeGmailReply}
                    />
                )}

                {renderModal()}
            </div>
        </AuthGuard>
    );
};

export default App;
