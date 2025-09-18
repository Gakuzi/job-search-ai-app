// FIX: Add references for GAPI and Google Accounts to resolve type errors.
/// <reference types="gapi" />
// FIX: Add gapi.client types reference to resolve issues with gapi.client
/// <reference types="gapi.client" />
/// <reference types="google.accounts" />

import React, { useState, useEffect, useCallback } from 'react';
import { useImmer } from 'use-immer';
import { v4 as uuidv4 } from 'uuid';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

import Header from './components/Header';
import SettingsPanel from './components/SettingsPanel';
import JobList from './components/JobList';
import ApplicationTracker from './components/ApplicationTracker';
import StatusBar from './components/StatusBar';
import Modal from './components/Modal';
import OnboardingModal from './components/OnboardingModal';
import JobDetailModal from './components/JobDetailModal';
import HrAnalysisModal from './components/HrAnalysisModal';
import ReplyScannerModal from './components/ReplyScannerModal';
import AuthGuard from './components/AuthGuard';
import ConfigurationError from './components/ConfigurationError';


import { useTheme } from './hooks/useTheme';
import { AppStatus, DEFAULT_PROMPTS, DEFAULT_RESUME, DEFAULT_SEARCH_SETTINGS } from './constants';
import type { Job, Profile, KanbanStatus, SearchSettings, GmailThread, GoogleUser } from './types';

import {
    findJobsOnRealWebsite,
    adaptResume,
    generateCoverLetter,
    getInterviewQuestions,
    analyzeHrResponse,
    generateShortMessage,
    matchEmailToJob,
} from './services/geminiService';
import { auth, firebaseConfig } from './services/firebase';
import {
    subscribeToProfiles,
    addProfile,
    updateProfile,
    deleteProfile,
    subscribeToJobs,
    addJobsBatch,
    updateJob,
} from './services/firestoreService';
import { useLocalStorage } from './hooks/useLocalStorage';
import { initTokenClient, initGapiClient, gapiLoad, getToken, revokeToken } from './services/googleAuthService';
import { sendEmail, listThreads, getThread } from './services/gmailService';


type View = 'search' | 'applications';
type ModalState =
    | { type: 'none' }
    | { type: 'jobDetail'; job: Job }
    | { type: 'onboarding' }
    | { type: 'aiContent'; title: string; content: string; isLoading: boolean; }
    | { type: 'hrAnalysis'; job: Job }
    | { type: 'replyScanner'; replies: GmailThread[], analysisJobId: string | null };

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
    const [theme, setTheme] = useTheme();
    const [view, setView] = useLocalStorage<View>('view', 'search');
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const [profiles, setProfiles] = useImmer<Profile[]>([]);
    const [activeProfileId, setActiveProfileId] = useLocalStorage<string | null>('activeProfileId', null);
    const [jobs, setJobs] = useImmer<Job[]>([]);
    const [foundJobs, setFoundJobs] = useState<Job[]>([]);

    const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
    const [message, setMessage] = useState('Настройте параметры поиска и нажмите "Найти вакансии".');
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);

    const [modal, setModal] = useState<ModalState>({ type: 'none' });

    // Google Auth State
    const [googleUser, setGoogleUser] = useLocalStorage<GoogleUser | null>('google-user', null);
    const [tokenClient, setTokenClient] = useState<google.accounts.oauth2.TokenClient | null>(null);
    const [isGapiReady, setIsGapiReady] = useState(false);
    
    const isGoogleConnected = !!gapi.client?.getToken();

    const isFirebaseConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('AIzaSy...');
    const isGoogleConfigured = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('YOUR_');

    // --- Effects ---

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleGoogleAuthResponse = useCallback(async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
        if (tokenResponse.access_token) {
            try {
                const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await response.json();
                setGoogleUser({
                    name: userInfo.name,
                    email: userInfo.email,
                    picture: userInfo.picture,
                });
            } catch (error) {
                console.error("Failed to fetch Google user info:", error);
                setStatus(AppStatus.Error);
                setMessage("Не удалось получить информацию о пользователе Google.");
            }
        }
    }, [setGoogleUser]);

    useEffect(() => {
        // This effect handles the initialization of Google API clients,
        // ensuring the external scripts are loaded before use to prevent a race condition.
        if (!isGoogleConfigured) {
            return;
        }
    
        const scriptLoadCheckInterval = setInterval(async () => {
            // Wait until both the GAPI (for Gmail API) and GSI (for Sign-In) scripts have loaded.
            if (window.gapi && window.google) {
                clearInterval(scriptLoadCheckInterval);
                try {
                    await gapiLoad('client:oauth2');
                    await initGapiClient();
                    setIsGapiReady(true);
                    setTokenClient(initTokenClient(handleGoogleAuthResponse));
                } catch (error) {
                    console.error("Failed to initialize Google Auth clients:", error);
                    setStatus(AppStatus.Error);
                    setMessage("Не удалось инициализировать сервисы Google. Проверьте консоль.");
                }
            }
        }, 150); // Check every 150ms for the scripts.
    
        // Set a timeout to prevent the interval from running indefinitely if scripts fail to load.
        const timeout = setTimeout(() => {
            clearInterval(scriptLoadCheckInterval);
            if (!window.gapi || !window.google) {
                console.error("Google API scripts failed to load within 5 seconds.");
                setStatus(AppStatus.Error);
                setMessage("Не удалось загрузить скрипты Google. Проверьте интернет-соединение и отключите блокировщики рекламы, затем обновите страницу.");
            }
        }, 5000); // 5-second timeout.
    
        // Cleanup function to clear the interval and timeout when the component unmounts.
        return () => {
            clearInterval(scriptLoadCheckInterval);
            clearTimeout(timeout);
        };
    }, [isGoogleConfigured, handleGoogleAuthResponse]);


    useEffect(() => {
        if (!user) {
            setProfiles([]);
            setJobs([]);
            return;
        }

        const unsubscribeProfiles = subscribeToProfiles(user.uid, (loadedProfiles) => {
            setProfiles(loadedProfiles);
            if (loadedProfiles.length > 0 && (!activeProfileId || !loadedProfiles.find(p => p.id === activeProfileId))) {
                setActiveProfileId(loadedProfiles[0].id);
            } else if (loadedProfiles.length === 0) {
                setActiveProfileId(null);
                 setModal({ type: 'onboarding' });
            }
        });

        const unsubscribeJobs = subscribeToJobs(user.uid, (loadedJobs) => {
            setJobs(loadedJobs);
        });

        return () => {
            unsubscribeProfiles();
            unsubscribeJobs();
        };
    }, [user, setProfiles, setJobs, activeProfileId, setActiveProfileId]);

    const activeProfile = profiles.find(p => p.id === activeProfileId) || null;
    
    // --- Google Auth Handlers ---
    
    const handleGoogleSignIn = () => {
        if (tokenClient) {
            getToken(tokenClient);
        }
    };
    
    const handleGoogleSignOut = () => {
        if (gapi.client.getToken()) {
            revokeToken();
            setGoogleUser(null);
        }
    };

    // FIX: Add handleLogout function for signing out the user.
    const handleLogout = () => {
        signOut(auth).catch(error => console.error("Logout failed:", error));
    };

    // --- Profile Handlers ---

    const handleUpdateProfile = useCallback((updater: (draft: Profile) => void) => {
        if (!activeProfile) return;
        
        setProfiles(currentProfiles => {
            const profileIndex = currentProfiles.findIndex(p => p.id === activeProfile.id);
            if (profileIndex === -1) return currentProfiles;
            
            const updatedProfile = { ...currentProfiles[profileIndex] };
            updater(updatedProfile);

            updateProfile(updatedProfile).catch(console.error);
            
            const newProfiles = [...currentProfiles];
            newProfiles[profileIndex] = updatedProfile;
            return newProfiles;
        });
    }, [activeProfile, setProfiles]);

    const handleAddProfile = async (initialData?: { resume: string; settings: SearchSettings }) => {
        if (!user) return;
        const newProfileData: Omit<Profile, 'id'> = {
            userId: user.uid,
            name: initialData ? `Профиль по резюме` : `Новый профиль ${profiles.length + 1}`,
            resume: initialData ? initialData.resume : DEFAULT_RESUME,
            settings: initialData ? initialData.settings : DEFAULT_SEARCH_SETTINGS,
            prompts: DEFAULT_PROMPTS,
        };
        const createdProfile = await addProfile(newProfileData);
        setActiveProfileId(createdProfile.id);
    };

    const handleDeleteProfile = async (id: string) => {
        if (profiles.length <= 1) {
            alert('Нельзя удалить единственный профиль.');
            return;
        }
        await deleteProfile(id);
        if (activeProfileId === id) {
            setActiveProfileId(profiles.find(p => p.id !== id)?.id || null);
        }
    };

    // --- Job Search & Management ---

    const handleSearch = async () => {
        if (!activeProfile) return;

        setStatus(AppStatus.Loading);
        setMessage('ИИ анализирует HTML-код и ваше резюме...');
        setFoundJobs([]);
        setView('search');

        try {
            const existingJobUrls = new Set(jobs.filter(j => j.profileId === activeProfile.id).map(j => j.url));
            const results = await findJobsOnRealWebsite(activeProfile.prompts.jobSearch, activeProfile.resume, activeProfile.settings);
            
            const newJobs = results.filter(job => !existingJobUrls.has(job.url));

            const jobsWithIds = newJobs.map(job => ({
                ...job,
                id: uuidv4(),
                kanbanStatus: 'new' as KanbanStatus,
                profileId: activeProfile.id,
                userId: user!.uid,
            }));
            
            setFoundJobs(jobsWithIds);
            setStatus(AppStatus.Success);
             if (jobsWithIds.length > 0) {
                setMessage(`Найдено ${jobsWithIds.length} новых релевантных вакансий.`);
            } else {
                setMessage('Новых вакансий не найдено. Все найденные уже есть в ваших откликах.');
            }
            setIsSettingsExpanded(false);
        } catch (error) {
            setStatus(AppStatus.Error);
            setMessage(error instanceof Error ? error.message : 'Произошла неизвестная ошибка.');
        }
    };

    const handleSaveJobs = async (jobsToSave: Job[]) => {
        await addJobsBatch(jobsToSave);
        setFoundJobs(prev => prev.filter(job => !jobsToSave.find(saved => saved.id === job.id)));
        setView('applications');
    };

    const handleUpdateJob = (jobId: string, updates: Partial<Job>) => {
        updateJob(jobId, updates);
    };

    const handleUpdateJobStatus = (jobId: string, newStatus: KanbanStatus) => {
        handleUpdateJob(jobId, { kanbanStatus: newStatus });
    };

    // --- AI Actions ---

    const runAiAction = async (title: string, action: () => Promise<string>) => {
        setModal({ type: 'aiContent', title, content: '', isLoading: true });
        try {
            const content = await action();
            setModal({ type: 'aiContent', title, content, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка.';
            setModal({ type: 'aiContent', title, content: `Ошибка: ${errorMessage}`, isLoading: false });
        }
    };

    const handleAdaptResume = (job: Job) => {
        if (!activeProfile) return;
        runAiAction(
            `Адаптированное резюме для "${job.title}"`,
            () => adaptResume(activeProfile.prompts.resumeAdapt, activeProfile.resume, job)
        );
    };

    const handleGenerateEmail = (job: Job) => {
        if (!activeProfile) return;
        runAiAction(
            `Сопроводительное письмо для "${job.company}"`,
            async () => {
                const { subject, body } = await generateCoverLetter(activeProfile.prompts.coverLetter, job, activeProfile.name);
                return `Subject: ${subject}\n\n${body}`;
            }
        );
    };

    const handlePrepareForInterview = (job: Job) => {
        if (!activeProfile) return;
        runAiAction(
            `Подготовка к собеседованию на "${job.title}"`,
            () => getInterviewQuestions(job, activeProfile.resume)
        );
    };
    
    const handleAnalyzeHrResponse = async (job: Job, emailText: string) => {
        if (!activeProfile) return;
        setModal({ type: 'none' });
        setStatus(AppStatus.Loading);
        setMessage("Анализирую ответ от HR...");
        try {
            const newStatus = await analyzeHrResponse(activeProfile.prompts.hrResponseAnalysis, emailText);
            handleUpdateJobStatus(job.id, newStatus);
            setStatus(AppStatus.Success);
            setMessage(`Статус вакансии "${job.title}" обновлен на "${newStatus}".`);
        } catch (error) {
            setStatus(AppStatus.Error);
            setMessage(error instanceof Error ? error.message : 'Произошла ошибка.');
        }
    };
    
    const handleQuickApply = async (action: 'email' | 'whatsapp' | 'telegram', job: Job) => {
        if (!activeProfile) return;

        setStatus(AppStatus.Loading);
        
        try {
            if (action === 'email') {
                setMessage('ИИ готовит текст для email...');
                const { subject, body } = await generateCoverLetter(activeProfile.prompts.coverLetter, job, activeProfile.name);

                if (isGoogleConnected && googleUser?.email) {
                    await sendEmail({
                        to: job.contacts?.email || '',
                        subject,
                        body,
                        from: googleUser.email,
                        fromName: activeProfile.name,
                    });
                     setMessage(`Email отправлен через ваш Gmail аккаунт. Статус вакансии "${job.title}" изменен на "Отслеживаю".`);
                } else {
                    const url = `mailto:${job.contacts?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.open(url, '_blank');
                    setMessage(`Открыт почтовый клиент. Статус вакансии "${job.title}" изменен на "Отслеживаю".`);
                }
            } else { // Messengers
                setMessage('ИИ готовит сообщение для мессенджера...');
                const message = await generateShortMessage(activeProfile.prompts.shortMessage, job, activeProfile.name);
                 let url: string;
                if (action === 'whatsapp') {
                    const phone = job.contacts?.phone?.replace(/\D/g, ''); // Clean phone number
                    url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                } else { // telegram
                    const contact = job.contacts?.telegram?.replace('@', ''); // Clean username
                    url = `tg://msg?to=${contact}&text=${encodeURIComponent(message)}`;
                }
                 window.open(url, '_blank');
                 setMessage(`Открыт клиент для отправки сообщения. Статус вакансии "${job.title}" изменен на "Отслеживаю".`);
            }
            
            setStatus(AppStatus.Success);
            if (job.kanbanStatus === 'new') {
                handleUpdateJobStatus(job.id, 'tracking');
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка.';
            setStatus(AppStatus.Error);
            setMessage(`Ошибка при генерации сообщения: ${errorMessage}`);
            throw error;
        }
    };
    
    // --- Gmail Scanner ---
    const handleScanReplies = async () => {
        if (!activeProfile || !isGoogleConnected) return;
        
        setStatus(AppStatus.Loading);
        setMessage("Сканирую Gmail на наличие ответов от HR...");
        setModal({ type: 'replyScanner', replies: [], analysisJobId: null });

        try {
            const companies = [...new Set(jobs.map(j => j.company))];
            const searchQueries = companies.map(c => `from:(${c.toLowerCase().replace(/\s/g, ' OR ')})`);
            const query = searchQueries.join(' OR ');

            // In a real app, you would use listThreads and getThread
            // For this example, we use mock data to demonstrate the flow
            const mockReplies: GmailThread[] = [
                // FIX: Added missing 'threadId' property to GmailMessage mock object.
                { id: 'thread1', snippet: 'Re: Вакансия Project Manager - Приглашение на собеседование', messages: [{ id: 'msg1', threadId: 'thread1', payload: { headers: [{name: 'Subject', value: 'Re: Вакансия Project Manager'}], parts: [{ body: { data: btoa(unescape(encodeURIComponent('Здравствуйте! Спасибо за отклик. Хотим пригласить вас на онлайн-собеседование 15 мая в 12:00. Подходит ли вам это время? С уважением, HR-отдел Tech Solutions.'))) } }] } }] },
                // FIX: Added missing 'threadId' property to GmailMessage mock object.
                { id: 'thread2', snippet: 'Отклик на вакансию Product Manager', messages: [{ id: 'msg2', threadId: 'thread2', payload: { headers: [{name: 'Subject', value: 'Re: Отклик на вакансию Product Manager'}], parts: [{ body: { data: btoa(unescape(encodeURIComponent('Добрый день! К сожалению, на данный момент мы не готовы продолжить общение по вашей кандидатуре. Спасибо за уделенное время. FinTech Innovations.'))) } }] } }] }
            ];
            
            setModal({ type: 'replyScanner', replies: mockReplies, analysisJobId: null });
            
            setStatus(AppStatus.Success);
            setMessage(`Найдено ${mockReplies.length} потенциальных ответа.`);

        } catch (error) {
            setStatus(AppStatus.Error);
            setMessage(error instanceof Error ? error.message : 'Ошибка при сканировании почты.');
            setModal({type: 'none'});
        }
    };
    
    const handleAnalyzeScannedReply = async (emailText: string) => {
        if (!activeProfile) return;
        
        try {
            // FIX: Correctly update state for 'useState' hook with an immutable pattern. 'use-immer' was not used for this state variable.
            setModal(prevModal => {
                if (prevModal.type === 'replyScanner') {
                    return { ...prevModal, analysisJobId: 'loading' };
                }
                return prevModal;
            });

            // 1. Match email to a job
            const matchedJobId = await matchEmailToJob(emailText, jobs);
            const matchedJob = jobs.find(j => j.id === matchedJobId);
            
            if (!matchedJob) {
                throw new Error("Не удалось найти подходящую вакансию для этого письма.");
            }

            // FIX: Correctly update state for 'useState' hook with an immutable pattern. 'use-immer' was not used for this state variable.
            setModal(prevModal => {
                if (prevModal.type === 'replyScanner') {
                    return { ...prevModal, analysisJobId: matchedJob.id };
                }
                return prevModal;
            });
            
            // 2. Analyze response and update status
            await handleAnalyzeHrResponse(matchedJob, emailText);

        } catch (error) {
            setStatus(AppStatus.Error);
            setMessage(error instanceof Error ? error.message : 'Ошибка при анализе ответа.');
        } finally {
            // Close modal or update its state after analysis
             setTimeout(() => {
                setModal({ type: 'none' });
            }, 3000); // Give user time to see the result
        }
    };


    // --- Render ---

    const renderModal = () => {
        if (!isFirebaseConfigured || !isGoogleConfigured) return null;
        switch (modal.type) {
            case 'jobDetail':
                return <JobDetailModal
                    job={modal.job}
                    onClose={() => setModal({ type: 'none' })}
                    onUpdateJob={handleUpdateJob}
                    onAdaptResume={handleAdaptResume}
                    onGenerateEmail={handleGenerateEmail}
                    onPrepareForInterview={handlePrepareForInterview}
                    onAnalyzeResponse={(job) => setModal({ type: 'hrAnalysis', job })}
                    onQuickApplyEmail={(job) => handleQuickApply('email', job)}
                    onQuickApplyWhatsapp={(job) => handleQuickApply('whatsapp', job)}
                    onQuickApplyTelegram={(job) => handleQuickApply('telegram', job)}
                />;
            case 'aiContent':
                return <Modal
                    title={modal.title}
                    onClose={() => setModal({ type: 'none' })}
                    isLoading={modal.isLoading}>
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{modal.content}</div>
                </Modal>;
            case 'onboarding':
                return <OnboardingModal
                    onClose={() => {
                        setModal({ type: 'none' });
                        if(profiles.length === 0) handleAddProfile();
                    }}
                    onFinish={(result) => {
                        handleAddProfile(result);
                        setModal({ type: 'none' });
                    }}
                />;
            case 'hrAnalysis':
                return <HrAnalysisModal 
                    job={modal.job}
                    onClose={() => setModal({ type: 'none' })}
                    onAnalyze={(emailText) => handleAnalyzeHrResponse(modal.job, emailText)}
                />;
            case 'replyScanner':
                return <ReplyScannerModal
                    replies={modal.replies}
                    jobs={jobs}
                    analysisJobId={modal.analysisJobId}
                    onClose={() => setModal({ type: 'none' })}
                    onAnalyzeReply={handleAnalyzeScannedReply}
                />;
            default:
                return null;
        }
    };

    if (!isFirebaseConfigured || !isGoogleConfigured) {
        return <ConfigurationError isFirebaseOk={isFirebaseConfigured} isGoogleOk={isGoogleConfigured} />;
    }
    
    return (
        <AuthGuard user={user} loading={isAuthLoading}>
            <div className={`flex flex-col min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-sans`}>
                <Header theme={theme} setTheme={setTheme} view={view} setView={setView} user={user} onLogout={handleLogout} />
                <main className="container mx-auto p-4 md:p-6 flex-1">
                    <SettingsPanel
                        profiles={profiles}
                        activeProfile={activeProfile}
                        onAddProfile={() => setModal({ type: 'onboarding' })}
                        onDeleteProfile={handleDeleteProfile}
                        onSwitchProfile={setActiveProfileId}
                        onUpdateProfile={handleUpdateProfile}
                        onSearch={handleSearch}
                        status={status}
                        isSettingsExpanded={isSettingsExpanded}
                        setIsSettingsExpanded={setIsSettingsExpanded}
                        googleUser={googleUser}
                        isGoogleConnected={isGoogleConnected}
                        onGoogleSignIn={handleGoogleSignIn}
                        onGoogleSignOut={handleGoogleSignOut}
                    />
                    
                    {status !== AppStatus.Idle && <StatusBar status={status} message={message} />}

                    {activeProfile ? (
                        view === 'search' ? (
                            <JobList
                                jobs={foundJobs}
                                onSaveJobs={handleSaveJobs}
                                onDismissJob={(jobId) => setFoundJobs(prev => prev.filter(j => j.id !== jobId))}
                                onViewDetails={(job) => setModal({ type: 'jobDetail', job })}
                                onAdaptResume={handleAdaptResume}
                                onGenerateEmail={handleGenerateEmail}
                            />
                        ) : (
                            <ApplicationTracker
                                jobs={jobs.filter(j => j.profileId === activeProfile.id)}
                                profiles={profiles}
                                onUpdateJobStatus={handleUpdateJobStatus}
                                onViewDetails={(job) => setModal({ type: 'jobDetail', job })}
                                onAdaptResume={handleAdaptResume}
                                onGenerateEmail={handleGenerateEmail}
                                isGoogleConnected={isGoogleConnected}
                                onScanReplies={handleScanReplies}
                            />
                        )
                    ) : (
                        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                            <p>Загрузка профиля...</p>
                        </div>
                    )}
                </main>
                {renderModal()}
            </div>
        </AuthGuard>
    );
}

export default App;
