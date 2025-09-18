import React, { useState, useEffect, useCallback } from 'react';
import { useImmer } from 'use-immer';
import { v4 as uuidv4 } from 'uuid';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

import Sidebar from './components/Sidebar';
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
    suggestPlatforms,
    analyzeAndRankJobs,
    checkJobStatus,
} from './services/geminiService';
import { findJobsOnAvitoAPI } from './services/avitoService';
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
import JobComparisonModal from "./components/JobComparisonModal";
import MainHeader from './components/MainHeader';

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
    | { type: 'jobComparison'; jobs: Job[] }
    | { type: 'gmailScanner'; emails: Email[], analysisJobId: string | null, isLoading: boolean };

// FIX: Cast import.meta to any to access env properties without TypeScript errors.
const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;

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
    const [message, setMessage] = useState('Настройте параметры поиска в Настройках (⚙️) и нажмите "Найти вакансии".');
    
    const [modal, setModal] = useImmer<ModalState>({ type: 'none' });
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // Google Auth State
    const [googleUser, setGoogleUser] = useLocalStorage<GoogleUser | null>('google-user', null);
    const [googleToken, setGoogleToken] = useLocalStorage<any | null>('google-token', null);
    const [tokenClient, setTokenClient] = useState<any | null>(null);
    const [isGapiReady, setIsGapiReady] = useState(false);
    
    const isGoogleConnected = !!googleToken;

    const isFirebaseConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('...');
    const isGoogleConfigured = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('YOUR_');
    
    const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

    // --- API Key Management (from profile) ---
    const getActiveGeminiApiKey = useCallback((): string | null => {
        if (!activeProfile || !activeProfile.geminiApiKeys || activeProfile.geminiApiKeys.length === 0) {
            return (import.meta as any).env.VITE_GEMINI_API_KEY || null;
        }
        const index = activeProfile.activeGeminiApiKeyIndex || 0;
        return activeProfile.geminiApiKeys[index % activeProfile.geminiApiKeys.length] || null;
    }, [activeProfile]);

    const rotateGeminiApiKey = useCallback(() => {
        if (!activeProfile || !activeProfile.geminiApiKeys || activeProfile.geminiApiKeys.length <= 1) return;
        
        const currentIndex = activeProfile.activeGeminiApiKeyIndex || 0;
        const nextIndex = (currentIndex + 1) % activeProfile.geminiApiKeys.length;
        
        updateProfile({
            ...activeProfile,
            activeGeminiApiKeyIndex: nextIndex,
        });

    }, [activeProfile]);


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
            geminiApiKeys: [],
            activeGeminiApiKeyIndex: 0,
            avitoClientId: '',
            avitoClientSecret: '',
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
        if (!activeProfile || !user) return;
    
        setStatus(AppStatus.Loading);
        setMessage('Начинаю сбор вакансий...');
        
        setFoundJobs([]);
        setView('scanResults');
    
        try {
            const enabledPlatforms = activeProfile.settings.platforms.filter(p => p.enabled);
            if (enabledPlatforms.length === 0) {
                setStatus(AppStatus.Error);
                setMessage("Нет активных площадок для поиска. Включите хотя бы одну в Настройках.");
                return;
            }
    
            const existingJobUrls = new Set(jobs.filter(j => j.profileId === activeProfile.id).map(j => j.url));
            let allRawResults: Job[] = [];
            const apiKey = getActiveGeminiApiKey();

            if (!apiKey) {
                setStatus(AppStatus.Error);
                setMessage("Ключ Gemini API не найден. Добавьте его в Настройках.");
                return;
            }
            
            for (let i = 0; i < enabledPlatforms.length; i++) {
                const platform = enabledPlatforms[i];
                setMessage(`Этап ${i + 1}/${enabledPlatforms.length}: Сканирую ${platform.name}...`);
                
                let platformResults: Omit<Job, 'id' | 'kanbanStatus' | 'profileId' | 'userId' | 'history' | 'notes'>[] = [];

                if (platform.type === 'api' && platform.name === 'Avito') {
                    if (!activeProfile.avitoClientId || !activeProfile.avitoClientSecret) {
                        setStatus(AppStatus.Error);
                        setMessage(`Ключи Avito API не найдены. Добавьте их в Настройках.`);
                        return;
                    }
                    platformResults = await findJobsOnAvitoAPI(activeProfile.settings, activeProfile.avitoClientId, activeProfile.avitoClientSecret);
                } else {
                    platformResults = await findJobsOnRealWebsite(activeProfile.prompts.jobSearch, activeProfile.settings, platform, apiKey, rotateGeminiApiKey);
                }
                
                const newJobsFromPlatform = platformResults
                    .filter(job => !existingJobUrls.has(job.url) && !allRawResults.some(r => r.url === job.url))
                    .map(job => ({
                        ...job,
                        id: uuidv4(),
                        kanbanStatus: 'new' as KanbanStatus,
                        profileId: activeProfile.id,
                        userId: user!.uid,
                        history: [],
                    }));
                
                allRawResults = [...allRawResults, ...newJobsFromPlatform];
                setFoundJobs([...allRawResults]);
            }
    
            if (allRawResults.length === 0) {
                setMessage('Новых вакансий не найдено. Попробуйте изменить параметры поиска или добавить больше площадок в настройках.');
                setStatus(AppStatus.Success);
                return;
            }
    
            setMessage(`Сбор завершен. Найдено ${allRawResults.length} вакансий. ИИ проводит анализ на соответствие...`);
            
            const analyzedJobs = await analyzeAndRankJobs(allRawResults, activeProfile, apiKey, rotateGeminiApiKey);
            setFoundJobs(analyzedJobs);
    
            setMessage(`Анализ завершен. ${analyzedJobs.filter(j => j.matchAnalysis).length} вакансий рекомендовано.`);
            setStatus(AppStatus.Success);
            
    
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

    const handleRefreshJobStatuses = async () => {
        if (!activeProfile) return;
        const apiKey = getActiveGeminiApiKey();
        if (!apiKey) {
            setStatus(AppStatus.Error);
            setMessage("Ключ Gemini API не найден. Добавьте его в Настройках.");
            return;
        }

        const jobsToUpdate = jobs.filter(j =>
            j.profileId === activeProfile.id &&
            (j.kanbanStatus === 'tracking' || j.kanbanStatus === 'interview')
        );

        if (jobsToUpdate.length === 0) {
            setMessage("Нет активных вакансий для проверки.");
            setStatus(AppStatus.Success);
            return;
        }

        setStatus(AppStatus.Loading);
        setMessage(`Проверяю статусы ${jobsToUpdate.length} вакансий... (0/${jobsToUpdate.length})`);

        let archivedCount = 0;
        for (let i = 0; i < jobsToUpdate.length; i++) {
            const job = jobsToUpdate[i];
            setMessage(`Проверяю статусы ${jobsToUpdate.length} вакансий... (${i + 1}/${jobsToUpdate.length}) - ${job.title}`);
            try {
                const status = await checkJobStatus(job.url, apiKey, rotateGeminiApiKey);
                if (status === 'archived') {
                    handleUpdateJob(job.id, { kanbanStatus: 'archive' });
                    handleAddInteraction(job.id, 'status_change', `Статус автоматически изменен на "Архив" (вакансия закрыта)`);
                    archivedCount++;
                }
            } catch (error) {
                console.error(`Failed to check status for job ${job.id}:`, error);
                // Continue to the next job
            }
        }

        setStatus(AppStatus.Success);
        setMessage(`Проверка завершена. ${archivedCount} вакансий перемещено в архив.`);
    };

    // --- AI Actions ---

    const runAiAction = async (title: string, action: (apiKey: string, rotateCb: () => void) => Promise<string>) => {
        setModal({ type: 'aiContent', title, content: '', isLoading: true });
        const apiKey = getActiveGeminiApiKey();
         if (!apiKey) {
            setModal({ type: 'aiContent', title, content: `Ошибка: Ключ Gemini API не настроен.`, isLoading: false });
            return;
        }
        try {
            const content = await action(apiKey, rotateGeminiApiKey);
            setModal({ type: 'aiContent', title, content, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка.';
            setModal({ type: 'aiContent', title, content: `Ошибка: ${errorMessage}`, isLoading: false });
        }
    };
    
    const runStreamingAiAction = async (title: string, action: (apiKey: string, rotateCb: () => void) => AsyncGenerator<string>) => {
        setModal({ type: 'aiContent', title, content: '', isLoading: true });
        const apiKey = getActiveGeminiApiKey();
        if (!apiKey) {
            setModal({ type: 'aiContent', title, content: `Ошибка: Ключ Gemini API не настроен.`, isLoading: false });
            return;
        }
        try {
            const stream = action(apiKey, rotateGeminiApiKey);
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
            (apiKey, rotateCb) => adaptResume(activeProfile.prompts.resumeAdapt, activeProfile.resume, job, apiKey, rotateCb)
        );
    };

    const handleGenerateEmail = (job: Job) => {
        if (!activeProfile) return;
        runAiAction(
            `Сопроводительное письмо для "${job.company}"`,
            async (apiKey, rotateCb) => {
                const { subject, body } = await generateCoverLetter(activeProfile.prompts.coverLetter, job, activeProfile.name, apiKey, rotateCb);
                return `Subject: ${subject}\n\n${body}`;
            }
        );
    };

    const handlePrepareForInterview = (job: Job) => {
        if (!activeProfile) return;
        runStreamingAiAction(
            `Подготовка к собеседованию на "${job.title}"`,
            (apiKey, rotateCb) => getInterviewQuestions(job, activeProfile.resume, apiKey, rotateCb)
        );
    };
    
    const handleAnalyzeHrResponse = async (job: Job, emailText: string) => {
        if (!activeProfile) return;
        const apiKey = getActiveGeminiApiKey();
        if (!apiKey) {
             setStatus(AppStatus.Error);
             setMessage("Ключ Gemini API не настроен.");
            return;
        }
        setModal({ type: 'none' });
        setStatus(AppStatus.Loading);
        setMessage("Анализирую ответ от HR...");
        try {
            const newStatus = await analyzeHrResponse(activeProfile.prompts.hrResponseAnalysis, emailText, apiKey, rotateGeminiApiKey);
            handleUpdateJobStatus(job.id, newStatus);
            setStatus(AppStatus.Success);
            setMessage(`Статус вакансии "${job.title}" обновлен на "${kanbanStatusMap[newStatus]}".`);
        } catch (error) {
            setStatus(AppStatus.Error);
            setMessage(error instanceof Error ? error.message : 'Произошла неизвестная ошибка.');
        }
    };
    
    const handleQuickApply = async (action: 'email' | 'whatsapp' | 'telegram', job: Job) => {
        if (!activeProfile) return;
        const apiKey = getActiveGeminiApiKey();
        if (!apiKey) {
             setStatus(AppStatus.Error);
             setMessage("Ключ Gemini API не настроен.");
            return;
        }
        setStatus(AppStatus.Loading);
        
        try {
            if (action === 'email') {
                setMessage('ИИ готовит текст для email...');
                const { subject, body } = await generateCoverLetter(activeProfile.prompts.coverLetter, job, activeProfile.name, apiKey, rotateGeminiApiKey);

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
                const message = await generateShortMessage(activeProfile.prompts.shortMessage, job, activeProfile.name, apiKey, rotateGeminiApiKey);
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
        const apiKey = getActiveGeminiApiKey();
        if (!apiKey) {
             setStatus(AppStatus.Error);
             setMessage("Ключ Gemini API не настроен.");
            return;
        }
        
        try {
            setModal(prevModal => {
                if (prevModal.type === 'gmailScanner') {
                    return { ...prevModal, analysisJobId: 'loading' };
                }
                return prevModal;
            });

            const matchedJobId = await matchEmailToJob(emailText, jobs, apiKey, rotateGeminiApiKey);
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
                    getApiKey={getActiveGeminiApiKey}
                    rotateApiKey={rotateGeminiApiKey}
                />;
            case 'hrAnalysis':
                return <HrAnalysisModal 
                    job={modal.job}
                    onClose={() => setModal({ type: 'none' })}
                    onAnalyze={(emailText) => handleAnalyzeHrResponse(modal.job, emailText)}
                />;
            case 'jobComparison':
                return <JobComparisonModal
                    jobs={modal.jobs}
                    onClose={() => setModal({ type: 'none' })}
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
            <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
                <Sidebar
                    view={view}
                    setView={setView}
                    foundJobsCount={foundJobs.length}
                    theme={theme}
                    setTheme={setTheme}
                    user={user}
                    onLogout={handleLogout}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                    profiles={profiles}
                    activeProfile={activeProfile}
                    onSwitchProfile={setActiveProfileId}
                />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <main className="flex-1 overflow-y-auto p-6">
                        <MainHeader
                           view={view}
                           onSearch={handleSearch}
                           status={status}
                        />

                        <StatusBar status={status} message={message} />

                        <div className="mt-6">
                        {view === 'applications' ? (
                            <ApplicationTracker
                                jobs={jobs.filter(j => j.profileId === activeProfile?.id)}
                                profiles={profiles}
                                onUpdateJobStatus={handleUpdateJobStatus}
                                onViewDetails={(job) => setModal({ type: 'jobDetail', job })}
                                onAdaptResume={handleAdaptResume}
                                onGenerateEmail={handleGenerateEmail}
                                onQuickApplyEmail={handleQuickApplyFromCard}
                                isGoogleConnected={isGoogleConnected}
                                isGapiReady={isGapiReady}
                                onScanReplies={handleOpenGmailScanner}
                                onRefreshStatuses={handleRefreshJobStatuses}
                            />
                        ) : (
                            <ScanResults
                                jobs={foundJobs}
                                onSaveJobs={handleSaveScannedJobs}
                                onDismissJob={(jobId) => setFoundJobs(prev => prev.filter(j => j.id !== jobId))}
                                onViewDetails={(job) => setModal({ type: 'jobDetail', job })}
                                onCompareJobs={(jobs) => setModal({ type: 'jobComparison', jobs })}
                            />
                        )}
                        </div>
                    </main>
                </div>

                {renderModal()}
                {isSettingsModalOpen && (
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
                    />
                )}
            </div>
        </AuthGuard>
    );
}

export default App;