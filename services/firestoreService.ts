import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    writeBatch,
    getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Profile, Job, SearchSettings, Prompts } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_PROMPTS, DEFAULT_SEARCH_SETTINGS, DEFAULT_RESUME } from '../constants';


// --- Profiles ---

export const subscribeToProfiles = (userId: string, callback: (profiles: Profile[]) => void) => {
    const q = query(collection(db, 'profiles'), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
        const profiles = snapshot.docs.map(doc => {
            const data = doc.data() || {};
            const settings: Partial<SearchSettings> = data.settings || {};
            const prompts: Partial<Prompts> = data.prompts || {};

            const cleanProfile: Profile = {
                id: doc.id,
                userId: data.userId || '',
                name: data.name || '',
                resume: data.resume || DEFAULT_RESUME,
                settings: {
                    ...DEFAULT_SEARCH_SETTINGS,
                    ...settings,
                    platforms: Array.isArray(settings.platforms) && settings.platforms.length > 0
                        ? settings.platforms
                        : DEFAULT_SEARCH_SETTINGS.platforms,
                },
                prompts: {
                    ...DEFAULT_PROMPTS,
                    ...prompts,
                },
                // Load API keys from Firestore profile
                geminiApiKeys: Array.isArray(data.geminiApiKeys) ? data.geminiApiKeys : [],
                activeGeminiApiKeyIndex: typeof data.activeGeminiApiKeyIndex === 'number' ? data.activeGeminiApiKeyIndex : 0,
                avitoClientId: data.avitoClientId || '',
                avitoClientSecret: data.avitoClientSecret || '',
            };
            return cleanProfile;
        });
        callback(profiles);
    });
};


export const addProfile = async (profileData: Omit<Profile, 'id'>): Promise<Profile> => {
    const docRef = await addDoc(collection(db, 'profiles'), profileData);
    return { id: docRef.id, ...profileData };
};

export const updateProfile = (profile: Profile) => {
    const { id, ...data } = profile;
    return updateDoc(doc(db, 'profiles', id), data);
};

export const deleteProfile = async (profileId: string) => {
    // Also delete associated jobs
    const jobsQuery = query(collection(db, 'jobs'), where('profileId', '==', profileId));
    const jobsSnapshot = await getDocs(jobsQuery);
    const batch = writeBatch(db);
    jobsSnapshot.forEach(jobDoc => {
        batch.delete(doc(db, 'jobs', jobDoc.id));
    });
    await batch.commit();

    // Delete the profile itself
    return deleteDoc(doc(db, 'profiles', profileId));
};

// --- Jobs ---

export const subscribeToJobs = (userId: string, callback: (jobs: Job[]) => void) => {
    const q = query(collection(db, 'jobs'), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
        const jobs = snapshot.docs.map(doc => {
            const data = doc.data() || {};
            const contacts = data.contacts || {};
            
            const cleanJob: Job = {
                id: doc.id,
                title: data.title || '',
                company: data.company || '',
                companyRating: data.companyRating || 0,
                companyReviewSummary: data.companyReviewSummary || '',
                salary: data.salary || '',
                location: data.location || '',
                description: data.description || '',
                responsibilities: Array.isArray(data.responsibilities) ? [...data.responsibilities] : [],
                requirements: Array.isArray(data.requirements) ? [...data.requirements] : [],
                matchAnalysis: data.matchAnalysis || '',
                url: data.url || '',
                sourcePlatform: data.sourcePlatform || 'Неизвестно',
                contacts: {
                    email: contacts.email,
                    phone: contacts.phone,
                    telegram: contacts.telegram,
                },
                kanbanStatus: data.kanbanStatus || 'new',
                notes: data.notes || undefined,
                history: Array.isArray(data.history) ? data.history : [],
                profileId: data.profileId || '',
                userId: data.userId || '',
            };
             if (!cleanJob.contacts?.email && !cleanJob.contacts?.phone && !cleanJob.contacts?.telegram) {
                delete cleanJob.contacts;
            }
            return cleanJob;
        });
        callback(jobs);
    });
};

export const addJobsBatch = async (jobs: Job[]) => {
    const batch = writeBatch(db);
    jobs.forEach(jobData => {
        const jobWithOurId = {...jobData, id: jobData.id || uuidv4()};
        const docRef = doc(db, 'jobs', jobWithOurId.id);
        batch.set(docRef, jobWithOurId);
    });
    await batch.commit();
};

export const updateJob = (jobId: string, updates: Partial<Job>) => {
    return updateDoc(doc(db, 'jobs', jobId), updates);
};

export const deleteJob = (jobId: string) => {
    return deleteDoc(doc(db, 'jobs', jobId));
};