
import React, { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

// Types and Constants
import type { Profile, Job, SearchSettings, KanbanStatus, GoogleUser, Email } from './types';
import { AppStatus, DEFAULT_PROMPTS, DEFAULT_RESUME, DEFAULT_SEARCH_SETTINGS } from './constants';

// Hooks
import { useTheme } from './hooks/useTheme';

// Services
import { auth, firebaseConfig } from './services/firebase';
import * as firestoreService from './services/firestoreService';
import * as geminiService from './services/geminiService';
import * as googleAuthService from './services/googleAuthService';
import * as gmailService from './services/gmailService';

// Components
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import StatusBar from './components/StatusBar';
import JobList from './components/JobList';
import ApplicationTracker from './components/ApplicationTracker';
import JobDetailModal from './components/JobDetailModal';
import Modal from './components/Modal';
import OnboardingModal from './components/OnboardingModal';
import AuthGuard from './components/AuthGuard';
import ConfigurationError from './components/ConfigurationError';
import GmailScannerModal from './components/GmailScannerModal';

type AppView = 'search' | 'tracker';
type ModalContent = { type: 'resume', job: Job } | { type: 'cover-letter', job: Job } | { type: 'questions', job: Job } | { type: 'hr-analysis', job: Job };

const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('AIzaSy...');
};

const isGoogleApiConfigured = () => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GEMINI_API_KEY;
};

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
    
    const [foundJobs, setFoundJobs] = useState<Job[]>([]);
    const [trackedJobs, setTrackedJobs] = useState<Job[]>([]);

    const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
    const [message, setMessage] = useState('Готов к поиску!');
    
    const [view, setView] = useState<AppView>('search');

    // Modal States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isFirstLogin, setIsFirstLogin] = useState(false);
    const [viewingJob, setViewingJob] = useState<Job | null>(null);
    const [modalContent, setModalContent] = useState<ModalContent | null>(null);
    const [modalText, setModalText] = useState('');
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerEmails, setScannerEmails] = useState<Email[]>([]);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);


    const [theme, setTheme] = useTheme();

    // Google Auth State
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
    const [isGapiReady, setIsGapiReady] = useState(false);
    const isGoogleConnected = !!googleUser;

    const updateStatus = (newStatus: AppStatus, newMessage: string) => {
        setStatus(newStatus);
        setMessage(newMessage);
    };

    // --- Authentication and Profile Loading ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUser(user);
                updateStatus(AppStatus.Loading, "Загрузка профилей...");
                try {
                    const loadedProfiles = await firestoreService.getProfiles(user.uid);
                    if (loadedProfiles.length > 0) {
                        setProfiles(loadedProfiles);
                        setActiveProfile(loadedProfiles[0]);
                    } else {
                        setIsFirstLogin(true);
                    }
                } catch (error) {
                    console.error("Error loading profiles:", error);
                    updateStatus(AppStatus.Error, "Не удалось загрузить профили.");
                }
            } else {
                setUser(null);
                setProfiles([]);
                setActiveProfile(null);
            }
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user && activeProfile) {
            updateStatus(AppStatus.Loading, "Загрузка отслеживаемых вакансий...");
            firestoreService.getTrackedJobs(user.uid)
                .then(jobs => {
                    setTrackedJobs(jobs);
                    updateStatus(AppStatus.Idle, "Готов к работе.");
                })
                .catch(error => {
                    console.error("Error loading tracked jobs:", error);
                    updateStatus(AppStatus.Error, "Не удалось загрузить вакансии.");
                });
        }
    }, [user, activeProfile]);

     // --- Google API Initialization ---
    useEffect(() => {
        const initGoogleApis = async () => {
            try {
                await googleAuthService.gapiLoad('client:oauth2');
                await googleAuthService.initGapiClient();
                setIsGapiReady(true);
                const client = googleAuthService.initTokenClient(async (resp) => {
                    if (resp.error) {
                        console.error('Google token error:', resp.error);
                        return;
                    }
                    const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { 'Authorization': `Bearer ${resp.access_token}` }
                    });
                    const userInfo = await userInfoResp.json();
                    setGoogleUser({ name: userInfo.name, email: userInfo.email, picture: userInfo.picture });
                });
                setTokenClient(client);
            } catch (error) {
                console.error("Error initializing Google API:", error);
            }
        };
        initGoogleApis();
    }, []);


    // --- Handlers ---
    const handleLogout = () => {
        signOut(auth);
    };

    const handleSearch = async () => {
        if (!activeProfile) {
            updateStatus(AppStatus.Error, 'Сначала выберите или создайте профиль.');
            return;
        }
        updateStatus(AppStatus.Loading, 'ИИ анализирует сайты в поисках лучших вакансий...');
        setFoundJobs([]);
        setView('search');

        try {
            const enabledPlatforms = activeProfile.settings.platforms.filter(p => p.enabled);
            if (enabledPlatforms.length === 0) {
                throw new Error("Нет активных площадок для поиска. Включите хотя бы одну в настройках.");
            }

            const promises = enabledPlatforms.map(platform => 
                geminiService.findJobsOnRealWebsite(DEFAULT_PROMPTS.jobSearch, activeProfile.resume, activeProfile.settings, platform)
            );
            
            const results = await Promise.all(promises);
            // FIX: Add missing 'kanbanStatus' property to satisfy the 'Job' type.
            const allJobs: Job[] = results.flat().map(job => ({
                ...job,
                id: uuidv4(),
                userId: user!.uid,
                profileId: activeProfile.id,
                kanbanStatus: 'new',
            }));

            setFoundJobs(allJobs);
            updateStatus(AppStatus.Success, `Найдено ${allJobs.length} релевантных вакансий!`);
        } catch (error: any) {
            console.error(error);
            updateStatus(AppStatus.Error, error.message || 'Произошла ошибка при поиске.');
        }
    };
    
    const handleSaveJobs = (jobs: Job[]) => {
        // FIX: The firestore service needs the full Job object, including the ID.
        // The previous implementation was incorrectly removing the ID.
        firestoreService.saveTrackedJobs(jobs)
            .then(() => {
                setTrackedJobs(prev => [...prev, ...jobs]);
                setFoundJobs(prev => prev.filter(f => !jobs.some(s => s.id === f.id)));
                updateStatus(AppStatus.Success, `Сохранено ${jobs.length} вакансий для отслеживания.`);
                setView('tracker');
            })
            .catch(err => {
                console.error(err);
                updateStatus(AppStatus.Error, "Не удалось сохранить вакансии.");
            });
    };

    const handleDismissJob = (jobId: string) => {
        setFoundJobs(prev => prev.filter(job => job.id !== jobId));
    };

    const handleUpdateJobStatus = (jobId: string, newStatus: KanbanStatus) => {
        firestoreService.updateJobStatus(jobId, newStatus)
            .then(() => {
                setTrackedJobs(prev => prev.map(job => job.id === jobId ? { ...job, kanbanStatus: newStatus } : job));
            })
            .catch(err => {
                console.error(err);
                updateStatus(AppStatus.Error, "Не удалось обновить статус.");
            });
    };

    // Profile Management
    const handleInitiateOnboarding = () => setIsFirstLogin(true);

    const handleUpdateProfile = useCallback((updater: (draft: Profile) => void) => {
        if (!activeProfile) return;
        const newProfile = { ...activeProfile };
        updater(newProfile);
        setActiveProfile(newProfile);
        firestoreService.saveProfile(newProfile); // Debounce this in a real app
    }, [activeProfile]);

    const handleSwitchProfile = (id: string) => {
        const newActive = profiles.find(p => p.id === id);
        if (newActive) setActiveProfile(newActive);
    };

    const handleDeleteProfile = (id: string) => {
        if (profiles.length <= 1) {
            updateStatus(AppStatus.Error, "Нельзя удалить единственный профиль.");
            return;
        }
        firestoreService.deleteProfile(id).then(() => {
            const remaining = profiles.filter(p => p.id !== id);
            setProfiles(remaining);
            setActiveProfile(remaining[0] || null);
        });
    };
    
    // Onboarding
    const handleOnboardingFinish = async (result: { resume: string, settings: SearchSettings, profileName: string }) => {
        if (!user) return;
        const newProfileData: Omit<Profile, 'id' | 'createdAt'> = {
            userId: user.uid,
            name: result.profileName,
            resume: result.resume,
            settings: { ...DEFAULT_SEARCH_SETTINGS, ...result.settings }
        };
        const newId = await firestoreService.saveProfile(newProfileData);
        const newProfile = { ...newProfileData, id: newId, createdAt: new Date() } as Profile;
        setProfiles(prev => [newProfile, ...prev]);
        setActiveProfile(newProfile);
        setIsFirstLogin(false);
    };

    // Modal Generators
    const handleAdaptResume = async (job: Job) => {
        if (!activeProfile) return;
        setModalContent({ type: 'resume', job });
        setIsModalLoading(true);
        try {
            const adapted = await geminiService.adaptResume(DEFAULT_PROMPTS.resumeAdapt, activeProfile.resume, job);
            setModalText(adapted);
        } catch (e: any) { setModalText(`Ошибка: ${e.message}`); }
        finally { setIsModalLoading(false); }
    };
    
    const handleGenerateEmail = async (job: Job) => {
        if (!activeProfile) return;
        setModalContent({ type: 'cover-letter', job });
        setIsModalLoading(true);
        try {
            const candidateName = activeProfile.name.split('-')[0].trim() || 'Кандидат';
            const letter = await geminiService.generateCoverLetter(DEFAULT_PROMPTS.coverLetter, job, candidateName);
            setModalText(`**Тема:** ${letter.subject}\n\n---\n\n${letter.body}`);
        } catch (e: any) { setModalText(`Ошибка: ${e.message}`); }
        finally { setIsModalLoading(false); }
    };
    
    const handleGenerateQuestions = async (job: Job) => {
        if (!activeProfile) return;
        setModalContent({ type: 'questions', job });
        setIsModalLoading(true);
        try {
            const questions = await geminiService.getInterviewQuestions(job, activeProfile.resume);
            setModalText(questions);
        } catch (e: any) { setModalText(`Ошибка: ${e.message}`); }
        finally { setIsModalLoading(false); }
    };
    
    // Google Integration
    const handleGoogleSignIn = () => {
        if (tokenClient) {
            googleAuthService.getToken(tokenClient);
        }
    };
    
    const handleGoogleSignOut = () => {
        googleAuthService.revokeToken();
        setGoogleUser(null);
    };

    const handleScanReplies = async () => {
        setIsScannerOpen(true);
        setScannerLoading(true);
        setAnalysisJobId(null);
        try {
            const emails = await gmailService.listMessages(30);
            setScannerEmails(emails);
        } catch (error: any) {
            console.error(error);
            updateStatus(AppStatus.Error, error.message);
        } finally {
            setScannerLoading(false);
        }
    };
    
    const handleAnalyzeReply = async (emailText: string) => {
        if (!activeProfile) return;
        setAnalysisJobId('loading');
        try {
            const matchedJobId = await geminiService.matchEmailToJob(emailText, trackedJobs);
            if (matchedJobId !== 'UNKNOWN') {
                const newStatus = await geminiService.analyzeHrResponse(DEFAULT_PROMPTS.hrResponseAnalysis, emailText);
                handleUpdateJobStatus(matchedJobId, newStatus);
                setAnalysisJobId(matchedJobId);
            } else {
                 setAnalysisJobId('not_found');
            }
        } catch (error: any) {
            console.error(error);
            updateStatus(AppStatus.Error, error.message);
            setAnalysisJobId(null);
        }
    };
    
    if (!isFirebaseConfigured() || !isGoogleApiConfigured()) {
        return <ConfigurationError isFirebaseOk={isFirebaseConfigured()} isGoogleOk={isGoogleApiConfigured()} />;
    }

    return (
        <AuthGuard user={user} loading={loadingAuth}>
            <div className={`min-h-screen bg-slate-100 dark:bg-slate-900 font-sans ${theme}`}>
                <Header 
                    theme={theme} 
                    setTheme={setTheme} 
                    user={user}
                    profiles={profiles}
                    activeProfile={activeProfile}
                    onSwitchProfile={handleSwitchProfile}
                    onAddProfile={handleInitiateOnboarding}
                    onLogout={handleLogout}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                />

                <main className="container mx-auto p-4 md:p-6">
                    {activeProfile ? (
                        <StatusBar status={status} message={message} />
                    ) : !isFirstLogin ? (
                         <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                            <h3 className="text-xl font-semibold">Добро пожаловать!</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Давайте создадим ваш первый профиль для поиска работы с помощью AI-ассистента.</p>
                             <button onClick={handleInitiateOnboarding} className="mt-4 px-4 py-2 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700">
                                Создать профиль с ИИ
                            </button>
                        </div>
                    ) : null }

                    {activeProfile && (
                        <>
                            <div className="flex justify-center mb-6 border-b border-slate-300 dark:border-slate-700">
                                <button onClick={() => setView('search')} className={`px-4 py-2 font-semibold ${view === 'search' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>Поиск</button>
                                <button onClick={() => setView('tracker')} className={`px-4 py-2 font-semibold ${view === 'tracker' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>Отклики</button>
                            </div>

                            {view === 'search' && (
                                <JobList
                                    jobs={foundJobs}
                                    onSaveJobs={handleSaveJobs}
                                    onDismissJob={handleDismissJob}
                                    onViewDetails={setViewingJob}
                                    onAdaptResume={handleAdaptResume}
                                    onGenerateEmail={handleGenerateEmail}
                                />
                            )}
                            {view === 'tracker' && (
                                <ApplicationTracker
                                    jobs={trackedJobs.filter(j => j.profileId === activeProfile.id)}
                                    profiles={profiles}
                                    onUpdateJobStatus={handleUpdateJobStatus}
                                    onViewDetails={setViewingJob}
                                    onAdaptResume={handleAdaptResume}
                                    onGenerateEmail={handleGenerateEmail}
                                    onQuickApplyEmail={() => {}}
                                    isGoogleConnected={isGoogleConnected}
                                    isGapiReady={isGapiReady}
                                    onScanReplies={handleScanReplies}
                                />
                            )}
                        </>
                    )}
                </main>

                {/* Modals */}
                {isSettingsOpen && activeProfile && (
                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        profiles={profiles}
                        activeProfile={activeProfile}
                        onAddProfile={handleInitiateOnboarding}
                        onDeleteProfile={handleDeleteProfile}
                        onSwitchProfile={handleSwitchProfile}
                        onUpdateProfile={handleUpdateProfile}
                        googleUser={googleUser}
                        isGoogleConnected={isGoogleConnected}
                        onGoogleSignIn={handleGoogleSignIn}
                        onGoogleSignOut={handleGoogleSignOut}
                    />
                )}
                 {isFirstLogin && <OnboardingModal onFinish={handleOnboardingFinish} onClose={() => setIsFirstLogin(false)} />}
                 {viewingJob && (
                    <JobDetailModal 
                        job={viewingJob} 
                        onClose={() => setViewingJob(null)}
                        onAdaptResume={handleAdaptResume}
                        onGenerateEmail={handleGenerateEmail}
                        onGenerateQuestions={handleGenerateQuestions}
                    />
                )}
                 {modalContent && (
                    <Modal
                        title={
                            modalContent.type === 'resume' ? `Адаптированное резюме для "${modalContent.job.title}"` :
                            modalContent.type === 'cover-letter' ? `Сопроводительное письмо для "${modalContent.job.title}"` :
                            `Вопросы к собеседованию для "${modalContent.job.title}"`
                        }
                        onClose={() => setModalContent(null)}
                        isLoading={isModalLoading}
                    >
                        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{modalText}</div>
                    </Modal>
                )}
                {isScannerOpen && (
                    <GmailScannerModal 
                        emails={scannerEmails}
                        jobs={trackedJobs}
                        analysisJobId={analysisJobId}
                        isLoading={scannerLoading}
                        onClose={() => setIsScannerOpen(false)}
                        onAnalyzeReply={handleAnalyzeReply}
                    />
                )}
            </div>
        </AuthGuard>
    );
}

export default App;
