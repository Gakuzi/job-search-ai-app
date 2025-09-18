import React, { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { v4 as uuidv4 } from 'uuid';

import Header from './components/Header';
import SettingsPanel from './components/SettingsPanel';
import JobList from './components/JobList';
import JobDetailModal from './components/JobDetailModal';
import Modal from './components/Modal';
import StatusBar from './components/StatusBar';
import OnboardingModal from './components/OnboardingModal';
import AuthGuard from './components/AuthGuard';
import ApplicationTracker from './components/ApplicationTracker';
import FirebaseConfigError from './components/FirebaseConfigError';

import { useTheme } from './hooks/useTheme';
import { AppStatus, DEFAULT_PROMPTS, DEFAULT_SEARCH_SETTINGS, DEFAULT_RESUME } from './constants';
import * as geminiService from './services/geminiService';
import { auth, firebaseConfig } from './services/firebase';
import * as firestoreService from './services/firestoreService';

import type { Job, Profile, SearchSettings } from './types';

// Проверка на наличие конфигурации Firebase
const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('...');
}


function App() {
    const [user, authLoading] = useAuthState(auth);
    const [theme, setTheme] = useTheme();
    const [view, setView] = useState<'search' | 'applications'>('search');
    
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    
    const [jobs, setJobs] = useState<Job[]>([]);
    
    const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
    const [message, setMessage] = useState('Добро пожаловать! Настройте параметры и начните поиск.');

    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionModalTitle, setActionModalTitle] = useState('');
    const [actionModalContent, setActionModalContent] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);

    const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

    useEffect(() => {
        if (user && isFirebaseConfigured()) {
            const unsubscribeProfiles = firestoreService.subscribeToProfiles(user.uid, (loadedProfiles) => {
                setProfiles(loadedProfiles);
                if (loadedProfiles.length > 0) {
                    if (!activeProfileId || !loadedProfiles.some(p => p.id === activeProfileId)) {
                        setActiveProfileId(loadedProfiles[0].id);
                    }
                    setShowOnboarding(false);
                } else {
                    setShowOnboarding(true);
                }
            });

            const unsubscribeJobs = firestoreService.subscribeToJobs(user.uid, setJobs);

            return () => {
                unsubscribeProfiles();
                unsubscribeJobs();
            };
        } else if (!user) {
            // Clear data on logout
            setProfiles([]);
            setJobs([]);
            setActiveProfileId(null);
        }
    }, [user, activeProfileId]);

    const handleLogout = () => {
        auth.signOut();
    };

    const handleAddProfile = useCallback(async (profileData?: { resume: string, settings: SearchSettings }) => {
        if (!user) return;
        const newProfile: Omit<Profile, 'id'> = {
            userId: user.uid,
            name: `Профиль ${profiles.length + 1}`,
            resume: profileData?.resume || DEFAULT_RESUME,
            settings: profileData?.settings || DEFAULT_SEARCH_SETTINGS,
            prompts: DEFAULT_PROMPTS,
        };
        const createdProfile = await firestoreService.addProfile(newProfile);
        setActiveProfileId(createdProfile.id);
        setShowOnboarding(false);
        setIsSettingsExpanded(true);
    }, [user, profiles.length]);

    const handleUpdateProfile = useCallback((updater: (draft: Profile) => void) => {
        if (!activeProfile) return;
    
        const tempDraft: Profile = {
          id: activeProfile.id,
          userId: activeProfile.userId,
          name: activeProfile.name,
          resume: activeProfile.resume,
          settings: { ...activeProfile.settings },
          prompts: { ...activeProfile.prompts },
        };
    
        updater(tempDraft);
    
        firestoreService.updateProfile(tempDraft).catch(err => {
            console.error("Failed to update profile", err);
            setStatus(AppStatus.Error);
            setMessage(`Ошибка обновления профиля: ${err.message}. Возможно, проблема с подключением к базе данных.`);
        });
        
        setProfiles(profiles.map(p => p.id === tempDraft.id ? tempDraft : p));
    }, [activeProfile, profiles]);

    const handleDeleteProfile = useCallback(async (id: string) => {
        if (profiles.length <= 1) {
            alert("Нельзя удалить единственный профиль.");
            return;
        }
        await firestoreService.deleteProfile(id);
    }, [profiles.length]);
    
    const handleUpdateJob = useCallback((jobId: string, updates: Partial<Job>) => {
        firestoreService.updateJob(jobId, updates).catch(err => console.error("Failed to update job", err));
    }, []);

    const handleSearch = useCallback(async () => {
        if (!activeProfile) return;
        setStatus(AppStatus.Loading);
        setMessage('Ищу реальные вакансии на hh.ru и анализирую их для вас...');
        try {
            const results = await geminiService.findJobsOnRealWebsite(
                activeProfile.prompts.jobSearch,
                activeProfile.resume,
                activeProfile.settings
            );

            const newJobs: Job[] = results.map(job => ({
                ...job,
                id: uuidv4(),
                kanbanStatus: 'new',
                profileId: activeProfile.id,
                userId: user!.uid,
            }));
            
            await firestoreService.addJobsBatch(newJobs);

            setStatus(AppStatus.Success);
            setMessage(`Отлично! Найдено ${newJobs.length} релевантных вакансий.`);
            setIsSettingsExpanded(false);
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'Произошла неизвестная ошибка.';
            setStatus(AppStatus.Error);
            setMessage(`Ошибка: ${errorMessage}`);
        }
    }, [activeProfile, user]);
    
    const openActionModal = (title: string) => {
        setIsActionModalOpen(true);
        setActionModalTitle(title);
        setIsActionLoading(true);
        setActionModalContent('');
    };

    const handleAdaptResume = async (job: Job) => {
        if (!activeProfile) return;
        openActionModal(`Адаптация резюме для "${job.title}"`);
        try {
            const result = await geminiService.adaptResume(activeProfile.prompts.resumeAdapt, activeProfile.resume, job);
            setActionModalContent(result);
        } catch (error) {
            setActionModalContent(`Ошибка при адаптации резюме: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleGenerateEmail = async (job: Job) => {
        if (!activeProfile) return;
        openActionModal(`Сопроводительное письмо для "${job.company}"`);
        try {
            const result = await geminiService.generateCoverLetter(activeProfile.prompts.coverLetter, job, activeProfile.name);
            setActionModalContent(result);
        } catch (error) {
            setActionModalContent(`Ошибка при генерации письма: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsActionLoading(false);
        }
    };
    
    const handlePrepareForInterview = async (job: Job) => {
        if (!activeProfile) return;
        openActionModal(`Подготовка к интервью в "${job.company}"`);
        try {
            const result = await geminiService.getInterviewQuestions(job, activeProfile.resume);
            setActionModalContent(result);
        } catch (error) {
            setActionModalContent(`Ошибка при генерации вопросов: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const jobsForCurrentProfile = activeProfile ? jobs.filter(j => j.profileId === activeProfile.id) : [];

    if (!isFirebaseConfigured()) {
        return <FirebaseConfigError />;
    }

    return (
        <AuthGuard user={user} loading={authLoading}>
            <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
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
                        <>
                            <SettingsPanel
                                profiles={profiles}
                                activeProfile={activeProfile}
                                onAddProfile={() => setShowOnboarding(true)}
                                onDeleteProfile={handleDeleteProfile}
                                onSwitchProfile={setActiveProfileId}
                                onUpdateProfile={handleUpdateProfile}
                                onSearch={handleSearch}
                                onExport={() => {}}
                                onImport={() => {}}
                                status={status}
                                isSettingsExpanded={isSettingsExpanded}
                                setIsSettingsExpanded={setIsSettingsExpanded}
                            />
                            {status !== AppStatus.Loading && <StatusBar status={status} message={message} />}
                            <JobList 
                                jobs={jobsForCurrentProfile.filter(j => j.kanbanStatus === 'new')}
                                onJobClick={setSelectedJob} 
                            />
                        </>
                    )}
                    {view === 'applications' && activeProfile && (
                        <ApplicationTracker
                            jobs={jobsForCurrentProfile}
                            onUpdateJob={handleUpdateJob}
                            onJobClick={setSelectedJob}
                        />
                    )}
                </main>

                {selectedJob && (
                    <JobDetailModal
                        job={selectedJob}
                        onClose={() => setSelectedJob(null)}
                        onUpdateJob={handleUpdateJob}
                        onAdaptResume={handleAdaptResume}
                        onGenerateEmail={handleGenerateEmail}
                        onPrepareForInterview={handlePrepareForInterview}
                    />
                )}
                 {isActionModalOpen && (
                    <Modal
                        title={actionModalTitle}
                        onClose={() => setIsActionModalOpen(false)}
                        isLoading={isActionLoading}
                    >
                       <pre className="whitespace-pre-wrap font-sans text-sm">{actionModalContent}</pre>
                    </Modal>
                )}
                {showOnboarding && user && (
                    <OnboardingModal
                        onFinish={handleAddProfile}
                        onClose={() => {
                            if (profiles.length > 0) setShowOnboarding(false);
                        }}
                    />
                )}
            </div>
        </AuthGuard>
    );
}

export default App;