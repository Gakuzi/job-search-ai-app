import React, { useState, useEffect, useCallback } from 'react';
import { useImmer } from 'use-immer';
import { v4 as uuidv4 } from 'uuid';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

import Header from './components/Header';
import ScanResults from './components/ScanResults';
import ApplicationTracker from './components/ApplicationTracker';
import StatusBar from './components/StatusBar';
import Modal from './components/Modal';
import SetupWizardModal from './components/SetupWizardModal';
import JobDetailModal from './components/JobDetailModal';
import HrAnalysisModal from './components/HrAnalysisModal';
import GmailScannerModal from './components/GmailScannerModal';
import AuthGuard from './components/AuthGuard';
import ConfigurationError from './components/ConfigurationError';
import SettingsModal from './components/SettingsModal';
import { SparklesIcon } from './components/icons/SparklesIcon';


import { useTheme } from './hooks/useTheme';
import { AppStatus, DEFAULT_PROMPTS, DEFAULT_RESUME, DEFAULT_SEARCH_SETTINGS } from './constants';
import { kanbanStatusMap } from './types';
import type { Job, Profile, KanbanStatus, SearchSettings, GoogleUser, Email, Interaction } from './types';

import {
    findJobsOnRealWebsite,
    adaptResume,
    generateCoverLetter,
    getInterviewQuestions,
    analyzeHrResponse,
    generateShortMessage,
    matchEmailToJob,
    suggestPlatforms
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
import { initTokenClient, initGapiClient, gapiLoad, revokeToken } from './services/googleAuthService';
import { sendEmail, listMessages } from './services/gmailService';

// FIX: Add global declarations for Google APIs to resolve type errors when @types are not available.
declare const gapi: any;
declare const google: any;

type View = 'scanResults' | 'applications';
type ModalState =
    | { type: 'none' }
    | { type: 'jobDetail'; job: Job }
    | { type: 'setupWizard' }
    | { type: 'aiContent'; title: string; content: string; isLoading: boolean; }
    | { type: 'hrAnalysis'; job: Job }
    | { type: 'gmailScanner'; emails: Email[], analysisJobId: string | null, isLoading: boolean };

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
    const [theme, setTheme] = useTheme();
    const [view, setView] = useLocalStorage<View>('view', 'applications');
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const [profiles, setProfiles] = useImmer<Profile[]>([]);
    const [activeProfileId, setActiveProfileId] = useLocalStorage<string | null>('activeProfileId', null);
    const [jobs, setJobs] = useImmer<Job[]>([]);
    const [foundJobs, setFoundJobs] = useState<Job[]>([]);

    const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
    const [message, setMessage] = useState('Настройте параметры поиска и нажмите "Найти вакансии".');
    
    const [modal, setModal] = useImmer<ModalState>({ type: 'none' });
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    
    const initialGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const [apiKeys, setApiKeys] = useLocalStorage<string[]>('gemini-api-keys', initialGeminiKey ? [initialGeminiKey] : []);
    const [activeApiKeyIndex, setActiveApiKeyIndex] = useLocalStorage<number>('active-api-key-index', 0);


    // Google Auth State
    const [googleUser, setGoogleUser] = useLocalStorage<GoogleUser | null>('google-user', null);
    const [googleToken, setGoogleToken] = useLocalStorage<any | null>('google-token', null);
    const [tokenClient, setTokenClient] = useState<any | null>(null);
    const [isGapiReady, setIsGapiReady] = useState(false);
    
    const isGoogleConnected = !!googleToken;

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

    const handleGoogleAuthResponse = useCallback(async (tokenResponse: any) => {
        if (tokenResponse.error) {
            console.error('Google Auth Error:', tokenResponse);
            setMessage(`Ошибка аутентификации Google: ${tokenResponse.error_description || tokenResponse.error}`);
            setStatus(AppStatus.Error);
            setGoogleToken(null);
            setGoogleUser(null);
            return;
        }

        if (tokenResponse.access_token) {
            gapi.client.setToken({ access_token: tokenResponse.access_token });
            setGoogleToken(tokenResponse);
            try {
                const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch user info, status: ${response.status}`);
                }
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
                setGoogleToken(null);
                setGoogleUser(null);
                gapi.client.setToken(null);
            }
        }
    }, [setGoogleUser, setGoogleToken]);

    useEffect(() => {
        if (!isGoogleConfigured) return;
    
        const scriptLoadCheckInterval = setInterval(() => {
            if (window.gapi && window.google) {
                clearInterval(scriptLoadCheckInterval);
                try {
                    const client = initTokenClient(handleGoogleAuthResponse);
                    setTokenClient(client);
                    
                    gapiLoad('client').then(() => {
                        initGapiClient().then(() => {
                           setIsGapiReady(true);
                        }).catch(gapiInitError => {
                            console.error("Failed to initialize GAPI client:", gapiInitError);
                            setStatus(AppStatus.Error);
                            setMessage("Не удалось загрузить Gmail API. Функции почты могут не работать.");
                        });
                    }).catch(gapiLoadError => {
                        console.error("Failed to load GAPI client library:", gapiLoadError);
                        setStatus(AppStatus.Error);
                        setMessage("Не удалось загрузить библиотеку Google. Функции почты могут не работать.");
                    });

                } catch (error) {
                    console.error("Failed to initialize Google Auth clients:", error);
                    setStatus(AppStatus.Error);
                    setMessage("Не удалось инициализировать сервисы Google. Проверьте консоль.");
                }
            }
        }, 150);
    
        const timeout = setTimeout(() => {
            clearInterval(scriptLoadCheckInterval);
            if (!window.gapi || !window.google) {
                console.error("Google API scripts failed to load within 5 seconds.");
                setStatus(AppStatus.Error);
                setMessage("Не удалось загрузить скрипты Google. Проверьте интернет-соединение и отключите блокировщики рекламы, затем обновите страницу.");
            }
        }, 5000);
    
        return () => {
            clearInterval(scriptLoadCheckInterval);
            clearTimeout(timeout);
        };
    }, [isGoogleConfigured, handleGoogleAuthResponse]);

    useEffect(() => {
        if (isGapiReady && googleToken) {
            gapi.client.setToken({ access_token: googleToken.access_token });
        }
    }, [isGapiReady, googleToken]);


    useEffect(() => {
        if (!user) {
            setProfiles([]);
            setJobs([]);
            return;
        }

        const unsubscribeProfiles = subscribeToProfiles(user.uid, (loadedProfiles) => {
            setProfiles(loadedProfiles);

            if (loadedProfiles.length === 0) {
                setActiveProfileId(null);
                setModal({ type: 'setupWizard' });
            } else {
                let currentActiveProfile = loadedProfiles.find(p => p.id === activeProfileId);

                if (!currentActiveProfile) {
                    currentActiveProfile = loadedProfiles[0];
                    setActiveProfileId(currentActiveProfile.id);
                }
                
                if (currentActiveProfile && currentActiveProfile.resume.trim() === DEFAULT_RESUME.trim()) {
                    setModal({ type: 'setupWizard' });
                }
            }
        });

        const unsubscribeJobs = subscribeToJobs(user.uid, (loadedJobs) => {
            setJobs(loadedJobs);
        });

        return () => {
            unsubscribeProfiles();
            unsubscribeJobs();
        };
    }, [user, setProfiles, setJobs, activeProfileId, setActiveProfileId, setModal]);

    const activeProfile = profiles.find(p => p.id === activeProfileId) || null;
    
    // --- Google Auth Handlers ---
    
    const handleGoogleSignIn = () => {
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'select_account' });
        } else {
            console.error("Google Token Client is not initialized yet.");
            setStatus(AppStatus.Error);
            setMessage("Клиент Google еще не готов. Пожалуйста, подождите несколько секунд и попробуйте снова.");
        }
    };
    
    const handleGoogleSignOut = () => {
        if (googleToken) {
            revokeToken();
            setGoogleUser(null);
            setGoogleToken(null);
        }
    };

    const handleLogout = () => {
        signOut(auth).catch(error => console.error("Logout failed:", error));
    };

    // --- Profile Handlers ---

    const handleUpdateProfile = useCallback((updater: (draft: Profile) => void) => {
        if (!activeProfile) return;
        
        const updatedProfile = { ...activeProfile };
        updater(updatedProfile);
        updateProfile(updatedProfile).catch(console.error);
        
        setProfiles(draft => {
            const index = draft.findIndex(p => p.id === activeProfile.id);
            if (index !== -1) {
                draft[index] = updatedProfile;
            }
        });
    }, [activeProfile, setProfiles]);

    const handleAddProfile = async (initialData?: { resume: string; settings: SearchSettings; profileName: string; }) => {
        if (!user) return;
        const newProfileData: Omit<Profile, 'id'> = {
            userId: user.uid,
            name: initialData ? initialData.profileName : `Новый профиль ${profiles.length + 1}`,
            resume: initialData ? initialData.resume : DEFAULT_RESUME,
            settings: initialData ? initialData.settings : DEFAULT_SEARCH_SETTINGS,
            prompts: DEFAULT_PROMPTS,
        };
        const createdProfile = await addProfile(newProfileData);
        setActiveProfileId(createdProfile.id);
    };

    const handleOpenOnboarding = () => {
        setIsSettingsModalOpen(false);
        setModal({ type: 'setupWizard' });
    }

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
        setMessage('Анализирую ваш профиль и резюме...');
        
        setFoundJobs([]);
        setView('scanResults');

        try {
            const enabledPlatforms = activeProfile.settings.platforms.filter(p => p.enabled);
            if (enabledPlatforms.length === 0) {
                setStatus(AppStatus.Error);
                setMessage("Нет активных площадок для поиска. Включите хотя бы одну в Настройках -> Платформы.");
                return;
            }

            const existingJobUrls = new Set(jobs.filter(j => j.profileId === activeProfile.id).map(j => j.url));
            let allResults: Job[] = [];
            
            for (let i = 0; i < enabledPlatforms.length; i++) {
                const platform = enabledPlatforms[i];
                setMessage(`Этап ${i + 1}/${enabledPlatforms.length}: ИИ сканирует ${platform.name}...`);
                const platformResults = await findJobsOnRealWebsite(activeProfile.prompts.jobSearch, activeProfile.resume, activeProfile.settings, platform);
                
                const newJobsFromPlatform = platformResults
                    .filter(job => !existingJobUrls.has(job.url) && !allResults.some(r => r.url === job.url))
                    .map(job => ({
                        ...job,
                        id: uuidv4(),
                        kanbanStatus: 'new' as KanbanStatus,
                        profileId: activeProfile.id,
                        userId: user!.uid,
                        history: [],
                    }));
                
                allResults = [...allResults, ...newJobsFromPlatform];
                setFoundJobs([...allResults]); // Update UI incrementally
            }

            setMessage(`Сканирование завершено. Найдено ${allResults.length} новых вакансий. ИИ проводит финальный анализ...`);
            setStatus(AppStatus.Success);
            
            if (allResults.length === 0) {
                setMessage('Новых вакансий не найдено. Попробуйте изменить параметры поиска или добавить больше площадок в настройках.');
            }

        } catch (error) {
            setStatus(AppStatus.Error);
            setMessage(error instanceof Error ? error.message : 'Произошла неизвестная ошибка.');
        }
    };

    const handleSaveScannedJobs = async (jobsToSave: Job[]) => {
        await addJobsBatch(jobsToSave);
        setFoundJobs(prev => prev.filter(job => !jobsToSave.find(saved => saved.id === job.id)));
        setView('applications');
        setStatus(AppStatus.Success);
        setMessage(`${jobsToSave.length} вакансий добавлено на доску откликов.`);
    };
    
    const handleAddInteraction = (jobId: string, type: Interaction['type'], content: string) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        const newInteraction: Interaction = {
            id: uuidv4(),
            type,
            content,
            timestamp: new Date().toISOString(),
        };
        const updatedHistory = [...(job.history || []), newInteraction];
        handleUpdateJob(jobId, { history: updatedHistory });
    };


    const handleUpdateJob = (jobId: string, updates: Partial<Job>) => {
        updateJob(jobId, updates);
    };

    const handleUpdateJobStatus = (jobId: string, newStatus: KanbanStatus) => {
        handleUpdateJob(jobId, { kanbanStatus: newStatus });
        handleAddInteraction(jobId, 'status_change', `Статус изменен на "${kanbanStatusMap[newStatus]}"`);
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
    
    const runStreamingAiAction = async (title: string, action: () => AsyncGenerator<string>) => {
        setModal({ type: 'aiContent', title, content: '', isLoading: true });
        try {
            const stream = action();
            let firstChunk = true;
            for await (const chunk of stream) {
                if (firstChunk) {
                    setModal(draft => {
                        if (draft.type === 'aiContent') {
                            draft.isLoading = false;
                            draft.content = chunk;
                        }
                    });
                    firstChunk = false;
                } else {
                    setModal(draft => {
                        if (draft.type === 'aiContent') {
                            draft.content += chunk;
                        }
                    });
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка.';
             setModal({ type: 'aiContent', title, content: `Ошибка: ${errorMessage}`, isLoading: false });
        }
    };


    const handleAdaptResume = (job: Job) => {
        if (!activeProfile) return;
        runStreamingAiAction(
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
        runStreamingAiAction(
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
            setMessage(`Статус вакансии "${job.title}" обновлен на "${kanbanStatusMap[newStatus]}".`);
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
                     setMessage(`Email отправлен через ваш Gmail аккаунт.`);
                     handleAddInteraction(job.id, 'email_sent', `Email отправлен: "${subject}"`);
                } else {
                    const url = `mailto:${job.contacts?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.open(url, '_blank');
                    setMessage(`Открыт почтовый клиент.`);
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
                 setMessage(`Открыт клиент для отправки сообщения.`);
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
    
    const handleQuickApplyFromCard = (job: Job) => {
        if (!isGoogleConnected || !isGapiReady || !job.contacts?.email) {
            const reason = !isGoogleConnected ? "Подключите Gmail" : !isGapiReady ? "API Google не готов" : "Email не указан";
            setMessage(`Невозможно отправить: ${reason}`);
            setStatus(AppStatus.Error);
            return;
        }
        handleQuickApply('email', job);
    };

    // --- Gmail Scanner ---
    const handleOpenGmailScanner = async () => {
        if (!activeProfile || !isGoogleConnected) return;
        
        setStatus(AppStatus.Loading);
        setMessage("Сканирую Gmail на наличие ответов от HR...");
        setModal({ type: 'gmailScanner', emails: [], analysisJobId: null, isLoading: true });

        try {
            const emails = await listMessages();
            setModal({ type: 'gmailScanner', emails, analysisJobId: null, isLoading: false });
            
            setStatus(AppStatus.Success);
            setMessage(`Найдено ${emails.length} последних писем.`);

        } catch (error) {
            setStatus(AppStatus.Error);
            const errorMessage = error instanceof Error ? error.message : 'Ошибка при сканировании почты.';
            setMessage(errorMessage);
            setModal({type: 'none'});
        }
    };
    
    const handleAnalyzeScannedReply = async (emailText: string) => {
        if (!activeProfile) return;
        
        try {
            setModal(prevModal => {
                if (prevModal.type === 'gmailScanner') {
                    return { ...prevModal, analysisJobId: 'loading' };
                }
                return prevModal;
            });

            const matchedJobId = await matchEmailToJob(emailText, jobs);
            const matchedJob = jobs.find(j => j.id === matchedJobId);
            
            if (!matchedJob) {
                throw new Error("Не удалось найти подходящую вакансию для этого письма.");
            }

            setModal(prevModal => {
                if (prevModal.type === 'gmailScanner') {
                    return { ...prevModal, analysisJobId: matchedJob.id };
                }
                return prevModal;
            });
            
            await handleAnalyzeHrResponse(matchedJob, emailText);

        } catch (error) {
            setStatus(AppStatus.Error);
            setMessage(error instanceof Error ? error.message : 'Ошибка при анализе ответа.');
        } finally {
             setTimeout(() => {
                setModal(prev => prev.type === 'gmailScanner' ? { ...prev, analysisJobId: null } : prev);
            }, 3000); 
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
                    isGoogleConnected={isGoogleConnected}
                    isGapiReady={isGapiReady}
                />;
            case 'aiContent':
                return <Modal
                    title={modal.title}
                    onClose={() => setModal({ type: 'none' })}
                    isLoading={modal.isLoading}>
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{modal.content}</div>
                </Modal>;
            case 'setupWizard':
                return <SetupWizardModal
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
            case 'gmailScanner':
                return <GmailScannerModal
                    emails={modal.emails}
                    jobs={jobs}
                    analysisJobId={modal.analysisJobId}
                    isLoading={modal.isLoading}
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
                <Header 
                    theme={theme} 
                    setTheme={setTheme} 
                    user={user} 
                    onLogout={handleLogout} 
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                    profiles={profiles}
                    activeProfile={activeProfile}
                    onSwitchProfile={setActiveProfileId}
                />
                <main className="container mx-auto p-4 md:p-6 flex-1">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex-1 text-center sm:text-left">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Панель управления поиском</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {activeProfile ? `Выбран профиль для поиска вакансий.` : 'Создайте или выберите профиль.'}
                            </p>
                        </div>
                         <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <button onClick={() => setView('scanResults')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'scanResults' ? 'bg-primary-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                Результаты сканирования
                            </button>
                            <button onClick={() => setView('applications')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'applications' ? 'bg-primary-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                Отклики
                            </button>
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={status === AppStatus.Loading || !activeProfile}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            {status === AppStatus.Loading ? (
                                <>
                                 <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                 Поиск...
                                </>
                            ) : (
                                <>
                                <SparklesIcon className="w-5 h-5" />
                                Найти вакансии с ИИ
                                </>
                            )}
                        </button>
                    </div>
                    
                    {status !== AppStatus.Idle && <StatusBar status={status} message={message} />}

                    {activeProfile ? (
                        view === 'scanResults' ? (
                            <ScanResults
                                jobs={foundJobs}
                                onSaveJobs={handleSaveScannedJobs}
                                onDismissJob={(jobId) => setFoundJobs(prev => prev.filter(j => j.id !== jobId))}
                                onViewDetails={(job) => setModal({ type: 'jobDetail', job })}
                            />
                        ) : (
                            <ApplicationTracker
                                jobs={jobs.filter(j => j.profileId === activeProfile.id)}
                                profiles={profiles}
                                onUpdateJobStatus={handleUpdateJobStatus}
                                onViewDetails={(job) => setModal({ type: 'jobDetail', job })}
                                onAdaptResume={handleAdaptResume}
                                onGenerateEmail={handleGenerateEmail}
                                onQuickApplyEmail={handleQuickApplyFromCard}
                                isGoogleConnected={isGoogleConnected}
                                isGapiReady={isGapiReady}
                                onScanReplies={handleOpenGmailScanner}
                            />
                        )
                    ) : (
                        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                             { modal.type !== 'setupWizard' && <p>Загрузка профиля...</p> }
                        </div>
                    )}
                </main>
                
                <SettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    profiles={profiles}
                    activeProfile={activeProfile}
                    onAddProfile={handleOpenOnboarding}
                    onDeleteProfile={handleDeleteProfile}
                    onSwitchProfile={setActiveProfileId}
                    onUpdateProfile={handleUpdateProfile}
                    googleUser={googleUser}
                    isGoogleConnected={isGoogleConnected}
                    onGoogleSignIn={handleGoogleSignIn}
                    onGoogleSignOut={handleGoogleSignOut}
                    apiKeys={apiKeys}
                    setApiKeys={setApiKeys}
                    activeApiKeyIndex={activeApiKeyIndex}
                    setActiveApiKeyIndex={setActiveApiKeyIndex}
                />
                {renderModal()}
            </div>
        </AuthGuard>
    );
}

export default App;
